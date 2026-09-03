import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/compliance";

const sections = [
  {
    title: "Information We Collect",
    body: "When you create an account, we collect your name, email address, and company information you choose to provide. We also collect information about how you use the platform, such as searches, enrichments, and credit activity, to operate and improve the service."
  },
  {
    title: "Lead Information",
    body: "Lead and contact information you view or save comes from public records and permitted third-party data providers. We display the source or source category whenever practical."
  },
  {
    title: "How We Use Information",
    body: "We use your information to provide the platform, manage your membership and credits, provide customer support, ensure lawful use, and improve the service. We do not sell your personal account information."
  },
  {
    title: "Sharing",
    body: "We share information only as needed to operate the platform (for example, with enrichment data providers for the requests you initiate), as required by law, or to protect Leadora and its users."
  },
  {
    title: "Data Retention",
    body: "We keep your account information while your account is active. Saved lead records remain in your workspace until you delete them. You may request deletion of your account data at any time."
  },
  {
    title: "Your Choices",
    body: "You can update your profile information from your Account page, and you can contact us to request access to, correction of, or deletion of your personal information where applicable law requires it."
  },
  {
    title: "Contact",
    body: "Privacy questions can be sent to " + SUPPORT_EMAIL + "."
  },
];

export default function PrivacyPolicy() {
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
        <h1 className="font-heading text-3xl md:text-4xl font-semibold mb-10">Privacy Policy</h1>
        <div className="space-y-8">
          {sections.map((s) => (
            <section key={s.title}>
              <h2 className="font-heading text-lg font-semibold mb-2">{s.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-12">
          See also our <Link to="/terms" className="text-primary hover:underline">Terms of Use</Link> and{" "}
          <Link to="/responsible-data-use" className="text-primary hover:underline">Responsible Data Use</Link> page.
        </p>
      </main>
    </div>
  );
}