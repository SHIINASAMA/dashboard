import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import { Settings } from "./pages/Settings";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        <Route element={<Layout />}>
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
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
