import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { PLAN_PRICE, PLAN_CURRENCY, PLAN_ID, MONTHLY_CREDITS, getOrCreateSubscription, grantCredits, isExempt } from "../../shared/credits.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized, badRequest, forbidden } from "../../shared/roles.ts";

// Activate a LeadPulse Pro membership and grant monthly credits.
// Server-side only — never trust payment status from the browser.
// In demo mode (no live provider connected) this records the subscription and grants credits.
// With a live provider (PayPal/Stripe), the frontend checkout confirms payment first; this
// endpoint is then called to provision, OR provisioning happens via the verified webhook.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    if (isExempt(user.role)) {
      return Response.json({ ok: true, message: "Owner/admin accounts have permanent access.", exempt: true });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const provider = body.provider || "demo";
    const providerSubscriptionId = body.provider_subscription_id || "";
    const amount = body.amount;
    const currency = body.currency || "USD";

    // Server-side amount validation.
    if (amount !== undefined && (Number(amount) !== PLAN_PRICE || currency.toUpperCase() !== PLAN_CURRENCY)) {
      return badRequest("Amount or currency does not match the $59 USD plan.");
    }

    const sub = await getOrCreateSubscription(base44, user.id);
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Idempotency: if already active in the current period, do not grant again.
    const alreadyActive = sub.status === "active" && sub.period_end && (new Date(sub.period_end) > now);

    if (alreadyActive) {
      return Response.json({ ok: true, duplicate: true, subscription: sub, message: "Membership already active for this period." });
    }

    const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
      plan: PLAN_ID,
      status: "active",
      billing_provider: provider,
      provider_subscription_id: providerSubscriptionId,
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      cancelled_at: ""
    });

    // Grant monthly credits once per cycle.
    const newBalance = await grantCredits(base44, user.id, MONTHLY_CREDITS, "grant", "subscription", sub.id, "Monthly membership credits (100)");

    await logActivity(base44, user, "subscription_activated", "LeadPulse Pro membership activated", { plan: PLAN_ID, provider });

    return Response.json({ ok: true, subscription: updated, balance: newBalance });
  } catch (error) {
    return Response.json({ error: "Subscription activation failed." }, { status: 500 });
  }
}