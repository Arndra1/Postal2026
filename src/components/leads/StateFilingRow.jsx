import React from "react";
import { Button } from "@/components/ui/button";
import { Save, Sparkles, Star, ExternalLink, Loader2, Check, X, AlertTriangle } from "lucide-react";

const PIPELINE_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

// A real newly-registered business record from an official state source.
// All organize actions (save/star/pipeline) = 0 credits; enrichment = 5 on success.
export default function StateFilingRow({ r, k, busy, savedLead, onSave, onEnrich, onStar, onPipeline }) {
  const saving = busy[k] === "saving";
  const saved = !!savedLead;
  const enriching = busy[k + "e"] === "loading";
  const enriched = busy[k + "e"] === "enriched";
  const enrichFailed = busy[k + "e"] === "failed";
  const dup = r.possible_duplicate;

  return (
    <tr className="border-t border-white/30 hover:bg-white/40">
      <td className="px-4 py-3">
        <div className="font-medium break-words">{r.business_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{[r.address, r.city, r.state, r.zip].filter(Boolean).join(", ")}</div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground">{r.record_label || "PUBLIC RECORD"}</span>
          {r.extra?.entity_type && <span className="text-[10px] text-muted-foreground">{r.extra.entity_type}</span>}
          {dup && (
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Possible Duplicate
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell text-xs">{r.extra?.formation_date || "—"}</td>
      <td className="px-4 py-3 hidden lg:table-cell text-xs">{r.extra?.status || "—"}</td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs">{r.extra?.business_id || r.official_record_id || "—"}</td>
      <td className="px-4 py-3 hidden xl:table-cell text-xs text-muted-foreground">{r.agency}</td>
      <td className="px-4 py-3">
        {saved ? (
          <select
            value={savedLead.pipeline_status || "new"}
            onChange={(e) => onPipeline(savedLead.id, e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          >
            {PIPELINE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ) : <span className="text-xs text-muted-foreground">—</span>}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          {r.source_url && (
            <Button variant="ghost" size="sm" asChild title="View official source">
              <a href={r.source_url} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
            </Button>
          )}
          {saved && (
            <Button variant="ghost" size="sm" onClick={() => onStar(savedLead.id, !savedLead.starred)} title="Favorite (0 credits)">
              <Star className={`w-4 h-4 ${savedLead.starred ? "fill-accent text-accent" : ""}`} />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEnrich(r)} disabled={enriching} title="Enrich contact (5 credits on success)">
            {enriching ? <Loader2 className="w-4 h-4 animate-spin" /> : enriched ? <Check className="w-4 h-4 text-accent" /> : enrichFailed ? <X className="w-4 h-4 text-destructive" /> : <Sparkles className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onSave(r)} disabled={saving || saved} title="Save lead (0 credits)">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-accent" /> : <Save className="w-4 h-4" />}
          </Button>
        </div>
      </td>
    </tr>
  );
}