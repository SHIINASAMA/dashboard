import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Account } from "../api";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AddAccountForm from "../components/AddAccountForm";
import { Plus, Play, Trash2, AlertCircle, ArrowUpRight, Star, GitFork, Users, BookOpen } from "lucide-react";

function GithubIcon({ size }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size || 18} height={size || 18} fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export function GitHub() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 10_000,
  });

  const ghAccounts = (data?.accounts || []).filter((a: Account) => a.platform === "github");

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteAccount(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: number) => api.triggerFetch(id),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (!isLoading && ghAccounts.length === 1) {
    return <Navigate to={`/github/${ghAccounts[0].id}`} replace />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GithubIcon size={24} />
          <div>
            <h2 className="text-xl font-semibold">GitHub</h2>
            <p className="text-sm text-[var(--muted-foreground)]">
              {ghAccounts.length > 0
                ? `${ghAccounts.length} account${ghAccounts.length > 1 ? "s" : ""} configured`
                : "Track repositories, stars, and contributions"}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add GitHub Account
        </button>
      </div>

      {/* Preview cards — always show */}
      <div>
        <h3 className="text-sm font-semibold mb-3">What you can track</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <Star size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">Repository Stars</p>
            <p className="text-xs text-[var(--muted-foreground)]">Track which repos are most popular</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <GitFork size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">Forks & Issues</p>
            <p className="text-xs text-[var(--muted-foreground)]">Monitor fork counts and open issues</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <Users size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">Follower Growth</p>
            <p className="text-xs text-[var(--muted-foreground)]">Track follower counts over time</p>
          </div>
          <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--card)]">
            <BookOpen size={20} className="text-[var(--muted-foreground)] mb-2" />
            <p className="text-sm font-medium">Languages</p>
            <p className="text-xs text-[var(--muted-foreground)]">Language distribution across repos</p>
          </div>
        </div>
      </div>

      {/* Accounts */}
      <div>
        <h3 className="text-sm font-semibold mb-3">
          {ghAccounts.length > 0 ? "Configured Accounts" : "No accounts yet"}
        </h3>
        {ghAccounts.length > 0 ? (
          <div className="space-y-3">
            {ghAccounts.map((account) => {
              const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
              const isStale = lastFetched && (Date.now() - lastFetched.getTime()) > (account.fetch_interval || 30) * 60 * 1000;

              return (
                <Card key={account.id} className={"group " + (!account.is_active ? "opacity-60 " : "") + "cursor-pointer hover:border-[var(--primary)]/50 transition-colors"} onClick={() => navigate(`/github/${account.id}`)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-base">{account.screen_name}</span>
                          <ArrowUpRight size={14} className="text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity" />
                          <Badge className="bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-800">GitHub</Badge>
                          {!account.is_active && <Badge>Inactive</Badge>}
                          {account.error_message && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Error</Badge>}
                          {isStale && account.is_active ? <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Stale</Badge> : null}
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                          <span>Interval: every {account.fetch_interval}m</span>
                          {lastFetched && <span>Last: {lastFetched.toLocaleString()}</span>}
                        </div>
                        {account.error_message && (
                          <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                            <AlertCircle size={12} /> {account.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerMutation.mutate(account.id); }}
                          disabled={triggerMutation.isPending}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                          title="Fetch now"
                        >
                          <Play size={16} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(account.id); }}
                          className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <GithubIcon size={32} />
                <p className="text-sm text-[var(--muted-foreground)]">
                  No GitHub accounts yet. Add an account to see repository stats, stars, fork counts, language distribution, and contribution heatmaps.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <Plus size={14} /> Add Your First GitHub Account
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} defaultPlatform="github" />}
    </div>
  );
}
