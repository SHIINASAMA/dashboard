# ── Stage 1: Build client ─────────────────────────────────────────
FROM oven/bun:1 AS client-builder
WORKDIR /app

# Clear host proxy vars
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

# Install root deps (includes pg, drizzle-orm/node-postgres)
COPY package.json bun.lockb ./
RUN bun install
COPY client/package.json client/bun.lock client/
RUN cd client && bun install

# Copy source and build
COPY shared/ shared/
COPY client/ client/
RUN cd client && bunx vite build

# ── Stage 2: Run server ────────────────────────────────────────────
FROM oven/bun:1-slim
WORKDIR /app

# curl is needed by the Reddit public fetcher to avoid Bun's TLS fingerprint detection
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

COPY package.json bun.lockb ./
RUN bun install --production

# Copy server source, DB schema, shared types, scripts
COPY server/ server/
COPY scripts/ scripts/
COPY db/ db/
COPY shared/ shared/
COPY tsconfig.json ./
COPY drizzle.config.ts ./

# Copy built client from stage 1
COPY --from=client-builder /app/client/dist/ client/dist/

ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

# Create data dir (also serves as volume mount point)
RUN mkdir -p /app/data/db /app/data/logs

EXPOSE 3001

CMD ["bun", "run", "server/index.ts"]
