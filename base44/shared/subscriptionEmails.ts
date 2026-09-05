// Subscription compliance emails + notice recordkeeping — single source of truth.
// Used by payments-webhook (enrollment confirmation), billingManage (cancellation
// confirmation), and sendSubscriptionReminders (renewal / annual / price-change /
// trial-expiration notices). Every email is recorded in SubscriptionNotice.

import { TERMS_VERSION } from "./terms.ts";

// Accepts either a full base44 client or an already-elevated service-role client.
function svc(base44) {
  return base44.asServiceRole ?? base44;
}

function manageLink() {
  const url = Deno.env.get("WIX_CHECKOUT_APP_URL") || "";
  return url ? `${url}/billing` : "";
}

function manageText() {
  const link = manageLink();
  return link ? `Manage your subscription: ${link}` : "Manage your subscription: Account → Billing → Manage Subscription in the Leadora app.";
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch (_e) {
    return String(iso || "");
  }
}

const CANCEL_TEXT = "How to cancel: In the Leadora app, go to Account → Billing → Manage Subscription and click \"Cancel Subscription\". Cancellation is online and immediate — no phone call, agent, or meeting required, and no unnecessary information is needed. Cancellation stops all future charges; you keep access and your remaining credits through the end of your paid billing period.";

async function mail(base44, to, subject, body) {
  await svc(base44).integrations.Core.SendEmail({ to, subject, body });
}

export async function recordNotice(base44, userId, noticeType, email, reference, details) {
  await svc(base44).entities.SubscriptionNotice.create({
    user_id: userId,
    notice_type: noticeType,
    email: email || "",
    sent_at: new Date().toISOString(),
    reference: reference || "",
    details: { ...(details || {}), terms_version: TERMS_VERSION }
  });
}

// Sent immediately after successful enrollment (payments-webhook).
export async function sendEnrollmentConfirmation(base44, userId, email, startDate, nextBillingDate) {
  const body = [
    "Thank you — your Leadora Membership is active.",
    "",
    "Leadora Membership",
    "Price: $59/month",
    "Billing frequency: monthly",
    "Automatic renewal: Your Leadora membership automatically renews every month at $59 until canceled.",
    "Included: 100 Leadora credits each successful monthly billing cycle.",
    `Subscription start date: ${fmtDate(startDate)}`,
    `Next billing date: ${fmtDate(nextBillingDate)}`,
    "",
    CANCEL_TEXT,
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, "Your Leadora Membership is active", body);
  await recordNotice(base44, userId, "enrollment_confirmation", email, nextBillingDate, { start_date: startDate, next_billing_date: nextBillingDate });
}

// Sent immediately after a confirmed cancellation (billingManage).
export async function sendCancellationConfirmation(base44, userId, email, periodEnd) {
  const body = [
    "Your Leadora Membership cancellation is confirmed.",
    "",
    `Cancellation date/time: ${new Date().toISOString()}`,
    periodEnd ? `You keep full access and your remaining credits through ${fmtDate(periodEnd)} (the end of your paid billing period).` : "Your paid billing period has ended.",
    "Automatic renewal is now OFF — no further recurring charges will be issued.",
    "",
    "You can restart your membership anytime at Account → Billing in the Leadora app.",
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, "Your Leadora Membership cancellation is confirmed", body);
  await recordNotice(base44, userId, "cancellation_confirmation", email, periodEnd || "", {});
}

// Payment-failed notice — sent when a renewal payment fails and the subscription
// enters the past_due grace period (sendSubscriptionReminders detects this).
export async function sendPaymentFailedNotice(base44, userId, email, periodEnd) {
  const graceEnd = new Date(new Date(periodEnd).getTime() + 3 * 86400000);
  const body = [
    "Your Leadora Membership renewal payment didn't go through.",
    "",
    "We were unable to process your monthly renewal payment. Please update your payment method to avoid losing access.",
    "",
    `Your billing period ended: ${fmtDate(periodEnd)}`,
    `Grace period ends: ${fmtDate(graceEnd.toISOString())}`,
    "",
    "Update your payment method to keep your membership active:",
    manageText()
  ].join("\n");
  await mail(base44, email, "Action needed: your Leadora membership payment failed", body);
  await recordNotice(base44, userId, "renewal_reminder", email, periodEnd, { type: "payment_failed", grace_end: graceEnd.toISOString() });
}

// Renewal reminder — sent N days before each billing date (sendSubscriptionReminders).
export async function sendRenewalReminder(base44, userId, email, billingDate) {
  const body = [
    "Your Leadora Membership renews soon.",
    "",
    "Leadora Membership — $59/month",
    `Next billing date: ${fmtDate(billingDate)}`,
    "Billing frequency: monthly. Your membership automatically renews every month at $59 until canceled.",
    "Automatic renewal status: ON.",
    "Included: 100 Leadora credits each successful monthly billing cycle.",
    "",
    CANCEL_TEXT,
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, "Your Leadora Membership renews soon", body);
  await recordNotice(base44, userId, "renewal_reminder", email, billingDate, {});
}

// Annual automatic-renewal reminder (sendSubscriptionReminders).
export async function sendAnnualReminder(base44, userId, email) {
  const body = [
    "Annual reminder about your Leadora Membership subscription.",
    "",
    "Leadora Membership — $59/month, billed monthly.",
    "Automatic renewal status: ON — your membership automatically renews every month at $59 until canceled.",
    "Included: 100 Leadora credits each successful monthly billing cycle.",
    "",
    CANCEL_TEXT,
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, "Annual reminder: your Leadora Membership auto-renewal", body);
  await recordNotice(base44, userId, "annual_reminder", email, "", {});
}

// Price-change notice. Leadora keeps the existing $59 price until an authorized change
// is properly implemented: advance notice + fresh affirmative consent are required
// before any new amount is charged.
export async function sendPriceChangeNotice(base44, userId, email, oldPrice, newPrice, effectiveDate) {
  const body = [
    "Important: the price of your Leadora Membership is changing.",
    "",
    `Current price: $${oldPrice}/month`,
    `New price: $${newPrice}/month`,
    `Effective date: ${fmtDate(effectiveDate)}`,
    "",
    "No action is needed to keep your membership at the new price after the effective date; you may cancel anytime before then at no further charge.",
    "",
    CANCEL_TEXT,
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, `Leadora Membership price change — effective ${fmtDate(effectiveDate)}`, body);
  await recordNotice(base44, userId, "price_change_notice", email, effectiveDate, { old_price: oldPrice, new_price: newPrice });
}

// Trial-expiration notice — ready if a free trial is ever introduced (currently unused).
export async function sendTrialExpirationNotice(base44, userId, email, trialEndDate) {
  const body = [
    "Your Leadora Membership free trial is ending soon.",
    "",
    `Trial end date: ${fmtDate(trialEndDate)}`,
    "When the trial ends, your membership automatically renews every month at $59 until canceled, and includes 100 Leadora credits each successful monthly billing cycle.",
    "",
    CANCEL_TEXT,
    "",
    manageText()
  ].join("\n");
  await mail(base44, email, "Your Leadora free trial is ending soon", body);
  await recordNotice(base44, userId, "trial_expiration_notice", email, trialEndDate, {});
}