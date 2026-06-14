import type { AccountRow } from "../repositories/accounts";
import { insertRedditStats, upsertRedditPost, upsertRedditComment, updateAccount } from "../db";
import { getLogger } from "../logger";
import { fetchWithConfig } from "../http";

async function getRedditAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in environment");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  const res = await fetchWithConfig("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "dashboard/1.0",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    signal: controller.signal,
  });
  clearTimeout(timer);

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    getLogger().error("Reddit", "OAuth token exchange failed: HTTP %d — %s", res.status, body.slice(0, 200));
    throw new Error(`Reddit OAuth error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.access_token;
}

async function redditFetch(path: string, token: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  const res = await fetchWithConfig(`https://oauth.reddit.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "dashboard/1.0",
    },
    signal: controller.signal,
  });
  clearTimeout(timer);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    getLogger().error("Reddit", "OAuth API HTTP %d for %s: %s", res.status, path, body.slice(0, 300));
    throw new Error(`Reddit API ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const runningRedditAccounts = new Set<number>();

export async function fetchRedditAccount(account: AccountRow) {
  if (runningRedditAccounts.has(account.id)) {
    getLogger().info("Reddit", "@%s: already running, skipping", account.screen_name);
    return { posts: 0, comments: 0 };
  }
  runningRedditAccounts.add(account.id);
  const refreshToken = account.auth_token;
  const username = account.screen_name;

  try {
    getLogger().info("Reddit", "Fetching @%s...", username);

    // 1. Get access token
    const accessToken = await getRedditAccessToken(refreshToken);

    getLogger().info("Reddit", "OAuth token exchange succeeded for @%s", username);

    // 2. Fetch user profile
    getLogger().info("Reddit", "@%s: fetching profile...", username);
    const profile = await redditFetch(`/user/${username}/about`, accessToken);
    if (!profile?.data?.name) {
      throw new Error("Invalid Reddit user profile");
    }

    const pdata = profile.data;
    await insertRedditStats({
      account_id: account.id,
      post_karma: pdata.link_karma ?? 0,
      comment_karma: pdata.comment_karma ?? 0,
    });
    getLogger().info("Reddit", "@%s: profile fetched, karma recorded (post=%d, comment=%d)", username, pdata.link_karma, pdata.comment_karma);

    // 3. Fetch posts
    getLogger().info("Reddit", "@%s: fetching posts...", username);
    let postCount = 0;
    let after: string | undefined;
    while (postCount < 200) {
      const path = `/user/${username}/submitted?limit=100&sort=new${after ? `&after=${after}` : ""}`;
      const posts = await redditFetch(path, accessToken);
      const children = posts?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const p = child.data;
        if (!p?.id) continue;
        await upsertRedditPost({
          id: p.id,
          account_id: account.id,
          title: p.title || "",
          selftext: p.selftext || "",
          subreddit: p.subreddit || "",
          score: p.score ?? 0,
          upvote_ratio: p.upvote_ratio ?? 0,
          num_comments: p.num_comments ?? 0,
          permalink: p.permalink || "",
          url: p.url || "",
          is_self: p.is_self ? 1 : 0,
          created_utc: Math.round(p.created_utc ?? 0),
        });
        postCount++;
      }

      after = posts?.data?.after || undefined;
      if (!after) break;
      await sleep(1000);
    }
    getLogger().info("Reddit", "@%s: %d posts saved", username, postCount);

    // 4. Fetch comments
    getLogger().info("Reddit", "@%s: fetching comments...", username);
    let commentCount = 0;
    after = undefined;
    while (commentCount < 200) {
      const path = `/user/${username}/comments?limit=100&sort=new${after ? `&after=${after}` : ""}`;
      const comments = await redditFetch(path, accessToken);
      const children = comments?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const c = child.data;
        if (!c?.id) continue;
        await upsertRedditComment({
          id: c.id,
          account_id: account.id,
          body: c.body || "",
          subreddit: c.subreddit || "",
          score: c.score ?? 0,
          link_id: c.link_id || "",
          parent_id: c.parent_id || null,
          depth: c.depth ?? 0,
          permalink: c.permalink || "",
          created_utc: Math.round(c.created_utc ?? 0),
          is_submitter: c.is_submitter ? 1 : 0,
        });
        commentCount++;
      }

      after = comments?.data?.after || undefined;
      if (!after) break;
      await sleep(1000);
    }
    getLogger().info("Reddit", "@%s: %d comments saved", username, commentCount);

    // Success
    await updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      user_id: pdata.id || username,
      error_message: null,
    });

    getLogger().info("Reddit", "Fetch complete for @%s", username);
    return { posts: postCount, comments: commentCount };
  } catch (e: any) {
    await updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: e.message || "Reddit fetch failed",
    });
    getLogger().error("Reddit", "Fetch failed for @%s: %s", username, e.message);
    throw e;
  } finally {
    runningRedditAccounts.delete(account.id);
  }
}

// ── Public (cookie-based) fetcher (curl) ──────────────────────────
// Uses curl subprocess to avoid Bun's TLS fingerprint detection by Reddit.
// The old fetch()-based implementation is kept below as redditPublicFetchOld.

async function redditPublicFetchCurl(path: string, cookies: Record<string, string>): Promise<any> {
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");

  const url = `https://www.reddit.com${path}`;
  const proc = Bun.spawn([
    "curl",
    "-sS",
    "--http1.1",
    "-w", "\n%{http_code}",
    url,
    "-H", "User-Agent: Safari/537.36",
    "-H", "Accept: application/json",
    "-H", `Cookie: ${cookieStr}`,
  ]);

  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  const exitCode = await proc.exited;

  // Last line of stdout is the HTTP status code from curl -w
  const lastNewline = stdout.lastIndexOf("\n");
  const status = lastNewline >= 0 ? parseInt(stdout.slice(lastNewline + 1).trim(), 10) || 0 : (exitCode !== 0 ? 0 : 200);
  const body = lastNewline >= 0 ? stdout.slice(0, lastNewline) : stdout;

  if (status >= 400 || status === 0) {
    getLogger().error("Reddit", "Public API (curl) HTTP %d for %s (exit=%d)", status, path, exitCode);
    if (status === 403) {
      throw new Error(`Reddit rejected the request (HTTP 403). This may be because: (1) your cookies have expired, or (2) the server IP is blocked by Reddit (common for datacenter/VPS IPs). Try from a residential IP or use OAuth instead. Body: ${body.slice(0, 200)}`);
    }
    if (status === 0) {
      throw new Error(`Reddit public API curl failed (exit=${exitCode}): ${stderr.slice(0, 200)}`);
    }
    throw new Error(`Reddit public API ${status} for ${path}: ${body.slice(0, 200)}`);
  }

  return JSON.parse(body);
}

// ── Public (cookie-based) fetcher (old, Bun fetch) ─────────────────
// Kept as dead code reference. No longer used — replaced by redditPublicFetchCurl.
// @ts-ignore — intentionally kept as reference, not used at runtime

async function redditPublicFetchOld(path: string, cookies: Record<string, string>): Promise<any> {
  const cookieStr = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  const res = await fetch(`https://www.reddit.com${path}`, {
    headers: {
      "User-Agent": "Safari/537.36",
      "Accept": "application/json",
      "Cookie": cookieStr,
    },
    // @ts-ignore — Bun-specific tls option
    tls: { rejectUnauthorized: false },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    getLogger().error("Reddit", "Public API HTTP %d for %s: %s", res.status, path, body.slice(0, 300));
    if (res.status === 403) {
      throw new Error(`Reddit rejected the request (HTTP 403). This may be because: (1) your cookies have expired, or (2) the server IP is blocked by Reddit (common for datacenter/VPS IPs). Try from a residential IP or use OAuth instead. Body: ${body.slice(0, 200)}`);
    }
    throw new Error(`Reddit public API ${res.status} for ${path}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchRedditPublicAccount(account: AccountRow) {
  if (runningRedditAccounts.has(account.id)) {
    getLogger().info("Reddit", "@%s (public): already running, skipping", account.screen_name);
    return { posts: 0, comments: 0 };
  }
  runningRedditAccounts.add(account.id);
  let cookies: Record<string, string>;
  try {
    cookies = JSON.parse(account.auth_token);
  } catch {
    // fallback: old plaintext loid token -> wrap in object for backward compat
    cookies = { loid: account.auth_token };
  }
  const username = account.screen_name;

  try {
    getLogger().info("Reddit", "Fetching @%s (public)...", username);

    // 1. Fetch public profile
    getLogger().info("Reddit", "@%s (public): fetching profile...", username);
    const profile = await redditPublicFetchCurl(`/user/${username}/about.json`, cookies);
    if (!profile?.data?.name) {
      throw new Error("Invalid Reddit user profile — user may not exist");
    }

    const pdata = profile.data;
    await insertRedditStats({
      account_id: account.id,
      post_karma: pdata.link_karma ?? 0,
      comment_karma: pdata.comment_karma ?? 0,
    });
    getLogger().info("Reddit", "@%s (public): profile fetched, karma recorded (post=%d, comment=%d)", username, pdata.link_karma, pdata.comment_karma);

    // 2. Fetch posts
    getLogger().info("Reddit", "@%s (public): fetching posts...", username);
    let postCount = 0;
    let after: string | undefined;
    while (postCount < 50) {
      const path = `/user/${username}/submitted.json?limit=25&sort=new${after ? `&after=${after}` : ""}`;
      const posts = await redditPublicFetchCurl(path, cookies);
      const children = posts?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const p = child.data;
        if (!p?.id) continue;
        await upsertRedditPost({
          id: p.id,
          account_id: account.id,
          title: p.title || "",
          selftext: p.selftext || "",
          subreddit: p.subreddit || "",
          score: p.score ?? 0,
          upvote_ratio: p.upvote_ratio ?? 0,
          num_comments: p.num_comments ?? 0,
          permalink: p.permalink || "",
          url: p.url || "",
          is_self: p.is_self ? 1 : 0,
          created_utc: Math.round(p.created_utc ?? 0),
        });
        postCount++;
      }

      after = posts?.data?.after || undefined;
      if (!after) break;
      await sleep(2000);
    }
    getLogger().info("Reddit", "@%s (public): %d posts saved", username, postCount);

    // 3. Fetch comments
    getLogger().info("Reddit", "@%s (public): fetching comments...", username);
    let commentCount = 0;
    after = undefined;
    while (commentCount < 50) {
      const path = `/user/${username}/comments.json?limit=25&sort=new${after ? `&after=${after}` : ""}`;
      const comments = await redditPublicFetchCurl(path, cookies);
      const children = comments?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const c = child.data;
        if (!c?.id) continue;
        await upsertRedditComment({
          id: c.id,
          account_id: account.id,
          body: c.body || "",
          subreddit: c.subreddit || "",
          score: c.score ?? 0,
          link_id: c.link_id || "",
          parent_id: c.parent_id || null,
          depth: c.depth ?? 0,
          permalink: c.permalink || "",
          created_utc: Math.round(c.created_utc ?? 0),
          is_submitter: c.is_submitter ? 1 : 0,
        });
        commentCount++;
      }

      after = comments?.data?.after || undefined;
      if (!after) break;
      await sleep(2000);
    }
    getLogger().info("Reddit", "@%s (public): %d comments saved", username, commentCount);

    await updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      user_id: pdata.id || username,
      error_message: null,
    });

    getLogger().info("Reddit", "Fetch complete for @%s (public)", username);
    return { posts: postCount, comments: commentCount };
  } catch (e: any) {
    await updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: e.message || "Reddit public fetch failed",
    });
    getLogger().error("Reddit", "Fetch failed for @%s (public): %s", username, e.message);
    throw e;
  } finally {
    runningRedditAccounts.delete(account.id);
  }
}
