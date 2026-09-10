import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getOrCreateSubscription, isExempt } from "../../shared/credits.ts";
import { sendCancellationConfirmation } from "../../shared/subscriptionEmails.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized, badRequest } from "../../shared/roles.ts";

// Manage subscription: cancel or reactivate.
// Cancelled memberships keep paid-through access until period_end.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    if (isExempt(user.role)) {
      return Response.json({ ok: true, exempt: true, message: "Owner/admin accounts have permanent access." });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const action = body.action; // "cancel" | "reactivate"

    const sub = await getOrCreateSubscription(base44, user.id);

    if (action === "cancel") {
      // If billed through Base44 Payments, stop renewal at the provider first
      // (soft cancel — access remains until the paid period ends).
      if (sub.billing_provider === "base44_payments" && sub.provider_subscription_id) {
        const apiKey = Deno.env.get("WIX_CHECKOUT_API_KEY") || "";
        const siteId = Deno.env.get("WIX_CHECKOUT_SITE_ID") || "";
        if (!apiKey || !siteId) {
          return Response.json({ error: "Payments are not configured." }, { status: 502 });
        }
        const cancelRes = await fetch(
          "https://www.wixapis.com/payments/base44/v1/subscriptions/" + encodeURIComponent(sub.provider_subscription_id) + "/cancel",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": apiKey, "wix-site-id": siteId },
            body: JSON.stringify({ subscription_id: sub.provider_subscription_id, reason: "Customer requested cancellation", immediate: false })
          }
        );
        if (!cancelRes.ok) {
          const errText = await cancelRes.text();
          console.error("billingManage: provider cancel failed", { status: cancelRes.status, errText });
          return Response.json({ error: "Could not cancel your membership with the payment provider. Please try again." }, { status: 502 });
        }
      }
      const updated = await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "cancelled",
        cancelled_at: new Date().toISOString()
      });
      await logActivity(base44, user, "subscription_cancelled", "Membership cancelled — access remains until period end", {});
      // Cancellation confirmation email + notice record (compliance).
      // A mail failure must NOT undo the completed cancellation.
      try {
        await sendCancellationConfirmation(base44, user.id, user.email, updated.period_end || "");
      } catch (mailErr) {
        console.error("billingManage: cancellation confirmation email failed", mailErr);
      }
      return Response.json({ ok: true, subscription: updated, message: "Membership cancelled. Access remains until the end of your current billing period. A confirmation email has been sent." });
    }

    if (action === "reactivate") {
      // SECURITY: only a cancelled-but-still-paid-through membership can be
      // reactivated. Once the paid period has ended, a new confirmed payment
      // is required — reactivation must never resurrect an expired membership.
      if (!sub.period_end || new Date(sub.period_end) <= new Date()) {
        return badRequest("Your billing period has ended. Subscribe again to reactivate your membership.");
      }
      // Auto-renewal turned off at the provider (soft cancel) cannot be turned back
      // on via API — the buyer must start a new subscription after this period ends.
      if (sub.billing_provider === "base44_payments") {
        return badRequest("Automatic renewal is off for this membership. It stays active until the period ends — subscribe again afterward to restart.");
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