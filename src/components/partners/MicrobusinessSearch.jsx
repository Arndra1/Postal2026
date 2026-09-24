import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { useToast } from "@/components/ui/use-toast";
import { US_STATES } from "@/lib/community";
import { Building2, Check, ExternalLink, Loader2, MapPin, Plus, Search } from "lucide-react";

// Microbusinesses come from the existing official state business-registration
// search. Only real filing records can be saved — a state that publishes no
// automated feed returns a directory entry instead, which links out to the
// official portal.
const LIVE_STATES = ["FL", "CT", "NY", "PA", "CO", "OR", "TX", "IA"];

export default function MicrobusinessSearch({ savedByKey, onSaved, onOpen }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState({});

  const run = async (e) => {
    e.preventDefault();
    if (!state) return;
    setLoading(true); setSearched(true); setRows([]);
    try {
      const res = await base44.functions.invoke("searchPublicLeads", { category: "new_businesses", state });
      const d = res.data || {};
      if (d.status !== "success") {
        setRows([]);
        toast({ title: "Source temporarily unavailable", description: "Please try again shortly.", variant: "destructive" });
      } else {
        setRows(d.results || []);
      }
    } catch (_e) {
      setRows([]);
      toast({ title: "Source temporarily unavailable", description: "Please try again shortly.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const keyOf = (r) => r.official_record_id || r.business_name || "";

  const save = async (r) => {
    const key = keyOf(r);
    setBusy((b) => ({ ...b, [key]: "saving" }));
    try {
      const org = await base44.entities.PartnerOrganization.create({
        user_id: user.id,
        org_name: r.business_name || "",
        org_type: "microbusiness",
        address: r.address || "",
        city: r.city || "",
        state: r.state || "",
        zip: r.zip || "",
        official_record_id: r.official_record_id || "",
        source: r.source || "",
        source_reference: r.source_url || "",
        retrieved_at: r.retrieved_at || new Date().toISOString(),
        original_public_fields: r,
        stage: "new",
        contact_status: "unknown",
      });
      onSaved(org);
      setBusy((b) => ({ ...b, [key]: "saved" }));
    } catch (_e) {
      setBusy((b) => ({ ...b, [key]: "error" }));
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    }
  };

  const records = rows.filter((r) => r.record_type === "state_filing");

  return (
    <div>
      <form onSubmit={run} className="glass-panel p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs text-muted-foreground">State</Label>
            <ResponsiveSelect
              value={state}
              onChange={setState}
              aria-label="State"
              options={[{ value: "", label: "Select a state" }, ...US_STATES.map((s) => ({ value: s.code, label: `${s.name}${LIVE_STATES.includes(s.code) ? " · LIVE" : ""}` }))]}
              className="h-10"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="h-10 w-full" disabled={!state || loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {loading ? "Searching…" : "Search filings"}
            </Button>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Official state business-registration records · 0 credits. States marked LIVE publish an automated feed; others link to their official portal.
        </p>
      </form>

      {loading && (
        <div className="py-16 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      )}

      {!loading && searched && rows.length === 0 && (
        <div className="glass-panel p-12 text-center text-sm text-muted-foreground mt-6">
          No registration records came back for {state}. Try a LIVE state, or search churches and nonprofits instead.
        </div>
      )}

      {!loading && records.length > 0 && (
        <div className="grid gap-3 mt-6">
          {records.map((r) => {
            const key = keyOf(r);
            const saved = savedByKey[key];
            return (
              <div key={key} className="glass-card p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-secondary/25 flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold leading-snug">{r.business_name}</h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[r.city, r.state].filter(Boolean).join(", ")}</span>
                      {r.extra?.formation_date && <span>Registered {r.extra.formation_date}</span>}
                      {r.agency && <span>{r.agency}</span>}
                    </div>
                    {r.address && <p className="mt-1 text-xs text-muted-foreground">{r.address}</p>}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {saved ? (
                    <Button variant="outline" size="sm" onClick={() => onOpen(saved)}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Saved — open
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => save(r)} disabled={busy[key] === "saving"}>
                      {busy[key] === "saving" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
                      Save as partner prospect
                    </Button>
                  )}
                  {r.source_url && (
                    <a href={r.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> Official source
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && searched && rows.length > 0 && records.length === 0 && (
        <div className="glass-panel p-8 mt-6">
          <h3 className="font-heading font-semibold mb-1">{state} publishes no automated feed</h3>
          <p className="text-sm text-muted-foreground mb-4">
            This state lists registrations on its official portal only. Open the source below to search it directly, then add the organizations you want to approach.
          </p>
          {rows[0]?.source_url && (
            <Button variant="outline" size="sm" asChild>
              <a href={rows[0].source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Open official portal</a>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}