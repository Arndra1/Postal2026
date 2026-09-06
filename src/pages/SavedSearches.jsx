import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Trash2, Loader2, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TYPE_LABELS = {
  new_businesses: "New Businesses",
  bankruptcy: "Bankruptcy",
  nonprofits: "Nonprofits",
  public_records: "Public Records",
  government_open_data: "Government Data",
  geographic: "Housing Records",
  federal_grants: "Federal Grants",
  find_leads: "Find Leads",
};

export default function SavedSearches() {
  const { user } = useAuth();
  const [searches, setSearches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = () => {
    setLoading(true);
    base44.entities.SavedSearch.filter({ user_id: user.id }, "-created_date").then((res) => {
      setSearches(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [user]);

  const toggleAlerts = async (s) => {
    const newCadence = s.alert_cadence === "none" ? "daily" : "none";
    await base44.entities.SavedSearch.update(s.id, { alert_cadence: newCadence, email_alerts: newCadence !== "none" });
    load();
    toast({ title: newCadence === "none" ? "Alerts paused" : "Alerts enabled", description: newCadence === "none" ? "You won't receive email alerts for this search." : `You'll get ${newCadence} email alerts.` });
  };

  const remove = async (id) => {
    await base44.entities.SavedSearch.delete(id);
    load();
  };

  const rerun = (s) => {
    const f = s.filters || {};
    const params = new URLSearchParams();
    Object.entries(f).forEach(([k, v]) => { if (v) params.set(k, v); });
    const route = s.search_type === "federal_grants" ? "/federal-grants" : s.search_type === "bankruptcy" ? "/bankruptcy" : "/find-leads-unified";
    window.location.href = `${route}?${params.toString()}`;
  };

  return (
    <div>
      <PageHeader title="Saved Searches" subtitle="Manage your saved searches and email alert preferences." />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : searches.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No saved searches</h3>
          <p className="text-sm text-muted-foreground mb-5">Run a search and click "Save Search" to get email alerts when new leads match.</p>
          <Button asChild><Link to="/find-leads-unified">Find Leads</Link></Button>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((s) => (
            <div key={s.id} className="glass-card p-5 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{s.name}</h3>
                  <Badge variant="secondary" className="text-xs">{TYPE_LABELS[s.search_type] || s.search_type}</Badge>
                  {s.alert_cadence !== "none" && <Badge className="text-xs bg-primary/10 text-primary">{s.alert_cadence} alerts</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Object.entries(s.filters || {}).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join(" · ") || "No filters"}
                  {s.last_run_at && <span className="ml-2">· Last checked: {new Date(s.last_run_at).toLocaleDateString()}</span>}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => rerun(s)} title="Re-run search">
                  <Search className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAlerts(s)} title={s.alert_cadence === "none" ? "Enable alerts" : "Pause alerts"}>
                  {s.alert_cadence === "none" ? <BellOff className="w-4 h-4 text-muted-foreground" /> : <Bell className="w-4 h-4 text-primary" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(s.id)} title="Delete">
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}