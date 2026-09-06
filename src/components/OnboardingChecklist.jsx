import React from "react";
import { Link } from "react-router-dom";
import { Search, FolderHeart, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export default function OnboardingChecklist({ savedLeads, enrichments }) {
  const steps = [
    {
      icon: Search,
      title: "Search for leads",
      desc: "Find prospects from public records, new business filings, and more.",
      done: savedLeads > 0,
      to: "/find-leads",
      cta: "Find Leads",
    },
    {
      icon: FolderHeart,
      title: "Save your first lead",
      desc: "Click \"Save\" on any result to add it to your pipeline.",
      done: savedLeads > 0,
      to: "/find-leads",
      cta: "Browse Results",
    },
    {
      icon: Sparkles,
      title: "Enrich a lead",
      desc: "Get verified emails, phones, and social profiles for 5 credits.",
      done: enrichments > 0,
      to: "/saved-leads",
      cta: "Enrich Leads",
    },
  ];

  const allDone = steps.every((s) => s.done);

  if (allDone) return null;

  const completed = steps.filter((s) => s.done).length;

  return (
    <div className="glass-panel p-6 mb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-heading text-lg font-semibold">Welcome to RingBellz!</h2>
          <p className="text-sm text-muted-foreground">Complete these {steps.length} steps to get your first lead enriched. ({completed}/{steps.length} done)</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div key={i} className={`rounded-xl border p-4 transition ${step.done ? "bg-emerald-50/50 border-emerald-200" : "bg-white/30 border-white/40"}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${step.done ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>
                {step.done ? <CheckCircle2 className="w-4 h-4" /> : <step.icon className="w-4 h-4" />}
              </div>
              {step.done && <span className="text-xs font-medium text-emerald-600">Done</span>}
            </div>
            <h3 className="text-sm font-semibold mb-1">{step.title}</h3>
            <p className="text-xs text-muted-foreground mb-3">{step.desc}</p>
            {!step.done && (
              <Link to={step.to} className="text-xs font-medium text-primary flex items-center hover:underline">
                {step.cta} <ArrowRight className="w-3 h-3 ml-1" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}