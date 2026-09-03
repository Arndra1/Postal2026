import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Loader2, Zap } from "lucide-react";

// Display data only — the authoritative prices and credit amounts live server-side
// (shared/products.ts); the button sends just the product id.
const PACKS = [
  { id: "credits_250", credits: "250", price: "$19" },
  { id: "credits_500", credits: "500", price: "$35" },
  { id: "credits_1000", credits: "1,000", price: "$59" },
  { id: "credits_2500", credits: "2,500", price: "$129" },
  { id: "credits_5000", credits: "5,000", price: "$229" }
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
          <h2 className="font-heading text-xl font-semibold">Extra Credit Packs</h2>
          <p className="text-sm text-muted-foreground mt-1">One-time purchases. Credits never expire.</p>
        </div>
        {!isMember && <p className="text-xs text-muted-foreground">Requires an active Leadora membership.</p>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {PACKS.map((p) => (
          <div key={p.id} className="bg-card rounded-2xl border border-border lady-shadow p-4 flex flex-col items-center text-center">
            <Zap className="w-4 h-4 text-accent mb-2" />
            <p className="font-heading text-lg font-semibold">{p.credits}</p>
            <p className="text-xs text-muted-foreground">credits</p>
            <p className="text-sm font-medium mt-2">{p.price}</p>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-3">One-Time Purchase</p>
            <Button size="sm" className="w-full" disabled={!isMember || action === p.id} onClick={() => buy(p.id)}>
              {action === p.id ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null} Buy
            </Button>
          </div>
        ))}
      </div>
      {notice && <p className="text-xs text-destructive mt-3">{notice}</p>}
    </div>
  );
}