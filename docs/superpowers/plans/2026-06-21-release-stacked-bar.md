# Release Stacked Bar Chart

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the original horizontal bar chart, but with stacked bars — each segment represents an asset, with consistent colors for the same asset across releases.

**Architecture:** API returns releases with asset lists; frontend displays using recharts stacked bar chart.

**Tech Stack:** TypeScript, Drizzle ORM, React 19, recharts

---

### Task 1: API returns releases with assets

**Files:**
- Modify: `server/repositories/github.ts`
- Modify: `shared/types.ts`

**Changes:**
- Add `assets: GithubReleaseAsset[]` field to `GithubRelease` type
- `getGithubReleases` joins assets table when querying, returns assets list for each release
- API endpoint and frontend api client don't need changes (types are carried automatically)

---

### Task 2: Frontend stacked bar chart replaces existing UI

**Files:**
- Modify: `client/src/pages/RepoDetail.tsx`

**Changes:**
- Remove `ReleaseCard`, `ComparisonChart`, checkbox-related code
- Remove `expandedRelease`, `selectedReleases`, `releaseAssets`, `comparisonData` state and query
- Use recharts stacked `<Bar>` for horizontal bar chart:
  - Y axis = tag_name
  - X axis = download count
  - Each bar stacked by asset, one `<Bar dataKey={asset.name}>` per asset
  - Colors use fixed palette with cyclic assignment
  - Take only top 10 assets by download_count, rest grouped as "other"
- Tooltip shows download count for each asset
- Chart height adjusts dynamically based on release count
