import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { searchExemptOrganizations, IRS_BMF } from "../../shared/public-data/irsBmf.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Community & Small Business Opportunities — organization discovery.
//
// Source: the official IRS Exempt Organizations Business Master File (EO BMF),
// one cumulative CSV per state. No scraped or third-party data. Search costs
// 0 credits; only a later contact enrichment costs 5 credits (enrichPartnerOrg).
//
// The state file is a national bulk dataset, so a result set is cached after
// the first retrieval and repeat searches are served from the cache.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const inputs = {
      state: String(body.state || "").trim().toUpperCase(),
      city: String(body.city || "").trim(),
      keyword: String(body.keyword || "").trim(),
      ntee: String(body.ntee || "").trim().toUpperCase(),
      org_type: String(body.org_type || "").trim().toLowerCase(),
      limit: body.limit || 100,
    };

    if (!/^[A-Z]{2}$/.test(inputs.state)) {
      return Response.json({ status: "failed", error: "Select a state to search official IRS filings.", results: [] }, { status: 400 });
    }

    const cacheKey = [
      "bmf",
      inputs.state,
      inputs.city.toUpperCase(),
      inputs.keyword.toUpperCase(),
      inputs.ntee.slice(0, 1),
      inputs.org_type,
      inputs.limit,
    ].join("|");

    const cached = await readCache(base44, cacheKey);
    if (cached) {
      return Response.json({
        status: "success",
        source: IRS_BMF.name + " (cached)",
        results: await flagDuplicates(base44, user.id, cached),
        credits_charged: 0,
        cached: true,
      });
    }

    let result;
    try {
      result = await searchExemptOrganizations(inputs);
    } catch (_err) {
      await markSourceAttempt(base44, false, "provider_error").catch(() => {});
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    const ok = result.status === "success";
    await markSourceAttempt(base44, ok, result.error || "").catch(() => {});

    if (!ok) {
      return Response.json({ status: "failed", error: result.error || "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    await writeCache(base44, cacheKey, result.results || []).catch(() => {});

    const results = await flagDuplicates(base44, user.id, result.results || []);

    await logActivity(base44, user, "community_org_search", "IRS exempt-organization search", {
      state: inputs.state, city: inputs.city, ntee: inputs.ntee, org_type: inputs.org_type, count: results.length,
    });

    return Response.json({
      status: "success",
      source: result.source || IRS_BMF.name,
      results,
      credits_charged: 0,
    });
  } catch (error) {
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

async function readCache(base44, cacheKey) {
  try {
    const rows = await base44.asServiceRole.entities.NonprofitCache.filter({ cache_key: cacheKey });
    const row = (rows && rows[0]) || null;
    if (!row) return null;
    const age = Date.now() - new Date(row.fetched_at || 0).getTime();
    if (!row.fetched_at || age > CACHE_TTL_MS) return null;
    return Array.isArray(row.results) ? row.results : null;
  } catch (_e) {
    return null;
  }
}

async function writeCache(base44, cacheKey, results) {
  const payload = {
    cache_key: cacheKey,
    results,
    result_count: results.length,
    fetched_at: new Date().toISOString(),
  };
  const rows = await base44.asServiceRole.entities.NonprofitCache.filter({ cache_key: cacheKey });
  const existing = (rows && rows[0]) || null;
  if (existing) {
    await base44.asServiceRole.entities.NonprofitCache.update(existing.id, payload);
  } else {
    await base44.asServiceRole.entities.NonprofitCache.create(payload);
  }
}

// Duplicate detection against the caller's OWN saved partner organizations.
async function flagDuplicates(base44, userId, orgs) {
  try {
    const saved = await base44.entities.PartnerOrganization.filter({ user_id: userId });
    const byEin = {};
    for (const s of saved || []) {
      if (s.ein) byEin[s.ein.toLowerCase()] = s;
    }
    return orgs.map((o) => {
      const ein = (o.official_record_id || "").toLowerCase();
      const dup = ein ? byEin[ein] : null;
      return { ...o, possible_duplicate: !!dup, duplicate_partner_id: dup ? dup.id : "" };
    });
  } catch (_e) {
    return orgs.map((o) => ({ ...o, possible_duplicate: false, duplicate_partner_id: "" }));
  }
}

async function markSourceAttempt(base44, ok, error) {
  const now = new Date().toISOString();
  const rows = await base44.asServiceRole.entities.PublicDataSource.filter({ source_key: IRS_BMF.key });
  const s = (rows && rows[0]) || null;
  if (!s) return;
  const patch = {
    last_attempt_at: now,
    connection_status: ok ? "live" : "error",
    error_state: ok ? "" : (error || "error").slice(0, 200),
  };
  if (ok) { patch.last_success_at = now; patch.error_state = ""; }
  await base44.asServiceRole.entities.PublicDataSource.update(s.id, patch);
}