import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import AdminTable from "@/components/AdminTable";
import { Users, Search, FolderHeart, Sparkles, Coins, BarChart3, Download, MessageSquare, TrendingUp } from "lucide-react";

export default function AdminBeta() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    base44.functions.invoke("adminBetaStats", {})
      .then((res) => setData(res.data))
      .catch(() => setError(true));
  }, []);

  if (error) return <div className="text-center py-20 text-muted-foreground">Failed to load beta data.</div>;
  if (!data) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
    </div>
  );

  const s = data.summary;
  const p = data.performance;

  const userCols = [
    { key: "email", label: "Email", render: (u) => <span className="font-medium text-sm">{u.email || u.user_id.slice(0, 8)}</span> },
    { key: "onboarded", label: "Onboarded", render: (u) => u.onboarded ? <span className="text-accent text-xs">✓</span> : <span className="text-muted-foreground text-xs">—</span> },
    { key: "searches", label: "Searches", align: "right" },
    { key: "leads_saved", label: "Leads", align: "right" },
    { key: "enrichment_attempts", label: "Enrich", align: "right" },
    { key: "successful_enrichments", label: "Success", align: "right", render: (u) => <span className="text-accent font-medium">{u.successful_enrichments}</span> },
    { key: "credits_used", label: "Used", align: "right" },
    { key: "credits_balance", label: "Balance", align: "right", hidden: "hidden lg:table-cell" },
    { key: "csv_exports", label: "Exports", align: "right", hidden: "hidden xl:table-cell" },
    { key: "states_searched", label: "States", hidden: "hidden xl:table-cell", render: (u) => <span className="text-xs text-muted-foreground">{(u.states_searched || []).join(", ") || "—"}</span> },
  ];

  const stateCols = [
    { key: "state", label: "State" },
    { key: "attempts", label: "Attempts", align: "right" },
    { key: "successes", label: "Successes", align: "right" },
    { key: "success_rate", label: "Success Rate", align: "right", render: (r) => <span className="font-medium">{r.success_rate}%</span> },
  ];

  const feedbackCols = [
    { key: "feedback_type", label: "Type", render: (f) => <span className="capitalize text-xs font-medium">{(f.feedback_type || "").replace(/_/g, " ")}</span> },
    { key: "message", label: "Message", hidden: "hidden md:table-cell", render: (f) => <span className="text-xs text-muted-foreground">{f.message || "—"}</span> },
    { key: "created_date", label: "Date", render: (f) => f.created_date ? new Date(f.created_date).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <PageHeader title="Beta Dashboard" subtitle="Controlled beta metrics and enrichment performance." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Beta Users" value={s.betaUsers} />
        <StatCard icon={Search} label="Searches" value={s.totalSearches} />
        <StatCard icon={FolderHeart} label="Leads Saved" value={s.leadsSaved} />
        <StatCard icon={Sparkles} label="Enrichment Attempts" value={s.enrichmentAttempts} accent />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={TrendingUp} label="Successful Enrichments" value={s.successfulEnrichments} accent />
        <StatCard icon={BarChart3} label="Success Rate" value={`${s.successRate}%`} />
        <StatCard icon={Coins} label="Credits Used" value={s.creditsUsed} />
        <StatCard icon={Download} label="CSV Exports" value={s.csvExports} />
      </div>

      <h2 className="font-heading text-lg font-semibold mb-3">Enrichment Performance</h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatCard label="Verified Email Rate" value={`${p.verifiedEmailRate}%`} />
        <StatCard label="Validated Phone Rate" value={`${p.validatedPhoneRate}%`} />
        <StatCard label="Email + Phone Rate" value={`${p.bothEmailPhoneRate}%`} />
        <StatCard label="Empty Result Rate" value={`${p.emptyResultRate}%`} />
        <StatCard label="Avg Credits / Success" value={p.avgCreditsPerSuccess} />
      </div>

      <h2 className="font-heading text-lg font-semibold mb-3">Beta Users</h2>
      <AdminTable columns={userCols} rows={data.perUser} empty="No beta users yet." />

      <h2 className="font-heading text-lg font-semibold mt-8 mb-3">Enrichment Success by State</h2>
      <AdminTable columns={stateCols} rows={data.byState} empty="No enrichment data by state yet." />

      <h2 className="font-heading text-lg font-semibold mt-8 mb-3 flex items-center gap-2">
        <MessageSquare className="w-5 h-5" /> Feedback ({s.feedbackReceived})
      </h2>
      <AdminTable columns={feedbackCols} rows={data.feedback} empty="No feedback yet." />
    </div>
  );
}