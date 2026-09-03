import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden } from "../../shared/roles.ts";

// Admin overview statistics.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const users = await base44.asServiceRole.entities.User.list();
    const subscriptions = await base44.asServiceRole.entities.Subscription.list();
    const wallets = await base44.asServiceRole.entities.CreditWallet.list();
    const enrichments = await base44.asServiceRole.entities.Enrichment.list();
    const billingEvents = await base44.asServiceRole.entities.BillingEvent.list();
    const activityLogs = await base44.asServiceRole.entities.ActivityLog.list();

    const activeMembers = subscriptions.filter(s => s.status === "active" || s.status === "trialing").length;
    const successfulEnrichments = enrichments.filter(e => e.status === "success").length;
    const creditsUsed = wallets.reduce((sum, w) => sum + (w.lifetime_used || 0), 0);
    const monthlyRevenue = activeMembers * 59;

    const now = Date.now();
    const monthAgo = now - 30 * 24 * 60 * 60 * 1000;
    const newSignups = users.filter(u => u.created_date && new Date(u.created_date).getTime() > monthAgo).length;

    return Response.json({
      totalUsers: users.length,
      activeMembers,
      monthlyRevenue,
      successfulEnrichments,
      creditsUsed,
      newSignups,
      totalBillingEvents: billingEvents.length,
      totalActivity: activityLogs.length
    });
  } catch (error) {
    return Response.json({ error: "Failed to load admin stats." }, { status: 500 });
  }
}