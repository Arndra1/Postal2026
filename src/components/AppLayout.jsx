import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Search, Sparkles, FolderHeart, Columns3, Coins, CreditCard, UserCircle, HelpCircle,
  ShieldCheck, Scale, LogOut, Menu, X, ChevronRight, Building2, Database, Gavel, Lightbulb
} from "lucide-react";
import Logo from "@/components/Logo";
import TermsGate from "@/components/TermsGate";

const userNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover Leads", icon: Lightbulb },
  { to: "/find-leads-unified", label: "Find Leads", icon: Search },
  { to: "/bankruptcy", label: "Bankruptcy Prospects", icon: Gavel },
  { to: "/find-leads", label: "Find Leads (Legacy)", icon: Search },
  { to: "/new-businesses", label: "New Businesses", icon: Building2 },
  { to: "/enrich", label: "Enrich", icon: Sparkles },
  { to: "/saved-leads", label: "Saved Leads", icon: FolderHeart },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/credits", label: "Credits", icon: Coins },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/account", label: "Account", icon: UserCircle },
  { to: "/help", label: "Help", icon: HelpCircle },
];

const adminNav = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: UserCircle },
  { to: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard },
  { to: "/admin/credits", label: "Credits", icon: Coins },
  { to: "/admin/enrichments", label: "Enrichments", icon: Sparkles },
  { to: "/admin/billing", label: "Billing Events", icon: CreditCard },
  { to: "/admin/activity", label: "System Activity", icon: ShieldCheck },
  { to: "/admin/compliance", label: "Compliance", icon: Scale },
  { to: "/admin/data-sources", label: "Data Sources", icon: Database },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user && (user.role === "admin" || user.role === "owner");
  const isOwner = user && user.role === "owner";

  const handleLogout = () => {
    logout(false);
    navigate("/");
  };

  const initials = (user?.full_name || user?.email || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <Link to="/dashboard" aria-label="RingBellz dashboard" className="flex items-center px-2 py-1">
        <Logo variant="sidebar" />
      </Link>

      <nav className="mt-8 flex-1 space-y-1">
        {userNav.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                active ? "bg-primary text-primary-foreground lady-shadow" : "text-muted-foreground hover:bg-secondary/15 hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-6 pb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Admin</div>
            {adminNav.map((item) => {
              const active = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                    active ? "bg-accent text-accent-foreground lady-shadow" : "text-muted-foreground hover:bg-accent/10 hover:text-foreground"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <div className="pt-4 border-t border-border">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full lady-gradient flex items-center justify-center text-white text-xs font-semibold">{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{user?.full_name || "User"}</div>
            <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          </div>
        </div>
        <Button variant="ghost" onClick={handleLogout} className="w-full justify-start mt-1 text-muted-foreground hover:text-foreground">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col bg-sidebar border-r border-sidebar-border p-4">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border px-4 h-14 flex items-center justify-between">
        <Link to="/dashboard" aria-label="RingBellz dashboard" className="flex items-center gap-2">
          <Logo variant="icon" />
          <span className="font-heading font-semibold">RingBellz</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 bg-sidebar border-r border-sidebar-border p-4">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></Button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8">
          <TermsGate>
              <Outlet />
          </TermsGate>
        </div>
      </main>
    </div>
  );
}