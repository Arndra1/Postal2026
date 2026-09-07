// Enrich.so — fallback person/company enrichment provider.
//
// Current API (verified 2026-09):
//   Email Finder   POST https://dev.enrich.so/api/v3/email-finder
//                  body: { firstName, lastName, domain }  (camelCase)
//                  resp: { success, data: { found, email, confidence, provider } }
//
//   Reverse Lookup POST https://dev.enrich.so/api/v3/reverse-lookup/lookup
//                  body: { email }
//                  resp: { success, data: { found, displayName, headline,
//                         companyName, location, profileUrl, ... } }
//
// Auth: Bearer ENRICH_SO_API_KEY
import { splitName, domainFromWebsite, fetchJson, emptyResult, failedResult, populatedFields } from "./types.ts";

export const ENRICH_SO = {
  key: "enrich_so",
  name: "Enrich.so",
  secretNames: ["ENRICH_SO_API_KEY"],
  capabilities: ["person", "company", "email"],
  defaultPriority: 20,
};

export function isConfigured() {
  return !!process.env.ENRICH_SO_API_KEY;
}

export async function enrich(inputs) {
  const key = process.env.ENRICH_SO_API_KEY;
  const start = Date.now();
  if (!key) return emptyResult(ENRICH_SO.name, ENRICH_SO.key, Date.now() - start, "missing_api_key");

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };
  const BASE = "https://dev.enrich.so/api/v3";

  // --- Reverse lookup: email -> professional profile ---
  if (inputs.email) {
    let res;
    try {
      res = await fetchJson(`${BASE}/reverse-lookup/lookup`, { method: "POST", headers, body: JSON.stringify({ email: inputs.email }) });
    } catch (err) {
      const msg = err.message || "provider_error";
      return failedResult(ENRICH_SO.name, ENRICH_SO.key, msg.includes("timeout") ? "timeout" : "failed", Date.now() - start, msg);
    }
    const duration_ms = Date.now() - start;
    const data = res.json && res.json.data ? res.json.data : {};
    if (res.ok && data.found && (data.displayName || data.headline || data.companyName)) {
      const results = {
        verified_email: inputs.email,
        verified_phone: "",
        website: inputs.website || "",
        linkedin: data.profileUrl || "",
        address: data.location || "",
        job_title: data.headline || inputs.job_title || "",
        company: data.companyName || inputs.business_name || "",
      };
      return { status: "success", results, data_sources: [ENRICH_SO.name], provider_key: ENRICH_SO.key, fields_returned: populatedFields(results), duration_ms, error: "" };
    }
    return emptyResult(ENRICH_SO.name, ENRICH_SO.key, duration_ms);
  }

  // --- Email finder: name + domain -> verified email ---
  const { first, last } = splitName(inputs.person_name);
  const domain = domainFromWebsite(inputs.website);
  if (!first || !last || !domain) return emptyResult(ENRICH_SO.name, ENRICH_SO.key, Date.now() - start);

  let res;
  try {
    res = await fetchJson(`${BASE}/email-finder`, { method: "POST", headers, body: JSON.stringify({ firstName: first, lastName: last, domain }) });
  } catch (err) {
    const msg = err.message || "provider_error";
    return failedResult(ENRICH_SO.name, ENRICH_SO.key, msg.includes("timeout") ? "timeout" : "failed", Date.now() - start, msg);
  }
  const duration_ms = Date.now() - start;
  const data = res.json && res.json.data ? res.json.data : {};
  if (res.ok && data.found && data.email) {
    const results = {
      verified_email: data.email,
      verified_phone: "",
      website: domain ? `https://${domain}` : "",
      linkedin: "",
      address: "",
      job_title: inputs.job_title || "",
      company: inputs.business_name || "",
    };
    return { status: "success", results, data_sources: [ENRICH_SO.name], provider_key: ENRICH_SO.key, fields_returned: populatedFields(results), duration_ms, error: "" };
  }
  return emptyResult(ENRICH_SO.name, ENRICH_SO.key, duration_ms);
}