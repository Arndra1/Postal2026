import React from "react";
import { Coins, Zap, Clock } from "lucide-react";

// Reusable dual-pool credit balance display.
// Shows monthly credits (with cycle reset countdown) and pack credits (never expire).
// Used on Dashboard, Credits, Enrich, and Account pages.
export default function CreditBalanceDisplay({ wallet, subscription, exempt, compact = false }) {
  if (exempt) {
    return (
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-accent" />
        <span className="font-medium">∞ Unlimited credits</span>
      </div>
    );
  }

  const monthly = wallet?.balance ?? 0;
  const pack = wallet?.pack_balance ?? 0;
  const periodEnd = subscription?.period_end;
  const daysUntilReset = periodEnd
    ? Math.max(0, Math.ceil((new Date(periodEnd) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-primary" />
          <span className="font-medium">{monthly}</span>
          <span className="text-muted-foreground">monthly{daysUntilReset !== null ? ` (resets in ${daysUntilReset}d)` : ""}</span>
        </span>
        <span className="text-muted-foreground">+</span>
        <span className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span className="font-medium">{pack}</span>
          <span className="text-muted-foreground">pack (never expire)</span>
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-primary flex-shrink-0" />
        <div>
          <span className="font-heading text-lg font-semibold">{monthly}</span>
          <span className="text-sm text-muted-foreground ml-1.5">monthly credits</span>
          {daysUntilReset !== null && (
            <span className="text-xs text-muted-foreground ml-1">(resets in {daysUntilReset} day{daysUntilReset === 1 ? "" : "s"})</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-accent flex-shrink-0" />
        <div>
          <span className="font-heading text-lg font-semibold">{pack}</span>
          <span className="text-sm text-muted-foreground ml-1.5">pack credits (never expire)</span>
        </div>
      </div>
    </div>
  );
}