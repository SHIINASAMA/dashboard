import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { api } from "./api";

const Layout = lazy(() => import("./components/Layout"));
const Overview = lazy(() => import("./pages/Overview").then(m => ({ default: m.Overview })));
const X = lazy(() => import("./pages/X").then(m => ({ default: m.X })));
const XDetail = lazy(() => import("./pages/XDetail").then(m => ({ default: m.XDetail })));
const GitHub = lazy(() => import("./pages/GitHub").then(m => ({ default: m.GitHub })));
const GitHubDetail = lazy(() => import("./pages/GitHubDetail").then(m => ({ default: m.GitHubDetail })));
const RepoDetail = lazy(() => import("./pages/RepoDetail").then(m => ({ default: m.RepoDetail })));
const GitLab = lazy(() => import("./pages/GitLab").then(m => ({ default: m.GitLab })));
const GitLabDetail = lazy(() => import("./pages/GitLabDetail").then(m => ({ default: m.GitLabDetail })));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail").then(m => ({ default: m.ProjectDetail })));
const Reddit = lazy(() => import("./pages/Reddit").then(m => ({ default: m.Reddit })));
const RedditDetail = lazy(() => import("./pages/RedditDetail").then(m => ({ default: m.RedditDetail })));
const Admin = lazy(() => import("./pages/Admin").then(m => ({ default: m.Admin })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 3 * 60_000,
    },
  },
});

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
      <BrowserRouter>
        <AuthContext>
          <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[var(--background)]"><div className="text-sm text-[var(--muted-foreground)]">Loading...</div></div>}>
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
          </Suspense>
        </AuthContext>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
