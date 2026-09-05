import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { Coins, FolderHeart, Sparkles, Activity, ArrowRight, Crown, Zap } from "lucide-react";
import CreditBalanceDisplay from "@/components/billing/CreditBalanceDisplay";
import PastDueBanner from "@/components/PastDueBanner";

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("userStats", {}).then((res) => {
      setData(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;
  }
  if (!data) return <p className="text-muted-foreground">Unable to load dashboard.</p>;

  const balance = data.wallet.balance;
  const packBalance = data.wallet.pack_balance || 0;
  const monthly = data.exempt ? "Unlimited" : "100";

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Your lead intelligence at a glance." />

      {data.subscription?.status === "past_due" && !data.exempt && <PastDueBanner />}

      {data.exempt && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <Crown className="w-5 h-5 text-accent" />
          <p className="text-sm text-foreground">You have <strong>permanent owner/admin access</strong> — credits are never deducted and membership is always active.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Coins} label="Monthly Credits" value={data.exempt ? "∞" : `${balance} / 100`} sub={data.exempt ? "Unlimited access" : "Resets each cycle"} />
        <StatCard icon={Zap} label="Pack Credits" value={data.exempt ? "∞" : packBalance} sub={data.exempt ? "Unlimited access" : "Never expire"} accent />
        <StatCard icon={FolderHeart} label="Saved Leads" value={data.savedLeads} />
        <StatCard icon={Sparkles} label="Successful Enrichments" value={data.successfulEnrichments} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <h2 className="font-heading text-lg font-semibold">Recent Leads</h2>
            <Link to="/saved-leads" className="text-sm text-primary font-medium flex items-center hover:underline">View all <ArrowRight className="w-3.5 h-3.5 ml-1" /></Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Company</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">City</th>
                  <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Email</th>
                  <th className="text-left font-medium px-5 py-3">Status</th>
                  <th className="text-left font-medium px-5 py-3 hidden lg:table-cell">Added</th>
                </tr>
              </thead>
              <tbody>
                {data.recentLeads.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No leads yet. <Link to="/find-leads" className="text-primary font-medium">Find your first lead</Link>.</td></tr>
                )}
                {data.recentLeads.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-5 py-3 font-medium">{l.person_name || "—"}</td>
                    <td className="px-5 py-3">{l.business_name || "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell">{l.city || "—"}</td>
                    <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{l.email || "—"}</td>
                    <td className="px-5 py-3"><StatusBadge status={l.contact_status} /></td>
                    <td className="px-5 py-3 hidden lg:table-cell text-muted-foreground">{l.created_date ? new Date(l.created_date).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border lady-shadow p-5">
          <h2 className="font-heading text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data.recentActivity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
            {data.recentActivity.map((a) => (
              <div key={a.id} className="flex gap-3">
                <div className="w-2 h-2 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium capitalize">{a.action.replace(/_/g, " ")}</div>
                  <div className="text-xs text-muted-foreground">{a.created_date ? new Date(a.created_date).toLocaleString() : ""}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}