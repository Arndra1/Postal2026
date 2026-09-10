import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, isOwner, unauthorized, forbidden, badRequest } from "../../shared/roles.ts";
import { logActivity, logCompliance } from "../../shared/logging.ts";
import { getOrCreateSubscription, resetMonthlyCreditsOnce, MONTHLY_CREDITS } from "../../shared/credits.ts";

// Admin/owner user management: change role or disable/enable an account.
// Only owner can grant admin/owner roles. Admins can manage staff/user roles.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const targetUserId = body.user_id;
    const action = body.action; // "set_role" | "set_disabled"
    if (!targetUserId) return badRequest("user_id required");

    if (action === "set_role") {
      const newRole = body.role;
      if (!["user", "staff", "admin", "owner"].includes(newRole)) {
        return badRequest("Invalid role.");
      }
      // Only owner can assign admin or owner roles.
      if ((newRole === "admin" || newRole === "owner") && !isOwner(user.role)) {
        return forbidden();
      }
      // Prevent removing the last owner.
      if (newRole !== "owner") {
        const users = await base44.asServiceRole.entities.User.list();
        const target = users.find(u => u.id === targetUserId);
        if (target && target.role === "owner") {
          const owners = users.filter(u => u.role === "owner");
          if (owners.length <= 1) {
            return badRequest("Cannot remove the last owner.");
          }
        }
      }
      const updated = await base44.asServiceRole.entities.User.update(targetUserId, { role: newRole });
      await logActivity(base44, user, "role_changed", "Changed user role to " + newRole, { target_user_id: targetUserId, new_role: newRole });
      return Response.json({ ok: true, user: updated });
    }

    if (action === "set_disabled") {
      const disabled = !!body.disabled;
      const updated = await base44.asServiceRole.entities.User.update(targetUserId, { disabled });
      await logActivity(base44, user, disabled ? "account_disabled" : "account_enabled", disabled ? "Account disabled" : "Account enabled", { target_user_id: targetUserId });
      await logCompliance(base44, disabled ? "account_suspended" : "account_reinstated", targetUserId, user.id, disabled ? "Account suspended by admin" : "Account reinstated by admin", { target_user_id: targetUserId });
      return Response.json({ ok: true, user: updated });
    }

    // Admin-grant a comped membership: full access + 100 monthly credits,
    // no billing required. Used to convert former beta users or designate
    // specific accounts for free access. Admin-only, not self-serve.
    if (action === "grant_comp") {
      const sub = await getOrCreateSubscription(base44, targetUserId);
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "comped",
        billing_provider: "comped",
        period_start: new Date().toISOString(),
      });
      // Grant the standard 100 monthly credits (same reset/no-rollover behavior
      // as a paid subscriber). Idempotent via a unique reference id.
      await resetMonthlyCreditsOnce(
        base44, targetUserId, MONTHLY_CREDITS,
        "admin_comp", `comp:${targetUserId}:${Date.now()}`,
        "Admin-granted comped membership — 100 monthly credits"
      );
      await logActivity(base44, user, "comp_granted", "Admin granted comped membership + 100 monthly credits", { target_user_id: targetUserId });
      await logCompliance(base44, "account_reinstated", targetUserId, user.id, "Admin granted comped membership", { target_user_id: targetUserId });
      return Response.json({ ok: true });
    }

    if (action === "revoke_comp") {
      const sub = await getOrCreateSubscription(base44, targetUserId);
      if (sub.status === "comped") {
        await base44.asServiceRole.entities.Subscription.update(sub.id, { status: "none" });
        await logActivity(base44, user, "comp_revoked", "Admin revoked comped membership", { target_user_id: targetUserId });
        await logCompliance(base44, "account_suspended", targetUserId, user.id, "Admin revoked comped membership", { target_user_id: targetUserId });
      }
      return Response.json({ ok: true });
    }

    return badRequest("Unknown action.");
  } catch (error) {
    return Response.json({ error: "User update failed." }, { status: 500 });
  }
}