import React from "react";
import { computeLeadScore, getScoreLabel } from "@/lib/leadScore";

export default function LeadScoreBadge({ lead, showLabel = true }) {
  const score = computeLeadScore(lead);
  const label = getScoreLabel(score);
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${label.className}`}>
        {showLabel ? label.text : ""} {score}
      </span>
    </div>
  );
}