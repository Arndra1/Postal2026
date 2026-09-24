import React from "react";
import { Link } from "react-router-dom";
import InquiryForm from "@/components/inquiry/InquiryForm";
import Logo from "@/components/Logo";
import GradientBackground from "@/components/GradientBackground";
import { ShieldCheck } from "lucide-react";

// Public page — reachable without a login. This is the only way an individual
// enters the system: by asking for help themselves.
export default function PublicInquiry() {
  return (
    <div className="min-h-screen relative">
      <GradientBackground />
      <div className="glass-nav safe-pt px-5 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center"><Logo variant="header" /></Link>
        <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" /> You asked — that is why we can reach you
        </span>
      </div>

      <main className="max-w-2xl mx-auto px-5 py-10 sm:py-14 safe-pb">
        <header className="text-center mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-semibold tracking-tight">
            Help with credit, debt, or money — on your terms
          </h1>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            Tell us what you need and how to reach you. We will talk through your situation, explain what is possible, and — if it helps — connect you with education and support for your family, your church, or your business.
          </p>
        </header>

        <InquiryForm />

        <section className="mt-8 glass-panel p-5">
          <h2 className="font-heading font-semibold mb-2">What you are agreeing to</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We only contact people who ask us to. When you submit this form, we store the exact consent wording you saw, along with the date and time you agreed, so there is never a question about what you said yes to. You can withdraw at any time by replying STOP to a text or telling us to stop.
          </p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            We do not sell your information, and we do not buy lists of people to contact. Nothing here is a promise of a specific credit outcome — results depend on your own situation.
          </p>
        </section>
      </main>
    </div>
  );
}