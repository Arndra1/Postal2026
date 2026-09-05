import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sparkles, ArrowRight, BadgeCheck, Check
} from "lucide-react";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AudienceSection from "@/components/landing/AudienceSection";
import PricingSection from "@/components/landing/PricingSection";
import ResponsibleUseSection from "@/components/landing/ResponsibleUseSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import LandingFooter from "@/components/landing/LandingFooter";

function TechLogo({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`.trim()}>
      <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-bold text-sm shadow-[0_0_12px_rgba(0,240,255,0.4)]">
        R
      </span>
      <span className="font-mono font-semibold tracking-tight text-lg">
        <span className="text-cyan-400">Ring</span>
        <span className="text-white">Bellz</span>
      </span>
    </span>
  );
}

export default function Landing() {
  return (
    <div className="dark min-h-screen bg-[#0A0B0F] text-slate-100 tech-grid relative overflow-hidden">
      {/* Ambient neon glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-cyan-500/8 blur-[120px]" />
        <div className="absolute top-1/2 -left-40 w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 bg-[#0A0B0F]/80 backdrop-blur-md border-b border-cyan-500/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="RingBellz home" className="flex items-center">
            <TechLogo />
          </Link>
          <nav className="hidden lg:flex items-center gap-8 font-mono text-sm text-slate-400">
            <a href="#features" className="hover:text-cyan-400 transition">Features</a>
            <a href="#how" className="hover:text-cyan-400 transition">How It Works</a>
            <a href="#pricing" className="hover:text-cyan-400 transition">Pricing</a>
            <Link to="/responsible-data-use" className="hover:text-cyan-400 transition">Responsible Data Use</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="hidden md:inline-flex text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10">Sign In</Button></Link>
            <Link to="/register">
              <Button className="bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                Start Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-50">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Public-Data Lead Intelligence &amp; Prospecting
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-white">
              Find Better Leads.<br />Get Better Data.<br />
              <span className="text-cyan-400">Close More Business.</span>
            </h1>
            <p className="mt-6 text-lg text-slate-400 max-w-xl leading-relaxed">
              RingBellz helps businesses discover prospects using public data and enrich lead records through permitted third-party data providers — built for lawful marketing, prospecting, and business development.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="h-12 px-8 text-base bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_24px_rgba(0,240,255,0.3)]">
                  Start Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 hover:border-cyan-500/50">
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-500 font-mono">$59/month · 100 monthly credits · No charge for failed enrichments</p>
          </div>
          <div className="relative">
            <div className="bg-[#12131A] rounded-2xl border border-cyan-500/15 p-6 tech-glow-cyan">
              <div className="flex items-center justify-between mb-5">
                <span className="font-mono text-sm text-slate-500">Lead Intelligence</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-xs font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" /> Provider Match
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0B0F] border border-cyan-500/10">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 flex items-center justify-center text-black font-semibold text-sm">JA</div>
                  <div>
                    <div className="font-medium text-white">Jordan Avery</div>
                    <div className="text-sm text-slate-400">Director of Operations</div>
                  </div>
                </div>
                {[
                  { label: "Company", value: "Northwind Co." },
                  { label: "Location", value: "Atlanta, Georgia" },
                  { label: "Email Found", value: "jordan.avery@northwindco.com" },
                  { label: "Phone Found", value: "+1 (415) 555-0142" },
                  { label: "Professional Profile", value: "Profile found" }
                ].map((r) => (
                  <div key={r.label} className="flex items-start gap-3 text-sm">
                    <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                    <span className="font-mono text-slate-500 w-36 flex-shrink-0">{r.label}</span>
                    <span className="font-medium text-slate-200 break-all">{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <FeaturesSection />
      <HowItWorksSection />
      <AudienceSection />
      <PricingSection />
      <ResponsibleUseSection />
      <FinalCtaSection />

      {/* Data notice */}
      <section className="max-w-3xl mx-auto px-6 pb-12">
        <p className="text-center text-xs text-slate-500 leading-relaxed">
          RingBellz combines public records and permitted third-party data sources for prospecting and business intelligence. Information may be incomplete, outdated, or inaccurate and should be independently verified when important.
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}