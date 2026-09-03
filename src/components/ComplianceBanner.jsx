import React from "react";
import { Info } from "lucide-react";

// Small inline compliance notice (accuracy, marketing/outreach, etc.).
export default function ComplianceBanner({ text }) {
  if (!text) return null;
  return (
    <div className="mb-6 flex items-start gap-3 p-4 rounded-2xl bg-secondary/10 border border-secondary/25">
      <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}