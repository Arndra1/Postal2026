// Base44 Payments fulfillment webhook — base44/functions/payments-webhook/entry.ts
//
// Provided by the platform. Do NOT rewrite the plumbing (JWT verification, envelope parsing,
// purchase resolution, idempotency). Only edit the region marked
// `// ===== APP-SPECIFIC =====` to define what "grant access" means for this app.
//
// It receives Wix `ORDER_APPROVED` events (and optional subscription lifecycle events),
// verifies the RS256 JWT, resolves the buyer's pending Purchase by checkout id, and marks
// it paid exactly once. It pairs with `create-checkout`, which MUST persist
// `checkoutSession.id` on the Purchase — Wix has no custom-metadata field, so the checkout
// id is the ONLY correlation key back to this app's user.

import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { importSPKI, jwtVerify } from "npm:jose@5.9.6";
import { getOrCreateSubscription, grantCreditsOnce, MONTHLY_CREDITS, PLAN_ID } from "../../shared/credits.ts";
import { resolveProduct, MEMBERSHIP_PRODUCT_ID } from "../../shared/products.ts";
import { sendEnrollmentConfirmation } from "../../shared/subscriptionEmails.ts";

// Wix event types (verbatim from Wix docs).
const ORDER_APPROVED = "wix.ecom.v1.order_approved";
const SUBSCRIPTION_CANCELED = "wix.ecom.subscription_contracts.v1.subscription_contract_canceled";
const SUBSCRIPTION_EXPIRED = "wix.ecom.subscription_contracts.v1.subscription_contract_expired";

// Unwrap Wix's triple-nested envelope: the request body is a JWT whose verified
// payload has a `data` JSON string; that parses to an envelope with `eventType` and
// another `data` JSON string; that parses to the event data, which for these events
// wraps the entity in a per-action wrapper (see extractOrder).
function parseWixEnvelope(payload: Record<string, unknown>): { eventType: string; eventData: any } {
  const outer = typeof payload.data === "string" ? JSON.parse(payload.data) : payload.data;
  // eventType lives on the parsed envelope; newer DomainEvent envelopes may also carry it as a
  // top-level JWT claim — fall back to that so the event isn't misrouted to the ignore branch.
  const eventType: string = outer?.eventType ?? (payload.eventType as string) ?? "";
  const eventData = typeof outer?.data === "string" ? JSON.parse(outer.data) : outer?.data;
  return { eventType, eventData };
}

// order_approved is an ACTION event: the order is at `actionEvent.body.order`
// (per the Wix docs' sample payload, where `order.checkoutId === checkoutSession.id`).
// The flat `order` / `entity` forms are fallbacks for the other envelope variants Wix emits.
function extractOrder(eventData: any): any | null {
  return eventData?.actionEvent?.body?.order ?? eventData?.order ?? eventData?.entity ?? null;
}

// The buyer's email, as entered on Wix's hosted checkout page. This is the ONLY identity for an
// anonymous buyer (one who wasn't signed in when create-checkout ran, so appUserId is null). Wix
// exposes it in a few places depending on the flow; check the common ones.
function extractBuyerEmail(order: any): string | null {
  return (
    order?.buyerInfo?.email ??
    order?.billingInfo?.contactDetails?.email ??
    order?.billingInfo?.email ??
    null
  );
}

Deno.serve(async (req: Request) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    // Read per request, never at module scope: the key is stored when the webhook is registered, so
    // a warm isolate that captured it at startup would stay keyless and 500 every ORDER_APPROVED.
    const WEBHOOK_PUBLIC_KEY = Deno.env.get("WIX_CHECKOUT_WEBHOOK_PUBLIC_KEY");
    if (!WEBHOOK_PUBLIC_KEY) {
      // Never process an unverifiable event. Missing key = misconfiguration, not a retry case.
      console.error("payments-webhook: WIX_CHECKOUT_WEBHOOK_PUBLIC_KEY is not set");
      return new Response("Webhook not configured", { status: 500 });
    }

    // The raw body IS the JWT (Wix signs the whole payload, RS256).
    const token = await req.text();

    let payload: Record<string, unknown>;
    try {
      const key = await importSPKI(WEBHOOK_PUBLIC_KEY, "RS256");
      const verified = await jwtVerify(token, key);
      payload = verified.payload as Record<string, unknown>;
    } catch (err) {
      // Signature invalid / malformed. Reject — do NOT grant anything.
      console.error("payments-webhook: JWT verification failed", err);
      return new Response("Invalid signature", { status: 401 });
    }

    const { eventType, eventData } = parseWixEnvelope(payload);
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole; // No end user is authenticated on a webhook call.

    if (eventType === ORDER_APPROVED) {
      return await handleOrderApproved(db, eventData);
    }

    if (eventType === SUBSCRIPTION_CANCELED || eventType === SUBSCRIPTION_EXPIRED) {
      return await handleSubscriptionEnded(db, eventData);
    }

    // Unknown/irrelevant event — acknowledge so Wix stops retrying.
    console.log(`payments-webhook: ignoring event ${eventType}`);
    return new Response("OK", { status: 200 });
  } catch (err) {
    // Unexpected failure: 500 tells Wix to retry later (the handler is idempotent, so a
    // retry after a partial failure is safe).
    console.error("payments-webhook: unhandled error", err);
    return new Response("Internal error", { status: 500 });
  }
});

async function handleOrderApproved(db: any, eventData: any): Promise<Response> {
  const order = extractOrder(eventData);
  const checkoutId: string | undefined = order?.checkoutId;
  const orderId: string | undefined = order?.id;
  // Subscription id (if any) — persisted below so SUBSCRIPTION_CANCELED/EXPIRED can later
  // resolve this purchase by subscriptionId and revoke access.
  const subscriptionId: string | undefined = (order?.lineItems ?? [])
    .map((li: any) => li?.subscriptionInfo?.id)
    .find((id: any) => !!id);

  if (!checkoutId) {
    // Nothing to correlate on. Acknowledge to stop retries; log for investigation.
    console.error("payments-webhook: ORDER_APPROVED missing order.checkoutId", { orderId });
    return new Response("OK", { status: 200 });
  }

  // Resolve the pending purchase created by `create-checkout` (join key: checkoutSessionId).
  const matches = await db.entities.Base44Purchase.filter({ checkoutSessionId: checkoutId });
  const purchase = matches?.[0];

  if (!purchase) {
    // No pending purchase for this checkoutId. Two possibilities:
    // 1. Transient race on the initial order (create-checkout's write not yet visible) —
    //    return 500 so Wix retries.
    // 2. A SUBSCRIPTION RENEWAL order: Wix generates renewal orders itself, with a
    //    checkoutId this app never persisted. Renewal orders carry the same
    //    lineItems[].subscriptionInfo.id as the original approved purchase, so resolve
    //    the member through that.
    if (subscriptionId) {
      const originals = await db.entities.Base44Purchase.filter({ subscriptionId });
      const original = originals?.[0];
      if (original?.status === "paid" && original.appUserId) {
        return await handleRenewalOrder(db, original.appUserId, order, checkoutId, orderId, subscriptionId);
      }
    }
    console.warn("payments-webhook: no Base44Purchase for checkoutId yet, asking Wix to retry", { checkoutId, orderId });
    return new Response("Purchase not found yet", { status: 500 });
  }

  // IDEMPOTENCY + terminal states: Wix delivers ORDER_APPROVED more than once, and may deliver
  // a stale approval after a cancellation. Skip if already "paid" (prevents double-grant) or
  // "canceled" (a late approval must not resurrect a revoked subscription).
  if (purchase.status === "paid" || purchase.status === "canceled") {
    console.log("payments-webhook: purchase already terminal, skipping", { checkoutId, status: purchase.status });
    return new Response("OK", { status: 200 });
  }

  // The buyer's email: from create-checkout if they were signed in, otherwise from the Wix order
  // (the only identity an anonymous buyer has). Persisted below and used by the grant block.
  const buyerEmail: string | null = purchase.buyerEmail ?? extractBuyerEmail(order);

  // ===== APP-SPECIFIC =====
  // Grant: branch on the SERVER-RESOLVED product (purchase.productId — set by create-checkout;
  // the client never supplies price, product name, or credit amounts).
  // SECURITY: this runs ONLY on a Wix-signed, verified payment confirmation —
  // clicking a checkout button never grants anything by itself.
  // Must be idempotent (duplicate/concurrent deliveries are possible).
  let userId = purchase.appUserId ?? null;
  if (!userId && buyerEmail) {
    const users = await db.entities.User.filter({ email: buyerEmail });
    userId = users?.[0]?.id ?? null;
  }
  if (!userId) {
    // Anonymous buyer with no matching user account — users are invite-only and
    // cannot be created here. The purchase row keeps the email for reconciliation.
    console.error("payments-webhook: no app user to grant to", { checkoutId, buyerEmail });
    return new Response("OK", { status: 200 });
  }

  const product = resolveProduct(purchase.productId);
  if (!product) {
    console.error("payments-webhook: unknown productId on purchase", { purchaseId: purchase.id, productId: purchase.productId });
    return new Response("OK", { status: 200 });
  }

  if (product.kind === "membership") {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    // Activate the membership (idempotent — same values on duplicate delivery).
    const sub = await getOrCreateSubscription(db, userId);
    await db.entities.Subscription.update(sub.id, {
      plan: PLAN_ID,
      status: "active",
      billing_provider: "base44_payments",
      provider_subscription_id: subscriptionId ?? "",
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString(),
      cancelled_at: ""
    });

    // Grant the 100 monthly credits exactly once per confirmed payment
    // (idempotent, keyed on the purchase id).
    await grantCreditsOnce(db, userId, MONTHLY_CREDITS, "base44_payment", purchase.id, "Leadora membership credits (100/month)");

    // SUBSCRIPTION CONFIRMATION: acknowledgment email immediately after enrollment —
    // renewal terms, start date, next billing date, cancellation instructions, and a
    // manage-subscription link. Recorded in SubscriptionNotice. A mail failure must
    // not block fulfillment.
    const users = await db.entities.User.filter({ id: userId });
    const memberEmail = users?.[0]?.email;
    if (memberEmail) {
      try {
        await sendEnrollmentConfirmation(db, userId, memberEmail, now.toISOString(), periodEnd.toISOString());
      } catch (mailErr) {
        console.error("payments-webhook: enrollment confirmation email failed", mailErr);
      }
    }
  } else if (product.kind === "credit_pack") {
    // One-time credit pack: add exactly the purchased credits, once.
    // (Pack sales are gated to active members at checkout time.)
    // Purchased credits are plain balance — they never expire at cycle boundaries.
    await grantCreditsOnce(db, userId, product.credits, "base44_credit_pack", purchase.id, `Leadora credit pack (${product.credits} credits)`);
  }
  // ===== END APP-SPECIFIC =====

  // Mark paid LAST, so "paid" always implies the grant above completed. The idempotency
  // check at the top short-circuits on this status, so it must only be set after fulfillment.
  // subscriptionId is stored here so SUBSCRIPTION_CANCELED/EXPIRED can resolve this purchase.
  await db.entities.Base44Purchase.update(purchase.id, {
    status: "paid",
    orderId: orderId ?? purchase.orderId ?? null,
    subscriptionId: subscriptionId ?? purchase.subscriptionId ?? null,
    // Persist the buyer email (backfilled from the Wix order for anonymous buyers) so the record
    // always shows who paid, even when create-checkout had no signed-in user.
    buyerEmail: buyerEmail ?? purchase.buyerEmail ?? null,
    paidAt: new Date().toISOString(),
  });

  console.log("payments-webhook: fulfilled purchase", { purchaseId: purchase.id, checkoutId, orderId });
  return new Response("OK", { status: 200 });
}

async function handleSubscriptionEnded(db: any, eventData: any): Promise<Response> {
  // Canceled = ended early; Expired = ran all billing cycles. Both revoke access.
  // Mirrors the order path (actionEvent.body.<entity> first); keep the flat fallbacks since
  // the subscription contract webhook body isn't as tightly documented as order_approved.
  const contract =
    eventData?.actionEvent?.body?.subscriptionContract ??
    eventData?.subscriptionContract ??
    eventData?.entity ??
    null;
  const subscriptionId: string | undefined = contract?.id;

  if (!subscriptionId) {
    console.error("payments-webhook: subscription event missing contract id");
    return new Response("OK", { status: 200 });
  }

  const matches = await db.entities.Base44Purchase.filter({ subscriptionId });
  const purchase = matches?.[0];
  if (!purchase) {
    // The subscriptionId is written on the Purchase by the ORDER_APPROVED handler. If a
    // cancel/expire arrives before (or racing) that approval, no Purchase matches yet —
    // return 500 so Wix retries until the approval has linked it, instead of losing the
    // revoke by acking a not-yet-linkable event.
    console.warn("payments-webhook: no Purchase for subscription yet, asking Wix to retry", { subscriptionId });
    return new Response("Purchase not linkable yet", { status: 500 });
  }

  if (purchase.status === "canceled") {
    return new Response("OK", { status: 200 }); // Idempotent.
  }

  // ===== APP-SPECIFIC =====
  // Revoke: end the Leadora membership tied to this purchase (mirror of the grant).
  // Cancelled memberships keep access until the paid-through period ends
  // (hasActiveMembership checks period_end); a natural expiry has already
  // passed its period, so access ends immediately. Idempotent.
  let userId = purchase.appUserId ?? null;
  if (!userId && purchase.buyerEmail) {
    const users = await db.entities.User.filter({ email: purchase.buyerEmail });
    userId = users?.[0]?.id ?? null;
  }
  if (userId) {
    const subs = await db.entities.Subscription.filter({ user_id: userId });
    const sub = subs?.[0];
    if (sub) {
      await db.entities.Subscription.update(sub.id, {
        status: "cancelled",
        cancelled_at: new Date().toISOString()
      });
    }
  }
  // ===== END APP-SPECIFIC =====

  // Mark canceled LAST, so "canceled" always implies access was actually revoked.
  await db.entities.Base44Purchase.update(purchase.id, {
    status: "canceled",
    canceledAt: new Date().toISOString(),
  });

  console.log("payments-webhook: revoked subscription", { purchaseId: purchase.id, subscriptionId });
  return new Response("OK", { status: 200 });
}

// A confirmed RENEWAL payment for an existing membership subscription. Wix creates renewal
// orders itself (their checkoutId matches no pending purchase this app created), so the
// member is resolved via the subscription id stored on the original approved purchase.
// Grants exactly the 100 monthly credits once (keyed on the renewal order id) and rolls the
// paid period forward one month. Fully idempotent: a duplicate delivery first hits the
// terminal-status short-circuit in handleOrderApproved, and even a concurrent duplicate
// cannot double-grant (grantCreditsOnce is keyed on the renewal order id).
async function handleRenewalOrder(db: any, userId: string, order: any, checkoutId: string, orderId: string | undefined, subscriptionId: string): Promise<Response> {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Roll the paid period forward and clear any soft-cancel from the previous cycle.
  const subs = await db.entities.Subscription.filter({ user_id: userId });
  const sub = subs?.[0];
  if (sub) {
    await db.entities.Subscription.update(sub.id, {
      status: "active",
      cancelled_at: "",
      period_start: now.toISOString(),
      period_end: periodEnd.toISOString()
    });
  }

  // Grant the 100 monthly credits exactly once, keyed on the renewal order id.
  await grantCreditsOnce(db, userId, MONTHLY_CREDITS, "base44_renewal", orderId ?? subscriptionId, "Leadora membership renewal credits (100/month)");

  // Record the renewal as a paid purchase so the payment event is fully audited.
  await db.entities.Base44Purchase.create({
    checkoutSessionId: checkoutId,
    status: "paid",
    appUserId: userId,
    buyerEmail: extractBuyerEmail(order),
    productId: MEMBERSHIP_PRODUCT_ID,
    productName: "Leadora Membership (Renewal)",
    quantity: 1,
    amount: String(order?.priceSummary?.total?.amount ?? "59.00"),
    currency: order?.currency ?? "USD",
    subscriptionId,
    paidAt: now.toISOString()
  });

  console.log("payments-webhook: fulfilled renewal", { userId, checkoutId, orderId, subscriptionId });
  return new Response("OK", { status: 200 });
}