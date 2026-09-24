import React from "react";
import { Building2, Globe, Linkedin, Briefcase, Search } from "lucide-react";

const ROWS = [
  { key: "company", label: "Company", icon: Building2 },
  { key: "job_title", label: "Job Title", icon: Briefcase },
  { key: "website", label: "Website", icon: Globe },
  { key: "linkedin", label: "LinkedIn", icon: Linkedin },
];

// Background details returned by the enrichment waterfall when no verified
// email or phone could be matched. Shown instead of discarding the run —
// these runs cost 0 credits.
export default function FoundDetails({ data }) {
  const rows = ROWS.filter((r) => data?.[r.key]);
  if (!rows.length) return null;
  return (
    <div className="rounded-xl bg-amber-50/70 border border-amber-200 p-3 mb-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <Search className="w-3.5 h-3.5 text-amber-700" />
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-600 text-white">Details Found</span>
        <span className="text-[10px] text-amber-800">No verified email or phone · 0 credits</span>
      </div>
      <div className="space-y-1">
        {rows.map((r) => (
          <div key={r.key} className="flex items-start gap-2 text-xs">
            <r.icon className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
            <span className="text-muted-foreground min-w-[70px] shrink-0">{r.label}</span>
            <span className="font-medium break-all">{data[r.key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}