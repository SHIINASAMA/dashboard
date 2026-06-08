import { Hono } from "hono";
import { cors } from "hono/cors";
import { networkInterfaces } from "os";
import tweetsRouter from "./routes/tweets";
import statsRouter from "./routes/stats";
import accountsRouter from "./routes/accounts";
import githubRouter from "./routes/github";
import gitlabRouter from "./routes/gitlab";
import { startScheduler } from "./scheduler";
import { getAccountById } from "./db";
import { fetchAccount } from "./fetcher";
import { fetchGithubAccount } from "./fetchers/github";
import { fetchGitlabAccount } from "./fetchers/gitlab";

const app = new Hono();

app.use("/*", cors());

app.route("/api/tweets", tweetsRouter);
app.route("/api/stats", statsRouter);
app.route("/api/accounts", accountsRouter);
app.route("/api/github", githubRouter);
app.route("/api/gitlab", gitlabRouter);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Manual trigger for any platform
app.post("/api/fetch/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const account = getAccountById(id);
  if (!account || !account.is_active) return c.json({ error: "Account not found or inactive" }, 404);

  const fn = account.platform === "github" ? fetchGithubAccount
    : account.platform === "gitlab" ? fetchGitlabAccount
    : fetchAccount;
  fn(account).then((count) => {
    console.log(`[Manual] Fetch complete for @${account.screen_name} (${account.platform})`);
  });

  return c.json({ message: "Fetch started" });
});

startScheduler();

const port = 3001;
console.log(`Server running on http://localhost:${port}`);
export default { port, fetch: app.fetch };
