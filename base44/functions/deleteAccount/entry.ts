import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { logCompliance } from "../../shared/logging.ts";

// Deletes all user-owned data for the authenticated user.
// Audit logs (ComplianceLog, BillingEvent, ActivityLog) are retained per legal requirements.
// The User entity itself is platform-managed (auth backend) — cannot be deleted via SDK.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user;
    try { user = await base44.auth.me(); } catch (_authErr) { return Response.json({ error: 'Unauthorized' }, { status: 401 }); }
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const db = base44.asServiceRole;
    const userId = user.id;

    // User-owned data to delete (contains PII)
    const userEntities = [
      'Lead', 'LeadNote', 'LeadList', 'Enrichment', 'CreditWallet',
      'CreditLedger', 'Subscription', 'TermsAcceptance',
      'SubscriptionNotice', 'SubscriptionConsent', 'SupportRequest', 'BetaFeedback'
    ];

    const deleted = {};
    for (const name of userEntities) {
      try {
        await db.entities[name].deleteMany({ user_id: userId });
        deleted[name] = true;
      } catch (e) {
        deleted[name] = false;
      }
    }

    // Base44Purchase uses appUserId
    try {
      await db.entities.Base44Purchase.deleteMany({ appUserId: userId });
      deleted['Base44Purchase'] = true;
    } catch (_e) {
      deleted['Base44Purchase'] = false;
    }

    // Log the deletion request for audit (retained — admin-only)
    await logCompliance(db, 'account_suspended', userId, '', 'Account data deleted per user request. User entity remains (platform-managed).', { deleted });

    return Response.json({ ok: true, deleted });
  } catch (error) {
    console.error('deleteAccount failed', error);
    return Response.json({ error: 'Account deletion failed.' }, { status: 500 });
  }
}