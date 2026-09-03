// Activity logging + enrichment observability.
// Never logs secrets or full credentials.

export async function logActivity(base44, user, action, description, metadata) {
  try {
    await base44.asServiceRole.entities.ActivityLog.create({
      user_id: user.id || "",
      user_email: user.email || "",
      action,
      description: description || "",
      metadata: metadata || {}
    });
  } catch (_e) {
    // logging must never break the main flow
  }
}

// Compliance event log — terms acceptance, account suspension/reinstatement,
// warnings, provider changes, and unusual usage. Admin-visible only.
export async function logCompliance(base44, eventType, userId, adminId, description, metadata) {
  try {
    await base44.asServiceRole.entities.ComplianceLog.create({
      user_id: userId || "",
      admin_id: adminId || "",
      event_type: eventType,
      description: description || "",
      metadata: metadata || {}
    });
  } catch (_e) {
    // compliance logging must never break the main flow
  }
}

// Log an enrichment attempt with observability fields.
export async function logEnrichment(base44, userId, provider, status, durationMs, creditsCharged, referenceId, errorMessage) {
  try {
    await base44.asServiceRole.entities.Enrichment.create({
      user_id: userId,
      provider,
      status,
      inputs: {},
      results: {},
      credits_charged: creditsCharged || 0,
      duration_ms: durationMs || 0,
      data_sources: provider ? [provider] : [],
      error_message: errorMessage || "",
      reference_id: referenceId || ""
    });
  } catch (_e) {
    // best-effort
  }
}