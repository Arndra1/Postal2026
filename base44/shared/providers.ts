// Enrichment orchestrator — server-side waterfall over configured providers.
//
// Waterfall:
//   1. Geoapify  — normalize/clean the address first (PINNED FIRST).
//   2. Reorderable steps, in admin priority order (lowest number first):
//        - Domain lookup — resolves a company domain from the business name
//        - Tracerfy      — address-based owner phone/email
//        - Enrich.so     — email finder (name + domain)
//        - PDL           — person/company enrichment (needs a full name)
//   3. NumVerify — validates any candidate phone (PINNED LAST).
//
// Geoapify and NumVerify are pinned because the address-based lookup depends
// on a clean address, and validation must see every candidate phone. The
// remaining steps are reordered from each provider's priority number.
//
// Stops calling the remaining paid contact providers as soon as BOTH a
// verified email and a verified phone have been found. Fail-closed (0 credits)
// when no provider key is configured or no qualifying contact is returned.
// All keys stay server-side; none are exposed to the frontend, logs, or
// responses.

import { allProviderMeta } from "./providers/registry.ts";
import { isVerified, populatedFields, RESULT_FIELDS } from "./providers/types.ts";
import { validatePhone as numverifyValidate, isConfigured as numverifyConfigured } from "./providers/numverify.ts";
import { normalizeAddress as geoapifyNormalize, isConfigured as geoapifyConfigured } from "./providers/geoapify.ts";
import { PDL, isConfigured as pdlConfigured, enrich as pdlEnrich } from "./providers/pdl.ts";
import { ENRICH_SO, isConfigured as enrichSoConfigured, enrich as enrichSoEnrich } from "./providers/enrichSo.ts";
import { TRACERFY, isConfigured as tracerfyConfigured, hasRequiredInputs as tracerfyHasInputs, enrich as tracerfyEnrich } from "./providers/tracerfy.ts";
import { resolveDomain } from "./providers/domainResolver.ts";

const DEDUP_WINDOW_MINUTES = 5;

// ---- Provider order (admin-driven priority) -------------------------------

// Shipped default priorities for the reorderable steps — used when a provider
// has no settings row, or a row whose priority is missing/invalid. Lower runs
// earlier. Geoapify (pinned first) and NumVerify (pinned last) are absent here
// on purpose: their position never changes.
const DEFAULT_PRIORITY = {
  domain_resolver: 15,
  tracerfy: 20,
  enrich_so: 30,
  people_data_labs: 40,
};

// Resolve a step's priority from its settings row, falling back to the shipped
// default when the row or its number is missing/invalid.
function resolvePriority(settings, key) {
  const row = settings[key];
  const saved = row ? Number(row.priority) : NaN;
  if (Number.isFinite(saved)) return saved;
  const fallback = DEFAULT_PRIORITY[key];
  return Number.isFinite(fallback) ? fallback : 999;
}

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

// ---- Public-record name normalization --------------------------------------
//
// Registries publish person names in different conventions. Florida's Sunbiz
// fixed-width filings publish the registered agent SURNAME FIRST, padded, with a
// trailing middle initial ("DIACK               CHRISTIAN     A"); every other
// connected source publishes given-name first. Person-matching providers expect
// "Given Surname", so a surname-first value is reversed before it is handed over
// — otherwise the providers receive a surname where they expect a first name and
// the match fails.
//
// One shared helper, used wherever a public-record name is resolved, so every
// source is normalized the same way.
const SURNAME_FIRST_STATES = new Set(["FL"]);

// A corporate registered agent ("REGISTERED AGENTS INC") is not a person — never
// reorder it.
const ORG_SUFFIX = /\b(INC|LLC|CORP|CORPORATION|COMPANY|CO|LTD|LP|LLP|PLLC|TRUST|BANK|SERVICES|AGENTS|SOLUTIONS|GROUP|HOLDINGS)\.?$/i;

function titleCaseIfShouting(s) {
  if (!s || s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

// Collapse padding/whitespace and, when the source publishes surname-first,
// return "Given Surname". Sources that already publish given-name-first are
// returned cleaned but otherwise untouched.
export function normalizePersonName(raw, options = {}) {
  const cleaned = String(raw || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (!options.surnameFirst) return cleaned;
  if (ORG_SUFFIX.test(cleaned)) return cleaned;

  let surname = "";
  let given = "";
  if (cleaned.includes(",")) {
    const parts = cleaned.split(",");
    surname = (parts[0] || "").trim();
    given = parts.slice(1).join(" ").trim();
  } else {
    const parts = cleaned.split(" ").filter(Boolean);
    if (parts.length < 2) return cleaned;
    surname = parts[0];
    given = parts.slice(1).join(" ");
  }
  if (!surname || !given) return cleaned;
  return titleCaseIfShouting(`${given} ${surname}`);
}

// Resolve the inputs the waterfall needs from the lead record itself, so every
// caller — search screen, bulk run, or saved search — enriches identically
// without relying on the frontend to send the address, ZIP, or registered agent.
export async function resolveLeadInputs(base44, leadId, inputs) {
  const resolved = { ...(inputs || {}) };
  if (!leadId) return resolved;

  let lead = null;
  try {
    lead = await base44.entities.Lead.get(leadId);
  } catch (_e) {
    return resolved;
  }
  if (!lead) return resolved;

  const pub = lead.original_public_fields || {};
  const extra = pub.extra || {};
  const state = String(resolved.state || lead.state || pub.state || "").toUpperCase();

  if (!resolved.business_name) resolved.business_name = lead.business_name || pub.business_name || "";
  if (!resolved.city) resolved.city = lead.city || pub.city || "";
  if (!resolved.state) resolved.state = state;
  if (!resolved.address) resolved.address = lead.address || pub.address || "";
  if (!resolved.zip) resolved.zip = lead.zip || pub.zip || "";
  if (!resolved.website) resolved.website = lead.website || pub.website || "";

  if (!resolved.person_name) {
    const raw = [
      lead.person_name,
      extra.registered_agent,
      extra.owner_name,
      extra.officer_name,
      extra.agent_name,
      extra.associated_person,
      pub.registered_agent,
    ].map((c) => String(c || "").trim()).find(Boolean) || "";
    resolved.person_name = normalizePersonName(raw, { surnameFirst: SURNAME_FIRST_STATES.has(state) });
  }

  return resolved;
}

// ---- Orchestration ---------------------------------------------------------

// ── Field-level enrichment waterfall ───────────────────────────────────
//
// SEQUENCE (per enrichment attempt):
//   1. Geoapify  — normalize/clean the address FIRST (pinned first).
//   2. The reorderable steps run in the order set by their priority numbers
//      in the admin Providers screen (lowest first):
//        domain_resolver  — resolve a company domain (free, cached)
//        tracerfy         — address-based owner phone/email
//        enrich_so        — email finder (name + domain)
//        people_data_labs — person/company enrichment (needs a full name)
//   3. NumVerify — validate any candidate phone (pinned last).
//
// EARLY STOP:
//   Once BOTH a verified email and a verified phone are present — whichever
//   provider produced them — the remaining contact providers are skipped, so
//   no further paid calls are made.
//
// FIELD-LEVEL DEDUP:
//   A field filled by an earlier provider is never overwritten by a later one.
//
// CREDIT LOGIC (charged in enrichLead/entry.ts — NO CHANGE):
//   A single flat 5-credit charge is applied per enrichment attempt when the
//   final merged result contains a NEW verified_email or verified_phone. The
//   charge is per attempt, not per provider call. If no provider returns a
//   verified email or phone → 0 credits.
export async function runEnrichment(base44, inputs) {
  const start = Date.now();
  const settings = await loadSettings(base44);

  const data_sources = [];
  const provider_breakdown = [];
  const merged = {}; // accumulated results across providers (field-level merge)
  let enrichedInputs = { ...inputs }; // inputs enriched as the waterfall progresses

  // Contact providers, keyed by provider_key. `canRun` gates a provider on the
  // inputs it actually needs, so paid calls that cannot possibly match are
  // skipped rather than charged for.
  const CONTACT_STEPS = {
    tracerfy: {
      meta: TRACERFY,
      enrich: tracerfyEnrich,
      configured: tracerfyConfigured,
      canRun: () => tracerfyHasInputs(enrichedInputs),
      skipReason: "skipped, no address available",
    },
    enrich_so: {
      meta: ENRICH_SO,
      enrich: enrichSoEnrich,
      configured: enrichSoConfigured,
      canRun: () => !merged.verified_email,
      skipReason: "skipped, email already filled by earlier provider",
    },
    people_data_labs: {
      meta: PDL,
      enrich: pdlEnrich,
      configured: pdlConfigured,
      canRun: () =>
        String(enrichedInputs.person_name || "").trim().split(/\s+/).filter(Boolean).length >= 2,
      skipReason: "skipped, no person name",
    },
  };

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
        const v = result.results[f];
        const isString = typeof v === "string" && v.trim() !== "";
        const isNumber = typeof v === "number" && Number.isFinite(v);
        if (!merged[f] && (isString || isNumber)) {
          merged[f] = v;
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

  // ── Step 1: Geoapify address normalization (pinned first) ───────────
  // Always runs before the address-based lookup so it sees a clean address.
  if (geoapifyConfigured()) {
    const geo = await geoapifyNormalize(inputs);
    if (geo && geo.address) {
      enrichedInputs.address = geo.address;
      if (geo.city) enrichedInputs.city = geo.city;
      if (geo.state) enrichedInputs.state = geo.state;
      if (!data_sources.includes("Geoapify")) data_sources.push("Geoapify");
    }
  }

  // ── Step 2: reorderable steps — domain lookup + contact providers ───
  // Order comes from each step's priority number (lowest first). Geoapify and
  // NumVerify are pinned and are not part of this list.
  const contactFilled = () => !!(merged.verified_email && merged.verified_phone);
  const orderedKeys = Object.keys(DEFAULT_PRIORITY).sort(
    (a, b) => resolvePriority(settings, a) - resolvePriority(settings, b)
  );

  for (const key of orderedKeys) {
    // Domain lookup — free and cached; gives the contact providers that follow
    // a website/domain to work with. Never overwrites a website already present.
    if (key === "domain_resolver") {
      if (!isEnabled("domain_resolver")) {
        provider_breakdown.push({
          provider: "DomainResolver", provider_key: "domain_resolver",
          status: "skipped", fields: [], duration_ms: 0, error: "disabled",
        });
        continue;
      }
      const hasWebsite = !!(enrichedInputs.website && enrichedInputs.website.trim());
      if (hasWebsite || !enrichedInputs.business_name) {
        provider_breakdown.push({
          provider: "DomainResolver", provider_key: "domain_resolver",
          status: "skipped", fields: [], duration_ms: 0,
          error: hasWebsite ? "skipped, website already present" : "skipped, no business name",
        });
        continue;
      }
      const resolved = await resolveDomain(
        base44, enrichedInputs.business_name, enrichedInputs.city, enrichedInputs.state
      );
      if (resolved.domain) enrichedInputs.website = `https://${resolved.domain}`;
      provider_breakdown.push({
        provider: "DomainResolver", provider_key: "domain_resolver",
        status: resolved.domain ? "success" : "empty",
        fields: resolved.domain ? ["website"] : [],
        duration_ms: resolved.duration_ms, error: "", method: resolved.method,
      });
      if (resolved.domain && !data_sources.includes("DomainResolver")) {
        data_sources.push("DomainResolver");
      }
      continue;
    }

    const step = CONTACT_STEPS[key];
    if (!step) continue;
    // Stop paying for contact lookups once a verified email AND phone exist.
    if (contactFilled()) { recordSkip(step.meta, "skipped, email and phone already filled"); continue; }
    if (!step.configured()) { recordSkip(step.meta, "not_configured"); continue; }
    if (!isEnabled(key)) { recordSkip(step.meta, "disabled"); continue; }
    if (step.canRun && !step.canRun()) { recordSkip(step.meta, step.skipReason); continue; }
    await callProvider(step.meta, step.enrich, enrichedInputs);
  }

  // ── Step 3: NumVerify phone validation (pinned last) ───────────────
  // Validates any candidate phone from any contact provider before marking it
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