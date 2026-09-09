import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden, badRequest } from "../../shared/roles.ts";
import { grantCredits } from "../../shared/credits.ts";
import { logActivity, logCompliance } from "../../shared/logging.ts";

// Admin-only: grant (gift) credits to any user by email or ID.
// Wraps the existing grantCredits helper with caller authorization, target-user
// resolution, and audit logging. Regular users receive 403 Forbidden.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    // Auth boundary: auth.me() throws on missing/invalid tokens — without
    // this guard an unauthenticated request falls through to the outer
    // catch and returns a misleading 500 instead of a clean 401.
    let user;
    try {
      user = await base44.auth.me();
    } catch (_authErr) {
      return unauthorized();
    }
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const identifier = String(body.userIdentifier || "").trim();
    const amount = parseInt(body.amount, 10);
    const pool = body.pool === "pack" ? "pack" : "monthly";

    if (!identifier) return badRequest("A user email or ID is required.");
    if (!Number.isInteger(amount) || amount <= 0) return badRequest("Amount must be a positive whole number.");
    if (amount > 10000) return badRequest("Amount is unreasonably large (max 10000).");

    // Resolve target user by ID (hex, 20+ chars) or by email.
    let targetUser = null;
    if (identifier.length >= 20 && /^[a-f0-9]+$/i.test(identifier)) {
      try { targetUser = await base44.asServiceRole.entities.User.get(identifier); } catch (_e) { targetUser = null; }
    }
    if (!targetUser) {
      const matches = await base44.asServiceRole.entities.User.filter({ email: identifier });
      targetUser = (matches && matches[0]) || null;
    }
    if (!targetUser) return badRequest("No user found with that email or ID.");

    const requestId = "gift_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    const description = `Admin gift: ${amount} credits — ${user.email || user.id}`;

    const newBalance = await grantCredits(
      base44, targetUser.id, amount, "grant", "admin_gift", requestId, description, pool
    );

    await logCompliance(base44, "admin_compliance_review", targetUser.id, user.id,
      description, { amount, pool, target_email: targetUser.email, admin_email: user.email, new_balance: newBalance });
    await logActivity(base44, user, "admin_grant_credits",
      `Granted ${amount} credits to ${targetUser.email || targetUser.id}`, { target_user_id: targetUser.id, amount, pool, new_balance: newBalance });

    return Response.json({
      ok: true,
      target_email: targetUser.email || targetUser.id,
      amount,
      pool,
      new_balance: newBalance
    });
  } catch (error) {
    return Response.json({ error: "Failed to grant credits." }, { status: 500 });
  }
}