// @ts-nocheck
// ─────────────────────────────────────────────────────────────────────────
// Mock / debug fixtures.
//
// Served by the repositories/services when isMockMode() is true, so the entire
// frontend renders without a PostgreSQL backend. Shapes mirror the return
// values the UI consumes (see shared/types.ts and lib/repositories/*).
// Keep these in sync with the real types; re-run `pnpm tsc` after type edits.
// ─────────────────────────────────────────────────────────────────────────

import { isMockMode } from "../config";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function dayOfYear(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function range(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

// ── Accounts ──────────────────────────────────────────────────────
// ids are stable and referenced by the platform overview fixtures.
export const accounts = [
  { id: 1, owner_id: 1, screen_name: "mockuser", platform: "twitter", user_id: "12345", auth_token: "", fetch_interval: 30, is_active: 1, last_fetched_at: isoDaysAgo(0), error_message: null, instance_url: null, auth_type: null, created_at: isoDaysAgo(120), updated_at: isoDaysAgo(1) },
  { id: 2, owner_id: 1, screen_name: "mockuser", platform: "github", user_id: "67890", auth_token: "", fetch_interval: 60, is_active: 1, last_fetched_at: isoDaysAgo(0), error_message: null, instance_url: null, auth_type: null, created_at: isoDaysAgo(120), updated_at: isoDaysAgo(1) },
  { id: 3, owner_id: 1, screen_name: "mockuser", platform: "gitlab", user_id: "11111", auth_token: "", fetch_interval: 60, is_active: 1, last_fetched_at: isoDaysAgo(0), error_message: null, instance_url: "https://gitlab.com", auth_type: null, created_at: isoDaysAgo(120), updated_at: isoDaysAgo(1) },
  { id: 4, owner_id: 1, screen_name: "mockuser", platform: "reddit", user_id: "t2_abc", auth_token: "", fetch_interval: 30, is_active: 1, last_fetched_at: isoDaysAgo(0), error_message: null, instance_url: null, auth_type: null, created_at: isoDaysAgo(120), updated_at: isoDaysAgo(1) },
];

// ── Twitter / X ───────────────────────────────────────────────────

export const overviewStats = {
  tweet_count: 1280, tweet_likes: 24500, tweet_retweets: 3100, tweet_views: 980000,
  reply_count: 540, reply_likes: 8200, reply_retweets: 900, reply_views: 120000,
  followersCount: 34200, followingCount: 410, userTweetCount: 1820,
  todayLikes: 320, todayRetweets: 45, todayTweets: 3,
};

export const tweets = range(40).map((i) => {
  const n = i + 1;
  return {
    id: `18${1000000000000000 + n}`, account_id: 1,
    full_text: `Mock tweet #${n} — building dashboards and chasing latency. #dev #dashboard`,
    created_at: isoDaysAgo(n),
    favorite_count: 50 + (n * 7) % 400, retweet_count: 5 + (n * 3) % 80, reply_count: (n * 2) % 30,
    view_count: 1000 + (n * 123) % 50000, bookmark_count: (n * 5) % 60,
    is_quote: n % 5 === 0 ? 1 : 0, is_reply: n % 3 === 0 ? 1 : 0, is_retweet: 0,
    media_urls: "[]", urls: "[]", hashtags: '["dev","dashboard"]', mentions: "[]", lang: "en",
  };
});

export const timelineData = {
  dailyTweets: range(30).map((i) => ({
    date: daysAgo(29 - i), tweets_count: 1 + (i % 5),
    total_likes: 100 + (i * 13) % 900, total_retweets: 10 + (i * 5) % 200,
    total_replies: 5 + (i * 3) % 80, total_views: 2000 + (i * 211) % 40000,
  })),
  followerGrowth: range(30).map((i) => ({
    date: daysAgo(29 - i), followers_count: 30000 + i * 40, following_count: 400 + (i % 7), tweet_count: 1500 + i * 5,
  })),
};

export const calendarData = range(120).map((i) => ({ date: dayOfYear(119 - i), count: (i * 3) % 9 }));

export const topTweets = [...tweets].sort((a, b) => b.favorite_count - a.favorite_count).slice(0, 10);

export const latestUserStats = { account_id: 1, followers_count: 34200, following_count: 410, tweet_count: 1820, listed_count: 12, recorded_at: isoDaysAgo(0) };

// ── GitHub ────────────────────────────────────────────────────────

const languages = ["TypeScript", "Rust", "Go", "Python", "CSS", "Shell"];
export const githubRepos = range(12).map((i) => {
  const n = i + 1;
  const stars = 500 - i * 30 + (i % 3) * 50;
  return {
    id: n, account_id: 2, repo_id: 1000 + n, name: `repo-${n}`, full_name: `mockuser/repo-${n}`,
    description: `Mock repository #${n} — ${languages[i % languages.length]} project`,
    language: languages[i % languages.length], stars: Math.max(stars, 12), forks: Math.round(stars / 8),
    open_issues: (i * 3) % 20, topics: JSON.stringify(["mock", "demo"]),
    homepage: i % 2 ? "https://example.com" : null, is_fork: i % 4 === 0 ? 1 : 0, pinned: i < 3 ? 1 : 0,
    created_at: isoDaysAgo(200 - i * 10),
  };
});

const githubLanguages = githubRepos.reduce<Record<string, number>>((acc, r) => {
  if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
  return acc;
}, {});
const githubTotalStars = githubRepos.reduce((s, r) => s + r.stars, 0);
const githubTotalForks = githubRepos.reduce((s, r) => s + r.forks, 0);
const githubTopRepos = [...githubRepos].sort((a, b) => b.stars - a.stars).slice(0, 10);

export const githubOverview = {
  stats: { public_repos: 42, public_gists: 8, followers: 1200, following: 90 },
  repos: githubRepos.filter((r) => r.pinned).length ? githubRepos.filter((r) => r.pinned) : githubRepos,
  allRepos: githubRepos, totalStars: githubTotalStars, totalForks: githubTotalForks,
  totalRepos: githubRepos.length, languages: githubLanguages, topRepos: githubTopRepos,
};

export const githubTimeline = range(30).map((i) => ({
  date: daysAgo(29 - i), public_repos: 42, followers: 1200 + i * 5, following: 90 + (i % 4),
}));

export const githubContributions = range(365).map((i) => {
  const count = (i * 7) % 13;
  const level = count === 0 ? 0 : count < 4 ? 1 : count < 8 ? 2 : count < 11 ? 3 : 4;
  return { date: dayOfYear(364 - i), count, level };
});

export const githubSnapshots = range(30).map((i) => ({
  date: daysAgo(29 - i), stars: githubTotalStars - i * 2, forks: githubTotalForks - i, open_issues: 30 + i,
}));

export const githubClones = range(30).map((i) => ({ date: daysAgo(29 - i), count: (i * 11) % 90, uniques: (i * 5) % 40 }));
export const githubViews = range(30).map((i) => ({ date: daysAgo(29 - i), count: (i * 17) % 200, uniques: (i * 7) % 80 }));

export const githubReferrers = [
  { snapshot_date: daysAgo(0), referrer: "github.com", count: 1200, uniques: 900 },
  { snapshot_date: daysAgo(0), referrer: "google.com", count: 540, uniques: 480 },
  { snapshot_date: daysAgo(0), referrer: "twitter.com", count: 210, uniques: 190 },
  { snapshot_date: daysAgo(0), referrer: "news.ycombinator.com", count: 88, uniques: 84 },
];
export const githubReferrerHistory = range(14).map((i) => ({ snapshot_date: daysAgo(13 - i), referrer: "github.com", count: 1100 + i * 10, uniques: 850 + i * 5 }));

export const githubPaths = [
  { snapshot_date: daysAgo(0), path: "/", title: "Home", count: 3000, uniques: 2100 },
  { snapshot_date: daysAgo(0), path: "/README.md", title: "README", count: 800, uniques: 720 },
  { snapshot_date: daysAgo(0), path: "/docs/setup", title: "Setup", count: 250, uniques: 230 },
];
export const githubPathHistory = range(14).map((i) => ({ snapshot_date: daysAgo(13 - i), path: "/", title: "Home", count: 2900 + i * 10, uniques: 2000 + i * 5 }));

export const githubReleases = range(3).map((i) => {
  const n = i + 1;
  return {
    id: n, account_id: 2, repo_id: 1001, release_id: 5000 + n,
    tag_name: `v1.${n}.0`, name: `Release ${n}`, body: `Mock release notes for v1.${n}.0`,
    prerelease: 0, published_at: isoDaysAgo(n * 10), html_url: "https://github.com/mockuser/repo-1/releases/tag/v1.0.0",
    total_downloads: 1200 - i * 200, fetched_at: isoDaysAgo(i * 10),
    assets: [
      { id: n * 10 + 1, release_id: n, name: `app-v1.${n}.0-linux.zip`, download_count: 600 - i * 100, size: 12_400_000, content_type: "application/zip", browser_download_url: "https://example.com/app.zip" },
      { id: n * 10 + 2, release_id: n, name: `app-v1.${n}.0-macos.zip`, download_count: 400 - i * 80, size: 13_100_000, content_type: "application/zip", browser_download_url: "https://example.com/app-mac.zip" },
    ],
  };
});
export const githubReleaseAssets = githubReleases[0].assets;

// ── GitLab ────────────────────────────────────────────────────────

export const gitlabProjects = range(8).map((i) => {
  const n = i + 1;
  const stars = 300 - i * 25 + (i % 3) * 30;
  return {
    id: n, account_id: 3, project_id: 2000 + n, name: `gl-project-${n}`, path_with_namespace: `mockuser/gl-project-${n}`,
    description: `Mock GitLab project #${n}`, language: languages[i % languages.length], stars: Math.max(stars, 8),
    forks: Math.round(stars / 6), open_issues: (i * 2) % 15, topics: JSON.stringify(["mock"]),
    homepage: null, is_fork: i % 5 === 0 ? 1 : 0, pinned: i < 2 ? 1 : 0, visibility: "public",
    created_at: isoDaysAgo(180 - i * 8), updated_at: isoDaysAgo(i), last_activity_at: isoDaysAgo(i),
  };
});
const gitlabLanguages = gitlabProjects.reduce<Record<string, number>>((acc, r) => {
  if (r.language) acc[r.language] = (acc[r.language] || 0) + 1;
  return acc;
}, {});
const gitlabTotalStars = gitlabProjects.reduce((s, r) => s + r.stars, 0);
const gitlabTotalForks = gitlabProjects.reduce((s, r) => s + r.forks, 0);
const gitlabTopProjects = [...gitlabProjects].sort((a, b) => b.stars - a.stars).slice(0, 10);

export const gitlabOverview = {
  stats: { public_projects: 28, followers: 340, following: 50 },
  projects: gitlabProjects.filter((p) => p.pinned).length ? gitlabProjects.filter((p) => p.pinned) : gitlabProjects,
  allProjects: gitlabProjects, totalStars: gitlabTotalStars, totalForks: gitlabTotalForks,
  totalProjects: gitlabProjects.length, languages: gitlabLanguages, topProjects: gitlabTopProjects,
};

export const gitlabTimeline = range(30).map((i) => ({
  date: daysAgo(29 - i), public_projects: 28, followers: 340 + i * 3, following: 50 + (i % 3),
}));

export const gitlabContributions = range(365).map((i) => {
  const count = (i * 5) % 11;
  return { date: dayOfYear(364 - i), count };
});

export const gitlabSnapshots = range(30).map((i) => ({
  date: daysAgo(29 - i), stars: gitlabTotalStars - i, forks: gitlabTotalForks - i, open_issues: 20 + i,
}));

export const gitlabReleases = range(2).map((i) => {
  const n = i + 1;
  return {
    id: n, account_id: 3, project_id: 2001, release_tag: `v2.${n}.0`, name: `GL Release ${n}`,
    description: `Mock GitLab release ${n}`, released_at: isoDaysAgo(n * 15), created_at: isoDaysAgo(n * 15),
    fetched_at: isoDaysAgo(i * 15),
  };
});

// ── Reddit ────────────────────────────────────────────────────────

export const redditStats = { post_karma: 50000, comment_karma: 12000, recorded_at: isoDaysAgo(0) };

export const redditPosts = range(25).map((i) => {
  const n = i + 1;
  return {
    id: `post_${n}`, account_id: 4, title: `Mock Reddit post #${n} about self-hosting dashboards`,
    selftext: `Body of mock post ${n}.`, subreddit: i % 2 ? "selfhosted" : "programming",
    score: 100 + (n * 13) % 900, upvote_ratio: 0.85 + ((n % 10) / 100), num_comments: (n * 4) % 120,
    permalink: `/r/selfhosted/comments/post_${n}`, url: "https://reddit.com", is_self: 1,
    created_utc: Math.floor(Date.now() / 1000) - n * 86400,
  };
});
export const redditComments = range(25).map((i) => {
  const n = i + 1;
  return {
    id: `comment_${n}`, account_id: 4, body: `Mock comment ${n} — great write-up!`,
    subreddit: i % 2 ? "selfhosted" : "programming", score: 10 + (n * 7) % 300,
    link_id: `post_${(n % 25) + 1}`, parent_id: `post_${(n % 25) + 1}`, depth: n % 4,
    permalink: `/r/programming/comments/comment_${n}`, created_utc: Math.floor(Date.now() / 1000) - n * 43200,
    is_submitter: n % 3 === 0 ? 1 : 0,
  };
});

export const redditOverview = {
  stats: redditStats, totalPosts: redditPosts.length, totalComments: redditComments.length,
  totalScore: redditPosts.reduce((s, p) => s + p.score, 0), topPosts: [...redditPosts].sort((a, b) => b.score - a.score).slice(0, 10),
};

export const redditTimeline = range(30).map((i) => ({
  date: daysAgo(29 - i), post_karma: 50000 - i * 200, comment_karma: 12000 - i * 80,
}));

export const redditActivity = {
  posts: range(30).map((i) => ({ date: daysAgo(29 - i), count: (i * 3) % 12 })),
  comments: range(30).map((i) => ({ date: daysAgo(29 - i), count: (i * 5) % 20 })),
};

export const redditSubreddits = [
  { subreddit: "programming", count: 60 },
  { subreddit: "selfhosted", count: 45 },
  { subreddit: "rust", count: 30 },
  { subreddit: "typescript", count: 22 },
  { subreddit: "devops", count: 14 },
];

// ── Users / settings (admin) ──────────────────────────────────────

export const users = [
  { id: 1, username: "admin", role: "admin", password_hash: "", created_at: isoDaysAgo(200) },
  { id: 2, username: "demo", role: "user", password_hash: "", created_at: isoDaysAgo(90) },
];

export const settings: Record<string, string> = {
  site_name: "Dashboard (Mock)",
  theme: "system",
};

// Re-export so callers can guard on the flag without importing config twice.
export { isMockMode };
