import React from "react";
import { Search, Sparkles, FolderKanban, Contact, Eye, ShieldCheck } from "lucide-react";

const features = [
  { icon: Search, title: "Find Leads", desc: "Search available public-data sources to discover prospects by available criteria such as business type, industry, location, company, and other supported filters." },
  { icon: Sparkles, title: "Enrich Leads", desc: "Add available contact and business information through permitted third-party enrichment providers." },
  { icon: FolderKanban, title: "Organize Leads", desc: "Save prospects, add notes, organize leads, and manage lead status from one dashboard." },
  { icon: Contact, title: "Contact Intelligence", desc: "Find available business emails, phone numbers, professional information, company information, and other permitted contact data." },
  { icon: Eye, title: "Source Transparency", desc: "See where information came from, or the appropriate source category, whenever practical." },
  { icon: ShieldCheck, title: "Credit Protection", desc: "Credits are deducted only when a qualifying enrichment successfully returns usable data. Failed enrichments cost 0 RingBellz credits." },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white">Everything You Need to Find and Work Better Leads</h2>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div key={f.title} className="bg-[#12131A] rounded-2xl border border-cyan-500/15 p-6 tech-card">
            <div className="w-11 h-11 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
              <f.icon className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="font-heading font-semibold mb-1.5 text-white">{f.title}</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}