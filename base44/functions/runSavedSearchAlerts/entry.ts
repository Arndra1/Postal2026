import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { providerForCategory } from "../../shared/public-data/registry.ts";
import { STATE_FILING_ADAPTERS } from "../../shared/public-data/stateFilings.ts";
import { searchFederalAwards, federalLeadKey } from "../../shared/public-data/usaspending.ts";
import { prospect } from "../../shared/public-data/types.ts";

// Scheduled job: re-runs saved searches and emails users about new matches.
// Called daily by the "Saved Search Alerts" workflow.
//
// For each SavedSearch due for a run:
//   1. Re-execute the search using the stored filters
//   2. Compare results against last_seen_lead_ids
//   3. New leads → send email digest + create in-app Notification
//   4. Update last_run_at and last_seen_lead_ids

const DAILY_INTERVAL_MS = 20 * 3600 * 1000;      // 20 hours
const WEEKLY_INTERVAL_MS = 6 * 24 * 3600 * 1000;  // 6 days

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin" && user.role !== "owner") {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const allSearches = await db.entities.SavedSearch.filter({ email_alerts: true });
    const due = allSearches.filter((s) => {
      if (s.alert_cadence === "none") return false;
      if (!s.last_run_at) return true;
      const interval = s.alert_cadence === "weekly" ? WEEKLY_INTERVAL_MS : DAILY_INTERVAL_MS;
      return (now.getTime() - new Date(s.last_run_at).getTime()) >= interval;
    });

    let alertsSent = 0;
    const errors = [];

    for (const search of due) {
      try {
        const results = await executeSearch(search);
        if (!results || results.length === 0) {
          await db.entities.SavedSearch.update(search.id, { last_run_at: now.toISOString(), last_seen_lead_ids: [] });
          continue;
        }

        const currentIds = results.map(leadKey);
        const prevIds = new Set(search.last_seen_lead_ids || []);
        const newLeads = results.filter((r) => !prevIds.has(leadKey(r)));

        // First run — don't alert (just record baseline).
        if (!search.last_run_at || (search.last_seen_lead_ids || []).length === 0) {
          await db.entities.SavedSearch.update(search.id, {
            last_run_at: now.toISOString(),
            last_seen_lead_ids: currentIds,
          });
          continue;
        }

        if (newLeads.length === 0) {
          await db.entities.SavedSearch.update(search.id, { last_run_at: now.toISOString(), last_seen_lead_ids: currentIds });
          continue;
        }

        // Send email + in-app notification.
        const users = await db.entities.User.filter({ id: search.user_id });
        const email = users?.[0]?.email;
        const fullName = users?.[0]?.full_name || "there";

        if (email) {
          const html = buildEmailHtml(search.name, newLeads);
          try {
            await db.integrations.Core.SendEmail({
              to: email,
              from_name: "RingBellz",
              subject: `🔔 ${newLeads.length} new lead${newLeads.length !== 1 ? "s" : ""} match your saved search "${search.name}"`,
              body: html,
            });
          } catch (e) {
            console.error("SavedSearchAlert email failed:", e?.message || e);
          }
        }

        await db.entities.Notification.create({
          user_id: search.user_id,
          type: "new_data_source",
          title: `${newLeads.length} new lead${newLeads.length !== 1 ? "s" : ""} for "${search.name}"`,
          body: newLeads.slice(0, 5).map((l) => l.business_name || l.person_name || "Unknown").join(", ") + (newLeads.length > 5 ? ` and ${newLeads.length - 5} more` : ""),
          action_url: "/saved-searches",
          read: false,
        }).catch(() => {});

        await db.entities.SavedSearch.update(search.id, {
          last_run_at: now.toISOString(),
          last_seen_lead_ids: currentIds,
        });
        alertsSent++;
      } catch (err) {
        console.error("SavedSearchAlert failed for search " + search.id + ":", err?.message || err);
        errors.push(String(err?.message || err));
      }
    }

    return Response.json({ ok: true, searchesDue: due.length, alertsSent, errors });
  } catch (error) {
    console.error("runSavedSearchAlerts failed", error);
    return Response.json({ error: "Saved search alert run failed." }, { status: 500 });
  }
}

function leadKey(r) {
  return (r.official_record_id || ((r.business_name || "") + "|" + (r.state || ""))).toLowerCase();
}

async function executeSearch(search) {
  const f = search.filters || {};
  const inputs = {
    business_name: f.business_name || f.keyword || "",
    person_name: f.person_name || "",
    state: f.state || "",
    city: f.city || "",
    industry: f.industry || "",
    job_title: f.job_title || "",
    dateRange: f.dateRange || "LAST 30 DAYS",
    startDate: f.startDate || "",
    endDate: f.endDate || "",
    keyword: f.keyword || "",
    agency: f.agency || "",
    ntee: f.ntee || "",
  };

  switch (search.search_type) {
    case "federal_grants": {
      const r = await searchFederalAwards(inputs);
      return r.results || [];
    }
    case "nonprofits":
    case "government_open_data":
    case "public_records":
    case "geographic":
    case "market_intelligence": {
      const provider = providerForCategory(search.search_type === "nonprofits" ? "nonprofits" : search.search_type);
      if (!provider || !provider.configured()) return [];
      const r = await provider.search(inputs);
      return r.results || [];
    }
    case "new_businesses": {
      if (!inputs.state) return [];
      const adapter = STATE_FILING_ADAPTERS[inputs.state.toUpperCase()];
      if (!adapter) return [];
      const r = await adapter(inputs, { db });
      return r.results || [];
    }
    default:
      return [];
  }
}

function buildEmailHtml(searchName, leads) {
  const rows = leads.slice(0, 10).map((l) => {
    const name = l.business_name || l.person_name || "Unknown";
    const agency = l.agency || l.industry || "";
    const amount = l.extra?.award_amount ? `$${Number(l.extra.award_amount).toLocaleString()}` : "";
    return `<tr><td style="padding:6px 0;font-weight:600">${escapeHtml(name)}</td><td style="padding:6px 12px;color:#666">${escapeHtml(agency)}</td><td style="padding:6px 0;color:#5B2A6E;font-weight:600">${amount}</td></tr>`;
  }).join("");
  const more = leads.length > 10 ? `<p style="color:#999;font-size:13px;margin-top:8px">And ${leads.length - 10} more — view all in your dashboard.</p>` : "";
  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto">
      <h2 style="color:#5B2A6E">🔔 New leads for "${escapeHtml(searchName)}"</h2>
      <p style="color:#444">We found <strong>${leads.length}</strong> new lead${leads.length !== 1 ? "s" : ""} matching your saved search.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0">${rows}</table>
      ${more}
      <a href="https://horned-pulse-lead-flow.base44.app/saved-searches" style="display:inline-block;background:#5B2A6E;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;margin-top:12px">View in RingBellz</a>
    </div>
  `;
}

function escapeHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}