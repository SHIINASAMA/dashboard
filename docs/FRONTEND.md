# Frontend Architecture

React 19 SPA with Vite, TypeScript, Tailwind CSS v4, and shadcn/ui.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + React Router |
| Build | Vite |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts |
| Icons | lucide-react |
| Data Fetching | @tanstack/react-query |
| i18n | Custom (JSON locale files) |

## Source Layout

```
client/src/
├── App.tsx              # Route definitions, auth guards, QueryClient
├── api.ts               # API client functions + TypeScript interfaces
├── main.tsx             # Entry point
├── index.css            # Tailwind imports + CSS variables (themes), animations
├── components/
│   ├── Layout.tsx       # Main layout (sidebar + title bar + content area)
│   ├── AccountListPage.tsx  # Reusable account list component
│   ├── BrandIcons.tsx   # Platform brand icons
│   ├── StatCard.tsx     # Reusable stat display card
│   ├── Skeleton.tsx     # Skeleton loading primitives (StatCardSkeleton, ChartCardSkeleton)
│   ├── NavigationProgress.tsx  # Top progress bar on route changes
│   ├── NavigatingOverlay.tsx   # Full-screen spinner overlay during navigation
│   ├── ThemeProvider.tsx # Theme context provider
│   ├── useTheme.ts      # Theme hook
│   └── ui/              # shadcn/ui primitives (dialog, dropdown, etc.)
```

## Routing

Defined in `App.tsx`. All routes except `/login` require authentication.

| Path | Component | Description |
|------|-----------|-------------|
| `/login` | Login | Login page (redirects to `/` if authenticated) |
| `/` | Overview | Dashboard overview |
| `/accounts` | AccountsPage | Account management |
| `/x` | X | X/Twitter accounts |
| `/x/:id` | XDetail | X/Twitter account detail |
| `/github` | GitHub | GitHub accounts |
| `/github/:id` | GitHubDetail | GitHub account detail |
| `/github/:accountId/repos/:repoId` | RepoDetail | GitHub repo detail |
| `/gitlab` | GitLab | GitLab accounts |
| `/gitlab/:id` | GitLabDetail | GitLab account detail |
| `/gitlab/:accountId/projects/:projectId` | ProjectDetail | GitLab project detail |
| `/reddit` | Reddit | Reddit accounts |
| `/reddit/:id` | RedditDetail | Reddit account detail |
| `/admin` | Admin | User management (admin only) |
| `/settings` | Settings | App settings |

## Auth Flow

1. `App.tsx` wraps everything in `AuthContext` which calls `api.checkAuth()`
2. `RequireAuth` redirects to `/login` if not authenticated
3. `RedirectIfAuth` redirects to `/` if already authenticated
4. Login form calls `api.login(username, password)` → server sets JWT cookie
5. All API calls include the cookie automatically (httpOnly)

## Data Fetching

- Uses @tanstack/react-query for caching and refetching
- `QueryClient` configured with `retry: 1` and `staleTime: 3 minutes`
- API client in `api.ts` wraps fetch calls with base URL and error handling

## i18n

Custom implementation in `lib/i18n.ts`:
- Locale files in `locales/en.json` and `locales/zh.json`
- Hook-based: `const { t } = useI18n()`
- Key format: `"section.subkey"` (e.g., `"nav.overview"`)

## Layout & Sidebar

The main layout (`Layout.tsx`) provides:

- **Title bar** — fixed 48px header with sidebar toggle button and dashboard title
- **Sidebar** — CSS-based with smooth width/transform transitions (0.3s ease)
  - Desktop: push layout, sidebar slides in/out from left
  - Mobile (<768px): overlay drawer with backdrop, hamburger menu in title bar
- **State persistence** — sidebar open/closed state saved to localStorage
- **Responsive detection** — `useIsMobile` hook for breakpoint-aware behavior

## Theming

- Theme definitions in `lib/themes.ts`
- CSS variables in `index.css` (`:root` and `[data-theme="..."]`)
- `ThemeProvider` context + `useTheme` hook
- Multiple light and dark themes available (default, sepia, cyber, forest, sky, rose)

## Responsive Design

- Charts use responsive heights (140-200px mobile, 160-300px desktop)
- Grid layouts adapt from single column (mobile) to multi-column (desktop)
- Detail page headers wrap gracefully on small screens (`detail-header` CSS class)
- Chart legends rendered as plain HTML outside Recharts for better space control
- Touch targets meet WCAG 44px minimum (`min-h-11 min-w-11`)
- Safe-area-inset padding for notched devices
- PWA support via `manifest.json` with standalone display

## Loading & Transitions

Multi-layered loading strategy for smooth UX on slow networks:

1. **HTML spinner** (`index.html`) — pure CSS spinner shown before JS loads
2. **Auth check** — non-blocking; app renders immediately, `RequireAuth` redirects if needed
3. **Route preloading** — sidebar `onMouseEnter`/`onFocus` triggers lazy chunk download
4. **Navigating overlay** — semi-transparent backdrop + spinner during route transitions
5. **Progress bar** — animated gradient bar at top of page on navigation
6. **Skeleton loading** — `StatCardSkeleton` / `ChartCardSkeleton` replace "Loading..." text
7. **Fade-in animation** — `page-enter` class on route content for smooth appearance

Route transitions use `key={location.pathname}` on the Outlet wrapper to trigger re-mount and animation replay.
