import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const planIncludes = [
  "100 monthly RingBellz credits",
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
    <section id="pricing" className="bg-[#0D0E13] border-y border-cyan-500/10">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white">Simple Pricing. No Complicated Plans.</h2>
        </div>
        <div className="max-w-md mx-auto bg-[#12131A] rounded-3xl border-2 border-cyan-500/20 tech-glow-cyan p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-medium mb-4">Membership</div>
            <h3 className="font-heading text-2xl font-semibold text-white">RingBellz Membership</h3>
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="font-heading text-5xl font-semibold text-white">$59</span>
              <span className="text-slate-400 mb-2">/month</span>
            </div>
          </div>
          <ul className="space-y-3 mb-6">
            {planIncludes.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-slate-300"><Check className="w-4 h-4 text-cyan-400 flex-shrink-0" /> {p}</li>
            ))}
          </ul>
          <div className="rounded-xl bg-cyan-500/5 border border-cyan-500/20 p-4 text-center mb-6">
            <p className="text-sm font-semibold text-cyan-400">5 credits per successful qualifying enrichment.</p>
            <p className="text-sm font-semibold text-cyan-400 mt-1">Failed enrichment = 0 credits.</p>
          </div>
          <Link to="/register"><Button className="w-full h-12 text-base bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]">Start Now</Button></Link>
          <p className="text-center text-xs text-slate-500 mt-4">Third-party data availability varies by provider and record.</p>
        </div>
      </div>
    </section>
  );
}