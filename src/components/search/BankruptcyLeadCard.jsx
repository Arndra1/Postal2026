import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Sparkles, Star, ExternalLink, Loader2, Check, X, AlertTriangle, Tag, List, Scale, User, Building2 } from "lucide-react";
import TagsEditor from "@/components/leads/TagsEditor";
import ListsEditor from "@/components/leads/ListsEditor";

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
      <span className="text-muted-foreground min-w-[85px] shrink-0">{label}</span>
      <span className="font-medium break-words">{value}</span>
    </div>
  );
}

// Bankruptcy prospect card. Displays ONLY fields actually returned by
// CourtListener. Public record (filing, chapter, court, case number) is always
// visually separated from any later enriched contact information. Never
// fabricates an address — if CourtListener didn't return one, none is shown.
export default function BankruptcyLeadCard({ r, k, busy, savedLead, enrichmentData, onSave, onEnrich, onStar, onPipeline, onTagsChange, lists, onCreateList, onListIdsChange }) {
  const [expanded, setExpanded] = useState(null);
  const saving = busy[k] === "saving";
  const saved = !!savedLead;
  const enriching = busy[k + "e"] === "loading";
  const enriched = busy[k + "e"] === "enriched";
  const enrichFailed = busy[k + "e"] === "failed";
  const dup = r.possible_duplicate;

  const ex = r.extra || {};
  const leadType = ex.lead_type || (r.business_name ? "business" : "person");
  const displayName = r.business_name || r.person_name || ex.case_name || "—";
  const chapter = ex.chapter ? `Chapter ${ex.chapter}` : "";
  const court = ex.court || r.agency || "";
  const caseNumber = ex.docket_number || r.official_record_id || "";
  const filingDate = ex.event_date || "";
  const docketUrl = ex.docket_url || r.source_url || "";

  const enrichedEmail = enrichmentData?.verified_email || enrichmentData?.email || savedLead?.email || "";
  const enrichedPhone = enrichmentData?.verified_phone || enrichmentData?.phone || savedLead?.phone || "";
  const hasVerifiedContact = saved && (enrichedEmail || enrichedPhone);

  return (
    <div className="bg-card rounded-2xl border border-border lady-shadow p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground">PUBLIC RECORD</span>
            <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary inline-flex items-center gap-1">
              {leadType === "business" ? <Building2 className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
              {leadType === "business" ? "Business" : "Person"}
            </span>
            {chapter && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1"><Scale className="w-2.5 h-2.5" /> {chapter}</span>}
            {dup && <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Saved</span>}
          </div>
          <h3 className="font-heading text-base font-semibold break-words">{displayName}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Bankruptcy Filing</p>
        </div>
        {docketUrl && (
          <Button variant="ghost" size="icon" asChild title="View official docket on CourtListener">
            <a href={docketUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4" /></a>
          </Button>
        )}
      </div>

      <div className="space-y-1.5 mb-3">
        <Field label="Filing Date" value={filingDate} />
        <Field label="Chapter" value={chapter} />
        <Field label="Court" value={court} />
        <Field label="Case Number" value={caseNumber} />
        <Field label="State" value={r.state || ""} />
        <Field label="Source" value={r.source || r.agency} />
      </div>

      {hasVerifiedContact && (
        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 mb-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary text-primary-foreground">Enriched Contact</span>
          </div>
          <div className="space-y-1">
            <Field label="Email" value={enrichedEmail} />
            <Field label="Phone" value={enrichedPhone} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">Contact information is provided by third-party enrichment, not the bankruptcy court.</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-3 border-t border-border">
        {saved && (
          <select value={savedLead.pipeline_status || "new"} onChange={(e) => onPipeline(savedLead.id, e.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
            {PIPELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        )}
        {saved && (
          <Button variant="ghost" size="icon" onClick={() => onStar(savedLead.id, !savedLead.starred)} title="Favorite (0 credits)">
            <Star className={`w-4 h-4 ${savedLead.starred ? "fill-accent text-accent" : ""}`} />
          </Button>
        )}
        {saved && (
          <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === "tags" ? null : "tags")} title="Tags (0 credits)">
            <Tag className="w-4 h-4" />
          </Button>
        )}
        {saved && (
          <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === "lists" ? null : "lists")} title="Lists (0 credits)">
            <List className="w-4 h-4" />
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => onEnrich(r)} disabled={enriching} title="Enrich contact (5 credits on verified success only)">
          {enriching ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : enriched ? <Check className="w-4 h-4 mr-1 text-accent" /> : enrichFailed ? <X className="w-4 h-4 mr-1 text-destructive" /> : <Sparkles className="w-4 h-4 mr-1" />}
          Enrich
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onSave(r)} disabled={saving || saved} title="Save lead (0 credits)">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4 text-accent" /> : <Save className="w-4 h-4" />}
          {!saved && "Save"}
        </Button>
      </div>

      {expanded === "tags" && saved && (
        <div className="mt-3 pt-3 border-t border-border">
          <TagsEditor tags={savedLead.tags || []} onTagsChange={(tags) => onTagsChange(savedLead.id, tags)} />
        </div>
      )}
      {expanded === "lists" && saved && (
        <div className="mt-3 pt-3 border-t border-border">
          <ListsEditor lead={savedLead} lists={lists} onCreate={onCreateList} onListIdsChange={(ids) => onListIdsChange(savedLead.id, ids)} />
        </div>
      )}
    </div>
  );
}