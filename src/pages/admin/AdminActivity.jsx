import React, { useEffect, useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import { AlertTriangle } from "lucide-react";

export default function AdminActivity() {
  const [rows, setRows] = useState([]);
  const [actionFilter, setActionFilter] = useState("all");

  useEffect(() => {
    base44.entities.ActivityLog.list().then((r) => setRows(r.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))));
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set(rows.map((r) => r.action));
    return ["all", ...Array.from(set).sort()];
  }, [rows]);

  const filtered = useMemo(() => {
    if (actionFilter === "all") return rows;
    return rows.filter((r) => r.action === actionFilter);
  }, [rows, actionFilter]);

  const columns = [
    { key: "user_email", label: "User", hidden: "hidden md:table-cell" },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <span className={`inline-flex items-center gap-1 font-medium ${r.action === "email_delivery_failed" ? "text-destructive" : ""}`}>
          {r.action === "email_delivery_failed" && <AlertTriangle className="w-3.5 h-3.5" />}
          <span className="capitalize">{r.action.replace(/_/g, " ")}</span>
        </span>
      ),
    },
    {
      key: "description",
      label: "Description",
      hidden: "hidden lg:table-cell",
      render: (r) => (
        <span className={r.action === "email_delivery_failed" ? "text-destructive" : ""}>{r.description}</span>
      ),
    },
    { key: "created_date", label: "Date", render: (r) => (r.created_date ? new Date(r.created_date).toLocaleString() : "—") },
  ];

  return (
    <div>
      <PageHeader
        title="System Activity"
        subtitle="Audit log of all platform activity."
        action={
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {actionTypes.map((a) => (
              <option key={a} value={a}>
                {a === "all" ? "All actions" : a.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        }
      />
      <AdminTable columns={columns} rows={filtered.slice(0, 200)} empty="No activity yet." />
    </div>
  );
}