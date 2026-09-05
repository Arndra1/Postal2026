import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, Crown, CreditCard, Loader2, XCircle, Gift } from "lucide-react";
import CreditPackGrid from "@/components/billing/CreditPackGrid";
import RenewalDisclosures from "@/components/billing/RenewalDisclosures";
import MembershipStatusCard from "@/components/billing/MembershipStatusCard";
import PastDueBanner from "@/components/PastDueBanner";

const includes = ["100 credits every month", "Lead search", "Lead enrichment", "Saved leads", "CSV export", "Dashboard analytics", "Lead management", "Account history"];

export default function Billing() {
  const [data, setData] = useState(null);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState("");
  // Affirmative auto-renewal consent — NEVER pre-checked.
  const [consent, setConsent] = useState(false);
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [purchases, setPurchases] = useState([]);

  const load = () => base44.functions.invoke("userStats", {}).then((res) => setData(res.data));

  useEffect(() => {
    load();
    base44.entities.Base44Purchase.list("-created_date", 10).then(setPurchases).catch(() => setPurchases([]));
  }, []);

  const subscribe = async () => {
    if (!consent) return;
    setAction("sub");
    setNotice("");
    try {
      // Record affirmative automatic-renewal consent BEFORE initiating the subscription.
      // create-checkout validates this record server-side and refuses to start a
      // recurring checkout without it.
      await base44.entities.SubscriptionConsent.create({
        user_id: data.user.id,
        product_id: "leadora_membership",
        price: "59.00",
        currency: "USD",
        billing_frequency: "monthly",
        consent_at: new Date().toISOString()
      });
      const res = await base44.functions.invoke("create-checkout", { productId: "leadora_membership" });
      if (res.data?.redirectUrl) {
        window.location.href = res.data.redirectUrl;
      } else {
        setNotice("Could not start checkout. Please try again.");
      }
    } catch (err) {
      setNotice(err?.response?.data?.error || "Could not start checkout. Please try again.");
    } finally { setAction(null); }
  };

  const cancel = async () => {
    setAction("cancel");
    setNotice("");
    try {
      const res = await base44.functions.invoke("billingManage", { action: "cancel" });
      setConfirmingCancel(false);
      setNotice(res.data?.message || "Membership cancelled. A confirmation email has been sent.");
      await load();
    } catch (err) {
      setNotice(err?.response?.data?.error || "Could not cancel your membership. Please try again.");
    } finally { setAction(null); }
  };

  if (!data) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;

  const exempt = data.exempt;
  const status = data.subscription.status;
  const sub = data.subscription;
  const paidThrough = !sub.period_end || new Date(sub.period_end) > new Date();
  const isComp = status === "comped";
  const memberLike = isComp || (["active", "trialing", "cancelled"].includes(status) && paidThrough);
  const isSubscribed = isComp || ["active", "trialing"].includes(status);
  const periodEndText = sub.period_end ? new Date(sub.period_end).toLocaleDateString() : "";

  return (
    <div>
      <PageHeader title="Billing" subtitle="Manage your RingBellz membership." />

      {exempt && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <Crown className="w-5 h-5 text-accent" />
          <p className="text-sm">You have permanent owner/admin access — no subscription required. This account is not part of the recurring-billing flow.</p>
        </div>
      )}

      {status === "past_due" && !exempt && <PastDueBanner />}

      {isComp && !exempt && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <Gift className="w-5 h-5 text-accent" />
          <p className="text-sm">Your account has a comped membership — full access with 100 monthly credits, no billing required.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border-2 border-primary/20 lady-shadow-lg p-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-xl font-semibold">RingBellz Membership</h2>
            {!exempt && <StatusBadge status={status} />}
          </div>
          <div className="flex items-end gap-1 mt-3">
            <span className="font-heading text-4xl font-semibold">$59</span>
            <span className="text-muted-foreground mb-1">/month</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Includes 100 RingBellz credits each successful monthly billing cycle.</p>
          <ul className="space-y-2.5 my-6">
            {includes.map((p) => <li key={p} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-accent flex-shrink-0" /> {p}</li>)}
          </ul>

          {!exempt && (
            <div className="border-t border-border pt-6">
              <h3 className="font-heading text-lg font-semibold mb-4">Manage Subscription</h3>
              <RenewalDisclosures consent={consent} onConsentChange={setConsent} showCheckbox={!isSubscribed} />

              {isComp ? (
                <p className="text-sm text-muted-foreground">Your comped membership is active — 100 monthly credits included, no billing required.</p>
              ) : confirmingCancel ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-3">
                  <p className="font-medium text-sm">Cancel your membership?</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Automatic renewal stops immediately — no further recurring charges.</li>
                    {periodEndText && <li>• You keep full access and your remaining credits through {periodEndText} (end of your paid billing period).</li>}
                    <li>• Your membership will not renew after that date.</li>
                  </ul>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button variant="destructive" className="flex-1" onClick={cancel} disabled={action === "cancel"}>
                      {action === "cancel" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} Confirm Cancellation
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => setConfirmingCancel(false)}>Keep Membership</Button>
                  </div>
                </div>
              ) : !isSubscribed ? (
                <div className="space-y-2">
                  <Button className="w-full h-11" onClick={subscribe} disabled={action === "sub" || !consent}>
                    {action === "sub" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />} Subscribe — $59/month
                  </Button>
                  {!consent && <p className="text-xs text-muted-foreground text-center">Accept the automatic-renewal terms above to continue.</p>}
                </div>
              ) : (
                <div className="space-y-3">
                  {status === "active" || status === "trialing" ? (
                    <Button variant="outline" className="w-full h-11" onClick={() => setConfirmingCancel(true)} disabled={action === "cancel"}>
                      <XCircle className="w-4 h-4 mr-2" /> Cancel Subscription
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Auto-renewal is off. Your membership stays active until {periodEndText}. Subscribe again afterward to restart.</p>
                  )}
                </div>
              )}
              {notice && <p className="text-xs text-muted-foreground text-center pt-3">{notice}</p>}
            </div>
          )}
        </div>

        {!exempt ? (
          <MembershipStatusCard data={data} purchases={purchases} />
        ) : (
          <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
            <h2 className="font-heading text-lg font-semibold mb-4">Membership Status</h2>
            <p className="text-sm text-muted-foreground">Owner/admin accounts have permanent access with no billing requirements and are not part of the recurring-billing flow.</p>
          </div>
        )}
      </div>

      {!exempt && <CreditPackGrid isMember={memberLike} />}
    </div>
  );
}