import React, { useEffect, useState, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import SubscriptionSummary from "@/components/admin/SubscriptionSummary";
import SubscriptionToolbar from "@/components/admin/SubscriptionToolbar";
import SubscriberTable from "@/components/admin/SubscriberTable";

export default function AdminSubscriptions() {
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    base44.functions
      .invoke("adminSubscriptions", {})
      .then((res) => setData(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    // Live: re-pull the figures whenever a subscription starts, renews, cancels or goes past due.
    const unsubscribe = base44.entities.Subscription.subscribe(() => load());
    return unsubscribe;
  }, [load]);

  const rows = data?.rows || [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && !(r.status === "active" || r.status === "trialing")) return false;
      if (filter === "past_due" && r.status !== "past_due") return false;
      if (filter === "canceled" && r.status !== "cancelled") return false;
      if (!q) return true;
      return (r.name || "").toLowerCase().includes(q) || (r.email || "").toLowerCase().includes(q);
    });
  }, [rows, search, filter]);

  return (
    <div>
      <PageHeader title="Subscriptions" subtitle="Subscriber activity and recurring revenue." />
      {!data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-secondary border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <SubscriptionSummary metrics={data.metrics} />
          <SubscriptionToolbar
            search={search}
            onSearch={setSearch}
            filter={filter}
            onFilter={setFilter}
          />
          <SubscriberTable rows={visible} />
        </>
      )}
    </div>
  );
}