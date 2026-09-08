import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchTaxDelinquent, TAX_DELINQUENT_META } from "../../shared/public-data/taxDelinquent.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Tax-Delinquent Taxpayer Lists — NY, CA, SC public-record discovery.
//
// Returns published Top Delinquent Taxpayers as lawful marketing prospects.
// This is a MARKETING/PROSPECTING feature only. It must never be used for
// credit eligibility, loan/funding/insurance/employment/housing/benefits
// eligibility, underwriting, or consumer risk scoring. A published tax
// delinquency is a factual public-record event; this function never
// characterizes a person as "credit denied", "high risk", "financially
// distressed", or similar.
//
// ALL tax-delinquent search costs 0 credits. Only a later, optional, intentional
// contact enrichment (via the existing enrichLead function) costs 5 credits
// — and only on a verified email or validated phone. Enrichment is never
// triggered here.
//
// Per-state try/catch isolation: a failure in SC (or any state) NEVER blocks
// results from the other states.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const inputs = {
      state: body.state || "",
      listType: body.listType || "individuals",
      keyword: body.keyword || "",
    };

    // Validate state if provided
    const validStates = ["", "NY", "CA", "SC"];
    if (!validStates.includes((inputs.state || "").toUpperCase())) {
      return Response.json({ status: "failed", error: "Invalid state. Use NY, CA, or SC.", results: [] }, { status: 400 });
    }

    const result = await searchTaxDelinquent(inputs);

    // Duplicate detection against the caller's OWN saved leads only.
    const results = await flagDuplicates(base44, user.id, result.results || []);

    await logActivity(base44, user, "public_search_tax_delinquent", "Tax-delinquent taxpayer search (" + (inputs.state || "all states") + ")", {
      state: inputs.state, listType: inputs.listType, count: results.length, errors: result.errors,
    });

    return Response.json({
      status: "success",
      source: result.source,
      results,
      errors: result.errors,
      credits_charged: 0,
    });
  } catch (error) {
    console.error("searchTaxDelinquent failed", error);
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

// ---- Duplicate detection against the caller's OWN saved leads only ----
async function flagDuplicates(base44, userId, prospects) {
  try {
    const saved = await base44.entities.Lead.filter({ user_id: userId, saved: true });
    const byOfficialId = {};
    for (const s of saved || []) {
      if (s.official_record_id) byOfficialId[s.official_record_id.toLowerCase()] = s;
    }
    return prospects.map((p) => {
      const oid = (p.official_record_id || "").toLowerCase();
      const dup = oid ? !!byOfficialId[oid] : false;
      return { ...p, possible_duplicate: dup, duplicate_lead_id: dup ? byOfficialId[oid].id : "" };
    });
  } catch (_e) {
    return prospects.map((p) => ({ ...p, possible_duplicate: false, duplicate_lead_id: "" }));
  }
}