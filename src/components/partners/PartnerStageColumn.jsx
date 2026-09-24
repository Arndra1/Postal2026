import React from "react";
import { Draggable, Droppable } from "@hello-pangea/dnd";
import PartnerPipelineCard from "@/components/partners/PartnerPipelineCard";

// One partnership stage column with drag-and-drop on desktop.
export default function PartnerStageColumn({ stage, orgs, onOpen }) {
  return (
    <div className="flex-1 min-w-[250px] max-w-[340px]">
      <div className="flex items-center gap-2 px-1 mb-2.5">
        <span className={"w-2 h-2 rounded-full " + stage.dot} />
        <span className="text-sm font-semibold">{stage.label}</span>
        <span className="text-xs text-muted-foreground ml-auto">{orgs.length}</span>
      </div>
      <Droppable droppableId={stage.key}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={"rounded-2xl border p-2.5 min-h-[200px] transition " + (snapshot.isDraggingOver ? "bg-secondary/15 border-primary/40" : "bg-white/20 border-white/30")}
          >
            {orgs.map((o, i) => (
              <Draggable key={o.id} draggableId={o.id} index={i}>
                {(dp) => (
                  <div ref={dp.innerRef} {...dp.draggableProps} className="mb-2.5">
                    <PartnerPipelineCard org={o} dragHandleProps={dp.dragHandleProps} onOpen={onOpen} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
            {orgs.length === 0 && !snapshot.isDraggingOver && (
              <p className="text-xs text-muted-foreground text-center py-6">Drop organizations here</p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}