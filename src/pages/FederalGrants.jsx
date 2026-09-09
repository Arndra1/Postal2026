import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Landmark, AlertCircle } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import { findDuplicateLead } from "@/lib/leadDedup";
import UnifiedLeadCard from "@/components/search/UnifiedLeadCard";
import SaveSearchButton from "@/components/search/SaveSearchButton";

const USA_BASE = "https://api.usaspending.gov/api/v2/search/spending_by_award/";

const ALL_STATES = [
  "", "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function FederalGrants() {
  const { user } = useAuth();
  const [keyword, setKeyword] = useState("");
  const [agency, setAgency] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const { toast } = useToast();

  const filters = { keyword, agency, state: stateCode, search_type: "federal_grants" };

  const search = async () => {
    if (!keyword && !agency) {
      toast({ title: "Enter a keyword or agency", variant: "destructive" });
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const body = {
        filters: {
          award_type_codes: ["A", "B", "C", "D"],
          time_period: [{ start_date: "2024-01-01", end_date: new Date().toISOString().slice(0, 10) }],
        },
        fields: ["Award ID", "Recipient Name", "Award Amount", "Start Date", "End Date", "Awarding Agency", "Awarding Sub Agency", "Award Type"],
        sort: "Award Amount",
        order: "desc",
        page: 1,
        limit: 50,
      };
      if (keyword.trim()) body.filters.keywords = [keyword.trim()];
      if (agency.trim()) body.filters.agencies = [{ type: "awarding", tier: "toptier", name: agency.trim() }];

      const ctrl = new AbortController();
      const timeout = setTimeout(() => ctrl.abort(), 20000);
      const resp = await fetch(USA_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timeout);

      if (!resp.ok) {
        setError("USASpending.gov returned an error. Please try again.");
        setLoading(false);
        return;
      }
      const data = await resp.json();
      const raw = data.results || [];
      const mapped = raw.map((r) => ({
        business_name: r["Recipient Name"] || "",
        person_name: "",
        industry: r["Awarding Sub Agency"] || r["Awarding Agency"] || "",
        state: stateCode,
        website: "https://www.usaspending.gov",
        official_record_id: r["Award ID"] || "",
        jurisdiction: "Federal",
        agency: r["Awarding Agency"] || "U.S. Federal Government",
        source: "USASpending.gov",
        source_url: "https://www.usaspending.gov",
        record_type: "federal_grant",
        record_label: "PUBLIC RECORD",
        retrieved_at: new Date().toISOString(),
        extra: {
          award_amount: r["Award Amount"],
          start_date: r["Start Date"],
          end_date: r["End Date"],
          award_type: r["Award Type"],
          sub_agency: r["Awarding Sub Agency"],
        },
      }));

      // Duplicate detection against saved leads
      const saved = await base44.entities.Lead.filter({ user_id: user.id, saved: true });
      const savedIdSet = new Set(saved.map((s) => (s.official_record_id || "").toLowerCase()).filter(Boolean));
      const mappedWithDupes = mapped.map((r) => ({ ...r, possible_duplicate: r.official_record_id && savedIdSet.has(r.official_record_id.toLowerCase()) }));
      setResults(mappedWithDupes);
      setSavedIds(savedIdSet);
    } catch (e) {
      if (e.name === "AbortError") setError("Search timed out. Please try a more specific keyword.");
      else setError("Source temporarily unavailable. Please try again.");
    }
    setLoading(false);
  };

  const saveLead = async (r) => {
    const dup = await findDuplicateLead(user.id, r);
    if (dup) {
      toast({ title: "Lead already saved", description: "This lead is already in your saved leads.", variant: "destructive" });
      return;
    }
    const lead = {
      user_id: user.id,
      business_name: r.business_name || "",
      person_name: r.person_name || "",
      industry: r.industry || r.extra?.sub_agency || "",
      state: r.state || "",
      website: r.website || "",
      official_record_id: r.official_record_id || "",
      jurisdiction: r.jurisdiction || "Federal",
      agency: r.agency || "",
      source_reference: r.source_url || "",
      source_category: "government_open_data",
      record_label: "PUBLIC RECORD",
      retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
      original_public_fields: r.extra || {},
      lead_type: "business",
      event_type: "other",
      saved: true,
      pipeline_status: "new",
    };
    await base44.entities.Lead.create(lead);
    setSavedIds((prev) => new Set(prev).add((r.official_record_id || "").toLowerCase()));
    toast({ title: "Lead saved!", description: r.business_name || "Lead added to your saved leads." });
  };

  return (
    <div>
      <PageHeader title="Federal Grants & Contracts" subtitle="Search USASpending.gov for federal award recipients — grants, contracts, and assistance." action={
        <SaveSearchButton searchType="federal_grants" filters={filters} disabled={results.length === 0} />
      } />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="glass-panel p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="keyword">Keyword or recipient name</Label>
            <Input id="keyword" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. renewable energy" className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <div>
            <Label htmlFor="agency">Awarding agency (optional)</Label>
            <Input id="agency" value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="e.g. Department of Defense" className="mt-1.5" onKeyDown={(e) => e.key === "Enter" && search()} />
          </div>
          <div>
            <Label htmlFor="state">State (optional)</Label>
            <select id="state" value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
              {ALL_STATES.map((s) => <option key={s} value={s}>{s || "All states"}</option>)}
            </select>
          </div>
        </div>
        <Button onClick={search} disabled={loading} className="mt-4">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {loading ? "Searching..." : "Search Awards"}
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
            <h2 className="font-heading text-lg font-semibold">{results.length} Federal Award{results.length !== 1 ? "s" : ""}</h2>
            <span className="text-xs text-muted-foreground ml-auto">Source: USASpending.gov · PUBLIC RECORD</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <UnifiedLeadCard
                key={r.official_record_id || i}
                r={r}
                k={`fg-${i}`}
                busy={{}}
                savedLead={savedIds.has((r.official_record_id || "").toLowerCase()) ? { id: r.official_record_id } : null}
                onSave={saveLead}
                hideEnrich={true}
                onStar={() => {}}
                onPipeline={() => {}}
                onTagsChange={() => {}}
              />
            ))}
          </div>
        </>
      )}

      {!loading && !error && results.length === 0 && (
        <div className="glass-panel p-16 text-center">
          <Landmark className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">Search federal awards</h3>
          <p className="text-sm text-muted-foreground">Find federal grant and contract recipients from USASpending.gov. Enter a keyword to start.</p>
        </div>
      )}
    </div>
  );
}