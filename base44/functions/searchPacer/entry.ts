import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { authenticate, searchParty, isConfigured } from "../../shared/providers/pacer.ts";
import {
  chargeCredits, getOrCreateWallet, hasEnoughCredits,
  hasActiveMembership, getOrCreateSubscription, isExempt
} from "../../shared/credits.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized, badRequest } from "../../shared/roles.ts";

// PACER PCL party search. Additive feature — does NOT touch the enrichment
// pipeline or any existing public-record source.
//
// Flow: auth user -> membership gate -> credit pre-check (>=1) ->
//   PACER CSO auth -> PCL party search -> charge exactly 1 credit ONLY if
//   PACER returned a real response (found or not found). Charge 0 if auth/
//   network fails before reaching PACER.
//
// NO admin/owner exemption on the CREDIT charge — every user including admin
// pays 1 credit, because each PACER search has a real per-search cost.
// (Membership gate still exempts admin/owner, mirroring enrichLead, to avoid
//  locking the owner out when their subscription record is "none".)
const PACER_COST = 1;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return unauthorized(); }
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const firstName = (body.first_name || "").trim();
    const lastName = (body.last_name || "").trim();
    if (!firstName || !lastName) {
      return badRequest("Both first and last name are required.");
    }

    const inputs = { first_name: firstName, last_name: lastName };

    // Membership gate. Admin/owner exempt (mirrors enrichLead); the CREDIT
    // charge below is NOT exempt for anyone.
    const exempt = isExempt(user.role);
    if (!exempt) {
      const sub = await getOrCreateSubscription(base44, user.id);
      if (!hasActiveMembership(sub)) {
        return Response.json({ error: "No active membership. Subscribe to use PACER search.", code: "no_membership" }, { status: 402 });
      }
    }

    // Credit pre-check (>=1). NO exemption — every user must have >=1 credit.
    const wallet = await getOrCreateWallet(base44, user.id);
    if (!hasEnoughCredits(wallet, PACER_COST)) {
      return Response.json({
        error: "Insufficient credits. PACER search costs 1 credit. Purchase a credit pack to continue.",
        code: "insufficient_credits",
        monthly_balance: wallet.balance || 0,
        pack_balance: wallet.pack_balance || 0
      }, { status: 402 });
    }

    if (!isConfigured()) {
      await base44.asServiceRole.entities.PacerSearch.create({
        user_id: user.id, inputs, status: "failed", results: {},
        credits_charged: 0, cost: 0, error: "PACER credentials not configured", duration_ms: 0
      });
      return Response.json({ status: "failed", error: "PACER is not configured. Please contact support.", credits_charged: 0 }, { status: 503 });
    }

    const started = Date.now();

    // 1. PACER CSO auth. Failure here = 0 credits (never reached PACER search).
    const authResult = await authenticate();
    if (!authResult.ok) {
      const dur = Date.now() - started;
      await base44.asServiceRole.entities.PacerSearch.create({
        user_id: user.id, inputs, status: "failed", results: {},
        credits_charged: 0, cost: 0, error: authResult.error, duration_ms: dur
      });
      await logActivity(base44, user, "pacer_search_failed", "PACER search failed (auth)", { first_name: firstName, last_name: lastName, error: authResult.error });
      return Response.json({ status: "failed", error: authResult.error, credits_charged: 0 }, { status: 502 });
    }

    // 2. PCL party search.
    const searchResult = await searchParty(authResult.token, firstName, lastName);
    const dur = Date.now() - started;

    // 3. Charge exactly 1 credit ONLY if PACER returned a real response
    //    (found or not found). Auth/network errors -> 0 credits.
    let creditsCharged = 0;
    let balanceAfter = null;
    let packBalanceAfter = null;
    let ledgerId = "";
    let recordStatus = "failed";
    let responseBody = {};
    let responseError = "";

    if (searchResult.ok) {
      recordStatus = searchResult.found ? "success" : "no_results";
      // Create record first so the idempotent charge can reference it.
      const record = await base44.asServiceRole.entities.PacerSearch.create({
        user_id: user.id, inputs, status: recordStatus,
        results: searchResult.results || {}, credits_charged: 0, cost: 0, error: "", duration_ms: dur
      });

      const charge = await chargeCredits(base44, user.id, PACER_COST, "pacer_search", record.id, "PACER party search (1 credit)");
      if (charge.ok) {
        creditsCharged = PACER_COST;
        balanceAfter = charge.balance;
        packBalanceAfter = charge.pack_balance;
        ledgerId = charge.ledger_id || "";
        await base44.asServiceRole.entities.PacerSearch.update(record.id, { credits_charged: PACER_COST });
      } else {
        // Balance dropped below 1 between pre-check and charge — keep 0 charge, mark failed.
        recordStatus = "failed";
        responseError = charge.reason || "charge_failed";
        await base44.asServiceRole.entities.PacerSearch.update(record.id, { status: "failed", error: responseError });
      }
      responseBody = searchResult.results || {};
    } else {
      recordStatus = "failed";
      responseError = searchResult.error || "";
      await base44.asServiceRole.entities.PacerSearch.create({
        user_id: user.id, inputs, status: "failed", results: {},
        credits_charged: 0, cost: 0, error: responseError, duration_ms: dur
      });
    }

    await logActivity(base44, user, "pacer_search_" + recordStatus, "PACER party search " + recordStatus, {
      first_name: firstName, last_name: lastName, credits_charged: creditsCharged, ledger_id: ledgerId
    });

    return Response.json({
      status: recordStatus,
      results: responseBody,
      credits_charged: creditsCharged,
      monthly_balance: balanceAfter,
      pack_balance: packBalanceAfter,
      error: responseError
    });
  } catch (error) {
    console.error("searchPacer failed", error);
    return Response.json({ error: "PACER search failed. Please try again.", code: "internal_error" }, { status: 500 });
  }
}