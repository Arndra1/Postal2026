import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getOrCreateSubscription, isExempt } from "../../shared/credits.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized, badRequest } from "../../shared/roles.ts";

// Manage subscription: cancel or reactivate.
// Cancelled memberships keep paid-through access until period_end.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    if (isExempt(user.role)) {
      return Response.json({ ok: true, exempt: true, message: "Owner/admin accounts have permanent access." });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const action = body.action; // "cancel" | "reactivate"

    const sub = await getOrCreateSubscription(base44, user.id);

    if (action === "cancel") {
      const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "cancelled",
        cancelled_at: new Date().toISOString()
      });
      await logActivity(base44, user, "subscription_cancelled", "Membership cancelled — access remains until period end", {});
      return Response.json({ ok: true, subscription: updated, message: "Membership cancelled. Access remains until the end of your current billing period." });
    }

    if (action === "reactivate") {
      // SECURITY: only a cancelled-but-still-paid-through membership can be
      // reactivated. Once the paid period has ended, a new confirmed payment
      // is required — reactivation must never resurrect an expired membership.
      if (!sub.period_end || new Date(sub.period_end) <= new Date()) {
        return badRequest("Your billing period has ended. Subscribe again to reactivate your membership.");
      }
      const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "active",
        cancelled_at: ""
      });
      await logActivity(base44, user, "subscription_reactivated", "Membership reactivated", {});
      return Response.json({ ok: true, subscription: updated });
    }

    return badRequest("Unknown action. Use 'cancel' or 'reactivate'.");
  } catch (error) {
    return Response.json({ error: "Subscription update failed." }, { status: 500 });
  }
}