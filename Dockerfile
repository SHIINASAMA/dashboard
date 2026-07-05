# ── Stage 1: Build client ─────────────────────────────────────────
FROM node:22-slim AS client-builder
RUN npm install -g pnpm
WORKDIR /app

# Clear host proxy vars
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

# Install deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY shared/ shared/
COPY client/ client/
RUN cd client && pnpm exec vite build

# ── Stage 2: Run server ────────────────────────────────────────────
FROM node:22-slim
RUN npm install -g pnpm
WORKDIR /app

# curl is needed by the Reddit public fetcher
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --prod

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

CMD ["pnpm", "exec", "tsx", "server/index.ts"]
