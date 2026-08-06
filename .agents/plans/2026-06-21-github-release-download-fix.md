# GitHub Release Download Count Fix — Per-Asset Statistics

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix inflated GitHub release download counts (update-check files being counted), switch to per-asset statistics with backend filtering + historical backfill + API exposure + frontend expandable table.

**Architecture:** Filter utility → fetcher modification → backfill script → new API → frontend expandable rows. `github_release_assets` table retains all raw data; `total_downloads` only counts filtered assets.

**Tech Stack:** TypeScript, Drizzle ORM, React 19, recharts, shadcn/ui (existing tech stack)

## Global Constraints

- No new dependencies
- Follow existing code style (Drizzle ORM, TypeScript, file naming)
- `github_release_assets` keeps all assets (audit purposes)
- GitLab unaffected (no `total_downloads` field)

---

### Task 1: Create asset filter utility

**Files:**
- Create: `server/utils/release-asset-filter.ts`
- Create: `server/__tests__/release-asset-filter.test.ts`

**Interfaces:**
- Consumes: asset object `{ name, download_count }`
- Produces: `isReleaseAsset(filename)`, `sumFilteredDownloads(assets)`

- [ ] **Step 1: Write the failing test**

```typescript
// server/__tests__/release-asset-filter.test.ts
import { describe, it, expect } from "bun:test";
import { isReleaseAsset, sumFilteredDownloads } from "../utils/release-asset-filter";

describe("isReleaseAsset", () => {
  it("accepts platform installers", () => {
    expect(isReleaseAsset("app-v1.0.dmg")).toBe(true);
    expect(isReleaseAsset("app-v1.0.exe")).toBe(true);
    expect(isReleaseAsset("app-v1.0.msi")).toBe(true);
    expect(isReleaseAsset("app-v1.0.AppImage")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-arm64.tar.xz")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.deb")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.rpm")).toBe(true);
    expect(isReleaseAsset("app-v1.0-linux-amd64.flatpak")).toBe(true);
  });

  it("accepts archives", () => {
    expect(isReleaseAsset("source-v1.0.tar.gz")).toBe(true);
    expect(isReleaseAsset("v1.0.zip")).toBe(true);
    expect(isReleaseAsset("v1.0.tar.zst")).toBe(true);
  });

  it("accepts mobile packages", () => {
    expect(isReleaseAsset("app-v1.0.apk")).toBe(true);
    expect(isReleaseAsset("app-v1.0.ipa")).toBe(true);
  });

  it("rejects update-check files", () => {
    expect(isReleaseAsset("latest.json")).toBe(false);
    expect(isReleaseAsset("latest.yml")).toBe(false);
    expect(isReleaseAsset("latest-mac.yml")).toBe(false);
    expect(isReleaseAsset("latest-linux.json")).toBe(false);
  });

  it("rejects blockmap and nupkg", () => {
    expect(isReleaseAsset("app-v1.0.blockmap")).toBe(false);
    expect(isReleaseAsset("app-1.0.0-full.nupkg")).toBe(false);
  });

  it("rejects non-release files", () => {
    expect(isReleaseAsset("LICENSE")).toBe(false);
    expect(isReleaseAsset("README.md")).toBe(false);
    expect(isReleaseAsset("SHA256SUMS")).toBe(false);
    expect(isReleaseAsset("app-v1.0.dmg.sig")).toBe(false);
  });

  it("handles case insensitivity", () => {
    expect(isReleaseAsset("app-v1.0.DMG")).toBe(true);
    expect(isReleaseAsset("LATEST.YML")).toBe(false);
  });
});

describe("sumFilteredDownloads", () => {
  it("sums only release asset downloads", () => {
    const assets = [
      { name: "app-v1.0.dmg", download_count: 100 },
      { name: "latest.json", download_count: 5000 },
      { name: "latest-mac.yml", download_count: 3000 },
      { name: "app-v1.0.exe", download_count: 200 },
    ];
    expect(sumFilteredDownloads(assets)).toBe(300);
  });

  it("returns 0 for empty array", () => {
    expect(sumFilteredDownloads([])).toBe(0);
  });

  it("returns 0 when all assets are filtered out", () => {
    const assets = [
      { name: "latest.json", download_count: 5000 },
      { name: "latest.yml", download_count: 3000 },
    ];
    expect(sumFilteredDownloads(assets)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test server/__tests__/release-asset-filter.test.ts`
Expected: FAIL

- [ ] **Step 3: Write implementation**

```typescript
// server/utils/release-asset-filter.ts

const RELEASE_EXTENSIONS = new Set([
  // macOS
  ".dmg", ".pkg",
  // Windows
  ".exe", ".msi",
  // Linux
  ".deb", ".rpm", ".appimage", ".flatpak", ".snap",
  // Archives
  ".tar.gz", ".tgz", ".tar.xz", ".tar.bz2", ".tar.zst",
  ".zip", ".rar", ".7z",
  // Mobile
  ".apk", ".aab", ".ipa",
]);

const EXCLUDE_PATTERNS = [
  /^latest[\w-]*\.(json|yml|yaml)$/i,
  /\.blockmap$/,
  /\.nupkg$/,
  /\.sig$/,
  /\.asc$/,
  /^SHA256SUMS$/i,
  /^SHA512SUMS$/i,
  /^MD5SUMS$/i,
];

export function isReleaseAsset(filename: string): boolean {
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(filename)) return false;
  }
  const lower = filename.toLowerCase();
  for (const ext of RELEASE_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

export function sumFilteredDownloads<T extends { name: string; download_count: number }>(
  assets: T[],
): number {
  return assets
    .filter((a) => isReleaseAsset(a.name))
    .reduce((sum, a) => sum + (a.download_count || 0), 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test server/__tests__/release-asset-filter.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/utils/release-asset-filter.ts server/__tests__/release-asset-filter.test.ts
git commit -m "feat: add release asset filtering utility to exclude update-check files from download counts"
```

---

### Task 2: Modify GitHub fetcher to use filtered counts

**Files:**
- Modify: `server/fetchers/github.ts` (line 253 area)

**Interfaces:**
- Consumes: `sumFilteredDownloads` from Task 1
- Produces: corrected `total_downloads` written to `github_releases`

- [ ] **Step 1: Add import and update calculation**

Add import at the top of `server/fetchers/github.ts`:

```typescript
import { sumFilteredDownloads } from "../utils/release-asset-filter.js";
```

Replace the reduce at line 253 with:

```typescript
const totalDownloads = sumFilteredDownloads(
  ((release.assets as Array<Record<string, unknown>>) || []).map((a) => ({
    name: (a.name as string) || "",
    download_count: (a.download_count as number) || 0,
  })),
);
```

- [ ] **Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add server/fetchers/github.ts
git commit -m "fix: filter non-release assets from GitHub release download counts"
```

---

### Task 3: Create historical data backfill script

**Files:**
- Create: `server/scripts/backfill-release-downloads.ts`
- Modify: `package.json` (add script)

**Interfaces:**
- Consumes: GitHub API, database, `sumFilteredDownloads` from Task 1
- Produces: corrected `total_downloads`

- [ ] **Step 1: Write the backfill script**

```typescript
// server/scripts/backfill-release-downloads.ts
/**
 * One-time script: recalculate total_downloads for all existing GitHub releases.
 * Usage: GITHUB_TOKEN=xxx bun run backfill:release-downloads
 */

import { getDb } from "../db/index.js";
import { github_releases, github_repos } from "../../db/schema/github.js";
import { eq } from "drizzle-orm";
import { sumFilteredDownloads } from "../utils/release-asset-filter.js";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const API_BASE = "https://api.github.com";

async function ghFetch(path: string, token: string): Promise<unknown> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  if (!GITHUB_TOKEN) {
    console.error("Error: GITHUB_TOKEN environment variable is required");
    process.exit(1);
  }

  const db = getDb();
  const allReleases = await db.select().from(github_releases);
  console.log(`Found ${allReleases.length} releases to backfill\n`);

  let updated = 0;
  let unchanged = 0;
  let errors = 0;

  for (let i = 0; i < allReleases.length; i++) {
    const release = allReleases[i];
    try {
      const [repo] = await db.select({ full_name: github_repos.full_name })
        .from(github_repos)
        .where(eq(github_repos.id, release.repo_id));

      if (!repo) {
        console.warn(`[${i + 1}/${allReleases.length}] Skip: repo ${release.repo_id} not found`);
        unchanged++;
        continue;
      }

      const ghRelease = await ghFetch(
        `/repos/${repo.full_name}/releases/${release.release_id}`,
        GITHUB_TOKEN,
      ) as Record<string, unknown> | null;

      if (!ghRelease?.assets) {
        console.warn(`[${i + 1}/${allReleases.length}] Skip: release ${release.tag_name} not found on GitHub`);
        unchanged++;
        continue;
      }

      const newTotal = sumFilteredDownloads(
        (ghRelease.assets as Array<Record<string, unknown>>).map((a) => ({
          name: (a.name as string) || "",
          download_count: (a.download_count as number) || 0,
        })),
      );

      if (newTotal !== release.total_downloads) {
        await db.update(github_releases)
          .set({ total_downloads: newTotal })
          .where(eq(github_releases.id, release.id));
        console.log(`[${i + 1}/${allReleases.length}] ${release.tag_name}: ${release.total_downloads} → ${newTotal}`);
        updated++;
      } else {
        unchanged++;
      }

      // Rate limit: 200ms between requests
      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.error(`[${i + 1}/${allReleases.length}] Error on ${release.tag_name}:`, e);
      errors++;
    }
  }

  console.log(`\nDone: ${updated} updated, ${unchanged} unchanged, ${errors} errors`);
}

main();
```

- [ ] **Step 2: Add script to package.json**

Add to `scripts` in `package.json`:

```json
"backfill:release-downloads": "bun run server/scripts/backfill-release-downloads.ts"
```

- [ ] **Step 3: Verify typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add server/scripts/backfill-release-downloads.ts package.json
git commit -m "feat: add backfill script to recalculate historical GitHub release download counts"
```

---

### Task 4: Add Release Assets API endpoint

**Files:**
- Modify: `server/routes/github.ts` (add new route)
- Modify: `server/repositories/github.ts` (add query function)
- Modify: `shared/types.ts` (add `GithubReleaseAsset` type)

**Interfaces:**
- Consumes: `github_release_assets` table, `isReleaseAsset` from Task 1
- Produces: `GET /github/:accountId/repos/:repoId/releases/:releaseId/assets` endpoint

- [ ] **Step 1: Add type to shared/types.ts**

Add after `GithubRelease` type in `shared/types.ts`:

```typescript
export interface GithubReleaseAsset {
  id: number;
  release_id: number;
  name: string;
  download_count: number;
  size: number;
  content_type: string | null;
  browser_download_url: string | null;
}
```

- [ ] **Step 2: Add repository function**

Add after `getGithubReleases` function in `server/repositories/github.ts`:

```typescript
export async function getGithubReleaseAssets(releaseDbId: number) {
  const all = await getDb().select().from(github_release_assets)
    .where(eq(github_release_assets.release_id, releaseDbId));
  return all.filter((a) => isReleaseAsset(a.name));
}
```

Add import: `import { isReleaseAsset } from "../utils/release-asset-filter.js";`

- [ ] **Step 3: Add route**

Add after releases route in `server/routes/github.ts`:

```typescript
githubRouter.get("/:accountId/repos/:repoId/releases/:releaseId/assets", async (c) => {
  const releaseId = Number(c.req.param("releaseId"));
  // releaseId here is the DB id (github_releases.id)
  return c.json(await githubRepo.getGithubReleaseAssets(releaseId));
});
```

- [ ] **Step 4: Verify typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/routes/github.ts server/repositories/github.ts shared/types.ts
git commit -m "feat: add API endpoint for filtered GitHub release assets"
```

---

### Task 5: Frontend — Add asset expandable table

**Files:**
- Modify: `client/src/api.ts` (add API method)
- Modify: `client/src/pages/RepoDetail.tsx` (add expand interaction)

**Interfaces:**
- Consumes: `GithubReleaseAsset` type, new API endpoint
- Produces: click release bar to expand and show asset download details

- [ ] **Step 1: Add API client method**

Add after `getGithubReleases` method in `client/src/api.ts`:

```typescript
getGithubReleaseAssets: (accountId: number, repoId: number, releaseId: number) =>
  fetchJSON<GithubReleaseAsset[]>(`/github/${accountId}/repos/${repoId}/releases/${releaseId}/assets`),
```

Ensure `GithubReleaseAsset` type is included in imports.

- [ ] **Step 2: Update RepoDetail.tsx**

In `RepoDetail.tsx`:

1. Add imports:
```typescript
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { GithubReleaseAsset } from "../../../shared/types";
```

2. Add state and query inside component:
```typescript
const [expandedRelease, setExpandedRelease] = useState<number | null>(null);

const { data: releaseAssets } = useQuery({
  queryKey: ["github", "release-assets", aid, rid, expandedRelease],
  queryFn: () => api.getGithubReleaseAssets(aid, rid, expandedRelease!),
  enabled: !!expandedRelease,
});
```

3. Replace existing BarChart with expandable list view:

```tsx
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2"><Download size={18} /> {t("repoDetail.releasesDownloads")}</CardTitle>
    <CardDescription>{t("repoDetail.releasesDownloadsDesc")}</CardDescription>
  </CardHeader>
  <CardContent>
    {releases && releases.length > 0 ? (
      <div className="space-y-1">
        {releases.map((rel) => (
          <div key={rel.id}>
            <button
              onClick={() => setExpandedRelease(expandedRelease === rel.id ? null : rel.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-[var(--accent)] text-left transition-colors"
            >
              {expandedRelease === rel.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <span className="font-mono text-sm truncate flex-shrink-0" style={{ width: isMobile ? 60 : 120 }}>
                {rel.tag_name}
              </span>
              <span className="flex-1 text-xs text-[var(--muted-foreground)] truncate">
                {rel.name || rel.tag_name}
                {rel.published_at ? ` — ${formatDate(rel.published_at)}` : ""}
              </span>
              <span className="text-sm font-medium tabular-nums">{rel.total_downloads.toLocaleString()}</span>
            </button>
            {expandedRelease === rel.id && releaseAssets && (
              <div className="ml-8 mb-2 border-l-2 border-[var(--border)] pl-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[var(--muted-foreground)]">
                      <th className="text-left py-1 font-medium">{t("repoDetail.assetName")}</th>
                      <th className="text-right py-1 font-medium">{t("repoDetail.downloads")}</th>
                      <th className="text-right py-1 font-medium">{t("repoDetail.size")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {releaseAssets.map((asset) => (
                      <tr key={asset.id} className="border-t border-[var(--border)]/50">
                        <td className="py-1 font-mono truncate max-w-[200px]">{asset.name}</td>
                        <td className="py-1 text-right tabular-nums">{asset.download_count.toLocaleString()}</td>
                        <td className="py-1 text-right tabular-nums">{formatSize(asset.size)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    ) : (
      <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
        {t("repoDetail.noReleases")}
      </p>
    )}
  </CardContent>
</Card>
```

4. Add helper function (outside component):

```typescript
function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
```

- [ ] **Step 3: Add i18n keys**

Add to translation files (check existing i18n file location):

```json
"assetName": "File",
"size": "Size"
```

- [ ] **Step 4: Verify typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 5: Verify lint**

Run: `bun run lint`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add client/src/api.ts client/src/pages/RepoDetail.tsx
git commit -m "feat: add expandable asset download details to GitHub release view"
```

---

## Execution Order

1. **Task 1** — Filter utility + tests
2. **Task 2** — Fetcher modification
3. **Task 3** — Backfill script
4. **Task 4** — API endpoint
5. **Task 5** — Frontend expandable table

## Post-Deploy

1. Run `bun run backfill:release-downloads` to fix historical data
2. Next fetch cycle automatically uses filtered counts
3. Frontend allows clicking releases to view per-platform download details
