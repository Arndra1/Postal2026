import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import ComplianceBanner from "@/components/ComplianceBanner";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";

// Need-oriented prospecting paths. Each path reframes a data source around the
// prospect's NEED ("Who needs my service?") rather than the database name.
// Paths are filtered by the user's business type (customer_type) so each sector
// sees only the needs relevant to them. Strictly additive — links to existing
// search tools, never replaces them.
const NEED_PATHS = {
  credit_repair: [
    {
      key: "bankruptcy_recovery",
      title: "People recovering from bankruptcy",
      need: "Individuals and businesses with recent public bankruptcy filings who may benefit from credit-repair or financial-recovery services.",
      source: "Public bankruptcy court records (CourtListener RECAP)",
      route: "/bankruptcy",
      cta: "Find bankruptcy prospects",
      badge: "Public Record",
    },
    {
      key: "new_business_credit",
      title: "Newly formed businesses",
      need: "Freshly registered LLCs and corporations often need help establishing business credit, separating personal/business finances, and building a credit profile.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_credit",
      title: "Nonprofits & community organizations",
      need: "Nonprofit organizations and community-service groups that may need credit-building, financial education, or community reinvestment services.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits" },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
  ],
  insurance: [
    {
      key: "new_business_insurance",
      title: "New businesses needing coverage",
      need: "Newly registered businesses need general liability, workers' comp, and commercial property insurance from day one.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_insurance",
      title: "Nonprofits needing coverage",
      need: "Nonprofit organizations need directors & officers liability, event coverage, and property insurance. IRS filings surface orgs by category and location.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits", filters: { ntee: 4 } },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
    {
      key: "businesses_by_location",
      title: "Businesses in your service area",
      need: "Search existing public business records by state to find uninsured or underinsured businesses in your territory.",
      source: "Government open data + state filings",
      route: "/find-leads-unified",
      cta: "Search by location",
      badge: "Public Record",
    },
  ],
  marketing: [
    {
      key: "new_business_marketing",
      title: "New businesses needing marketing",
      need: "Freshly registered businesses need branding, websites, SEO, and lead generation to establish their market presence.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_marketing",
      title: "Nonprofits needing marketing",
      need: "Nonprofits need fundraising campaigns, branding, digital outreach, and storytelling support. IRS filings surface orgs by mission category and state.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits" },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
    {
      key: "businesses_by_location",
      title: "Businesses in your target market",
      need: "Find established businesses by location that may need a marketing agency partner.",
      source: "Government open data + state filings",
      route: "/find-leads-unified",
      cta: "Search by location",
      badge: "Public Record",
    },
  ],
  broker: [
    {
      key: "new_business_broker",
      title: "New businesses needing a broker",
      need: "Newly formed businesses often need commercial insurance, benefits, or business-service brokers as they set up operations.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_broker",
      title: "Nonprofits needing a broker",
      need: "Nonprofits need employee benefits, commercial insurance, and risk-management brokers. IRS filings surface orgs with staff and operations by state.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits" },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
    {
      key: "businesses_by_location",
      title: "Businesses in your territory",
      need: "Search public business records by state to find potential clients in your brokerage area.",
      source: "Government open data + state filings",
      route: "/find-leads-unified",
      cta: "Search by location",
      badge: "Public Record",
    },
  ],
  funder: [
    {
      key: "new_business_funding",
      title: "New businesses seeking funding",
      need: "Recently registered businesses often need working capital, equipment financing, or business funding to launch operations.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_funding",
      title: "Nonprofits seeking funding",
      need: "Nonprofits may need working capital, lines of credit, or grant-writing support. IRS filings surface orgs by mission category, with revenue context shown informationally.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits" },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
    {
      key: "businesses_by_location",
      title: "Businesses in your lending area",
      need: "Find established businesses by location that may need alternative funding or capital.",
      source: "Government open data + state filings",
      route: "/find-leads-unified",
      cta: "Search by location",
      badge: "Public Record",
    },
  ],
  other: [
    {
      key: "new_businesses_general",
      title: "Newly registered businesses",
      need: "Freshly filed business registrations across 8 states — ideal for early outreach to companies just starting out.",
      source: "State business registries (8 states live)",
      route: "/new-businesses",
      cta: "Search new businesses",
      badge: "Public Record",
    },
    {
      key: "nonprofit_general",
      title: "Nonprofit organizations",
      need: "Discover IRS-registered nonprofits by state and mission category. Public filing data — informational only, no eligibility or credit commentary.",
      source: "ProPublica Nonprofit Explorer (IRS filings)",
      route: "/find-leads-unified",
      state: { tab: "nonprofits" },
      cta: "Search nonprofits",
      badge: "Public Record",
    },
    {
      key: "public_records_general",
      title: "Public court and government records",
      need: "Search public dockets, government open data, and geographic business data for lawful prospecting.",
      source: "CourtListener + Data.gov + Census",
      route: "/find-leads-unified",
      cta: "Search public records",
      badge: "Public Record",
    },
  ],
};

const BUSINESS_LABELS = {
  credit_repair: "Credit Repair / Credit-Service",
  insurance: "Insurance Agency",
  marketing: "Marketing Agency",
  broker: "Broker",
  funder: "Business Funder",
  other: "General Business",
};

export default function NeedOrientedSearch() {
  const navigate = useNavigate();
  const [customerType, setCustomerType] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then((u) => { setCustomerType(u.customer_type || "other"); setLoading(false); })
      .catch(() => { setCustomerType("other"); setLoading(false); });
  }, []);

  const paths = NEED_PATHS[customerType] || NEED_PATHS.other;
  const businessLabel = BUSINESS_LABELS[customerType] || BUSINESS_LABELS.other;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <PageHeader
        title="Who Needs Your Service?"
        subtitle="Start with your prospect's need — we'll guide you to the right public-data source. All discovery is free; only optional contact enrichment costs credits."
      />

      <ComplianceBanner text="Leadora surfaces public records for lawful marketing prospecting only. Bankruptcy and court filings are factual events — never characterize prospects as 'high risk,' 'credit denied,' or 'financially distressed.' Not a consumer reporting agency." />

      <div className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <p className="text-sm text-muted-foreground">
            Showing prospecting paths tailored for <span className="font-semibold text-foreground">{businessLabel}</span> businesses.
            {" "}
            <button onClick={() => navigate("/account")} className="text-primary underline hover:no-underline">Update business type</button>
          </p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {paths.map((p) => (
          <div key={p.key} className="bg-card rounded-2xl border border-border lady-shadow p-5 flex flex-col">
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-secondary/30 text-secondary-foreground">{p.badge}</span>
            </div>
            <h3 className="font-heading text-base font-semibold mb-1.5">{p.title}</h3>
            <p className="text-sm text-muted-foreground mb-3 flex-1">{p.need}</p>
            <p className="text-xs text-muted-foreground/80 mb-4">Source: {p.source}</p>
            <Button variant="default" size="sm" className="w-full" onClick={() => navigate(p.route, p.state ? { state: p.state } : undefined)}>
              {p.cta} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}