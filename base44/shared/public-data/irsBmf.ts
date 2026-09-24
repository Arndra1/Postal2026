// IRS Exempt Organizations Business Master File (EO BMF) adapter.
//
// OFFICIAL IRS SOURCE — no scraped or third-party data. The IRS publishes one
// cumulative CSV per state at:
//   https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf
//   e.g. https://www.irs.gov/pub/irs-soi/eo_tx.csv
//
// Column order in every state file:
//   EIN,NAME,ICO,STREET,CITY,STATE,ZIP,GROUP,SUBSECTION,AFFILIATION,CLASSIFICATION,
//   RULING,DEDUCTIBILITY,FOUNDATION,ACTIVITY,ORGANIZATION,STATUS,TAX_PERIOD,ASSET_CD,
//   INCOME_CD,FILING_REQ_CD,PF_FILING_REQ_CD,ACCT_PD,ASSET_AMT,INCOME_AMT,REVENUE_AMT,
//   NTEE_CD,SORT_NAME
//
// Every record is a factual IRS registration record. It is used here only to
// identify organizations to approach about a partnership — never to score,
// rank, or assess any individual's eligibility for anything.

import { prospect } from "./types.ts";

export const IRS_BMF = {
  key: "irs_bmf",
  name: "IRS Exempt Organizations Business Master File",
  category: "nonprofits",
  secret: "",
  official_url: "https://www.irs.gov/charities-non-profits/exempt-organizations-business-master-file-extract-eo-bmf",
};

export function isConfigured() {
  return true; // Official IRS bulk file — no API key required.
}

// NTEE major groups (first letter of the NTEE code).
export const NTEE_GROUPS = [
  { code: "A", label: "Arts, Culture & Humanities" },
  { code: "B", label: "Education" },
  { code: "C", label: "Environment" },
  { code: "D", label: "Animal-Related" },
  { code: "E", label: "Health" },
  { code: "F", label: "Mental Health & Crisis Intervention" },
  { code: "G", label: "Diseases, Disorders & Medical Disciplines" },
  { code: "H", label: "Medical Research" },
  { code: "I", label: "Crime & Legal-Related" },
  { code: "J", label: "Employment" },
  { code: "K", label: "Food, Agriculture & Nutrition" },
  { code: "L", label: "Housing & Shelter" },
  { code: "M", label: "Public Safety & Disaster Preparedness" },
  { code: "N", label: "Recreation & Sports" },
  { code: "O", label: "Youth Development" },
  { code: "P", label: "Human Services" },
  { code: "Q", label: "International & Foreign Affairs" },
  { code: "R", label: "Civil Rights & Advocacy" },
  { code: "S", label: "Community Improvement" },
  { code: "T", label: "Philanthropy & Grantmaking" },
  { code: "U", label: "Science & Technology" },
  { code: "V", label: "Social Science" },
  { code: "W", label: "Public & Societal Benefit" },
  { code: "X", label: "Religion-Related" },
  { code: "Y", label: "Mutual & Membership Benefit" },
  { code: "Z", label: "Unknown" },
];

const NTEE_LABELS = NTEE_GROUPS.reduce((acc, g) => { acc[g.code] = g.label; return acc; }, {});

// The religion-related NTEE group covers churches, ministries, and religious
// congregations — how "church" is identified in the IRS file.
const CHURCH_NTEE = "X";

const BMF_TIMEOUT_MS = 45000;
const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
// Cap on how many matching rows are collected before sorting by name. Keeps a
// broad statewide search bounded in memory while still returning a sensible
// alphabetical slice rather than whichever EINs happen to come first.
const MAX_SCAN = 2000;

export function bmfUrlForState(state) {
  const st = String(state || "").trim().toLowerCase();
  if (!/^[a-z]{2}$/.test(st)) return "";
  return `https://www.irs.gov/pub/irs-soi/eo_${st}.csv`;
}

// Minimal RFC-4180 CSV line parser — BMF organization names contain commas
// inside quoted fields ("AMERICAN LEGION, POST 1").
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// Search the official IRS file for one state. Returns standardized prospects.
export async function searchExemptOrganizations(inputs) {
  const state = String(inputs.state || "").trim().toUpperCase();
  const url = bmfUrlForState(state);
  if (!url) {
    return { status: "failed", error: "Select a state to search official IRS filings.", results: [] };
  }

  const city = String(inputs.city || "").trim().toUpperCase();
  const keyword = String(inputs.keyword || "").trim().toUpperCase();
  const ntee = String(inputs.ntee || "").trim().toUpperCase().slice(0, 1);
  const orgType = String(inputs.org_type || "").trim().toLowerCase();
  const limit = Math.min(Math.max(Number(inputs.limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), BMF_TIMEOUT_MS);
  let text = "";
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; RingBellz/1.0)" },
      signal: ctrl.signal,
    });
    if (!res.ok) return { status: "failed", error: `irs_bmf_${res.status}`, results: [] };
    text = await res.text();
  } catch (err) {
    const msg = (err && err.name === "AbortError") ? "timeout" : "network_error";
    return { status: "failed", error: msg, results: [] };
  } finally {
    clearTimeout(timer);
  }

  const lines = text.split("\n");
  if (lines.length < 2) return { status: "failed", error: "irs_bmf_empty", results: [] };

  const header = parseCsvLine(lines[0]).map((h) => h.trim().toUpperCase());
  const idx = {};
  header.forEach((h, i) => { idx[h] = i; });
  if (idx.EIN === undefined || idx.NAME === undefined) {
    return { status: "failed", error: "irs_bmf_unexpected_format", results: [] };
  }

  const matches = [];
  for (let i = 1; i < lines.length && matches.length < MAX_SCAN; i++) {
    const raw = lines[i];
    if (!raw || raw.length < 5) continue;
    const f = parseCsvLine(raw);

    // 501(c)(3) organizations only — the IRS subsection code for charities,
    // churches, and most community nonprofits. The file zero-pads the code
    // ("03"), so compare numerically.
    if (Number((f[idx.SUBSECTION] || "").trim()) !== 3) continue;

    const name = (f[idx.NAME] || "").trim();
    if (!name) continue;

    const nteeCode = (f[idx.NTEE_CD] || "").trim().toUpperCase();
    const isChurch = nteeCode.startsWith(CHURCH_NTEE);
    if (ntee && !nteeCode.startsWith(ntee)) continue;
    if (orgType === "church" && !isChurch) continue;
    if (keyword && !name.toUpperCase().includes(keyword)) continue;

    const rowCity = (f[idx.CITY] || "").trim();
    if (city && rowCity.toUpperCase() !== city) continue;

    const ein = (f[idx.EIN] || "").trim();
    const ruling = (f[idx.RULING] || "").trim();

    matches.push(prospect({
      business_name: name,
      city: rowCity,
      state: (f[idx.STATE] || "").trim().toUpperCase() || state,
      zip: (f[idx.ZIP] || "").trim(),
      address: (f[idx.STREET] || "").trim(),
      industry: nteeCode,
      official_record_id: ein,
      jurisdiction: (f[idx.STATE] || "").trim().toUpperCase() || state,
      agency: "Internal Revenue Service",
      source: IRS_BMF.name,
      source_url: IRS_BMF.official_url,
      record_type: "exempt_organization",
      record_label: "PUBLIC RECORD",
      extra: {
        ein,
        ntee_code: nteeCode,
        ntee_category: NTEE_LABELS[nteeCode.slice(0, 1)] || "",
        subsection: "3",
        ruling_year: ruling.slice(0, 4),
        org_type: isChurch ? "church" : "nonprofit",
      },
    }));
  }

  matches.sort((a, b) => (a.business_name || "").localeCompare(b.business_name || ""));

  return { status: "success", results: matches.slice(0, limit), source: IRS_BMF.name };
}