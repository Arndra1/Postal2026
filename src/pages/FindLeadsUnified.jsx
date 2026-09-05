import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, AlertCircle, Sparkles, MapPin, Building2, Scale, Heart } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import { MARKETING_NOTICE } from "@/lib/compliance";
import { useToast } from "@/components/ui/use-toast";
import { findDuplicateLead } from "@/lib/leadDedup";
import UnifiedLeadCard from "@/components/search/UnifiedLeadCard";
import NonprofitLeadCard from "@/components/search/NonprofitLeadCard";
import CustomerTypePrompt, { SUGGESTED_SEARCHES } from "@/components/search/CustomerTypePrompt";

const NTEE_GROUPS = [
  { id: "", label: "All categories" },
  { id: 1, label: "Arts, Culture & Humanities" },
  { id: 2, label: "Education" },
  { id: 3, label: "Environment & Animals" },
  { id: 4, label: "Health" },
  { id: 5, label: "Human Services" },
  { id: 6, label: "International, Foreign Affairs" },
  { id: 7, label: "Public, Societal Benefit" },
  { id: 8, label: "Religion Related" },
  { id: 9, label: "Mutual/Membership Benefit" },
  { id: 10, label: "Unknown / Unclassified" },
];

const ALL_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

const LIVE_STATES = [
  { code: "FL", name: "Florida" }, { code: "CT", name: "Connecticut" },
  { code: "NY", name: "New York" }, { code: "PA", name: "Pennsylvania" },
  { code: "CO", name: "Colorado" }, { code: "OR", name: "Oregon" },
  { code: "TX", name: "Texas" }, { code: "IA", name: "Iowa" },
];

// FL adapter fetches a max of 7 work-day files — cannot truthfully serve 30/90-day ranges.
// All other live states use Socrata server-side date filtering (any range works).
const DATE_RANGES_ALL = ["TODAY", "LAST 7 DAYS", "LAST 30 DAYS", "LAST 90 DAYS", "CUSTOM RANGE"];
const FL_ONLY = ["TODAY", "LAST 7 DAYS"];
const COUNTY_STATES = ["PA", "TX"];

const TABS = [
  { key: "new_businesses", label: "New Businesses", icon: Building2, hint: "Recently registered business filings from 8 live state sources" },
  { key: "by_location", label: "By Location", icon: MapPin, hint: "Find businesses by state, city, ZIP, or county" },
  { key: "nonprofits", label: "Nonprofits", icon: Heart, hint: "IRS-registered nonprofits by state and mission category (ProPublica)" },
  { key: "public_records", label: "Public Records", icon: Scale, hint: "Court cases, committee filings & housing records" },
];

const PR_SUBS = [
  { key: "public_records", label: "Court Cases", hint: "Court dockets & parties (CourtListener)" },
  { key: "government_open_data", label: "Committee Filings", hint: "Registered committees (FEC via Data.gov)" },
  { key: "geographic", label: "Housing Records", hint: "Property & housing data (HUD)" },
];

export default function FindLeadsUnified() {
  const { user } = useAuth();
  const location = useLocation();
  const [customerType, setCustomerType] = useState("");
  const [typeDismissed, setTypeDismissed] = useState(false);
  const [tab, setTab] = useState("new_businesses");
  const [prSub, setPrSub] = useState("public_records");
  const [filters, setFilters] = useState({ state: "", dateRange: "LAST 30 DAYS", startDate: "", endDate: "", entityType: "", city: "", zip: "", county: "", nameQuery: "", ntee: "", keyword: "" });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState({});
  const [savedLeads, setSavedLeads] = useState({});
  const [enrichmentData, setEnrichmentData] = useState({});
  const [lists, setLists] = useState([]);
  const { toast } = useToast();

  // Allow deep-linking to a specific tab (e.g. from Need-Oriented Search).
  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
      if (location.state.filters) setFilters(f => ({ ...f, ...location.state.filters }));
    }
  }, [location.state]);

  useEffect(() => {
    base44.auth.me().then(u => setCustomerType(u.customer_type || "")).catch(() => {});
  }, []);
  useEffect(() => {
    if (user) base44.entities.LeadList.filter({ user_id: user.id }).then(setLists).catch(() => {});
  }, [user]);

  // Reset date range when switching to a state that doesn't support it.
  const supportedRanges = filters.state === "FL" ? FL_ONLY : DATE_RANGES_ALL;
  useEffect(() => {
    if (filters.state && !supportedRanges.includes(filters.dateRange)) {
      setFilters(f => ({ ...f, dateRange: supportedRanges[0] }));
    }
  }, [filters.state]);

  const keyOf = (r, i) => `${r.official_record_id || r.business_name || ""}|${i}`;

  const buildSearchPayload = () => {
    if (tab === "nonprofits") {
      return { action: "search", state: filters.state, ntee: filters.ntee, keyword: filters.keyword };
    }
    if (tab === "public_records") {
      const base = { category: prSub };
      if (prSub === "public_records") return { ...base, business_name: filters.nameQuery, state: filters.state };
      if (prSub === "government_open_data") return { ...base, business_name: filters.nameQuery, state: filters.state };
      return { ...base, state: filters.state, city: filters.city };
    }
    // new_businesses and by_location both use the state filing adapters
    return {
      category: "new_businesses",
      state: filters.state,
      dateRange: filters.dateRange,
      startDate: filters.startDate,
      endDate: filters.endDate,
    };
  };

  const runSearch = async (e) => {
    e?.preventDefault();
    if (tab !== "public_records" && tab !== "nonprofits" && !filters.state) {
      setError("Select a state to search live business records.");
      return;
    }
    if (tab === "nonprofits") {
      if (!filters.state && !filters.ntee && !filters.keyword) {
        setError("Enter a keyword, select a state, or choose a category to search nonprofits.");
        return;
      }
      if (filters.ntee) {
        const n = Number(filters.ntee);
        if (isNaN(n) || n < 1 || n > 10) {
          setError("Please select a valid NTEE category (1-10).");
          return;
        }
      }
    }
    setLoading(true); setError(""); setResults([]); setSearched(true);
    try {
      const fnName = tab === "nonprofits" ? "searchNonprofitLeads" : "searchPublicLeads";
      const res = await base44.functions.invoke(fnName, buildSearchPayload());
      const d = res.data;
      if (d.status === "success") setResults(d.results || []);
      else {
        setError("No results found.");
        toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
      }
    } catch (_e) {
      setError("Source temporarily unavailable.");
      toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
    }
    finally { setLoading(false); }
  };

  const onSave = async (r) => {
    const i = results.indexOf(r); const k = keyOf(r, i);
    setBusy(b => ({ ...b, [k]: "saving" }));
    try {
      const dup = await findDuplicateLead(user.id, r);
      if (dup) {
        setSavedLeads(s => ({ ...s, [k]: dup }));
        setBusy(b => ({ ...b, [k]: "saved" }));
        toast({ title: "Already saved", description: "This lead is already in your saved leads." });
        return;
      }
      let personName = r.person_name || r.extra?.officer || r.extra?.registered_agent || "";
      let jobTitle = r.job_title || "";
      let confidence = "";
      let leadAddress = r.address || "";

      // Nonprofit: officer lookup from Form 990 XML before saving (0 credits).
      if (r.record_type === "nonprofit_filing" && r.official_record_id) {
        try {
          const officerRes = await base44.functions.invoke("searchNonprofitLeads", { action: "lookup_officer", ein: r.official_record_id });
          if (officerRes.data.status === "success") {
            if (officerRes.data.officers?.length > 0) {
              personName = officerRes.data.officers[0].name;
              jobTitle = officerRes.data.officers[0].title;
            } else {
              confidence = "no contact name found";
            }
            // Use IRS filing address if the search result didn't have one.
            if (!leadAddress && officerRes.data.financials?.address) {
              leadAddress = officerRes.data.financials.address;
            }
          } else {
            confidence = "no contact name found";
          }
        } catch (_e) {
          confidence = "no contact name found";
        }
      }

      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        business_name: r.business_name, person_name: personName, job_title: jobTitle,
        city: r.city, state: r.state, zip: r.zip, address: leadAddress,
        industry: r.industry || r.extra?.entity_type || "",
        website: r.website || "",
        official_record_id: r.official_record_id, jurisdiction: r.jurisdiction || r.state || "",
        agency: r.agency, source_reference: r.source_url,
        source_category: r.record_type === "nonprofit_filing" ? "nonprofits" : (tab === "public_records" ? prSub : "new_businesses"),
        record_label: r.record_label || "PUBLIC RECORD",
        retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
        original_public_fields: r,
        saved: true, contact_status: "unverified", pipeline_status: "new",
        lead_type: "business",
        event_type: r.record_type === "nonprofit_filing" ? "nonprofit_filing" : "other",
        confidence,
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
        const dup = await findDuplicateLead(user.id, r);
        if (dup) { leadId = dup.id; setSavedLeads(s => ({ ...s, [k]: dup })); }
      }
      if (!leadId) {
        let personName = r.person_name || r.extra?.officer || r.extra?.registered_agent || "";
        let jobTitle = r.job_title || "";
        let confidence = "";
        let leadAddress = r.address || "";

        // Nonprofit: officer lookup before creating the lead (0 credits).
        if (r.record_type === "nonprofit_filing" && r.official_record_id) {
          try {
            const officerRes = await base44.functions.invoke("searchNonprofitLeads", { action: "lookup_officer", ein: r.official_record_id });
            if (officerRes.data.status === "success") {
              if (officerRes.data.officers?.length > 0) {
                personName = officerRes.data.officers[0].name;
                jobTitle = officerRes.data.officers[0].title;
              } else {
                confidence = "no contact name found";
              }
              if (!leadAddress && officerRes.data.financials?.address) {
                leadAddress = officerRes.data.financials.address;
              }
            } else {
              confidence = "no contact name found";
            }
          } catch (_e) {
            confidence = "no contact name found";
          }
        }

        const lead = await base44.entities.Lead.create({
          user_id: user.id,
          business_name: r.business_name, person_name: personName, job_title: jobTitle,
          city: r.city, state: r.state, zip: r.zip, address: leadAddress,
          industry: r.industry || r.extra?.entity_type || "",
          official_record_id: r.official_record_id, agency: r.agency, source_reference: r.source_url,
          source_category: r.record_type === "nonprofit_filing" ? "nonprofits" : (tab === "public_records" ? prSub : "new_businesses"),
          record_label: r.record_label || "PUBLIC RECORD",
          retrieval_timestamp: r.retrieved_at || new Date().toISOString(),
          original_public_fields: r, saved: true, contact_status: "unverified", pipeline_status: "new",
          lead_type: "business",
          event_type: r.record_type === "nonprofit_filing" ? "nonprofit_filing" : "other",
          confidence,
        });
        leadId = lead.id; setSavedLeads(s => ({ ...s, [k]: lead }));
      }
      const inputs = {
        business_name: r.business_name,
        person_name: savedLeads[k]?.person_name || r.person_name || r.extra?.officer || r.extra?.registered_agent || "",
        city: r.city, state: r.state, zip: r.zip, address: r.address,
        website: r.website || "", job_title: savedLeads[k]?.job_title || r.job_title || "",
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

  const selectCustomerType = async (val) => {
    setCustomerType(val);
    setTypeDismissed(false);
    try { await base44.auth.updateMe({ customer_type: val }); } catch (_e) {}
  };

  // Client-side post-filters (entity type, city, ZIP, county) — state filings only
  const filtered = isNonprofit ? results : results.filter(r => {
    const et = (r.extra?.entity_type || r.industry || "").toLowerCase();
    const city = (r.city || "").toLowerCase();
    const zip = (r.zip || "").toLowerCase();
    const county = (r.extra?.county || "").toLowerCase();
    if (filters.entityType && !et.includes(filters.entityType.toLowerCase())) return false;
    if (filters.city && !city.includes(filters.city.toLowerCase())) return false;
    if (filters.zip && !zip.includes(filters.zip.toLowerCase())) return false;
    if (filters.county && !county.includes(filters.county.toLowerCase())) return false;
    return true;
  });

  const showCustomerPrompt = !customerType && !typeDismissed;
  const suggestions = SUGGESTED_SEARCHES[customerType] || [];
  const isStateFiling = tab === "new_businesses" || tab === "by_location";
  const isNonprofit = tab === "nonprofits";
  const showCounty = isStateFiling && COUNTY_STATES.includes(filters.state);

  const applySuggestion = (s) => {
    setTab(s.tab);
    if (s.filters) setFilters(f => ({ ...f, ...s.filters, state: s.filters.state || f.state }));
  };

  return (
    <div>
      <PageHeader title="Find Leads" subtitle="Discover prospects across public records and state registries. All discovery is free — only successful contact enrichment costs 5 credits." />

      <ComplianceBanner text={isNonprofit
        ? "Nonprofit data is from public IRS Form 990 filings via ProPublica Nonprofit Explorer. Revenue and financial figures are shown as informational context only — not as indicators of creditworthiness, financial health, or eligibility. Do not characterize prospects in credit-decision terms."
        : MARKETING_NOTICE} />

      {showCustomerPrompt && <CustomerTypePrompt onSelect={selectCustomerType} onDismiss={() => setTypeDismissed(true)} />}

      {customerType && suggestions.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground mb-2">Suggested for your business type:</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button key={i} onClick={() => applySuggestion(s)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/8 text-primary border border-primary/20 hover:bg-primary/12 transition">
                <Sparkles className="w-3 h-3" /> {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mb-5">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setResults([]); setSearched(false); setError(""); }}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
            title={t.hint}>
            <t.icon className="w-4 h-4 inline mr-1.5" />{t.label}
          </button>
        ))}
      </div>

      {tab === "public_records" && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {PR_SUBS.map(s => (
            <button key={s.key} onClick={() => { setPrSub(s.key); setResults([]); setSearched(false); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${prSub === s.key ? "bg-secondary/20 text-secondary-foreground border border-secondary/40" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              title={s.hint}>
              {s.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={runSearch} className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isNonprofit ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Keyword</Label>
                <Input value={filters.keyword} onChange={e => setFilters({ ...filters, keyword: e.target.value })} placeholder="e.g. cancer, youth, housing" className="h-10" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">State (optional)</Label>
                <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">All states</option>
                  {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Category (NTEE)</Label>
                <select value={filters.ntee} onChange={e => setFilters({ ...filters, ntee: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {NTEE_GROUPS.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
                </select>
              </div>
            </>
          ) : isStateFiling ? (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">State</Label>
                <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Select a state</option>
                  {LIVE_STATES.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name} · LIVE</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Formation Date</Label>
                <select value={filters.dateRange} onChange={e => setFilters({ ...filters, dateRange: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" disabled={!filters.state}>
                  {supportedRanges.map(d => <option key={d} value={d}>{d === "CUSTOM RANGE" ? "CUSTOM" : d}</option>)}
                </select>
                {filters.state === "FL" && <p className="text-[10px] text-amber-600">FL supports Today & Last 7 Days (daily filing files).</p>}
              </div>
              {filters.dateRange === "CUSTOM RANGE" && (
                <>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">From</Label>
                    <Input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="h-10" disabled={!filters.state} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">To</Label>
                    <Input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="h-10" disabled={!filters.state} />
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{prSub === "geographic" ? "State (optional)" : "Name / Party"}</Label>
                {prSub === "geographic" ? (
                  <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">All states</option>
                    {LIVE_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                    {["AL","AK","AZ","AR","CA","DE","DC","GA","HI","ID","IL","IN","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NC","ND","OH","OK","RI","SC","SD","TN","UT","VT","VA","WA","WV","WI","WY"].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <Input value={filters.nameQuery} onChange={e => setFilters({ ...filters, nameQuery: e.target.value })} placeholder="Search name..." className="h-10" />
                )}
              </div>
              {prSub !== "geographic" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">State (optional)</Label>
                  <select value={filters.state} onChange={e => setFilters({ ...filters, state: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">All</option>
                    {LIVE_STATES.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
                  </select>
                </div>
              )}
            </>
          )}
        </div>

        {/* Client-side post-filters for state filings */}
        {isStateFiling && filters.state && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Entity Type (filter)</Label>
              <Input value={filters.entityType} onChange={e => setFilters({ ...filters, entityType: e.target.value })} placeholder="e.g. LLC, Corp" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City (filter)</Label>
              <Input value={filters.city} onChange={e => setFilters({ ...filters, city: e.target.value })} placeholder="e.g. Philadelphia" className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">ZIP (filter)</Label>
              <Input value={filters.zip} onChange={e => setFilters({ ...filters, zip: e.target.value })} placeholder="e.g. 19103" className="h-9 text-sm" />
            </div>
            {showCounty && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">County (filter)</Label>
                <Input value={filters.county} onChange={e => setFilters({ ...filters, county: e.target.value })} placeholder="e.g. Philadelphia" className="h-9 text-sm" />
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{TABS.find(t => t.key === tab)?.hint}</p>
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
              <p className="text-xs text-muted-foreground mb-3">{loading ? "Searching..." : `${filtered.length} record${filtered.length !== 1 ? "s" : ""} found · All public searches = 0 credits`}</p>
              {loading && <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
              {!loading && filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">No records found. Try broadening your filters.</div>
              )}
              {!loading && (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map((r, i) => {
                    const k = keyOf(r, i);
                    const Card = isNonprofit ? NonprofitLeadCard : UnifiedLeadCard;
                    return (
                      <Card key={k} r={r} k={k} busy={busy} savedLead={savedLeads[k]} enrichmentData={enrichmentData[k]}
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