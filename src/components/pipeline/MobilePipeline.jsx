import React, { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import KanbanCard from "@/components/pipeline/KanbanCard";
import { PIPELINE_STAGES } from "@/components/leads/LeadDetailPanel";

const STAGE_DOT = {
  new: "bg-secondary",
  contacted: "bg-primary",
  qualified: "bg-accent",
  won: "bg-emerald-500",
  lost: "bg-foreground/40",
};

export default function MobilePipeline({ byStage, onMove, onOpen }) {
  const [activeStage, setActiveStage] = useState(0);
  const stage = PIPELINE_STAGES[activeStage];
  const leads = byStage[stage.key] || [];

  const canPrev = activeStage > 0;
  const canNext = activeStage < PIPELINE_STAGES.length - 1;

  return (
    <div className="lg:hidden">
      {/* Stage selector tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
        {PIPELINE_STAGES.map((s, i) => {
          const count = (byStage[s.key] || []).length;
          return (
            <button
              key={s.key}
              onClick={() => setActiveStage(i)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                i === activeStage ? "bg-primary text-primary-foreground" : "bg-white/40 text-muted-foreground border border-white/40"
              }`}
            >
              <span className={"w-1.5 h-1.5 rounded-full " + STAGE_DOT[s.key]} />
              {s.label}
              <span className="opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Active stage column */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={"w-2.5 h-2.5 rounded-full " + STAGE_DOT[stage.key]} />
            <span className="font-semibold">{stage.label}</span>
            <span className="text-sm text-muted-foreground">{leads.length} lead{leads.length !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              disabled={!canPrev}
              onClick={() => setActiveStage(activeStage - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/40 border border-white/40 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={!canNext}
              onClick={() => setActiveStage(activeStage + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/40 border border-white/40 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/30 bg-white/20 p-2.5 min-h-[300px]">
          {leads.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No leads in this stage yet.</p>
          ) : (
            <div className="space-y-2.5">
              {leads.map((l) => (
                <div key={l.id} className="relative">
                  <KanbanCard lead={l} onOpen={() => onOpen(l)} />
                  <div className="flex gap-1.5 mt-1.5">
                    {canPrev && (
                      <button
                        onClick={() => onMove(l, PIPELINE_STAGES[activeStage - 1].key)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-white/50 border border-white/40 font-medium hover:border-primary/30"
                      >
                        ← {PIPELINE_STAGES[activeStage - 1].label}
                      </button>
                    )}
                    {canNext && (
                      <button
                        onClick={() => onMove(l, PIPELINE_STAGES[activeStage + 1].key)}
                        className="flex-1 text-xs py-1.5 rounded-lg bg-white/50 border border-white/40 font-medium hover:border-primary/30"
                      >
                        {PIPELINE_STAGES[activeStage + 1].label} →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}