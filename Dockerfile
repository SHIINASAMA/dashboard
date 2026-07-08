# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=512
RUN corepack enable
WORKDIR /app

# Install deps first for better layer reuse.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build the standalone output.
COPY . .
RUN pnpm exec tsc -p tsconfig.build.json --noEmit
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

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
