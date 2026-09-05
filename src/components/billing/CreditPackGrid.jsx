import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";

// Display data only — the authoritative prices and credit amounts live server-side
// (shared/products.ts); the button sends just the product id.
// Effective price-per-credit is shown so customers can compare value across sizes.
const PACKS = [
  { id: "credits_small", credits: 25, price: 19, priceLabel: "$19" },
  { id: "credits_medium", credits: 75, price: 49, priceLabel: "$49", bestValue: true },
  { id: "credits_large", credits: 150, price: 89, priceLabel: "$89" }
];

export default function CreditPackGrid({ isMember }) {
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState("");

  const buy = async (id) => {
    setAction(id);
    setNotice("");
    try {
      const res = await base44.functions.invoke("create-checkout", { productId: id });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setNotice("Could not start checkout. Please try again.");
      }
    } catch (err) {
      setNotice(err?.response?.data?.error || "Could not start checkout. Please try again.");
    } finally { setAction(null); }
  };

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4">
        <div>
          <h2 className="font-heading text-xl font-semibold">Buy Additional Credits</h2>
          <p className="text-sm text-muted-foreground mt-1">One-time purchases. Pack credits never expire and carry over across billing cycles.</p>
        </div>
        {!isMember && <p className="text-xs text-muted-foreground">Requires an active membership.</p>}
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        {PACKS.map((p) => {
          const perCredit = (p.price / p.credits).toFixed(2);
          return (
            <div key={p.id} className={`relative bg-card rounded-2xl border lady-shadow p-6 flex flex-col items-center text-center ${p.bestValue ? "border-primary/40 lady-shadow-lg" : "border-border"}`}>
              {p.bestValue && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wide px-2.5 py-0.5 rounded-full">
                  Best Value
                </span>
              )}
              <Zap className="w-5 h-5 text-accent mb-2" />
              <p className="font-heading text-2xl font-semibold">{p.credits}</p>
              <p className="text-xs text-muted-foreground">credits</p>
              <p className="text-lg font-medium mt-3">{p.priceLabel}</p>
              <p className="text-[11px] text-muted-foreground mb-1">${perCredit} per credit</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-4">One-Time Purchase</p>
              <Button size="sm" className="w-full" disabled={!isMember || action === p.id} onClick={() => buy(p.id)}>
                {action === p.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Buy
              </Button>
            </div>
          );
        })}
      </div>
      {notice && <p className="text-xs text-destructive mt-3">{notice}</p>}
    </div>
  );
}