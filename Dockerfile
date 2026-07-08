# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:22-slim AS base
RUN npm install -g pnpm
WORKDIR /app

# Clear host proxy vars
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

# Install deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# ── Stage 2: Production runner ──────────────────────────────────────
FROM node:22-slim AS runner
RUN npm install -g pnpm
WORKDIR /app

# curl is needed by the Reddit public fetcher
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DATA_DIR=/app/data

# Copy standalone build
COPY --from=base /app/.next/standalone ./
COPY --from=base /app/.next/static ./.next/static
COPY --from=base /app/public ./public

# Copy data directories
RUN mkdir -p /app/data/db /app/data/logs

EXPOSE 3000

CMD ["node", "server.js"]
