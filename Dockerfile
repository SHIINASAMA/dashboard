# ── Stage 1: Build client ─────────────────────────────────────────
FROM oven/bun:1 AS client-builder
WORKDIR /app

# Clear host proxy vars
ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

# Install root deps first (react-icons, lucide-react, etc.), then client
COPY package.json bun.lockb ./
RUN bun install
COPY client/package.json client/bun.lock client/
RUN cd client && bun install

# Copy source and build (skip tsc to avoid @shared alias + missing type issues)
COPY shared/ shared/
COPY client/ client/
RUN cd client && bunx vite build

# ── Stage 2: Run server ────────────────────────────────────────────
FROM oven/bun:1-slim
WORKDIR /app

ENV HTTP_PROXY= HTTPS_PROXY= http_proxy= https_proxy=

# Install production dependencies
COPY package.json bun.lockb ./
RUN bun install --production

# Copy server source, DB schema, and shared types
COPY server/ server/
COPY scripts/ scripts/
COPY db/ db/
COPY shared/ shared/
COPY tsconfig.json ./

# Copy built client from stage 1
COPY --from=client-builder /app/client/dist/ client/dist/

ENV HOST=0.0.0.0
ENV PORT=3001
ENV DATA_DIR=/app/data
ENV NODE_ENV=production

EXPOSE 3001

CMD ["bun", "run", "server/index.ts"]
