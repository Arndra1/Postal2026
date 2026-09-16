import React from "react";

// Small indicator dot shown on lead cards that have been enriched or that
// carry a verified contact (email/phone).
export default function EnrichedDot({ enriched }) {
  if (!enriched) return null;

  return (
    <span
      className="absolute top-2 right-2 h-2 w-2 rounded-full bg-green-500 dark:bg-green-400 shadow-[0_0_4px_rgba(34,197,94,0.6)]"
      title="Verified contact — enriched"
      aria-label="Enriched lead"
    />
  );
}