import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchNonprofits, lookupOfficers, PROPUBLICA } from "../../shared/public-data/propublica.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Nonprofit discovery via ProPublica Nonprofit Explorer API v2.
// ALL nonprofit search costs 0 credits. Only a later contact enrichment
// costs 5 credits (handled by the existing enrichLead function).
//
// Actions:
//   search         → search nonprofits by keyword, state, NTEE category
//   lookup_officer → fetch org detail + parse Form 990 XML for officer names
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const action = body.action || "search";
    if (action === "lookup_officer") return await handleOfficerLookup(base44, user, body);
    return await handleSearch(base44, user, body);
  } catch (error) {
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

async function handleSearch(base44, user, body) {
  const inputs = {
    keyword: body.keyword || "",
    state: body.state || "",
    ntee: body.ntee || "",
  };

  let result;
  try {
    result = await searchNonprofits(inputs);
  } catch (_err) {
    return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
  }

  const now = new Date().toISOString();
  const ok = result.status === "success";
  await markSourceAttempt(base44, PROPUBLICA.key, ok, now, result.error || "").catch(() => {});

  if (!ok) {
    return Response.json({ status: "failed", error: result.error || "Source temporarily unavailable.", results: [] }, { status: 502 });
  }

  const results = await flagDuplicates(base44, user.id, result.results || []);

  await logActivity(base44, user, "public_search_nonprofits", "Nonprofit search via ProPublica", {
    state: inputs.state, ntee: inputs.ntee, keyword: inputs.keyword, count: results.length,
  });

  return Response.json({
    status: "success",
    source: result.source,
    results,
    credits_charged: 0,
  });
}

async function handleOfficerLookup(base44, user, body) {
  const ein = body.ein || "";
  if (!ein) return Response.json({ status: "failed", error: "EIN required.", officers: [] }, { status: 400 });

  let result;
  try {
    result = await lookupOfficers(ein);
  } catch (_err) {
    result = { officers: [], financials: null };
  }

  await logActivity(base44, user, "nonprofit_officer_lookup", "Officer lookup for EIN: " + ein, {
    ein, officer_count: (result.officers || []).length,
  });

  return Response.json({
    status: "success",
    officers: result.officers || [],
    financials: result.financials || null,
    no_filing: !!result.no_filing,
    credits_charged: 0,
  });
}

// Duplicate detection against the caller's OWN saved leads only.
async function flagDuplicates(base44, userId, prospects) {
  try {
    const saved = await base44.entities.Lead.filter({ user_id: userId, saved: true });
    const byOfficialId = {};
    for (const s of saved || []) {
      if (s.official_record_id) byOfficialId[s.official_record_id.toLowerCase()] = s;
    }
    return prospects.map((p) => {
      const oid = (p.official_record_id || "").toLowerCase();
      const dup = oid ? byOfficialId[oid] : null;
      return { ...p, possible_duplicate: !!dup, duplicate_lead_id: dup ? dup.id : "" };
    });
  } catch (_e) {
    return prospects.map((p) => ({ ...p, possible_duplicate: false, duplicate_lead_id: "" }));
  }
}

async function markSourceAttempt(base44, sourceKey, ok, now, error) {
  try {
    const rows = await base44.asServiceRole.entities.PublicDataSource.filter({ source_key: sourceKey });
    const s = (rows && rows[0]) || null;
    if (!s) return;
    const patch = {
      last_attempt_at: now,
      connection_status: ok ? "live" : "error",
      error_state: ok ? "" : (error || "error").slice(0, 200),
    };
    if (ok) { patch.last_success_at = now; patch.error_state = ""; }
    await base44.asServiceRole.entities.PublicDataSource.update(s.id, patch);
  } catch (_e) { /* non-critical */ }
}