import { Hono } from "hono";
import { cors } from "hono/cors";
import tweetsRouter from "./routes/tweets";
import statsRouter from "./routes/stats";
import accountsRouter from "./routes/accounts";
import { startScheduler } from "./scheduler";
import { getActiveAccounts } from "./db";
import { fetchAccount } from "./fetcher";

const app = new Hono();

app.use("/*", cors());

app.route("/api/tweets", tweetsRouter);
app.route("/api/stats", statsRouter);
app.route("/api/accounts", accountsRouter);

app.get("/api/health", (c) => c.json({ status: "ok" }));

// Manual trigger: fetch data for a specific account
app.post("/api/fetch/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const accounts = getActiveAccounts();
  const account = accounts.find((a) => a.id === id);
  if (!account) return c.json({ error: "Account not found or inactive" }, 404);

  // Fire and forget in background
  fetchAccount(account).then((count) => {
    console.log(`[Manual] Fetch complete for @${account.screen_name}: ${count} tweets`);
  });

  return c.json({ message: "Fetch started" });
});

// Start the background scheduler
startScheduler();

const port = 3001;
console.log(`Server running on http://localhost:${port}`);
export default { port, fetch: app.fetch };
