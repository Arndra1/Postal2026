import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt, getOrCreateWallet, getOrCreateSubscription } from "../../shared/credits.ts";

// One-time owner bootstrap. Grants the calling user the "owner" role if no owner
// exists yet. Owner access is determined by the role field on the user record —
// never by a hard-coded email in frontend code.
//
// Note: the platform protects the app owner account (the builder) from role
// changes. The builder is already "admin", which is exempt (permanent free
// access, no credit deductions), so they satisfy every owner requirement.
// For other admins, this promotes them to "owner".
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const users = await base44.asServiceRole.entities.User.list();
    const owners = users.filter(u => u.role === "owner");

    // Ensure owner has a wallet + active subscription (permanent, no charge).
    await getOrCreateWallet(base44, user.id);
    const sub = await getOrCreateSubscription(base44, user.id);

    if (owners.length > 0) {
      const alreadyOwner = owners.some(o => o.id === user.id);
      return Response.json({ ok: true, message: alreadyOwner ? "You are already the owner." : "An owner already exists.", alreadyOwner });
    }

    // Try to promote the calling user to owner.
    try {
      const updated = await base44.asServiceRole.entities.User.update(user.id, { role: "owner" });
      await base44.asServiceRole.entities.Subscription.update(sub.id, {
        status: "active", plan: "ringbellz_pro", billing_provider: "owner",
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      });
      return Response.json({ ok: true, message: "You have been granted the owner role with permanent free access.", user: updated });
    } catch (_promoteErr) {
      // Platform blocks role changes on the app owner account. The builder is
      // already admin (exempt), so they have permanent access regardless.
      const isAlreadyExempt = isExempt(user.role);
      if (isAlreadyExempt) {
        await base44.asServiceRole.entities.Subscription.update(sub.id, {
          status: "active", plan: "ringbellz_pro", billing_provider: "owner",
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        });
        return Response.json({ ok: true, message: "You are the app owner with permanent free access (admin role).", alreadyOwner: true });
      }
      return Response.json({ error: "Could not grant owner role to this account." }, { status: 403 });
    }
  } catch (error) {
    return Response.json({ error: "Owner setup failed." }, { status: 500 });
  }
}