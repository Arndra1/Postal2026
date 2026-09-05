import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Check, X, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  COMPLIANCE_NOTICE, ACCURACY_NOTICE, MARKETING_NOTICE,
  PERMITTED_USES, PROHIBITED_ELIGIBILITY_USES, SUPPORT_EMAIL
} from "@/lib/compliance";

export default function ResponsibleDataUse() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl lady-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-xl font-semibold">RingBellz</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Back to Home</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-14">
        <div className="text-center mb-12">
          <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-5">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <h1 className="font-heading text-3xl md:text-4xl font-semibold">Responsible Data Use</h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">{COMPLIANCE_NOTICE}</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card rounded-2xl border border-border p-6 lady-shadow">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <Check className="w-5 h-5 text-accent" /> Permitted Uses
            </h2>
            <ul className="space-y-2.5">
              {PERMITTED_USES.map((u) => (
                <li key={u} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" /> {u}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6 lady-shadow">
            <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" /> Prohibited Uses
            </h2>
            <ul className="space-y-2.5">
              {PROHIBITED_ELIGIBILITY_USES.map((u) => (
                <li key={u} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                  <X className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" /> {u}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-6 lady-shadow mb-8">
          <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-accent" /> Your Responsibilities
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{MARKETING_NOTICE}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">{ACCURACY_NOTICE}</p>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          Questions about permitted use? Contact us at{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline">{SUPPORT_EMAIL}</a>.
          See also our <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link> and{" "}
          <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
        </p>
      </main>
    </div>
  );
}