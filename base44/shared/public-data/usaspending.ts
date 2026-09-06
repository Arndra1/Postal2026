// USASpending.gov API client — federal grants & contract awards search.
// No API key required. Public API: https://api.usaspending.gov/api/v2/search/spending_by_award/
//
// Award type codes:
//   A-D = contracts, 02-06 = grants, 07 = direct payments, 08 = loans, 09 = other
//   We default to grants (02) + contracts (A-D) for prospecting.

const USA_BASE = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

export const FEDERAL_SOURCE_META = {
  key: "usaspending",
  name: "USASpending.gov",
  category: "government_open_data",
  agency: "U.S. Treasury / Bureau of the Fiscal Service",
};

export function isConfigured() {
  return true; // public API, no key needed
}

// State code → USASpending place_of_performance location ID mapping is complex;
// we use recipient_search_text + keywords for simplicity instead of location IDs.

export async function searchFederalAwards(inputs) {
  const keywords = (inputs.keyword || inputs.business_name || "").trim();
  const agencyName = (inputs.agency || "").trim();

  const filters = {
    award_type_codes: ["A", "B", "C", "D"],
    time_period: [
      {
        start_date: inputs.startDate || "2024-01-01",
        end_date: inputs.endDate || new Date().toISOString().slice(0, 10),
      },
    ],
  };

  if (keywords) {
    filters.keywords = [keywords];
  }
  if (agencyName) {
    filters.agencies = [
      { type: "awarding", tier: "toptier", name: agencyName },
    ];
  }

  const body = {
    filters,
    fields: [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Start Date",
      "End Date",
      "Awarding Agency",
      "Awarding Sub Agency",
      "Award Type",
    ],
    sort: "Award Amount",
    order: "desc",
    page: 1,
    limit: 50,
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20000);
  let resp;
  try {
    resp = await fetch(USA_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (fetchErr) {
    clearTimeout(timeout);
    const msg = (fetchErr && fetchErr.name === "AbortError") ? "timeout" : "network_error";
    return { status: "failed", error: "USASpending.gov " + msg, results: [] };
  }
  clearTimeout(timeout);

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    return { status: "failed", error: "USASpending.gov returned " + resp.status + ": " + errText.slice(0, 200), results: [] };
  }

  const data = await resp.json();
  const rawResults = (data.results || []).filter((r) => {
    if (!stateCode) return true;
    // Post-filter by state if provided — USASpending doesn't return a clean state
    // field in the award list, so we include all and let the user refine.
    return true;
  });

  const results = rawResults.map((r) => ({
    business_name: r["Recipient Name"] || "",
    person_name: "",
    industry: r["Awarding Sub Agency"] || r["Awarding Agency"] || "",
    city: "",
    state: stateCode,
    website: "https://www.usaspending.gov",
    official_record_id: r["Award ID"] || "",
    jurisdiction: "Federal",
    agency: r["Awarding Agency"] || "U.S. Federal Government",
    source: "USASpending.gov",
    source_url: "https://www.usaspending.gov",
    record_type: "federal_grant",
    record_label: "PUBLIC RECORD",
    retrieved_at: new Date().toISOString(),
    extra: {
      award_amount: r["Award Amount"],
      start_date: r["Start Date"],
      end_date: r["End Date"],
      award_type: r["Award Type"],
      sub_agency: r["Awarding Sub Agency"],
      description: r["Description"] || "",
    },
  }));

  return { status: "success", source: "USASpending.gov", results };
}

// Lightweight version for saved-search alerts: returns only lead-identifying keys.
export function federalLeadKey(r) {
  return (r.official_record_id || r.business_name + "|" + (r.state || "")).toLowerCase();
}