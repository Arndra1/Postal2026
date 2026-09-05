// Bankruptcy prospect adapter — CourtListener RECAP Search API (type=r).
//
// Surfaces recent PUBLIC bankruptcy filings (chapter 7/11/13) as lawful
// marketing prospects for credit-service companies. A bankruptcy filing is a
// factual public-record event. This adapter NEVER characterizes a person as
// "credit denied", "high risk", "financially distressed", or similar — it
// reports only what the public record contains.
//
// Uses ONLY fields actually returned by the CourtListener Search API:
// caseName (debtor), docketNumber, dateFiled, court, court_id, chapter,
// docket_absolute_url, party, party_id, docket_id.
//
// Debtor physical addresses are NOT reliably available in the free RECAP
// archive, so this adapter never fabricates an address field.
//
// Server-side only. Rate limit: CourtListener allows ~5 requests/min.

import { fetchJson, prospect } from "./types.ts";

export const BANKRUPTCY_SOURCE = {
  key: "courtlistener_bankruptcy",
  name: "CourtListener — Bankruptcy Filings",
  category: "public_records",
  secret: "COURTLISTENER_API_TOKEN",
};

export function isConfigured() {
  return !!process.env.COURTLISTENER_API_TOKEN;
}

// Federal bankruptcy court IDs by state (PACER/CourtListener convention: IDs
// end in "b"). Used to filter the Search API `court` param by state. When a
// state is not selected, no court filter is applied (national results).
const BANKRUPTCY_COURTS_BY_STATE = {
  AL: ["alnb", "almb", "alsb"],
  AK: ["akb"],
  AZ: ["azb"],
  AR: ["areb", "arwb"],
  CA: ["caeb", "cacb", "canb", "casb"],
  CO: ["cob"],
  CT: ["ctb"],
  DE: ["deb"],
  DC: ["dcb"],
  FL: ["flnb", "flmb", "flsb"],
  GA: ["ganb", "gamb", "gasb"],
  HI: ["hib"],
  ID: ["idb"],
  IL: ["ilnb", "ilcb", "ilsb"],
  IN: ["innb", "insb"],
  IA: ["ianb", "iasb"],
  KS: ["ksb"],
  KY: ["kyeb", "kywb"],
  LA: ["laeb", "lamb", "lawb"],
  ME: ["meb"],
  MD: ["mdb"],
  MA: ["mab"],
  MI: ["mieb", "miwb"],
  MN: ["mnb"],
  MS: ["msnb", "mssb"],
  MO: ["moeb", "mowb"],
  MT: ["mtb"],
  NE: ["neb"],
  NV: ["nvb"],
  NH: ["nhb"],
  NJ: ["njb"],
  NM: ["nmb"],
  NY: ["nyeb", "nynb", "nysb", "nywb"],
  NC: ["nceb", "ncmb", "ncwb"],
  ND: ["ndb"],
  OH: ["ohnb", "ohsb"],
  OK: ["okeb", "oknb", "okwb"],
  OR: ["orb"],
  PA: ["paeb", "pamb", "pawb"],
  RI: ["rib"],
  SC: ["scb"],
  SD: ["sdb"],
  TN: ["tneb", "tnmb", "tnwb"],
  TX: ["txeb", "txnb", "txsb", "txwb"],
  UT: ["utb"],
  VT: ["vtb"],
  VA: ["vaeb", "vawb"],
  WA: ["waeb", "wawb"],
  WV: ["wvnb", "wvsb"],
  WI: ["wieb", "wiwb"],
  WY: ["wyb"],
};

// Derive a 2-letter state code from a bankruptcy court_id (e.g. "ilnb" → "IL").
function stateFromCourtId(courtId) {
  if (!courtId || courtId.length < 2) return "";
  return courtId.slice(0, 2).toUpperCase();
}

// Heuristic: does the debtor name look like a business entity? Used ONLY to
// set lead_type (person vs business). Conservative — defaults to "person"
// when no business indicator is present.
const BUSINESS_INDICATORS = /\b(LLC|L\.L\.C\.|INC|INC\.|CORP|CORP\.|CORPORATION|CO\.|COMPANY|LTD|LTD\.|LP|L\.P\.|LLP|L\.L\.P\.|PLLC|P\.L\.L\.C\.|LLC\b)\b/i;
function looksLikeBusiness(name) {
  return BUSINESS_INDICATORS.test(name || "");
}

// Map a CourtListener Search API result (type=r) to a standardized bankruptcy prospect.
function mapBankruptcyResult(hit) {
  const caseName = hit.caseName || hit.case_name_full || "";
  const courtId = hit.court_id || "";
  const state = stateFromCourtId(courtId);
  const docketId = hit.docket_id || "";
  let docketUrl = hit.docket_absolute_url ||
    (docketId ? `/docket/${docketId}/` : "");
  if (docketUrl && !docketUrl.startsWith("http")) {
    docketUrl = `https://www.courtlistener.com${docketUrl}`;
  }
  const chapter = hit.chapter ? String(hit.chapter) : "";
  const dateFiled = hit.dateFiled || "";

  const isBusiness = looksLikeBusiness(caseName);

  return prospect({
    person_name: !isBusiness ? caseName : "",
    business_name: isBusiness ? caseName : "",
    state,
    jurisdiction: courtId,
    agency: hit.court || "U.S. Bankruptcy Court",
    source: "CourtListener Bankruptcy Filings",
    source_url: docketUrl,
    official_record_id: hit.docketNumber || (docketId ? String(docketId) : ""),
    industry: chapter ? `Chapter ${chapter} Bankruptcy` : "Bankruptcy Filing",
    record_type: "public_record",
    record_label: "PUBLIC RECORD",
    extra: {
      lead_type: isBusiness ? "business" : "person",
      event_type: "bankruptcy_filing",
      event_date: dateFiled,
      chapter,
      court: hit.court || "",
      court_id: courtId,
      case_name: caseName,
      docket_number: hit.docketNumber || "",
      docket_id: docketId ? String(docketId) : "",
      docket_url: docketUrl,
      pacer_case_id: hit.pacer_case_id || "",
      trustee: "",
      party: hit.party || "",
      party_id: hit.party_id ? String(hit.party_id) : "",
    },
  });
}

// Search recent bankruptcy filings. inputs:
//   state (2-letter, optional) — filters to that state's bankruptcy courts
//   chapter ("7"|"11"|"13"|"" optional) — post-filters client-side
//   startDate / endDate (ISO date, optional) — filed_after / filed_before
export async function searchBankruptcy(inputs) {
  const token = process.env.COURTLISTENER_API_TOKEN;
  if (!token) {
    return { status: "failed", error: "not_configured", results: [] };
  }

  const state = (inputs.state || "").toUpperCase();
  const chapter = inputs.chapter ? String(inputs.chapter) : "";

  // Build court filter: all bankruptcy courts for the selected state, or none
  // (national) when no state is selected.
  const courts = state ? BANKRUPTCY_COURTS_BY_STATE[state] || [] : [];
  const courtParam = courts.length ? `&court=${courts.join(",")}` : "";

  // When a chapter is requested, add a text query so the Search API biases
  // results toward that chapter (bankruptcy dockets mention "chapter N").
  const qParam = chapter ? `&q=${encodeURIComponent("chapter " + chapter)}` : "";

  // Date filters — default to last 30 days if none provided.
  const now = new Date();
  const defaultAfter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10);
  const filedAfter = (inputs.startDate || "").slice(0, 10) || defaultAfter;
  let dateParam = `&filed_after=${filedAfter}`;
  if (inputs.endDate) {
    dateParam += `&filed_before=${inputs.endDate.slice(0, 10)}`;
  }

  const page_size = 20;
  const url =
    `https://www.courtlistener.com/api/rest/v4/search/?type=r${courtParam}${qParam}` +
    `${dateParam}&order_by=dateFiled+desc&page_size=${page_size}`;

  const { ok, status, json } = await fetchJson(url, {
    headers: { Authorization: `Token ${token}` },
  }, 15000);

  if (!ok || !json || !json.results) {
    return { status: "failed", error: `cl_${status}`, results: [] };
  }

  let results = (json.results || []).map(mapBankruptcyResult);

  // Post-filter by chapter when requested (the Search API doesn't support a
  // chapter filter directly — it's a field on each result).
  if (chapter) {
    results = results.filter((r) => r.extra.chapter === chapter);
  }

  return {
    status: "success",
    results,
    source: "CourtListener Bankruptcy Filings",
    total_available: json.count || results.length,
  };
}