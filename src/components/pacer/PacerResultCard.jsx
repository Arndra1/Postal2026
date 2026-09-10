import React from "react";
import { ScrollText, Gavel } from "lucide-react";

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-3 text-sm py-1 border-b border-border/50 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground text-right font-medium">{value}</span>
    </div>
  );
}

// Renders one PACER PCL party/case result. PACER returns court case + party data
// only — no address/phone/email contact info (see page notice).
export default function PacerResultCard({ result }) {
  const r = result || {};
  const name = r.partyName || r.name || [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" ") || "Unknown party";
  const role = r.role || r.partyRole || "";
  const cases = r.cases || r.caseList || (r.caseNumber ? [{ caseNumber: r.caseNumber, court: r.court, caseTitle: r.caseTitle }] : []);

  return (
    <div className="glass-card p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Gavel className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm truncate">{name}</h3>
          {role && <span className="text-xs text-muted-foreground">{role}</span>}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">PACER</span>
      </div>

      <Field label="Party type" value={r.partyType || (r.entityType === "P" ? "Person" : r.entityType === "B" ? "Business" : "")} />
      <Field label="Court" value={r.court || r.courtName || r.courtCode} />
      <Field label="Case number" value={r.caseNumber || r.caseNum} />
      <Field label="Case title" value={r.caseTitle || r.caseName} />
      <Field label="Filed" value={r.dateFiled || r.filedDate} />
      <Field label="Terminated" value={r.dateTerminated || r.terminatedDate} />

      {cases.length > 1 && (
        <div className="mt-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Related cases</div>
          <div className="space-y-1">
            {cases.map((c, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                <ScrollText className="w-3 h-3 shrink-0" />
                <span className="truncate">{c.caseNumber}{c.court ? ` · ${c.court}` : ""}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}