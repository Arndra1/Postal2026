import React, { useState } from "react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Mail, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const TEMPLATES = [
  {
    stage: "New — Initial Outreach",
    icon: "✨",
    subject: "Quick question about {company}",
    body: `Hi {name},

I came across {company} recently and was impressed by what you're building in the {industry} space.

I work with businesses like yours to [briefly describe your service / value proposition]. I'd love to learn more about your current priorities and see if there's a natural fit.

Would you be open to a brief 15-minute call next week?

Best regards,
[Your Name]
[Your Company]
[Your Phone]`,
  },
  {
    stage: "Contacted — Follow-Up",
    icon: "📧",
    subject: "Following up — {company}",
    body: `Hi {name},

I reached out last week about connecting at {company}. I know how busy things can get, so I wanted to follow up briefly.

I'd still love to learn about your goals for this quarter and explore whether [your service] could help. Even if the timing isn't right, I'm happy to share a few ideas.

Are you available for a quick chat this week or next?

Best regards,
[Your Name]`,
  },
  {
    stage: "Qualified — Proposal / Meeting",
    icon: "📅",
    subject: "Next steps for {company}",
    body: `Hi {name},

Thank you for the great conversation — I really enjoyed learning more about {company}'s plans.

Based on what you shared, I've put together a few thoughts on how we could help with [specific challenge discussed]. I'd love to walk you through them and answer any questions.

Could we schedule 30 minutes this week? I'm flexible — just let me know what works for your calendar.

Looking forward to it,
[Your Name]`,
  },
  {
    stage: "Won — Thank You & Onboarding",
    icon: "🎉",
    subject: "Welcome aboard, {name}!",
    body: `Hi {name},

Thank you for choosing to work with us — we're excited to partner with {company}!

Here's what happens next:
1. I'll send over the onboarding materials by end of day
2. We'll schedule a kickoff call to align on goals and timeline
3. You'll have direct access to me for any questions along the way

If you need anything at all before we get started, just reply to this email or call me at [your phone].

Welcome aboard!
[Your Name]`,
  },
  {
    stage: "Lost — Re-Engagement",
    icon: "🔄",
    subject: "Checking in — {company}",
    body: `Hi {name},

It's been a while since we last connected. I hope things are going well at {company}!

I wanted to reach back out because [mention any new development — new feature, pricing change, relevant industry news]. If your priorities have shifted or you're reconsidering [your service], I'd love to reconnect.

No pressure at all — even if it's just to catch up, I'm always happy to chat.

Best regards,
[Your Name]`,
  },
];

const VARIABLES = [
  { token: "{name}", desc: "Contact person's name" },
  { token: "{company}", desc: "Business / company name" },
  { token: "{industry}", desc: "Industry" },
  { token: "{city}", desc: "City" },
  { token: "{state}", desc: "State" },
];

export default function OutreachTemplates() {
  const [copied, setCopied] = useState(null);
  const { toast } = useToast();

  const copy = (template, idx) => {
    const text = `Subject: ${template.subject}\n\n${template.body}`;
    navigator.clipboard.writeText(text);
    setCopied(idx);
    toast({ title: "Copied to clipboard", description: "Paste into your email client and replace the variables." });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Outreach Templates"
        subtitle="Copy-ready email templates for every pipeline stage. Replace variables like {name} and {company} with your lead's details."
      />

      <div className="glass-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Available Variables</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <code key={v.token} className="px-2 py-1 rounded-md bg-primary/8 text-primary text-xs font-mono" title={v.desc}>
              {v.token}
            </code>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {TEMPLATES.map((t, idx) => (
          <div key={idx} className="glass-card p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-base font-semibold flex items-center gap-2">
                <span>{t.icon}</span> {t.stage}
              </h3>
              <Button variant="outline" size="sm" onClick={() => copy(t, idx)}>
                {copied === idx ? <><Check className="w-3.5 h-3.5 mr-1.5 text-accent" /> Copied</> : <><Copy className="w-3.5 h-3.5 mr-1.5" /> Copy</>}
              </Button>
            </div>
            <div className="rounded-lg bg-white/40 border border-white/40 p-3 mb-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{t.subject}</span>
              </div>
            </div>
            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-body flex-1 leading-relaxed">{t.body}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}