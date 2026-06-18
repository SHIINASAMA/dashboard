import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { LayoutDashboard, PanelLeftClose, Settings, LogOut, Shield, Users, Menu } from "lucide-react";
import { XIcon, GithubIcon, GitlabIcon, RedditIcon } from "./BrandIcons";
import { api } from "../api";
import { useBingWallpaper } from "../lib/useBingWallpaper";

const SIDEBAR_KEY = "sidebar-state";
const SIDEBAR_WIDTH = 240;
const TITLEBAR_H = 48;

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
  const { url } = useBingWallpaper();
  const [isOpen, setIsOpen] = useState(loadVisible);
  const [loggingOut, setLoggingOut] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e: MediaQueryListEvent | MediaQueryList) => {
      const mobile = e.matches;
      setIsMobile(mobile);
      if (mobile) {
        setIsOpen(false);
        saveVisible(false);
      }
    };
    handler(mq);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
      queryClient.setQueryData(["auth", "me"], { authenticated: false });
      navigate("/login", { replace: true });
    } finally {
      setLoggingOut(false);
    }
  };

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      saveVisible(!prev);
      return !prev;
    });
  }, []);

  const closeMobile = useCallback(() => {
    if (isMobile) {
      setIsOpen(false);
      saveVisible(false);
    }
  }, [isMobile]);

  const NAV_ITEMS = [
    { to: "/", label: t("nav.overview"), icon: LayoutDashboard },
    { to: "/x", label: t("nav.x"), icon: XIcon },
    { to: "/github", label: t("nav.github"), icon: GithubIcon },
    { to: "/gitlab", label: t("nav.gitlab"), icon: GitlabIcon },
    { to: "/reddit", label: t("nav.reddit"), icon: RedditIcon },
  ] as const;

  return (
    <div className="h-dvh flex overflow-hidden bg-[var(--background)]">
      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          className="h-full border-r border-[var(--border)] bg-[var(--card)] flex flex-col overflow-y-auto relative z-20 shrink-0"
          style={{
            width: isOpen ? SIDEBAR_WIDTH : 0,
            transition: "width 0.3s ease",
            overflow: "hidden",
          }}
        >
          <div style={{ width: SIDEBAR_WIDTH }} className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <LayoutDashboard size={20} className="shrink-0" />
              <h1 className="text-lg font-semibold truncate">{t("common.dashboard")}</h1>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                      <Icon size={18} />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto p-3 border-t border-[var(--border)] space-y-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                      <Shield size={18} />
                      {t("nav.admin")}
                    </>
                  )}
                </NavLink>
              )}
              <NavLink
                to="/accounts"
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                    <Users size={18} />
                    {t("nav.accounts")}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                    <Settings size={18} />
                    {t("nav.settings")}
                  </>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-40 w-full text-left"
              >
                <LogOut size={18} />
                {loggingOut ? "…" : t("nav.logout")}
              </button>
              <p className="text-xs text-[var(--muted-foreground)] px-3">{t("common.copyright")}</p>
            </div>
          </div>
        </aside>
      )}

      {/* Mobile sidebar overlay */}
      {isMobile && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-30"
            style={{
              opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? "auto" : "none",
              transition: "opacity 0.3s ease",
            }}
            onClick={closeMobile}
          />
          <aside
            className="fixed inset-y-0 left-0 z-40 border-r border-[var(--border)] bg-[var(--card)] flex flex-col overflow-y-auto pb-[env(safe-area-inset-bottom)]"
            style={{
              width: SIDEBAR_WIDTH,
              transform: isOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.3s ease",
            }}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)] shrink-0">
              <LayoutDashboard size={20} className="shrink-0" />
              <h1 className="text-lg font-semibold truncate">{t("common.dashboard")}</h1>
            </div>
            <nav className="flex flex-col gap-1 p-3">
              {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                      <Icon size={18} />
                      <span className="truncate">{label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
            <div className="mt-auto p-3 border-t border-[var(--border)] space-y-3">
              {isAdmin && (
                <NavLink
                  to="/admin"
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                      <Shield size={18} />
                      {t("nav.admin")}
                    </>
                  )}
                </NavLink>
              )}
              <NavLink
                to="/accounts"
                onClick={closeMobile}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                    <Users size={18} />
                    {t("nav.accounts")}
                  </>
                )}
              </NavLink>
              <NavLink
                to="/settings"
                onClick={closeMobile}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--primary)]/8 text-[var(--foreground)] font-semibold shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-[var(--primary)]" />}
                    <Settings size={18} />
                    {t("nav.settings")}
                  </>
                )}
              </NavLink>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/5 transition-colors disabled:opacity-40 w-full text-left"
              >
                <LogOut size={18} />
                {loggingOut ? "…" : t("nav.logout")}
              </button>
              <p className="text-xs text-[var(--muted-foreground)] px-3">{t("common.copyright")}</p>
            </div>
          </aside>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative">
        <img
          src={url}
          alt=""
          className="fixed inset-0 w-full h-full object-cover pointer-events-none"
        />
        <div className="fixed inset-0 bg-[var(--background)]/85" />

        {/* Title bar */}
        <div
          className="relative z-10 shrink-0 flex items-center gap-3 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-sm pt-[env(safe-area-inset-top)]"
          style={{ minHeight: `calc(${TITLEBAR_H}px + env(safe-area-inset-top))` }}
        >
          <button
            onClick={toggle}
            className="p-2.5 ml-2 min-h-11 min-w-11 flex items-center justify-center rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            title={isOpen ? t("common.collapseSidebar") : t("common.expandSidebar")}
            aria-label={isOpen ? t("common.collapseSidebar") : t("common.expandSidebar")}
          >
            <span
              className="block transition-transform duration-300"
              style={{ transform: isOpen ? "rotate(0deg)" : "rotate(180deg)" }}
            >
              {isMobile ? <Menu size={20} /> : <PanelLeftClose size={20} />}
            </span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <LayoutDashboard size={18} className="text-[var(--primary)]" />
            <span className="text-sm font-semibold">{t("common.dashboard")}</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-auto relative z-10 pb-[env(safe-area-inset-bottom)]">
          <div
            className="max-w-6xl mx-auto transition-all duration-300"
            style={{
              paddingTop: isMobile ? 12 : 24,
              paddingBottom: isMobile ? 12 : 24,
              paddingLeft: isMobile ? "max(16px, env(safe-area-inset-left))" : 32,
              paddingRight: isMobile ? "max(16px, env(safe-area-inset-right))" : 32,
            }}
          >
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
