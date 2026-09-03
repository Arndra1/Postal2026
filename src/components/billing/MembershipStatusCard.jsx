import React from "react";
import StatusBadge from "@/components/StatusBadge";
import { SUPPORT_EMAIL } from "@/lib/compliance";

function Row({ label, children }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-border">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="font-medium text-right">{children}</span>
    </div>
  );
}

export default function MembershipStatusCard({ data, purchases, purchasedCredits }) {
  const sub = data.subscription;
  const paidThrough = !sub.period_end || new Date(sub.period_end) > new Date();
  const active = ["active", "trialing"].includes(sub.status) && paidThrough;
  const cancelledStillPaid = sub.status === "cancelled" && paidThrough;
  const periodEndText = sub.period_end ? new Date(sub.period_end).toLocaleDateString() : "—";

  return (
    <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
      <h2 className="font-heading text-lg font-semibold mb-4">Membership Status</h2>
      <div className="text-sm">
        <Row label="Plan"><span>Leadora — $59/month</span></Row>
        <Row label="Included Credits"><span>100 monthly credits</span></Row>
        <Row label="Membership Status"><StatusBadge status={sub.status} /></Row>
        <Row label="Next Billing Date">
          {active ? periodEndText : cancelledStillPaid ? `Will not renew — access ends ${periodEndText}` : "—"}
        </Row>
        <Row label="Payment Status">
          {active ? "Auto-renew ON — monthly charge" : cancelledStillPaid ? "Auto-renew OFF — no further charges" : "No active subscription"}
        </Row>
        <Row label="Purchased Credits">
          {purchasedCredits === null ? "Loading…" : <span>{purchasedCredits} <span className="text-muted-foreground font-normal">(never expire)</span></span>}
        </Row>
        <div className="py-2 border-b border-border">
          <span className="text-muted-foreground">Billing History</span>
          {purchases.length === 0 ? (
            <p className="text-xs text-muted-foreground pt-2">No payments yet.</p>
          ) : (
            <ul className="pt-1">
              {purchases.map((p) => (
                <li key={p.id} className="flex justify-between gap-2 py-1.5 text-xs">
                  <span className="truncate">{p.productName}</span>
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(p.created_date).toLocaleDateString()} · ${p.amount} · {p.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Row label="Manage Payment Method">
          <span className="font-normal">
            Card details are held securely by our payment provider. To update your card,{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">contact customer service</a>.
          </span>
        </Row>
      </div>
      <div className="mt-4 space-y-2">
        <p className="text-xs text-muted-foreground">Included and purchased credits never expire.</p>
        <p className="text-xs text-muted-foreground">
          Billing questions? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </div>
  );
}