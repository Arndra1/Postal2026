// Enrichment provider service layer.
// Providers are swappable: implement the EnrichmentProvider interface and register it.
// Live providers (People Data Labs, Enrich.so, NumVerify, business/location providers)
// are wired by setting their API key as a secret and adding a branch in resolveProvider().
// No provider secrets are ever exposed to the frontend.

import { secrets } from "base44:runtime";

// A provider returns a normalized result object.
// status: "success" | "empty" | "failed" | "timeout" | "validation_error"
export async function runEnrichment(inputs) {
  const provider = resolveProvider();
  const start = Date.now();
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

function resolveProvider() {
  // In production, choose based on which secret is configured, e.g.:
  // const pdlKey = secrets.get("PDL_API_KEY");
  // if (pdlKey) return peopleDataLabsProvider(pdlKey);
  // For now, return the mock provider so the app is fully functional without live keys.
  return mockProvider;
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

function slugify(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
}

// Mock provider — deterministic, requires input signal, never throws.
const mockProvider = {
  name: "mock_provider",
  async enrich(inputs) {
    const hasSignal = inputs.person_name || inputs.business_name || inputs.website || inputs.email;
    if (!hasSignal) {
      return { verified_email: "", verified_phone: "" };
    }
    const person = inputs.person_name || "Jordan Avery";
    const business = inputs.business_name || "Northwind Consulting";
    let domain = "northwindco.com";
    if (inputs.website) {
      domain = String(inputs.website).replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }
    return {
      verified_email: inputs.email || (slugify(person) + "@" + domain),
      verified_phone: inputs.phone || "+1 (415) 555-0142",
      website: inputs.website || ("https://" + domain),
      linkedin: "https://linkedin.com/in/" + slugify(person),
      address: "500 Market St, San Francisco, CA 94105",
      job_title: inputs.job_title || "Director of Operations",
      company: business,
      confidence: "high"
    };
  }
};