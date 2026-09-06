import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasActiveMembership } from "../../shared/credits.ts";
import { sendRenewalReminder, sendAnnualReminder, sendPaymentFailedNotice } from "../../shared/subscriptionEmails.ts";
import { logCompliance } from "../../shared/logging.ts";

// Automatic-renewal compliance reminder job — run daily by the "Subscription Reminders"
// workflow. Sends the notices required by applicable U.S. state automatic-renewal laws:
//   - Renewal reminder  N days before each billing date (includes price, frequency,
//     auto-renewal status, cancellation instructions, and a manage-subscription link).
//   - Annual automatic-renewal reminder (same required contents).
// Price-change and trial-expiration notices are supported in shared/subscriptionEmails.ts
// and can be wired here if prices change or trials are introduced.

// ===== CONFIGURABLE NOTICE SETTINGS — adjust to satisfy applicable state requirements =====
const RENEWAL_REMINDER_DAYS_BEFORE = 3; // days before the next billing date
const ANNUAL_REMINDER_ENABLED = true;   // yearly auto-renewal disclosure reminder
const ANNUAL_REMINDER_INTERVAL_DAYS = 365; // minimum gap between annual reminders
// ========================================================================================

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    // Direct calls by ordinary app users are rejected. The scheduled workflow has no
    // user session, so it proceeds — safe because every notice is recorded in
    // SubscriptionNotice and keyed idempotently (one per user per period), so repeated
    // or unsolicited runs can never spam members.
    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    if (user && user.role !== "admin" && user.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const now = new Date();
    const subs = await db.entities.Subscription.filter({ status: "active" });

    let renewalSent = 0;
    let annualSent = 0;
    const errors = [];

    for (const sub of subs) {
      try {
        if (!sub.user_id || !hasActiveMembership(sub)) continue;
        const users = await db.entities.User.filter({ id: sub.user_id });
        const email = users?.[0]?.email;
        if (!email) continue;

        // 1) Renewal reminder — N days before the next billing date, once per cycle.
        if (sub.period_end) {
          const daysUntil = (new Date(sub.period_end).getTime() - now.getTime()) / 86400000;
          if (daysUntil >= 0 && daysUntil <= RENEWAL_REMINDER_DAYS_BEFORE) {
            const already = await db.entities.SubscriptionNotice.filter({
              user_id: sub.user_id,
              notice_type: "renewal_reminder",
              reference: sub.period_end
            });
            if (already.length === 0) {
              await sendRenewalReminder(db, sub.user_id, email, sub.period_end);
              renewalSent++;
            }
          }
        }

        // 2) Annual automatic-renewal reminder — at most once per interval.
        if (ANNUAL_REMINDER_ENABLED) {
          const sent = await db.entities.SubscriptionNotice.filter({
            user_id: sub.user_id,
            notice_type: "annual_reminder"
          });
          const latest = (sent ?? [])
            .slice()
            .sort((a, b) => new Date(b.sent_at || 0) - new Date(a.sent_at || 0))[0];
          const stale = !latest || (now.getTime() - new Date(latest.sent_at).getTime()) > ANNUAL_REMINDER_INTERVAL_DAYS * 86400000;
          if (stale) {
            await sendAnnualReminder(db, sub.user_id, email);
            annualSent++;
          }
        }
      } catch (memberErr) {
        console.error("sendSubscriptionReminders: member failed", memberErr);
        errors.push(String(memberErr?.message || memberErr));
      }
    }

    // 3) Failed-payment detection: active subs whose period_end has passed but no
    //    renewal ORDER_APPROVED arrived. Transition to past_due (3-day grace before
    //    expiry) and notify the member to update their payment method.
    let pastDueDetected = 0;
    for (const sub of subs) {
      try {
        if (!sub.period_end || new Date(sub.period_end) > now) continue;
        await db.entities.Subscription.update(sub.id, { status: "past_due" });
        pastDueDetected++;
        if (sub.user_id) {
          const users = await db.entities.User.filter({ id: sub.user_id });
          const email = users?.[0]?.email;
          if (email) {
            try { await sendPaymentFailedNotice(db, sub.user_id, email, sub.period_end); } catch (_e) {}
          }
          await logCompliance(db, "payment_failed", sub.user_id, "", "Subscription renewal payment failed — entered past_due grace period.", { period_end: sub.period_end });
        }
      } catch (e) { errors.push(String(e?.message || e)); }
    }

    // 4) Expiry: past_due subs whose 3-day grace has ended without a successful
    //    payment → transition to expired (access revoked).
    let expiredCount = 0;
    const pastDueSubs = await db.entities.Subscription.filter({ status: "past_due" });
    for (const sub of pastDueSubs) {
      try {
        if (!sub.period_end) continue;
        const graceEnd = new Date(new Date(sub.period_end).getTime() + 3 * 86400000);
        if (graceEnd > now) continue;
        await db.entities.Subscription.update(sub.id, { status: "expired" });
        expiredCount++;
        if (sub.user_id) {
          await logCompliance(db, "payment_failed", sub.user_id, "", "Subscription expired — grace period ended without successful payment.", { period_end: sub.period_end });
        }
      } catch (e) { errors.push(String(e?.message || e)); }
    }

    // 5) Low-credit notification: wallets below threshold get in-app + email alert.
    let lowCreditSent = 0;
    const LOW_CREDIT_THRESHOLD = 10;
    try {
      const wallets = await db.entities.CreditWallet.filter({});
      for (const w of wallets) {
        if (!w.user_id) continue;
        const total = (w.balance || 0) + (w.pack_balance || 0);
        if (total >= LOW_CREDIT_THRESHOLD) continue;
        // Only notify once per day per user.
        const existing = await db.entities.Notification.filter({
          user_id: w.user_id,
          type: "credit_low",
        });
        const recent = (existing || []).find((n) => {
          if (!n.created_date) return false;
          return (now.getTime() - new Date(n.created_date).getTime()) < 86400000;
        });
        if (recent) continue;

        await db.entities.Notification.create({
          user_id: w.user_id,
          type: "credit_low",
          title: "Your credits are running low",
          body: `You have ${total} credit${total !== 1 ? "s" : ""} remaining. Purchase a credit pack to continue enriching leads.`,
          action_url: "/billing",
          read: false,
        }).catch(() => {});

        const users = await db.entities.User.filter({ id: w.user_id });
        const email = users?.[0]?.email;
        if (email) {
          try {
            await db.integrations.Core.SendEmail({
              to: email,
              subject: "🔔 Your RingBellz credits are running low",
              body: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto"><h2 style="color:#5B2A6E">Low credit balance</h2><p>You have <strong>${total} credit${total !== 1 ? "s" : ""}</strong> remaining in your RingBellz account.</p><p>Enrichment costs 5 credits per lead. Purchase a credit pack to keep prospecting without interruption.</p><a href="https://horned-pulse-lead-flow.base44.app/billing" style="display:inline-block;background:#5B2A6E;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;margin-top:12px">Buy Credits</a></div>`,
            });
            lowCreditSent++;
          } catch (_e) { /* email may fail for unregistered */ }
        }
      }
    } catch (e) { errors.push("low_credit: " + String(e?.message || e)); }

    // 6) Subscription cancelled/ended notifications.
    let cancelNotified = 0;
    try {
      const endedSubs = await db.entities.Subscription.filter({});
      for (const sub of endedSubs) {
        if (!sub.user_id) continue;
        if (!["cancelled", "expired"].includes(sub.status)) continue;
        const noticeType = sub.status === "cancelled" ? "subscription_canceled" : "subscription_ended";
        const existing = await db.entities.Notification.filter({
          user_id: sub.user_id,
          type: noticeType,
        });
        if ((existing || []).length > 0) continue;

        const title = sub.status === "cancelled"
          ? "Subscription cancelled"
          : "Subscription expired";
        const body = sub.status === "cancelled"
          ? "Your RingBellz subscription has been cancelled. You'll retain access until the end of your current billing period."
          : "Your RingBellz subscription has expired. Re-subscribe to continue accessing lead intelligence tools.";

        await db.entities.Notification.create({
          user_id: sub.user_id,
          type: noticeType,
          title,
          body,
          action_url: "/billing",
          read: false,
        }).catch(() => {});

        const users = await db.entities.User.filter({ id: sub.user_id });
        const email = users?.[0]?.email;
        if (email) {
          try {
            await db.integrations.Core.SendEmail({
              to: email,
              subject: "🔔 " + title,
              body: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto"><h2 style="color:#5B2A6E">${title}</h2><p>${body}</p><a href="https://horned-pulse-lead-flow.base44.app/billing" style="display:inline-block;background:#5B2A6E;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;margin-top:12px">Manage Subscription</a></div>`,
            });
            cancelNotified++;
          } catch (_e) { /* email may fail */ }
        }
      }
    } catch (e) { errors.push("cancel_notice: " + String(e?.message || e)); }

    return Response.json({ ok: true, renewalReminders: renewalSent, annualReminders: annualSent, pastDueDetected, expiredCount, lowCreditSent, cancelNotified, errors });
  } catch (error) {
    console.error("sendSubscriptionReminders failed", error);
    return Response.json({ error: "Reminder run failed." }, { status: 500 });
  }
}