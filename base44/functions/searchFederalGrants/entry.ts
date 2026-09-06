import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchFederalAwards, FEDERAL_SOURCE_META } from "../../shared/public-data/usaspending.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Federal grants & contracts search via USASpending.gov API.
// No API key required. Costs 0 credits — only contact enrichment charges credits.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const inputs = {
      keyword: body.keyword || "",
      business_name: body.business_name || "",
      agency: body.agency || "",
      state: body.state || "",
      startDate: body.startDate || "2024-01-01",
      endDate: body.endDate || new Date().toISOString().slice(0, 10),
    };

    if (!inputs.keyword && !inputs.agency && !inputs.business_name) {
      return Response.json({ status: "failed", error: "Enter a keyword, recipient name, or agency to search federal awards.", results: [] }, { status: 400 });
    }

    const result = await searchFederalAwards(inputs);

    if (result.status !== "success") {
      return Response.json({ status: "failed", error: result.error || "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    // Duplicate detection against the caller's saved leads.
    const saved = await base44.entities.Lead.filter({ user_id: user.id, saved: true });
    const savedIds = new Set(saved.map((s) => (s.official_record_id || "").toLowerCase()).filter(Boolean));
    const results = (result.results || []).map((r) => ({
      ...r,
      possible_duplicate: r.official_record_id && savedIds.has(r.official_record_id.toLowerCase()),
    }));

    await logActivity(base44, user, "public_search_federal_grants", "Federal grants search via USASpending.gov", {
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
    console.error("searchFederalGrants failed", error);
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}