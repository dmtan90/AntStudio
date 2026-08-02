# AntStudio - Production Deployment Guide

This guide covers deployment procedures for AntStudio across Linux/GCP servers, Docker container clusters, and Electron desktop distributions.

---

## 📋 System Requirements

- **Node.js**: v18.x or v20.x
- **MongoDB**: v6.0+
- **FFmpeg**: v4.4+ (required for NMS stream relaying & audio transcoding)
- **Ports**:
  - Web Application / API: `4000` (or `80/443` behind Nginx)
  - Socket.IO Gateway: `4000` (`/socket.io`)
  - RTMP Stream Ingest: `1935`

---

## ☁️ Google Cloud Platform (GCP) Deployment

AntStudio includes automated deployment scripts for GCP instances:

### 1. Using Bash Script (`deploy-gcp.sh`)
```bash
chmod +x deploy-gcp.sh
./deploy-gcp.sh
```

### 2. Using Windows Command (`deploy-gcp.cmd`)
```cmd
deploy-gcp.cmd
```

These scripts perform:
- Dependency checks (Node.js, pnpm, MongoDB, FFmpeg).
- System environment setup from `gcp-service-account.json`.
- Production build compilation (`pnpm run build:client`).
- PM2 process manager initialization for 24/7 background persistence.

---

## 🐳 Docker & Docker Compose Deployment

Deploy full stack (Mongo + Server + Client) with Docker:

```bash
# 1. Build and start containers in background
docker-compose up --build -d

# 2. View logs
docker-compose logs -f server

# 3. Check container health
docker-compose ps
```

---

## 💻 Electron Desktop App Packaging

AntStudio supports native cross-platform desktop builds using `electron-builder` and GitHub Actions (`.github/workflows/build-electron.yml`):

### Local Packaging Commands
```bash
# Build desktop binary for current OS (Standard)
pnpm run build:electron

# Build desktop binary with embedded encrypted env file (.env / .env.electron)
node electron/build.cjs --env=.env.electron --target=win

# Build specifically for Windows (.exe)
pnpm --filter client build && electron-builder --win
```

### 🔒 Embedded Encrypted Env Build Mode (`--env` Flag)
AntStudio allows embedding and encrypting environment variables directly into the packaged Electron application:
- Running `node electron/build.cjs --env=.env.electron` encrypts `.env.electron` into `electron/.env.enc` using `AES-256-CBC` encryption (`crypto-env.cjs`).
- The encrypted `.env.enc` resource is bundled into `extraResources`.
- When the Desktop app launches, `electron/main.cjs` automatically decrypts `.env.enc` into `process.env` in memory without exposing raw `.env` text files on disk.

### Automated CI/CD Releases
Pushing a git tag starting with `v*` (e.g., `v1.0.0`) triggers `.github/workflows/build-electron.yml` to compile artifacts for:
- 🪟 Windows (`win-installer.exe`)
- 🐧 Linux (`.AppImage`, `.deb`)
- 🍎 macOS (`.dmg`)

---

## 🌐 Health Check & Monitoring

Verify deployment status via health check endpoints:
- Core Health Check: `GET http://your-domain/health`
- API Health Check Alias: `GET http://your-domain/api/health`

Response format:
```json
{
  "status": "ok",
  "timestamp": "2026-08-02T08:42:00.000Z"
}
```

---

## 🛡️ Nginx Reverse Proxy Configuration

```nginx
server {
    listen 80;
    server_name studio.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /socket.io/ {
        proxy_pass http://localhost:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```
