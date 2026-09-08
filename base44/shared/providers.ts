// Enrichment orchestrator — server-side waterfall over configured providers.
//
// Waterfall:
//   1. Geoapify  — normalize/clean the address first (before Tracerfy).
//   2. Tracerfy  — cheapest contact provider; runs first when an address is
//                  available. Returns owner phone/email.
//   3. PDL       — called only if Tracerfy didn't fill both email AND phone.
//   4. NumVerify — validates any candidate phone before it counts as verified.
//
// Stops calling paid providers as soon as a verified email or candidate phone
// is obtained. Fail-closed (0 credits) when no provider key is configured or
// no qualifying contact is returned. All keys stay server-side; none are
// exposed to the frontend, logs, or responses.

import { allProviderMeta } from "./providers/registry.ts";
import { isVerified, populatedFields, RESULT_FIELDS } from "./providers/types.ts";
import { validatePhone as numverifyValidate, isConfigured as numverifyConfigured } from "./providers/numverify.ts";
import { normalizeAddress as geoapifyNormalize, isConfigured as geoapifyConfigured } from "./providers/geoapify.ts";
import { PDL, isConfigured as pdlConfigured, enrich as pdlEnrich } from "./providers/pdl.ts";
import { ENRICH_SO, isConfigured as enrichSoConfigured, enrich as enrichSoEnrich } from "./providers/enrichSo.ts";
import { TRACERFY, isConfigured as tracerfyConfigured, hasRequiredInputs as tracerfyHasInputs, enrich as tracerfyEnrich } from "./providers/tracerfy.ts";
import { resolveDomain } from "./providers/domainResolver.ts";

const DEDUP_WINDOW_MINUTES = 5;

// ---- Provider settings (admin toggles + status) ---------------------------

async function loadSettings(base44) {
  try {
    const rows = await base44.asServiceRole.entities.ProviderSetting.list();
    const map = {};
    for (const s of rows || []) map[s.provider_key] = s;
    return map;
  } catch (_e) {
    return {};
  }
}

async function markProviderStatus(base44, settings, providerKey, result) {
  const setting = settings[providerKey];
  if (!setting || !setting.id) return;
  const now = new Date().toISOString();
  if (result.status === "success" && isVerified(result.results)) {
    await base44.asServiceRole.entities.ProviderSetting.update(setting.id, {
      last_status: "ok",
      last_success_at: now,
      last_error: "",
      last_error_at: "",
    }).catch(() => {});
  } else if (result.status === "failed" || result.status === "timeout") {
    await base44.asServiceRole.entities.ProviderSetting.update(setting.id, {
      last_status: "error",
      last_error: result.error || result.status,
      last_error_at: now,
    }).catch(() => {});
  }
}

// ---- Stable inputs hash (short-window duplicate suppression) ---------------

function hashInputs(inputs) {
  try {
    const norm = JSON.stringify(
      Object.keys(inputs || {}).sort().reduce((acc, k) => { acc[k] = inputs[k]; return acc; }, {})
    );
    let h = 0;
    for (let i = 0; i < norm.length; i++) {
      h = (h << 5) - h + norm.charCodeAt(i);
      h |= 0;
    }
    return "h" + Math.abs(h).toString(36);
  } catch (_e) {
    return "";
  }
}

// ---- Idempotency: return a recent successful enrichment for the same inputs -

export async function findRecentSuccess(base44, userId, inputs) {
  const hash = hashInputs(inputs);
  if (!hash) return null;
  try {
    const since = new Date(Date.now() - DEDUP_WINDOW_MINUTES * 60 * 1000).toISOString();
    const rows = await base44.asServiceRole.entities.Enrichment.filter({
      user_id: userId,
      inputs_hash: hash,
      status: "success",
    });
    const recent = (rows || []).filter((r) => r.created_date && r.created_date >= since);
    return recent[0] || null;
  } catch (_e) {
    return null;
  }
}

export { hashInputs };

// ---- Orchestration ---------------------------------------------------------

// ── Field-level enrichment waterfall ───────────────────────────────────
//
// SEQUENCE (per enrichment attempt):
//   1. Geoapify  — normalize/clean address FIRST (before Tracerfy).
//   2. Tracerfy  — cheapest contact provider; runs first when an address
//                  is available. Returns owner phone/email.
//   3. PDL       — called ONLY if Tracerfy didn't fill both email AND phone
//                  (i.e., email OR phone OR job_title OR linkedin still empty).
//                  Skipped entirely when Tracerfy returned both email+phone
//                  to avoid a duplicate paid lookup.
//   4. NumVerify — validate any phone from Tracerfy or PDL before marking
//                  it "verified".
//
// FIELD-LEVEL DEDUP:
//   A field filled by an earlier provider is never overwritten by a later
//   one. PDL can still contribute linkedin/job_title even when Tracerfy
//   already returned email+phone (but in that case PDL is skipped per the
//   rule above — it only runs when at least one of email/phone is missing).
//
// CREDIT LOGIC (charged in enrichLead/entry.ts — NO CHANGE):
//   A single flat 5-credit charge is applied per enrichment attempt when
//   the final merged result contains a NEW verified_email or verified_phone.
//   This charge is NOT per-provider-call:
//   - If Tracerfy returns both email and phone → PDL is skipped → 5 credits.
//   - If Tracerfy returns only phone → PDL runs and returns email → 5 credits
//     (covers both providers — no additional charge for the PDL call).
//   - If PDL runs after Tracerfy to fill linkedin/job_title and does NOT
//     return a new email or phone → still 5 credits (the charge is for the
//     enrichment attempt, not per field).
//   - If neither provider returns a verified email or phone → 0 credits.
export async function runEnrichment(base44, inputs) {
  const start = Date.now();
  const settings = await loadSettings(base44);

  const data_sources = [];
  const provider_breakdown = [];
  const merged = {}; // accumulated results across providers (field-level merge)

  function isEnabled(key) {
    const s = settings[key];
    return s ? s.enabled !== false : true;
  }

  function recordSkip(meta, reason) {
    provider_breakdown.push({
      provider: meta.name,
      provider_key: meta.key,
      status: "skipped",
      fields: [],
      duration_ms: 0,
      error: reason,
    });
  }

  // Call a provider, merge its results field-by-field (never overwriting
  // fields already filled by an earlier provider), and record which fields
  // it CONTRIBUTED to the audit trail.
  async function callProvider(meta, enrichFn, enrichedInputs) {
    let result;
    try {
      result = await enrichFn(enrichedInputs);
    } catch (err) {
      const msg = (err && err.message) ? err.message : "provider_error";
      result = {
        status: msg.includes("timeout") ? "timeout" : "failed",
        results: null,
        data_sources: [meta.name],
        provider_key: meta.key,
        fields_returned: [],
        duration_ms: 0,
        error: msg,
      };
    }

    // Field-level dedup: only fill fields that are still empty.
    const contributed = [];
    if (result.status === "success" && result.results) {
      for (const f of RESULT_FIELDS) {
        if (!merged[f] && result.results[f] && String(result.results[f]).trim()) {
          merged[f] = result.results[f];
          contributed.push(f);
        }
      }
    }

    provider_breakdown.push({
      provider: meta.name,
      provider_key: meta.key,
      status: result.status,
      fields: contributed,
      duration_ms: result.duration_ms || 0,
      error: result.error || "",
    });

    if (result.data_sources && result.data_sources[0] && !data_sources.includes(result.data_sources[0])) {
      data_sources.push(result.data_sources[0]);
    }

    await markProviderStatus(base44, settings, meta.key, result);
    return result;
  }

  // ── Step 1: Geoapify address normalization ──────────────────────────
  // Runs BEFORE Tracerfy so the address is clean/normalized.
  let enrichedInputs = { ...inputs };
  if (geoapifyConfigured()) {
    const geo = await geoapifyNormalize(inputs);
    if (geo && geo.address) {
      enrichedInputs.address = geo.address;
      if (geo.city) enrichedInputs.city = geo.city;
      if (geo.state) enrichedInputs.state = geo.state;
      if (!data_sources.includes("Geoapify")) data_sources.push("Geoapify");
    }
  }

  // ── Step 2: Tracerfy (cheapest contact provider, runs first) ────────
  // Address-based skip-tracing for owner phone/email.
  if (tracerfyConfigured() && isEnabled("tracerfy")) {
    if (tracerfyHasInputs(enrichedInputs)) {
      await callProvider(TRACERFY, tracerfyEnrich, enrichedInputs);
    } else {
      recordSkip(TRACERFY, "skipped, no address available");
    }
  } else {
    recordSkip(TRACERFY, tracerfyConfigured() ? "disabled" : "not_configured");
  }

  // ── Step 3: PDL (fill remaining gaps) ──────────────────────────────
  // PDL is called if, after Tracerfy, the lead is still missing email OR
  // phone OR job_title OR linkedin. If Tracerfy already returned BOTH
  // email and phone, PDL is skipped to avoid paying for a duplicate lookup
  // on fields already filled.
  const tracerfyFilledBoth = !!(merged.verified_email && merged.verified_phone);
  if (pdlConfigured() && isEnabled("people_data_labs")) {
    if (!tracerfyFilledBoth) {
      await callProvider(PDL, pdlEnrich, enrichedInputs);
    } else {
      recordSkip(PDL, "skipped, email and phone already filled by Tracerfy");
    }
  } else {
    recordSkip(PDL, pdlConfigured() ? "disabled" : "not_configured");
  }

  // ── Step 3.4: Domain resolution (feeds Enrich.so) ──────────────────
  // Public-record LLC leads often arrive with only a business name + city
  // and no website. Enrich.so's email-finder needs a domain, so resolve one
  // here (Clearbit Autocomplete → PDL Company Search, cached) BEFORE the
  // Enrich.so step. Only runs when no website is present yet and a business
  // name exists. Charges 0 credits; never overwrites a website already
  // supplied by an earlier provider (Geoapify/Tracerfy/PDL).
  const hasWebsite = !!(enrichedInputs.website && enrichedInputs.website.trim());
  if (!hasWebsite && enrichedInputs.business_name) {
    const resolved = await resolveDomain(
      base44,
      enrichedInputs.business_name,
      enrichedInputs.city,
      enrichedInputs.state
    );
    if (resolved.domain) {
      enrichedInputs.website = `https://${resolved.domain}`;
    }
    provider_breakdown.push({
      provider: "DomainResolver",
      provider_key: "domain_resolver",
      status: resolved.domain ? "success" : "empty",
      fields: resolved.domain ? ["website"] : [],
      duration_ms: resolved.duration_ms,
      error: "",
      method: resolved.method,
    });
    if (resolved.domain && !data_sources.includes("DomainResolver")) {
      data_sources.push("DomainResolver");
    }
  } else {
    provider_breakdown.push({
      provider: "DomainResolver",
      provider_key: "domain_resolver",
      status: "skipped",
      fields: [],
      duration_ms: 0,
      error: hasWebsite ? "skipped, website already present" : "skipped, no business name",
    });
  }

  // ── Step 3.5: Enrich.so email finder (fallback) ────────────────────
  // Called ONLY when PDL didn't return a verified email. Enrich.so takes
  // a first name, last name, and domain to find a professional email —
  // filling the gap PDL leaves for many records.
  if (enrichSoConfigured() && isEnabled("enrich_so")) {
    if (!merged.verified_email) {
      await callProvider(ENRICH_SO, enrichSoEnrich, enrichedInputs);
    } else {
      recordSkip(ENRICH_SO, "skipped, email already filled by earlier provider");
    }
  } else {
    recordSkip(ENRICH_SO, enrichSoConfigured() ? "disabled" : "not_configured");
  }

  // ── Step 4: NumVerify phone validation ─────────────────────────────
  // Validates any candidate phone from Tracerfy or PDL before marking it
  // as "verified". Drops phones that fail validation. If NumVerify is not
  // configured, the phone is kept as-is from the provider.
  if (merged.verified_phone && numverifyConfigured()) {
    const check = await numverifyValidate(merged.verified_phone);
    if (check.valid) {
      merged.verified_phone = check.intl || merged.verified_phone;
      if (!data_sources.includes("NumVerify")) data_sources.push("NumVerify");
    } else {
      merged.verified_phone = "";
    }
  }

  // Merge Geoapify-normalized address if no provider returned one.
  if (enrichedInputs.address && !merged.address) {
    merged.address = enrichedInputs.address;
  }

  // ── Final result ──────────────────────────────────────────────────
  // Success requires at least a verified email or verified phone. Other
  // fields (linkedin, job_title, etc.) are returned but do not alone
  // trigger a credit charge.
  if (!isVerified(merged)) {
    // Distinguish a genuine "no match" from a provider error (auth failure,
    // 401/403, timeout, or other non-200). If ANY provider in the waterfall
    // errored, surface a provider-error status so the UI can show a distinct
    // message — the user should NOT see "no results found" when a provider is
    // actually down or misconfigured. The detailed error (provider name, status
    // code, auth failure) stays in provider_breakdown for admin/debugging only.
    const anyProviderError = provider_breakdown.some(
      (p) => p.status === "failed" || p.status === "timeout" || p.status === "validation_error"
    );
    if (anyProviderError) {
      return {
        status: "provider_error",
        results: null,
        data_sources,
        provider_breakdown,
        duration_ms: Date.now() - start,
        error: "We're having trouble reaching one of our data providers right now. Your credits were not charged. Please try again shortly or contact support if this continues.",
      };
    }
    return {
      status: "empty",
      results: null,
      data_sources,
      provider_breakdown,
      duration_ms: Date.now() - start,
      error: "No verified contact information was found for the provided details.",
    };
  }

  return {
    status: "success",
    results: merged,
    data_sources,
    provider_breakdown,
    duration_ms: Date.now() - start,
    error: "",
  };
}