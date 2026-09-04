import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FlaskConical, Search, FolderHeart, Sparkles, Coins, AlertTriangle, ShieldCheck, Loader2 } from "lucide-react";

const points = [
  { icon: Search, title: "Public business searches are free", desc: "Search government registries and public data at no cost." },
  { icon: FolderHeart, title: "Saving & organizing leads is free", desc: "Save, tag, and manage leads in your pipeline at no cost." },
  { icon: Sparkles, title: "Enrichment costs 5 credits — only on success", desc: "You're charged only when a verified email or validated phone is found." },
  { icon: Coins, title: "Failed enrichment costs 0 credits", desc: "If no contact is found, you keep your credits." },
  { icon: AlertTriangle, title: "Not every business can be enriched", desc: "New businesses may not have discoverable contact information yet." },
  { icon: ShieldCheck, title: "Public records aren't guaranteed", desc: "Government data may not always contain contact details." },
];

export default function BetaOnboarding({ onComplete }) {
  const [submitting, setSubmitting] = useState(false);

  const acknowledge = async () => {
    setSubmitting(true);
    try {
      await base44.functions.invoke("betaAck", {});
      onComplete();
    } catch (_e) {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="bg-card rounded-2xl border border-border lady-shadow-lg p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl lady-gradient flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-semibold">Welcome to the Leadora Beta</h1>
            <p className="text-xs text-muted-foreground">Please review before continuing</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          You've been invited to help test Leadora during our closed beta. Here's how credits and data work:
        </p>

        <div className="mt-6 space-y-3">
          {points.map((p, i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-background">
              <div className="w-8 h-8 rounded-lg bg-secondary/15 flex items-center justify-center shrink-0">
                <p.icon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-sm font-medium">{p.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-4 rounded-xl bg-secondary/10 border border-secondary/25">
          <p className="text-xs text-muted-foreground leading-relaxed">
            We're not promising a specific enrichment success rate — results depend on the business, its public footprint, and data availability. Your feedback helps us improve.
          </p>
        </div>

        <Button className="w-full h-11 mt-6" onClick={acknowledge} disabled={submitting}>
          {submitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</> : "I Understand — Continue"}
        </Button>
      </div>
    </div>
  );
}