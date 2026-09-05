import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertCircle, Scale, Info } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import BankruptcyLeadCard from "@/components/search/BankruptcyLeadCard";

const ALL_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];
const CHAPTERS = ["", "7", "11", "13"];

// Bankruptcy prospect discovery page. For credit-service companies to find
// people/businesses associated with recent PUBLIC bankruptcy filings who may
// potentially need their services. A bankruptcy filing is a factual
// public-record event — this page never infers credit denial, risk, or
// financial distress. All discovery is 0 credits; only optional enrichment
// costs 5 credits on verified success.
export default function BankruptcyFinder() {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ state: "", chapter: "", startDate: "", endDate: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [savedLeads, setSavedLeads] = useState({});
  const [enrichmentData, setEnrichmentData] = useState({});
  const [lists, setLists] = useState([]);
  const [customerType, setCustomerType] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      base44.entities.LeadList.filter({ user_id: user.id }).then(setLists).catch(() => {});
      base44.auth.me().then((u) => setCustomerType(u.customer_type || "")).catch(() => {});
    }
  }, [user]);

  const keyOf = (r, i) => `${r.official_record_id || r.extra?.docket_id || r.business_name || r.person_name || ""}|${i}`;

  const runSearch = async (e) => {
    e?.preventDefault();
    setLoading(true); setError(""); setResults([]); setSearched(true);
    try {
      const res = await base44.functions.invoke("searchBankruptcyLeads", {
        state: filters.state,
        chapter: filters.chapter,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      const d = res.data;
      if (d.status === "success") setResults(d.results || []);
      else setError(d.error || "No results found.");
    } catch (_e) {
      setError("Source temporarily unavailable. CourtListener allows a limited number of searches per minute — please wait a moment and try again.");
      toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
    }
    finally { setLoading(false); }
  };

  const onSave = async (r) => {
    const i = results.indexOf(r); const k = keyOf(r, i);
    setBusy(b => ({ ...b, [k]: "saving" }));
    try {
      const ex = r.extra || {};
      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        business_name: r.business_name,
        person_name: r.person_name,
        state: r.state,
        jurisdiction: r.jurisdiction,
        agency: r.agency,
        source_reference: r.source_url,
        source_category: "public_records",
        record_label: "PUBLIC RECORD",
        official_record_id: r.official_record_id,
        industry: r.industry,
        retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
        original_public_fields: r,
        lead_type: ex.lead_type || (r.business_name ? "business" : "person"),
        event_type: "bankruptcy_filing",
        event_date: ex.event_date || "",
        saved: true, contact_status: "unverified", pipeline_status: "new",
      });
      setSavedLeads(s => ({ ...s, [k]: lead }));
      setBusy(b => ({ ...b, [k]: "saved" }));
    } catch (_e) { setBusy(b => ({ ...b, [k]: "error" })); }
  };

  const onEnrich = async (r) => {
    const i = results.indexOf(r); const k = keyOf(r, i); const ke = k + "e";
    setBusy(b => ({ ...b, [ke]: "loading" }));
    try {
      let leadId = savedLeads[k]?.id;
      if (!leadId) {
        const ex = r.extra || {};
        const lead = await base44.entities.Lead.create({
          user_id: user.id,
          business_name: r.business_name,
          person_name: r.person_name,
          state: r.state,
          jurisdiction: r.jurisdiction,
          agency: r.agency,
          source_reference: r.source_url,
          source_category: "public_records",
          record_label: "PUBLIC RECORD",
          official_record_id: r.official_record_id,
          industry: r.industry,
          retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
          original_public_fields: r,
          lead_type: ex.lead_type || (r.business_name ? "business" : "person"),
          event_type: "bankruptcy_filing",
          event_date: ex.event_date || "",
          saved: true, contact_status: "unverified", pipeline_status: "new",
        });
        leadId = lead.id; setSavedLeads(s => ({ ...s, [k]: lead }));
      }
      // Enrichment inputs — only what's actually available. No fabricated address.
      const inputs = {
        business_name: r.business_name,
        person_name: r.person_name,
        state: r.state,
        website: "",
        job_title: "",
      };
      const res = await base44.functions.invoke("enrichLead", { lead_id: leadId, inputs });
      setBusy(b => ({ ...b, [ke]: res.data.status === "success" ? "enriched" : "failed" }));
      if (res.data.status === "success" && res.data.results) {
        setEnrichmentData(d => ({ ...d, [k]: res.data.results }));
      } else if (res.data.status === "provider_error") {
        toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
      }
    } catch (_e) { setBusy(b => ({ ...b, [ke]: "failed" })); }
  };

  const onStar = async (leadId, starred) => {
    try { await base44.entities.Lead.update(leadId, { starred }); setSavedLeads(s => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], starred }; return n; }); } catch (_e) {}
  };
  const onPipeline = async (leadId, status) => {
    try { await base44.entities.Lead.update(leadId, { pipeline_status: status }); setSavedLeads(s => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], pipeline_status: status }; return n; }); } catch (_e) {}
  };
  const onTagsChange = async (leadId, tags) => {
    try { await base44.entities.Lead.update(leadId, { tags }); setSavedLeads(s => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], tags }; return n; }); } catch (_e) {}
  };
  const onCreateList = async (name, color) => {
    const created = await base44.entities.LeadList.create({ user_id: user.id, name, color });
    setLists(l => [...l, created]); return created;
  };
  const onListIdsChange = async (leadId, list_ids) => {
    try { await base44.entities.Lead.update(leadId, { list_ids }); setSavedLeads(s => { const n = { ...s }; for (const k in n) if (n[k].id === leadId) n[k] = { ...n[k], list_ids }; return n; }); } catch (_e) {}
  };

  return (
    <div>
      <PageHeader title="Bankruptcy Prospects" subtitle="Find people or businesses associated with recent public bankruptcy filings — for credit-service outreach. All discovery is free; only optional contact enrichment costs 5 credits on verified success." />

      <ComplianceBanner text="Bankruptcy filings are factual public records. This tool is for lawful marketing prospecting only — never for credit eligibility, loan/funding/insurance/employment/housing eligibility, underwriting, or risk scoring." />

      {customerType === "credit_repair" ? (
        <div className="flex items-start gap-2.5 p-3 mb-6 text-xs rounded-xl bg-primary/5 border border-primary/20 text-foreground">
          <Scale className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p><span className="font-semibold">Tailored for credit-service businesses.</span> These public bankruptcy filings identify individuals and businesses who may benefit from credit-repair or financial-recovery services. A bankruptcy filing is a factual event — reach out lawfully and never characterize prospects as "high risk" or "credit denied."</p>
        </div>
      ) : customerType && customerType !== "credit_repair" ? (
        <div className="flex items-start gap-2.5 p-3 mb-6 text-xs rounded-xl bg-secondary/15 border border-secondary/30 text-foreground">
          <Info className="w-4 h-4 text-secondary-foreground shrink-0 mt-0.5" />
          <p><span className="font-semibold">Primarily for credit-service companies.</span> Bankruptcy prospects are most relevant to credit-repair and credit-service businesses. You can still search and save these public records, but they may not align with your selected business type. You can update your business type in Account Settings.</p>
        </div>
      ) : null}

      <form onSubmit={runSearch} className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">State (optional)</Label>
            <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">All states</option>
              {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Chapter (optional)</Label>
            <select value={filters.chapter} onChange={e => setFilters({ ...filters, chapter: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              {CHAPTERS.map(c => <option key={c} value={c}>{c === "" ? "All chapters" : `Chapter ${c}`}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Filed after</Label>
            <Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="h-10" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Filed before (optional)</Label>
            <Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="h-10" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5"><Scale className="w-3.5 h-3.5" /> Source: CourtListener RECAP — recent public bankruptcy dockets</p>
          <Button type="submit" className="h-10" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-2" /> Search</>}
          </Button>
        </div>
      </form>

      {searched && (
        <div>
          {error && <div className="flex items-center gap-2 p-4 mb-4 text-sm text-destructive bg-destructive/5 rounded-xl"><AlertCircle className="w-4 h-4" /> {error}</div>}
          {!error && (
            <>
              <p className="text-xs text-muted-foreground mb-3">{loading ? "Searching..." : `${results.length} bankruptcy record${results.length !== 1 ? "s" : ""} found · 0 credits charged`}</p>
              {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
              {!loading && results.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">No bankruptcy filings found. Try broadening your filters (remove the state or chapter filter).</div>
              )}
              {!loading && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {results.map((r, i) => {
                    const k = keyOf(r, i);
                    return (
                      <BankruptcyLeadCard key={k} r={r} k={k} busy={busy} savedLead={savedLeads[k]} enrichmentData={enrichmentData[k]}
                        onSave={onSave} onEnrich={onEnrich} onStar={onStar} onPipeline={onPipeline}
                        onTagsChange={onTagsChange} lists={lists} onCreateList={onCreateList} onListIdsChange={onListIdsChange} />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}