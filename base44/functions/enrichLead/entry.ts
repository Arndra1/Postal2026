import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt, ENRICHMENT_COST, chargeCredits, getOrCreateWallet, hasEnoughCredits, hasActiveMembership, getOrCreateSubscription } from "../../shared/credits.ts";
import { runEnrichment, findRecentSuccess } from "../../shared/providers.ts";
import { logActivity, logCompliance } from "../../shared/logging.ts";
import { unauthorized, badRequest } from "../../shared/roles.ts";

// Enrichment workflow.
// 1. Check credits across both pools (or exempt role).
// 2. Run enrichment.
// 3. Confirm a valid verified result exists.
// 4. Deduct exactly 5 credits (idempotent) only on success — monthly pool first,
//    then pack pool once monthly is depleted.
// 5. Save enrichment result + ledger entry + compliance audit.
// Failed/empty/timeout/error enrichments cost 0 credits.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
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

    // Credit pre-check across both pools (do NOT deduct yet).
    if (!exempt) {
      const wallet = await getOrCreateWallet(base44, user.id);
      if (!hasEnoughCredits(wallet, ENRICHMENT_COST)) {
        return Response.json({
          error: "Insufficient credits. You need at least 5 credits to enrich a lead. Purchase a credit pack to continue.",
          code: "insufficient_credits",
          monthly_balance: wallet.balance || 0,
          pack_balance: wallet.pack_balance || 0
        }, { status: 402 });
      }
    }

    // Idempotency: a duplicate request (retry after a transient 503, or a double-click)
    // for the same inputs within the short dedup window returns the prior successful
    // result WITHOUT re-running providers or re-charging credits.
    const recent = await findRecentSuccess(base44, user.id, inputs);
    if (recent) {
      let bal = null, packBal = null;
      if (!exempt) { const w = await getOrCreateWallet(base44, user.id); bal = w.balance; packBal = w.pack_balance || 0; }
      return Response.json({
        status: "success",
        results: recent.results || {},
        data_sources: recent.data_sources || [],
        duration_ms: 0,
        credits_charged: 0,
        monthly_balance: bal,
        pack_balance: packBal,
        enrichment_id: recent.id,
        error: "",
        duplicate: true,
      });
    }

    // Run enrichment provider.
    const providerResult = await runEnrichment(base44, inputs);

    // Only charge on a verified success.
    let creditsCharged = 0;
    let balanceAfter = null;
    let packBalanceAfter = null;
    let chargePool = "";
    let enrichmentRecord = null;

    // CREDIT LOGIC — single flat 5-credit charge per enrichment attempt.
    // The charge is NOT per-provider-call: the waterfall (providers.ts) may
    // call both Tracerfy and PDL, but only ONE 5-credit charge is applied
    // when the final merged result contains a verified_email or verified_phone.
    // - Tracerfy returns both email+phone → PDL skipped → 5 credits total.
    // - Tracerfy returns phone only → PDL runs and returns email → 5 credits
    //   total (covers both providers — no additional charge for PDL).
    // - PDL runs to fill linkedin/job_title but returns no new email/phone
    //   → still 5 credits (charge is for the enrichment attempt).
    // - Neither provider returns a verified email or phone → 0 credits.
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
        provider_breakdown: providerResult.provider_breakdown || [],
        error_message: ""
      });

      if (!exempt) {
        const charge = await chargeCredits(base44, user.id, ENRICHMENT_COST, "enrichment", enrichmentRecord.id, "Enrichment charge");
        if (charge.ok) {
          creditsCharged = ENRICHMENT_COST;
          balanceAfter = charge.balance;
          packBalanceAfter = charge.pack_balance;
          chargePool = charge.pool;
          await base44.asServiceRole.entities.Enrichment.update(enrichmentRecord.id, { credits_charged: ENRICHMENT_COST });
          // Compliance audit: log which pool the deduction came from.
          await logCompliance(base44, "credit_deducted", user.id, "", `5 credits deducted for enrichment (pool: ${charge.pool})`, {
            enrichment_id: enrichmentRecord.id,
            lead_id: leadId,
            monthly_deduct: charge.monthly_deduct,
            pack_deduct: charge.pack_deduct,
            pool: charge.pool,
            monthly_balance_after: charge.balance,
            pack_balance_after: charge.pack_balance
          });
        }
      } else {
        creditsCharged = 0;
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
        packBalanceAfter = wallet.pack_balance || 0;
      }

      // Update lead if provided — SECURITY: ownership is verified first.
      if (leadId) {
        try {
          const lead = await base44.entities.Lead.get(leadId);
          if (lead && (lead.user_id === user.id || exempt)) {
            await base44.entities.Lead.update(leadId, {
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
          }
        } catch (_e) { /* lead missing or not owned by caller — no update */ }
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
        provider_breakdown: providerResult.provider_breakdown || [],
        error_message: providerResult.error || ""
      });
      if (!exempt) {
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
        packBalanceAfter = wallet.pack_balance || 0;
      }
    }

    await logActivity(base44, user, "enrichment_" + providerResult.status, "Lead enrichment " + providerResult.status, { lead_id: leadId, credits_charged: creditsCharged, pool: chargePool });

    return Response.json({
      status: providerResult.status,
      results: providerResult.results,
      data_sources: providerResult.data_sources,
      duration_ms: providerResult.duration_ms,
      credits_charged: creditsCharged,
      monthly_balance: balanceAfter,
      pack_balance: packBalanceAfter,
      enrichment_id: enrichmentRecord ? enrichmentRecord.id : null,
      error: providerResult.error || ""
    });
  } catch (error) {
    return Response.json({ error: "Enrichment failed. Please try again.", code: "internal_error" }, { status: 500 });
  }
}