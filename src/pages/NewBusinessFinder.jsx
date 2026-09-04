import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, ExternalLink, Search, Building2 } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const DATE_RANGES = ["TODAY", "LAST 7 DAYS", "LAST 30 DAYS", "LAST 90 DAYS", "CUSTOM RANGE"];
const ENTITY_TYPES = ["All", "LLC", "Corporation", "Partnership", "Nonprofit", "Sole Proprietor"];
const STATUSES = ["All", "Active", "Dissolved", "Withdrawn", "Revoked"];

export default function NewBusinessFinder() {
  const [filters, setFilters] = useState({ state: "", dateRange: "LAST 30 DAYS", entityType: "All", status: "All", industry: "" });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("searchPublicLeads", { category: "new_businesses", state: "" });
      setRows(res.data.results || []);
    } catch (_e) {
      setRows([]);
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((r) => {
    if (filters.state && r.state !== filters.state) return false;
    if (filters.status !== "All" && !(r.extra?.notes || "").toLowerCase().includes(filters.status.toLowerCase())) return true;
    return true;
  });

  const statusBadge = (cs) => {
    const map = { ready: "bg-emerald-100 text-emerald-800", restricted: "bg-amber-100 text-amber-800", needs_research: "bg-slate-100 text-slate-700", live: "bg-emerald-100 text-emerald-800", error: "bg-rose-100 text-rose-800" };
    return map[cs] || "bg-slate-100 text-slate-600";
  };

  return (
    <div>
      <PageHeader title="New Business Finder" subtitle="Official business-registration sources for all 50 states + DC. Most jurisdictions expose a public search portal — automated bulk access is the exception, not the rule." />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All states</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Formation Date</Label>
            <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {DATE_RANGES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Business Status</Label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Industry / Category</Label>
            <input value={filters.industry} onChange={(e) => setFilters({ ...filters, industry: e.target.value })} placeholder="Optional" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Filters marked <span className="font-medium">TODAY / 7 / 30 / 90</span>, entity type, status and industry are applied on each state's official search portal — most portals do not expose an automated API. Only filters a portal genuinely supports will refine results there.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">State</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Official Agency</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Source Type</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">API?</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Open Data?</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Bulk?</th>
                <th className="text-left font-medium px-4 py-3">Automation</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-right font-medium px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={9} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {!loading && filtered.map((r) => (
                <tr key={r.state} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.state}</div>
                    <div className="text-xs text-muted-foreground">{r.jurisdiction}</div>
                    <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground inline-block mt-1">Public Record</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{r.business_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs capitalize">{(r.extra?.source_type || "").replace("_", " ")}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs">{r.extra?.api_available ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs">{r.extra?.open_data ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs">{r.extra?.bulk_data ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-xs capitalize">{(r.extra?.automation_status || "").replace("_", " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${statusBadge(r.extra?.connection_status)}`}>{r.extra?.connection_status || "ready"}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" asChild>
                      <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Official Search</a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && loaded && (
          <div className="px-4 py-10 text-center text-muted-foreground text-sm">No state sources match the selected filters.</div>
        )}
      </div>
    </div>
  );
}