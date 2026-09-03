import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Check, Crown, CreditCard, Loader2, Calendar, XCircle, RefreshCw } from "lucide-react";
import { SUPPORT_EMAIL } from "@/lib/compliance";

const includes = ["100 credits every month", "Lead search", "Lead enrichment", "Saved leads", "CSV export", "Dashboard analytics", "Lead management", "Account history"];

export default function Billing() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null);
  const [notice, setNotice] = useState("");

  const load = () => base44.functions.invoke("userStats", {}).then((res) => setData(res.data));
  useEffect(() => { load(); }, []);

  const subscribe = async () => {
    setAction("sub");
    setNotice("");
    try {
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
      await base44.functions.invoke("billingManage", { action: "cancel" });
      await load();
    } catch (err) {
      setNotice(err?.response?.data?.error || "Could not cancel your membership. Please try again.");
    } finally { setAction(null); }
  };
  const reactivate = async () => {
    setAction("react");
    try { await base44.functions.invoke("billingManage", { action: "reactivate" }); await load(); } catch (_e) {} finally { setAction(null); }
  };

  if (!data) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;

  const exempt = data.exempt;
  const status = data.subscription.status;

  return (
    <div>
      <PageHeader title="Billing" subtitle="Manage your Leadora membership." />

      {exempt && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <Crown className="w-5 h-5 text-accent" />
          <p className="text-sm">You have permanent owner/admin access — no subscription required.</p>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-card rounded-2xl border-2 border-primary/20 lady-shadow-lg p-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-heading text-xl font-semibold">Leadora Membership</h2>
            {!exempt && <StatusBadge status={status} />}
          </div>
          <div className="flex items-end gap-1 mt-3">
            <span className="font-heading text-4xl font-semibold">$59</span>
            <span className="text-muted-foreground mb-1">/month</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">100 credits every month</p>
          <ul className="space-y-2.5 my-6">
            {includes.map((p) => <li key={p} className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-accent flex-shrink-0" /> {p}</li>)}
          </ul>
          {!exempt && (
            <div className="space-y-2">
              {status !== "active" && status !== "trialing" && (
                <>
                  <Button className="w-full h-11" onClick={subscribe} disabled={action === "sub"}>
                    {action === "sub" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />} Subscribe
                    </Button>
                    </>
                    )}
              {(status === "active" || status === "trialing") && (
                <>
                  <Button variant="outline" className="w-full h-11" onClick={cancel} disabled={action === "cancel"}>
                    {action === "cancel" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />} Cancel Subscription
                  </Button>
                  {status === "cancelled" && (
                    <Button variant="outline" className="w-full h-11" onClick={reactivate} disabled={action === "react"}>
                      {action === "react" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />} Reactivate
                    </Button>
                  )}
                </>
              )}
              {notice && <p className="text-xs text-muted-foreground text-center pt-1">{notice}</p>}
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border lady-shadow p-6">
          <h2 className="font-heading text-lg font-semibold mb-4">Membership Status</h2>
          {!exempt ? (
            <div className="space-y-4 text-sm">
              <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Plan</span><span className="font-medium">Leadora</span></div>
              <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Status</span><StatusBadge status={status} /></div>
              <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Credits Balance</span><span className="font-medium">{data.wallet.balance} / 100</span></div>
              {data.subscription.period_end && <div className="flex items-center justify-between py-2 border-b border-border"><span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Period End</span><span className="font-medium">{new Date(data.subscription.period_end).toLocaleDateString()}</span></div>}
              {data.subscription.cancelled_at && <div className="flex justify-between py-2 border-b border-border"><span className="text-muted-foreground">Cancelled</span><span className="font-medium">{new Date(data.subscription.cancelled_at).toLocaleDateString()}</span></div>}
              <p className="text-xs text-muted-foreground pt-2">Cancelled memberships keep access until the end of the current billing period. Credits reset once per valid billing cycle.</p>
              <p className="text-xs text-muted-foreground">Billing questions? Contact <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">{SUPPORT_EMAIL}</a></p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Owner/admin accounts have permanent access with no billing requirements.</p>
          )}
        </div>
      </div>
    </div>
  );
}