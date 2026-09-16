import React, { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Search, Sparkles, FolderHeart, Columns3, Coins, CreditCard, UserCircle, HelpCircle,
  ShieldCheck, Scale, LogOut, Menu, X, ChevronRight, Building2, Database, Gavel, Lightbulb, Mail, Bell, UserPlus, Landmark, Bookmark, Headset, Award, Receipt, Heart, ScrollText
} from "lucide-react";
import Logo from "@/components/Logo";
import GradientBackground from "@/components/GradientBackground";
import TermsGate from "@/components/TermsGate";
import NotificationBell from "@/components/NotificationBell";
import MobileTabBar from "@/components/MobileTabBar";
import MobileBackHeader from "@/components/MobileBackHeader";

// Routes that show the fixed bottom tab bar.
const TAB_ROUTES = new Set([
  "/dashboard",
  "/discover",
  "/find-leads-unified",
  "/pipeline",
  "/account",
]);

// Title lookup for the mobile back header on nested (non-tab) routes.
const NESTED_TITLES = {
  "/add-lead": "Add Lead",
  "/notifications": "Notifications",
  "/enrich": "Enrich",
  "/credits": "Credits",
  "/billing": "Billing",
  "/help": "Help & Support",
  "/saved-leads": "Saved Leads",
  "/bankruptcy": "Bankruptcy Prospects",
  "/find-leads": "Find Leads",
  "/new-businesses": "New Businesses",
  "/federal-grants": "Federal Grants",
  "/grants-gov": "Grants.gov",
  "/tax-delinquent": "Tax-Delinquent",
  "/pacer-search": "PACER Search",
  "/saved-searches": "Saved Searches",
  "/outreach": "Outreach Templates",
};

const userNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/discover", label: "Discover Leads", icon: Lightbulb },
  { to: "/find-leads-unified", label: "Find Leads", icon: Search },
  { to: "/bankruptcy", label: "Bankruptcy Prospects", icon: Gavel },
  { to: "/find-leads", label: "Find Leads (Legacy)", icon: Search },
  { to: "/new-businesses", label: "New Businesses", icon: Building2 },
  { to: "/find-leads-unified", label: "Nonprofits", icon: Heart, state: { tab: "nonprofits" } },
  { to: "/federal-grants", label: "Federal Grants", icon: Landmark },
  { to: "/grants-gov", label: "Grants.gov Opportunities", icon: Award },
  { to: "/tax-delinquent", label: "Tax-Delinquent Taxpayers", icon: Receipt },
  { to: "/pacer-search", label: "PACER Party Search", icon: ScrollText },
  { to: "/enrich", label: "Enrich", icon: Sparkles },
  { to: "/saved-leads", label: "Saved Leads", icon: FolderHeart },
  { to: "/add-lead", label: "Add Lead", icon: UserPlus },
  { to: "/saved-searches", label: "Saved Searches", icon: Bookmark },
  { to: "/outreach", label: "Outreach Templates", icon: Mail },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/credits", label: "Credits", icon: Coins },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/account", label: "Account", icon: UserCircle },
  { to: "/notifications", label: "Notifications", icon: Bell },
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
  { to: "/admin/support", label: "Support Inbox", icon: Headset },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user && (user.role === "admin" || user.role === "owner");
  const isOwner = user && user.role === "owner";

  const isTabRoute = TAB_ROUTES.has(location.pathname);
  const backTitle = NESTED_TITLES[location.pathname] || "";

  const handleLogout = () => {
    logout(false);
    navigate("/");
  };

  const initials = (user?.full_name || user?.email || "U").split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1">
        <Link to="/dashboard" aria-label="RingBellz dashboard" className="flex items-center">
          <Logo variant="sidebar" />
        </Link>
        <NotificationBell />
      </div>

      <nav className="mt-8 flex-1 space-y-1">
        {userNav.map((item) => {
          const active = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              state={item.state}
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
    <div className="min-h-screen relative">
      <GradientBackground />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col glass-sidebar p-4">
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 glass-nav safe-pt px-4 min-h-14 flex items-center justify-between">
        <Link to="/dashboard" aria-label="RingBellz dashboard" className="flex items-center">
          <Logo variant="header" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button variant="ghost" size="icon" onClick={() => setMobileOpen(true)}><Menu className="w-5 h-5" /></Button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex safe-pt">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <div className="relative w-72 glass-sidebar p-4 safe-pt overflow-y-auto overscroll-contain">
            <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={() => setMobileOpen(false)}><X className="w-5 h-5" /></Button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="lg:pl-64">
        <div className={"max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-8 overscroll-contain " + (isTabRoute ? "pb-28 lg:pb-8" : "pb-8")}>
          {!isTabRoute && backTitle && <MobileBackHeader title={backTitle} />}
          <TermsGate>
              <Outlet />
          </TermsGate>
        </div>
      </main>

      {/* Mobile bottom tab bar — five core routes only */}
      {isTabRoute && <MobileTabBar />}
    </div>
  );
}