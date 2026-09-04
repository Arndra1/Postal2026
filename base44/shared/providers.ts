// Enrichment orchestrator — server-side waterfall over configured providers.
//
// Waterfall:
//   1. Check the lead's existing data (inputs) — if already verified, skip paid calls.
//   2. People Data Labs (person/company).
//   3. Enrich.so (person/company) — only if important fields are still missing.
//   4. Tracerfy (address-based property owner) — only if contact data is still
//      missing AND an address is available.
//   5. NumVerify — validates any candidate phone before it counts as verified.
//
// Stops calling paid providers as soon as a verified email or candidate phone
// is obtained. Fail-closed (0 credits) when no provider key is configured or
// no qualifying contact is returned. All keys stay server-side; none are
// exposed to the frontend, logs, or responses.

import { PERSON_PROVIDERS, allProviderMeta } from "./providers/registry.ts";
import { isVerified, populatedFields } from "./providers/types.ts";
import { validatePhone as numverifyValidate } from "./providers/numverify.ts";
import { normalizeAddress as geoapifyNormalize } from "./providers/geoapify.ts";

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

export async function runEnrichment(base44, inputs) {
  const start = Date.now();
  const settings = await loadSettings(base44);

  // Build the active person-provider cascade (configured, enabled, priority-sorted).
  const cascade = PERSON_PROVIDERS
    .map((p) => ({
      ...p,
      setting: settings[p.meta.key],
      enabled: settings[p.meta.key] ? settings[p.meta.key].enabled !== false : true,
      priority: settings[p.meta.key]?.priority ?? p.meta.defaultPriority,
    }))
    .filter((p) => p.configured() && p.enabled)
    .sort((a, b) => a.priority - b.priority);

  const data_sources = [];
  const provider_breakdown = [];

  if (cascade.length === 0) {
    return {
      status: "failed",
      results: null,
      data_sources,
      provider_breakdown,
      duration_ms: Date.now() - start,
      error: "No data provider is currently configured. Enrichment will be available once a live provider is connected.",
    };
  }

  // Geoapify address normalization runs in parallel with the cascade.
  const geoPromise = geoapifyNormalize(inputs);

  let winner = null;

  for (const provider of cascade) {
    // Tracerfy only runs when it has the inputs it needs (an address).
    if (provider.hasInputs && !provider.hasInputs(inputs)) {
      provider_breakdown.push({
        provider: provider.meta.name,
        provider_key: provider.meta.key,
        status: "skipped",
        fields: [],
        duration_ms: 0,
        error: "insufficient_inputs",
      });
      continue;
    }

    let providerResult;
    try {
      providerResult = await provider.enrich(inputs);
    } catch (err) {
      const msg = (err && err.message) ? err.message : "provider_error";
      providerResult = {
        status: msg.includes("timeout") ? "timeout" : "failed",
        results: null,
        data_sources: [provider.meta.name],
        provider_key: provider.meta.key,
        fields_returned: [],
        duration_ms: 0,
        error: msg,
      };
    }

    provider_breakdown.push({
      provider: provider.meta.name,
      provider_key: provider.meta.key,
      status: providerResult.status,
      fields: providerResult.fields_returned || [],
      duration_ms: providerResult.duration_ms || 0,
      error: providerResult.error || "",
    });
    if (providerResult.data_sources && !data_sources.includes(providerResult.data_sources[0])) {
      data_sources.push(providerResult.data_sources[0]);
    }

    await markProviderStatus(base44, settings, provider.meta.key, providerResult);

    if (providerResult.status === "success" && isVerified(providerResult.results)) {
      winner = providerResult;
      break; // Stop calling paid providers once sufficient enrichment is obtained.
    }
  }

  const geo = await geoPromise;

  if (!winner) {
    return {
      status: "empty",
      results: null,
      data_sources,
      provider_breakdown,
      duration_ms: Date.now() - start,
      error: "No verified contact information was found for the provided details.",
    };
  }

  let results = { ...winner.results };

  // NumVerify phone validation — drop phones that do not validate.
  if (results.verified_phone) {
    const check = await numverifyValidate(results.verified_phone);
    if (check.valid) {
      results.verified_phone = check.intl || results.verified_phone;
      if (!data_sources.includes("NumVerify")) data_sources.push("NumVerify");
    } else {
      results.verified_phone = "";
      if (!isVerified(results)) {
        // Phone was the only contact and it failed validation — no qualifying data.
        return {
          status: "empty",
          results: null,
          data_sources,
          provider_breakdown,
          duration_ms: Date.now() - start,
          error: "A candidate contact was found but the phone could not be verified.",
        };
      }
    }
  }

  // Merge Geoapify-normalized address when available.
  if (geo && geo.address) {
    results.address = geo.address;
    if (geo.city) results.city = geo.city;
    if (geo.state) results.state = geo.state;
    if (!data_sources.includes("Geoapify")) data_sources.push("Geoapify");
  }

  return {
    status: "success",
    results,
    data_sources,
    provider_breakdown,
    duration_ms: Date.now() - start,
    error: "",
  };
}