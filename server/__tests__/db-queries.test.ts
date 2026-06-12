import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { resetTestDb, getTestPool, closeTestPool } from "./setup";
import * as usersQ from "../repositories/users";
import * as accountsQ from "../repositories/accounts";
import * as twitterQ from "../repositories/twitter";
import * as redditQ from "../repositories/reddit";
import * as githubQ from "../repositories/github";
import * as gitlabQ from "../repositories/gitlab";

beforeAll(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await closeTestPool();
});

describe("users queries", () => {
  const testUsername = `testuser_${Date.now()}`;

  it("creates a user", async () => {
    const user = await usersQ.insertUser({ username: testUsername, password_hash: "hash123", role: "user" });
    expect(user).toBeDefined();
    expect(user.username).toBe(testUsername);
    expect(user.role).toBe("user");
    expect(user.id).toBeGreaterThan(0);
  });

  it("finds user by username", async () => {
    const user = await usersQ.getUserByUsername(testUsername);
    expect(user).toBeDefined();
    expect(user!.username).toBe(testUsername);
  });

  it("lists all users", async () => {
    const list = await usersQ.getUsers();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some(u => u.username === testUsername)).toBe(true);
  });

  it("soft-deletes a user", async () => {
    const user = (await usersQ.getUserByUsername(testUsername))!;
    await usersQ.deleteUser(user.id);
    const deleted = await usersQ.getUserByUsername(testUsername);
    expect(deleted).toBeUndefined();
  });

  it("revives soft-deleted user on re-creation", async () => {
    const revived = await usersQ.insertUser({ username: testUsername, password_hash: "revived", role: "user" });
    expect(revived).toBeDefined();
    expect(revived.username).toBe(testUsername);
  });
});

describe("accounts queries", () => {
  let userId: number;
  let accountId: number;

  beforeAll(async () => {
    const u = await usersQ.insertUser({ username: `acct_owner_${Date.now()}`, password_hash: "pass", role: "user" });
    userId = u.id;
  });

  it("creates an account", async () => {
    const pool = getTestPool();
    const { rows } = await pool.query(
      "INSERT INTO accounts (owner_id, screen_name, platform, auth_token, fetch_interval) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [userId, "test_twitter", "twitter", "token123", 30]
    );
    expect(rows[0].screen_name).toBe("test_twitter");
    accountId = rows[0].id;
  });

  it("lists accounts for owner", async () => {
    const accounts = await accountsQ.getAccounts(userId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
  });

  it("gets account by id", async () => {
    const account = await accountsQ.getAccountById(accountId);
    expect(account).toBeDefined();
  });

  it("soft-deletes an account", async () => {
    await accountsQ.deleteAccount(accountId);
    const account = await accountsQ.getAccountById(accountId);
    expect(account).toBeDefined();
  });
});

describe("twitter queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.insertUser({ username: `twitter_user_${Date.now()}`, password_hash: "pass", role: "user" });
    const pool = getTestPool();
    const { rows } = await pool.query(
      "INSERT INTO accounts (owner_id, screen_name, platform, auth_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [u.id, "tweet_test", "twitter", "tok"]
    );
    acctId = rows[0].id;
  });

  it("inserts user stats", async () => {
    await twitterQ.insertUserStats({ account_id: acctId, followers_count: 100, following_count: 50, tweet_count: 200 });
    const latest = await twitterQ.getLatestUserStats(acctId);
    expect(latest).toBeDefined();
    expect(latest!.followers_count).toBe(100);
  });

  it("upserts and retrieves a tweet", async () => {
    await twitterQ.upsertTweet({
      id: "999",
      account_id: acctId,
      full_text: "Hello test",
      created_at: "2024-01-01T00:00:00Z",
      favorite_count: 10,
      retweet_count: 5,
      reply_count: 2,
      view_count: 100,
      bookmark_count: 1,
      is_quote: 0,
      is_reply: 0,
      is_retweet: 0,
      media_urls: "[]",
      urls: "[]",
      hashtags: "[]",
      mentions: "[]",
      lang: "en",
    });

    const result = await twitterQ.getTweets(1, 10, "created_at", "desc", undefined, [acctId]);
    expect(result.data.length).toBe(1);
    expect(result.data[0].full_text).toBe("Hello test");
  });
});

describe("reddit queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.insertUser({ username: `reddit_user_${Date.now()}`, password_hash: "pass", role: "user" });
    const pool = getTestPool();
    const { rows } = await pool.query(
      "INSERT INTO accounts (owner_id, screen_name, platform, auth_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [u.id, "reddit_test", "reddit", "tok"]
    );
    acctId = rows[0].id;
  });

  it("inserts stats and gets overview", async () => {
    await redditQ.insertRedditStats({ account_id: acctId, post_karma: 500, comment_karma: 300 });
    const overview = await redditQ.getRedditOverview(acctId);
    expect(overview).toBeDefined();
  });

  it("upserts a post", async () => {
    await redditQ.upsertRedditPost({
      id: "post_1", account_id: acctId, title: "Test Post", selftext: "",
      subreddit: "test", score: 42, upvote_ratio: 0.9, num_comments: 10,
      permalink: "/r/test/123/", url: "", is_self: 1, created_utc: 1700000000,
    });
    const result = await redditQ.getRedditPosts(acctId, 1, 20);
    expect(result.data.length).toBe(1);
    expect(result.data[0].title).toBe("Test Post");
  });

  it("upserts a comment", async () => {
    await redditQ.upsertRedditComment({
      id: "comment_1", account_id: acctId, body: "Nice post!", subreddit: "test",
      score: 5, link_id: "t3_post_1", parent_id: "t3_post_1", depth: 1,
      permalink: "/r/test/123/c/", created_utc: 1700000001, is_submitter: 0,
    });
    const result = await redditQ.getRedditComments(acctId, 1, 20);
    expect(result.data.length).toBe(1);
    expect(result.data[0].body).toBe("Nice post!");
  });
});

describe("github queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.insertUser({ username: `gh_user_${Date.now()}`, password_hash: "pass", role: "user" });
    const pool = getTestPool();
    const { rows } = await pool.query(
      "INSERT INTO accounts (owner_id, screen_name, platform, auth_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [u.id, "gh_test", "github", "tok"]
    );
    acctId = rows[0].id;
  });

  it("inserts stats and gets overview", async () => {
    await githubQ.insertGithubStats({ account_id: acctId, public_repos: 10, public_gists: 5, followers: 20, following: 8 });
    const overview = await githubQ.getGithubOverview(acctId);
    expect(overview).toBeDefined();
  });

  it("upserts a contribution", async () => {
    await githubQ.upsertGithubContribution({ account_id: acctId, date: "2024-01-01", count: 5, level: 2 });
    const contribs = await githubQ.getGithubContributions(acctId);
    expect(contribs.length).toBe(1);
    expect(contribs[0].count).toBe(5);
  });
});

describe("gitlab queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.insertUser({ username: `gl_user_${Date.now()}`, password_hash: "pass", role: "user" });
    const pool = getTestPool();
    const { rows } = await pool.query(
      "INSERT INTO accounts (owner_id, screen_name, platform, auth_token) VALUES ($1, $2, $3, $4) RETURNING *",
      [u.id, "gl_test", "gitlab", "tok"]
    );
    acctId = rows[0].id;
  });

  it("inserts stats and gets overview", async () => {
    await gitlabQ.insertGitlabStats({ account_id: acctId, public_projects: 5, followers: 10, following: 3 });
    const overview = await gitlabQ.getGitlabOverview(acctId);
    expect(overview).toBeDefined();
  });

  it("upserts a contribution", async () => {
    await gitlabQ.upsertGitlabContribution({ account_id: acctId, date: "2024-01-01", count: 3 });
    const contribs = await gitlabQ.getGitlabContributions(acctId);
    expect(contribs.length).toBe(1);
    expect(contribs[0].count).toBe(3);
  });
});
