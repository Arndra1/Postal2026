// Enrich.so — fallback person/company enrichment provider.
// API: POST https://dev.enrich.so/api/v3/person (email) or /api/v3/email-finder (name+domain)
// Auth: Bearer ENRICH_API_KEY
import { splitName, domainFromWebsite, fetchJson, emptyResult, failedResult, populatedFields } from "./types.ts";

export const ENRICH_SO = {
  key: "enrich_so",
  name: "Enrich.so",
  secretNames: ["ENRICH_API_KEY", "ENRICH_SO_API_KEY"],
  capabilities: ["person", "company", "email"],
  defaultPriority: 20,
};

export function isConfigured() {
  return !!(process.env.ENRICH_API_KEY || process.env.ENRICH_SO_API_KEY);
}

export async function enrich(inputs) {
  const key = process.env.ENRICH_API_KEY || process.env.ENRICH_SO_API_KEY;
  const start = Date.now();
  if (!key) return emptyResult(ENRICH_SO.name, ENRICH_SO.key, Date.now() - start, "missing_api_key");

  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };

  // Direct person lookup when an email is available.
  if (inputs.email) {
    let res;
    try {
      res = await fetchJson("https://dev.enrich.so/api/v3/person", { method: "POST", headers, body: JSON.stringify({ email: inputs.email }) });
    } catch (err) {
      const msg = err.message || "provider_error";
      return failedResult(ENRICH_SO.name, ENRICH_SO.key, msg.includes("timeout") ? "timeout" : "failed", Date.now() - start, msg);
    }
    const duration_ms = Date.now() - start;
    if (res.ok && res.json && (res.json.email || res.json.name)) {
      const results = {
        verified_email: res.json.email || inputs.email,
        verified_phone: res.json.phone || "",
        website: res.json.company_domain ? `https://${res.json.company_domain}` : domainFromWebsite(inputs.website),
        linkedin: res.json.linkedin || "",
        address: res.json.location || "",
        job_title: res.json.title || inputs.job_title || "",
        company: res.json.company || inputs.business_name,
      };
      return { status: "success", results, data_sources: [ENRICH_SO.name], provider_key: ENRICH_SO.key, fields_returned: populatedFields(results), duration_ms, error: "" };
    }
    return emptyResult(ENRICH_SO.name, ENRICH_SO.key, duration_ms);
  }

  // Email-finder by name + domain.
  const { first, last } = splitName(inputs.person_name);
  const domain = domainFromWebsite(inputs.website);
  if (!first || !last || !domain) return emptyResult(ENRICH_SO.name, ENRICH_SO.key, Date.now() - start);

  let res;
  try {
    res = await fetchJson("https://dev.enrich.so/api/v3/email-finder", { method: "POST", headers, body: JSON.stringify({ first_name: first, last_name: last, domain }) });
  } catch (err) {
    const msg = err.message || "provider_error";
    return failedResult(ENRICH_SO.name, ENRICH_SO.key, msg.includes("timeout") ? "timeout" : "failed", Date.now() - start, msg);
  }
  const duration_ms = Date.now() - start;
  if (res.ok && res.json && res.json.email) {
    const results = {
      verified_email: res.json.email,
      verified_phone: "",
      website: domain ? `https://${domain}` : "",
      linkedin: res.json.linkedin || "",
      address: "",
      job_title: res.json.title || inputs.job_title || "",
      company: res.json.company || inputs.business_name,
    };
    return { status: "success", results, data_sources: [ENRICH_SO.name], provider_key: ENRICH_SO.key, fields_returned: populatedFields(results), duration_ms, error: "" };
  }
  return emptyResult(ENRICH_SO.name, ENRICH_SO.key, duration_ms);
}