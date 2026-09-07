import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { OWNER_EMAIL } from "../../shared/emails.ts";
import { getOrCreateWallet, getOrCreateSubscription, PLAN_ID } from "../../shared/credits.ts";

// Auto-provisions the private owner account whenever it signs up or logs in:
// grants the protected database "owner" role, a wallet, and a permanent
// active subscription (no charge, no credit deductions — owner is exempt).
// The email only selects WHICH account gets the role; all privileges are
// enforced by the database owner role, never by the email itself.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (caller.role !== "admin" && caller.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (_e) { return Response.json({ error: "Invalid request body." }, { status: 400 }); }

    const userId = String(body.user_id || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    if (!userId || !email) return Response.json({ error: "Missing user_id or email." }, { status: 400 });
    if (email !== OWNER_EMAIL) return Response.json({ ok: true, ignored: true });

    const user = await base44.asServiceRole.entities.User.get(userId);
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    if ((user.email || "").toLowerCase() !== OWNER_EMAIL) {
      return Response.json({ error: "Account does not match the designated owner." }, { status: 403 });
    }

    await getOrCreateWallet(base44, userId);
    const sub = await getOrCreateSubscription(base44, userId);

    if (user.role !== "owner") {
      await base44.asServiceRole.entities.User.update(userId, { role: "owner" });
    }
    if (sub.status !== "active") {
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "active",
        plan: PLAN_ID,
        billing_provider: "owner",
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return Response.json({ ok: true, provisioned: true, role: "owner" });
  } catch (error) {
    return Response.json({ error: "Owner provisioning failed." }, { status: 500 });
  }
}