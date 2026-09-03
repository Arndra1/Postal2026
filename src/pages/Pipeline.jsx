import React, { useEffect, useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import KanbanCard from "@/components/pipeline/KanbanCard";
import LeadDetailPanel, { PIPELINE_STAGES } from "@/components/leads/LeadDetailPanel";
import { Loader2, FolderHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const STAGE_DOT = {
  new: "bg-secondary",
  contacted: "bg-primary",
  qualified: "bg-accent",
  won: "bg-emerald-500",
  lost: "bg-foreground/40",
};

export default function Pipeline() {
  const { user } = useAuth();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    if (!user) return;
    base44.entities.Lead.filter({ user_id: user.id, saved: true }).then((res) => {
      setLeads(res);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const byStage = useMemo(() => {
    const grouped = {};
    PIPELINE_STAGES.forEach((s) => { grouped[s.key] = []; });
    leads.forEach((l) => {
      const key = PIPELINE_STAGES.some((s) => s.key === l.pipeline_status) ? l.pipeline_status : "new";
      grouped[key].push(l);
    });
    return grouped;
  }, [leads]);

  const onDragEnd = (result) => {
    const { destination, draggableId } = result;
    if (!destination) return;
    const stage = destination.droppableId;
    const lead = leads.find((l) => l.id === draggableId);
    if (!lead) return;
    const current = PIPELINE_STAGES.some((s) => s.key === lead.pipeline_status) ? lead.pipeline_status : "new";
    if (current === stage) return;
    const updated = { ...lead, pipeline_status: stage };
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
    base44.entities.Lead.update(lead.id, { pipeline_status: stage }).catch(() => {});
  };

  const applyUpdate = (updated) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
    setDetail(updated);
  };

  return (
    <div>
      <PageHeader title="Lead Pipeline" subtitle="Drag leads across stages to track where each prospect stands." />

      {loading ? (
        <div className="py-20 text-center text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : leads.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border lady-shadow p-16 text-center">
          <FolderHeart className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-heading text-lg font-semibold mb-1">No saved leads yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Save leads first, then track them through your pipeline here.</p>
          <Button asChild><Link to="/find-leads">Find Leads</Link></Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh] items-start">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage.key} className="flex-1 min-w-[250px] max-w-[340px]">
                <div className="flex items-center gap-2 px-1 mb-2.5">
                  <span className={"w-2 h-2 rounded-full " + STAGE_DOT[stage.key]} />
                  <span className="text-sm font-semibold">{stage.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{byStage[stage.key].length}</span>
                </div>
                <Droppable droppableId={stage.key}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={"rounded-2xl border p-2.5 min-h-[200px] transition " + (snapshot.isDraggingOver ? "bg-secondary/15 border-primary/40" : "bg-muted/40 border-border")}
                    >
                      {byStage[stage.key].map((l, i) => (
                        <Draggable key={l.id} draggableId={l.id} index={i}>
                          {(provided) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} className="mb-2.5">
                              <KanbanCard lead={l} dragHandleProps={provided.dragHandleProps} onOpen={() => setDetail(l)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                      {byStage[stage.key].length === 0 && !snapshot.isDraggingOver && (
                        <p className="text-xs text-muted-foreground text-center py-6">Drop leads here</p>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}

      {detail && (
        <LeadDetailPanel lead={detail} onClose={() => setDetail(null)} onLeadUpdated={applyUpdate} />
      )}
    </div>
  );
}