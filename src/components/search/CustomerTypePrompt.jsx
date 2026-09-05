import React from "react";
import { Button } from "@/components/ui/button";
import { Briefcase, X } from "lucide-react";

export const CUSTOMER_TYPES = [
  { value: "insurance", label: "Insurance Agency" },
  { value: "credit_repair", label: "Credit Repair / Credit-Service" },
  { value: "marketing", label: "Marketing Agency" },
  { value: "broker", label: "Broker" },
  { value: "funder", label: "Business Funder" },
  { value: "other", label: "Other" },
];

export const SUGGESTED_SEARCHES = {
  insurance: [
    { label: "New Businesses — Last 30 Days", tab: "new_businesses", filters: { dateRange: "LAST 30 DAYS" } },
    { label: "LLCs by State", tab: "new_businesses", filters: { entityType: "LLC" } },
    { label: "Nonprofits — Health", tab: "nonprofits", filters: { ntee: 4 } },
    { label: "By Location", tab: "by_location" },
  ],
  marketing: [
    { label: "New Businesses — Last 7 Days", tab: "new_businesses", filters: { dateRange: "LAST 7 DAYS" } },
    { label: "Nonprofits", tab: "nonprofits" },
    { label: "By Location", tab: "by_location" },
  ],
  credit_repair: [
    { label: "New Businesses — Last 90 Days", tab: "new_businesses", filters: { dateRange: "LAST 90 DAYS" } },
    { label: "Public Records", tab: "public_records" },
    { label: "Nonprofits", tab: "nonprofits" },
  ],
  broker: [
    { label: "New Businesses — Last 30 Days", tab: "new_businesses", filters: { dateRange: "LAST 30 DAYS" } },
    { label: "Nonprofits", tab: "nonprofits" },
    { label: "By Location", tab: "by_location" },
  ],
  funder: [
    { label: "New Businesses — Last 30 Days", tab: "new_businesses", filters: { dateRange: "LAST 30 DAYS" } },
    { label: "Nonprofits", tab: "nonprofits" },
    { label: "By Location", tab: "by_location" },
  ],
  other: [
    { label: "Nonprofits", tab: "nonprofits" },
  ],
};

// Optional one-time prompt — personalizes suggested starting searches only.
// Does NOT restrict data access, pricing, credits, or compliance rules.
export default function CustomerTypePrompt({ onSelect, onDismiss }) {
  return (
    <div className="bg-card rounded-2xl border border-border lady-shadow p-5 mb-6 relative">
      <button onClick={onDismiss} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
      <div className="flex items-center gap-2 mb-1">
        <Briefcase className="w-4 h-4 text-primary" />
        <h2 className="font-heading text-base font-semibold">What best describes your business?</h2>
      </div>
      <p className="text-xs text-muted-foreground mb-4">This helps us suggest relevant searches. You can change this anytime in Account Settings. It does not affect pricing, data access, or compliance.</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {CUSTOMER_TYPES.map((t) => (
          <Button key={t.value} variant="outline" size="sm" className="h-auto py-2.5 justify-start text-left" onClick={() => onSelect(t.value)}>
            {t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}