import React from "react";
import { Building2, Heart, MapPin } from "lucide-react";
import { PARTNER_STAGES } from "@/lib/community";

// Compact card used on the partnership board and in the mobile stage list.
export default function PartnerPipelineCard({ org, dragHandleProps, onOpen, showStage }) {
  const isChurch = org.org_type === "church";
  const location = [org.city, org.state].filter(Boolean).join(", ");
  const stage = PARTNER_STAGES.find((s) => s.key === org.stage) || PARTNER_STAGES[0];

  return (
    <div
      {...dragHandleProps}
      onClick={() => onOpen(org)}
      className="glass-card p-3 cursor-pointer select-none"
    >
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded-lg bg-secondary/25 flex items-center justify-center shrink-0">
          {isChurch ? <Heart className="w-3.5 h-3.5 text-primary" /> : <Building2 className="w-3.5 h-3.5 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug line-clamp-2">{org.org_name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
            {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
            {org.org_type === "microbusiness" && <span>Microbusiness</span>}
          </div>
          {org.leader_name && <p className="mt-1 text-[11px] text-muted-foreground truncate">{org.leader_name}{org.leader_title ? ` · ${org.leader_title}` : ""}</p>}
        </div>
      </div>
      {showStage && (
        <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={"w-1.5 h-1.5 rounded-full " + stage.dot} /> {stage.label}
        </span>
      )}
    </div>
  );
}