# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
# Keep every Node process on a tight heap so the memory-limited CI kaniko
# container never sees a runaway V8 allocation. tsc/install only need 256 MB;
# the webpack build gets 352 MB (measured: ~0.86 GB total RSS with externals
# + worker threads + all pages forced dynamic).
ENV NODE_OPTIONS=--max-old-space-size=256
RUN corepack enable
WORKDIR /app

# Install deps first for better layer reuse. Serialize build scripts
# (node-gyp for argon2, sharp prebuilds, esbuild, unrs-resolver) so native
# compiles never run in parallel and spike memory.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=4

# Copy source and build the standalone output.
COPY . .
RUN pnpm exec tsc -p tsconfig.build.json --noEmit
ENV NODE_OPTIONS=--max-old-space-size=352
ENV SKIP_NEXT_TYPECHECK=1
RUN pnpm build

# ── Stage 2: Production runner ──────────────────────────────────────
FROM node:22-slim AS runner
WORKDIR /app

# curl is needed by the Reddit public fetcher and compose healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs \
  && mkdir -p /app/data/db /app/data/logs

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/app/data
ENV NEXT_TELEMETRY_DISABLED=1

# Copy standalone build
COPY --from=base --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=base --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

CMD ["docker-entrypoint.sh"]
