import { describe, expect, it } from "vitest";
import { buildPulse, metricDelta } from "../lib/pulse";

const generatedAt = "2026-08-21T12:00:00.000Z";

describe("pulse aggregation", () => {
  it("calculates signed metric deltas", () => {
    expect(metricDelta(120, 100)).toEqual({ current: 120, previous: 100, change: 20 });
    expect(metricDelta(80, 100)).toEqual({ current: 80, previous: 100, change: -20 });
  });

  it("builds cross-platform totals without mixing platform metrics into rankings", () => {
    const pulse = buildPulse({
      generatedAt,
      days: 7,
      accounts: [
        { id: 1, screen_name: "alice", platform: "twitter", instance_url: null },
        { id: 2, screen_name: "bob", platform: "github", instance_url: null },
        { id: 3, screen_name: "carol", platform: "reddit", instance_url: null },
        { id: 4, screen_name: "dave", platform: "gitlab", instance_url: null },
      ],
      audience: {
        twitter: {
          current: [{ account_id: 1, value: 1_200 }],
          previous: [{ account_id: 1, value: 1_150 }],
        },
        github: {
          current: [{ account_id: 2, value: 300 }],
          previous: [{ account_id: 2, value: 280 }],
        },
        reddit: {
          current: [{ account_id: 3, value: 1_800 }],
          previous: [{ account_id: 3, value: 1_700 }],
        },
        gitlab: {
          current: [{ account_id: 4, value: 500 }],
          previous: [],
        },
      },
      activity: {
        tweets: { current: 8, previous: 5 },
        redditPosts: { current: 4, previous: 3 },
        redditComments: { current: 6, previous: 2 },
        githubContributions: { current: 0, previous: 0 },
        gitlabContributions: { current: 0, previous: 0 },
      },
      tweets: [{
        id: "tweet-1", account_id: 1, accountName: "alice", full_text: "Hello",
        created_at: "2026-08-20T00:00:00.000Z", favorite_count: 12,
        retweet_count: 3, reply_count: 1,
      }],
      redditPosts: [],
      redditComments: [],
      repositories: [
        {
          account_id: 2, platform: "github", externalId: 10, accountName: "bob",
          name: "flat", fullName: "bob/flat", description: null,
          stars: 50, forks: 4, baselineStars: 50, baselineForks: 4, url: "https://github.com/bob/flat",
        },
        {
          account_id: 2, platform: "github", externalId: 11, accountName: "bob",
          name: "rising", fullName: "bob/rising", description: "Fast growing",
          stars: 130, forks: 20, baselineStars: 110, baselineForks: 15, url: "https://github.com/bob/rising",
        },
      ],
    });

    expect(pulse.range).toEqual({
      days: 7,
      since: "2026-08-14T12:00:00.000Z",
      until: generatedAt,
    });
    expect(pulse.totals.activity).toEqual({ current: 18, previous: 10, change: 8 });
    expect(pulse.totals.traction.stars).toEqual({ current: 180, previous: 160, change: 20 });
    expect(pulse.platforms.map((platform) => platform.platform)).toEqual([
      "twitter",
      "github",
      "gitlab",
      "reddit",
    ]);
    expect(pulse.platforms[0].audience).toEqual({ current: 1_200, previous: 1_150, change: 50 });
    expect(pulse.platforms[2].audience).toEqual({ current: 0, previous: 0, change: 0 });
    expect(pulse.repositories).toHaveLength(1);
    expect(pulse.repositories[0]).toMatchObject({
      name: "rising",
      starChange: 20,
      route: "/github/2/repos/11",
    });
    expect(pulse.content.tweets[0]).toMatchObject({
      title: "Hello",
      metricValue: 12,
      url: "https://x.com/alice/status/tweet-1",
    });
  });
});
