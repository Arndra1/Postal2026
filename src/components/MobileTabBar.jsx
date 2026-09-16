import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Lightbulb, Search, Columns3, UserCircle } from "lucide-react";

const TABS = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/discover", label: "Discover", icon: Lightbulb },
  { to: "/find-leads-unified", label: "Find", icon: Search },
  { to: "/pipeline", label: "Pipeline", icon: Columns3 },
  { to: "/account", label: "Account", icon: UserCircle },
];

export default function MobileTabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-nav safe-pb border-t border-white/50 overscroll-contain"
    >
      <div className="flex items-stretch justify-around h-16">
        {TABS.map((t) => {
          const active = pathname === t.to;
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              onClick={(e) => {
                if (pathname === t.to) {
                  e.preventDefault();
                  navigate(t.to, { replace: true });
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }
              }}
              className={
                "mobile-tab-item no-tap-highlight flex flex-col items-center justify-center gap-1 flex-1 text-[10px] font-medium transition " +
                (active ? "text-primary" : "text-muted-foreground hover:text-foreground")
              }
            >
              <Icon className="w-5 h-5" strokeWidth={active ? 2.4 : 2} />
              <span>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}