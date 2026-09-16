import React from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

// Mobile stacked-card variant of the NewBusinessFinder state-registry row.
export default function StateRegistryCard({ r, statusBadge }) {
  return (
    <div className="glass-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium">{r.state}</div>
          <div className="text-xs text-muted-foreground">{r.jurisdiction}</div>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground inline-block mt-1">Public Record</span>
        </div>
        <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded ${statusBadge(r.extra?.connection_status)}`}>
          {r.extra?.connection_status || "ready"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 text-xs">
        {r.business_name && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Agency</span>
            <span className="font-medium text-right break-words">{r.business_name}</span>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Source</span>
          <span className="font-medium capitalize">{(r.extra?.source_type || "").replace(/_/g, " ") || "—"}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-muted-foreground">Automation</span>
          <span className="font-medium capitalize">{(r.extra?.automation_status || "").replace(/_/g, " ") || "—"}</span>
        </div>
        {r.extra?.notes && (
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Notes</span>
            <span className="font-medium text-right break-words">{r.extra.notes}</span>
          </div>
        )}
      </div>

      {r.source_url && (
        <Button variant="outline" size="sm" asChild className="mt-3 w-full">
          <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5 mr-1" /> Official Source</a>
        </Button>
      )}
    </div>
  );
}