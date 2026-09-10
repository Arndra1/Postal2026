import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { providerForCategory } from "../../shared/public-data/registry.ts";
import { isAdmin, isOwner, unauthorized, forbidden } from "../../shared/roles.ts";

// Admin-only: runs a live connectivity test against a public-data source and
// records the result on its PublicDataSource registry row. Never returns the
// secret value — only status + counts.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();
    if (!isAdmin(user.role) && !isOwner(user.role)) return forbidden();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const category = body.category || "";
    const provider = providerForCategory(category);
    if (!provider) return Response.json({ error: "Unknown source category." }, { status: 400 });

    const now = new Date().toISOString();
    if (!provider.configured()) {
      await updateSource(base44, provider.meta.key, false, now, "missing_api_key");
      return Response.json({ status: "failed", configured: false, error: "Missing API key for this source." });
    }

    // Minimal probe per category.
    const probeInputs = {
      market_intelligence: { state: "CA" },
      government_open_data: { business_name: "a" },
      public_records: { business_name: "Apple" },
      geographic: {},
    };

    let result;
    try {
      result = await provider.search(probeInputs[category] || {});
    } catch (err) {
      result = { status: "failed", error: (err && err.message) || "provider_error", results: [] };
    }

    const ok = result.status === "success";
    await updateSource(base44, provider.meta.key, ok, now, result.error || "");

    return Response.json({
      status: result.status,
      configured: true,
      source: provider.meta.name,
      count: (result.results || []).length,
      error: result.error || "",
      tested_at: now,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function updateSource(base44, key, ok, now, error) {
  try {
    const rows = await base44.asServiceRole.entities.PublicDataSource.filter({ source_key: key });
    const s = (rows && rows[0]) || null;
    if (!s) return;
    const patch = {
      last_attempt_at: now,
      connection_status: ok ? "live" : "error",
      error_state: ok ? "" : (error || "error").slice(0, 200),
    };
    if (ok) patch.last_success_at = now;
    await base44.asServiceRole.entities.PublicDataSource.update(s.id, patch);
  } catch (_e) { /* non-critical */ }
}