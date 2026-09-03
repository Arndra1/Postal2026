import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Coins, TrendingUp, TrendingDown, Crown, Sparkles } from "lucide-react";

export default function Credits() {
  const [data, setData] = useState(null);
  const [ledger, setLedger] = useState([]);

  useEffect(() => {
    base44.functions.invoke("userStats", {}).then(async (res) => {
      setData(res.data);
      const me = res.data.user;
      const led = await base44.entities.CreditLedger.filter({ user_id: me.id });
      setLedger(led.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)));
    });
  }, []);

  if (!data) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Credits" subtitle="Track your credit balance and every movement." />

      {data.exempt && (
        <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-accent/10 border border-accent/20">
          <Crown className="w-5 h-5 text-accent" />
          <p className="text-sm">You have permanent owner/admin access — credits are never deducted.</p>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Coins} label="Current Balance" value={data.exempt ? "∞" : data.wallet.balance} sub={data.exempt ? "Unlimited" : "Available credits"} />
        <StatCard icon={TrendingUp} label="Lifetime Granted" value={data.wallet.lifetime_granted || 0} accent />
        <StatCard icon={TrendingDown} label="Lifetime Used" value={data.wallet.lifetime_used || 0} />
        <StatCard icon={Sparkles} label="Cost per Enrichment" value="5" sub="On success only" />
      </div>

      <div className="bg-card rounded-2xl border border-border lady-shadow overflow-hidden">
        <div className="p-5 border-b border-border"><h2 className="font-heading text-lg font-semibold">Credit Ledger</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Action</th>
                <th className="text-left font-medium px-5 py-3">Description</th>
                <th className="text-right font-medium px-5 py-3">Amount</th>
                <th className="text-right font-medium px-5 py-3">Balance After</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">No credit transactions yet.</td></tr>}
              {ledger.map((l) => (
                <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-5 py-3 capitalize font-medium">{l.action}</td>
                  <td className="px-5 py-3 text-muted-foreground">{l.description || "—"}</td>
                  <td className={`px-5 py-3 text-right font-medium ${l.amount >= 0 ? "text-accent" : "text-destructive"}`}>{l.amount >= 0 ? "+" : ""}{l.amount}</td>
                  <td className="px-5 py-3 text-right">{l.balance_after}</td>
                  <td className="px-5 py-3 hidden md:table-cell text-muted-foreground">{l.created_date ? new Date(l.created_date).toLocaleString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}