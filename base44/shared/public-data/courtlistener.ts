// CourtListener provider — public court dockets & parties (via the RECAP API).
// Used for lawful public-record / business research only. NOT positioned as
// consumer background reports, employment/tenant/credit/insurance screening.

import { fetchJson, prospect } from "./types.ts";

export const COURTLISTENER = {
  key: "courtlistener",
  name: "CourtListener — Public Dockets",
  category: "public_records",
  secret: "COURTLISTENER_API_TOKEN",
};

export function isConfigured() {
  return !!process.env.COURTLISTENER_API_TOKEN;
}

// Search public court parties by name. Returns business entities involved in
// federal/state court matters, with links to the official docket.
export async function searchParties(inputs) {
  const token = process.env.COURTLISTENER_API_TOKEN;
  const q = inputs.business_name || inputs.person_name || "";
  if (!q) return { status: "failed", error: "name_required", results: [] };

  const url = `https://www.courtlistener.com/api/rest/v4/parties/?name=${encodeURIComponent(q)}&page_size=25`;
  const { ok, status, json } = await fetchJson(url, {
    headers: { Authorization: `Token ${token}` },
  });
  if (!ok || !json || !json.results) return { status: "failed", error: `cl_${status}`, results: [] };

  const results = (json.results || []).map((p) => {
    const docket = (p.party_types && p.party_types[0]) || {};
    const docketId = docket.docket_id || "";
    return prospect({
      business_name: p.name || "",
      jurisdiction: "Federal / State Courts",
      agency: "U.S. Courts (via CourtListener)",
      source: "CourtListener Public Dockets",
      source_url: docketId
        ? `https://www.courtlistener.com/docket/${docketId}/`
        : "https://www.courtlistener.com/",
      official_record_id: docketId ? String(docketId) : "",
      industry: docket.name ? `Party: ${docket.name}` : "",
      record_type: "public_record",
      record_label: "PUBLIC RECORD",
    });
  });

  return { status: "success", results, source: "CourtListener" };
}