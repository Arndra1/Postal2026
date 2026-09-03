import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { HelpCircle, Coins, Sparkles, CreditCard, Mail, ChevronDown } from "lucide-react";

const faqs = [
  { q: "How do credits work?", a: "Your membership includes 100 credits each month. Each successful enrichment costs 5 credits, so you can run up to 20 successful enrichments per cycle." },
  { q: "Do I lose credits on a failed lookup?", a: "Never. Credits are only deducted when an enrichment returns verified contact data. Timeouts, errors, empty results, and malformed responses cost 0 credits." },
  { q: "What happens when I cancel?", a: "Your membership remains active until the end of your current billing period. After that, paid access is removed. You can reactivate anytime." },
  { q: "How often do credits reset?", a: "Credits reset once per valid billing cycle when your membership renews. They do not roll over." },
  { q: "Can I export my leads?", a: "Yes. From Saved Leads, use the Export CSV button to download all your saved leads as a spreadsheet." },
];

const sections = [
  { icon: Coins, title: "How Credits Work", body: "100 monthly credits. 5 credits per successful enrichment. No charge on failures. Credits reset each billing cycle and do not roll over." },
  { icon: Sparkles, title: "How Enrichment Works", body: "Enter a name and/or company (plus any known details). We contact our provider, validate the response, and return verified email, phone, website, LinkedIn, and address. You're only charged when verified data is returned." },
  { icon: CreditCard, title: "Billing Help", body: "The LeadPulse Pro membership is $59/month and includes 100 credits. Cancel anytime — access continues until your period ends. All payments are processed securely server-side." },
];

export default function Help() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <PageHeader title="Help" subtitle="Answers and guidance for getting the most from LeadPulse Pro." />

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        {sections.map((s) => (
          <div key={s.title} className="bg-card rounded-2xl border border-border lady-shadow p-5">
            <div className="w-10 h-10 rounded-xl bg-secondary/20 flex items-center justify-center mb-3"><s.icon className="w-5 h-5 text-primary" /></div>
            <h3 className="font-semibold mb-1.5">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow p-6 mb-6">
        <h2 className="font-heading text-lg font-semibold mb-4 flex items-center gap-2"><HelpCircle className="w-5 h-5 text-primary" /> FAQ</h2>
        <div className="space-y-2">
          {faqs.map((f, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30">
                <span className="font-medium text-sm">{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition ${open === i ? "rotate-180" : ""}`} />
              </button>
              {open === i && <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
        <h2 className="font-heading text-lg font-semibold mb-2 flex items-center gap-2"><Mail className="w-5 h-5 text-primary" /> Contact Support</h2>
        <p className="text-sm text-muted-foreground">Need a hand? Reach out to our support team and we'll get back to you promptly.</p>
        <a href="mailto:support@leadpulsepro.com" className="inline-block mt-4"><Button variant="outline">Email Support</Button></a>
      </div>
    </div>
  );
}