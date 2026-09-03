import React from "react";
import StatusBadge from "@/components/StatusBadge";

export default function AdminTable({ columns, rows, empty }) {
  return (
    <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`font-medium px-4 py-3 ${c.align === "right" ? "text-right" : "text-left"} ${c.hidden || ""}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted-foreground">{empty || "No records."}</td></tr>}
            {rows.map((r, i) => (
              <tr key={r.id || i} className="border-t border-border hover:bg-muted/30">
                {columns.map((c) => (
                  <td key={c.key} className={`px-4 py-3 ${c.align === "right" ? "text-right" : ""} ${c.cellClass || ""}`}>
                    {c.render ? c.render(r) : (c.badge ? <StatusBadge status={r[c.key]} /> : (r[c.key] || "—"))}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}