import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { OWNER_EMAIL } from "../../shared/emails.ts";
import { getOrCreateWallet, getOrCreateSubscription } from "../../shared/credits.ts";

// Owner provisioning. Invoked by the "Owner Bootstrap" workflow on the
// signup/login of the account matching the private owner address. Grants that
// account the protected database "owner" role plus permanent access
// (no subscription required, no credit deductions). Idempotent.
// The email only selects WHICH account gets bootstrapped — all owner
// privileges are enforced by the database role, never by the email itself.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    let body = {};
    try { body = await req.json(); } catch (_e) { /* empty args are invalid but handled below */ }
    const userId = String((body && body.user_id) || "").trim();
    const email = String((body && body.email) || "").trim().toLowerCase();

    if (!userId) return Response.json({ error: "Missing user_id." }, { status: 400 });
    if (email !== OWNER_EMAIL) {
      return Response.json({ ok: true, skipped: true, message: "Not the owner account." });
    }

    const matches = await base44.asServiceRole.entities.User.filter({ id: userId });
    const user = matches.length > 0 ? matches[0] : null;
    if (!user) return Response.json({ error: "User not found." }, { status: 404 });
    if ((user.email || "").toLowerCase() !== OWNER_EMAIL) {
      return Response.json({ ok: true, skipped: true, message: "Email does not match the owner account." });
    }

    if (user.role !== "owner") {
      await base44.asServiceRole.entities.User.update(user.id, { role: "owner" });
    }

    // Permanent access: wallet + active subscription that is never charged.
    await getOrCreateWallet(base44, user.id);
    const sub = await getOrCreateSubscription(base44, user.id);
    if (sub.status !== "active") {
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "active",
        plan: "leadpulse_pro",
        billing_provider: "owner",
        period_start: sub.period_start || new Date().toISOString(),
        period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return Response.json({ ok: true, message: "Owner account provisioned.", role: "owner" });
  } catch (error) {
    return Response.json({ error: "Owner provisioning failed." }, { status: 500 });
  }
}