import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/compliance";

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
    <footer className="border-t border-border bg-card">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg lady-gradient flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
              <span className="font-heading text-lg font-semibold">Leadora</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              Public-data lead intelligence and enrichment for lawful prospecting, marketing, and business development.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Explore</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {exploreLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link to={l.href} className="hover:text-foreground transition">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-foreground transition">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold mb-3">Company</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {legalLinks.map((l) => (
                <li key={l.label}>
                  {l.href.startsWith("/") ? (
                    <Link to={l.href} className="hover:text-foreground transition">{l.label}</Link>
                  ) : (
                    <a href={l.href} className="hover:text-foreground transition">{l.label}</a>
                  )}
                </li>
              ))}
            </ul>
            <p className="text-sm mt-4">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary hover:underline break-all">{SUPPORT_EMAIL}</a>
            </p>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Leadora. All rights reserved.</p>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Leadora is not a consumer reporting agency. Leadora data may not be used for credit, employment, housing, insurance, government-benefits, or other FCRA-regulated eligibility decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}