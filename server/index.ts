import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkInterfaces } from "os";
import tweetsRouter from "./routes/tweets";
import statsRouter from "./routes/stats";
import accountsRouter from "./routes/accounts";
import githubRouter from "./routes/github";
import gitlabRouter from "./routes/gitlab";
import redditRouter from "./routes/reddit";
import { startScheduler } from "./scheduler";
import { getAccountById } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";
import { fetchRedditAccount } from "./fetchers/reddit";

const app = new Hono();

app.use("/*", cors());

app.route("/api/tweets", tweetsRouter);
app.route("/api/stats", statsRouter);
app.route("/api/accounts", accountsRouter);
app.route("/api/github", githubRouter);
app.route("/api/gitlab", gitlabRouter);
app.route("/api/reddit", redditRouter);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Manual trigger for any platform
app.post("/api/fetch/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = getAccountById(id);
  if (!account || !account.is_active) return c.json({ error: "Account not found or inactive" }, 404);

  const fn = account.platform === "github" ? fetchGithubAccount
    : account.platform === "gitlab" ? fetchGitlabAccount
    : account.platform === "reddit" ? fetchRedditAccount
    : fetchAccount;
  fn(account).then((count) => {
    console.log(`[Manual] Fetch complete for @${account.screen_name} (${account.platform})`);
  });

  return c.json({ message: "Fetch started" });
});

startScheduler();

const port = Number(process.env.PORT) || 3001;
const protocol = process.env.HTTPS === "true" ? "https" : "http";
const host = process.env.HOST || "localhost";
const serverUrl = `${protocol}://${host}${port === 443 || port === 80 ? "" : `:${port}`}`;
console.log(`Server running on ${serverUrl}`);

// Export the redirect URI so the fetcher can use it for OAuth callbacks
export function getServerBaseUrl(): string {
  return serverUrl;
}

export default { port, fetch: app.fetch };
