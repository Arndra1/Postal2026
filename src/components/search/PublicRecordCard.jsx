import React from "react";
import { Button } from "@/components/ui/button";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import EnrichedDot from "@/components/leads/EnrichedDot";
import { Save, Sparkles, Star, ExternalLink, Loader2, Check, X, AlertTriangle } from "lucide-react";

const PIPELINE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground min-w-[80px] shrink-0">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

// Mobile stacked-card variant of the public-data lead row. Mirrors
// PublicLeadRow / StateFilingRow content as a card to avoid table overflow.
export default function PublicRecordCard({ r, k, busy, savedLead, onSave, onEnrich, onStar, onPipeline }) {
  const saving = busy[k] === "saving";
  const saved = !!savedLead;
  const enriching = busy[k + "e"] === "loading";
  const enriched = busy[k + "e"] === "enriched";
  const enrichFailed = busy[k + "e"] === "failed";
  const dup = r.possible_duplicate;
  const sub = [r.person_name, r.address, r.city, r.state, r.zip].filter(Boolean).join(", ");
  const isEnriched = savedLead?.enrichment_status === "enriched" || !!savedLead?.email || !!savedLead?.phone;

  return (
    <div className="glass-card p-4 relative">
      <EnrichedDot enriched={isEnriched} />
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground">{r.record_label || "PUBLIC RECORD"}</span>
            {r.extra?.entity_type && <span className="text-[10px] text-muted-foreground">{r.extra.entity_type}</span>}
            {r.source && <span className="text-[10px] text-muted-foreground">{r.source}</span>}
            {dup && (
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Duplicate
              </span>
            )}
          </div>
          <h3 className="font-heading text-base font-semibold break-words">{r.business_name || r.agency || "—"}</h3>
          {sub && <p className="text-xs text-muted-foreground mt-0.5 break-words">{sub}</p>}
        </div>
        {r.source_url && (
          <Button variant="ghost" size="icon" asChild title="View official source">
            <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
          </Button>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        {r.industry && <Field label="Industry" value={r.industry} />}
        {(r.jurisdiction || r.state) && <Field label="Jurisdiction" value={r.jurisdiction || r.state} />}
        {r.extra?.formation_date && <Field label="Formed" value={r.extra.formation_date} />}
        {r.extra?.status && <Field label="Status" value={r.extra.status} />}
        {(r.extra?.business_id || r.official_record_id) && <Field label="Record ID" value={r.extra?.business_id || r.official_record_id} />}
        {r.agency && <Field label="Agency" value={r.agency} />}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
        {saved ? (
          <ResponsiveSelect
            value={savedLead.pipeline_status || "new"}
            onChange={(v) => onPipeline(savedLead.id, v)}
            aria-label="Pipeline stage"
            options={PIPELINE_OPTIONS}
            className="h-8 w-auto"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Not saved</span>
        )}
        {saved && (
          <Button variant="ghost" size="icon" onClick={() => onStar(savedLead.id, !savedLead.starred)} title="Favorite (0 credits)">
            <Star className={`w-4 h-4 ${savedLead.starred ? "fill-accent text-accent" : ""}`} />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEnrich(r)} disabled={enriching} title="Enrich contact (5 credits on success)">
          {enriching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : enriched ? <Check className="w-4 h-4 mr-1 text-accent" /> : enrichFailed ? <X className="w-4 h-4 mr-1 text-destructive" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Enrich
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSave(r)} disabled={saving || saved} title="Save lead (0 credits)">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-accent" /> : <Save className="w-4 h-4" />}
          {!saved && "Save"}
        </Button>
      </div>
    </div>
  );
}