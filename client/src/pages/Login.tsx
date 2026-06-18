import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, LogIn, Eye, EyeOff } from "lucide-react";
import { api } from "../api";
import { useBingWallpaper } from "../lib/useBingWallpaper";

export function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { url } = useBingWallpaper();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username || "admin", password);
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
        navigate("/", { replace: true });
      } else {
        setError(t("login.invalidPassword"));
      }
    } catch {
      setError(t("login.invalidPassword"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-dvh flex items-center justify-center bg-[var(--background)] pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      {/* Bing wallpaper background */}
      <div className="absolute inset-0">
        <img
          src={url}
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>

      {/* Form card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
          {/* Branding */}
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="p-2.5 rounded-xl bg-white/15">
              <LayoutDashboard size={24} className="text-white" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white text-center mb-1">
            {t("common.dashboard")}
          </h1>
          <p className="text-sm text-white/60 text-center mb-8">
            Track your X, GitHub, GitLab, and Reddit activity in one place.
          </p>

          <h2 className="text-base font-medium text-white/90 mb-4">{t("login.login")}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/60">{t("login.username")}</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 rounded-lg border border-white/20 bg-white/10 text-white text-sm
                  placeholder:text-white/30
                  focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent
                  transition-shadow"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-white/60">{t("login.password")}</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                  className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-white/20 bg-white/10 text-white text-sm
                    placeholder:text-white/30
                    focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent
                    transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 min-h-11 min-w-11 flex items-center justify-center rounded text-white/50 hover:text-white/80 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs bg-[var(--danger)]/20 text-[var(--danger)] px-3 py-2 rounded-lg">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                bg-white/90 text-gray-900 font-medium text-sm
                hover:bg-white active:scale-[0.98]
                transition-all disabled:opacity-40 disabled:pointer-events-none"
            >
              <LogIn size={16} />
              {loading ? t("login.loggingIn") : t("login.login")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
