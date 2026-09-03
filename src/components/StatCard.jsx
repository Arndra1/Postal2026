import React from "react";

export default function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 lady-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground font-medium">{label}</span>
        {Icon && (
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent ? "bg-accent/15" : "bg-secondary/20"}`}>
            <Icon className={`w-4 h-4 ${accent ? "text-accent" : "text-primary"}`} />
          </div>
        )}
      </div>
      <div className="font-heading text-3xl font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}