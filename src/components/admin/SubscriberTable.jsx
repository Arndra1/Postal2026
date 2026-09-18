import React from "react";
import AdminTable from "@/components/AdminTable";
import StatusBadge from "@/components/StatusBadge";

const fmt = (v) => (v ? new Date(v).toLocaleDateString() : "—");

export default function SubscriberTable({ rows }) {
  const columns = [
    {
      key: "name",
      label: "Customer",
      render: (r) => (
        <div className="min-w-[170px]">
          <div className="flex items-center gap-2">
            <span className="font-medium">{r.name || "Unknown customer"}</span>
            {r.nonPaying && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
                Non-paying
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      label: "Email",
      hidden: "hidden md:table-cell",
      render: (r) => <span className="text-muted-foreground">{r.email || "—"}</span>,
    },
    { key: "plan", label: "Plan", hidden: "hidden lg:table-cell", render: (r) => r.plan || "—" },
    { key: "price", label: "Price", render: (r) => r.price || "—" },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <StatusBadge status={r.status} label={r.status === "expired" ? "Unpaid" : undefined} />
      ),
    },
    { key: "startDate", label: "Started", hidden: "hidden lg:table-cell", render: (r) => fmt(r.startDate) },
    { key: "nextBillingDate", label: "Next Billing", hidden: "hidden lg:table-cell", render: (r) => fmt(r.nextBillingDate) },
    { key: "lastPaymentDate", label: "Last Payment", hidden: "hidden xl:table-cell", render: (r) => fmt(r.lastPaymentDate) },
  ];

  return <AdminTable columns={columns} rows={rows} empty="No subscribers match." />;
}