import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import StatusBadge from "@/components/StatusBadge";

export default function AdminEnrichments() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    base44.entities.Enrichment.list().then((r) => setRows(r.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))));
  }, []);
  const columns = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8)}…</span> },
    { key: "provider", label: "Provider", hidden: "hidden md:table-cell" },
    { key: "status", label: "Status", badge: true },
    { key: "credits_charged", label: "Credits", align: "right" },
    { key: "duration_ms", label: "Duration (ms)", align: "right", hidden: "hidden lg:table-cell" },
    { key: "error_message", label: "Error", hidden: "hidden xl:table-cell", render: (r) => <span className="text-xs text-muted-foreground">{r.error_message || "—"}</span> },
    { key: "created_date", label: "Date", hidden: "hidden md:table-cell", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];
  return (
    <div>
      <PageHeader title="Enrichments" subtitle="Enrichment activity and observability." />
      <AdminTable columns={columns} rows={rows.slice(0, 200)} empty="No enrichments yet." />
    </div>
  );
}