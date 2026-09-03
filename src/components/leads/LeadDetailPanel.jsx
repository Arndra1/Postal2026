import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { X, Star } from "lucide-react";
import TagsEditor from "@/components/leads/TagsEditor";
import ListsEditor from "@/components/leads/ListsEditor";
import NotesTimeline from "@/components/leads/NotesTimeline";

export const PIPELINE_STAGES = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
];

export default function LeadDetailPanel({ lead, onClose, onLeadUpdated }) {
  const { user } = useAuth();
  const [lists, setLists] = useState([]);

  useEffect(() => {
    if (!user) return;
    base44.entities.LeadList.filter({ user_id: user.id }).then(setLists).catch(() => {});
  }, [user]);

  const persist = async (partial) => {
    await base44.entities.Lead.update(lead.id, partial);
    onLeadUpdated({ ...lead, ...partial });
  };

  const createList = async (name, color) => {
    const created = await base44.entities.LeadList.create({ user_id: user.id, name, color });
    setLists((prev) => [...prev, created]);
    return created;
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card h-full border-l border-border overflow-y-auto lady-shadow-lg">
        <div className="sticky top-0 bg-card/95 backdrop-blur border-b border-border px-6 py-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-xl font-semibold">{lead.person_name || "Lead"}</h3>
            {lead.business_name && <p className="text-sm text-muted-foreground">{lead.business_name}</p>}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => persist({ starred: !lead.starred })} title={lead.starred ? "Unstar" : "Star"}>
              <Star className={"w-5 h-5 " + (lead.starred ? "fill-accent text-accent" : "")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline Stage</label>
            <select
              value={lead.pipeline_status || "new"}
              onChange={(e) => persist({ pipeline_status: e.target.value })}
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {PIPELINE_STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Lead Details</div>
            <div className="space-y-2 text-sm">
              {["job_title", "email", "phone", "website", "linkedin", "address", "city", "state", "industry", "confidence"].map((k) => (
                <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-border">
                  <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                  <span className="font-medium text-right break-all">{lead[k] || "—"}</span>
                </div>
              ))}
              <div className="flex justify-between gap-4 py-1.5">
                <span className="text-muted-foreground">Enrichment</span>
                <StatusBadge status={lead.enrichment_status} />
              </div>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Tags</div>
            <TagsEditor tags={lead.tags || []} onTagsChange={(tags) => persist({ tags })} />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Lists</div>
            <ListsEditor lead={lead} lists={lists} onCreate={createList} onListIdsChange={(list_ids) => persist({ list_ids })} />
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes &amp; Activity</div>
            <NotesTimeline lead={lead} />
          </div>
        </div>
      </div>
    </div>
  );
}