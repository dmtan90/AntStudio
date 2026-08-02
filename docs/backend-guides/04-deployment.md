# AntStudio Deployment Guide

This document covers how to deploy the AntStudio backend and its related infrastructure.

---

## 1. Docker Deployment (Recommended)

The backend comes with a `Dockerfile` for easy containerization.

### Build the Image
```bash
docker build -t antstudio-backend:latest ./server
```

### Run with Docker Compose
It is recommended to use `docker-compose` to manage the backend, MongoDB, and Redis.

**`docker-compose.yml`**:
```yaml
version: '3.8'
services:
  backend:
    image: antstudio-backend:latest
    ports:
      - "4000:4000"
    env_file: .env
    depends_on:
      - mongodb
      - redis

  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  mongodb_data:
```

---

## 2. Manual & GCP Deployment

If deploying manually or on GCP:
1. Ensure **Node.js 18+**, **FFmpeg**, and **MongoDB** are installed on the host.
2. Run automated script:
   - Linux/GCP: `./deploy-gcp.sh`
   - Windows: `deploy-gcp.cmd`
3. Set up the `.env` file.
4. Run `pnpm run build` and start using PM2:
   ```bash
   pm2 start server/dist/index.js --name "antstudio-backend"
   ```

---

## 3. Infrastructure Integrations

### Streaming Ingest & NMS Relay
AntStudio uses built-in Node-Media-Server (NMS) and FFmpeg for RTMP stream relaying:
1. **RTMP Port**: Configured via `RTMP_PORT=1935` in `.env`.
2. **WebRTC**: Ensure SSL (HTTPS) is enabled on your domain for browser camera streaming.

### File Storage (S3 / Blaze B2)
- Create an S3 bucket with public-read permissions for assets.
- Ensure IAM credentials have `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions.

---

## 4. Monitoring & Maintenance

- **Logs**: Check `server/logs/` or use a logging service.
- **Health Checks**: `/health` and `/api/health` endpoints monitor core service connectivity.
- **Backups**: Regularly backup the MongoDB database using `mongodump`.
