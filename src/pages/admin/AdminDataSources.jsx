import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Loader2, FlaskConical, ExternalLink, ShieldCheck, ShieldAlert } from "lucide-react";

const STATUS_STYLE = {
  live: "bg-emerald-100 text-emerald-800",
  ready: "bg-sky-100 text-sky-800",
  needs_key: "bg-amber-100 text-amber-800",
  error: "bg-rose-100 text-rose-800",
  untested: "bg-slate-100 text-slate-600",
};

export default function AdminDataSources() {
  const [federal, setFederal] = useState([]);
  const [states, setStates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState({});
  const [toggling, setToggling] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [fed, st] = await Promise.all([
        base44.entities.PublicDataSource.list(),
        base44.functions.invoke("searchPublicLeads", { category: "new_businesses", state: "" }),
      ]);
      setFederal(fed || []);
      setStates(st.data.results || []);
    } catch (_e) {
      setFederal([]); setStates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const testSource = async (category, key) => {
    setTesting((t) => ({ ...t, [key]: true }));
    try {
      await base44.functions.invoke("testPublicSource", { category });
      await load();
    } catch (_e) {}
    setTesting((t) => ({ ...t, [key]: false }));
  };

  const toggle = async (id, enabled) => {
    setToggling((t) => ({ ...t, [id]: true }));
    try {
      await base44.entities.PublicDataSource.update(id, { enabled });
      await load();
    } catch (_e) {}
    setToggling((t) => ({ ...t, [id]: false }));
  };

  return (
    <div>
      <PageHeader title="Data Sources" subtitle="Manage public-data source connections. API keys are never displayed." />

      <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Federal / API Sources</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">Source</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Agency</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Last Success</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Limits / Restrictions</th>
                <th className="text-center font-medium px-4 py-3">Enabled</th>
                <th className="text-right font-medium px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-10 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>}
              {federal.map((s) => (
                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.source_name}</div>
                    <div className="text-xs text-muted-foreground">{s.secret_name}</div>
                    {s.error_state && <div className="text-xs text-destructive mt-0.5">{s.error_state}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs capitalize">{(s.category || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs">{s.agency}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${STATUS_STYLE[s.connection_status] || STATUS_STYLE.untested}`}>{s.connection_status}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{s.last_success_at ? new Date(s.last_success_at).toLocaleString() : "—"}</td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{s.limits || s.restrictions || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(s.id, !s.enabled)}
                      disabled={toggling[s.id]}
                      className={`relative w-10 h-5 rounded-full transition-colors ${s.enabled ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${s.enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="outline" size="sm" onClick={() => testSource(s.category, s.source_key)} disabled={testing[s.source_key]}>
                      {testing[s.source_key] ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <FlaskConical className="w-3.5 h-3.5 mr-1" />} Test
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-secondary" />
          <h2 className="font-heading text-lg font-semibold">State Business Registries (50 + DC)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-4 py-3">State</th>
                <th className="text-left font-medium px-4 py-3 hidden md:table-cell">Agency</th>
                <th className="text-left font-medium px-4 py-3 hidden lg:table-cell">Source Type</th>
                <th className="text-left font-medium px-4 py-3">Automation</th>
                <th className="text-left font-medium px-4 py-3">Status</th>
                <th className="text-left font-medium px-4 py-3 hidden xl:table-cell">Notes</th>
                <th className="text-right font-medium px-4 py-3">Portal</th>
              </tr>
            </thead>
            <tbody>
              {states.map((r) => (
                <tr key={r.state} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{r.state}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{r.business_name}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs capitalize">{(r.extra?.source_type || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-xs capitalize">{(r.extra?.automation_status || "").replace(/_/g, " ")}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${STATUS_STYLE[r.extra?.connection_status] || STATUS_STYLE.untested}`}>{r.extra?.connection_status || "ready"}</span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{r.extra?.notes || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}