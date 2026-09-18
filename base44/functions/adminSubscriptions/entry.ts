import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden } from "../../shared/roles.ts";
import { resolveProduct, MEMBERSHIP_PRODUCT_ID } from "../../shared/products.ts";

// Admin subscription reporting — READ ONLY.
// Joins the existing Subscription records with User identity (name/email) and the paid
// membership purchases the payment webhook already writes. Creates no new data store and
// never mutates anything, so the live checkout / payment / subscription flow is untouched.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const db = base44.asServiceRole;
    const [subscriptions, users, purchases] = await Promise.all([
      db.entities.Subscription.list(),
      db.entities.User.list(),
      db.entities.Base44Purchase.list(),
    ]);

    const product = resolveProduct(MEMBERSHIP_PRODUCT_ID);
    const price = Number(product?.price ?? 59);
    const priceLabel = `$${price.toFixed(2)}`;

    const usersById = new Map(users.map((u) => [u.id, u]));

    // Latest paid membership payment per buyer (initial purchase + renewals).
    const lastPaymentByUser = new Map();
    let totalRevenue = 0;
    for (const p of purchases) {
      if (p.productId !== MEMBERSHIP_PRODUCT_ID || p.status !== "paid") continue;
      const amount = Number(p.amount ?? 0);
      if (Number.isFinite(amount)) totalRevenue += amount;
      const key = p.appUserId || p.buyerEmail;
      if (!key) continue;
      const at = p.paidAt || p.created_date;
      if (!at) continue;
      const prev = lastPaymentByUser.get(key);
      if (!prev || new Date(at) > new Date(prev)) lastPaymentByUser.set(key, at);
    }

    // Owner access and comped accounts are real accounts but not paying subscribers —
    // they are listed (flagged) and excluded from every revenue/count metric.
    const isNonPaying = (s) =>
      s.billing_provider === "owner" || s.billing_provider === "comped" || s.status === "comped";

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let totalActive = 0, newThisMonth = 0, canceled = 0, pastDue = 0;

    const rows = subscriptions.map((s) => {
      const nonPaying = isNonPaying(s);
      const u = usersById.get(s.user_id);
      const status = s.status || "none";
      const isActive = status === "active" || status === "trialing";

      if (!nonPaying) {
        if (isActive) totalActive += 1;
        if (status === "cancelled") canceled += 1;
        if (status === "past_due") pastDue += 1;
        const created = s.created_date ? new Date(s.created_date) : null;
        if (created && created >= monthStart) newThisMonth += 1;
      }

      const lastPayment =
        lastPaymentByUser.get(s.user_id) ||
        (u?.email ? lastPaymentByUser.get(u.email) : null) ||
        null;

      // A next billing date only makes sense while the subscription is still billing.
      const nextBilling = isActive || status === "past_due" ? s.period_end || null : null;

      return {
        id: s.id,
        user_id: s.user_id,
        name: u?.full_name || "",
        email: u?.email || "",
        plan: s.plan || "",
        price: nonPaying ? "—" : priceLabel,
        status,
        startDate: s.period_start || s.created_date || null,
        nextBillingDate: nextBilling,
        lastPaymentDate: lastPayment,
        nonPaying,
      };
    });

    rows.sort((a, b) =>
      (a.name || a.email || "").localeCompare(b.name || b.email || "")
    );

    return Response.json({
      metrics: {
        totalActive,
        newThisMonth,
        canceled,
        pastDue,
        mrr: totalActive * price,
        totalRevenue,
      },
      price: priceLabel,
      rows,
    });
  } catch (error) {
    console.error("adminSubscriptions failed", error);
    return Response.json({ error: "Failed to load subscription data." }, { status: 500 });
  }
}