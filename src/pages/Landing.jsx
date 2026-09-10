import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import Logo from "@/components/Logo";
import GradientBackground from "@/components/GradientBackground";
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

export default function Landing() {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !isLoadingAuth) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  return (
    <div className="min-h-screen text-foreground relative">
      <GradientBackground />

      {/* Nav */}
      <header className="sticky top-0 z-40 glass-nav">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" aria-label="RingBellz home" className="flex items-center">
            <Logo variant="header" />
          </Link>
          <nav className="hidden lg:flex items-center gap-8 text-sm text-muted-foreground font-medium">
            <a href="#features" className="hover:text-primary transition">Features</a>
            <a href="#how" className="hover:text-primary transition">How It Works</a>
            <a href="#pricing" className="hover:text-primary transition">Pricing</a>
            <Link to="/responsible-data-use" className="hover:text-primary transition">Responsible Data Use</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login"><Button variant="ghost" className="hidden md:inline-flex text-muted-foreground hover:text-primary hover:bg-primary/5">Sign In</Button></Link>
            <Link to="/register">
              <Button className="lady-gradient text-white hover:opacity-90 shadow-lg">
                Start Now
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/50 border border-primary/20 text-primary text-xs font-medium mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5" /> Public-Data Lead Intelligence &amp; Prospecting
            </div>
            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-foreground">
              Find the right people.<br />Get their <span className="text-primary">real contact info.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl leading-relaxed">
              RingBellz is a prospecting app — it helps small businesses find people and companies worth reaching out to, then digs up their real contact info so you can actually get in touch.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link to="/register">
                <Button size="lg" className="h-12 px-8 text-base lady-gradient text-white hover:opacity-90 shadow-lg">
                  Start Now <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="h-12 px-8 text-base glass-input border-primary/20 text-primary hover:bg-primary/5">
                  Sign In
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">$59/month · 100 monthly credits · No charge for failed enrichments</p>
          </div>
          <div className="relative">
            <div className="glass-panel p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm text-muted-foreground font-medium">Lead Intelligence</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                  <BadgeCheck className="w-3.5 h-3.5" /> Provider Match
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/40 border border-white/50">
                  <div className="w-10 h-10 rounded-full lady-gradient flex items-center justify-center text-white font-semibold text-sm">JA</div>
                  <div>
                    <div className="font-medium text-foreground">Jordan Avery</div>
                    <div className="text-sm text-muted-foreground">Director of Operations</div>
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
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span className="text-muted-foreground w-36 flex-shrink-0">{r.label}</span>
                    <span className="font-medium text-foreground break-all">{r.value}</span>
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
        <p className="text-center text-xs text-muted-foreground leading-relaxed">
          RingBellz combines public records and permitted third-party data sources for prospecting and business intelligence. Information may be incomplete, outdated, or inaccurate and should be independently verified when important.
        </p>
      </section>

      <LandingFooter />
    </div>
  );
}