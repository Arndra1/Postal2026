// Enrichment provider service layer.
// Providers are swappable: implement the EnrichmentProvider interface and register it.
// Live providers (People Data Labs, Enrich.so, NumVerify, business/location providers)
// are wired by setting their API key as a secret and adding a branch in resolveProvider().
// No provider secrets are ever exposed to the frontend.
//
// SECURITY: there is no mock/demo provider. Fabricated contact data must never be
// returned to users or charged for as "verified". Until a live provider's API key is
// configured, enrichment fails closed and costs 0 credits.

// A provider returns a normalized result object.
// status: "success" | "empty" | "failed" | "timeout" | "validation_error"
export async function runEnrichment(base44, inputs) {
  const provider = await resolveProvider(base44);
  const start = Date.now();
  if (!provider) {
    return {
      status: "failed",
      results: null,
      data_sources: [],
      duration_ms: Date.now() - start,
      error: "No data provider is currently configured. Enrichment will be available once a live provider is connected."
    };
  }
  try {
    const raw = await provider.enrich(inputs);
    const duration_ms = Date.now() - start;
    return normalizeResult(raw, duration_ms, provider.name);
  } catch (err) {
    const duration_ms = Date.now() - start;
    const msg = (err && err.message) ? err.message : "provider_error";
    if (msg.includes("timeout") || msg.includes("Timeout")) {
      return { status: "timeout", results: null, data_sources: [], duration_ms, error: msg };
    }
    return { status: "failed", results: null, data_sources: [], duration_ms, error: msg };
  }
}

// Returns the active live provider, or null when none is configured.
// The owner can disable an individual data source (ProviderSetting records,
// managed in the admin compliance dashboard) without shutting down enrichment.
async function resolveProvider(base44) {
  // Wire live providers here once their API key secret is set, e.g.:
  // const pdlKey = secrets.get("PDL_API_KEY");
  // if (pdlKey) return peopleDataLabsProvider(pdlKey);
  // No live provider configured — fail closed (no synthetic data, no charge).
  return null;
}

function normalizeResult(raw, duration_ms, providerName) {
  if (!raw || typeof raw !== "object") {
    return { status: "validation_error", results: null, data_sources: [], duration_ms, error: "malformed_response" };
  }
  // A verified result must contain at least a verified email or phone.
  const r = raw;
  const verified = (r.verified_email && String(r.verified_email).includes("@")) || r.verified_phone;
  if (!verified) {
    return { status: "empty", results: null, data_sources: [providerName], duration_ms, error: "" };
  }
  return {
    status: "success",
    results: {
      verified_email: r.verified_email || "",
      verified_phone: r.verified_phone || "",
      website: r.website || "",
      linkedin: r.linkedin || "",
      address: r.address || "",
      job_title: r.job_title || "",
      company: r.company || "",
      confidence: r.confidence || "medium"
    },
    data_sources: [providerName],
    duration_ms,
    error: ""
  };
}