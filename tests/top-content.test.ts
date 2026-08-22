import { describe, expect, it } from "vitest";
import { buildTopContent } from "../lib/top-content";

const generatedAt = "2026-08-22T12:00:00.000Z";
const baseInput = {
  generatedAt,
  days: 7,
  tweets: [],
  redditPosts: [],
  redditComments: [],
  releases: [],
  repositories: [],
};

describe("top content aggregation", () => {
  it("returns empty items when no content is provided", () => {
    const result = buildTopContent(baseInput);
    expect(result.items).toHaveLength(0);
    expect(result.range.days).toBe(7);
  });

  it("filters out content created before the window", () => {
    const result = buildTopContent({
      ...baseInput,
      tweets: [{
        id: "old", account_id: 1, accountName: "alice",
        full_text: "Too old", created_at: "2026-08-01T00:00:00.000Z",
        favorite_count: 999, retweet_count: 0, reply_count: 0,
      }],
    });
    expect(result.items).toHaveLength(0);
  });

  it("includes tweets within the window with engagement as metric", () => {
    const result = buildTopContent({
      ...baseInput,
      tweets: [{
        id: "t1", account_id: 1, accountName: "alice",
        full_text: "Hello", created_at: "2026-08-20T00:00:00.000Z",
        favorite_count: 10, retweet_count: 3, reply_count: 2,
      }],
    });
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.kind).toBe("tweet");
    expect(item.platform).toBe("twitter");
    expect(item.metricValue).toBe(15);
    expect(item.growthRate).toBeNull();
    expect(item.url).toBe("https://x.com/alice/status/t1");
  });

  it("includes reddit posts and comments with score as metric", () => {
    const result = buildTopContent({
      ...baseInput,
      redditPosts: [{
        id: "p1", account_id: 4, accountName: "bob",
        title: "Great post", subreddit: "dev",
        score: 42, num_comments: 8, permalink: "/r/dev/comments/p1",
        created_utc: Math.floor(Date.parse("2026-08-20T00:00:00.000Z") / 1000),
      }],
      redditComments: [{
        id: "c1", account_id: 4, accountName: "bob",
        body: "Nice", subreddit: "dev", score: 15,
        permalink: "/r/dev/comments/c1",
        created_utc: Math.floor(Date.parse("2026-08-21T00:00:00.000Z") / 1000),
      }],
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].kind).toBe("reddit_post");
    expect(result.items[0].metricValue).toBe(42);
    expect(result.items[0].secondaryValue).toBe(8);
    expect(result.items[1].kind).toBe("reddit_comment");
  });

  it("includes releases published in the window with download counts", () => {
    const result = buildTopContent({
      ...baseInput,
      releases: [{
        id: "gh-rel-1", platform: "github" as const, accountId: 2,
        accountName: "charlie", repoOrProjectId: 100, repoName: "my-repo",
        tagName: "v1.0", title: "First release",
        publishedAt: "2026-08-19T00:00:00.000Z",
        totalDownloads: 1200, htmlUrl: "https://github.com/charlie/my-repo/releases/v1.0",
      }],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].kind).toBe("release");
    expect(result.items[0].metricLabel).toBe("downloads");
    expect(result.items[0].metricValue).toBe(1200);
  });

  it("includes repo growth with star delta and growth rate from baselines", () => {
    const result = buildTopContent({
      ...baseInput,
      repositories: [{
        platform: "github" as const, accountId: 2, externalId: 10,
        accountName: "charlie", name: "rising", fullName: "charlie/rising",
        stars: 150, forks: 20, baselineStars: 100, baselineForks: 15,
        url: "https://github.com/charlie/rising",
      }, {
        platform: "github" as const, accountId: 2, externalId: 11,
        accountName: "charlie", name: "flat", fullName: "charlie/flat",
        stars: 50, forks: 4, baselineStars: 50, baselineForks: 4,
        url: "https://github.com/charlie/flat",
      }],
    });
    // Flat repo (no change) is excluded.
    expect(result.items).toHaveLength(1);
    const item = result.items[0];
    expect(item.kind).toBe("repo_growth");
    expect(item.metricValue).toBe(50);
    expect(item.secondaryValue).toBe(5);
    expect(item.growthRate).toBe(50);
  });

  it("sorts items by metric value descending across kinds", () => {
    const result = buildTopContent({
      ...baseInput,
      tweets: [{
        id: "t1", account_id: 1, accountName: "a", full_text: "Low",
        created_at: "2026-08-21T00:00:00.000Z",
        favorite_count: 5, retweet_count: 0, reply_count: 0,
      }],
      redditPosts: [{
        id: "p1", account_id: 4, accountName: "b", title: "High",
        subreddit: "dev", score: 500, num_comments: 10,
        permalink: "/r/dev/p1", created_utc: Math.floor(Date.parse("2026-08-20T00:00:00.000Z") / 1000),
      }],
    });
    expect(result.items[0].id).toBe("reddit_post:p1");
    expect(result.items[1].id).toBe("tweet:t1");
  });
});
