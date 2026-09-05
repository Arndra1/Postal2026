import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt, getOrCreateWallet, getOrCreateSubscription, hasActiveMembership } from "../../shared/credits.ts";
import { logCompliance } from "../../shared/logging.ts";

// Returns the authenticated user's dashboard stats: credits (monthly + pack),
// saved leads, successful enrichments, recent activity, and membership status.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const exempt = isExempt(user.role);
    const wallet = await getOrCreateWallet(base44, user.id);
    const sub = await getOrCreateSubscription(base44, user.id);

    const leads = await base44.entities.Lead.filter({ user_id: user.id });
    const savedLeads = leads.filter(l => l.saved).length;
    const enrichments = await base44.entities.Enrichment.filter({ user_id: user.id });
    const successful = enrichments.filter(e => e.status === "success").length;
    const activity = await base44.asServiceRole.entities.ActivityLog.filter({ user_id: user.id });

    const recentActivity = activity
      .slice()
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 8)
      .map(a => ({ id: a.id, action: a.action, description: a.description, created_date: a.created_date }));

    const recentLeads = leads
      .slice()
      .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
      .slice(0, 8)
      .map(l => ({
        id: l.id,
        person_name: l.person_name,
        business_name: l.business_name,
        city: l.city,
        state: l.state,
        email: l.email,
        phone: l.phone,
        contact_status: l.contact_status,
        created_date: l.created_date
      }));

    return Response.json({
      user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, company_name: user.company_name || "" },
      exempt,
      wallet: {
        balance: wallet.balance || 0,
        pack_balance: wallet.pack_balance || 0,
        lifetime_granted: wallet.lifetime_granted || 0,
        lifetime_used: wallet.lifetime_used || 0,
        monthly_credits: exempt ? null : 100
      },
      subscription: { status: sub.status, plan: sub.plan, period_end: sub.period_end, cancelled_at: sub.cancelled_at },
      membershipActive: exempt || hasActiveMembership(sub),
      savedLeads,
      successfulEnrichments: successful,
      totalEnrichments: enrichments.length,
      recentActivity,
      recentLeads
    });
  } catch (error) {
    return Response.json({ error: "Failed to load dashboard." }, { status: 500 });
  }
}