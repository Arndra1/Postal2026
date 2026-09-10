import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchBankruptcy, isConfigured, BANKRUPTCY_SOURCE } from "../../shared/public-data/bankruptcy.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Bankruptcy prospect discovery — CourtListener RECAP Search API.
//
// Returns recent PUBLIC bankruptcy filings as lawful marketing prospects.
// This is a MARKETING/PROSPECTING feature only. It must never be used for
// credit eligibility, loan/funding/insurance/employment/housing/benefits
// eligibility, underwriting, or consumer risk scoring. A bankruptcy filing is
// a factual public-record event; this function never characterizes a person
// as "credit denied", "high risk", "financially distressed", or similar.
//
// ALL bankruptcy search costs 0 credits. Only a later, optional, intentional
// contact enrichment (via the existing enrichLead function) costs 5 credits
// — and only on a verified email or validated phone. Enrichment is never
// triggered here. Debtor physical addresses are NOT reliably available in
// the free RECAP archive, so none are fabricated.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const inputs = {
      state: body.state || "",
      chapter: body.chapter || "",
      startDate: body.startDate || "",
      endDate: body.endDate || "",
    };

    if (!isConfigured()) {
      return Response.json({ status: "failed", error: "Source not configured.", results: [] }, { status: 503 });
    }

    let result;
    try {
      result = await searchBankruptcy(inputs);
    } catch (err) {
      const msg = (err && err.message) ? err.message : "provider_error";
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    if (result.status !== "success") {
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    // Duplicate detection against the caller's OWN saved leads only.
    const results = await flagDuplicates(base44, user.id, result.results || []);

    await logActivity(base44, user, "public_search_bankruptcy", "Bankruptcy prospect search via " + BANKRUPTCY_SOURCE.name, {
      state: inputs.state, chapter: inputs.chapter, count: results.length,
    });

    return Response.json({
      status: "success",
      source: result.source,
      total_available: result.total_available || results.length,
      results,
      credits_charged: 0,
    });
  } catch (error) {
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