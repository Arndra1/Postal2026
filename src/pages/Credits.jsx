import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Crown, Zap, Clock } from "lucide-react";
import { Link } from "react-router-dom";

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
        <StatCard icon={Clock} label="Monthly Credits" value={data.exempt ? "∞" : data.wallet.balance} sub={data.exempt ? "Unlimited" : "Resets each cycle"} />
        <StatCard icon={Zap} label="Pack Credits" value={data.exempt ? "∞" : (data.wallet.pack_balance || 0)} sub={data.exempt ? "Unlimited" : "Never expire"} accent />
        <StatCard icon={TrendingUp} label="Lifetime Granted" value={data.wallet.lifetime_granted || 0} />
        <StatCard icon={TrendingDown} label="Lifetime Used" value={data.wallet.lifetime_used || 0} />
      </div>

      {!data.exempt && (data.wallet.balance || 0) <= 5 && (
        <div className="mb-6 flex items-center justify-between gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/20">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-sm">Your monthly credits are running low. <Link to="/billing" className="text-primary font-medium underline hover:no-underline">Buy a credit pack</Link> to keep enriching.</p>
          </div>
          <Link to="/billing"><Button size="sm">Buy Credits</Button></Link>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-border"><h2 className="font-heading text-lg font-semibold">Credit Ledger</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/30 text-muted-foreground">
              <tr>
                <th className="text-left font-medium px-5 py-3">Action</th>
                <th className="text-left font-medium px-5 py-3">Description</th>
                <th className="text-right font-medium px-5 py-3">Amount</th>
                <th className="text-right font-medium px-5 py-3">Balance After</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Pool</th>
                <th className="text-left font-medium px-5 py-3 hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {ledger.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">No credit transactions yet.</td></tr>}
              {ledger.map((l) => (
                <tr key={l.id} className="border-t border-white/30 hover:bg-white/40">
                  <td className="px-5 py-3 capitalize font-medium">{l.action}</td>
                  <td className="px-5 py-3 text-muted-foreground">{l.description || "—"}</td>
                  <td className={`px-5 py-3 text-right font-medium ${l.amount >= 0 ? "text-accent" : "text-destructive"}`}>{l.amount >= 0 ? "+" : ""}{l.amount}</td>
                  <td className="px-5 py-3 text-right">{l.balance_after}</td>
                  <td className="px-5 py-3 hidden md:table-cell">
                    {l.pool ? <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{l.pool}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
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