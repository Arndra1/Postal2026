import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Info, Save, ArrowDownUp, Lock } from "lucide-react";

// The providers whose order can be tuned. Address cleanup (Geoapify) and phone
// validation (NumVerify) are pinned first/last, so they are not listed here.
const REORDERABLE = [
  {
    key: "domain_resolver",
    label: "Domain Lookup",
    description: "Resolves a company website from the business name, so the email providers have a domain to work with.",
  },
  {
    key: "tracerfy",
    label: "Tracerfy",
    description: "Address-based lookup for an owner's phone and email.",
  },
  {
    key: "enrich_so",
    label: "Enrich.so",
    description: "Finds a professional email from a person's name and company domain.",
  },
  {
    key: "people_data_labs",
    label: "People Data Labs",
    description: "Person and company enrichment. Needs a first and last name to match.",
  },
];

// Mirrors the shipped defaults in the enrichment orchestrator.
const DEFAULT_PRIORITY = {
  domain_resolver: 15,
  tracerfy: 20,
  enrich_so: 30,
  people_data_labs: 40,
};

export default function AdminProviders() {
  const { toast } = useToast();
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.ProviderSetting.list();
      const map = {};
      for (const r of list || []) map[r.provider_key] = r;
      setRows(map);
    } catch (_e) {
      setRows({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const priorityOf = (key) => {
    const saved = Number(rows[key]?.priority);
    return Number.isFinite(saved) ? saved : DEFAULT_PRIORITY[key];
  };

  const ordered = REORDERABLE.slice().sort((a, b) => priorityOf(a.key) - priorityOf(b.key));

  const setField = (key, field, value) =>
    setRows((r) => ({ ...r, [key]: { ...(r[key] || {}), [field]: value } }));

  const save = async () => {
    setSaving(true);
    try {
      await Promise.all(
        REORDERABLE.map(({ key, label }) => {
          const row = rows[key] || {};
          const priority = Number(row.priority);
          const payload = {
            priority: Number.isFinite(priority) ? priority : DEFAULT_PRIORITY[key],
            enabled: row.enabled !== false,
          };
          return row.id
            ? base44.entities.ProviderSetting.update(row.id, payload)
            : base44.entities.ProviderSetting.create({
                provider_key: key,
                label,
                last_status: "none",
                ...payload,
              });
        })
      );
      await load();
      toast({ title: "Provider order saved" });
    } catch (_e) {
      toast({ title: "Could not save", description: "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Enrichment Providers"
        subtitle="Control the order the enrichment providers run in."
        action={
          <Button onClick={save} disabled={saving || loading} className="h-10">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save order
          </Button>
        }
      />

      <div className="flex items-start gap-2.5 rounded-2xl border border-border bg-muted/40 px-4 py-3 mb-6 text-sm text-muted-foreground">
        <Info className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
        <p>
          Providers run in order, lowest number first. Address cleanup is always first and phone
          validation is always last — only the providers below can be repositioned.
        </p>
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <ArrowDownUp className="w-5 h-5 text-primary" />
          <h2 className="font-heading text-lg font-semibold">Run Order</h2>
        </div>

        {loading ? (
          <div className="px-4 py-12 text-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {ordered.map((p, i) => {
              const row = rows[p.key] || {};
              const enabled = row.enabled !== false;
              return (
                <div key={p.key} className="flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4">
                  <div className="w-7 h-7 rounded-full lady-gradient text-white text-xs font-semibold flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground" htmlFor={`prio-${p.key}`}>Priority</label>
                      <Input
                        id={`prio-${p.key}`}
                        type="number"
                        className="w-20 h-9 glass-input"
                        value={row.priority ?? DEFAULT_PRIORITY[p.key]}
                        onChange={(e) => setField(p.key, "priority", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      aria-label={`Toggle ${p.label}`}
                      onClick={() => setField(p.key, "enabled", !enabled)}
                      className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${enabled ? "bg-primary" : "bg-muted"}`}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
          <Lock className="w-3.5 h-3.5" /> Fixed first: <span className="text-foreground font-medium">Address cleanup (Geoapify)</span>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
          <Lock className="w-3.5 h-3.5" /> Fixed last: <span className="text-foreground font-medium">Phone validation (NumVerify)</span>
        </div>
      </div>
    </div>
  );
}