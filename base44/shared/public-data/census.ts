// U.S. Census Bureau provider — market intelligence & geographic data.
// Uses the official Census API (acs5 demographics, cbp County Business Patterns).
// Census data supports lawful market research / geographic intelligence only —
// it is NOT used for consumer eligibility decisions.

import { fetchJson, prospect } from "./types.ts";
import { STATE_FIPS } from "../stateBusinessSources.ts";

export const CENSUS = {
  key: "census",
  name: "U.S. Census Bureau",
  category: "market_intelligence",
  secret: "CENSUS_API_KEY",
};

export function isConfigured() {
  return !!process.env.CENSUS_API_KEY;
}

// Map our industry labels to 2-digit NAICS sector codes for CBP filtering.
const NAICS_SECTORS = {
  "Agriculture": "11", "Mining": "21", "Utilities": "22", "Construction": "23",
  "Manufacturing": "31", "Wholesale": "42", "Retail": "44", "Transportation": "48",
  "Information": "51", "Finance": "52", "Real Estate": "53", "Professional": "54",
  "Management": "55", "Administrative": "56", "Education": "61", "Healthcare": "62",
  "Arts": "71", "Accommodation": "72", "Other": "81", "Public Admin": "92",
};

// County Business Patterns — business establishment & employee counts by county.
// Returns market-intelligence areas (not individual businesses).
export async function searchMarketIntel(inputs) {
  const key = process.env.CENSUS_API_KEY;
  const fips = STATE_FIPS[(inputs.state || "").toUpperCase()];
  if (!fips) return { status: "failed", error: "invalid_state", results: [] };

  const naics = NAICS_SECTORS[inputs.industry] || "";
  let url = `https://api.census.gov/data/2021/cbp?get=NAME,ESTAB,EMP,PAYANN&for=county:*&in=state:${fips}&key=${key}`;
  if (naics) url += `&NAICS2017=${naics}`;

  const { ok, status, json } = await fetchJson(url);
  if (!ok || !Array.isArray(json)) return { status: "failed", error: `census_${status}`, results: [] };

  const rows = json.slice(1)
    .map((r) => ({
      name: r[0],
      estab: parseInt(r[1] || "0", 10),
      emp: parseInt(r[2] || "0", 10),
    }))
    .filter((r) => r.estab > 0)
    .sort((a, b) => b.estab - a.estab);

  const results = rows.slice(0, 25).map((r) =>
    prospect({
      business_name: r.name,
      industry: inputs.industry || "All Industries",
      state: (inputs.state || "").toUpperCase(),
      agency: "U.S. Census Bureau",
      source: "County Business Patterns (CBP)",
      source_url: "https://www.census.gov/programs-surveys/cbp.html",
      record_type: "market_intelligence",
      record_label: "MARKET DATA",
      extra: { establishment_count: r.estab, employee_count: r.emp },
    })
  );

  return { status: "success", results, source: "Census CBP" };
}

// American Community Survey — population by state (geographic intelligence).
export async function searchDemographics(inputs) {
  const key = process.env.CENSUS_API_KEY;
  const fips = STATE_FIPS[(inputs.state || "").toUpperCase()];
  if (!fips) return { status: "failed", error: "invalid_state", results: [] };
  const url = `https://api.census.gov/data/2022/acs/acs5?get=NAME,B01001_001E&for=state:${fips}&key=${key}`;
  const { ok, status, json } = await fetchJson(url);
  if (!ok || !Array.isArray(json)) return { status: "failed", error: `census_${status}`, results: [] };
  const row = json[1] || [];
  const results = [prospect({
    business_name: row[0] || "",
    state: (inputs.state || "").toUpperCase(),
    agency: "U.S. Census Bureau",
    source: "American Community Survey (ACS 5-Year)",
    source_url: "https://www.census.gov/programs-surveys/acs/",
    record_type: "geographic_intelligence",
    record_label: "MARKET DATA",
    extra: { total_population: parseInt(row[1] || "0", 10) },
  })];
  return { status: "success", results, source: "Census ACS" };
}