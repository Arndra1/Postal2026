// Grants.gov Search API — free, no API key required.
// POST https://api.grants.gov/v1/api/search2
// Returns federal grant opportunities (open/posted programs to apply for).
// This is distinct from USASpending.gov (which shows past award recipients).
//
// Public grant opportunity data — informational only.

import { fetchJson } from "./types.ts";

export const GRANTS_GOV = {
  key: "grants_gov",
  name: "Grants.gov",
  category: "federal_grants",
  agency: "U.S. Department of Health and Human Services (Grants.gov)",
};

export function isConfigured() {
  return true; // No API key required — free public API.
}

const BASE = "https://api.grants.gov/v1/api/search2";

// 24-hour in-memory cache (per-worker) — prevents hammering the shared API.
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

export async function searchGrants(inputs) {
  const keyword = (inputs.keyword || "").trim();
  const agency = (inputs.agencies || inputs.agency || "").trim();
  const oppStatuses = inputs.oppStatuses || "posted|forecasted";
  const fundingCategories = inputs.fundingCategories || "";
  const fundingInstruments = inputs.fundingInstruments || "";
  const rows = Math.min(Number(inputs.rows) || 25, 100);

  if (!keyword && !agency && !fundingCategories && !fundingInstruments) {
    return { status: "failed", error: "Provide a keyword, agency, or funding category to search.", results: [] };
  }

  const requestBody = {
    rows,
    keyword,
    oppStatuses,
    agencies: agency,
    fundingCategories,
    fundingInstruments,
    eligibilities: "",
    aln: "",
    oppNum: "",
  };

  const cacheKey = `search:${JSON.stringify(requestBody)}`;
  const cached = getCached(cacheKey);
  if (cached) return { status: "success", results: cached, source: "Grants.gov (cached)", cached: true };

  const { ok, status, json } = await fetchJson(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  }, 20000);

  if (!ok || !json || json.errorcode !== 0 || !json.data) {
    return { status: "failed", error: `grants_gov_${status || (json && json.errorcode) || "error"}`, results: [] };
  }

  const results = (json.data.oppHits || []).map((opp) => ({
    opportunity_id: opp.id || "",
    opportunity_number: opp.number || "",
    title: opp.title || "",
    agency_code: opp.agencyCode || "",
    agency_name: opp.agencyName || "",
    open_date: opp.openDate || "",
    close_date: opp.closeDate || "",
    opportunity_status: opp.oppStatus || "",
    doc_type: opp.docType || "",
    aln_codes: opp.alnist || [],
    funding_categories: (json.data.fundingCategories || []).map((c) => c.label),
    funding_instruments: (json.data.fundingInstruments || []).map((c) => c.label),
    source: "Grants.gov",
    source_url: `https://www.grants.gov/search-results-detail/${opp.id}`,
    record_label: "PUBLIC RECORD",
    retrieved_at: new Date().toISOString(),
  }));

  setCached(cacheKey, results);
  return { status: "success", results, source: "Grants.gov" };
}