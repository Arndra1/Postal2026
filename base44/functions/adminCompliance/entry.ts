import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden, badRequest } from "../../shared/roles.ts";
import { logCompliance } from "../../shared/logging.ts";

// Admin compliance dashboard: terms acknowledgments, compliance event log,
// usage review, and independent enabling/disabling of individual data sources.
const DEFAULT_PROVIDERS = [
  { provider_key: "mock_provider", label: "Built-in demo provider (contact enrichment)", enabled: true },
  { provider_key: "pdl", label: "People Data Labs (contact enrichment)", enabled: false },
  { provider_key: "enrich_so", label: "Enrich.so (contact enrichment)", enabled: false },
  { provider_key: "numverify", label: "NumVerify (phone validation)", enabled: false }
];

async function ensureProviders(base44) {
  const existing = await base44.asServiceRole.entities.ProviderSetting.list();
  const missing = DEFAULT_PROVIDERS.filter(d => !existing.some(e => e.provider_key === d.provider_key));
  if (missing.length > 0) {
    await base44.asServiceRole.entities.ProviderSetting.bulkCreate(missing);
    return await base44.asServiceRole.entities.ProviderSetting.list();
  }
  return existing;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    // Enable or disable an individual data source without affecting the others.
    if (body.action === "toggle_provider") {
      const key = body.provider_key;
      if (!key) return badRequest("provider_key required");
      const providers = await ensureProviders(base44);
      const provider = providers.find(p => p.provider_key === key);
      if (!provider) return badRequest("Unknown provider.");
      const enabled = !!body.enabled;
      await base44.asServiceRole.entities.ProviderSetting.update(provider.id, { enabled });
      await logCompliance(base44, enabled ? "provider_enabled" : "provider_disabled", "", user.id,
        (enabled ? "Enabled" : "Disabled") + " data source: " + (provider.label || key), { provider_key: key });
      return Response.json({ ok: true });
    }

    // Issue a compliance warning to a user (recorded in the compliance log).
    if (body.action === "warn_user") {
      if (!body.user_id) return badRequest("user_id required");
      const reason = String(body.reason || "").slice(0, 500);
      await logCompliance(base44, "compliance_warning", body.user_id, user.id,
        reason ? "Compliance warning: " + reason : "Compliance warning issued", { reason });
      return Response.json({ ok: true });
    }

    // Default: compliance dashboard data.
    const [providers, acceptances, logs, users, enrichments, leads] = await Promise.all([
      ensureProviders(base44),
      base44.asServiceRole.entities.TermsAcceptance.list(),
      base44.asServiceRole.entities.ComplianceLog.list("-created_date", 100),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.Enrichment.list(),
      base44.asServiceRole.entities.Lead.list()
    ]);

    const userById = new Map(users.map(u => [u.id, u]));
    const userEmail = (id) => (userById.get(id) || {}).email || "";
    const userName = (id) => (userById.get(id) || {}).full_name || "";

    const acknowledgments = acceptances.map(a => ({
      user_id: a.user_id,
      email: userEmail(a.user_id),
      full_name: userName(a.user_id),
      version: a.version,
      accepted_at: a.accepted_at || a.created_date || ""
    }));

    const enrichmentCount = {};
    enrichments.forEach(e => { enrichmentCount[e.user_id] = (enrichmentCount[e.user_id] || 0) + 1; });
    const leadCount = {};
    leads.forEach(l => { leadCount[l.user_id] = (leadCount[l.user_id] || 0) + 1; });

    const usage = users.map(u => ({
      user_id: u.id,
      email: u.email || "",
      full_name: u.full_name || "",
      role: u.role || "user",
      enrichment_count: enrichmentCount[u.id] || 0,
      lead_count: leadCount[u.id] || 0
    })).sort((a, b) => b.enrichment_count - a.enrichment_count).slice(0, 25);

    const complianceLog = logs.map(l => ({
      event_type: l.event_type,
      description: l.description || "",
      user_email: userEmail(l.user_id) || l.user_id || "",
      admin_email: userEmail(l.admin_id) || "",
      created_date: l.created_date || ""
    }));

    return Response.json({ providers, acknowledgments, complianceLog, usage });
  } catch (error) {
    return Response.json({ error: "Failed to load compliance data." }, { status: 500 });
  }
}