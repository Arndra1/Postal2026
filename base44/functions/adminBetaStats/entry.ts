import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { isAdmin, unauthorized, forbidden } from "../../shared/roles.ts";

// Beta analytics — admin/owner only.
// Aggregates per-user usage, enrichment performance, state breakdown, and feedback
// for active beta users only. Never exposes API secrets or other tenants' data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const [betaUsers, users, activityLogs, leads, enrichments, wallets, ledger, feedback] = await Promise.all([
      base44.asServiceRole.entities.BetaUser.list(),
      base44.asServiceRole.entities.User.list(),
      base44.asServiceRole.entities.ActivityLog.list(),
      base44.asServiceRole.entities.Lead.list(),
      base44.asServiceRole.entities.Enrichment.list(),
      base44.asServiceRole.entities.CreditWallet.list(),
      base44.asServiceRole.entities.CreditLedger.list(),
      base44.asServiceRole.entities.BetaFeedback.list(),
    ]);

    const userMap = {};
    for (const u of users) userMap[u.id] = u;

    const activeBeta = betaUsers.filter(b => b.status === "active");
    const betaIds = new Set(activeBeta.map(b => b.user_id));

    // ---- Per-user stats ----
    const perUser = activeBeta.map(b => {
      const uid = b.user_id;
      const u = userMap[uid] || {};
      const userActivity = activityLogs.filter(a => a.user_id === uid);
      const userLeads = leads.filter(l => l.user_id === uid);
      const userEnrichments = enrichments.filter(e => e.user_id === uid);
      const userWallet = wallets.find(w => w.user_id === uid);
      const userLedger = ledger.filter(l => l.user_id === uid);

      const searches = userActivity.filter(a => a.action && a.action.startsWith("public_search"));
      const csvExports = userActivity.filter(a => a.action === "csv_export");
      const statesSearched = [...new Set(searches.map(s => s.metadata?.state).filter(Boolean))];
      const successEnrichments = userEnrichments.filter(e => e.status === "success");
      const creditsUsed = userLedger.filter(l => l.action === "spend").reduce((s, l) => s + Math.abs(l.amount), 0);

      return {
        user_id: uid,
        email: b.email || u.email || "",
        name: u.full_name || "",
        status: b.status,
        onboarded: b.onboarded,
        beta_credits_granted: b.beta_credits_granted || 0,
        searches: searches.length,
        leads_saved: userLeads.length,
        enrichment_attempts: userEnrichments.length,
        successful_enrichments: successEnrichments.length,
        failed_enrichments: userEnrichments.length - successEnrichments.length,
        credits_used: creditsUsed,
        credits_balance: userWallet?.balance || 0,
        states_searched: statesSearched,
        csv_exports: csvExports.length,
      };
    });

    // ---- Enrichment performance (beta users only) ----
    const betaEnrichments = enrichments.filter(e => betaIds.has(e.user_id));
    const totalAttempts = betaEnrichments.length;
    const successes = betaEnrichments.filter(e => e.status === "success");
    const successCount = successes.length;
    const emptyCount = betaEnrichments.filter(e => e.status === "empty").length;

    const hasEmail = (e) => e.results && e.results.verified_email;
    const hasPhone = (e) => e.results && e.results.verified_phone;
    const verifiedEmailCount = successes.filter(hasEmail).length;
    const validatedPhoneCount = successes.filter(hasPhone).length;
    const bothCount = successes.filter(e => hasEmail(e) && hasPhone(e)).length;
    const totalCreditsSpent = betaEnrichments.reduce((s, e) => s + (e.credits_charged || 0), 0);
    const avgCreditsPerSuccess = successCount > 0 ? Math.round((totalCreditsSpent / successCount) * 100) / 100 : 0;

    // ---- Success rate by state ----
    const stateMap = {};
    for (const e of betaEnrichments) {
      const state = (e.inputs && e.inputs.state) || "unknown";
      if (!stateMap[state]) stateMap[state] = { state, attempts: 0, successes: 0 };
      stateMap[state].attempts++;
      if (e.status === "success") stateMap[state].successes++;
    }
    const byState = Object.values(stateMap).map(s => ({
      ...s,
      success_rate: s.attempts > 0 ? Math.round((s.successes / s.attempts) * 100) : 0,
    })).sort((a, b) => b.attempts - a.attempts);

    // ---- Top states searched ----
    const searchStateMap = {};
    for (const b of activeBeta) {
      const searches = activityLogs.filter(a => a.user_id === b.user_id && a.action && a.action.startsWith("public_search"));
      for (const s of searches) {
        const st = s.metadata?.state || "unknown";
        searchStateMap[st] = (searchStateMap[st] || 0) + 1;
      }
    }
    const topStates = Object.entries(searchStateMap)
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ---- Feedback ----
    const betaFeedback = feedback.filter(f => betaIds.has(f.user_id));

    return Response.json({
      summary: {
        betaUsers: activeBeta.length,
        totalSearches: perUser.reduce((s, u) => s + u.searches, 0),
        leadsSaved: perUser.reduce((s, u) => s + u.leads_saved, 0),
        enrichmentAttempts: totalAttempts,
        successfulEnrichments: successCount,
        failedEnrichments: totalAttempts - successCount,
        creditsUsed: perUser.reduce((s, u) => s + u.credits_used, 0),
        successRate: totalAttempts > 0 ? Math.round((successCount / totalAttempts) * 100) : 0,
        csvExports: perUser.reduce((s, u) => s + u.csv_exports, 0),
        feedbackReceived: betaFeedback.length,
      },
      performance: {
        verifiedEmailRate: successCount > 0 ? Math.round((verifiedEmailCount / successCount) * 100) : 0,
        validatedPhoneRate: successCount > 0 ? Math.round((validatedPhoneCount / successCount) * 100) : 0,
        bothEmailPhoneRate: successCount > 0 ? Math.round((bothCount / successCount) * 100) : 0,
        emptyResultRate: totalAttempts > 0 ? Math.round((emptyCount / totalAttempts) * 100) : 0,
        avgCreditsPerSuccess,
      },
      topStates,
      byState,
      perUser,
      feedback: betaFeedback
        .slice()
        .sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))
        .slice(0, 50),
    });
  } catch (error) {
    return Response.json({ error: "Failed to load beta stats." }, { status: 500 });
  }
}