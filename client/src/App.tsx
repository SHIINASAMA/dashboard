import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Overview } from "./pages/Overview";
import { Tweets } from "./pages/Tweets";
import { Analytics } from "./pages/Analytics";
import { Accounts } from "./pages/Accounts";
import { BarChart3, MessageSquare, LayoutDashboard, Users } from "lucide-react";

const queryClient = new QueryClient();

type Page = "overview" | "tweets" | "analytics" | "accounts";

const NAV_ITEMS: { key: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "tweets", label: "Tweets", icon: MessageSquare },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "accounts", label: "Accounts", icon: Users },
];

function AppContent() {
  const [currentPage, setCurrentPage] = useState<Page>("accounts");

  const PageComponent = {
    overview: Overview,
    tweets: Tweets,
    analytics: Analytics,
    accounts: Accounts,
  }[currentPage];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-6 h-6 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <h1 className="text-lg font-semibold">x-kit Dashboard</h1>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1 -mb-px">
            {NAV_ITEMS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setCurrentPage(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  currentPage === key
                    ? "border-[var(--primary)] text-[var(--primary)]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <PageComponent />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
