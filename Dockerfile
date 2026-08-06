# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
# Keep every Node process on a tight heap so the memory-limited CI kaniko
# container never sees a runaway V8 allocation. The React Router build is
# split into client (330 MB heap) and SSR (160 MB heap) passes via the
# patched @react-router/dev + RR_SKIP_* env vars; each script carries its
# own NODE_OPTIONS which overrides this baseline.
ENV NODE_OPTIONS=--max-old-space-size=256
RUN corepack enable
WORKDIR /app

# Install deps first for better layer reuse. Serialize build scripts
# (node-gyp for argon2, sharp prebuilds, esbuild, unrs-resolver) so native
# compiles never run in parallel and spike memory.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=4

# Copy source, typecheck, then build client + SSR in separate passes.
COPY . .
# tsc cold-check needs ~440MB heap (432 OOMs, 448 passes) and peaks
# ~580MB RSS in a cold x86_64 container; the 256MB baseline ENV is too
# tight, so this single step gets its own heap. Keep it as tight as
# possible - CI kaniko has no explicit resources limits.
RUN NODE_OPTIONS="--max-old-space-size=448" pnpm exec tsc --noEmit
RUN pnpm build

# ── Stage 2: Production runner ──────────────────────────────────────
FROM node:22-slim AS runner
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# curl is needed by the Reddit public fetcher and compose healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs dashboard \
  && mkdir -p /app/data/db /app/data/logs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV NODE_OPTIONS=--max-old-space-size=256

# Production dependencies only (native addons ship prebuilt binaries).
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches ./patches
RUN pnpm install --prod --frozen-lockfile --child-concurrency=1 --network-concurrency=4

# React Router build output + minimal HTTP entry.
COPY --from=base --chown=dashboard:nodejs /app/build ./build
COPY --from=base --chown=dashboard:nodejs /app/server ./server
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

CMD ["docker-entrypoint.sh"]
