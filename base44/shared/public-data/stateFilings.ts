// State business-filing adapters — automated retrieval of REAL newly-registered
// business records from official FREE government sources.
//
// LIVE (verified by real automated retrieval):
//   FL — Florida Division of Corporations (Sunbiz) free daily SFTP filings
//   CT — Connecticut Secretary of the State open-data Socrata API (public domain)
//   NY — New York Dept. of State "Daily Corporation and Other Entity Filing Data"
//
// All calls are server-side. No credentials are exposed. Records are normalized
// into the shared prospect shape. Formation/registration dates come from the
// official state field (never substituted with retrieval/update date).
//
// For lawful business prospecting / public-record research only — not consumer
// eligibility screening.

import { prospect } from "./types.ts";

const DAY_MS = 86400000;

function pad(n) { return String(n).padStart(2, "0"); }

// Socrata floating-timestamp format (no Z) — accepted by data.ct.gov / data.ny.gov.
function socrataDate(d, endOfDay) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()) +
    "T" + (endOfDay ? "23:59:59.999" : "00:00:00.000");
}

function rangeBounds(rangeKey, customStart, customEnd) {
  const now = new Date();
  let start, end = now;
  if (rangeKey === "TODAY") start = new Date(now.getTime() - DAY_MS);
  else if (rangeKey === "LAST 7 DAYS") start = new Date(now.getTime() - 7 * DAY_MS);
  else if (rangeKey === "LAST 30 DAYS") start = new Date(now.getTime() - 30 * DAY_MS);
  else if (rangeKey === "LAST 90 DAYS") start = new Date(now.getTime() - 90 * DAY_MS);
  else if (rangeKey === "CUSTOM RANGE" && customStart) {
    start = new Date(customStart + "T00:00:00.000Z");
    end = customEnd ? new Date(customEnd + "T23:59:59.000Z") : new Date(start.getTime() + DAY_MS);
  } else start = new Date(now.getTime() - 30 * DAY_MS);
  return { start, end };
}

function yyyymmdd(d) {
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
}

const FL_FILING_TYPE = {
  DOMP: "Domestic Profit Corp", DOMNP: "Domestic Non-Profit Corp", FORP: "Foreign Profit Corp",
  FORNP: "Foreign Non-Profit Corp", DOMLP: "Domestic Limited Partnership", FORLP: "Foreign Limited Partnership",
  FLAL: "Florida LLC", FORL: "Foreign LLC", NPREG: "Non-Profit Registration", TRUST: "Declaration of Trust", AGENT: "Designation of Registered Agent",
};

// ---- Florida: free daily corporate filing files via public SFTP (HTTPS) ----
// Fixed-width 1440-char records; field 17 (pos 473, len 8) = File Date (formation).
export async function searchFlorida(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const auth = "Basic " + btoa("Public:PubAccess1845!");
  // Collect the most recent business days (cap at 7 to keep the request light).
  // FL daily files only exist on work days; weekends/holidays are skipped.
  const days = [];
  for (let i = 0; i < 14 && days.length < 7; i++) {
    const d = new Date(end.getTime() - i * DAY_MS);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    days.push(d);
  }
  const results = [];
  await Promise.all(days.map(async (d) => {
    const url = `https://sftp.floridados.gov/Public/doc/cor/${yyyymmdd(d)}c.txt`;
    try {
      const r = await fetch(url, { headers: { Authorization: auth } });
      if (!r.ok) return;
      const text = await r.text();
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (line.length < 481) continue;
        const fdRaw = line.slice(472, 480); // field 17: File Date (formation), MMDDYYYY
        if (!/^\d{8}$/.test(fdRaw)) continue;
        const mm = fdRaw.slice(0, 2), dd = fdRaw.slice(2, 4), yyyy = fdRaw.slice(4, 8);
        const fdate = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
        if (isNaN(fdate.getTime()) || fdate < start || fdate > end) continue;
        const name = line.slice(12, 204).trim();
        if (!name) continue;
        const ftype = line.slice(205, 220).trim();
        const statusChar = line.slice(204, 205);
        results.push(prospect({
          business_name: name,
          state: "FL",
          city: line.slice(304, 332).trim(),
          zip: line.slice(334, 344).trim(),
          address: line.slice(220, 262).trim(),
          official_record_id: line.slice(0, 12).trim(),
          agency: "Florida Division of Corporations (Sunbiz)",
          source: "Sunbiz Daily Corporate Filings",
          source_url: "https://dos.fl.gov/sunbiz/other-services/data-downloads/",
          record_type: "state_filing",
          record_label: "PUBLIC RECORD",
          extra: {
            entity_type: FL_FILING_TYPE[ftype] || ftype || "",
            status: statusChar === "A" ? "Active" : statusChar === "I" ? "Inactive" : "",
            formation_date: fdate.toISOString().slice(0, 10),
            business_id: line.slice(0, 12).trim(),
            registered_agent: line.slice(544, 586).trim(),
            filing_type: ftype,
          },
        }));
      }
    } catch (_e) { /* skip unavailable day file */ }
  }));
  results.sort((a, b) => (b.extra.formation_date || "").localeCompare(a.extra.formation_date || ""));
  return { status: "success", source: "Florida Division of Corporations (Sunbiz)", results: results.slice(0, 100) };
}

// ---- Connecticut: open-data Socrata API (public domain). date_registration = formation. ----
export async function searchConnecticut(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `date_registration >= '${socrataDate(start, false)}' AND date_registration <= '${socrataDate(end, true)}'`;
  const sel = "name,business_type,status,accountnumber,date_registration,billingstreet,billingcity,billingstate,billingpostalcode";
  const url = `https://data.ct.gov/resource/n7gp-d28j.json?$where=${encodeURIComponent(where)}&$order=date_registration DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `ct_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "ct_malformed", results: [] };
  const results = rows.map((row) => prospect({
    business_name: row.name || "",
    state: "CT",
    city: row.billingcity || "",
    zip: row.billingpostalcode || "",
    address: row.billingstreet || "",
    official_record_id: row.accountnumber || "",
    agency: "Connecticut Secretary of the State",
    source: "CT Business Registry (data.ct.gov)",
    source_url: "https://data.ct.gov/Business/Connecticut-Business-Registry-Business-Master/n7gp-d28j",
    record_type: "state_filing",
    record_label: "PUBLIC RECORD",
    extra: {
      entity_type: row.business_type || "",
      status: row.status || "",
      formation_date: (row.date_registration || "").slice(0, 10),
      business_id: row.accountnumber || "",
    },
  }));
  return { status: "success", source: "Connecticut Secretary of the State", results };
}

// ---- New York: "Daily Corporation and Other Entity Filing Data" (last 30 days). ----
export async function searchNewYork(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `filing_date >= '${socrataDate(start, false)}' AND filing_date <= '${socrataDate(end, true)}'`;
  const sel = "filing_type,dos_id,filing_date,approved_date,entity_type,corp_name,eff_date,law,filer_name,filer_addr1,filer_city,filer_state,filer_zip5";
  const url = `https://data.ny.gov/resource/k4vb-judh.json?$where=${encodeURIComponent(where)}&$order=filing_date DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `ny_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "ny_malformed", results: [] };
  const results = rows.map((row) => prospect({
    business_name: row.corp_name || "",
    state: "NY",
    city: row.filer_city || "",
    zip: row.filer_zip5 || "",
    address: row.filer_addr1 || "",
    official_record_id: row.dos_id || "",
    agency: "New York Department of State — Division of Corporations",
    source: "NY Daily Corporation Filing Data (data.ny.gov)",
    source_url: "https://data.ny.gov/Economic-Development/Daily-Corporation-and-Other-Entity-Filing-Data/k4vb-judh",
    record_type: "state_filing",
    record_label: "PUBLIC RECORD",
    extra: {
      entity_type: row.entity_type || "",
      status: "",
      formation_date: (row.filing_date || "").slice(0, 10),
      business_id: row.dos_id || "",
      filing_type: row.filing_type || "",
      effective_date: (row.eff_date || "").slice(0, 10),
    },
  }));
  return { status: "success", source: "New York Department of State", results };
}

// ---- Pennsylvania: open-data Socrata API. creationdate = formation/registration date. ----
export async function searchPennsylvania(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `creationdate >= '${socrataDate(start, false)}' AND creationdate <= '${socrataDate(end, true)}'`;
  const sel = "business_name,filing_number,typeofbusinessregistration,creationdate,address_line1,address_line2,city,state,zip,shortcountyname,party_type,last_name,first_name,middle_name";
  const url = `https://data.pa.gov/resource/xvd7-5r2c.json?$where=${encodeURIComponent(where)}&$order=creationdate DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `pa_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "pa_malformed", results: [] };
  const results = rows.map((row) => prospect({
    business_name: row.business_name || "",
    state: "PA",
    city: row.city || "",
    zip: row.zip || "",
    address: [row.address_line1, row.address_line2].filter(Boolean).join(", "),
    official_record_id: row.filing_number || "",
    agency: "Pennsylvania Department of State",
    source: "PA Registered Businesses (data.pa.gov)",
    source_url: "https://data.pa.gov/Licenses-Certificates/Registered-Businesses-in-PA-Current-by-County-Depa/xvd7-5r2c",
    record_type: "state_filing",
    record_label: "PUBLIC RECORD",
    extra: {
      entity_type: row.typeofbusinessregistration || "",
      status: "",
      formation_date: (row.creationdate || "").slice(0, 10),
      business_id: row.filing_number || "",
      county: row.shortcountyname || "",
      party_type: row.party_type || "",
      officer: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" "),
    },
  }));
  return { status: "success", source: "Pennsylvania Department of State", results };
}

export const STATE_FILING_ADAPTERS = {
  FL: searchFlorida,
  CT: searchConnecticut,
  NY: searchNewYork,
  PA: searchPennsylvania,
};

export function hasStateAdapter(code) {
  return !!STATE_FILING_ADAPTERS[(code || "").toUpperCase()];
}