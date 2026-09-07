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
export async function searchFlorida(inputs, ctx) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  // FL DOS public-access credentials are stored in the PublicDataSource entity (admin-only)
  // to keep them out of source code without requiring a secret env var.
  let auth = "";
  if (ctx && ctx.db) {
    try {
      const rows = await ctx.db.entities.PublicDataSource.filter({ source_key: "fl_dos_sftp" });
      if (rows && rows[0] && rows[0].api_endpoint) auth = rows[0].api_endpoint;
    } catch (_e) { /* fall through */ }
  }
  if (!auth) return { status: "failed", error: "fl_credentials_not_configured", results: [] };
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

// ---- Colorado: open-data Socrata API. entityformdate = entity formation date. ----
export async function searchColorado(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `entityformdate >= '${socrataDate(start, false)}' AND entityformdate <= '${socrataDate(end, true)}'`;
  const sel = "entityid,entityname,entitytype,entitystatus,entityformdate,principaladdress1,principaladdress2,principalcity,principalstate,principalzipcode,mailingaddress1,mailingcity,mailingstate,mailingzipcode,jurisdictonofformation,agentfirstname,agentmiddlename,agentlastname,agentorganizationname";
  const url = `https://data.colorado.gov/resource/4ykn-tg5h.json?$where=${encodeURIComponent(where)}&$order=entityformdate DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `co_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "co_malformed", results: [] };
  const results = rows.map((row) => prospect({
    business_name: (row.entityname || "").replace(/,\s*(Delinquent|Good Standing|Withdrawn|Exists|Merged|Dissolved|Expired|Revoked)\b.*$/i, "").trim(),
    state: "CO",
    city: row.principalcity || "",
    zip: row.principalzipcode || "",
    address: [row.principaladdress1, row.principaladdress2].filter(Boolean).join(", "),
    official_record_id: row.entityid ? String(row.entityid) : "",
    agency: "Colorado Department of State (Secretary of State)",
    source: "CO Business Entities (data.colorado.gov)",
    source_url: "https://data.colorado.gov/Business/Business-Entities-in-Colorado/4ykn-tg5h",
    record_type: "state_filing",
    record_label: "PUBLIC RECORD",
    extra: {
      entity_type: row.entitytype || "",
      status: row.entitystatus || "",
      formation_date: (row.entityformdate || "").slice(0, 10),
      business_id: row.entityid ? String(row.entityid) : "",
      jurisdiction: row.jurisdictonofformation || "",
      registered_agent: [row.agentfirstname, row.agentmiddlename, row.agentlastname].filter(Boolean).join(" ") || row.agentorganizationname || "",
      mailing_city: row.mailingcity || "",
      mailing_state: row.mailingstate || "",
      mailing_zip: row.mailingzipcode || "",
    },
  }));
  return { status: "success", source: "Colorado Department of State", results };
}

// ---- Oregon: open-data Socrata API. registry_date = registration/formation date. ----
export async function searchOregon(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `registry_date >= '${socrataDate(start, false)}' AND registry_date <= '${socrataDate(end, true)}'`;
  const sel = "registry_number,business_name,entity_type,registry_date,address,address_continued,city,state,zip,jurisdiction,associated_name_type,first_name,middle_name,last_name";
  const url = `https://data.oregon.gov/resource/tckn-sxa6.json?$where=${encodeURIComponent(where)}&$order=registry_date DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `or_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "or_malformed", results: [] };
  // Oregon dataset has one row per (business, associated_name_type) — dedupe by registry_number.
  const seen = new Set();
  const results = [];
  for (const row of rows) {
    const id = row.registry_number || "";
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    results.push(prospect({
      business_name: row.business_name || "",
      state: "OR",
      city: row.city || "",
      zip: row.zip || "",
      address: [row.address, row.address_continued].filter(Boolean).join(", "),
      official_record_id: id,
      agency: "Oregon Secretary of State — Corporation Division",
      source: "OR Active Businesses (data.oregon.gov)",
      source_url: "https://data.oregon.gov/Business/Active-Businesses-ALL/tckn-sxa6",
      record_type: "state_filing",
      record_label: "PUBLIC RECORD",
      extra: {
        entity_type: row.entity_type || "",
        status: "Active",
        formation_date: (row.registry_date || "").slice(0, 10),
        business_id: id,
        jurisdiction: row.jurisdiction || "",
        associated_name_type: row.associated_name_type || "",
        associated_person: [row.first_name, row.middle_name, row.last_name].filter(Boolean).join(" "),
      },
    }));
  }
  return { status: "success", source: "Oregon Secretary of State — Corporation Division", results };
}

// ---- Texas: Comptroller "Active Franchise Taxpayers" open-data Socrata API. ----
// sos_charter_date = Secretary of State charter/formation date (calendar_date).
// This is a SEPARATE free official open-data business-entity dataset — NOT paid SOSDirect.
const TX_ORG_TYPES = { CL: "LLC", CO: "Corporation", CR: "Corporation", NP: "Nonprofit", PF: "Professional Association", LT: "Limited Partnership", LP: "Limited Partnership", GP: "General Partnership", PT: "Professional Corporation" };
export async function searchTexas(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const where = `sos_charter_date >= '${socrataDate(start, false)}' AND sos_charter_date <= '${socrataDate(end, true)}'`;
  const sel = "taxpayer_name,taxpayer_organizational_type,sos_charter_date,secretary_of_state_sos_or_coa_file_number,right_to_transact_business_code,taxpayer_address,taxpayer_city,taxpayer_state,taxpayer_zip,taxpayer_county_code";
  const url = `https://data.texas.gov/resource/9cir-efmm.json?$where=${encodeURIComponent(where)}&$order=sos_charter_date DESC&$limit=100&$select=${encodeURIComponent(sel)}`;
  const r = await fetch(url);
  if (!r.ok) return { status: "failed", error: `tx_${r.status}`, results: [] };
  const rows = await r.json();
  if (!Array.isArray(rows)) return { status: "failed", error: "tx_malformed", results: [] };
  const results = rows.map((row) => prospect({
    business_name: (row.taxpayer_name || "").trim(),
    state: "TX",
    city: row.taxpayer_city || "",
    zip: row.taxpayer_zip || "",
    address: row.taxpayer_address || "",
    official_record_id: row.secretary_of_state_sos_or_coa_file_number || "",
    agency: "Texas Comptroller of Public Accounts (Active Franchise Taxpayers)",
    source: "TX Active Franchise Taxpayers (data.texas.gov)",
    source_url: "https://data.texas.gov/dataset/Active-Franchise-Taxpayers/9cir-efmm",
    record_type: "state_filing",
    record_label: "PUBLIC RECORD",
    extra: {
      entity_type: TX_ORG_TYPES[row.taxpayer_organizational_type] || row.taxpayer_organizational_type || "",
      status: "Active",
      formation_date: (row.sos_charter_date || "").slice(0, 10),
      business_id: row.secretary_of_state_sos_or_coa_file_number || "",
      right_to_transact: row.right_to_transact_business_code || "",
      county_code: row.taxpayer_county_code || "",
    },
  }));
  return { status: "success", source: "Texas Comptroller of Public Accounts", results };
}

// ---- Iowa: Secretary of State "Active Business Entities" (idh-be.iowa.gov DKAN). ----
// Free, legal, official. effective_date = business effective/formation date (YYYY-MM-DD).
// The portal returns the FULL active-businesses dataset as a ZIP-stored CSV (~100MB,
// compression method 0 = stored; no server-side date filter). To keep searches fast and
// memory bounded, the file is streamed once per 12h and only records with effective_date
// in the last 150 days are cached in-process; each search filters that lightweight cache.
let iowaCache = { rows: null, fetchedAt: 0 };
let iowaRefreshing = null;
const IOWA_CACHE_TTL = 12 * 60 * 60 * 1000;
const IOWA_URL = "https://idh-be.iowa.gov/api/v1/datasets/554/rows.csv?limit=1000000";

function parseCsvLine(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

function dayStr(d) {
  return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate());
}

async function refreshIowaCache() {
  const cutoff = dayStr(new Date(Date.now() - 150 * DAY_MS));
  const r = await fetch(IOWA_URL);
  if (!r.ok) throw new Error("ia_" + r.status);
  const reader = r.body.getReader();
  const dec = new TextDecoder();
  let raw = [], rawLen = 0, headerDone = false, dataOffset = 0;
  let buf = "", header = null, colMap = null;
  const rows = [];
  const onLine = (line) => {
    line = line.replace(/\r$/, "");
    if (!line) return;
    if (!header) { header = parseCsvLine(line); colMap = {}; header.forEach((c, i) => { colMap[c] = i; }); return; }
    const p = parseCsvLine(line);
    const g = (k) => { const i = colMap[k]; return i != null ? (p[i] || "") : ""; };
    const ed = (g("effective_date") || "").slice(0, 10);
    if (ed.length === 10 && ed >= cutoff) {
      rows.push({
        corp_number: g("corp_number"), legal_name: g("legal_name"),
        corporation_type: g("corporation_type"), effective_date: ed,
        registered_agent: g("registered_agent"),
        ra_address: [g("ra_address_1"), g("ra_address_2")].filter(Boolean).join(", "),
        ra_city: g("ra_city"), ra_state: g("ra_state"), ra_zip: g("ra_zip"),
        ho_address: [g("ho_address_1"), g("ho_address_2")].filter(Boolean).join(", "),
        ho_city: g("ho_city"), ho_state: g("ho_state"), ho_zip: g("ho_zip"),
      });
    }
  };
  const onText = (text) => {
    buf += text;
    const parts = buf.split("\n");
    buf = parts.pop();
    for (const ln of parts) onLine(ln);
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!headerDone) {
      raw.push(value); rawLen += value.length;
      if (rawLen >= 30 && dataOffset === 0) {
        const m = new Uint8Array(rawLen); let o = 0;
        for (const c of raw) { m.set(c, o); o += c.length; }
        const dv = new DataView(m.buffer);
        if (dv.getUint32(0, true) !== 0x04034b50) throw new Error("ia_zip_sig");
        dataOffset = 30 + dv.getUint16(26, true) + dv.getUint16(28, true);
      }
      if (dataOffset > 0 && rawLen >= dataOffset) {
        const m = new Uint8Array(rawLen); let o = 0;
        for (const c of raw) { m.set(c, o); o += c.length; }
        onText(dec.decode(m.subarray(dataOffset), { stream: true }));
        headerDone = true; raw = null;
      }
    } else {
      onText(dec.decode(value, { stream: true }));
    }
  }
  const tail = dec.decode();
  if (tail) onText(tail);
  if (buf) onLine(buf);
  rows.sort((a, b) => b.effective_date.localeCompare(a.effective_date));
  iowaCache = { rows, fetchedAt: Date.now() };
}

export async function searchIowa(inputs) {
  const { start, end } = rangeBounds(inputs.dateRange, inputs.startDate, inputs.endDate);
  const sStr = dayStr(start), eStr = dayStr(end);
  if (!iowaCache.rows || Date.now() - iowaCache.fetchedAt > IOWA_CACHE_TTL) {
    if (!iowaRefreshing) iowaRefreshing = refreshIowaCache().finally(() => { iowaRefreshing = null; });
    try { await iowaRefreshing; }
    catch (e) { return { status: "failed", error: e.message, results: [] }; }
  }
  const matched = [];
  for (const row of iowaCache.rows) {
    if (row.effective_date >= sStr && row.effective_date <= eStr) {
      matched.push(prospect({
        business_name: row.legal_name || "",
        state: "IA",
        city: row.ra_city || row.ho_city || "",
        zip: row.ra_zip || row.ho_zip || "",
        address: row.ra_address || row.ho_address || "",
        official_record_id: row.corp_number || "",
        agency: "Iowa Secretary of State — Business Services",
        source: "IA Active Business Entities (idh-be.iowa.gov)",
        source_url: "https://idh-be.iowa.gov/dataset/active-iowa-business-entities",
        record_type: "state_filing",
        record_label: "PUBLIC RECORD",
        extra: {
          entity_type: row.corporation_type || "",
          status: "Active",
          formation_date: row.effective_date,
          business_id: row.corp_number || "",
          registered_agent: row.registered_agent || "",
        },
      }));
      if (matched.length >= 100) break;
    }
  }
  return { status: "success", source: "Iowa Secretary of State — Business Services", results: matched };
}

export const STATE_FILING_ADAPTERS = {
  FL: searchFlorida,
  CT: searchConnecticut,
  NY: searchNewYork,
  PA: searchPennsylvania,
  CO: searchColorado,
  OR: searchOregon,
  TX: searchTexas,
  IA: searchIowa,
};

export function hasStateAdapter(code) {
  return !!STATE_FILING_ADAPTERS[(code || "").toUpperCase()];
}