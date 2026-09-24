import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { NEED_TYPES } from "@/lib/community";
import { CheckCircle2, Loader2, Mail, MapPin, Phone, UserCheck } from "lucide-react";

// One person who asked for help, with the consent they gave preserved on the
// record. Converting turns the inquiry into a lead without losing any of it.
export default function InquiryCard({ inquiry, onChanged }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const needLabel = NEED_TYPES.find((n) => n.value === inquiry.need_type)?.label || "Something else";
  const consentAt = inquiry.consent_at ? new Date(inquiry.consent_at).toLocaleString() : "—";

  const convert = async () => {
    setBusy(true);
    try {
      const lead = await base44.entities.Lead.create({
        user_id: user.id,
        person_name: inquiry.name,
        email: inquiry.email || "",
        phone: inquiry.phone || "",
        city: inquiry.city || "",
        state: inquiry.state || "",
        lead_type: "person",
        saved: true,
        contact_status: (inquiry.email || inquiry.phone) ? "verified" : "unknown",
        pipeline_status: "new",
        record_label: "INQUIRY",
        agency: "Public inquiry",
        retrieval_timestamp: inquiry.consent_at,
        tags: ["inquiry"],
        original_public_fields: {
          inquiry_id: inquiry.id,
          need_type: inquiry.need_type,
          message: inquiry.message || "",
          consent_text: inquiry.consent_text || "",
          consent_at: inquiry.consent_at,
          referred_by: inquiry.referred_by || "",
          source: inquiry.source || "",
        },
      });

      if (inquiry.message) {
        await base44.entities.LeadNote.create({
          user_id: user.id,
          lead_id: lead.id,
          note: `Stated need: ${inquiry.message}`,
        });
      }

      await base44.entities.Inquiry.update(inquiry.id, { status: "converted", converted_lead_id: lead.id });
      onChanged({ ...inquiry, status: "converted", converted_lead_id: lead.id });
      toast({ title: "Added to your leads", description: "The inquiry is now a lead with its consent record attached." });
    } catch (_e) {
      toast({ title: "Could not convert", description: "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const markReviewed = async () => {
    await base44.entities.Inquiry.update(inquiry.id, { status: "reviewed" });
    onChanged({ ...inquiry, status: "reviewed" });
  };

  return (
    <div className="glass-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-heading font-semibold">{inquiry.name}</h3>
          <p className="text-sm text-muted-foreground">{needLabel}</p>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-secondary/30 text-secondary-foreground shrink-0">
          {inquiry.status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {inquiry.email && <span className="inline-flex items-center gap-1"><Mail className="w-3 h-3" />{inquiry.email}</span>}
        {inquiry.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3" />{inquiry.phone}</span>}
        {(inquiry.city || inquiry.state) && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[inquiry.city, inquiry.state].filter(Boolean).join(", ")}</span>}
      </div>

      {inquiry.message && <p className="mt-3 text-sm">{inquiry.message}</p>}

      {inquiry.referred_by && <p className="mt-2 text-xs text-muted-foreground">Referred by {inquiry.referred_by}</p>}

      <div className="mt-3 rounded-lg bg-white/40 border border-border p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Consent on record</p>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{inquiry.consent_text || "No disclosure text stored."}</p>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Agreed {consentAt}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {inquiry.status === "converted" ? (
          <span className="text-xs text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Converted to a lead</span>
        ) : (
          <>
            <Button size="sm" onClick={convert} disabled={busy}>
              {busy ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <UserCheck className="w-3.5 h-3.5 mr-1" />}
              Convert to lead
            </Button>
            {inquiry.status === "new" && (
              <Button variant="outline" size="sm" onClick={markReviewed} disabled={busy}>Mark reviewed</Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}