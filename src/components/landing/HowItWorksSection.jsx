import React from "react";

const steps = [
  { n: "01", title: "Find", desc: "Search available public-data sources for prospects that match your target market." },
  { n: "02", title: "Enrich", desc: "Request additional contact or business information when available." },
  { n: "03", title: "Save & Work", desc: "Save qualified prospects to your RingBellz lead workspace and continue your sales process." },
];

export default function HowItWorksSection() {
  return (
    <section id="how" className="bg-card border-y border-border">
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold">From Search to Prospect in Three Simple Steps</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8 md:gap-10 max-w-4xl mx-auto">
          {steps.map((s) => (
            <div key={s.n} className="relative">
              <div className="font-heading text-4xl font-semibold text-secondary mb-3">{s.n}</div>
              <h3 className="font-heading font-semibold mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-muted-foreground mt-12 max-w-xl mx-auto">
          Returned information depends on what is available in public and permitted third-party sources — searches may not always return an email, phone number, professional profile, or other specific data.
        </p>
      </div>
    </section>
  );
}