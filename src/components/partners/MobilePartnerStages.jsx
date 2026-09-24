import React from "react";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import PartnerPipelineCard from "@/components/partners/PartnerPipelineCard";
import { PARTNER_STAGES } from "@/lib/community";

// Mobile partnership view: every organization grouped by stage, with a picker
// to move it instead of dragging.
export default function MobilePartnerStages({ byStage, onMove, onOpen }) {
  return (
    <div className="space-y-6 lg:hidden">
      {PARTNER_STAGES.map((stage) => {
        const orgs = byStage[stage.key] || [];
        if (orgs.length === 0) return null;
        return (
          <div key={stage.key}>
            <div className="flex items-center gap-2 mb-2.5">
              <span className={"w-2 h-2 rounded-full " + stage.dot} />
              <span className="text-sm font-semibold">{stage.label}</span>
              <span className="text-xs text-muted-foreground ml-auto">{orgs.length}</span>
            </div>
            <div className="space-y-3">
              {orgs.map((o) => (
                <div key={o.id} className="space-y-2">
                  <PartnerPipelineCard org={o} onOpen={onOpen} />
                  <ResponsiveSelect
                    value={o.stage || "new"}
                    onChange={(v) => onMove(o, v)}
                    aria-label={`Move ${o.org_name}`}
                    options={PARTNER_STAGES.map((s) => ({ value: s.key, label: s.label }))}
                    className="h-9"
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}