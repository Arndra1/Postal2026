// Shared helpers and the normalized provider-result contract used by every
// enrichment provider module. Providers return this shape; the orchestrator
// (providers.ts) merges them into a final enrichment result.

export const PROVIDER_TIMEOUT_MS = 15000;

// Normalized result fields a provider can populate.
export const RESULT_FIELDS = [
  "verified_email",
  "verified_phone",
  "website",
  "linkedin",
  "address",
  "job_title",
  "company",
];

// A provider result:
//   status: "success" | "empty" | "failed" | "timeout" | "validation_error"
//   results: normalized fields object or null
//   data_sources: [display name]
//   provider_key: registry key
//   fields_returned: list of RESULT_FIELDS actually populated
//   duration_ms, error

export function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts[parts.length - 1] };
}

export function domainFromWebsite(website) {
  if (!website) return "";
  let w = String(website).trim();
  w = w.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return w.split("/")[0];
}

// fetch with timeout via AbortController. Throws on timeout/network error.
export async function fetchJson(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: ctrl.signal });
    const text = await res.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch (_e) { json = null; }
    return { ok: res.ok, status: res.status, json };
  } catch (err) {
    const msg = (err && err.name === "AbortError") ? "timeout" : ((err && err.message) || "fetch_error");
    throw new Error(msg);
  } finally {
    clearTimeout(timer);
  }
}

export function emptyResult(name, key, duration_ms, error = "") {
  return {
    status: "empty",
    results: null,
    data_sources: [name],
    provider_key: key,
    fields_returned: [],
    duration_ms,
    error,
  };
}

export function failedResult(name, key, status, duration_ms, error) {
  return {
    status,
    results: null,
    data_sources: [name],
    provider_key: key,
    fields_returned: [],
    duration_ms,
    error,
  };
}

// Which normalized fields are actually populated (non-empty) on a results object.
export function populatedFields(results) {
  if (!results) return [];
  return RESULT_FIELDS.filter((f) => results[f] && String(results[f]).trim() !== "");
}

// A contact is "verified" if it has a real email or a candidate phone.
export function isVerified(results) {
  return !!(results && ((results.verified_email && String(results.verified_email).includes("@")) || results.verified_phone));
}