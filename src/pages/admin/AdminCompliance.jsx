import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

// Admin compliance dashboard: compliance event log, terms acknowledgments,
// independent data-source controls, and usage review with warnings.
export default function AdminCompliance() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState({});

  const load = () => base44.functions.invoke("adminCompliance", {}).then((res) => setData(res.data));
  useEffect(() => { load(); }, []);

  if (!data) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  const toggleProvider = async (p) => {
    setBusy(b => ({ ...b, [p.provider_key]: true }));
    try {
      await base44.functions.invoke("adminCompliance", { action: "toggle_provider", provider_key: p.provider_key, enabled: !p.enabled });
      await load();
    } catch (_e) {} finally { setBusy(b => ({ ...b, [p.provider_key]: false })); }
  };

  const warnUser = async (u) => {
    const reason = window.prompt("Reason for the compliance warning (recorded in the compliance log):");
    if (reason === null) return;
    setBusy(b => ({ ...b, [u.user_id + "w"]: true }));
    try {
      await base44.functions.invoke("adminCompliance", { action: "warn_user", user_id: u.user_id, reason });
      await load();
    } catch (_e) {} finally { setBusy(b => ({ ...b, [u.user_id + "w"]: false })); }
  };

  const logColumns = [
    { key: "event_type", label: "Event", render: (l) => <span className="font-medium capitalize">{String(l.event_type || "").replace(/_/g, " ")}</span> },
    { key: "description", label: "Details" },
    { key: "user_email", label: "User", hidden: "hidden md:table-cell" },
    { key: "admin_email", label: "Admin", hidden: "hidden lg:table-cell" },
    { key: "created_date", label: "Date", render: (l) => l.created_date ? new Date(l.created_date).toLocaleString() : "—" },
  ];

  const ackColumns = [
    { key: "full_name", label: "User", render: (a) => <span className="font-medium">{a.full_name || "—"}</span> },
    { key: "email", label: "Email", hidden: "hidden md:table-cell" },
    { key: "version", label: "Version" },
    { key: "accepted_at", label: "Accepted", render: (a) => a.accepted_at ? new Date(a.accepted_at).toLocaleString() : "—" },
  ];

  const usageColumns = [
    { key: "full_name", label: "User", render: (u) => <span className="font-medium">{u.full_name || u.email || "—"}</span> },
    { key: "email", label: "Email", hidden: "hidden lg:table-cell" },
    { key: "role", label: "Role", hidden: "hidden md:table-cell", render: (u) => <span className="capitalize text-muted-foreground">{u.role}</span> },
    { key: "enrichment_count", label: "Enrichments", align: "right" },
    { key: "lead_count", label: "Leads", align: "right" },
    { key: "warn", label: "", align: "right", render: (u) => (
      <Button variant="ghost" size="sm" title="Issue compliance warning" onClick={() => warnUser(u)} disabled={busy[u.user_id + "w"]}>
        <AlertTriangle className="w-4 h-4" />
      </Button>
    )},
  ];

  return (
    <div>
      <PageHeader title="Compliance" subtitle="Terms acknowledgments, data-source controls, and compliance activity." />

      <Tabs defaultValue="log">
        <TabsList className="mb-4">
          <TabsTrigger value="log">Compliance Log</TabsTrigger>
          <TabsTrigger value="acks">Acknowledgments</TabsTrigger>
          <TabsTrigger value="providers">Data Sources</TabsTrigger>
          <TabsTrigger value="usage">Usage Review</TabsTrigger>
        </TabsList>

        <TabsContent value="log">
          <AdminTable columns={logColumns} rows={data.complianceLog} empty="No compliance events recorded yet." />
        </TabsContent>

        <TabsContent value="acks">
          <AdminTable columns={ackColumns} rows={data.acknowledgments} empty="No terms acknowledgments recorded yet." />
        </TabsContent>

        <TabsContent value="providers">
          <div className="space-y-3">
            {data.providers.map((p) => (
              <div key={p.provider_key} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card">
                <div>
                  <div className="font-medium text-sm">{p.label || p.provider_key}</div>
                  <div className={`text-xs ${p.enabled ? "text-accent" : "text-muted-foreground"}`}>{p.enabled ? "Enabled" : "Disabled"}</div>
                </div>
                <Switch checked={p.enabled} onCheckedChange={() => toggleProvider(p)} disabled={busy[p.provider_key]} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Individual data sources can be enabled or disabled independently. Disabling a provider stops its use in enrichment without shutting down the platform.
            </p>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <AdminTable columns={usageColumns} rows={data.usage} empty="No user activity yet." />
        </TabsContent>
      </Tabs>
    </div>
  );
}