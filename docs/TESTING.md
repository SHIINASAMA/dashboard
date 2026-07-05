# Testing

## Running Tests

```bash
pnpm test
```

## Test Files

| File | Coverage | Description |
|------|----------|-------------|
| `auth.test.ts` | JWT session tokens | Create, verify, reject expired/tampered/malformed tokens |
| `crypto.test.ts` | Encryption & signing | AES-256-GCM encrypt/decrypt, HMAC sign/verify, JWT secret |
| `db-queries.test.ts` | Database queries | Users, accounts, Twitter, Reddit, GitHub, GitLab CRUD |
| `release-asset-filter.test.ts` | Release filtering | Filter release assets by platform, sum downloads |

## Setup

- `setup.ts` — creates a test database (PostgreSQL), runs migrations, provides `getTestPool()` / `closeTestPool()`
- `migrate-helper.ts` — migration utilities for test setup

Tests use `vitest` with `describe`, `it`, `expect`.

## What's Tested

### Auth (`auth.test.ts`)
- JWT token creation and verification
- Expired token rejection
- Wrong key rejection
- Malformed token rejection
- Tampered token rejection

### Crypto (`crypto.test.ts`)
- AES-256-GCM encrypt/decrypt roundtrip
- IV randomization (different ciphertexts for same plaintext)
- Corrupted/truncated ciphertext rejection
- HMAC sign/verify roundtrip
- Forged signature rejection
- JWT secret format validation

### Database (`db-queries.test.ts`)
- User CRUD (create, find, list, soft-delete, revive)
- Account CRUD (create, list, get by ID, soft-delete)
- Twitter queries (insert stats, upsert tweet, retrieve tweets)
- Reddit queries (insert stats, upsert post/comment, retrieve)
- GitHub queries (insert stats, upsert contribution, retrieve)
- GitLab queries (insert stats, upsert contribution, retrieve)

## Adding Tests

1. Create a file in `server/__tests__/` following the `*.test.ts` naming convention
2. Import from `vitest`: `describe`, `it`, `expect`, `beforeAll`, `afterAll`
3. Use `setup.ts` helpers for database access
4. Run with `pnpm test -- server/__tests__/your-file.test.ts`

### Example

```typescript
import { describe, it, expect } from "vitest";

describe("my feature", () => {
  it("does something", () => {
    expect(1 + 1).toBe(2);
  });
});
```

## CI

Tests are not yet wired into CI pipelines. The GitLab CI pipeline currently only builds and deploys.
