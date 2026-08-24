# GitHub Issue/PR Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate GitHub's aggregate `open_issues_count` into true open Issue and open Pull Request counts without losing the legacy aggregate.

**Architecture:** Keep `open_issues` as the GitHub REST aggregate for compatibility. Add nullable `open_issues_only` and `open_pull_requests` columns to repositories and snapshots, populate both from a batched GitHub GraphQL query during account fetches, and render two explicit cards on the repository page. Null means the split was unavailable, especially for historical snapshots; it must not be interpreted as zero.

**Tech Stack:** Node.js, React Router 7, TypeScript, Drizzle ORM, PostgreSQL, Vitest, Tailwind CSS, shadcn/ui, Recharts.

**Spec:** User-reported defect on 2026-08-24: GitHub repository Issue statistics do not distinguish Issues from Pull Requests. GitHub confirms that every PR is treated as an Issue by the REST API.

## Global Constraints

- Never reinterpret historical combined counts as split counts; use null for unknown values.
- Preserve `open_issues` as the existing aggregate value.
- Use one batched GraphQL request per chunk rather than one API request per repository.
- If no PAT is available, continue core fetching and record a capability gap instead of failing the whole run.
- Do not commit or push without explicit user permission.
- Code and documentation are English; UI copy is English and Simplified Chinese.

---

### Task 1: Schema And Migration

**Files:**

- Modify: `db/schema/github.ts`
- Modify: `lib/setup.ts`
- Modify: `tests/migrate-helper.ts`
- Modify: `docs/DATABASE.md`

**Interfaces:**

- Produces nullable `github_repos.open_issues_only`, `github_repos.open_pull_requests`, `github_repo_snapshots.open_issues_only`, and `github_repo_snapshots.open_pull_requests` columns.
- Produces idempotent column additions for deployments with existing tables.

- [x] Add nullable integer fields to both Drizzle table definitions.
- [x] Add the same fields to bootstrap/test DDL.
- [x] Add `ensureSchemaColumns()` to bootstrap and call it after missing tables are created.
- [x] Document that null means the split was not collected.

### Task 2: Fetch Batched Counts

**Files:**

- Create: `lib/fetchers/github-issue-split.ts`
- Create: `tests/github-issue-split.test.ts`
- Modify: `lib/fetchers/github.ts`
- Modify: `lib/repositories/github.ts`

**Interfaces:**

- Consumes fetched repository records containing `id` and `full_name`.
- Produces `fetchGithubIssueSplits(repos, token): Promise<Map<number, { issues: number; pullRequests: number }>>`.
- Produces pure helpers `buildIssueSplitQuery(repos)` and `parseIssueSplitResponse(expected, data)`.
- Extends GitHub repo/snapshot upserts with optional nullable split fields.

- [x] Write unit tests for GraphQL query construction and response parsing.
- [x] Implement batched aliases (`r0`, `r1`, ...) querying `issues(states: OPEN)` and `pullRequests(states: OPEN)` total counts.
- [x] Parse GraphQL errors and invalid/missing count nodes as explicit errors.
- [x] Fetch splits before saving repos, store nulls when unavailable, and add a `github_issue_split` capability gap on failure/no token.
- [x] Persist split fields in repository and snapshot upserts.
- [x] Run the focused unit tests.

### Task 3: API Contract And Mock Data

**Files:**

- Modify: `db/schema/github.ts` (query-facing types only if required by implementation findings)
- Modify: `shared/types.ts`
- Modify: `lib/api.ts`
- Modify: `lib/mock/index.ts`
- Modify: `lib/repositories/github.ts`

**Interfaces:**

- Extends `GithubRepo` with `open_issues_only: number | null` and `open_pull_requests: number | null`.
- Extends GitHub snapshot responses with optional nullable split fields.

- [x] Extend shared and client-side response types.
- [x] Include split fields in snapshot selects and mock data; leave historical mock snapshots null where appropriate.
- [x] Confirm overview returns the new repository fields unchanged through Drizzle.

### Task 4: Repository UI

**Files:**

- Modify: `app/(dashboard)/github/[accountId]/repos/[repoId]/page.tsx`
- Modify: `locales/en.json`
- Modify: `locales/zh.json`

**Interfaces:**

- Consumes `GithubRepo.open_issues_only` and `GithubRepo.open_pull_requests`.
- Displays separate Open Issues and Open Pull Requests cards.

- [x] Replace the single aggregate card with two metric cards using Lucide `CircleDot` and `GitPullRequestArrowRight` icons.
- [x] Show an em dash when either split value is null and expose an explanatory tooltip.
- [x] Keep the aggregate available in data for compatibility and future charts.
- [x] Add English and Chinese copy.

### Task 5: Verification And Records

**Files:**

- Modify: `.agents/plans/2026-08-24-github-issue-pr-split.md`
- Modify: Obsidian note `dashboard/抓取器架构与踩坑记录.md`

- [x] Run `pnpm test -- github-issue-split`.
- [x] Run PostgreSQL-backed `pnpm test -- db-queries`.
- [x] Run `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build`.
- [x] Check mock mode renders separate values and em dashes correctly.
- [x] Update implementation-plan checkboxes.
- [x] Record the implemented behavior and historical-data limitation in Obsidian.
