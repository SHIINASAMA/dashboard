import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type Tweet, type PaginatedTweets } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Heart, Repeat2, Eye, MessageSquare, Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react";

export function Tweets() {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const { data, isLoading } = useQuery<PaginatedTweets>({
    queryKey: ["tweets", page, sort, order, search],
    queryFn: () => api.getTweets(page, 20, sort, order, search),
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const toggleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === "desc" ? "asc" : "desc");
    } else {
      setSort(col);
      setOrder("desc");
    }
    setPage(1);
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <ArrowUpDown size={14} className="opacity-30" />;
    return order === "desc" ? <ArrowDown size={14} /> : <ArrowUp size={14} />;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tweets</CardTitle>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search tweets..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--ring)] w-48"
              />
              <button
                onClick={handleSearch}
                className="p-2 rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors"
              >
                <Search size={16} />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">Loading...</p>
          ) : data && data.data.length > 0 ? (
            <div className="space-y-2">
              {/* Header row */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-[var(--muted-foreground)]">
                <div className="col-span-5 cursor-pointer select-none flex items-center gap-1" onClick={() => toggleSort("created_at")}>
                  Tweet <SortIcon col="created_at" />
                </div>
                <div className="col-span-2 cursor-pointer select-none flex items-center gap-1" onClick={() => toggleSort("favorite_count")}>
                  <Heart size={12} /> <SortIcon col="favorite_count" />
                </div>
                <div className="col-span-1 cursor-pointer select-none flex items-center gap-1" onClick={() => toggleSort("retweet_count")}>
                  <Repeat2 size={12} /> <SortIcon col="retweet_count" />
                </div>
                <div className="col-span-1 cursor-pointer select-none flex items-center gap-1" onClick={() => toggleSort("reply_count")}>
                  <MessageSquare size={12} /> <SortIcon col="reply_count" />
                </div>
                <div className="col-span-1 cursor-pointer select-none flex items-center gap-1" onClick={() => toggleSort("view_count")}>
                  <Eye size={12} /> <SortIcon col="view_count" />
                </div>
                <div className="col-span-2">Date</div>
              </div>

              {/* Tweet rows */}
              {data.data.map((tweet: Tweet) => (
                <div
                  key={tweet.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 px-3 py-3 rounded-lg hover:bg-[var(--muted)] transition-colors"
                >
                  <div className="md:col-span-5 min-w-0">
                    <p className="text-sm line-clamp-2 leading-snug">{tweet.full_text}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {JSON.parse(tweet.hashtags).map((tag: string) => (
                        <Badge key={tag}>#{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex md:hidden gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="flex items-center gap-1"><Heart size={12} /> {tweet.favorite_count}</span>
                    <span className="flex items-center gap-1"><Repeat2 size={12} /> {tweet.retweet_count}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={12} /> {tweet.reply_count}</span>
                    <span className="flex items-center gap-1"><Eye size={12} /> {tweet.view_count}</span>
                  </div>
                  <div className="hidden md:flex md:col-span-2 items-center text-sm">{tweet.favorite_count}</div>
                  <div className="hidden md:flex md:col-span-1 items-center text-sm">{tweet.retweet_count}</div>
                  <div className="hidden md:flex md:col-span-1 items-center text-sm">{tweet.reply_count}</div>
                  <div className="hidden md:flex md:col-span-1 items-center text-sm">{tweet.view_count}</div>
                  <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                      {new Date(tweet.created_at).toLocaleDateString()}
                    </span>
                    <a
                      href={`https://x.com/i/status/${tweet.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors shrink-0"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <p className="text-sm text-[var(--muted-foreground)]">
                  {data.total} tweets total
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-[var(--muted-foreground)]">
                    {page} / {data.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm rounded-lg bg-[var(--muted)] hover:bg-[var(--border)] transition-colors disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-12">
              No tweets found. Run the fetch script to populate data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
