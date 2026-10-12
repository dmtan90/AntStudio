# Build context: repository root (the server depends on the genblaze workspace package).
#   docker build -f server/Dockerfile .
# ==========================================
# BUILD STAGE
# ==========================================
FROM node:22-bookworm-slim AS builder

RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable

WORKDIR /app

# Manifests first for layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY genblaze/package.json genblaze/
COPY server/package.json server/
COPY client/package.json client/

# Only the server and its workspace dependencies; scripts skipped (no browser/yt-dlp downloads)
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "server..."

COPY genblaze/ genblaze/
COPY server/ server/
RUN pnpm --filter server build

# ==========================================
# PRODUCTION STAGE
# ==========================================
FROM node:22-bookworm-slim

# FFmpeg fallback binary + CA certs for outbound HTTPS
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# pnpm's node_modules are symlinked into /app/node_modules/.pnpm, so keep the same layout
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/genblaze ./genblaze
COPY --from=builder --chown=node:node /app/server/node_modules ./server/node_modules
COPY --from=builder --chown=node:node /app/server/package.json ./server/package.json
COPY --from=builder --chown=node:node /app/server/dist ./server/dist
COPY --from=builder --chown=node:node /app/server/bin ./server/bin

WORKDIR /app/server
RUN mkdir -p uploads logs tmp && chown -R node:node uploads logs tmp

# Security: run as the image's unprivileged user
USER node

ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000 1935

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
    CMD node -e "fetch('http://localhost:'+(process.env.PORT||4000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
