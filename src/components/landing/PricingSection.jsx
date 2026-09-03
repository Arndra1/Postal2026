import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const planIncludes = [
  "100 monthly Leadora credits",
  "Lead discovery tools",
  "Lead workspace",
  "Contact enrichment access",
  "Saved leads",
  "Lead organization",
  "Data-source information where available",
  "Customer support",
];

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold">Simple Pricing. No Complicated Plans.</h2>
        </div>
        <div className="max-w-md mx-auto bg-card rounded-3xl border-2 border-primary/20 lady-shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium mb-4">Membership</div>
            <h3 className="font-heading text-2xl font-semibold">Leadora Membership</h3>
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="font-heading text-5xl font-semibold">$59</span>
              <span className="text-muted-foreground mb-2">/month</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {planIncludes.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-accent flex-shrink-0" /> {p}</li>
            ))}
          </ul>
          <div className="rounded-xl bg-secondary/15 border border-secondary/30 p-4 text-center mb-6">
            <p className="text-sm font-semibold text-primary">5 credits per successful qualifying enrichment.</p>
            <p className="text-sm font-semibold text-primary mt-1">Failed enrichment = 0 credits.</p>
          </div>
          <Link to="/register"><Button className="w-full h-12 text-base">Start Now</Button></Link>
          <p className="text-center text-xs text-muted-foreground mt-4">Third-party data availability varies by provider and record.</p>
        </div>
      </div>
    </section>
  );
}