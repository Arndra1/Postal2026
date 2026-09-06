import React, { useState } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
                <SwipeableKanbanCard
                  key={l.id}
                  lead={l}
                  onOpen={() => onOpen(l)}
                  onSwipeRight={() => canNext && onMove(l, PIPELINE_STAGES[activeStage + 1].key)}
                  onSwipeLeft={() => canPrev && onMove(l, PIPELINE_STAGES[activeStage - 1].key)}
                  nextLabel={canNext ? PIPELINE_STAGES[activeStage + 1].label : ""}
                  prevLabel={canPrev ? PIPELINE_STAGES[activeStage - 1].label : ""}
                />
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-3">
          ← Swipe a card left to move back · right to advance →
        </p>
      </div>
    </div>
  );
}

function SwipeableKanbanCard({ lead, onOpen, onSwipeLeft, onSwipeRight, nextLabel, prevLabel }) {
  const x = useMotionValue(0);
  const rightBg = useTransform(x, [20, 80], ["rgba(91,42,110,0)", "rgba(91,42,110,0.15)"]);
  const leftBg = useTransform(x, [-80, -20], ["rgba(201,167,199,0.15)", "rgba(201,167,199,0)"]);

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if ((offset > 60 || velocity > 400) && onSwipeRight) {
      if (navigator.vibrate) navigator.vibrate(10);
      onSwipeRight();
    } else if ((offset < -60 || velocity < -400) && onSwipeLeft) {
      if (navigator.vibrate) navigator.vibrate(10);
      onSwipeLeft();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Swipe right indicator */}
      <motion.div className="absolute inset-0 flex items-center justify-end pr-3" style={{ background: rightBg }}>
        <span className="text-xs font-medium text-primary">{nextLabel} →</span>
      </motion.div>
      {/* Swipe left indicator */}
      <motion.div className="absolute inset-0 flex items-center pl-3" style={{ background: leftBg }}>
        <span className="text-xs font-medium text-secondary">← {prevLabel}</span>
      </motion.div>

      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.5}
        onDragEnd={handleDragEnd}
        onClick={onOpen}
        className="relative cursor-grab active:cursor-grabbing"
        whileTap={{ cursor: "grabbing" }}
      >
        <KanbanCard lead={lead} onOpen={onOpen} />
      </motion.div>
    </div>
  );
}