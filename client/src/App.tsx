import { Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Layout from "./components/Layout";
import { Overview } from "./pages/Overview";
import { X } from "./pages/X";
import { XDetail } from "./pages/XDetail";
import { GitHub } from "./pages/GitHub";
import { GitHubDetail } from "./pages/GitHubDetail";
import { RepoDetail } from "./pages/RepoDetail";

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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </QueryClientProvider>
  );
}
