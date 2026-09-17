import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function AdminBilling() {
  const [events, setEvents] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [subs, setSubs] = useState([]);

  useEffect(() => {
    base44.entities.BillingEvent.list().then((r) =>
      setEvents(r.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0)))
    ).catch(() => {});
    base44.entities.Base44Purchase.list("-created_date", 100).then(setPurchases).catch(() => setPurchases([]));
    base44.entities.Subscription.list().then(setSubs).catch(() => setSubs([]));
  }, []);

  const eventColumns = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8) || "—"}</span> },
    { key: "provider", label: "Provider" },
    { key: "event_type", label: "Event Type", hidden: "hidden md:table-cell" },
    { key: "amount", label: "Amount", align: "right", render: (r) => `$${r.amount}` },
    { key: "currency", label: "Currency", hidden: "hidden lg:table-cell" },
    { key: "status", label: "Status", badge: true },
    { key: "created_date", label: "Date", hidden: "hidden md:table-cell", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];

  const purchaseColumns = [
    { key: "productName", label: "Product" },
    { key: "status", label: "Status", badge: true },
    { key: "amount", label: "Amount", align: "right", render: (r) => r.amount ? `$${r.amount}` : "—" },
    { key: "currency", label: "Currency", hidden: "hidden lg:table-cell" },
    { key: "buyerEmail", label: "Buyer", hidden: "hidden md:table-cell", render: (r) => <span className="text-xs">{r.buyerEmail || "—"}</span> },
    { key: "paidAt", label: "Paid At", hidden: "hidden lg:table-cell", render: (r) => r.paidAt ? new Date(r.paidAt).toLocaleString() : "—" },
    { key: "created_date", label: "Created", hidden: "hidden xl:table-cell", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];

  const subColumns = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8) || "—"}</span> },
    { key: "plan", label: "Plan" },
    { key: "status", label: "Status", badge: true },
    { key: "billing_provider", label: "Provider", hidden: "hidden md:table-cell" },
    { key: "period_start", label: "Period Start", hidden: "hidden lg:table-cell", render: (r) => r.period_start ? new Date(r.period_start).toLocaleDateString() : "—" },
    { key: "period_end", label: "Period End", hidden: "hidden lg:table-cell", render: (r) => r.period_end ? new Date(r.period_end).toLocaleDateString() : "—" },
  ];

  return (
    <div>
      <PageHeader title="Billing" subtitle="Purchases, webhook events, and subscriptions." />
      <Tabs defaultValue="purchases">
        <TabsList>
          <TabsTrigger value="purchases">Purchases</TabsTrigger>
          <TabsTrigger value="events">Billing Events</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
        </TabsList>
        <TabsContent value="purchases">
          <AdminTable columns={purchaseColumns} rows={purchases} empty="No purchases yet." />
        </TabsContent>
        <TabsContent value="events">
          <AdminTable columns={eventColumns} rows={events} empty="No billing events." />
        </TabsContent>
        <TabsContent value="subscriptions">
          <AdminTable columns={subColumns} rows={subs} empty="No subscriptions." />
        </TabsContent>
      </Tabs>
    </div>
  );
}