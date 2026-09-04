// Tracerfy — address-based skip-tracing (property owner lookup).
// API: POST https://tracerfy.com/v1/api/trace/lookup/ (Bearer TRACERFY_API_KEY)
// Requires an address; this provider is SKIPPED when no address data is present.
import { fetchJson, emptyResult, failedResult, populatedFields } from "./types.ts";

export const TRACERFY = {
  key: "tracerfy",
  name: "Tracerfy",
  secretNames: ["TRACERFY_API_KEY"],
  capabilities: ["property_owner", "phone", "email"],
  defaultPriority: 30,
};

export function isConfigured() {
  return !!process.env.TRACERFY_API_KEY;
}

// Tracerfy only supports address-based lookups — skip without an address.
export function hasRequiredInputs(inputs) {
  return !!(inputs.address || (inputs.city && inputs.state));
}

export async function enrich(inputs) {
  const key = process.env.TRACERFY_API_KEY;
  const start = Date.now();
  if (!key) return emptyResult(TRACERFY.name, TRACERFY.key, Date.now() - start, "missing_api_key");
  if (!hasRequiredInputs(inputs)) return emptyResult(TRACERFY.name, TRACERFY.key, Date.now() - start, "no_address");

  const body = {
    address: inputs.address || "",
    city: inputs.city || "",
    state: inputs.state || "",
    zip: inputs.zip || inputs.postal_code || "",
    find_owner: true,
  };

  let res;
  try {
    res = await fetchJson("https://tracerfy.com/v1/api/trace/lookup/", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err.message || "provider_error";
    return failedResult(TRACERFY.name, TRACERFY.key, msg.includes("timeout") ? "timeout" : "failed", Date.now() - start, msg);
  }

  const duration_ms = Date.now() - start;
  if (!res.ok || !res.json) {
    return failedResult(TRACERFY.name, TRACERFY.key, "failed", duration_ms, `tracerfy_${res.status}`);
  }
  if (!res.json.hit || !Array.isArray(res.json.persons) || res.json.persons.length === 0) {
    return emptyResult(TRACERFY.name, TRACERFY.key, duration_ms);
  }

  const person = res.json.persons[0];
  const phones = Array.isArray(person.phones) ? person.phones : [];
  const emails = Array.isArray(person.emails) ? person.emails : [];
  // Prefer the top-ranked, non-DNC phone.
  const phone = phones
    .slice()
    .sort((a, b) => (a.rank || 99) - (b.rank || 99))
    .find((p) => p && p.number && !p.dnc);
  const email = emails.slice().sort((a, b) => (a.rank || 99) - (b.rank || 99)).find((e) => e && e.email);
  const mail = person.mailing_address || {};
  const fullName = [person.first_name, person.last_name].filter(Boolean).join(" ").trim();

  const results = {
    verified_email: email ? email.email : "",
    verified_phone: phone ? phone.number : "",
    website: "",
    linkedin: "",
    address: [mail.street, mail.city, mail.state, mail.zip].filter(Boolean).join(", "),
    job_title: inputs.job_title || "",
    company: inputs.business_name || "",
  };

  return {
    status: "success",
    results,
    data_sources: [TRACERFY.name],
    provider_key: TRACERFY.key,
    fields_returned: populatedFields(results),
    duration_ms,
    error: "",
  };
}