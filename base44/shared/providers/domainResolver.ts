// Domain resolver — discovers a company website domain for business leads that
// arrive from public records with only a business name + city (no website).
// Feeds Enrich.so's email-finder step so it has a domain to work with.
//
// Resolution order:
//   1. DomainCache (fresh <30d entry) — return immediately on hit.
//   2. Clearbit Autocomplete (free, no key) — top matching domain.
//   3. PDL Company Search (paid fallback, reuses PDL_API_KEY).
//   4. null — no heuristic guessing (never "businessname.com").
//
// All writes go through base44.asServiceRole (bypasses RLS). 0 credits charged.

import { fetchJson } from "./types.ts";

const CACHE_TTL_DAYS = 30;
const CLEARBIT_TIMEOUT_MS = 8000;

// ---- helpers ----

export function normalizeCacheKey(name, city) {
  const norm = (s) =>
    String(s || "")
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
  const n = norm(name);
  const c = norm(city);
  return c ? `${n}+${c}` : n;
}

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function stripProtocol(d) {
  if (!d) return "";
  let w = String(d).trim();
  w = w.replace(/^https?:\/\//, "").replace(/^www\./, "");
  return w.split("/")[0];
}

// Loose name overlap (handles "Acme LLC" vs "Acme"). Strips common entity
// suffixes before checking substring containment in either direction.
function nameMatches(bizNorm, candidateNorm) {
  if (!bizNorm || !candidateNorm) return false;
  if (bizNorm === candidateNorm) return true;
  const strip = (s) =>
    s
      .replace(/\b(inc|llc|llp|corp|corporation|company|co|ltd|limited|pllc|the)\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const a = strip(bizNorm);
  const b = strip(candidateNorm);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

// ---- providers ----

async function clearbitLookup(businessName) {
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(businessName)}`;
  let res;
  try {
    res = await fetchJson(url, { method: "GET" }, CLEARBIT_TIMEOUT_MS);
  } catch (_err) {
    return null; // timeout/network = miss, fall through to PDL
  }
  if (!res.ok || !Array.isArray(res.json)) return null;
  const biz = normalizeName(businessName);
  for (const m of res.json) {
    if (m && m.name && m.domain && nameMatches(biz, normalizeName(m.name))) {
      return stripProtocol(m.domain);
    }
  }
  return null;
}

async function pdlCompanyLookup(businessName, city, state) {
  const key = process.env.PDL_API_KEY;
  if (!key) return null;

  const query = { name: { term: businessName } };
  const location = [city, state].filter(Boolean).join(", ");
  if (location) query.location = location;

  let res;
  try {
    res = await fetchJson("https://api.peopledatalabs.com/v5/company/search", {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ query, size: 1, titlecase: true }),
    });
  } catch (_err) {
    return null;
  }
  if (!res.ok || !res.json || !Array.isArray(res.json.data) || res.json.data.length === 0) return null;
  const co = res.json.data[0] || {};
  return stripProtocol(co.website || "") || null;
}

// ---- cache read/write ----

async function readCache(base44, cacheKey) {
  try {
    const rows = await base44.asServiceRole.entities.DomainCache.filter({ cache_key: cacheKey });
    if (!rows || rows.length === 0) return null;
    const row = rows[0];
    const ageMs = Date.now() - new Date(row.created_date).getTime();
    if (ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null; // stale
    return row;
  } catch (_e) {
    return null;
  }
}

async function writeCache(base44, cacheKey, businessName, city, domain, resolvedVia) {
  const payload = {
    cache_key: cacheKey,
    business_name: businessName || "",
    city: city || "",
    domain: domain || "",
    found: !!domain,
    resolved_via: resolvedVia,
  };
  try {
    const existing = await base44.asServiceRole.entities.DomainCache.filter({ cache_key: cacheKey });
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.DomainCache.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.DomainCache.create(payload);
    }
  } catch (_e) {
    // cache write failure must never break enrichment
  }
}

// ---- main entry ----

export async function resolveDomain(base44, businessName, city, state) {
  const start = Date.now();
  const name = String(businessName || "").trim();
  if (!name) return { domain: null, method: "not-found", duration_ms: Date.now() - start };

  const cacheKey = normalizeCacheKey(name, city);

  // 1. cache
  const cached = await readCache(base44, cacheKey);
  if (cached) {
    return {
      domain: cached.found ? cached.domain || null : null,
      method: cached.found ? "cache-hit" : "cache-miss-null",
      duration_ms: Date.now() - start,
    };
  }

  // 2. clearbit (free, primary)
  let resolvedVia = "clearbit";
  let domain = await clearbitLookup(name);

  // 3. pdl company search (paid fallback)
  if (!domain) {
    resolvedVia = "pdl_company";
    domain = await pdlCompanyLookup(name, city, state);
  }

  const method = domain ? resolvedVia : "not-found";

  // 4. write back (domain or null-as-found=false)
  await writeCache(base44, cacheKey, name, city, domain, resolvedVia);

  return { domain, method, duration_ms: Date.now() - start };
}