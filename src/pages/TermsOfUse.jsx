import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import {
  TERMS_VERSION, COMPLIANCE_NOTICE, PERMITTED_USES, PROHIBITED_ELIGIBILITY_USES, SUPPORT_EMAIL
} from "@/lib/compliance";

const sections = [
  {
    title: "1. About Leadora",
    body: "Leadora is a lead intelligence, business research, marketing, and contact-enrichment platform. " + COMPLIANCE_NOTICE
  },
  {
    title: "2. Your Account",
    body: "You must provide accurate registration information and are responsible for activity under your account. Access credentials must not be shared."
  },
  {
    title: "3. Permitted Use of Data",
    body: "You may use information obtained through Leadora for: " + PERMITTED_USES.map((u) => u.toLowerCase()).join("; ") + "."
  },
  {
    title: "4. Prohibited Use of Data",
    body: "Leadora may not be used for: " + PROHIBITED_ELIGIBILITY_USES.map((u) => u.toLowerCase()).join("; ") + ". Leadora is not a consumer reporting agency under the Fair Credit Reporting Act."
  },
  {
    title: "5. Credits and Billing",
    body: "Membership is $59 per month and includes 100 monthly Leadora credits. A qualifying enrichment that successfully returns usable data costs 5 credits. Failed enrichments cost 0 credits. Credits do not roll over unless expressly stated. Membership fees are non-refundable except as required by law."
  },
  {
    title: "6. Data Accuracy",
    body: "Information comes from public and permitted third-party sources and may be incomplete, outdated, or inaccurate. You agree to independently verify important information before relying on it."
  },
  {
    title: "7. Acceptable Platform Use",
    body: "You may not resell Leadora data unless specifically authorized, attempt to scrape or circumvent the platform, misuse the service, or use it for any unlawful purpose."
  },
  {
    title: "8. Termination",
    body: "We may suspend or terminate accounts that violate these Terms, misuse data, or create risk for Leadora or its data providers."
  },
  {
    title: "9. Contact",
    body: "Questions about these Terms can be sent to " + SUPPORT_EMAIL + "."
  },
];

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl lady-gradient flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading text-xl font-semibold">Leadora</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition">← Back to Home</Link>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-6 py-14">
        <h1 className="font-heading text-3xl md:text-4xl font-semibold mb-2">Terms of Use</h1>
        <p className="text-sm text-muted-foreground mb-10">Version {TERMS_VERSION}</p>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading text-lg font-semibold mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-12">
          See also our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> and{" "}
          <Link to="/responsible-data-use" className="text-primary hover:underline">Responsible Data Use</Link> page.
        </p>
      </main>
    </div>
  );
}