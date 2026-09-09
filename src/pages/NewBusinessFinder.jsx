import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, ExternalLink, Search, Building2 } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import StateFilingRow from "@/components/leads/StateFilingRow";
import SaveSearchButton from "@/components/search/SaveSearchButton";
import { findDuplicateLead } from "@/lib/leadDedup";

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

const DATE_RANGES = ["TODAY", "LAST 7 DAYS", "LAST 30 DAYS", "LAST 90 DAYS", "CUSTOM RANGE"];
const ENTITY_TYPES = ["All", "LLC", "Corporation", "Partnership", "Nonprofit", "Sole Proprietor"];
const STATUSES = ["All", "Active", "Dissolved", "Withdrawn", "Revoked"];
const LIVE_STATES = ["FL", "CT", "NY", "PA", "CO", "OR", "TX", "IA"];

export default function NewBusinessFinder() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ state: "", dateRange: "LAST 30 DAYS", startDate: "", endDate: "", entityType: "All", status: "All" });
  const [rows, setRows] = useState([]);
  const [view, setView] = useState("registry"); // "registry" | "records"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [savedLeads, setSavedLeads] = useState({});
  const { toast } = useToast();

  const loadAll = async () => {
    setLoading(true); setError(""); setView("registry");
    try {
      const res = await base44.functions.invoke("searchPublicLeads", { category: "new_businesses", state: "" });
      setRows(res.data.results || []);
    } catch (_e) {
      setError("Source temporarily unavailable.");
      setRows([]);
      toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const isLive = LIVE_STATES.includes(filters.state);

  const runSearch = async (e) => {
    e?.preventDefault();
    if (!filters.state) { loadAll(); return; }
    setLoading(true); setError(""); setRows([]);
    try {
      const res = await base44.functions.invoke("searchPublicLeads", {
        category: "new_businesses",
        state: filters.state,
        dateRange: filters.dateRange,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const d = res.data;
      if (d.status !== "success") { setError(d.error || "No results."); setView("registry"); }
      else {
        setRows(d.results || []);
        setView(d.results && d.results[0] && d.results[0].record_type === "state_filing" ? "records" : "registry");
      }
    } catch (_e) {
      setError("Source temporarily unavailable.");
      setView("registry");
      toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
    }
    finally { setLoading(false); }
  };

  const keyOf = (r, i) => `${r.official_record_id || r.business_name || ""}|${i}`;

  const onSave = async (r) => {
    const i = rows.indexOf(r); const k = keyOf(r, i);
    setBusy((b) => ({ ...b, [k]: "saving" }));
    try {
      const dup = await findDuplicateLead(user.id, r);
      if (dup) {
        setSavedLeads((s) => ({ ...s, [k]: dup }));
        setBusy((b) => ({ ...b, [k]: "saved" }));
        toast({ title: "Already saved", description: "This lead is already in your saved leads." });
        return;
      }
      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        business_name: r.business_name, state: r.state, city: r.city, zip: r.zip, address: r.address,
        official_record_id: r.official_record_id, agency: r.agency, source_reference: r.source_url,
        source_category: "new_businesses", record_label: r.record_label || "PUBLIC RECORD",
        retrieval_timestamp: r.retrieved_at || new Date().toISOString(), original_public_fields: r,
        saved: true, contact_status: "unverified", pipeline_status: "new",
      });
      setSavedLeads((s) => ({ ...s, [k]: lead }));
    } catch (_e) { setBusy((b) => ({ ...b, [k]: "error" })); }
  };

  const onEnrich = async (r) => {
    const i = rows.indexOf(r); const k = keyOf(r, i); const ke = k + "e";
    setBusy((b) => ({ ...b, [ke]: "loading" }));
    try {
      let leadId = savedLeads[k]?.id;
      if (!leadId) {
        const dup = await findDuplicateLead(user.id, r);
        if (dup) { leadId = dup.id; setSavedLeads((s) => ({ ...s, [k]: dup })); }
      }
      if (!leadId) {
        const lead = await base44.entities.Lead.create({
          user_id: user.id, business_name: r.business_name, state: r.state, city: r.city, zip: r.zip, address: r.address,
          official_record_id: r.official_record_id, agency: r.agency, source_reference: r.source_url,
          source_category: "new_businesses", record_label: r.record_label || "PUBLIC RECORD",
          retrieval_timestamp: r.retrieved_at || new Date().toISOString(), original_public_fields: r,
          saved: true, contact_status: "unverified", pipeline_status: "new",
        });
        leadId = lead.id; setSavedLeads((s) => ({ ...s, [k]: lead }));
      }
      const res = await base44.functions.invoke("enrichLead", { lead_id: leadId, inputs: { business_name: r.business_name, state: r.state, city: r.city } });
      const st = res.data.status;
      const code = res.data.code || "";
      if (st === "success") {
        setBusy((b) => ({ ...b, [ke]: "enriched" }));
      } else if (st === "empty") {
        setBusy((b) => ({ ...b, [ke]: "empty" }));
        toast({ title: "No contact found", description: res.data.error || "No verified contact information was found for this lead." });
      } else if (st === "provider_error") {
        setBusy((b) => ({ ...b, [ke]: "failed" }));
        toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
      } else if (code === "no_membership") {
        setBusy((b) => ({ ...b, [ke]: "failed" }));
        toast({ title: "Subscription required", description: res.data.error || "Subscribe to enrich leads.", variant: "destructive" });
      } else if (code === "insufficient_credits") {
        setBusy((b) => ({ ...b, [ke]: "failed" }));
        toast({ title: "Insufficient credits", description: res.data.error || "Purchase a credit pack to continue.", variant: "destructive" });
      } else {
        setBusy((b) => ({ ...b, [ke]: "failed" }));
        toast({ title: "Enrichment failed", description: res.data.error || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      const err = e?.response?.data || {};
      const code = err.code || "";
      setBusy((b) => ({ ...b, [ke]: "failed" }));
      if (code === "no_membership") {
        toast({ title: "Subscription required", description: err.error || "Subscribe to enrich leads.", variant: "destructive" });
      } else if (code === "insufficient_credits") {
        toast({ title: "Insufficient credits", description: err.error || "Purchase a credit pack to continue.", variant: "destructive" });
      } else {
        toast({ title: "Enrichment failed", description: err.error || e?.message || "A network error occurred. Please try again.", variant: "destructive" });
      }
    }
  };

  const onStar = async (leadId, starred) => {
    try { await base44.entities.Lead.update(leadId, { starred }); setSavedLeads((s) => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], starred }; return n; }); } catch (_e) {}
  };
  const onPipeline = async (leadId, status) => {
    try { await base44.entities.Lead.update(leadId, { pipeline_status: status }); setSavedLeads((s) => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], pipeline_status: status }; return n; }); } catch (_e) {}
  };

  const statusBadge = (cs) => {
    const map = { live: "bg-emerald-100 text-emerald-800", ready: "bg-sky-100 text-sky-800", restricted: "bg-amber-100 text-amber-800", needs_research: "bg-slate-100 text-slate-700", error: "bg-rose-100 text-rose-800" };
    return map[cs] || "bg-slate-100 text-slate-600";
  };

  return (
    <div>
      <PageHeader title="New Business Finder" subtitle="Real newly-registered business records from official state sources. Florida, Connecticut & New York are connected live; Georgia & Texas offer paid bulk data." action={
        <SaveSearchButton searchType="new_businesses" filters={filters} disabled={view !== "records" || rows.length === 0} />
      } />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <form onSubmit={runSearch} className="glass-panel p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State</Label>
            <select value={filters.state} onChange={(e) => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All states (registry)</option>
              {US_STATES.map((s) => <option key={s} value={s}>{s}{LIVE_STATES.includes(s) ? " · LIVE" : ""}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Formation Date</Label>
            <select value={filters.dateRange} onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!isLive}>
              {DATE_RANGES.map((d) => <option key={d}>{d}</option>)}
            </select>
          </div>
          {filters.dateRange === "CUSTOM RANGE" && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} className="h-10" disabled={!isLive} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} className="h-10" disabled={!isLive} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Entity Type</Label>
            <select value={filters.entityType} onChange={(e) => setFilters({ ...filters, entityType: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!isLive}>
              {ENTITY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Business Status</Label>
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!isLive}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {isLive
              ? `Live automated retrieval from the official ${filters.state} source. Formation-date filter operates on the state's actual registration/filing date (0 credits).`
              : filters.state
                ? `${filters.state} offers no free automated source — official portal / paid bulk data only. Filters apply on the official site.`
                : "Select a LIVE state (FL/CT/NY) to retrieve real newly-registered businesses, or browse the full state registry."}
          </p>
          <Button type="submit" className="h-10" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-2" /> Search</>}
          </Button>
        </div>
      </form>

      {error && <div className="mb-4 text-sm text-destructive">{error}</div>}

      {view === "records" ? (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/30 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">Business Name</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Formation Date</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Status</th>
                  <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Business ID</th>
                  <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Agency</th>
                  <th className="text-left font-medium px-4 py-3">Pipeline</th>
                  <th className="text-right font-medium px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
                {!loading && rows.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No new businesses found in this date range.</td></tr>}
                {!loading && rows.map((r, i) => {
                  const k = keyOf(r, i);
                  return <StateFilingRow key={k} r={r} k={k} busy={busy} savedLead={savedLeads[k]} onSave={onSave} onEnrich={onEnrich} onStar={onStar} onPipeline={onPipeline} />;
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground">Search / view / save / favorite / pipeline = 0 credits · Optional enrichment = 5 credits on success only</div>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/30 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-4 py-3">State</th>
                  <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Official Agency</th>
                  <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Source Type</th>
                  <th className="text-left font-medium px-4 py-3">Automation</th>
                  <th className="text-left font-medium px-4 py-3">Status</th>
                  <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Notes</th>
                  <th className="text-right font-medium px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
                {!loading && rows.map((r) => (
                  <tr key={r.state} className="border-t border-white/30 hover:bg-white/40">
                    <td className="px-4 py-3">
                      <div className="font-medium">{r.state}</div>
                      <div className="text-xs text-muted-foreground">{r.jurisdiction}</div>
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground inline-block mt-1">Public Record</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{r.business_name}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs capitalize">{(r.extra?.source_type || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-xs capitalize">{(r.extra?.automation_status || "").replace(/_/g, " ")}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${statusBadge(r.extra?.connection_status)}`}>{r.extra?.connection_status || "ready"}</span></td>
                    <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{r.extra?.notes || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="outline" size="sm" asChild><a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Official</a></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}