import React from "react";
import StatCard from "@/components/StatCard";
import { Users, UserPlus, XCircle, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

const money = (n) => `$${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export default function SubscriptionSummary({ metrics }) {
  const m = metrics || {};
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <StatCard icon={Users} label="Active Subscriptions" value={m.totalActive ?? 0} accent />
      <StatCard icon={UserPlus} label="New This Month" value={m.newThisMonth ?? 0} />
      <StatCard icon={XCircle} label="Canceled Subscriptions" value={m.canceled ?? 0} />
      <StatCard icon={AlertTriangle} label="Past Due Subscriptions" value={m.pastDue ?? 0} />
      <StatCard icon={TrendingUp} label="Monthly Recurring Revenue" value={money(m.mrr)} accent />
      <StatCard icon={DollarSign} label="Total Subscription Revenue" value={money(m.totalRevenue)} />
    </div>
  );
}