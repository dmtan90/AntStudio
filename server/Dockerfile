# ==========================================
# BUILD STAGE
# ==========================================
FROM node:18-slim AS builder

# Install build dependencies for canvas/native modules if needed
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    build-essential \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ==========================================
# PRODUCTION STAGE
# ==========================================
FROM node:18-slim

# Install runtime dependencies (FFmpeg, Canvas libs)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libcairo2 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Security: Run as non-root
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs
USER nodejs

COPY --from=builder /app/package*.json ./
RUN npm install --production

COPY --from=builder /app/dist ./dist
# Re-copy source files if needed for dynamic imports (though build should handle it)

EXPOSE 4000
ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "dist/index.js"]
