import type { AccountRow } from "../db";
import { insertRedditStats, upsertRedditPost, upsertRedditComment } from "../db";

function getProxyUrl(): string | undefined {
  return process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy;
}

async function getRedditAccessToken(refreshToken: string): Promise<string> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET must be set in environment");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const proxy = getProxyUrl();
  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "dashboard/1.0",
    },
    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
    proxy,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Reddit OAuth error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as any;
  return data.access_token;
}

async function redditFetch(path: string, token: string): Promise<any> {
  const proxy = getProxyUrl();
  const res = await fetch(`https://oauth.reddit.com${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "dashboard/1.0",
    },
    proxy,
  });
  if (!res.ok) {
    throw new Error(`Reddit API ${res.status} for ${path}`);
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRedditAccount(account: AccountRow) {
  const refreshToken = account.auth_token;
  const username = account.screen_name;

  try {
    console.log(`[Reddit] Fetching @${username}...`);

    // 1. Get access token
    const accessToken = await getRedditAccessToken(refreshToken);

    // 2. Fetch user profile
    const profile = await redditFetch(`/user/${username}/about`, accessToken);
    if (!profile?.data?.name) {
      throw new Error("Invalid Reddit user profile");
    }

    const pdata = profile.data;
    insertRedditStats({
      account_id: account.id,
      post_karma: pdata.link_karma ?? 0,
      comment_karma: pdata.comment_karma ?? 0,
    });
    console.log(`[Reddit] @${username}: karma recorded (post=${pdata.link_karma}, comment=${pdata.comment_karma})`);

    // 3. Fetch posts
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
        upsertRedditPost({
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
    console.log(`[Reddit] @${username}: ${postCount} posts fetched`);

    // 4. Fetch comments
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
        upsertRedditComment({
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
    console.log(`[Reddit] @${username}: ${commentCount} comments fetched`);

    // Success
    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      user_id: pdata.id || username,
      error_message: null,
    });

    console.log(`[Reddit] Fetch complete for @${username}`);
    return { posts: postCount, comments: commentCount };
  } catch (e: any) {
    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: e.message || "Reddit fetch failed",
    });
    console.error(`[Reddit] Fetch failed for @${username}:`, e.message);
    throw e;
  }
}

// ── Public (cookie-based) fetcher ──────────────────────────────
// Uses the loid cookie to access Reddit's JSON API without OAuth.
// The auth_token field stores the loid cookie value (from browser dev tools).
// This works because Reddit allows unauthenticated JSON access when a
// valid loid cookie is present. OAuth is NOT required for basic profile data.

async function redditPublicFetch(path: string, loid: string): Promise<any> {
  const proxy = getProxyUrl();
  const res = await fetch(`https://old.reddit.com${path}`, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "application/json",
      "Cookie": `loid=${loid}`,
    },
    proxy,
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Reddit rejected the request (403). Your loid cookie may have expired. Get a new one from your browser's dev tools (Application > Cookies > loid).");
    }
    throw new Error(`Reddit public API ${res.status} for ${path}`);
  }
  return res.json();
}

export async function fetchRedditPublicAccount(account: AccountRow) {
  const loid = account.auth_token;
  const username = account.screen_name;

  try {
    console.log(`[Reddit Public] Fetching @${username}...`);

    // 1. Fetch public profile
    const profile = await redditPublicFetch(`/user/${username}/about.json`, loid);
    if (!profile?.data?.name) {
      throw new Error("Invalid Reddit user profile — user may not exist");
    }

    const pdata = profile.data;
    insertRedditStats({
      account_id: account.id,
      post_karma: pdata.link_karma ?? 0,
      comment_karma: pdata.comment_karma ?? 0,
    });
    console.log(`[Reddit Public] @${username}: karma recorded (post=${pdata.link_karma}, comment=${pdata.comment_karma})`);

    // 2. Fetch posts
    let postCount = 0;
    let after: string | undefined;
    while (postCount < 50) {
      const path = `/user/${username}/submitted.json?limit=25&sort=new${after ? `&after=${after}` : ""}`;
      const posts = await redditPublicFetch(path, loid);
      const children = posts?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const p = child.data;
        if (!p?.id) continue;
        upsertRedditPost({
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
    console.log(`[Reddit Public] @${username}: ${postCount} posts fetched`);

    // 3. Fetch comments
    let commentCount = 0;
    after = undefined;
    while (commentCount < 50) {
      const path = `/user/${username}/comments.json?limit=25&sort=new${after ? `&after=${after}` : ""}`;
      const comments = await redditPublicFetch(path, loid);
      const children = comments?.data?.children ?? [];
      if (children.length === 0) break;

      for (const child of children) {
        const c = child.data;
        if (!c?.id) continue;
        upsertRedditComment({
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
    console.log(`[Reddit Public] @${username}: ${commentCount} comments fetched`);

    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      user_id: pdata.id || username,
      error_message: null,
    });

    console.log(`[Reddit Public] Fetch complete for @${username}`);
    return { posts: postCount, comments: commentCount };
  } catch (e: any) {
    const { updateAccount } = await import("../db");
    updateAccount(account.id, {
      last_fetched_at: new Date().toISOString(),
      error_message: e.message || "Reddit public fetch failed",
    });
    console.error(`[Reddit Public] Fetch failed for @${username}:`, e.message);
    throw e;
  }
}
