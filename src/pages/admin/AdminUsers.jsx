import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import AdminTable from "@/components/AdminTable";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Ban, CheckCircle2, FlaskConical, Coins } from "lucide-react";

const roles = ["user", "staff", "admin", "owner"];

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [subs, setSubs] = useState([]);
  const [wallets, setWallets] = useState([]);
  const [leads, setLeads] = useState([]);
  const [betaUsers, setBetaUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState({});

  const load = async () => {
    const [u, s, w, l, b] = await Promise.all([
      base44.entities.User.list(),
      base44.entities.Subscription.list(),
      base44.entities.CreditWallet.list(),
      base44.entities.Lead.list(),
      base44.entities.BetaUser.list(),
    ]);
    setUsers(u); setSubs(s); setWallets(w); setLeads(l); setBetaUsers(b);
  };
  useEffect(() => { load(); }, []);

  const subFor = (uid) => subs.find(s => s.user_id === uid);
  const walletFor = (uid) => wallets.find(w => w.user_id === uid);
  const leadCount = (uid) => leads.filter(l => l.user_id === uid).length;
  const betaFor = (uid) => betaUsers.find(b => b.user_id === uid);

  const grantBeta = async (u) => {
    setBusy(b => ({ ...b, [u.id + "beta"]: true }));
    try {
      await base44.functions.invoke("adminBetaGrant", { user_id: u.id, action: "grant", credits: 50 });
      await load();
    } catch (_e) {} finally { setBusy(b => ({ ...b, [u.id + "beta"]: undefined })); }
  };
  const revokeBeta = async (u) => {
    setBusy(b => ({ ...b, [u.id + "beta"]: true }));
    try {
      await base44.functions.invoke("adminBetaGrant", { user_id: u.id, action: "revoke" });
      await load();
    } catch (_e) {} finally { setBusy(b => ({ ...b, [u.id + "beta"]: undefined })); }
  };
  const addBetaCredits = async (u) => {
    setBusy(b => ({ ...b, [u.id + "cred"]: true }));
    try {
      await base44.functions.invoke("adminBetaGrant", { user_id: u.id, action: "grant_credits", credits: 50 });
      await load();
    } catch (_e) {} finally { setBusy(b => ({ ...b, [u.id + "cred"]: undefined })); }
  };

  const filtered = users.filter(u => {
    const s = search.toLowerCase();
    return (u.full_name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || (u.company_name || "").toLowerCase().includes(s);
  });

  const setRole = async (uid, role) => {
    setBusy(b => ({ ...b, [uid]: "role" }));
    try { await base44.functions.invoke("adminUpdateUser", { user_id: uid, action: "set_role", role }); await load(); } catch (_e) {} finally { setBusy(b => ({ ...b, [uid]: undefined })); }
  };
  const toggleDisable = async (u) => {
    setBusy(b => ({ ...b, [u.id + "d"]: "x" }));
    try { await base44.functions.invoke("adminUpdateUser", { user_id: u.id, action: "set_disabled", disabled: !u.disabled }); await load(); } catch (_e) {} finally { setBusy(b => ({ ...b, [u.id + "d"]: undefined })); }
  };

  const columns = [
    { key: "full_name", label: "Name", render: (u) => <span className="font-medium">{u.full_name || "—"}</span> },
    { key: "email", label: "Email", hidden: "hidden md:table-cell" },
    { key: "company_name", label: "Company", hidden: "hidden lg:table-cell" },
    { key: "role", label: "Role", render: (u) => (
      <select value={u.role} onChange={(e) => setRole(u.id, e.target.value)} disabled={busy[u.id] === "role" || u.id === me.id}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs capitalize disabled:opacity-60">
        {roles.map(r => <option key={r} value={r}>{r}</option>)}
      </select>
    )},
    { key: "status", label: "Subscription", hidden: "hidden lg:table-cell", render: (u) => <StatusBadge status={subFor(u.id)?.status || "none"} /> },
    { key: "balance", label: "Credits", align: "right", render: (u) => walletFor(u.id)?.balance ?? 0 },
    { key: "leads", label: "Leads", align: "right", hidden: "hidden xl:table-cell", render: (u) => leadCount(u.id) },
    { key: "beta", label: "Beta", hidden: "hidden lg:table-cell", render: (u) => {
      const b = betaFor(u.id);
      if (!b) return <span className="text-muted-foreground text-xs">—</span>;
      return b.status === "active"
        ? <span className="text-accent text-xs font-medium">Active</span>
        : <span className="text-destructive text-xs font-medium">Revoked</span>;
    }},
    { key: "disabled", label: "Status", render: (u) => u.disabled ? <span className="text-destructive text-xs font-medium">Disabled</span> : <span className="text-accent text-xs font-medium">Active</span> },
    { key: "act", label: "", align: "right", render: (u) => {
      const beta = betaFor(u.id);
      const isActive = beta?.status === "active";
      return (
        <div className="flex items-center justify-end gap-1">
          {isActive && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => addBetaCredits(u)} disabled={busy[u.id + "cred"]} title="Grant 50 beta credits">
              {busy[u.id + "cred"] ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4 text-primary" />}
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => isActive ? revokeBeta(u) : grantBeta(u)} disabled={busy[u.id + "beta"]} title={isActive ? "Revoke beta access" : "Grant beta access + 50 credits"}>
            {busy[u.id + "beta"] ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className={`w-4 h-4 ${isActive ? "text-accent" : "text-muted-foreground"}`} />}
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleDisable(u)} disabled={u.id === me.id || busy[u.id + "d"]} title={u.disabled ? "Enable account" : "Disable account"}>
            {busy[u.id + "d"] ? <Loader2 className="w-4 h-4 animate-spin" /> : u.disabled ? <CheckCircle2 className="w-4 h-4 text-accent" /> : <Ban className="w-4 h-4 text-destructive" />}
          </Button>
        </div>
      );
    }},
  ];

  return (
    <div>
      <PageHeader title="Users" subtitle="Manage accounts, roles, and access." />
      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="pl-9 h-10" />
      </div>
      <AdminTable columns={columns} rows={filtered} empty="No users found." />
    </div>
  );
}