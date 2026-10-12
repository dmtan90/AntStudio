# Build context: repository root (pnpm workspace).
#   docker build -f client/Dockerfile .
# ==========================================
# BUILD STAGE
# ==========================================
FROM node:22-bookworm-slim AS builder
RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY genblaze/package.json genblaze/
COPY server/package.json server/
COPY client/package.json client/
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "client..."

COPY client/ client/
RUN pnpm --filter client build

# ==========================================
# PRODUCTION STAGE (NGINX)
# ==========================================
FROM nginx:stable-alpine

COPY --from=builder /app/client/dist /usr/share/nginx/html
# Container config (port 80, proxies API/WebSocket to API_UPSTREAM), rendered at startup.
# client/nginx.conf is the host-level TLS config used outside Docker.
COPY client/nginx.docker.conf.template /etc/nginx/templates/default.conf.template
ENV API_UPSTREAM=http://antstudio-server:4000

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
