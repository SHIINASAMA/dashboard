import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Plus, RefreshCw, Trash2, Play, AlertCircle } from "lucide-react";

function AddAccountForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [screenName, setScreenName] = useState("");
  const [authToken, setAuthToken] = useState("");
  const [fetchInterval, setFetchInterval] = useState(30);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: () => api.createAccount({ screenName, authToken, fetchInterval }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[var(--card)] rounded-xl p-6 w-full max-w-md mx-4 shadow-lg border border-[var(--border)]" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Add Account</h2>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Screen Name</label>
            <input
              type="text" value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="e.g. elonmusk"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Auth Token</label>
            <input
              type="password" value={authToken}
              onChange={(e) => setAuthToken(e.target.value)}
              placeholder="Your X auth_token cookie"
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] font-mono text-sm"
            />
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              From X.com cookies → auth_token. Keep this private.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--muted-foreground)]">Fetch Interval (minutes)</label>
            <input
              type="number" value={fetchInterval}
              onChange={(e) => setFetchInterval(Number(e.target.value))}
              min={5} max={1440}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending || !screenName || !authToken}
              className="flex-1 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {mutation.isPending ? "Adding..." : "Add Account"}
            </button>
            <button onClick={onClose} className="px-4 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Accounts() {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
    refetchInterval: 10_000,
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Accounts</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Manage your Twitter accounts. Data is fetched automatically based on the interval.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-white font-medium hover:opacity-90 transition-opacity"
        >
          <Plus size={16} /> Add Account
        </button>
      </div>

      {/* Accounts list */}
      {data?.accounts && data.accounts.length > 0 ? (
        <div className="space-y-3">
          {data.accounts.map((account) => {
            const lastFetched = account.last_fetched_at ? new Date(account.last_fetched_at) : null;
            const nextFetch = lastFetched
              ? new Date(lastFetched.getTime() + (account.fetch_interval || 30) * 60 * 1000)
              : null;
            const isStale = nextFetch && nextFetch < new Date();

            return (
              <Card key={account.id} className={!account.is_active ? "opacity-60" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-base">@{account.screen_name}</span>
                        {!account.is_active && <Badge>Inactive</Badge>}
                        {account.error_message && <Badge className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Error</Badge>}
                        {isStale && account.is_active ? <Badge className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">Stale</Badge> : null}
                      </div>

                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[var(--muted-foreground)]">
                        <span>Interval: every {account.fetch_interval}m</span>
                        {lastFetched && <span>Last: {lastFetched.toLocaleString()}</span>}
                        {nextFetch && <span>Next: {nextFetch.toLocaleString()}</span>}
                        {account.user_id && <span className="font-mono text-xs">ID: {account.user_id}</span>}
                      </div>

                      {account.error_message && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500">
                          <AlertCircle size={12} /> {account.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => triggerMutation.mutate(account.id)}
                        disabled={triggerMutation.isPending}
                        className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                        title="Fetch now"
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => {
                          const newActive = account.is_active ? 0 : 1;
                          api.updateAccount(account.id, { isActive: !!newActive }).then(() =>
                            queryClient.invalidateQueries({ queryKey: ["accounts"] })
                          );
                        }}
                        className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
                        title={account.is_active ? "Disable" : "Enable"}
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Delete @${account.screen_name} and all its data?`)) {
                            deleteMutation.mutate(account.id);
                          }
                        }}
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
          <CardHeader>
            <CardTitle>No accounts yet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--muted-foreground)]">
              Add your first Twitter account to start collecting data.
            </p>
          </CardContent>
        </Card>
      )}

      {showAddForm && <AddAccountForm onClose={() => setShowAddForm(false)} />}
    </div>
  );
}
