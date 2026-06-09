import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import Layout from "./components/Layout";
import { Overview } from "./pages/Overview";
import { X } from "./pages/X";
import { XDetail } from "./pages/XDetail";
import { GitHub } from "./pages/GitHub";
import { GitHubDetail } from "./pages/GitHubDetail";
import { RepoDetail } from "./pages/RepoDetail";
import { GitLab } from "./pages/GitLab";
import { GitLabDetail } from "./pages/GitLabDetail";
import { ProjectDetail } from "./pages/ProjectDetail";
import { Reddit } from "./pages/Reddit";
import { RedditDetail } from "./pages/RedditDetail";
import { Admin } from "./pages/Admin";
import { Settings } from "./pages/Settings";
import { Login } from "./pages/Login";
import { api } from "./api";

const queryClient = new QueryClient();

// Wrap the full app so that auth state is available everywhere
function AuthContext({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.checkAuth(),
    retry: 2,
    staleTime: 2 * 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--background)]">
        <div className="text-sm text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  // On error, treat as unauthenticated (server unreachable, etc.)
  if (isError || !data) {
    return <>{children}</>;
  }

  return <>{children}</>;
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.checkAuth(),
    staleTime: 2 * 60_000,
  });
  if (data?.authenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => api.checkAuth(),
    staleTime: 2 * 60_000,
  });
  if (!data?.authenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL} future={{ v7_startTransition: true }}>
        <AuthContext>
          <Routes>
            <Route path="login" element={<RedirectIfAuth><Login /></RedirectIfAuth>} />
            <Route element={<RequireAuth><Layout /></RequireAuth>}>
              <Route index element={<Overview />} />
              <Route path="x" element={<X />} />
              <Route path="x/:id" element={<XDetail />} />
              <Route path="github" element={<GitHub />} />
              <Route path="github/:id" element={<GitHubDetail />} />
              <Route path="github/:accountId/repos/:repoId" element={<RepoDetail />} />
              <Route path="gitlab" element={<GitLab />} />
              <Route path="gitlab/:id" element={<GitLabDetail />} />
              <Route path="gitlab/:accountId/projects/:projectId" element={<ProjectDetail />} />
              <Route path="reddit" element={<Reddit />} />
              <Route path="reddit/:id" element={<RedditDetail />} />
              <Route path="admin" element={<Admin />} />
              <Route path="settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </AuthContext>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
