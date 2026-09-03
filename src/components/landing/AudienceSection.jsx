import React from "react";
import {
  Shield, GraduationCap, Landmark, CreditCard, Home, Megaphone,
  Briefcase, Users, Wrench, Network
} from "lucide-react";

const audiences = [
  { icon: Shield, label: "Insurance Agencies" },
  { icon: GraduationCap, label: "Credit Restoration & Credit Education Companies" },
  { icon: Landmark, label: "Business Funding & Financing Companies" },
  { icon: CreditCard, label: "Business Credit Companies" },
  { icon: Home, label: "Real Estate & Mortgage Professionals" },
  { icon: Megaphone, label: "Marketing Agencies" },
  { icon: Briefcase, label: "Consultants" },
  { icon: Users, label: "Professional Services" },
  { icon: Wrench, label: "Home-Service Businesses" },
  { icon: Network, label: "B2B Service Providers" },
];

export default function AudienceSection() {
  return (
    <section id="who" className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <h2 className="font-heading text-3xl md:text-4xl font-semibold">Built for Businesses That Need Better Prospects</h2>
        <p className="mt-4 text-muted-foreground">
          These businesses may use Leadora for lawful prospecting, marketing, business development, and research.
        </p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {audiences.map((a) => (
          <div key={a.label} className="bg-card rounded-2xl border border-border p-5 lady-shadow text-center">
            <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-3">
              <a.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-medium leading-snug">{a.label}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
        Leadora may not be used for underwriting, credit decisions, eligibility decisions, tenant screening, employment screening, insurance eligibility decisions, or consumer risk scoring.
      </p>
    </section>
  );
}