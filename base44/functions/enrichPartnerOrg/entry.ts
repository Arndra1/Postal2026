import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isExempt, ENRICHMENT_COST, chargeCredits, getOrCreateWallet, hasEnoughCredits, hasActiveMembership, getOrCreateSubscription } from "../../shared/credits.ts";
import { runEnrichment } from "../../shared/providers.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Partner-organization contact enrichment.
//
// Runs the SAME provider waterfall the lead enrichment uses (Geoapify address
// cleanup, domain resolution, contact providers, phone validation) against a
// saved PartnerOrganization, then writes back only the contact fields.
// Public-record fields (IRS name, EIN, address) are never overwritten.
//
// Credit logic matches lead enrichment: a single flat 5-credit charge only when
// the run returns a verified email or phone. 0 credits otherwise.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }
    const partnerId = body.partner_org_id || "";
    if (!partnerId) {
      return Response.json({ error: "No organization selected.", code: "bad_request" }, { status: 400 });
    }

    let org = null;
    try { org = await base44.entities.PartnerOrganization.get(partnerId); } catch (_e) { org = null; }
    const exempt = isExempt(user.role);
    if (!org || (org.user_id !== user.id && !exempt)) {
      return Response.json({ error: "Organization not found.", code: "not_found" }, { status: 404 });
    }

    // Membership gate (owner/admin exempt).
    if (!exempt) {
      const sub = await getOrCreateSubscription(base44, user.id);
      if (!hasActiveMembership(sub)) {
        return Response.json({ error: "No active membership. Subscribe to enrich organizations.", code: "no_membership" }, { status: 402 });
      }
      const wallet = await getOrCreateWallet(base44, user.id);
      if (!hasEnoughCredits(wallet, ENRICHMENT_COST)) {
        return Response.json({
          error: "Insufficient credits. You need at least 5 credits to enrich an organization.",
          code: "insufficient_credits",
          monthly_balance: wallet.balance || 0,
          pack_balance: wallet.pack_balance || 0,
        }, { status: 402 });
      }
    }

    const inputs = {
      business_name: org.org_name || "",
      person_name: org.leader_name || "",
      city: org.city || "",
      state: org.state || "",
      zip: org.zip || "",
      address: org.address || "",
      website: org.website || "",
    };

    const providerResult = await runEnrichment(base44, inputs);

    let creditsCharged = 0;
    let balanceAfter = null;
    let packBalanceAfter = null;

    if (providerResult.status === "success") {
      const record = await base44.asServiceRole.entities.Enrichment.create({
        user_id: user.id,
        lead_id: "",
        provider: (providerResult.data_sources[0]) || "",
        status: "success",
        inputs,
        results: providerResult.results,
        credits_charged: 0,
        duration_ms: providerResult.duration_ms,
        data_sources: providerResult.data_sources,
        provider_breakdown: providerResult.provider_breakdown || [],
        error_message: "",
      });

      if (!exempt) {
        const charge = await chargeCredits(base44, user.id, ENRICHMENT_COST, "enrichment", record.id, "Organization enrichment charge");
        if (charge.ok) {
          creditsCharged = ENRICHMENT_COST;
          balanceAfter = charge.balance;
          packBalanceAfter = charge.pack_balance;
          await base44.asServiceRole.entities.Enrichment.update(record.id, { credits_charged: ENRICHMENT_COST });
        }
      } else {
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
        packBalanceAfter = wallet.pack_balance || 0;
      }

      const found = providerResult.results || {};
      const patch = {};
      if (found.verified_email) patch.email = found.verified_email;
      if (found.verified_phone) patch.phone = found.verified_phone;
      if (found.website && !org.website) patch.website = found.website;
      if (found.address && !org.address) patch.address = found.address;
      patch.contact_status = (found.verified_email || found.verified_phone) ? "verified" : "not_found";
      patch.enrichment_status = "enriched";
      await base44.entities.PartnerOrganization.update(partnerId, patch);
    } else {
      await base44.asServiceRole.entities.Enrichment.create({
        user_id: user.id,
        lead_id: "",
        provider: (providerResult.data_sources[0]) || "",
        status: providerResult.status,
        inputs,
        results: {},
        credits_charged: 0,
        duration_ms: providerResult.duration_ms,
        data_sources: providerResult.data_sources,
        provider_breakdown: providerResult.provider_breakdown || [],
        error_message: providerResult.error || "",
      });

      const patch = { enrichment_status: "failed" };
      if (providerResult.status === "partial") {
        const found = providerResult.results || {};
        if (found.website && !org.website) patch.website = found.website;
        patch.enrichment_status = "enriched";
      }
      await base44.entities.PartnerOrganization.update(partnerId, patch);

      if (!exempt) {
        const wallet = await getOrCreateWallet(base44, user.id);
        balanceAfter = wallet.balance;
        packBalanceAfter = wallet.pack_balance || 0;
      }
    }

    await logActivity(base44, user, "partner_org_enrichment_" + providerResult.status, "Organization enrichment " + providerResult.status, {
      partner_org_id: partnerId, credits_charged: creditsCharged,
    });

    return Response.json({
      status: providerResult.status,
      results: providerResult.results,
      data_sources: providerResult.data_sources,
      credits_charged: creditsCharged,
      monthly_balance: balanceAfter,
      pack_balance: packBalanceAfter,
      error: providerResult.error || "",
    });
  } catch (error) {
    return Response.json({ error: "Enrichment failed. Please try again.", code: "internal_error" }, { status: 500 });
  }
}