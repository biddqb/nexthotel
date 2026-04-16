import { NavLink, Outlet } from "react-router-dom";
import {
  BarChart3,
  Brush,
  Calendar,
  LogOut,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/cn";
import { hasRoleAtLeast, useAuth } from "../lib/auth";
import { ShiftIndicator } from "./ShiftIndicator";

export function AppShell() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  const items = [
    { to: "/calendar", label: t("nav.calendar"), icon: Calendar, minRole: "staff" as const },
    { to: "/housekeeping", label: t("nav.housekeeping"), icon: Brush, minRole: "staff" as const },
    { to: "/guests", label: t("nav.guests"), icon: Users, minRole: "staff" as const },
    { to: "/expenses", label: t("nav.expenses"), icon: Receipt, minRole: "manager" as const },
    { to: "/reports", label: t("nav.reports"), icon: BarChart3, minRole: "manager" as const },
    { to: "/settings", label: t("nav.settings"), icon: Settings, minRole: "manager" as const },
  ].filter((it) => hasRoleAtLeast(user, it.minRole));

  return (
    <div className="h-full flex bg-bg">
      <aside className="w-56 shrink-0 bg-surface border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-4 border-b border-border">
          <span className="text-md font-semibold text-accent">nextHotel</span>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 px-3 h-9 rounded text-sm",
                  isActive
                    ? "bg-accent-50 text-accent font-medium"
                    : "text-text hover:bg-stone-100",
                )
              }
            >
              <it.icon className="h-4 w-4" />
              {it.label}
            </NavLink>
          ))}
        </nav>
        {user && (
          <div className="border-t border-border p-3 text-sm space-y-2">
            <ShiftIndicator />
            <div className="font-medium truncate">{user.name}</div>
            <div className="text-xs text-muted">
              {t(`auth.role.${user.role}`)}
            </div>
            <button
              onClick={() => logout()}
              className="btn-ghost w-full justify-start !h-8 text-xs"
            >
              <LogOut className="h-3 w-3" />
              {t("auth.signOut")}
            </button>
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
