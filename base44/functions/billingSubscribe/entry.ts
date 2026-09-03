import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt } from "../../shared/credits.ts";
import { unauthorized } from "../../shared/roles.ts";

// Membership checkout entry point.
// SECURITY: this endpoint NEVER grants a membership or credits by itself.
// Membership + the 100 monthly credits are provisioned ONLY after the payment
// provider confirms a successful payment (Base44 Payments event, handled
// server-side). Clicking Subscribe must never be what activates a membership.
// Until the payment provider is connected, checkout is unavailable.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    if (isExempt(user.role)) {
      return Response.json({ ok: true, message: "Owner/admin accounts have permanent access.", exempt: true });
    }

    return Response.json(
      { error: "Online checkout isn't available yet. Memberships activate automatically after a confirmed payment.", code: "payments_not_configured" },
      { status: 503 }
    );
  } catch (error) {
    return Response.json({ error: "Subscription activation failed." }, { status: 500 });
  }
}