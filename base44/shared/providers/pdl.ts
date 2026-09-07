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
  const emails = Array.isArray(d.emails) ? d.emails : [];
  const verifiedEmail = emails.map((e) => (typeof e === "string" ? e : e.address)).find((a) => a && a.includes("@")) || "";
  const phones = Array.isArray(d.phone_numbers) ? d.phone_numbers : [];
  const phone = phones.find((p) => p) || "";
  const website = d.website || (Array.isArray(d.job_company_website) ? d.job_company_website[0] : "") || (domain ? `https://${domain}` : "");

  const results = {
    verified_email: verifiedEmail,
    verified_phone: phone,
    website,
    linkedin: d.linkedin_url || "",
    address: d.location_name || "",
    job_title: d.job_title || inputs.job_title || "",
    company: d.job_company_name || company,
  };

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