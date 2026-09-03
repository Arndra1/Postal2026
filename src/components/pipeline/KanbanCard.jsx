import React from "react";
import { Star, GripVertical } from "lucide-react";

export default function KanbanCard({ lead, dragHandleProps, onOpen }) {
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  return (
    <div
      {...dragHandleProps}
      onClick={onOpen}
      className="bg-card border border-border rounded-xl p-3 cursor-pointer hover:border-primary/30 hover:lady-shadow transition select-none"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/50 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{lead.person_name || "Unnamed lead"}</span>
            {lead.starred && <Star className="w-3.5 h-3.5 fill-accent text-accent shrink-0" />}
          </div>
          {lead.business_name && <p className="text-xs text-muted-foreground truncate">{lead.business_name}</p>}
          {location && <p className="text-xs text-muted-foreground/80 mt-0.5">{location}</p>}
          {(lead.tags || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {(lead.tags || []).slice(0, 3).map((t) => (
                <span key={t} className="px-1.5 py-0.5 rounded-full bg-secondary/25 text-secondary-foreground text-[10px] font-medium">{t}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}