import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { TERMS_VERSION } from "../../shared/terms.ts";
import { logCompliance } from "../../shared/logging.ts";

// Records the calling user's acceptance of the current Terms of Use version.
// Stores: user id, agreement version, date and time accepted. Idempotent.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return Response.json({ error: "Unauthorized" }, { status: 401 }); }
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const existing = await base44.asServiceRole.entities.TermsAcceptance.filter({
      user_id: user.id,
      version: TERMS_VERSION
    });
    if (existing.length > 0) {
      return Response.json({ ok: true, alreadyAccepted: true, version: TERMS_VERSION });
    }

    const acceptedAt = new Date().toISOString();
    await base44.asServiceRole.entities.TermsAcceptance.create({
      user_id: user.id,
      version: TERMS_VERSION,
      accepted_at: acceptedAt
    });
    await logCompliance(base44, "terms_accepted", user.id, "", "User accepted Terms of Use v" + TERMS_VERSION, { version: TERMS_VERSION });

    return Response.json({ ok: true, version: TERMS_VERSION, accepted_at: acceptedAt });
  } catch (error) {
    return Response.json({ error: "Could not record acceptance." }, { status: 500 });
  }
}