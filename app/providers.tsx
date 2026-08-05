"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSyncExternalStore, useState } from "react";
import { ThemeProvider } from "@/components/ThemeProvider";
import "@/lib/client/i18n";

export function Providers({ children }: { children: React.ReactNode }) {
  // Hydration guard: render the client shell only after the browser takes
  // over, so i18n language detection never causes an SSR/client mismatch.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 3 * 60_000 },
        },
      })
  );

  if (!mounted) {
    return <div className="min-h-dvh bg-[var(--background)]" aria-label="Loading" />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  );
}
