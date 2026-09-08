// Tax-Delinquent Taxpayer Lists — NY, CA, SC public-record discovery.
//
// Surfaces published Top Delinquent Taxpayers as lawful marketing prospects.
// This is a MARKETING/PROSPECTING feature only — never used for credit
// eligibility, loan/funding/insurance/employment/housing/benefits eligibility,
// underwriting, or consumer risk scoring. A published tax delinquency is a
// factual public-record event; this module never characterizes a person as
// "high risk", "financially distressed", or similar.
//
// Each state has its own parser due to different page structures:
//   NY — quarterly Top 100 individuals + Top 100 businesses (HTML tables, tax.ny.gov)
//   CA — FTB Top 500 personal + Top 500 corporate (HTML tables, ftb.ca.gov)
//   SC — SCDOR Top Delinquent individuals + businesses (Oracle APEX, mydorway.dor.sc.gov)
//
// Per-state try/catch isolation: a failure in one state NEVER blocks the others.
// SC is especially fragile (Oracle APEX session tokens, intermittent availability)
// and is wrapped in its own try/catch that returns a clear error + empty results.
//
// Server-side only. No API key required for any state. 0 credits.

import { prospect } from "./types.ts";

export const TAX_DELINQUENT_META = {
  key: "tax_delinquent",
  name: "State Tax-Delinquent Taxpayer Lists",
  category: "public_records",
  agency: "State Revenue / Tax Departments",
};

export function isConfigured() {
  return true; // all three sources are public, no keys needed
}

const BUSINESS_INDICATORS = /\b(LLC|L\.L\.C\.|INC|INC\.|CORP|CORP\.|CORPORATION|CO\.|COMPANY|LTD|LTD\.|LP|L\.P\.|LLP|L\.L\.P\.|PLLC|P\.L\.L\.C\.|PC|APC|LLP\b)\b/i;
function looksLikeBusiness(name) {
  return BUSINESS_INDICATORS.test(name || "");
}

function parseAmount(s) {
  if (!s) return 0;
  const cleaned = String(s).replace(/[$,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function extractCityStateZip(addr) {
  // "City, State ZIP" or "City, ST 12345"
  const m = (addr || "").match(/^(.+?),\s*([A-Z]{2})\s*(\d{5})?/);
  if (m) return { city: m[1].trim(), state: m[2], zip: m[3] || "" };
  return { city: addr || "", state: "", zip: "" };
}

// ===================== NEW YORK =====================
// Quarterly Top 100 individuals + Top 100 businesses.
// HTML table: Rank | Taxpayer name | Tax type | Warrant ID | Filed amount | Total filed balance | Filed date | County
// Each ranked debtor can have multiple warrant rows. Rank and name appear only
// on the first row of each group. We parse by tracking when a Rank cell appears.
const NY_URLS = {
  individuals: "https://www.tax.ny.gov/enforcement/delinquent-taxpayers-individuals.htm",
  businesses: "https://www.tax.ny.gov/enforcement/delinquent-taxpayers-businesses.htm",
};

function parseNY(html, listType) {
  const results = [];
  // Match all table rows
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;
  let currentRank = 0;
  let currentName = "";
  let currentTaxType = "";
  let currentCounty = "";
  let currentWarrants = [];

  while ((match = rowRe.exec(html)) !== null) {
    const rowHtml = match[1];
    // Extract cell contents
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      let text = cm[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#160;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    if (cells.length < 4) continue;

    // Header row or empty
    if (cells[0] === "Rank" || cells[0] === "") continue;

    // Check if this row starts a new ranked debtor
    const rankNum = parseInt(cells[0], 10);
    if (!isNaN(rankNum) && rankNum > 0 && rankNum <= 100) {
      // Save previous debtor if any
      if (currentName && currentWarrants.length > 0) {
        results.push(buildNYProspect(currentName, currentTaxType, currentCounty, currentWarrants, listType));
      }
      // Start new debtor
      currentRank = rankNum;
      currentName = cells[1] || "";
      currentTaxType = cells[2] || "";
      const warrantId = cells[3] || "";
      const filedAmount = cells[4] || "";
      const totalBalance = cells[5] || "";
      const filedDate = cells[6] || "";
      currentCounty = cells[7] || currentCounty;
      currentWarrants = [{ warrantId, filedAmount, totalBalance, filedDate, county: currentCounty }];
    } else {
      // Continuation row — same debtor, additional warrant
      // These rows have empty rank, may have empty name (reuse current), then warrant details
      const warrantId = cells[0] || "";
      const filedAmount = cells[1] || "";
      const totalBalance = cells[2] || "";
      const filedDate = cells[3] || "";
      const county = cells[4] || currentCounty;
      if (warrantId || filedAmount) {
        currentWarrants.push({ warrantId, filedAmount, totalBalance, filedDate, county });
        if (county) currentCounty = county;
      }
    }
  }
  // Save last debtor
  if (currentName && currentWarrants.length > 0) {
    results.push(buildNYProspect(currentName, currentTaxType, currentCounty, currentWarrants, listType));
  }
  return results;
}

function buildNYProspect(name, taxType, county, warrants, listType) {
  const isBusiness = looksLikeBusiness(name);
  const totalBalance = warrants.reduce((sum, w) => sum + parseAmount(w.totalBalance || w.filedAmount), 0);
  const firstWarrantId = warrants[0]?.warrantId || "";
  const latestDate = warrants.map(w => w.filedDate).filter(Boolean).sort().reverse()[0] || "";
  const sourceUrl = listType === "businesses" ? NY_URLS.businesses : NY_URLS.individuals;

  return prospect({
    person_name: !isBusiness ? name : "",
    business_name: isBusiness ? name : "",
    state: "NY",
    city: county,
    official_record_id: firstWarrantId,
    jurisdiction: "New York",
    agency: "New York State Department of Taxation and Finance",
    source: "NYS Top 100 Delinquent Taxpayers (" + (listType === "businesses" ? "Businesses" : "Individuals") + ")",
    source_url: sourceUrl,
    record_type: "tax_delinquent",
    record_label: "PUBLIC RECORD",
    extra: {
      lead_type: isBusiness ? "business" : "person",
      event_type: "tax_delinquent",
      tax_type: taxType,
      amount_owed: totalBalance,
      county,
      warrant_count: warrants.length,
      latest_filed_date: latestDate,
      warrants: warrants.map(w => ({
        warrant_id: w.warrantId,
        filed_amount: parseAmount(w.filedAmount),
        total_balance: parseAmount(w.totalBalance),
        filed_date: w.filedDate,
        county: w.county,
      })),
    },
  });
}

// ===================== CALIFORNIA =====================
// FTB Top 500 personal income tax + Top 500 corporate income tax delinquencies.
// HTML table with columns: Child? | Reason | Name | Address | Total | Payments | Lien | License | Status | Number | (Officers for corporate)
// Child rows (Child? = "Y") are sub-records (officers) and are SKIPPED.
// CA FTB publishes data as TSV text files loaded client-side by JavaScript.
// We fetch the TSV directly — much more reliable than parsing the empty HTML table.
const CA_URLS = {
  personal: "https://www.ftb.ca.gov/about-ftb/newsroom/top-500-past-due-balances/delinquents-PIT.txt",
  corporate: "https://www.ftb.ca.gov/about-ftb/newsroom/top-500-past-due-balances/delinquents-Corp.txt",
  page_personal: "https://www.ftb.ca.gov/about-ftb/newsroom/top-500-past-due-balances/personal-income-tax-list.html",
  page_corporate: "https://www.ftb.ca.gov/about-ftb/newsroom/top-500-past-due-balances/corporate-income-tax-list.html",
};

// Parse a single TSV line, handling quoted fields with embedded tabs/commas.
function parseTsvLine(line) {
  const cells = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') { inQ = false; }
      else cur += ch;
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === '\t') {
      cells.push(cur); cur = "";
    } else {
      cur += ch;
    }
  }
  cells.push(cur);
  return cells;
}

function parseCA(tsvText, listType) {
  const results = [];
  const lines = tsvText.split(/\r?\n/);
  const isCorporate = listType === "corporate";

  for (const line of lines) {
    if (!line.trim()) continue;
    const cells = parseTsvLine(line);

    // Skip header row
    if (cells[0] === "Child?") continue;
    // Skip total row (Name column = "Total")
    if (cells[2] === "Total") continue;
    // Skip child (officer) rows — "Y" in Child? column
    if (cells[0] && cells[0].toUpperCase() === "Y") continue;
    // Skip rows without a name
    const name = (cells[2] || "").trim();
    if (!name) continue;

    const address = (cells[3] || "").trim();
    // Personal: Child? | Reason | Name | Address | Subtotal | Total | Payments | Lien | License | Status | Number
    // Corporate: Child? | Reason | Name | Address | Total | Payments | Lien Filed | License | License Status | License Number | Officers
    const totalCol = isCorporate ? (cells[4] || "") : (cells[5] || cells[4] || "");
    const lienDate = isCorporate ? (cells[6] || "") : (cells[7] || "");
    const licenseBoard = isCorporate ? (cells[7] || "") : (cells[8] || "");
    const licenseStatus = isCorporate ? (cells[8] || "") : (cells[9] || "");
    const licenseNumber = isCorporate ? (cells[9] || "") : (cells[10] || "");
    const officers = isCorporate ? (cells[10] || "") : "";
    const reasonCol = cells[1] || "";

    const isBusiness = isCorporate || looksLikeBusiness(name);
    const { city, state: addrState, zip } = extractCityStateZip(address);
    const amount = parseAmount(totalCol);
    const sourceUrl = isCorporate ? CA_URLS.page_corporate : CA_URLS.page_personal;

    results.push(prospect({
      person_name: !isBusiness ? name : "",
      business_name: isBusiness ? name : "",
      state: "CA",
      city,
      zip,
      official_record_id: name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 60),
      jurisdiction: "California",
      agency: "California Franchise Tax Board",
      source: "CA FTB Top 500 Delinquent Taxpayers (" + (isCorporate ? "Corporate" : "Personal") + ")",
      source_url: sourceUrl,
      record_type: "tax_delinquent",
      record_label: "PUBLIC RECORD",
      extra: {
        lead_type: isBusiness ? "business" : "person",
        event_type: "tax_delinquent",
        tax_type: isCorporate ? "Corporate Income Tax" : "Personal Income Tax",
        amount_owed: amount,
        address,
        lien_date: lienDate,
        license_board: licenseBoard,
        license_status: licenseStatus,
        license_number: licenseNumber,
        officers,
        reason: reasonCol,
      },
    }));
  }
  return results;
}

// ===================== SOUTH CAROLINA =====================
// SCDOR Top Delinquent Taxpayers via mydorway portal (Oracle APEX).
// Page 1 data (top debtors by amount, sorted descending) is available in the
// initial HTML response. Pagination requires session tokens — we fetch page 1
// only, which contains the highest-value prospects.
//
// FRAGILE: Oracle APEX session tokens, intermittent "Request Unavailable" errors.
// Wrapped in its own try/catch — NEVER blocks NY or CA results.
const SC_URLS = {
  individuals: "https://mydorway.dor.sc.gov/?link=delinquentind",
  businesses: "https://mydorway.dor.sc.gov/?link=delinquentbus",
};

function parseSC(html, listType) {
  const results = [];
  const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let match;

  while ((match = rowRe.exec(html)) !== null) {
    const rowHtml = match[1];
    const cells = [];
    const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
    let cm;
    while ((cm = cellRe.exec(rowHtml)) !== null) {
      let text = cm[1]
        .replace(/<[^>]+>/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&nbsp;/g, " ")
        .replace(/&#160;/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      cells.push(text);
    }

    if (cells.length < 5) continue;

    // Skip header rows
    if (cells[0] === "Name" || cells[0] === "" || cells[0] === "---") continue;

    // SC table: Name | Street | City | State | Zip | County | Amount
    const name = cells[0] || "";
    const street = cells[1] || "";
    const city = cells[2] || "";
    const stateCode = cells[3] || "SC";
    const zip = cells[4] || "";
    const county = cells[5] || "";
    const amountStr = cells[6] || "";

    if (!name || name === "Name") continue;

    const isBusiness = looksLikeBusiness(name);
    const amount = parseAmount(amountStr);
    const sourceUrl = listType === "businesses" ? SC_URLS.businesses : SC_URLS.individuals;

    results.push(prospect({
      person_name: !isBusiness ? name : "",
      business_name: isBusiness ? name : "",
      state: stateCode || "SC",
      city,
      zip,
      address: street,
      official_record_id: name.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 60) + "_" + amount,
      jurisdiction: "South Carolina",
      agency: "South Carolina Department of Revenue",
      source: "SCDOR Top Delinquent Taxpayers (" + (listType === "businesses" ? "Businesses" : "Individuals") + ")",
      source_url: sourceUrl,
      record_type: "tax_delinquent",
      record_label: "PUBLIC RECORD",
      extra: {
        lead_type: isBusiness ? "business" : "person",
        event_type: "tax_delinquent",
        tax_type: "State Tax",
        amount_owed: amount,
        county,
        street,
      },
    }));
  }
  return results;
}

// ===================== ORCHESTRATOR =====================
// Per-state try/catch isolation: a failure in one state NEVER blocks others.
export async function searchTaxDelinquent(inputs) {
  const state = (inputs.state || "").toUpperCase();
  const listType = inputs.listType || "individuals"; // individuals | businesses | personal | corporate
  const keyword = (inputs.keyword || "").trim().toLowerCase();

  const allResults = [];
  const errors = [];

  // Helper to filter by keyword
  const filterKeyword = (results) => {
    if (!keyword) return results;
    return results.filter(r => {
      const name = (r.business_name || r.person_name || "").toLowerCase();
      return name.includes(keyword);
    });
  };

  // ---- NEW YORK ----
  if (!state || state === "NY") {
    try {
      const nyListType = listType === "businesses" ? "businesses" : "individuals";
      const url = nyListType === "businesses" ? NY_URLS.businesses : NY_URLS.individuals;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) {
        errors.push({ state: "NY", error: "Source returned HTTP " + r.status });
      } else {
        const text = await r.text();
        if (!text || text.length < 500) {
          errors.push({ state: "NY", error: "Empty or malformed response" });
        } else {
          let nyResults = parseNY(text, nyListType);
          nyResults = filterKeyword(nyResults);
          allResults.push(...nyResults);
        }
      }
    } catch (err) {
      errors.push({ state: "NY", error: err.message || "Scrape failed" });
    }
  }

  // ---- CALIFORNIA ----
  if (!state || state === "CA") {
    try {
      const caListType = listType === "corporate" ? "corporate" : "personal";
      const url = caListType === "corporate" ? CA_URLS.corporate : CA_URLS.personal;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) {
        errors.push({ state: "CA", error: "Source returned HTTP " + r.status });
      } else {
        const text = await r.text();
        if (!text || text.length < 500) {
          errors.push({ state: "CA", error: "Empty or malformed response" });
        } else {
          let caResults = parseCA(text, caListType);
          caResults = filterKeyword(caResults);
          allResults.push(...caResults);
        }
      }
    } catch (err) {
      errors.push({ state: "CA", error: err.message || "Scrape failed" });
    }
  }

  // ---- SOUTH CAROLINA ---- (fragile — fully isolated)
  if (!state || state === "SC") {
    try {
      const scListType = listType === "businesses" ? "businesses" : "individuals";
      const url = scListType === "businesses" ? SC_URLS.businesses : SC_URLS.individuals;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) {
        errors.push({ state: "SC", error: "SCDOR portal returned HTTP " + r.status + ". The mydorway portal may be temporarily unavailable." });
      } else {
        const text = await r.text();
        if (!text || text.length < 500) {
          errors.push({ state: "SC", error: "SCDOR portal returned an empty response. The mydorway portal may be temporarily unavailable." });
        } else {
          let scResults = parseSC(text, scListType);
          if (scResults.length === 0) {
            const hasUnavailable = /request unavailable|session has expired|error occurred/i.test(text);
            errors.push({
              state: "SC",
              error: hasUnavailable
                ? "SCDOR portal returned 'Request Unavailable'. The mydorway portal is temporarily unavailable — try again later. NY and CA results are unaffected."
                : "SCDOR portal page structure changed — could not parse delinquent taxpayer table. NY and CA results are unaffected.",
            });
          } else {
            scResults = filterKeyword(scResults);
            allResults.push(...scResults);
          }
        }
      }
    } catch (err) {
      errors.push({
        state: "SC",
        error: "SCDOR portal scrape failed: " + (err.message || "unknown error") + ". NY and CA results are unaffected.",
      });
    }
  }

  return {
    status: "success",
    source: "State Tax-Delinquent Taxpayer Lists",
    results: allResults,
    errors,
  };
}