# Collaboration Rules

This file defines behavior rules for AI coding assistants.

## Project Language

- Primary language: Chinese (user communicates in Chinese)
- Code: English (identifiers, comments, commit messages)
- Documentation: English

## Prohibited Actions

- NEVER commit or `git push` without explicit user permission
- NEVER run destructive database operations (drop, truncate, delete rows/config) without explicit permission
- NEVER delete or modify `data/config.json` — contains password hash and URL prefix
- NEVER delete `data/db/dashboard.db` — use Drizzle schemas + migrations for schema changes
- NEVER create documentation files unless explicitly requested

## Must Follow

- `CLAUDE.md` is the primary knowledge base — check it first
- Plan mode for non-trivial tasks (3+ steps)
- Verify changes by checking lint/types when relevant tooling is available
- All `.md` files go in `docs/` except `AGENTS.md`, `CLAUDE.md`, `README.md`

## Behavioral Style

- Be concise; answer directly without preamble
- Use GitHub-flavored markdown in responses
- Reference code with file path + line number when relevant
- Ask clarifying questions when requirements are ambiguous
