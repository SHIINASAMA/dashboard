import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { api, type TimelineData } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  ArrowLeft, Play, RefreshCw, Trash2, AlertCircle,
  MessageSquare, Heart, Repeat2, Eye,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";

export function XDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const accountId = Number(id);

  const { data: account, isLoading } = useQuery({
    queryKey: ["account", accountId],
    queryFn: () => api.getAccount(accountId),
    enabled: !!accountId,
  });

  const { data: tweets } = useQuery({
    queryKey: ["tweets", accountId],
    queryFn: () => api.getTweets(1, 50, "created_at", "desc", undefined, [accountId]),
    enabled: !!accountId,
  });

  const { data: timeline } = useQuery<TimelineData>({
    queryKey: ["timeline", accountId],
    queryFn: () => api.getTimeline(6),
    enabled: !!accountId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.deleteAccount(accountId),
    onSuccess: () => navigate("/x"),
  });

  const triggerMutation = useMutation({
    mutationFn: () => api.triggerFetch(accountId),
  });

  if (isLoading) {
    return <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>;
  }

  if (!account) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--muted-foreground)]">Account not found</p>
        <button onClick={() => navigate("/x")} className="mt-4 text-sm text-[var(--primary)] hover:underline">Back to X</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate("/x")} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold">@{account.screen_name}</h2>
            {!account.is_active && <Badge>Inactive</Badge>}
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Fetch interval: every {account.fetch_interval}m
            {account.last_fetched_at && ` • Last fetched: ${new Date(account.last_fetched_at).toLocaleString()}`}
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors text-sm disabled:opacity-40"
          >
            <Play size={14} /> {triggerMutation.isPending ? "Fetching..." : "Fetch Now"}
          </button>
          <button
            onClick={() => {
              api.updateAccount(accountId, { isActive: !account.is_active }).then(() =>
                queryClient.invalidateQueries({ queryKey: ["account", accountId] })
              );
            }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
            title={account.is_active ? "Disable" : "Enable"}
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => { if (confirm(`Delete @${account.screen_name} and all its data?`)) deleteMutation.mutate(); }}
            className="p-2 rounded-lg bg-[var(--muted)] hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-red-500"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {account.error_message && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={14} /> {account.error_message}
        </div>
      )}

      {account.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.followers_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">Followers</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.following_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">Following</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{account.stats.tweet_count?.toLocaleString() || "0"}</p><p className="text-xs text-[var(--muted-foreground)]">Tweets</p></CardContent></Card>
        </div>
      )}

      {timeline && timeline.dailyTweets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle>Tweet Activity</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Bar dataKey="tweets_count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Engagement</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timeline.dailyTweets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", fontSize: "13px" }} />
                  <Area type="monotone" dataKey="total_likes" stroke="#ec4899" fill="#ec489920" name="Likes" />
                  <Area type="monotone" dataKey="total_retweets" stroke="#3b82f6" fill="#3b82f620" name="Retweets" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {tweets && tweets.data.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Tweets</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {tweets.data.slice(0, 20).map((tweet) => (
              <div key={tweet.id} className="p-3 rounded-lg bg-[var(--muted)] space-y-2">
                <p className="text-sm whitespace-pre-wrap break-words">{tweet.full_text}</p>
                <div className="flex items-center gap-4 text-xs text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-1"><Heart size={12} /> {tweet.favorite_count}</span>
                  <span className="flex items-center gap-1"><Repeat2 size={12} /> {tweet.retweet_count}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={12} /> {tweet.reply_count}</span>
                  {tweet.view_count > 0 && <span className="flex items-center gap-1"><Eye size={12} /> {tweet.view_count}</span>}
                  <span>{new Date(tweet.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
