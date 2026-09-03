import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/compliance";
import {
  Search, BadgeCheck, FileSpreadsheet, FolderHeart, Coins, Download, BarChart3, ShieldCheck,
  UserSearch, Sparkles, ArrowRight, Check
} from "lucide-react";

const features = [
  { icon: Search, title: "Lead Discovery", desc: "Find leads by person, business, industry, location, and job title with powerful filters." },
  { icon: UserSearch, title: "Contact Enrichment", desc: "Turn a name and company into a complete, actionable contact profile in seconds." },
  { icon: BadgeCheck, title: "Contact Verification", desc: "Provider-verified emails, phone numbers, and professional profiles, labeled by actual data quality." },
  { icon: FolderHeart, title: "Saved Lead Management", desc: "Organize, search, and filter your saved leads in clean, scannable lists." },
  { icon: Coins, title: "Credit Tracking", desc: "Transparent credit balance with a full ledger of every movement." },
  { icon: FileSpreadsheet, title: "CSV Export", desc: "Export your saved leads to CSV for your CRM, outreach, or spreadsheet." },
  { icon: BarChart3, title: "Business Intelligence", desc: "Dashboard analytics that show your enrichment activity and pipeline at a glance." },
  { icon: ShieldCheck, title: "Secure Account Access", desc: "Bank-grade authentication with role-based permissions and server-side security." },
];

const steps = [
  { n: "01", title: "Find or import a lead", desc: "Search by name and company, or start from a website." },
  { n: "02", title: "Enrich the lead", desc: "Run enrichment to pull verified contact intelligence." },
  { n: "03", title: "Receive verified info", desc: "Get verified email, phone, LinkedIn, and address." },
  { n: "04", title: "Save, organize & export", desc: "Save leads to lists and export to CSV anytime." },
];

const planIncludes = [
  "100 credits every month", "Lead search", "Lead enrichment", "Saved leads", "CSV export",
  "Dashboard analytics", "Lead management", "Account history",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl lady-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-xl font-semibold tracking-tight">Leadora</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#how" className="hover:text-foreground transition">How it works</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button></Link>
            <Link to="/signup"><Button>Start Now</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-secondary/30 blur-3xl" />
          <div className="absolute top-40 -left-24 w-80 h-80 rounded-full bg-accent/20 blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/20 text-primary text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> Public-data lead intelligence &amp; prospecting.
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight">
              Find Better Leads.<br />Get Better Data.<br />
              <span className="text-primary">Close More Business.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              Leadora helps businesses discover, enrich, organize, and manage leads with public-data lead intelligence — built for lawful marketing, prospecting, and business development.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/signup"><Button size="lg" className="h-12 px-8 text-base">Start Now <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
              <Link to="/login"><Button size="lg" variant="outline" className="h-12 px-8 text-base">Sign In</Button></Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">$59/month · 100 credits · No charge on failed lookups</p>
          </div>
          <div className="relative">
            <div className="bg-card rounded-2xl lady-shadow-lg border border-border p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-medium text-muted-foreground">Verified Contact</span>
                <BadgeCheck className="w-5 h-5 text-accent" />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border">
                  <div className="w-10 h-10 rounded-full lady-gradient flex items-center justify-center text-white font-semibold text-sm">JA</div>
                  <div><div className="font-medium">Jordan Avery</div><div className="text-sm text-muted-foreground">Director of Operations</div></div>
                </div>
                {["Verified email · jordan.avery@northwindco.com", "Verified phone · +1 (415) 555-0142", "LinkedIn · /in/jordan-avery"].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-accent" /> {t}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold">Everything you need to work your leads</h2>
          <p className="mt-4 text-muted-foreground">A complete platform for discovery, enrichment, and management — built for serious operators.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((f) => (
            <div key={f.title} className="bg-card rounded-2xl border border-border p-6 lady-shadow hover:shadow-md transition">
              <div className="w-11 h-11 rounded-xl bg-secondary/20 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1.5">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="bg-card border-y border-border">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold">How it works</h2>
            <p className="mt-4 text-muted-foreground">Four steps from name to closed deal.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((s) => (
              <div key={s.n} className="relative">
                <div className="font-heading text-4xl font-semibold text-secondary mb-3">{s.n}</div>
                <h3 className="font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold">Simple, premium pricing</h2>
          <p className="mt-4 text-muted-foreground">One membership. Everything included.</p>
        </div>
        <div className="max-w-md mx-auto bg-card rounded-3xl border-2 border-primary/20 lady-shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 text-accent text-xs font-medium mb-4">Membership</div>
            <h3 className="font-heading text-2xl font-semibold">Leadora Membership</h3>
            <div className="mt-4 flex items-end justify-center gap-1">
              <span className="font-heading text-5xl font-semibold">$59</span>
              <span className="text-muted-foreground mb-2">/month</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">100 credits every month</p>
          </div>
          <ul className="space-y-3 mb-8">
            {planIncludes.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-accent flex-shrink-0" /> {p}</li>
            ))}
          </ul>
          <Link to="/signup"><Button className="w-full h-12 text-base">Start Now</Button></Link>
          <p className="text-center text-xs text-muted-foreground mt-4">1 successful enrichment = 5 credits · No charge on failed lookups</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="rounded-3xl lady-gradient p-10 md:p-16 text-center text-white">
          <h2 className="font-heading text-3xl md:text-4xl font-semibold">Ready to find better leads?</h2>
          <p className="mt-4 text-white/80 max-w-xl mx-auto">Join the operators who close more business with verified contact intelligence.</p>
          <Link to="/signup" className="inline-block mt-8"><Button size="lg" variant="secondary" className="h-12 px-8 text-base bg-white text-primary hover:bg-white/90">Start Now <ArrowRight className="w-4 h-4 ml-1" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg lady-gradient flex items-center justify-center"><Sparkles className="w-4 h-4 text-white" /></div>
            <span className="font-heading font-semibold text-foreground">Leadora</span>
          </div>
          <div className="text-center md:text-right">
            <p>© {new Date().getFullYear()} Leadora. All rights reserved.</p>
            <p className="text-xs mt-1">Questions? Contact us at <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">{SUPPORT_EMAIL}</a></p>
            <p className="text-xs mt-1">Leadora is not a consumer reporting agency. Data may not be used to determine eligibility for credit, employment, housing, insurance, or government benefits.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}