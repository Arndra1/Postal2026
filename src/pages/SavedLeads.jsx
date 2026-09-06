import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Download, Eye, Sparkles, Loader2, Check, Star } from "lucide-react";
import ComplianceBanner from "@/components/ComplianceBanner";
import FreshnessBadge from "@/components/leads/FreshnessBadge";
import { useToast } from "@/components/ui/use-toast";
import { MARKETING_NOTICE, ACCURACY_NOTICE } from "@/lib/compliance";
import LeadDetailPanel from "@/components/leads/LeadDetailPanel";

export default function SavedLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sort, setSort] = useState("created_date");
  const [busy, setBusy] = useState({});
  const [detail, setDetail] = useState(null);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.Lead.filter({ user_id: user.id, saved: true }).then((res) => {
      setLeads(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = leads;
    if (search) {
      const s = search.toLowerCase();
      r = r.filter(l => [l.person_name, l.business_name, l.email, l.city, l.state, l.industry].some(v => (v || "").toLowerCase().includes(s)));
    }
    if (statusFilter !== "All") r = r.filter(l => l.enrichment_status === statusFilter);
    r = r.slice().sort((a, b) => {
      if (sort === "created_date") return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      if (sort === "name") return (a.person_name || "").localeCompare(b.person_name || "");
      if (sort === "company") return (a.business_name || "").localeCompare(b.business_name || "");
      return 0;
    });
    return r;
  }, [leads, search, statusFilter, sort]);

  const remove = async (id) => {
    await base44.entities.Lead.delete(id);
    load();
  };

  const updateLead = async (id, partial) => {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...partial } : l)));
    await base44.entities.Lead.update(id, partial);
  };

  const enrich = async (l) => {
    setBusy(b => ({ ...b, [l.id]: "loading" }));
    try {
      const res = await base44.functions.invoke("enrichLead", { lead_id: l.id, inputs: { person_name: l.person_name, business_name: l.business_name, website: l.website, city: l.city, state: l.state, email: l.email, phone: l.phone } });
      if (res.data.status === "provider_error") {
        toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
      }
      setBusy(b => ({ ...b, [l.id]: res.data.status === "success" ? "enriched" : "failed" }));
      if (res.data.status === "success") load();
    } catch (_e) {
      toast({ title: "Provider temporarily unavailable", description: "A data provider is temporarily unavailable. Please try again shortly.", variant: "destructive" });
      setBusy(b => ({ ...b, [l.id]: "failed" }));
    }
  };

  const exportCsv = () => {
    const headers = ["Name", "Company", "Email", "Phone", "Website", "City", "State", "Industry", "Date Saved", "Enrichment Status", "Record Label"];
    const rows = filtered.map(l => [l.person_name, l.business_name, l.email, l.phone, l.website, l.city, l.state, l.industry, l.created_date ? new Date(l.created_date).toISOString() : "", l.enrichment_status, l.record_label || "PUBLIC RECORD"]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ringbellz-saved-leads.csv"; a.click();
    URL.revokeObjectURL(url);
    // Log all CSV exports for analytics.
    base44.entities.ActivityLog.create({
      user_id: user.id,
      user_email: user.email || "",
      action: "csv_export",
      description: "Exported " + filtered.length + " leads to CSV",
      metadata: { count: filtered.length }
    }).catch(() => {});
    // Compliance: log high-volume exports for admin review.
    if (filtered.length >= 50) {
      base44.entities.ComplianceLog.create({
        user_id: user.id,
        event_type: "high_volume_export",
        description: "Exported " + filtered.length + " leads to CSV",
        metadata: { count: filtered.length }
      }).catch(() => {});
    }
  };

  return (
    <div>
      <PageHeader title="Saved Leads" subtitle="Organize, search, and export your saved leads." action={<Button onClick={exportCsv} variant="outline"><Download className="w-4 h-4 mr-2" /> Export CSV</Button>} />

      <ComplianceBanner text={MARKETING_NOTICE + " " + ACCURACY_NOTICE} />

      <div className="glass-panel p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search saved leads..." className="pl-9 h-10" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option>All</option><option value="none">Not enriched</option><option value="enriched">Enriched</option><option value="failed">Failed</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="created_date">Sort: Newest</option><option value="name">Sort: Name</option><option value="company">Sort: Company</option>
        </select>
      </div>

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/30 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Name</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Company</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Email</th>
                <th className="text-left font-medium px-5 py-3 hidden xl:table-cell">Phone</th>
                <th className="text-left font-medium px-5 py-3 hidden xl:table-cell">Website</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Location</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Industry</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Saved</th>
                <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Freshness</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={11} className="px-5 py-12 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={11} className="px-5 py-12 text-center text-muted-foreground">No saved leads yet. <span className="text-primary">Find and save leads</span> to see them here.</td></tr>}
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-white/30 hover:bg-white/40">
                  <td className="px-5 py-3 font-medium">{l.person_name || "—"}</td>
                  <td className="px-5 py-3 hidden md:table-cell">{l.business_name || "—"}</td>
                  <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">{l.email || "—"}</td>
                  <td className="px-5 py-3 hidden xl:table-cell text-muted-foreground">{l.phone || "—"}</td>
                  <td className="px-5 py-3 hidden xl:table-cell text-muted-foreground">{l.website || "—"}</td>
                  <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">{[l.city, l.state].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">{l.industry || "—"}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{l.created_date ? new Date(l.created_date).toLocaleDateString() : "—"}</td>
                  <td className="px-5 py-3 hidden lg:table-cell"><FreshnessBadge created_date={l.created_date} retrieval_timestamp={l.retrieval_timestamp} /></td>
                  <td className="px-5 py-3"><StatusBadge status={l.enrichment_status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => updateLead(l.id, { starred: !l.starred })} title={l.starred ? "Unstar" : "Star"}>
                        <Star className={"w-4 h-4 " + (l.starred ? "fill-accent text-accent" : "")} />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDetail(l)} title="View"><Eye className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => enrich(l)} disabled={busy[l.id] === "loading"} title="Enrich">
                        {busy[l.id] === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : busy[l.id] === "enriched" ? <Check className="w-4 h-4 text-accent" /> : <Sparkles className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(l.id)} title="Delete"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <LeadDetailPanel
          lead={detail}
          onClose={() => setDetail(null)}
          onLeadUpdated={(u) => {
            setDetail(u);
            setLeads(prev => prev.map(l => (l.id === u.id ? u : l)));
          }}
        />
      )}
    </div>
  );
}