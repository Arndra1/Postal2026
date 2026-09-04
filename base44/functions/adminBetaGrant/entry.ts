import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden, badRequest } from "../../shared/roles.ts";
import { grantCredits } from "../../shared/credits.ts";
import { logActivity } from "../../shared/logging.ts";

// Beta access management — admin/owner only.
// Actions:
//   "grant"          → activate beta access + grant test credits (default 50)
//   "revoke"         → revoke beta access
//   "grant_credits"  → add more test credits to an existing beta user
//
// Beta credits are a one-time admin grant. They do NOT auto-renew and do NOT
// create a free plan. Normal customer pricing is untouched.
const DEFAULT_BETA_CREDITS = 50;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const targetUserId = body.user_id;
    const action = body.action;
    if (!targetUserId) return badRequest("user_id required");
    if (!action) return badRequest("action required");

    // Look up target user for email display.
    const users = await base44.asServiceRole.entities.User.list();
    const target = users.find(u => u.id === targetUserId);
    const targetEmail = target?.email || "";

    const existing = await base44.asServiceRole.entities.BetaUser.filter({ user_id: targetUserId });
    const betaRec = existing[0];

    if (action === "grant") {
      const credits = typeof body.credits === "number" ? body.credits : DEFAULT_BETA_CREDITS;
      if (betaRec) {
        await base44.asServiceRole.entities.BetaUser.update(betaRec.id, {
          status: "active",
          email: targetEmail,
          granted_at: new Date().toISOString(),
        });
        if (credits > 0) {
          await grantCredits(base44, targetUserId, credits, "grant", "beta", betaRec.id, "Beta testing credits");
          await base44.asServiceRole.entities.BetaUser.update(betaRec.id, {
            beta_credits_granted: (betaRec.beta_credits_granted || 0) + credits,
          });
        }
        await logActivity(base44, user, "beta_access_granted", "Granted beta access to " + targetEmail, { target_user_id: targetUserId, credits });
        return Response.json({ ok: true });
      }
      const created = await base44.asServiceRole.entities.BetaUser.create({
        user_id: targetUserId,
        email: targetEmail,
        status: "active",
        beta_credits_granted: credits,
        onboarded: false,
        granted_at: new Date().toISOString(),
        notes: "",
      });
      if (credits > 0) {
        await grantCredits(base44, targetUserId, credits, "grant", "beta", created.id, "Beta testing credits");
      }
      await logActivity(base44, user, "beta_access_granted", "Granted beta access to " + targetEmail, { target_user_id: targetUserId, credits });
      return Response.json({ ok: true });
    }

    if (action === "revoke") {
      if (!betaRec) return badRequest("User is not a beta user.");
      await base44.asServiceRole.entities.BetaUser.update(betaRec.id, { status: "revoked" });
      await logActivity(base44, user, "beta_access_revoked", "Revoked beta access from " + targetEmail, { target_user_id: targetUserId });
      return Response.json({ ok: true });
    }

    if (action === "grant_credits") {
      const credits = typeof body.credits === "number" ? body.credits : DEFAULT_BETA_CREDITS;
      if (!betaRec || betaRec.status !== "active") return badRequest("Grant beta access first.");
      await grantCredits(base44, targetUserId, credits, "grant", "beta", betaRec.id, "Additional beta testing credits");
      await base44.asServiceRole.entities.BetaUser.update(betaRec.id, {
        beta_credits_granted: (betaRec.beta_credits_granted || 0) + credits,
      });
      await logActivity(base44, user, "beta_credits_granted", "Granted " + credits + " beta credits to " + targetEmail, { target_user_id: targetUserId, credits });
      return Response.json({ ok: true });
    }

    return badRequest("Unknown action.");
  } catch (error) {
    return Response.json({ error: "Beta management failed." }, { status: 500 });
  }
}