import React, { useState } from "react";
import { motion, useMotionValue, useTransform, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Trash2, Loader2, Check } from "lucide-react";

// Mobile-only swipeable lead row. Swipe right → star, swipe left → enrich + delete.
export default function SwipeableSavedLeadRow({ lead, onStar, onEnrich, onDelete, busy, onOpen }) {
  const [showActions, setShowActions] = useState(false);
  const x = useMotionValue(0);
  const bg = useTransform(x, [-120, -40, 0, 40, 120], ["#dc2626", "#dc2626", "#ffffff", "#5B2A6E", "#5B2A6E"]);
  const bgOpacity = useTransform(x, [-120, -40, 0, 40, 120], [0.15, 0.15, 0, 0.15, 0.15]);

  const handleDragEnd = (_, info) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;
    if (offset > 60 || velocity > 400) {
      // Swipe right → star
      onStar();
    } else if (offset < -60 || velocity < -400) {
      // Swipe left → show actions
      setShowActions(true);
    }
  };

  const name = lead.person_name || lead.business_name || "Unnamed lead";
  const company = lead.business_name || lead.person_name || "";
  const location = [lead.city, lead.state].filter(Boolean).join(", ");

  return (
    <div className="lg:hidden relative overflow-hidden rounded-xl">
      {/* Background actions (revealed on swipe left) */}
      <div className="absolute inset-0 flex items-center justify-end gap-2 pr-3">
        <button
          onClick={onEnrich}
          disabled={busy === "loading"}
          className="w-11 h-11 rounded-lg bg-primary text-primary-foreground flex items-center justify-center"
        >
          {busy === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : busy === "enriched" ? <Check className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          className="w-11 h-11 rounded-lg bg-destructive text-destructive-foreground flex items-center justify-center"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Background star indicator (revealed on swipe right) */}
      <motion.div
        className="absolute inset-0 flex items-center pl-4"
        style={{ opacity: bgOpacity }}
      >
        <motion.div style={{ color: lead.starred ? "#D4AF37" : "#5B2A6E" }}>
          <Star className="w-6 h-6" fill={lead.starred ? "currentColor" : "none"} />
        </motion.div>
      </motion.div>

      {/* Foreground card */}
      <motion.div
        drag="x"
        style={{ x }}
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.6}
        onDragEnd={handleDragEnd}
        onClick={() => !showActions && onOpen && onOpen()}
        className="relative bg-white/60 backdrop-blur-xl border border-white/40 rounded-xl p-3 cursor-grab active:cursor-grabbing select-none"
        whileTap={{ cursor: "grabbing" }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{name}</span>
              {lead.starred && <Star className="w-3.5 h-3.5 fill-accent text-accent shrink-0" />}
            </div>
            {company !== name && company && <p className="text-xs text-muted-foreground truncate">{company}</p>}
            {location && <p className="text-xs text-muted-foreground/80 mt-0.5">{location}</p>}
            {lead.email && <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{lead.email}</p>}
          </div>
          <div className="shrink-0 text-right">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {showActions ? "Actions" : "Swipe ←"}
            </span>
          </div>
        </div>
      </motion.div>

      {showActions && (
        <button
          className="absolute inset-0 z-10"
          onClick={(e) => { e.stopPropagation(); setShowActions(false); }}
        />
      )}
    </div>
  );
}