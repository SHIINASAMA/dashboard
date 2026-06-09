import { describe, it, expect, beforeAll } from "bun:test";
import { password } from "bun";
import { setupTestDb } from "./setup";
import * as usersQ from "../db/queries/users";
import * as accountsQ from "../db/queries/accounts";
import * as twitterQ from "../db/queries/twitter";
import * as redditQ from "../db/queries/reddit";
import * as githubQ from "../db/queries/github";
import * as gitlabQ from "../db/queries/gitlab";

beforeAll(async () => {
  await setupTestDb();
});

describe("users queries", () => {
  const testUsername = `testuser_${Date.now()}`;

  it("creates a user", async () => {
    const user = await usersQ.createUser(testUsername, "testpass123", "user");
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

  it("updates user password", async () => {
    await usersQ.updateUserPassword(
      (await usersQ.getUserByUsername(testUsername))!.id,
      "newpass456"
    );
    const user = await usersQ.getUserByUsername(testUsername);
    const ok = await password.verify("newpass456", user!.password_hash);
    expect(ok).toBe(true);
  });

  it("soft-deletes a user", async () => {
    const user = (await usersQ.getUserByUsername(testUsername))!;
    expect(user.deleted_at).toBeNull();

    await usersQ.deleteUser(user.id);

    const deleted = await usersQ.getUserByUsername(testUsername);
    expect(deleted).toBeUndefined();

    const list = await usersQ.getUsers();
    expect(list.some(u => u.username === testUsername)).toBe(false);
  });

  it("revives soft-deleted user on re-creation", async () => {
    const revived = await usersQ.createUser(testUsername, "revived", "user");
    expect(revived).toBeDefined();
    expect(revived.username).toBe(testUsername);
    expect(revived.deleted_at).toBeNull();
  });
});

describe("accounts queries", () => {
  let userId: number;
  let accountId: number;

  beforeAll(async () => {
    const u = await usersQ.createUser(`acct_owner_${Date.now()}`, "pass", "user");
    userId = u.id;
  });

  it("creates an account", async () => {
    const account = await accountsQ.createAccount("test_twitter", "token123", 30, "twitter", null, null, userId);
    expect(account).toBeDefined();
    expect(account.screen_name).toBe("test_twitter");
    expect(account.platform).toBe("twitter");
    accountId = account.id;
  });

  it("lists accounts for owner", async () => {
    const accounts = await accountsQ.getAccounts(userId);
    expect(accounts.length).toBeGreaterThanOrEqual(1);
    expect(accounts.some(a => a.id === accountId)).toBe(true);
  });

  it("gets account by id", async () => {
    const account = await accountsQ.getAccountById(accountId);
    expect(account).toBeDefined();
    expect(account!.id).toBe(accountId);
  });

  it("updates an account", async () => {
    await accountsQ.updateAccount(accountId, { screen_name: "renamed" } as any);
    const account = await accountsQ.getAccountById(accountId);
    expect(account!.screen_name).toBe("renamed");
  });

  it("soft-deletes an account", async () => {
    await accountsQ.deleteAccount(accountId);
    const account = await accountsQ.getAccountById(accountId);
    expect(account!.deleted_at).not.toBeNull();

    const accounts = await accountsQ.getAccounts(userId);
    expect(accounts.some(a => a.id === accountId)).toBe(false);
  });
});

describe("twitter queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.createUser(`twitter_user_${Date.now()}`, "pass", "user");
    const acct = await accountsQ.createAccount("tweet_test", "tok", 30, "twitter", null, null, u.id);
    acctId = acct.id;
  });

  it("inserts user stats", async () => {
    await twitterQ.insertUserStats({ account_id: acctId, followers_count: 100, following_count: 50, tweet_count: 200, listed_count: 0 });
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
    expect(result.total).toBe(1);
  });

  it("gets overview stats", async () => {
    const stats = await twitterQ.getOverviewStats(acctId);
    expect(stats).toBeDefined();
  });
});

describe("reddit queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.createUser(`reddit_user_${Date.now()}`, "pass", "user");
    const acct = await accountsQ.createAccount("reddit_test", "tok", 30, "reddit", null, null, u.id);
    acctId = acct.id;
  });

  it("inserts and retrieves stats", async () => {
    await redditQ.insertRedditStats({ account_id: acctId, post_karma: 500, comment_karma: 300 });
    const overview = await redditQ.getRedditOverview(acctId);
    expect(overview).toBeDefined();
  });

  it("upserts a post", async () => {
    await redditQ.upsertRedditPost({
      id: "post_1",
      account_id: acctId,
      title: "Test Post",
      selftext: "",
      subreddit: "test",
      score: 42,
      upvote_ratio: 0.9,
      num_comments: 10,
      permalink: "/r/test/123/",
      url: "",
      is_self: 1,
      created_utc: 1700000000,
    });

    const result = await redditQ.getRedditPosts(acctId, 1, 20);
    expect(result.data.length).toBe(1);
    expect(result.data[0].title).toBe("Test Post");
  });

  it("upserts a comment", async () => {
    await redditQ.upsertRedditComment({
      id: "comment_1",
      account_id: acctId,
      body: "Nice post!",
      subreddit: "test",
      score: 5,
      link_id: "t3_post_1",
      parent_id: "t3_post_1",
      depth: 1,
      permalink: "/r/test/123/c/",
      created_utc: 1700000001,
      is_submitter: 0,
    });

    const result = await redditQ.getRedditComments(acctId, 1, 20);
    expect(result.data.length).toBe(1);
    expect(result.data[0].body).toBe("Nice post!");
  });
});

describe("github queries", () => {
  let acctId: number;

  beforeAll(async () => {
    const u = await usersQ.createUser(`gh_user_${Date.now()}`, "pass", "user");
    const acct = await accountsQ.createAccount("gh_test", "tok", 30, "github", null, null, u.id);
    acctId = acct.id;
  });

  it("inserts and retrieves stats", async () => {
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
    const u = await usersQ.createUser(`gl_user_${Date.now()}`, "pass", "user");
    const acct = await accountsQ.createAccount("gl_test", "tok", 30, "gitlab", null, null, u.id);
    acctId = acct.id;
  });

  it("inserts and retrieves stats", async () => {
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
