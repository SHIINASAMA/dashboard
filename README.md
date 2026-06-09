# Dashboard

Multi-platform social & code dashboard with web UI. Track activity and stats across X (Twitter), GitHub, GitLab, and Reddit — all in one place.

## Features

- **Multi-platform**: X (Twitter), GitHub, GitLab, Reddit
- **Web dashboard** with charts, stats, and activity timelines for each platform
- **Auto-fetching** on configurable intervals per account
- **Multi-user**: admin and regular users with data isolation
- **Password-protected** with session-based auth
- **OAuth support** for Reddit; personal access token support for GitHub/GitLab
- **Local-first**: all data stored in SQLite (Drizzle ORM), no cloud dependencies

## Quick Start

```bash
bun install
bun run dev
```

The server starts on port 3001, client dev server on a random port. Open the URL printed in the console.

On first run, no password is set — log in as `admin` with empty password, then go to Settings to set a password.

## Tech Stack

- **Runtime**: Bun
- **Frontend**: Vite + React 19 + TypeScript, Tailwind CSS v4, shadcn/ui, Recharts
- **Backend**: Hono REST API
- **Database**: SQLite via Drizzle ORM (PostgreSQL support reserved)
- **Auth**: Argon2id password hashing, signed session cookies

## License

[Apache License 2.0](LICENSE)

This work is a derivative of software originally released under the MIT License (Copyright 2024 xiaoxiunique).
