// ProPublica Nonprofit Explorer API v2 — free, no API key required.
// Returns IRS nonprofit filing data: org name, EIN, city/state, NTEE code.
// Officer names are extracted from e-filed Form 990 XML (Part VII).
// Public IRS filing information — informational only, no eligibility/credit/
// financial-health scoring.

import { fetchJson, prospect } from "./types.ts";

export const PROPUBLICA = {
  key: "propublica_nonprofits",
  name: "ProPublica Nonprofit Explorer",
  category: "nonprofits",
  secret: "",
};

export function isConfigured() {
  return true; // No API key required — free public API.
}

// NTEE Major Groups (1-10) as accepted by ProPublica's ntee[id] parameter.
export const NTEE_MAJOR_GROUPS = [
  { id: 1, label: "Arts, Culture & Humanities" },
  { id: 2, label: "Education" },
  { id: 3, label: "Environment & Animals" },
  { id: 4, label: "Health" },
  { id: 5, label: "Human Services" },
  { id: 6, label: "International, Foreign Affairs" },
  { id: 7, label: "Public, Societal Benefit" },
  { id: 8, label: "Religion Related" },
  { id: 9, label: "Mutual/Membership Benefit" },
  { id: 10, label: "Unknown / Unclassified" },
];

const BASE = "https://projects.propublica.org/nonprofits/api/v2";

// ---- 24-hour in-memory cache (per-worker) ----
// Prevents repeated identical searches from hammering the shared public API.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  return entry.data;
}
function setCached(key, data) {
  cache.set(key, { ts: Date.now(), data });
  if (cache.size > 100) {
    const oldest = cache.keys().next().value;
    cache.delete(oldest);
  }
}

// Search nonprofits by keyword, state, and/or NTEE major group.
export async function searchNonprofits(inputs) {
  const params = new URLSearchParams();
  if (inputs.keyword) params.set("q", inputs.keyword);
  if (inputs.state) params.set("state[id]", inputs.state.toUpperCase());
  if (inputs.ntee) params.set("ntee[id]", String(inputs.ntee));
  if (!inputs.keyword && !inputs.state && !inputs.ntee) {
    return { status: "failed", error: "Provide a keyword, state, or category.", results: [] };
  }

  const cacheKey = `search:${params.toString()}`;
  const cached = getCached(cacheKey);
  if (cached) return { status: "success", results: cached, source: "ProPublica Nonprofit Explorer (cached)", cached: true };

  const url = `${BASE}/search.json?${params.toString()}`;
  const { ok, status, json } = await fetchJson(url);
  if (!ok || !json || !json.organizations) {
    return { status: "failed", error: `propublica_${status}`, results: [] };
  }

  const results = (json.organizations || []).map((org) =>
    prospect({
      business_name: org.name || org.sub_name || "",
      city: org.city || "",
      state: org.state || "",
      industry: org.ntee_code || "",
      official_record_id: org.strein || String(org.ein || ""),
      jurisdiction: org.state || "US",
      agency: "IRS (via ProPublica Nonprofit Explorer)",
      source: "ProPublica Nonprofit Explorer",
      source_url: `https://projects.propublica.org/nonprofits/organizations/${org.ein}`,
      record_type: "nonprofit_filing",
      record_label: "PUBLIC RECORD",
      extra: {
        ein: org.strein || String(org.ein || ""),
        ntee_code: org.ntee_code || "",
        subseccd: org.subseccd,
        name_alt: org.sub_name || "",
      },
    })
  );

  setCached(cacheKey, results);
  return { status: "success", results, source: "ProPublica Nonprofit Explorer" };
}

// Fetch org detail and parse e-filed Form 990 XML for officer names (Part VII).
// Returns { officers: [{name, title}], financials } or { officers: [], financials, no_filing }.
// Never blocks — fails gracefully to empty officers.
export async function lookupOfficers(ein) {
  const cleanEin = (ein || "").replace(/[^0-9]/g, "");
  if (!cleanEin) return { officers: [], financials: null };

  const cacheKey = `officers:${cleanEin}`;
  const cached = getCached(cacheKey);
  if (cached) return { ...cached, cached: true };

  // 1. Fetch org detail for latest_object_id and financials.
  const orgUrl = `${BASE}/organizations/${cleanEin}.json`;
  const { ok, json } = await fetchJson(orgUrl);
  if (!ok || !json || !json.organization) return { officers: [], financials: null };

  const org = json.organization;
  const financials = {
    revenue: org.revenue_amount || 0,
    income: org.income_amount || 0,
    assets: org.asset_amount || 0,
    ntee_code: org.ntee_code || "",
    address: [org.address, org.city, org.state, org.zipcode].filter(Boolean).join(", "),
  };

  // 2. Get the latest e-filed filing XML.
  const objectId = org.latest_object_id;
  if (!objectId) {
    const result = { officers: [], financials, no_filing: true };
    setCached(cacheKey, result);
    return result;
  }

  // 3. Fetch and parse the XML filing.
  let officers = [];
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15000);
    const xmlRes = await fetch(`https://projects.propublica.org/nonprofits/download-xml?object_id=${objectId}`, { signal: ctrl.signal });
    clearTimeout(t);
    if (xmlRes.ok) {
      const xml = await xmlRes.text();
      officers = parseOfficersFromXml(xml);
    }
  } catch (_e) {
    // XML fetch failed — return org-only.
  }

  const result = { officers, financials };
  setCached(cacheKey, result);
  return result;
}

// Parse Form 990 XML for officer names (Part VII — OfficerDirTrstCrntGrp).
function parseOfficersFromXml(xml) {
  const officers = [];
  // Form 990: <OfficerDirTrstCrntGrp><PersonNm>...</PersonNm><TitleTxt>...</TitleTxt></OfficerDirTrstCrntGrp>
  const blockRegex = /<OfficerDirTrstCrntGrp>([\s\S]*?)<\/OfficerDirTrstCrntGrp>/g;
  let match;
  while ((match = blockRegex.exec(xml)) !== null) {
    const block = match[1];
    const nameMatch = block.match(/<PersonNm>([^<]+)<\/PersonNm>/);
    const titleMatch = block.match(/<TitleTxt>([^<]+)<\/TitleTxt>/);
    if (nameMatch) {
      officers.push({ name: nameMatch[1].trim(), title: titleMatch ? titleMatch[1].trim() : "" });
    }
  }
  // Fallback: Form 990-PF uses <OfcrDirTrusteesOrKeyEmplGrp>
  if (officers.length === 0) {
    const pfRegex = /<OfcrDirTrusteesOrKeyEmplGrp>([\s\S]*?)<\/OfcrDirTrusteesOrKeyEmplGrp>/g;
    while ((match = pfRegex.exec(xml)) !== null) {
      const block = match[1];
      const nameMatch = block.match(/<PersonNm>([^<]+)<\/PersonNm>/);
      const titleMatch = block.match(/<TitleTxt>([^<]+)<\/TitleTxt>/);
      if (nameMatch) {
        officers.push({ name: nameMatch[1].trim(), title: titleMatch ? titleMatch[1].trim() : "" });
      }
    }
  }
  return officers.slice(0, 10);
}