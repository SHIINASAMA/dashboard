import { useState, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Allotment } from "allotment";
import "allotment/dist/style.css";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { LayoutDashboard, PanelLeft, Settings, LogOut, Shield } from "lucide-react";
import { XIcon, GithubIcon, GitlabIcon, RedditIcon } from "./BrandIcons";
import { api } from "../api";

const SIDEBAR_KEY = "sidebar-state";

function loadVisible(): boolean {
  try { return JSON.parse(localStorage.getItem(SIDEBAR_KEY) ?? "true"); } catch { return true; }
}

function saveVisible(v: boolean) {
  localStorage.setItem(SIDEBAR_KEY, JSON.stringify(v));
}

export default function Layout() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(loadVisible);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: authData } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.checkAuth(),
    staleTime: 2 * 60_000,
  });

  const isAdmin = authData?.role === "admin";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await api.logout();
      queryClient.setQueryData(["auth", "me"], { authenticated: false });
      navigate("/login", { replace: true });
    } catch {
      // Force logout even if API fails
      queryClient.setQueryData(["auth", "me"], { authenticated: false });
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleVisibleChange = useCallback((_index: number, v: boolean) => {
    setVisible(v);
    saveVisible(v);
  }, []);

  const toggle = () => {
    setVisible((prev) => {
      saveVisible(!prev);
      return !prev;
    });
  };

  const NAV_ITEMS = [
    { to: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { to: "/x", label: t("nav.x"), icon: XIcon },
    { to: "/github", label: t("nav.github"), icon: GithubIcon },
    { to: "/gitlab", label: t("nav.gitlab"), icon: GitlabIcon },
    { to: "/reddit", label: t("nav.reddit"), icon: RedditIcon },
  ] as const;

  return (
    <div className="h-screen flex overflow-hidden bg-[var(--background)]">
      <Allotment
        proportionalLayout
        onChange={(sizes) => {
          if (sizes.length === 2 && sizes[0] <= 0 !== !visible) {
            setVisible(sizes[0] > 0);
            saveVisible(sizes[0] > 0);
          }
        }}
        onVisibleChange={handleVisibleChange}
      >
        <Allotment.Pane
          preferredSize="18%"
          minSize={200}
          maxSize={400}
          visible={visible}
          snap
        >
          <aside className="h-full border-r border-[var(--border)] bg-[var(--card)] flex flex-col overflow-y-auto">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <LayoutDashboard size={20} className="shrink-0" />
              <h1 className="text-lg font-semibold truncate">{t("common.dashboard")}</h1>
              <button
                onClick={toggle}
                className="ml-auto p-1 rounded hover:bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0"
                title={t("common.collapseSidebar")}
                aria-label={t("common.collapseSidebar")}
              >
                <PanelLeft size={16} />
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  <Icon size={18} />
                  <span className="truncate">{label}</span>
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto p-3 border-t border-[var(--border)] space-y-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  <Shield size={18} />
                  {t("nav.admin")}
                </NavLink>
              )}
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                }
              >
                <Settings size={18} />
                {t("nav.settings")}
              </NavLink>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40 w-full text-left"
              >
                <LogOut size={18} />
                {loggingOut ? "…" : t("nav.logout")}
              </button>
              <p className="text-xs text-[var(--muted-foreground)] px-3">{t("common.copyright")}</p>
            </div>
          </aside>
        </Allotment.Pane>
        <Allotment.Pane minSize={300}>
          <main className="h-full overflow-auto">
            <div className="max-w-6xl mx-auto px-8 py-8">
              {!visible && (
                <button
                  onClick={toggle}
                  className="fixed left-3 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-r-md bg-[var(--card)] border border-[var(--border)] border-l-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)] shadow-sm"
                  title={t("common.expandSidebar")}
                  aria-label={t("common.expandSidebar")}
                >
                  <PanelLeft size={18} />
                </button>
              )}
              <Outlet />
            </div>
          </main>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
