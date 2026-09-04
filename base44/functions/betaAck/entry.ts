import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { unauthorized, badRequest } from "../../shared/roles.ts";

// Beta onboarding acknowledgment.
// Marks the current user's BetaUser record as onboarded=true.
// Validates that the user has active beta access before flipping the flag.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    const existing = await base44.asServiceRole.entities.BetaUser.filter({ user_id: user.id });
    const betaRec = existing[0];
    if (!betaRec) return badRequest("You do not have beta access.");
    if (betaRec.status !== "active") return badRequest("Your beta access is not active.");

    if (!betaRec.onboarded) {
      await base44.asServiceRole.entities.BetaUser.update(betaRec.id, { onboarded: true });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: "Failed to update onboarding status." }, { status: 500 });
  }
}