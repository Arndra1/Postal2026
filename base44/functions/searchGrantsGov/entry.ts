import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchGrants } from "../../shared/public-data/grantsgov.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Grants.gov opportunity search. Costs 0 credits — this is a free public-data
// discovery category, completely separate from the enrichment pipeline.
// Standalone function — does NOT route through searchPublicLeads/registry.ts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const inputs = {
      keyword: body.keyword || "",
      agencies: body.agencies || body.agency || "",
      oppStatuses: body.oppStatuses || "posted|forecasted",
      fundingCategories: body.fundingCategories || "",
      fundingInstruments: body.fundingInstruments || "",
      rows: body.rows || 25,
    };

    if (!inputs.keyword && !inputs.agencies && !inputs.fundingCategories && !inputs.fundingInstruments) {
      return Response.json({ status: "failed", error: "Enter a keyword, agency, or funding category to search.", results: [] }, { status: 400 });
    }

    const result = await searchGrants(inputs);

    if (result.status !== "success") {
      return Response.json({ status: "failed", error: result.error || "Grants.gov is temporarily unavailable.", results: [] }, { status: 502 });
    }

    // Duplicate detection against the caller's saved grant opportunities.
    const saved = await base44.entities.GrantOpportunity.filter({ user_id: user.id, saved: true });
    const savedIds = new Set(saved.map((s) => s.opportunity_id).filter(Boolean));
    const results = (result.results || []).map((r) => ({
      ...r,
      possible_duplicate: r.opportunity_id && savedIds.has(r.opportunity_id),
    }));

    await logActivity(base44, user, "public_search_grants_gov", "Grants.gov opportunity search", {
      keyword: inputs.keyword, count: results.length,
    });

    return Response.json({
      status: "success",
      category: "federal_grants",
      source: result.source,
      results,
      credits_charged: 0,
    });
  } catch (error) {
    console.error("searchGrantsGov failed", error);
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}