import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertCircle, FileWarning, DollarSign, MapPin } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import { findDuplicateLead } from "@/lib/leadDedup";
import UnifiedLeadCard from "@/components/search/UnifiedLeadCard";
import SaveSearchButton from "@/components/search/SaveSearchButton";

const STATES = [
  { code: "", label: "All States" },
  { code: "NY", label: "New York" },
  { code: "CA", label: "California" },
  { code: "SC", label: "South Carolina" },
];

const LIST_TYPES = [
  { value: "individuals", label: "Individuals" },
  { value: "businesses", label: "Businesses" },
];

export default function TaxDelinquent() {
  const { user } = useAuth();
  const [state, setState] = useState("");
  const [listType, setListType] = useState("individuals");
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedIds, setSavedIds] = useState(new Set());
  const [busySaving, setBusySaving] = useState({});
  const { toast } = useToast();

  const filters = { state, listType, keyword, search_type: "public_records" };

  const search = async () => {
    setLoading(true);
    setError("");
    setErrors([]);
    setResults([]);
    try {
      const response = await base44.functions.invoke("searchTaxDelinquent", {
        state,
        listType,
        keyword,
      });
      const data = response.data || response;
      if (data.status === "failed") {
        setError(data.error || "Search failed.");
      } else {
        setResults(data.results || []);
        setErrors(data.errors || []);
        // Pre-populate saved IDs from possible_duplicate flags
        const savedSet = new Set();
        for (const r of (data.results || [])) {
          if (r.possible_duplicate && r.official_record_id) {
            savedSet.add(r.official_record_id.toLowerCase());
          }
        }
        setSavedIds(savedSet);
      }
    } catch (e) {
      setError("Search failed. Please try again.");
    }
    setLoading(false);
  };

  const saveLead = async (r) => {
    setBusySaving((prev) => ({ ...prev, [r.official_record_id]: true }));
    try {
      const dup = await findDuplicateLead(user.id, r);
      if (dup) {
        toast({ title: "Lead already saved", description: "This lead is already in your saved leads.", variant: "destructive" });
        setBusySaving((prev) => ({ ...prev, [r.official_record_id]: false }));
        return;
      }
      const isBusiness = !!(r.business_name);
      const lead = {
        user_id: user.id,
        business_name: r.business_name || "",
        person_name: r.person_name || "",
        state: r.state || "",
        city: r.city || "",
        address: r.address || r.extra?.street || "",
        zip: r.zip || "",
        official_record_id: r.official_record_id || "",
        jurisdiction: r.jurisdiction || "",
        agency: r.agency || "",
        source_reference: r.source_url || "",
        source_category: "public_records",
        record_label: "PUBLIC RECORD",
        retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
        original_public_fields: {
          ...r.extra,
          source: r.source,
          source_url: r.source_url,
          record_type: r.record_type,
        },
        lead_type: isBusiness ? "business" : "person",
        event_type: "other",
        saved: true,
        pipeline_status: "new",
      };
      await base44.entities.Lead.create(lead);
      setSavedIds((prev) => new Set(prev).add((r.official_record_id || "").toLowerCase()));
      toast({ title: "Lead saved!", description: r.business_name || r.person_name || "Lead added to your saved leads." });
    } catch (e) {
      toast({ title: "Failed to save lead", variant: "destructive" });
    }
    setBusySaving((prev) => ({ ...prev, [r.official_record_id]: false }));
  };

  return (
    <div>
      <PageHeader
        title="Tax-Delinquent Taxpayers"
        subtitle="Search published Top Delinquent Taxpayer lists from NY, CA, and SC. This is separate from Tax Liens (a different category). PUBLIC RECORD."
        action={
          <SaveSearchButton searchType="public_records" filters={filters} disabled={results.length === 0} />
        }
      />

      <ComplianceBanner text={MARKETING_NOTICE} />

      <div className="glass-panel p-5 mb-6">
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="state">State</Label>
            <select
              id="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="listType">List type</Label>
            <select
              id="listType"
              value={listType}
              onChange={(e) => setListType(e.target.value)}
              className="mt-1.5 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              {LIST_TYPES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="keyword">Filter by name (optional)</Label>
            <Input
              id="keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. Smith"
              className="mt-1.5"
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
        </div>
        <Button onClick={search} disabled={loading} className="mt-4">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
          {loading ? "Searching..." : "Search Delinquent Taxpayers"}
        </Button>
      </div>

      {error && (
        <div className="glass-panel p-4 mb-6 border-l-4 border-destructive flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      )}

      {errors.length > 0 && (
        <div className="space-y-2 mb-6">
          {errors.map((err, i) => (
            <div key={i} className="glass-panel p-3 border-l-4 border-amber-400 flex items-center gap-3">
              <FileWarning className="w-4 h-4 text-amber-500 shrink-0" />
              <div className="text-sm">
                <span className="font-medium">{err.state}:</span>{" "}
                <span className="text-muted-foreground">{err.error}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-lg font-semibold">
              {results.length} Tax-Delinquent Taxpayer{results.length !== 1 ? "s" : ""}
            </h2>
            <span className="text-xs text-muted-foreground ml-auto">PUBLIC RECORD · State Revenue Departments</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {results.map((r, i) => (
              <UnifiedLeadCard
                key={r.official_record_id || i}
                r={r}
                k={`td-${i}`}
                busy={busySaving}
                savedLead={savedIds.has((r.official_record_id || "").toLowerCase()) ? { id: r.official_record_id } : null}
                onSave={saveLead}
                onEnrich={() => {}}
                onStar={() => {}}
                onPipeline={() => {}}
                onTagsChange={() => {}}
              />
            ))}
          </div>
        </>
      )}

      {!loading && !error && results.length === 0 && errors.length === 0 && (
        <div className="glass-panel p-16 text-center">
          <MapPin className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">Search tax-delinquent taxpayers</h3>
          <p className="text-sm text-muted-foreground">
            Find published Top Delinquent Taxpayers from New York, California, and South Carolina. Select a state and list type to start.
          </p>
        </div>
      )}
    </div>
  );
}