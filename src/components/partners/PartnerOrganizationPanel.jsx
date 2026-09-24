import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ResponsiveSelect from "@/components/ResponsiveSelect";
import { useToast } from "@/components/ui/use-toast";
import { PARTNER_STAGES, ORG_TYPE_LABELS } from "@/lib/community";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Check, ExternalLink, Heart, Loader2, Sparkles, Star, Trash2, X } from "lucide-react";

// Detail drawer for a saved partner organization: the named leader to contact,
// resolved contact details, partnership stage, and outreach notes.
export default function PartnerOrganizationPanel({ org, onClose, onUpdated, onDeleted }) {
  const { toast } = useToast();
  const [closing, setClosing] = useState(false);
  const [enriching, setEnriching] = useState(false);

  const handleClose = () => setClosing(true);

  const persist = async (partial) => {
    await base44.entities.PartnerOrganization.update(org.id, partial);
    onUpdated({ ...org, ...partial });
  };

  const enrich = async () => {
    setEnriching(true);
    try {
      const res = await base44.functions.invoke("enrichPartnerOrg", { partner_org_id: org.id });
      const d = res.data || {};
      if (d.status === "success") {
        const fresh = await base44.entities.PartnerOrganization.get(org.id);
        onUpdated(fresh);
        toast({ title: "Contact details found", description: `${d.credits_charged} credits charged.` });
      } else if (d.status === "partial") {
        const fresh = await base44.entities.PartnerOrganization.get(org.id);
        onUpdated(fresh);
        toast({ title: "Details found", description: d.error || "Background details were found, but no verified email or phone. 0 credits charged." });
      } else if (d.status === "empty") {
        toast({ title: "No contact found", description: d.error || "No verified contact information was found for this organization." });
      } else if (d.status === "provider_error") {
        toast({ title: "Provider temporarily unavailable", description: d.error, variant: "destructive" });
      } else {
        toast({ title: "Enrichment failed", description: d.error || "Please try again.", variant: "destructive" });
      }
    } catch (e) {
      const err = e?.response?.data || {};
      toast({ title: "Enrichment failed", description: err.error || e?.message || "Please try again.", variant: "destructive" });
    } finally {
      setEnriching(false);
    }
  };

  const remove = async () => {
    await base44.entities.PartnerOrganization.delete(org.id);
    onDeleted(org.id);
    handleClose();
  };

  const isChurch = org.org_type === "church";
  const contactRows = [
    { label: "Email", value: org.email },
    { label: "Phone", value: org.phone },
    { label: "Website", value: org.website },
    { label: "Address", value: org.address },
    { label: "City", value: org.city },
    { label: "State", value: org.state },
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <AnimatePresence onExitComplete={() => { if (closing) onClose(); }}>
        {!closing && (
          <>
            <motion.div className="absolute inset-0 bg-black/30" onClick={handleClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} />
            <motion.div
              className="relative w-full max-w-md bg-white/60 backdrop-blur-xl h-full border-l border-white/40 overflow-y-auto overscroll-contain safe-pt"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 320 }}
            >
              <div className="sticky top-0 bg-white/70 backdrop-blur-xl border-b border-white/40 px-6 py-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {isChurch ? <Heart className="w-4 h-4 text-primary shrink-0" /> : <Building2 className="w-4 h-4 text-primary shrink-0" />}
                    <h3 className="font-heading text-lg font-semibold truncate">{org.org_name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ORG_TYPE_LABELS[org.org_type] || "Organization"}{org.ein ? ` · EIN ${org.ein}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => persist({ starred: !org.starred })} title={org.starred ? "Unstar" : "Star"}>
                    <Star className={"w-5 h-5 " + (org.starred ? "fill-accent text-accent" : "")} />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={handleClose}><X className="w-5 h-5" /></Button>
                </div>
              </div>

              <div className="px-6 py-5 space-y-6">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Partnership Stage</Label>
                  <ResponsiveSelect
                    value={org.stage || "new"}
                    onChange={(v) => persist({ stage: v })}
                    aria-label="Partnership Stage"
                    options={PARTNER_STAGES.map((s) => ({ value: s.key, label: s.label }))}
                    className="mt-1.5 w-full h-9"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Who to Contact</Label>
                  <div className="mt-2 space-y-2">
                    <Input
                      defaultValue={org.leader_name || ""}
                      placeholder="Pastor, executive director, financial ministry leader"
                      className="h-10"
                      onBlur={(e) => { if (e.target.value !== (org.leader_name || "")) persist({ leader_name: e.target.value }); }}
                    />
                    <Input
                      defaultValue={org.leader_title || ""}
                      placeholder="Their title"
                      className="h-10"
                      onBlur={(e) => { if (e.target.value !== (org.leader_title || "")) persist({ leader_title: e.target.value }); }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact Details</span>
                    <Button variant="outline" size="sm" onClick={enrich} disabled={enriching}>
                      {enriching ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                      {enriching ? "Working…" : "Find contact details"}
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    {contactRows.map((row) => (
                      <div key={row.label} className="flex justify-between gap-4 py-1.5 border-b border-border">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium text-right break-all">{row.value || "—"}</span>
                      </div>
                    ))}
                    <div className="flex justify-between gap-4 py-1.5">
                      <span className="text-muted-foreground">Verified contact</span>
                      <span className="font-medium text-right">
                        {org.contact_status === "verified"
                          ? <span className="inline-flex items-center gap-1 text-emerald-700"><Check className="w-3.5 h-3.5" /> Verified</span>
                          : "Not yet"}
                      </span>
                    </div>
                    {org.ntee_category && (
                      <div className="flex justify-between gap-4 py-1.5 border-b border-border">
                        <span className="text-muted-foreground">Cause area</span>
                        <span className="font-medium text-right">{org.ntee_category}{org.ntee_code ? ` · ${org.ntee_code}` : ""}</span>
                      </div>
                    )}
                    {org.ruling_year && (
                      <div className="flex justify-between gap-4 py-1.5 border-b border-border">
                        <span className="text-muted-foreground">IRS exempt since</span>
                        <span className="font-medium text-right">{org.ruling_year}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Contact details come from third-party enrichment, not the IRS. Finding them costs 5 credits only when a verified email or phone is returned.
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next Step</Label>
                  <Input
                    defaultValue={org.next_step || ""}
                    placeholder="e.g. Call the church office Tuesday"
                    className="mt-1.5 h-10"
                    onBlur={(e) => { if (e.target.value !== (org.next_step || "")) persist({ next_step: e.target.value }); }}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Outreach Notes</Label>
                  <Textarea
                    defaultValue={org.notes || ""}
                    placeholder="What was discussed, who you spoke with, what happens next…"
                    className="mt-1.5 min-h-[110px]"
                    onBlur={(e) => { if (e.target.value !== (org.notes || "")) persist({ notes: e.target.value }); }}
                  />
                </div>

                {org.source_reference && (
                  <a href={org.source_reference} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {org.source || "Public record source"}
                  </a>
                )}

                <Button variant="ghost" className="text-destructive hover:text-destructive" onClick={remove}>
                  <Trash2 className="w-4 h-4 mr-2" /> Remove organization
                </Button>
              </div>
              <div className="h-4 safe-pb" />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}