import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Eye, Sparkles, Save, Loader2, Check, X } from "lucide-react";

const industries = ["Technology", "Consulting", "Finance", "Healthcare", "Marketing", "Real Estate", "Manufacturing", "Retail", "Education", "Other"];

// Mock lead search generator. Replace with a real search provider when connected.
function generateResults(q) {
  const base = [
    { person_name: "Jordan Avery", business_name: "Northwind Consulting", city: "San Francisco", state: "CA", industry: "Consulting", job_title: "Director of Operations", website: "northwindco.com" },
    { person_name: "Maya Chen", business_name: "Brightline Labs", city: "Austin", state: "TX", industry: "Technology", job_title: "VP of Sales", website: "brightlinelabs.com" },
    { person_name: "Priya Raman", business_name: "Lumen Health", city: "Boston", state: "MA", industry: "Healthcare", job_title: "CEO", website: "lumenhealth.io" },
    { person_name: "Dana Whitfield", business_name: "Whitfield & Co", city: "New York", state: "NY", industry: "Finance", job_title: "Managing Partner", website: "whitfieldco.com" },
    { person_name: "Sofia Marchetti", business_name: "Marchetti Media", city: "Chicago", state: "IL", industry: "Marketing", job_title: "Founder", website: "marchettimedia.com" },
    { person_name: "Aaliyah Brooks", business_name: "Brooks Realty Group", city: "Atlanta", state: "GA", industry: "Real Estate", job_title: "Broker", website: "brooksrealty.com" },
    { person_name: "Hannah Okafor", business_name: "Verdant Manufacturing", city: "Denver", state: "CO", industry: "Manufacturing", job_title: "COO", website: "verdantmfg.com" },
    { person_name: "Leah Sutherland", business_name: "Northgate Retail", city: "Seattle", state: "WA", industry: "Retail", job_title: "Head of Growth", website: "northgateretail.com" },
  ];
  let results = base;
  if (q.person_name) results = results.filter(r => r.person_name.toLowerCase().includes(q.person_name.toLowerCase()));
  if (q.business_name) results = results.filter(r => r.business_name.toLowerCase().includes(q.business_name.toLowerCase()));
  if (q.city) results = results.filter(r => r.city.toLowerCase().includes(q.city.toLowerCase()));
  if (q.state) results = results.filter(r => r.state.toLowerCase().includes(q.state.toLowerCase()));
  if (q.industry && q.industry !== "All") results = results.filter(r => r.industry === q.industry);
  if (q.job_title) results = results.filter(r => r.job_title.toLowerCase().includes(q.job_title.toLowerCase()));
  if (q.website) results = results.filter(r => r.website.toLowerCase().includes(q.website.toLowerCase()));
  return results.map(r => ({ ...r, contact_status: "unknown" }));
}

export default function FindLeads() {
  const { user } = useAuth();
  const [query, setQuery] = useState({ person_name: "", business_name: "", city: "", state: "", industry: "All", job_title: "", website: "" });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState({});
  const pageSize = 6;

  const runSearch = (e) => {
    e?.preventDefault();
    setResults(generateResults(query));
    setSearched(true);
    setPage(1);
  };

  const paged = results.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));

  const saveLead = async (r) => {
    setBusy(b => ({ ...b, [r.person_name + r.business_name]: "saving" }));
    try {
      await base44.entities.Lead.create({ ...r, user_id: user.id, saved: true });
      setBusy(b => ({ ...b, [r.person_name + r.business_name]: "saved" }));
      setTimeout(() => setBusy(b => ({ ...b, [r.person_name + r.business_name]: undefined })), 1500);
    } catch (_e) {
      setBusy(b => ({ ...b, [r.person_name + r.business_name]: "error" }));
    }
  };

  const enrichLead = async (r) => {
    setBusy(b => ({ ...b, [r.person_name + r.business_name + "e"]: "loading" }));
    try {
      const lead = await base44.entities.Lead.create({ ...r, user_id: user.id, saved: false });
      const res = await base44.functions.invoke("enrichLead", { lead_id: lead.id, inputs: { person_name: r.person_name, business_name: r.business_name, website: r.website, job_title: r.job_title, city: r.city, state: r.state } });
      setBusy(b => ({ ...b, [r.person_name + r.business_name + "e"]: res.data.status === "success" ? "enriched" : "failed" }));
      setTimeout(() => setBusy(b => ({ ...b, [r.person_name + r.business_name + "e"]: undefined })), 2000);
    } catch (_e) {
      setBusy(b => ({ ...b, [r.person_name + r.business_name + "e"]: "failed" }));
    }
  };

  const field = (key, label, placeholder) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input value={query[key]} onChange={(e) => setQuery({ ...query, [key]: e.target.value })} placeholder={placeholder} className="h-10" />
    </div>
  );

  return (
    <div>
      <PageHeader title="Find Leads" subtitle="Discover leads by person, business, industry, and location." />

      <form onSubmit={runSearch} className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {field("person_name", "Person Name", "Jordan Avery")}
          {field("business_name", "Business Name", "Northwind Consulting")}
          {field("city", "City", "San Francisco")}
          {field("state", "State", "CA")}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Industry</Label>
            <select value={query.industry} onChange={(e) => setQuery({ ...query, industry: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option>All</option>
              {industries.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          {field("job_title", "Job Title", "VP of Sales")}
          {field("website", "Website", "northwindco.com")}
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" className="h-10"><Search className="w-4 h-4 mr-2" /> Search Leads</Button>
        </div>
      </form>

      {searched && (
        <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Company</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">City</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">State</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Industry</th>
                  <th className="text-left font-medium px-5 py-3 hidden xl:table-cell">Job Title</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 && <tr><td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">No leads match your search. Try broadening your criteria.</td></tr>}
                {paged.map((r) => {
                  const k = r.person_name + r.business_name;
                  return (
                    <tr key={k} className="border-t border-border hover:bg-muted/30">
                      <td className="px-5 py-3 font-medium">{r.person_name}</td>
                      <td className="px-5 py-3">{r.business_name}</td>
                      <td className="px-5 py-3 hidden md:table-cell">{r.city}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">{r.state}</td>
                      <td className="px-5 py-3 hidden lg:table-cell">{r.industry}</td>
                      <td className="px-5 py-3 hidden xl:table-cell">{r.job_title}</td>
                      <td className="px-5 py-3"><StatusBadge status={r.contact_status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" title="View"><Eye className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => enrichLead(r)} disabled={busy[k + "e"] === "loading"} title="Enrich">
                            {busy[k + "e"] === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : busy[k + "e"] === "enriched" ? <Check className="w-4 h-4 text-accent" /> : busy[k + "e"] === "failed" ? <X className="w-4 h-4 text-destructive" /> : <Sparkles className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => saveLead(r)} disabled={busy[k] === "saving"} title="Save">
                            {busy[k] === "saving" ? <Loader2 className="w-4 h-4 animate-spin" /> : busy[k] === "saved" ? <Check className="w-4 h-4 text-accent" /> : <Save className="w-4 h-4" />}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {results.length > pageSize && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-border">
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}