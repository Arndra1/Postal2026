// Shared helpers for public-data provider modules. Server-side only.

export const PUBLIC_TIMEOUT_MS = 15000;

// fetch wrapper with AbortController timeout + safe JSON parsing.
export async function fetchJson(url, opts = {}, ms = PUBLIC_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const r = await fetch(url, { ...opts, signal: ctrl.signal });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch (_) { /* not JSON */ }
    return { ok: r.ok, status: r.status, json, text: text.slice(0, 500) };
  } catch (err) {
    const msg = (err && err.name === "AbortError") ? "timeout" : "network_error";
    return { ok: false, status: 0, json: null, text: msg };
  } finally {
    clearTimeout(t);
  }
}

// Standardized public-record prospect shape returned to the function layer.
export function prospect(p) {
  return {
    business_name: p.business_name || "",
    person_name: p.person_name || "",
    job_title: p.job_title || "",
    industry: p.industry || "",
    city: p.city || "",
    state: p.state || "",
    zip: p.zip || "",
    address: p.address || "",
    website: p.website || "",
    phone: p.phone || "",
    email: p.email || "",
    official_record_id: p.official_record_id || "",
    jurisdiction: p.jurisdiction || "",
    agency: p.agency || "",
    source: p.source || "",
    source_url: p.source_url || "",
    record_type: p.record_type || "public_record",
    record_label: p.record_label || "PUBLIC RECORD",
    retrieved_at: new Date().toISOString(),
    extra: p.extra || {},
  };
}