import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt, ENRICHMENT_COST, chargeCredits, getOrCreateWallet, hasActiveMembership, getOrCreateSubscription } from "../../shared/credits.ts";
import { runEnrichment } from "../../shared/providers.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized, badRequest } from "../../shared/roles.ts";

// Enrichment workflow.
// 1. Check credits (or exempt role).
// 2. Run enrichment.
// 3. Confirm a valid verified result exists.
// 4. Deduct exactly 5 credits (idempotent) only on success.
// 5. Save enrichment result + ledger entry.
// Failed/empty/timeout/error enrichments cost 0 credits.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const inputs = body.inputs || {};
    const leadId = body.lead_id || "";

    const exempt = isExempt(user.role);

    // Membership gate (owner/admin exempt).
    if (!exempt) {
      const sub = await getOrCreateSubscription(base44, user.id);
      if (!hasActiveMembership(sub)) {
        return Response.json({ error: "No active membership. Subscribe to enrich leads.", code: "no_membership" }, { status: 402 });
      }
    }

    // Credit pre-check (do NOT deduct yet).
    if (!exempt) {
      const wallet = await getOrCreateWallet(base44, user.id);
      if ((wallet.balance || 0) < ENRICHMENT_COST) {
        return Response.json({ error: "Insufficient credits. You need at least 5 credits to enrich a lead.", code: "insufficient_credits" }, { status: 402 });
      }
    }

    // Run enrichment provider.
    const providerResult = await runEnrichment(inputs);

    // Only charge on a verified success.
    let creditsCharged = 0;
    let balanceAfter = null;
    let enrichmentRecord = null;

    if (providerResult.status === "success") {
      // Save enrichment record first to get an id for idempotent charging.
      enrichmentRecord = await base44.asServiceRole.entities.Enrichment.create({
        user_id: user.id,
        lead_id: leadId,
        provider: (providerResult.data_sources[0]) || "",
        status: "success",
        inputs,
        results: providerResult.results,
        credits_charged: 0,
        duration_ms: providerResult.duration_ms,
        data_sources: providerResult.data_sources,
        error_message: ""
      });

      if (!exempt) {
        const charge = await chargeCredits(base44, user.id, ENRICHMENT_COST, "enrichment", enrichmentRecord.id, "Enrichment charge");
        if (charge.ok) {
          creditsCharged = ENRICHMENT_COST;
          balanceAfter = charge.balance;
          await base44.asServiceRole.entities.Enrichment.update(enrichmentRecord.id, { credits_charged: ENRICHMENT_COST });
        }
      } else {
        creditsCharged = 0;
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
      }

      // Update lead if provided.
      if (leadId) {
        try {
          await base44.asServiceRole.entities.Lead.update(leadId, {
            email: providerResult.results.verified_email,
            phone: providerResult.results.verified_phone,
            website: providerResult.results.website,
            linkedin: providerResult.results.linkedin,
            address: providerResult.results.address,
            job_title: providerResult.results.job_title,
            contact_status: "verified",
            enrichment_status: "enriched",
            confidence: providerResult.results.confidence
          });
        } catch (_e) { /* lead may not exist */ }
      }
    } else {
      // Failed/empty/timeout — log it, charge 0.
      enrichmentRecord = await base44.asServiceRole.entities.Enrichment.create({
        user_id: user.id,
        lead_id: leadId,
        provider: (providerResult.data_sources[0]) || "",
        status: providerResult.status,
        inputs,
        results: {},
        credits_charged: 0,
        duration_ms: providerResult.duration_ms,
        data_sources: providerResult.data_sources,
        error_message: providerResult.error || ""
      });
      if (!exempt) {
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
      }
    }

    await logActivity(base44, user, "enrichment_" + providerResult.status, "Lead enrichment " + providerResult.status, { lead_id: leadId, credits_charged: creditsCharged });

    return Response.json({
      status: providerResult.status,
      results: providerResult.results,
      data_sources: providerResult.data_sources,
      duration_ms: providerResult.duration_ms,
      credits_charged: creditsCharged,
      balance_after: balanceAfter,
      enrichment_id: enrichmentRecord ? enrichmentRecord.id : null,
      error: providerResult.error || ""
    });
  } catch (error) {
    return Response.json({ error: "Enrichment failed. Please try again.", code: "internal_error" }, { status: 500 });
  }
}