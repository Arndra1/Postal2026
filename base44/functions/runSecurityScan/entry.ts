import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { logCompliance } from "../../shared/logging.ts";

// Automated security monitoring — runs daily via the "Security Scan" workflow.
// Scans for unusual API usage patterns and logs flagged accounts to ComplianceLog
// for admin review. Does not auto-suspend — admin reviews flagged accounts.
const ACTIVITY_THRESHOLD = 100;  // actions per user in 24h
const ENRICHMENT_THRESHOLD = 50; // enrichments per user in 24h

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = base44.asServiceRole;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const flagged = [];

    // 1) Excessive API activity — check recent ActivityLog entries
    const recentActivity = await db.entities.ActivityLog.filter({}, '-created_date', 500);
    const activityByUser = {};
    for (const log of recentActivity) {
      if (!log.created_date || new Date(log.created_date) < since) continue;
      const uid = log.user_id || '';
      if (!uid) continue;
      activityByUser[uid] = (activityByUser[uid] || 0) + 1;
    }
    for (const [uid, count] of Object.entries(activityByUser)) {
      if (count > ACTIVITY_THRESHOLD) {
        flagged.push({ user_id: uid, type: 'excessive_search_activity', count });
        await logCompliance(db, 'excessive_search_activity', uid, '',
          `${count} actions in 24h (threshold: ${ACTIVITY_THRESHOLD})`, { count, threshold: ACTIVITY_THRESHOLD });
      }
    }

    // 2) Unusual enrichment volume — check recent Enrichment entries
    const recentEnrichments = await db.entities.Enrichment.filter({}, '-created_date', 500);
    const enrichmentByUser = {};
    for (const e of recentEnrichments) {
      if (!e.created_date || new Date(e.created_date) < since) continue;
      const uid = e.user_id || '';
      if (!uid) continue;
      enrichmentByUser[uid] = (enrichmentByUser[uid] || 0) + 1;
    }
    for (const [uid, count] of Object.entries(enrichmentByUser)) {
      if (count > ENRICHMENT_THRESHOLD) {
        flagged.push({ user_id: uid, type: 'unusual_api_usage', count });
        await logCompliance(db, 'unusual_api_usage', uid, '',
          `${count} enrichments in 24h (threshold: ${ENRICHMENT_THRESHOLD})`, { count, threshold: ENRICHMENT_THRESHOLD });
      }
    }

    return Response.json({ ok: true, flagged, flaggedCount: flagged.length });
  } catch (error) {
    console.error('runSecurityScan failed', error);
    return Response.json({ error: 'Security scan failed.' }, { status: 500 });
  }
}