import React from "react";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "@/lib/compliance";

function TechLogo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-bold text-sm">
        R
      </span>
      <span className="font-mono font-semibold tracking-tight text-lg">
        <span className="text-cyan-400">Ring</span>
        <span className="text-white">Bellz</span>
      </span>
    </span>
  );
}

const exploreLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Pricing", href: "#pricing" },
  { label: "Responsible Data Use", href: "/responsible-data-use" },
];

const legalLinks = [
  { label: "Terms of Use", href: "/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Help", href: "/help" },
  { label: "Contact", href: `mailto:${SUPPORT_EMAIL}` },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-cyan-500/10 bg-[#0D0E13]">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="mb-3">
              <TechLogo />
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Public-data lead intelligence and enrichment for lawful prospecting, marketing, and business development.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3 text-white">Explore</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link to={l.href} className="hover:text-cyan-400 transition">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-cyan-400 transition">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3 text-white">Company</p>
            <ul className="space-y-2 text-sm text-slate-400">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link to={l.href} className="hover:text-cyan-400 transition">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-cyan-400 transition">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-4">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-cyan-400 hover:underline break-all">{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-cyan-500/10">
          <p className="text-xs text-slate-500">© {new Date().getFullYear()} RingBellz. All rights reserved.</p>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            RingBellz is not a consumer reporting agency. RingBellz data may not be used for credit, employment, housing, insurance, government-benefits, or other FCRA-regulated eligibility decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}