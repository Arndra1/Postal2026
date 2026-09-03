import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";

export default function AdminActivity() {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    base44.entities.ActivityLog.list().then((r) => setRows(r.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))));
  }, []);
  const columns = [
    { key: "user_email", label: "User", hidden: "hidden md:table-cell" },
    { key: "action", label: "Action", render: (r) => <span className="capitalize font-medium">{r.action.replace(/_/g, " ")}</span> },
    { key: "description", label: "Description", hidden: "hidden lg:table-cell" },
    { key: "created_date", label: "Date", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];
  return (
    <div>
      <PageHeader title="System Activity" subtitle="Audit log of all platform activity." />
      <AdminTable columns={columns} rows={rows.slice(0, 200)} empty="No activity yet." />
    </div>
  );
}