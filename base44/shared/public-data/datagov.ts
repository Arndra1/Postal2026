// Data.gov provider — federal open data via the FEC (campaign finance) API.
// FEC committee filings are public records of registered organizations
// (including many business-affiliated PACs/LLCs). Useful for lawful business
// prospecting and public-record research. NOT consumer background reports.

import { fetchJson, prospect } from "./types.ts";

export const DATA_GOV = {
  key: "data_gov_fec",
  name: "Data.gov — FEC Committee Filings",
  category: "government_open_data",
  secret: "DATA_GOV_API_KEY",
};

export function isConfigured() {
  return !!process.env.DATA_GOV_API_KEY;
}

// Search registered committees (business/political entities) by name and state.
export async function searchBusinessEntities(inputs) {
  const key = process.env.DATA_GOV_API_KEY;
  const params = new URLSearchParams({
    per_page: "25",
    sort_null_only: "false",
    sort_hide_null: "false",
    api_key: key,
  });
  if (inputs.business_name) params.set("q", inputs.business_name);
  if (inputs.state) params.set("state", inputs.state.toUpperCase());

  const url = `https://api.open.fec.gov/v1/committees/?${params.toString()}`;
  const { ok, status, json } = await fetchJson(url);
  if (!ok || !json || !json.results) return { status: "failed", error: `fec_${status}`, results: [] };

  const results = (json.results || []).map((c) =>
    prospect({
      business_name: c.name || "",
      person_name: c.treasurer_name || "",
      city: c.city || "",
      state: c.state || "",
      zip: c.zip || "",
      address: [c.street_1, c.street_2].filter(Boolean).join(", "),
      industry: c.committee_type_full || "",
      official_record_id: c.committee_id || "",
      jurisdiction: c.state || "Federal",
      agency: "Federal Election Commission (via Data.gov)",
      source: "FEC Committee Filings",
      source_url: c.committee_id
        ? `https://www.fec.gov/data/committee/${c.committee_id}/`
        : "https://www.fec.gov/data/",
      record_type: "public_record",
      record_label: "PUBLIC RECORD",
    })
  );

  return { status: "success", results, source: "FEC (Data.gov)" };
}