import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle } from "lucide-react";

// Conspicuous automatic-renewal disclosures shown directly next to the purchase button,
// plus the affirmative (never pre-checked) consent checkbox.
export default function RenewalDisclosures({ consent, onConsentChange, showCheckbox }) {
  return (
    <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 mb-5">
      <div className="flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-sm space-y-1.5">
          <p className="font-medium">Your RingBellz membership automatically renews every month at $59 until canceled.</p>
          <ul className="space-y-1 text-muted-foreground text-xs sm:text-sm">
            <li>• Billing frequency: monthly — $59.00 is charged each billing cycle</li>
            <li>• Includes 100 RingBellz credits each successful monthly billing cycle</li>
            <li>• Cancel anytime online at Account → Billing → Manage Subscription — no phone call, agent, or meeting required</li>
            <li>• Cancellation stops all future charges; you keep access and your remaining credits through the end of your paid billing period</li>
          </ul>
        </div>
      </div>
      {showCheckbox && (
        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <Checkbox checked={consent} onCheckedChange={(v) => onConsentChange(v === true)} className="mt-0.5" />
          <span className="text-sm">
            I consent to automatic monthly renewal of my RingBellz membership at $59/month until I cancel, and I agree to these automatic-renewal terms.
          </span>
        </label>
      )}
    </div>
  );
}