import React from "react";
import { Button } from "@/components/ui/button";
import { Building2, Check, ExternalLink, Heart, Loader2, MapPin, Plus } from "lucide-react";

// One organization from the official IRS file. Shows only fields the IRS
// actually publishes — nothing inferred, nothing scored.
export default function OrgResultCard({ r, saved, busy, onSave, onOpen }) {
  const extra = r.extra || {};
  const isChurch = extra.org_type === "church";
  const location = [r.city, r.state].filter(Boolean).join(", ");

  return (
    <div className="glass-card p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-secondary/25 flex items-center justify-center shrink-0">
          {isChurch ? <Heart className="w-4 h-4 text-primary" /> : <Building2 className="w-4 h-4 text-primary" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-heading font-semibold leading-snug">{r.business_name}</h3>
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground shrink-0">
              {isChurch ? "Church" : "Nonprofit"}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {extra.ntee_category && <span>{extra.ntee_category}{extra.ntee_code ? ` · ${extra.ntee_code}` : ""}</span>}
            {location && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{location}</span>}
            {extra.ruling_year && <span>IRS exempt since {extra.ruling_year}</span>}
          </div>

          {r.address && <p className="mt-1 text-xs text-muted-foreground">{r.address}{r.zip ? ` ${r.zip}` : ""}</p>}
          {extra.ein && <p className="mt-1 text-[11px] text-muted-foreground">EIN {extra.ein}</p>}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {saved ? (
          <Button variant="outline" size="sm" onClick={onOpen}>
            <Check className="w-3.5 h-3.5 mr-1" /> Saved — open
          </Button>
        ) : (
          <Button size="sm" onClick={onSave} disabled={busy === "saving"}>
            {busy === "saving" ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
            Save as partner prospect
          </Button>
        )}
        <a href={r.source_url} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ExternalLink className="w-3 h-3" /> IRS source
        </a>
      </div>
    </div>
  );
}