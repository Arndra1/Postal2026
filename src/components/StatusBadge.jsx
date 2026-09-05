import React from "react";

const styles = {
  verified: "bg-accent/15 text-accent",
  enriched: "bg-accent/15 text-accent",
  active: "bg-accent/15 text-accent",
  comped: "bg-accent/15 text-accent",
  success: "bg-accent/15 text-accent",
  unverified: "bg-secondary/25 text-primary",
  pending: "bg-secondary/25 text-primary",
  trialing: "bg-secondary/25 text-primary",
  none: "bg-muted text-muted-foreground",
  unknown: "bg-muted text-muted-foreground",
  not_found: "bg-muted text-muted-foreground",
  failed: "bg-destructive/10 text-destructive",
  timeout: "bg-destructive/10 text-destructive",
  cancelled: "bg-destructive/10 text-destructive",
  expired: "bg-destructive/10 text-destructive",
  past_due: "bg-destructive/10 text-destructive",
  validation_error: "bg-destructive/10 text-destructive",
  provider_error: "bg-amber-100 text-amber-800",
  empty: "bg-muted text-muted-foreground",
};

// Data-quality labels — "Verified" is only shown when a verification process
// actually occurred (provider-verified email or phone).
const labels = {
  verified: "Verified Contact",
  enriched: "Enriched Data",
  unverified: "Unverified",
  not_found: "Not Found",
  unknown: "Unknown",
};

export default function StatusBadge({ status }) {
  const cls = styles[status] || styles.unknown;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {labels[status] || String(status || "unknown").replace(/_/g, " ")}
    </span>
  );
}