import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { hasActiveMembership } from "../../shared/credits.ts";
import { sendRenewalReminder, sendAnnualReminder } from "../../shared/subscriptionEmails.ts";

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

    return Response.json({ ok: true, renewalReminders: renewalSent, annualReminders: annualSent, errors });
  } catch (error) {
    console.error("sendSubscriptionReminders failed", error);
    return Response.json({ error: "Reminder run failed." }, { status: 500 });
  }
}