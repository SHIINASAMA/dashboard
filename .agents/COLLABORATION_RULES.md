# Collaboration Rules

This file defines behavior rules for AI coding assistants.

## Project Language

- Primary language: Chinese (user communicates in Chinese)
- Code: English (identifiers, comments, commit messages)
- Documentation: English

## Prohibited Actions

- NEVER commit or `git push` without explicit user permission
- NEVER run destructive database operations (drop, truncate, delete rows) without explicit permission
- NEVER create documentation files unless explicitly requested (updating existing docs is fine when requested)

## Must Follow

- `AGENTS.md` is the router — check it first, then read the referenced docs only when the task needs them
- Plan mode for non-trivial tasks (3+ steps)
- Verify changes by checking lint/types when relevant tooling is available
- Documentation layout:
  - Human-facing docs live in `docs/` (English only)
  - Agent-only docs live in `.agents/`: `plans/`, `specs/`, `research/`, and this file
  - Do not put agent-only working docs in `docs/`

## Behavioral Style

- Be concise; answer directly without preamble
- Use GitHub-flavored markdown in responses
- Reference code with file path + line number when relevant
- Ask clarifying questions when requirements are ambiguous
