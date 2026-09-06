import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import FaqList from "@/components/support/FaqList";
import SupportForm from "@/components/support/SupportForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  HelpCircle, Search, Scale, Mail, Coins, Sparkles, CreditCard, LifeBuoy,
  Database, ShieldCheck, Flag, UserCog, Headset
} from "lucide-react";
import {
  COMPLIANCE_NOTICE, ACCURACY_NOTICE, MARKETING_NOTICE,
  PERMITTED_USES, PROHIBITED_ELIGIBILITY_USES, SUPPORT_EMAIL
} from "@/lib/compliance";

const faqs = [
  { q: "How do credits work?", a: "Your membership includes 100 credits each month. Each successful enrichment costs 5 credits, so you can run up to 20 successful enrichments per cycle." },
  { q: "Do I lose credits on a failed lookup?", a: "Never. Credits are only deducted when an enrichment returns verified contact data. Timeouts, errors, empty results, and malformed responses cost 0 credits." },
  { q: "What happens when I cancel?", a: "Your membership remains active until the end of your current billing period. After that, paid access is removed. You can reactivate anytime." },
  { q: "How often do credits reset?", a: "Credits reset once per valid billing cycle when your membership renews. They do not roll over." },
  { q: "Can I export my leads?", a: "Yes. From Saved Leads, use the Export CSV button to download all your saved leads as a spreadsheet." },
  { q: "How do I report a data issue or incorrect information?", a: "Use the Contact Support form below and choose the Data Correction category. Tell us which record is affected and what looks wrong. We route data-quality reports to the team responsible for that data source." },
  { q: "How do I ask a billing question?", a: "Submit the Contact Support form with the Billing category, or email us at " + SUPPORT_EMAIL + ". Include your account email and the date of the charge in question." },
  { q: "How do I get help with my account?", a: "Choose the Account category in the form below. For password resets, use the forgot-password link on the sign-in page — we can't reset passwords for you by email." },
  { q: "How do I submit a privacy request?", a: "Use the Contact Support form with the Privacy category. Describe the request clearly (for example, removal of specific personal information). We review and respond by email." },
  { q: "How do I report suspected misuse of the platform?", a: "Choose the Compliance category in the form below and describe what you observed. Misuse reports are taken seriously and reviewed by our compliance team." },
  { q: "How do I report a technical problem?", a: "Choose the Technical Problem category and describe what you were doing when the issue occurred, including any error message. The more detail, the faster we can fix it." },
  { q: "Do you offer phone support?", a: "No. RingBellz provides email-based support only. Submit the Contact Support form and the RingBellz Support Team will respond by email." },
];

const articles = [
  { icon: UserCog, title: "Getting Started", body: "Set up your profile, learn how search, enrichment, and saved leads fit together, and take your first pass through the dashboard." },
  { icon: Coins, title: "How Credits Work", body: "100 monthly credits. 5 credits per successful enrichment. No charge on failures. Credits reset each billing cycle and do not roll over." },
  { icon: Sparkles, title: "How Enrichment Works", body: "Enter a name and/or company (plus any known details). We contact our provider, validate the response, and return verified contact data. You're only charged when verified data is returned." },
  { icon: CreditCard, title: "Billing Help", body: "The RingBellz membership is $59/month and includes 100 credits. Cancel anytime — access continues until your period ends. All payments are processed securely server-side." },
  { icon: Database, title: "Report a Data Issue", body: "Found incorrect or outdated information? Submit a Data Correction request and we'll route it to the right data source for review." },
  { icon: ShieldCheck, title: "Privacy Requests", body: "To request removal of specific personal information or other privacy assistance, submit a Privacy request through the form below." },
  { icon: Flag, title: "Report Suspected Misuse", body: "If you believe the platform is being used unlawfully or in violation of our Terms of Use, submit a Compliance report. All reports are reviewed." },
  { icon: LifeBuoy, title: "Technical Support", body: "Experiencing an error or unexpected behavior? Submit a Technical Problem report with steps to reproduce it and we'll investigate." },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const q = search.trim().toLowerCase();
  const match = (...texts) => !q || texts.some((t) => t.toLowerCase().includes(q));
  const visibleArticles = articles.filter((a) => match(a.title, a.body));
  const visibleFaqs = faqs.filter((f) => match(f.q, f.a));
  const noResults = q && visibleArticles.length === 0 && visibleFaqs.length === 0;

  return (
    <div>
      <PageHeader title="Help & Support" subtitle="Search FAQs, read help articles, and contact our support team." />

      {/* Search */}
      <div className="relative mb-8 max-w-xl">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help articles and FAQs..." className="pl-10 h-11 rounded-xl" />
      </div>

      {/* Help articles */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {visibleArticles.map((a) => (
          <div key={a.title} className="glass-card p-5">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center mb-3"><a.icon className="w-5 h-5 text-primary" /></div>
            <h3 className="font-semibold mb-1.5 text-sm">{a.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{a.body}</p>
          </div>
        ))}
        {q && visibleArticles.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No help articles matched your search.</p>}
      </div>

      {/* FAQ */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> Frequently Asked Questions</h2>
        {visibleFaqs.length > 0 ? <FaqList faqs={visibleFaqs} /> : <p className="text-sm text-muted-foreground">No FAQs matched your search. Try a different term or contact support below.</p>}
      </div>

      {/* Contact Support */}
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 glass-panel p-6">
          <h2 className="font-heading text-lg font-semibold mb-1.5 flex items-center gap-2"><Headset className="w-5 h-5 text-primary" /> Contact Support</h2>
          <p className="text-sm text-muted-foreground mb-5">Tell us what you need — account help, a billing question, a data issue, a privacy request, or anything else. We respond by email.</p>
          <SupportForm />
        </div>
        <div className="space-y-4">
          <div className="glass-panel p-6">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Mail className="w-4 h-4 text-primary" /> Email Support</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-2">RingBellz provides email-based support only — we do not offer phone support.</p>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-sm font-medium text-primary underline underline-offset-4 break-all">{SUPPORT_EMAIL}</a>
          </div>
          <div className="glass-panel p-6">
            <h3 className="font-semibold mb-2">Before you submit</h3>
            <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <li>• Include your account email and any error messages.</li>
              <li>• For data issues, name the record and what looks wrong.</li>
              <li>• One request per issue helps us respond faster.</li>
              <li>• The RingBellz Support Team responds by email.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Compliance */}
      <div className="glass-panel p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold mb-3 flex items-center gap-2"><Scale className="w-5 h-5 text-primary" /> Compliance &amp; Permitted Use</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{COMPLIANCE_NOTICE}</p>
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Permitted uses</h3>
            <ul className="space-y-1.5">
              {PERMITTED_USES.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-accent mt-0.5">✓</span>{p}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-2">Prohibited eligibility uses</h3>
            <ul className="space-y-1.5">
              {PROHIBITED_ELIGIBILITY_USES.map((p) => (
                <li key={p} className="text-xs text-muted-foreground flex items-start gap-1.5"><span className="text-destructive mt-0.5">✕</span>{p}</li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ACCURACY_NOTICE}</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-2">{MARKETING_NOTICE}</p>
      </div>

      {noResults && (
        <p className="text-center text-sm text-muted-foreground">Nothing matched "{search}". <Button variant="link" className="h-auto p-0" onClick={() => setSearch("")}>Clear search</Button></p>
      )}
    </div>
  );
}