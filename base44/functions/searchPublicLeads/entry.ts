import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { providerForCategory } from "../../shared/public-data/registry.ts";
import { getSourceByCode, STATE_BUSINESS_SOURCES } from "../../shared/stateBusinessSources.ts";
import { STATE_FILING_ADAPTERS } from "../../shared/public-data/stateFilings.ts";
import { logActivity } from "../../shared/logging.ts";
import { unauthorized } from "../../shared/roles.ts";

// Public-data lead search. ALL public-data search costs 0 credits.
// Only a later qualifying contact enrichment costs 5 credits (handled by the
// existing enrichLead function). Enrichment is never triggered here.
//
// Categories:
//   government_open_data → Data.gov/FEC committees (real API)
//   public_records       → CourtListener dockets/parties (real API)
//   market_intelligence  → Census County Business Patterns (real API)
//   geographic           → HUD metro market areas (real API)
//   new_businesses       → state business-registry directory (official portal info)
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return unauthorized();

    let body = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const category = body.category || "government_open_data";
    const inputs = {
      business_name: body.business_name || "",
      person_name: body.person_name || "",
      state: body.state || "",
      city: body.city || "",
      industry: body.industry || "",
      job_title: body.job_title || "",
      dateRange: body.dateRange || "LAST 30 DAYS",
      startDate: body.startDate || "",
      endDate: body.endDate || "",
    };

    const now = new Date().toISOString();

    // ---- new_businesses: return the official state registry entry ----
    if (category === "new_businesses") {
      // No state selected → return the full official registry (all 50 states + DC).
      if (!inputs.state) {
        const all = STATE_BUSINESS_SOURCES.map((s) => ({
          business_name: s.agency,
          jurisdiction: s.name,
          state: s.code,
          agency: s.agency,
          source: "Official State Business Registry",
          source_url: s.official_url,
          record_type: "new_businesses",
          record_label: "PUBLIC RECORD",
          official_record_id: "",
          retrieved_at: now,
          extra: {
            source_type: s.source_type,
            api_available: s.api_available,
            open_data: s.open_data,
            bulk_data: s.bulk_data,
            automation_status: s.automation_status,
            connection_status: s.connection_status,
            free_paid: s.free_paid || "",
            formation_date_available: s.formation_date_available || false,
            data_format: s.data_format || "",
            update_frequency: s.update_frequency || "",
            automated: s.automated || false,
            notes: s.notes,
          },
        }));
        await logActivity(base44, user, "public_search_new_businesses", "Listed all state business registries", {});
        return Response.json({ status: "success", category, source: "State Business Registry", results: all, credits_charged: 0 });
      }
      // Live automated adapters (FL/CT/NY) — return REAL newly-registered records.
      const adapter = STATE_FILING_ADAPTERS[inputs.state.toUpperCase()];
      if (adapter) {
        let pr;
        try {
          pr = await adapter(inputs, { db: base44.asServiceRole });
        } catch (_err) {
          return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
        }
        if (pr.status !== "success") {
          return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
        }
        const liveResults = await flagDuplicates(base44, user.id, pr.results || []);
        await logActivity(base44, user, "public_search_new_businesses", "Live state filings search: " + inputs.state, { state: inputs.state, count: liveResults.length });
        return Response.json({ status: "success", category, source: pr.source, results: liveResults, credits_charged: 0 });
      }
      const src = getSourceByCode(inputs.state);
      if (!src) {
        return Response.json({ status: "failed", error: "Select a state to view its official business-registration source.", results: [] }, { status: 400 });
      }
      const result = [{
        business_name: src.agency,
        jurisdiction: src.name,
        state: src.code,
        agency: src.agency,
        source: "Official State Business Registry",
        source_url: src.official_url,
        record_type: "new_businesses",
        record_label: "PUBLIC RECORD",
        official_record_id: "",
        retrieved_at: now,
        extra: {
          source_type: src.source_type,
          api_available: src.api_available,
          open_data: src.open_data,
          bulk_data: src.bulk_data,
          automation_status: src.automation_status,
          connection_status: src.connection_status,
          notes: src.notes,
        },
      }];
      await logActivity(base44, user, "public_search_new_businesses", "Searched state business registry for " + src.name, { state: src.code });
      return Response.json({ status: "success", category, source: "State Business Registry", results: await flagDuplicates(base44, user.id, result), credits_charged: 0 });
    }

    // ---- live API categories ----
    const provider = providerForCategory(category);
    if (!provider) {
      return Response.json({ status: "failed", error: "Unknown search category.", results: [] }, { status: 400 });
    }
    if (!provider.configured()) {
      await markSourceAttempt(base44, provider.meta.key, false, now, "missing_api_key").catch(() => {});
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 503 });
    }

    let providerResult;
    try {
      providerResult = await provider.search(inputs);
    } catch (err) {
      const msg = (err && err.message) ? err.message : "provider_error";
      await markSourceAttempt(base44, provider.meta.key, false, now, msg).catch(() => {});
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    // Record source status for the admin registry.
    const ok = providerResult.status === "success";
    await markSourceAttempt(base44, provider.meta.key, ok, now, providerResult.error || "").catch(() => {});

    if (!ok) {
      return Response.json({ status: "failed", error: "Source temporarily unavailable.", results: [] }, { status: 502 });
    }

    const results = await flagDuplicates(base44, user.id, providerResult.results || []);

    await logActivity(base44, user, "public_search_" + category, "Public-data search via " + provider.meta.name, {
      state: inputs.state, count: results.length,
    });

    return Response.json({
      status: "success",
      category,
      source: providerResult.source || provider.meta.name,
      results,
      credits_charged: 0,
    });
  } catch (error) {
    return Response.json({ error: "Search failed. Please try again." }, { status: 500 });
  }
}

// ---- Duplicate detection against the caller's OWN saved leads only ----
// Identifiers: official_record_id, then business_name + state. Never leaks
// another customer's leads — only the caller's saved leads are queried.
async function flagDuplicates(base44, userId, prospects) {
  try {
    const saved = await base44.entities.Lead.filter({ user_id: userId, saved: true });
    const byOfficialId = {};
    const byNameState = {};
    for (const s of saved || []) {
      if (s.official_record_id) byOfficialId[s.official_record_id.toLowerCase()] = s;
      const key = ((s.business_name || "") + "|" + (s.state || "")).toLowerCase().trim();
      if (key !== "|") byNameState[key] = s;
    }
    return prospects.map((p) => {
      let dup = null;
      const oid = (p.official_record_id || "").toLowerCase();
      if (oid && byOfficialId[oid]) dup = byOfficialId[oid];
      else {
        const key = ((p.business_name || "") + "|" + (p.state || "")).toLowerCase().trim();
        if (key !== "|" && byNameState[key]) dup = byNameState[key];
      }
      return { ...p, possible_duplicate: !!dup, duplicate_lead_id: dup ? dup.id : "" };
    });
  } catch (_e) {
    return prospects.map((p) => ({ ...p, possible_duplicate: false, duplicate_lead_id: "" }));
  }
}

async function markSourceAttempt(base44, sourceKey, ok, now, error) {
  try {
    const rows = await base44.asServiceRole.entities.PublicDataSource.filter({ source_key: sourceKey });
    const s = (rows && rows[0]) || null;
    if (!s) return;
    const patch = {
      last_attempt_at: now,
      connection_status: ok ? "live" : "error",
      error_state: ok ? "" : (error || "error").slice(0, 200),
    };
    if (ok) {
      patch.last_success_at = now;
      patch.error_state = "";
    }
    await base44.asServiceRole.entities.PublicDataSource.update(s.id, patch);
  } catch (_e) { /* non-critical */ }
}