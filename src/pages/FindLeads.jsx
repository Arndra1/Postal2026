import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertCircle } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import PublicLeadRow from "@/components/leads/PublicLeadRow";

const TABS = [
  { key: "government_open_data", label: "Government Open Data", hint: "FEC registered entities (Data.gov)" },
  { key: "public_records", label: "Public Records", hint: "Court dockets & parties (CourtListener)" },
  { key: "market_intelligence", label: "Market Intelligence", hint: "Business counts by county (Census)" },
  { key: "geographic", label: "Geographic", hint: "Metro market areas (HUD)" },
  { key: "new_businesses", label: "New Businesses", hint: "Official state registries" },
];

const INDUSTRIES = ["All", "Agriculture", "Mining", "Utilities", "Construction", "Manufacturing", "Wholesale", "Retail", "Transportation", "Information", "Finance", "Real Estate", "Professional", "Management", "Administrative", "Education", "Healthcare", "Arts", "Accommodation", "Other", "Public Admin"];

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export default function FindLeads() {
  const { user } = useAuth();
  const [tab, setTab] = useState("government_open_data");
  const [query, setQuery] = useState({ business_name: "", person_name: "", city: "", state: "", industry: "All" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [savedLeads, setSavedLeads] = useState({});

  const isNB = tab === "new_businesses";

  const keyOf = (r, i) => `${r.official_record_id || r.business_name || ""}|${i}`;

  const runSearch = async (e) => {
    e?.preventDefault();
    setLoading(true); setError(""); setResults([]); setSearched(true);
    try {
      const res = await base44.functions.invoke("searchPublicLeads", { category: tab, ...query });
      const d = res.data;
      if (d.status === "success") setResults(d.results || []);
      else setError(d.error || "No results found.");
    } catch (_e) {
      setError("Source temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const onSave = async (r) => {
    const i = results.indexOf(r);
    const k = keyOf(r, i);
    setBusy((b) => ({ ...b, [k]: "saving" }));
    try {
      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        business_name: r.business_name, person_name: r.person_name, city: r.city,
        state: r.state, industry: r.industry, job_title: r.job_title,
        address: r.address, website: r.website || "",
        official_record_id: r.official_record_id, jurisdiction: r.jurisdiction,
        agency: r.agency, source_reference: r.source_url, source_category: tab,
        record_label: r.record_label || "PUBLIC RECORD",
        retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
        original_public_fields: r,
        saved: true, contact_status: "unverified", pipeline_status: "new",
      });
      setSavedLeads((s) => ({ ...s, [k]: lead }));
      setBusy((b) => ({ ...b, [k]: "saved" }));
    } catch (_e) {
      setBusy((b) => ({ ...b, [k]: "error" }));
    }
  };

  const onEnrich = async (r) => {
    const i = results.indexOf(r);
    const k = keyOf(r, i);
    const ke = k + "e";
    setBusy((b) => ({ ...b, [ke]: "loading" }));
    try {
      let leadId = savedLeads[k]?.id;
      if (!leadId) {
        const lead = await base44.entities.Lead.create({
          user_id: user.id,
          business_name: r.business_name, person_name: r.person_name, city: r.city,
          state: r.state, industry: r.industry, job_title: r.job_title, address: r.address, website: r.website || "",
          official_record_id: r.official_record_id, jurisdiction: r.jurisdiction, agency: r.agency,
          source_reference: r.source_url, source_category: tab, record_label: r.record_label || "PUBLIC RECORD",
          retrieval_timestamp: r.retrieved_at || new Date().toISOString(), original_public_fields: r,
          saved: true, contact_status: "unverified", pipeline_status: "new",
        });
        leadId = lead.id;
        setSavedLeads((s) => ({ ...s, [k]: lead }));
      }
      const res = await base44.functions.invoke("enrichLead", {
        lead_id: leadId,
        inputs: { person_name: r.person_name, business_name: r.business_name, website: r.website, job_title: r.job_title, city: r.city, state: r.state },
      });
      setBusy((b) => ({ ...b, [ke]: res.data.status === "success" ? "enriched" : "failed" }));
    } catch (_e) {
      setBusy((b) => ({ ...b, [ke]: "failed" }));
    }
  };

  const onStar = async (leadId, starred) => {
    try {
      await base44.entities.Lead.update(leadId, { starred });
      setSavedLeads((s) => {
        const next = { ...s };
        for (const k in next) if (next[k].id === leadId) next[k] = { ...next[k], starred };
        return next;
      });
    } catch (_e) {}
  };

  const onPipeline = async (leadId, status) => {
    try {
      await base44.entities.Lead.update(leadId, { pipeline_status: status });
      setSavedLeads((s) => {
        const next = { ...s };
        for (const k in next) if (next[k].id === leadId) next[k] = { ...next[k], pipeline_status: status };
        return next;
      });
    } catch (_e) {}
  };

  const field = (key, label, placeholder) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={query[key]} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} placeholder={placeholder} className="h-10" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Find Leads" subtitle="Search real public-data sources. All discovery & organizing actions are free — only successful enrichment costs 5 credits." />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setResults([]); setSearched(false); setError(""); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            title={t.hint}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form onSubmit={runSearch} className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isNB ? (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State</Label>
              <select value={query.state} onChange={(e) => setQuery({ ...query, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="">All states</option>
                {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ) : (
            <>
              {field("business_name", "Business Name", "Acme Corp")}
              {field("person_name", "Person Name", "Jane Doe")}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">State</Label>
                <select value={query.state} onChange={(e) => setQuery({ ...query, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All</option>
                  {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Industry (Census)</Label>
                <select value={query.industry} onChange={(e) => setQuery({ ...query, industry: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {INDUSTRIES.map((i) => <option key={i}>{i}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{TABS.find((t) => t.key === tab)?.hint}</span>
          <Button type="submit" className="h-10" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Searching...</> : <><Search className="w-4 h-4 mr-2" /> Search</>}
          </Button>
        </div>
      </form>

      {searched && (
        <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
          {error && (
            <div className="flex items-center gap-2 p-4 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" /> {error}
            </div>
          )}
          {!error && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="text-left font-medium px-5 py-3">Record</th>
                    <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Industry</th>
                    <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Jurisdiction</th>
                    <th className="text-left font-medium px-5 py-3">Pipeline</th>
                    <th className="text-right font-medium px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && !loading && (
                    <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No records returned. Try broadening your search.</td></tr>
                  )}
                  {results.map((r, i) => {
                    const k = keyOf(r, i);
                    return (
                      <PublicLeadRow
                        key={k}
                        r={r}
                        k={k}
                        busy={busy}
                        savedLead={savedLeads[k]}
                        onSave={onSave}
                        onEnrich={onEnrich}
                        onStar={onStar}
                        onPipeline={onPipeline}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="px-5 py-2.5 border-t border-border text-xs text-muted-foreground">
            Public-data search, viewing, saving, tagging, lists, notes & pipeline = 0 credits · Successful enrichment = 5 credits
          </div>
        </div>
      )}
    </div>
  );
}