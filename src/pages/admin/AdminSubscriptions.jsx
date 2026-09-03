import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import StatusBadge from "@/components/StatusBadge";

export default function AdminSubscriptions() {
  const [rows, setRows] = useState([]);
  useEffect(() => { base44.entities.Subscription.list().then(setRows); }, []);
  const columns = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8)}…</span> },
    { key: "plan", label: "Plan" },
    { key: "status", label: "Status", badge: true },
    { key: "billing_provider", label: "Provider", hidden: "hidden md:table-cell" },
    { key: "period_start", label: "Period Start", hidden: "hidden lg:table-cell", render: (r) => r.period_start ? new Date(r.period_start).toLocaleDateString() : "—" },
    { key: "period_end", label: "Period End", hidden: "hidden lg:table-cell", render: (r) => r.period_end ? new Date(r.period_end).toLocaleDateString() : "—" },
    { key: "cancelled_at", label: "Cancelled", hidden: "hidden xl:table-cell", render: (r) => r.cancelled_at ? new Date(r.cancelled_at).toLocaleDateString() : "—" },
  ];
  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="All membership subscriptions." />
      <AdminTable columns={columns} rows={rows} empty="No subscriptions." />
    </div>
  );
}