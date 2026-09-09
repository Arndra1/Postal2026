import React, { useEffect, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import GiftCreditsSection from "@/components/admin/GiftCreditsSection";

export default function AdminCredits() {
  const [wallets, setWallets] = useState([]);
  const [ledger, setLedger] = useState([]);

  const loadData = useCallback(() => {
    base44.entities.CreditWallet.list().then(setWallets);
    base44.entities.CreditLedger.list().then((l) => setLedger(l.slice().sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0))));
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const walletCols = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8)}…</span> },
    { key: "balance", label: "Balance", align: "right" },
    { key: "lifetime_granted", label: "Granted", align: "right", hidden: "hidden md:table-cell" },
    { key: "lifetime_used", label: "Used", align: "right", hidden: "hidden md:table-cell" },
  ];
  const ledgerCols = [
    { key: "user_id", label: "User ID", hidden: "hidden lg:table-cell", render: (r) => <span className="font-mono text-xs">{r.user_id?.slice(0, 8)}…</span> },
    { key: "action", label: "Action", render: (r) => <span className="capitalize font-medium">{r.action}</span> },
    { key: "description", label: "Description", hidden: "hidden md:table-cell" },
    { key: "amount", label: "Amount", align: "right", render: (r) => <span className={r.amount >= 0 ? "text-accent" : "text-destructive"}>{r.amount >= 0 ? "+" : ""}{r.amount}</span> },
    { key: "balance_after", label: "After", align: "right", hidden: "hidden md:table-cell" },
    { key: "created_date", label: "Date", hidden: "hidden lg:table-cell", render: (r) => r.created_date ? new Date(r.created_date).toLocaleString() : "—" },
  ];

  return (
    <div>
      <PageHeader title="Credits" subtitle="Credit wallets and ledger across all users." />
      <GiftCreditsSection onGranted={loadData} />
      <h2 className="font-heading text-lg font-semibold mb-3">Wallets</h2>
      <AdminTable columns={walletCols} rows={wallets} empty="No wallets." />
      <h2 className="font-heading text-lg font-semibold mt-8 mb-3">Ledger</h2>
      <AdminTable columns={ledgerCols} rows={ledger.slice(0, 100)} empty="No ledger entries." />
    </div>
  );
}