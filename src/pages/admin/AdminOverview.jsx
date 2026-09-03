import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { Users, BadgeCheck, DollarSign, Sparkles, Coins, UserPlus } from "lucide-react";

export default function AdminOverview() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    base44.functions.invoke("adminStats", {}).then((res) => setStats(res.data)).catch(() => {});
  }, []);
  if (!stats) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div>
      <PageHeader title="Admin Overview" subtitle="Platform-wide metrics and health." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
        <StatCard icon={BadgeCheck} label="Active Members" value={stats.activeMembers} accent />
        <StatCard icon={DollarSign} label="Monthly Revenue" value={`$${stats.monthlyRevenue}`} />
        <StatCard icon={Sparkles} label="Successful Enrichments" value={stats.successfulEnrichments} />
        <StatCard icon={Coins} label="Credits Used" value={stats.creditsUsed} />
        <StatCard icon={UserPlus} label="New Signups (30d)" value={stats.newSignups} />
      </div>
    </div>
  );
}