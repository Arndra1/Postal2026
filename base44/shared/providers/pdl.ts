// People Data Labs — primary person/company enrichment provider.
// API: GET https://api.peopledatalabs.com/v5/person/enrich (X-Api-Key header)
import { splitName, domainFromWebsite, fetchJson, emptyResult, failedResult, populatedFields } from "./types.ts";

export const PDL = {
  key: "people_data_labs",
  name: "People Data Labs",
  secretNames: ["PDL_API_KEY"],
  capabilities: ["person", "company", "email", "phone"],
  defaultPriority: 10,
};

export function isConfigured() {
  return !!process.env.PDL_API_KEY;
}

export async function enrich(inputs) {
  const key = process.env.PDL_API_KEY;
  const start = Date.now();
  if (!key) return emptyResult(PDL.name, PDL.key, Date.now() - start, "missing_api_key");

  const { first, last } = splitName(inputs.person_name);
  const company = inputs.business_name || "";
  const domain = domainFromWebsite(inputs.website);
  const location = [inputs.city, inputs.state].filter(Boolean).join(", ");

  const params = new URLSearchParams();
  if (first) params.set("first_name", first);
  if (last) params.set("last_name", last);
  if (company) params.set("company", company);
  else if (domain) params.set("company", domain);
  if (location) params.set("location", location);
  if (inputs.email) params.set("email", inputs.email);
  if (inputs.phone) params.set("phone", inputs.phone);
  params.set("titlecase", "true");

  const url = `https://api.peopledatalabs.com/v5/person/enrich?${params.toString()}`;
  let res;
  try {
    res = await fetchJson(url, { headers: { "X-Api-Key": key } });
  } catch (err) {
    const msg = err.message || "provider_error";
    const status = msg.includes("timeout") ? "timeout" : "failed";
    return failedResult(PDL.name, PDL.key, status, Date.now() - start, msg);
  }

  const duration_ms = Date.now() - start;
  if (res.status === 404 || !res.json || !res.json.data) {
    return emptyResult(PDL.name, PDL.key, duration_ms);
  }
  if (!res.ok) {
    return failedResult(PDL.name, PDL.key, "failed", duration_ms, `pdl_${res.status}`);
  }

  const d = res.json.data || {};
  // PDL v5 field names: work_email (string), personal_emails (array of strings),
  // recommended_personal_email (string), mobile_phone (string).
  // Older "emails"/"phone_numbers" array fields do not exist in v5 responses.
  const emailCandidates = [
    d.work_email,
    ...(Array.isArray(d.personal_emails) ? d.personal_emails : []),
    d.recommended_personal_email,
  ].filter((e) => e && String(e).includes("@"));
  const verifiedEmail = emailCandidates[0] || "";
  const phone = d.mobile_phone || "";
  const website = d.website
    || (Array.isArray(d.job_company_website) ? d.job_company_website[0] : (d.job_company_website || ""))
    || (domain ? `https://${domain}` : "");

  const results = {
    verified_email: verifiedEmail,
    verified_phone: phone,
    website,
    linkedin: d.linkedin_url || "",
    address: d.location_name || "",
    job_title: d.job_title || inputs.job_title || "",
    company: d.job_company_name || company,
  };

  // Logging-only guard: if PDL returned a profile but none of the core
  // contact fields (email/phone/website) are populated — common with
  // plan-tier restrictions — label this "empty" so the provider_breakdown
  // log reads accurately. Downstream behavior is identical: callProvider's
  // field-level merge contributes nothing either way (no populated fields
  // to fill), and emptyResult carries the same data_sources entry, so the
  // only visible difference is the status label in the breakdown.
  if (!verifiedEmail && !phone && !website) {
    return emptyResult(PDL.name, PDL.key, duration_ms);
  }

  return {
    status: "success",
    results,
    data_sources: [PDL.name],
    provider_key: PDL.key,
    fields_returned: populatedFields(results),
    duration_ms,
    error: "",
  };
}