import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import StatusBadge from "@/components/StatusBadge";

export default function AdminBilling() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    base44.entities.BillingEvent.list().then((r) => setRows(r.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))));
  }, []);
  const columns = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8) || "—"}</span> },
    { key: "provider", label: "Provider" },
    { key: "event_type", label: "Event Type", hidden: "hidden md:table-cell" },
    { key: "amount", label: "Amount", align: "right", render: (r) => `$${r.amount}` },
    { key: "currency", label: "Currency", hidden: "hidden lg:table-cell" },
    { key: "status", label: "Status", badge: true },
    { key: "provider_event_id", label: "Event ID", hidden: "hidden xl:table-cell", render: (r) => <span className="font-mono text-xs">{r.provider_event_id?.slice(0, 12) || "—"}</span> },
    { key: "created_date", label: "Date", hidden: "hidden md:table-cell", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];
  return (
    <div>
      <PageHeader title="Billing Events" subtitle="Webhook events and billing activity." />
      <AdminTable columns={columns} rows={rows} empty="No billing events." />
    </div>
  );
}