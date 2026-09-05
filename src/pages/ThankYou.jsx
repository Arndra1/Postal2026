import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SUPPORT_EMAIL } from "@/lib/compliance";

// Public post-checkout page. Payment confirmation is asynchronous (the Wix
// webhook is the source of truth), so we never claim membership here — the
// webhook activates it and grants the 100 monthly credits.
export default function ThankYou() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-card rounded-2xl border border-border lady-shadow-lg p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-accent" />
        </div>
        <h1 className="font-heading text-2xl font-semibold">Thank you for joining RingBellz</h1>
        <p className="text-sm text-muted-foreground mt-3">
          Your payment is being confirmed. Your membership and 100 monthly credits will appear on your
          Billing page within a few minutes.
        </p>
        <div className="flex flex-col gap-2 mt-6">
          <Button asChild><Link to="/billing">Go to Billing</Link></Button>
          <Button variant="outline" asChild><Link to="/">Back to Home</Link></Button>
        </div>
        <p className="text-xs text-muted-foreground mt-5">
          Billing questions? Contact{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  );
}