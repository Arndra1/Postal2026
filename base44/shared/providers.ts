// Enrichment provider service layer.
// Live providers: People Data Labs -> Enrich.so -> Apollo (cascade),
// with NumVerify phone validation and Geoapify address normalization.
//
// Each provider's API key is read from a Base44 secret (process.env.<NAME>).
// Only providers whose keys are present are activated. When no person/company
// key is configured, enrichment fails closed (0 credits, no synthetic data).
//
// An owner can disable an individual provider via a ProviderSetting record
// (managed in the admin compliance dashboard) without removing its secret.

const PROVIDER_TIMEOUT_MS = 15000;

// Provider keys (stored in ProviderSetting.provider_key).
const KEYS = {
  PDL: "people_data_labs",
  ENRICH_SO: "enrich_so",
  APOLLO: "apollo",
  NUMVERIFY: "numverify",
  GEOAPIFY: "geoapify",
};

// ---- Helpers ---------------------------------------------------------------

function splitName(full) {
  const parts = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts[parts.length - 1] };
}

function domainFromWebsite(website) {
  if (!website) return "";
  let w = String(website).trim();
  w = w.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return w.split("/")[0];
}

// fetch with timeout via AbortController.
async function fetchJson(url, options = {}, timeoutMs = PROVIDER_TIMEOUT_MS) {
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

// Empty normalized result (provider returned no verified contact).
function emptyResult(providerName, duration_ms, error = "") {
  return { status: "empty", results: null, data_sources: [providerName], duration_ms, error };
}

// ---- Provider settings (admin toggles) ------------------------------------

async function getDisabledProviders(base44) {
  try {
    const settings = await base44.asServiceRole.entities.ProviderSetting.filter({ enabled: false });
    return new Set((settings || []).map((s) => s.provider_key));
  } catch (_e) {
    return new Set();
  }
}

// ---- People Data Labs -------------------------------------------------------

async function peopleDataLabsProvider(inputs) {
  const key = process.env.PDL_API_KEY;
  if (!key) return null;
  const { first, last } = splitName(inputs.person_name);
  const company = inputs.business_name || "";
  const domain = domainFromWebsite(inputs.website);
  const location = [inputs.city, inputs.state].filter(Boolean).join(", ");

  const params = new URLSearchParams();
  if (first) params.set("first_name", first);
  if (last) params.set("last_name", last);
  if (company) params.set("company", company);
  if (domain) params.set("company", domain);
  if (location) params.set("location", location);
  if (inputs.email) params.set("email", inputs.email);
  if (inputs.phone) params.set("phone", inputs.phone);
  params.set("titlecase", "true");

  const start = Date.now();
  const url = `https://api.peopledatalabs.com/v5/person/enrich?${params.toString()}`;
  const { ok, status, json } = await fetchJson(url, { headers: { "X-Api-Key": key } });

  if (status === 404 || !json || !json.data) {
    return emptyResult("People Data Labs", Date.now() - start);
  }
  if (!ok) {
    return { status: "failed", results: null, data_sources: ["People Data Labs"], duration_ms: Date.now() - start, error: `pdl_${status}` };
  }

  const d = json.data || {};
  const emails = Array.isArray(d.emails) ? d.emails : [];
  const verifiedEmail = emails.map((e) => (typeof e === "string" ? e : e.address)).find((a) => a && a.includes("@")) || "";
  const phones = Array.isArray(d.phone_numbers) ? d.phone_numbers : [];
  const phone = phones.find((p) => p) || "";
  const website = d.website || (Array.isArray(d.job_company_website) ? d.job_company_website[0] : "") || domainFromWebsite(inputs.website);

  return {
    status: "success",
    results: {
      verified_email: verifiedEmail,
      verified_phone: phone,
      website,
      linkedin: d.linkedin_url || "",
      address: d.location_name || "",
      job_title: d.job_title || "",
      company: d.job_company_name || company,
      confidence: json.likelihood >= 8 ? "high" : json.likelihood >= 5 ? "medium" : "low",
    },
    data_sources: ["People Data Labs"],
    duration_ms: Date.now() - start,
    error: "",
  };
}

// ---- Enrich.so -------------------------------------------------------------

async function enrichSoProvider(inputs) {
  const key = process.env.ENRICH_SO_API_KEY;
  if (!key) return null;
  const start = Date.now();
  const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json", Accept: "application/json" };

  // If we have an email, look the person up directly.
  if (inputs.email) {
    const { ok, json } = await fetchJson("https://dev.enrich.so/api/v3/person", { method: "POST", headers, body: JSON.stringify({ email: inputs.email }) });
    if (ok && json && (json.email || json.name)) {
      return {
        status: "success",
        results: {
          verified_email: json.email || inputs.email,
          verified_phone: json.phone || "",
          website: json.company_domain || domainFromWebsite(inputs.website),
          linkedin: json.linkedin || "",
          address: json.location || "",
          job_title: json.title || "",
          company: json.company || inputs.business_name,
          confidence: json.confidence || "medium",
        },
        data_sources: ["Enrich.so"],
        duration_ms: Date.now() - start,
        error: "",
      };
    }
    return emptyResult("Enrich.so", Date.now() - start);
  }

  // Otherwise use the email-finder by name + domain.
  const { first, last } = splitName(inputs.person_name);
  const domain = domainFromWebsite(inputs.website);
  if (!first || !last || !domain) return emptyResult("Enrich.so", Date.now() - start);

  const { ok, json } = await fetchJson("https://dev.enrich.so/api/v3/email-finder", { method: "POST", headers, body: JSON.stringify({ first_name: first, last_name: last, domain }) });
  if (ok && json && json.email) {
    return {
      status: "success",
      results: {
        verified_email: json.email,
        verified_phone: "",
        website: domain ? `https://${domain}` : "",
        linkedin: json.linkedin || "",
        address: "",
        job_title: json.title || inputs.job_title || "",
        company: json.company || inputs.business_name,
        confidence: json.confidence || "medium",
      },
      data_sources: ["Enrich.so"],
      duration_ms: Date.now() - start,
      error: "",
    };
  }
  return emptyResult("Enrich.so", Date.now() - start);
}

// ---- Apollo ----------------------------------------------------------------

async function apolloProvider(inputs) {
  const key = process.env.APOLLO_API_KEY;
  if (!key) return null;
  const start = Date.now();
  const headers = { "x-api-key": key, "Content-Type": "application/json", Accept: "application/json", "Cache-Control": "no-cache" };

  const params = new URLSearchParams();
  if (inputs.email) {
    params.set("email", inputs.email);
  } else {
    if (inputs.person_name) params.set("name", inputs.person_name);
    const domain = domainFromWebsite(inputs.website);
    if (domain) params.set("domain", domain);
  }
  params.set("reveal_personal_emails", "false");
  params.set("reveal_phone_number", "false");

  if (!inputs.email && !params.get("name")) return emptyResult("Apollo", Date.now() - start);

  const url = `https://api.apollo.io/api/v1/people/match?${params.toString()}`;
  const { ok, status, json } = await fetchJson(url, { method: "POST", headers });

  if (!ok || !json || !json.person) {
    if (status === 404 || (json && !json.person)) return emptyResult("Apollo", Date.now() - start);
    return { status: "failed", results: null, data_sources: ["Apollo"], duration_ms: Date.now() - start, error: `apollo_${status}` };
  }

  const p = json.person;
  const emailVerified = p.email_status === "verified" || p.email_status === "likely_to_engage";
  const org = p.organization || {};
  const address = [p.city, p.state].filter(Boolean).join(", ");

  return {
    status: "success",
    results: {
      verified_email: emailVerified && p.email ? p.email : "",
      verified_phone: "",
      website: org.primary_domain ? `https://${org.primary_domain}` : domainFromWebsite(inputs.website),
      linkedin: p.linkedin_url || "",
      address,
      job_title: p.title || inputs.job_title || "",
      company: org.name || p.organization_name || inputs.business_name,
      confidence: emailVerified ? "high" : "medium",
    },
    data_sources: ["Apollo"],
    duration_ms: Date.now() - start,
    error: "",
  };
}

// ---- NumVerify (phone validation) ------------------------------------------

async function numVerifyPhone(phone) {
  const key = process.env.NUMVERIFY_API_KEY;
  if (!key || !phone) return { valid: false, intl: "" };
  const start = Date.now();
  try {
    const num = encodeURIComponent(String(phone).trim());
    const url = `https://apilayer.net/api/validate?access_key=${key}&number=${num}`;
    const { ok, json } = await fetchJson(url);
    if (ok && json && json.valid) {
      return { valid: true, intl: json.intl_format || phone };
    }
    return { valid: false, intl: "" };
  } catch (_e) {
    return { valid: false, intl: "" };
  }
}

// ---- Geoapify (address normalization) --------------------------------------

async function geoapifyAddress(inputs) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return null;
  const text = [inputs.business_name, inputs.address, inputs.city, inputs.state].filter(Boolean).join(", ");
  if (!text) return null;
  const start = Date.now();
  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(text)}&format=json&apiKey=${key}`;
    const { ok, json } = await fetchJson(url);
    if (ok && json && Array.isArray(json.results) && json.results.length > 0) {
      const r = json.results[0];
      const city = r.city || r.town || r.village || inputs.city || "";
      const state = r.state || inputs.state || "";
      return {
        address: r.formatted || "",
        city,
        state,
        duration_ms: Date.now() - start,
      };
    }
  } catch (_e) { /* ignore — address is best-effort */ }
  return null;
}

// ---- Orchestration ---------------------------------------------------------

// A verified result must contain at least a verified email or a NumVerify-validated phone.
function isVerified(results) {
  return !!(results && ((results.verified_email && String(results.verified_email).includes("@")) || results.verified_phone));
}

export async function runEnrichment(base44, inputs) {
  const start = Date.now();
  const disabled = await getDisabledProviders(base44);

  // Build the person/company cascade (PDL -> Enrich.so -> Apollo).
  const cascade = [];
  if (process.env.PDL_API_KEY && !disabled.has(KEYS.PDL)) cascade.push({ key: KEYS.PDL, fn: peopleDataLabsProvider });
  if (process.env.ENRICH_SO_API_KEY && !disabled.has(KEYS.ENRICH_SO)) cascade.push({ key: KEYS.ENRICH_SO, fn: enrichSoProvider });
  if (process.env.APOLLO_API_KEY && !disabled.has(KEYS.APOLLO)) cascade.push({ key: KEYS.APOLLO, fn: apolloProvider });

  // Geoapify address normalization runs in parallel with the cascade.
  const geoPromise = (process.env.GEOAPIFY_API_KEY && !disabled.has(KEYS.GEOAPIFY))
    ? geoapifyAddress(inputs)
    : Promise.resolve(null);

  if (cascade.length === 0) {
    // Still await geo so the address is returned when possible, but enrichment
    // cannot verify a contact without a person/company provider.
    await geoPromise;
    return {
      status: "failed",
      results: null,
      data_sources: [],
      duration_ms: Date.now() - start,
      error: "No data provider is currently configured. Enrichment will be available once a live provider is connected.",
    };
  }

  let winner = null;
  const data_sources = [];

  for (const { key, fn } of cascade) {
    let providerResult;
    try {
      providerResult = await fn(inputs);
    } catch (err) {
      const msg = (err && err.message) ? err.message : "provider_error";
      if (msg.includes("timeout") || msg.includes("Timeout")) {
        providerResult = { status: "timeout", results: null, data_sources: [key], duration_ms: 0, error: msg };
      } else {
        providerResult = { status: "failed", results: null, data_sources: [key], duration_ms: 0, error: msg };
      }
    }
    if (providerResult && providerResult.data_sources && !data_sources.includes(providerResult.data_sources[0])) {
      data_sources.push(providerResult.data_sources[0]);
    }
    if (providerResult && providerResult.status === "success" && isVerified(providerResult.results)) {
      winner = providerResult;
      break;
    }
  }

  const geo = await geoPromise;

  if (!winner) {
    // No provider returned a verified contact — fail closed, 0 credits.
    return {
      status: "empty",
      results: null,
      data_sources,
      duration_ms: Date.now() - start,
      error: "No verified contact information was found for the provided details.",
    };
  }

  // Validate any candidate phone through NumVerify. Non-verified phones are dropped.
  let results = { ...winner.results };
  if (results.verified_phone && process.env.NUMVERIFY_API_KEY && !disabled.has(KEYS.NUMVERIFY)) {
    const check = await numVerifyPhone(results.verified_phone);
    if (check.valid) {
      results.verified_phone = check.intl || results.verified_phone;
      if (!data_sources.includes("NumVerify")) data_sources.push("NumVerify");
    } else {
      results.verified_phone = "";
      // If the phone was the only verified contact, the result is no longer verified.
      if (!isVerified(results)) {
        return {
          status: "empty",
          results: null,
          data_sources,
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
    duration_ms: Date.now() - start,
    error: "",
  };
}