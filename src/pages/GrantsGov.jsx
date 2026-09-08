import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Landmark, AlertCircle, ExternalLink, Calendar, Building2 } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";

const STATUS_OPTIONS = [
  { value: "posted|forecasted", label: "Open & Forecasted" },
  { value: "posted", label: "Posted" },
  { value: "forecasted", label: "Forecasted" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

export default function GrantsGov() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [agency, setAgency] = useState("");
  const [oppStatuses, setOppStatuses] = useState("posted|forecasted");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const [savingId, setSavingId] = useState(null);
  const { toast } = useToast();

  const search = async () => {
    if (!keyword && !agency) {
      toast({ title: "Enter a keyword or agency", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const resp = await base44.functions.invoke("searchGrantsGov", {
        keyword: keyword.trim(),
        agencies: agency.trim(),
        oppStatuses,
      });
      if (resp.data.status === "failed") {
        setError(resp.data.error || "Grants.gov is temporarily unavailable.");
      } else {
        setResults(resp.data.results || []);
        const saved = (resp.data.results || []).filter((r) => r.possible_duplicate).map((r) => r.opportunity_id);
        setSavedIds(new Set(saved));
      }
    } catch (e) {
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const saveOpportunity = async (r) => {
    setSavingId(r.opportunity_id);
    try {
      await base44.entities.GrantOpportunity.create({
        user_id: user.id,
        opportunity_id: r.opportunity_id,
        opportunity_number: r.opportunity_number,
        title: r.title,
        agency_code: r.agency_code,
        agency_name: r.agency_name,
        open_date: r.open_date,
        close_date: r.close_date,
        opportunity_status: r.opportunity_status,
        doc_type: r.doc_type,
        aln_codes: r.aln_codes || [],
        funding_categories: r.funding_categories || [],
        funding_instruments: r.funding_instruments || [],
        saved: true,
      });
      setSavedIds((prev) => new Set(prev).add(r.opportunity_id));
      toast({ title: "Opportunity saved!", description: r.title });
    } catch (e) {
      toast({ title: "Failed to save", variant: "destructive" });
    }
    setSavingId(null);
  };

  return (
    <div>
      <PageHeader title="Grants.gov Opportunities" subtitle="Search federal grant opportunities from Grants.gov — open programs available for application." />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="glass-panel p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="keyword">Keyword</Label>
            <Input id="keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. renewable energy" className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <div>
            <Label htmlFor="agency">Agency code (optional)</Label>
            <Input id="agency" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. HHS, NSF, DOE" className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <div>
            <Label htmlFor="status">Opportunity status</Label>
            <select id="status" value={oppStatuses} onChange={(e) => setOppStatuses(e.target.value)} className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={search} disabled={loading} className="mt-4">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {loading ? "Searching..." : "Search Opportunities"}
        </Button>
      </div>

      {error && (
        <div className="glass-panel p-4 mb-6 border-l-4 border-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Landmark className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">{results.length} Grant Opportunity{results.length !== 1 ? "ies" : "y"}</h2>
            <span className="text-xs text-muted-foreground ml-auto">Source: Grants.gov · PUBLIC RECORD</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => {
              const isSaved = savedIds.has(r.opportunity_id);
              return (
                <div key={r.opportunity_id || i} className="glass-card p-5 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-heading text-sm font-semibold line-clamp-2">{r.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${r.opportunity_status === "posted" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      {r.opportunity_status}
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    <div className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> {r.agency_name || r.agency_code}</div>
                    {r.open_date && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Open: {r.open_date}</div>}
                    {r.close_date && <div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Close: {r.close_date}</div>}
                    {r.opportunity_number && <div className="text-muted-foreground/70">#{r.opportunity_number}</div>}
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button size="sm" variant={isSaved ? "secondary" : "default"} disabled={isSaved || savingId === r.opportunity_id} onClick={() => saveOpportunity(r)} className="flex-1">
                      {savingId === r.opportunity_id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                      {isSaved ? "Saved" : "Save"}
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={r.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="glass-panel p-16 text-center">
          <Landmark className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">Search federal grant opportunities</h3>
          <p className="text-sm text-muted-foreground">Find open grant programs from Grants.gov. Enter a keyword to start.</p>
        </div>
      )}
    </div>
  );
}