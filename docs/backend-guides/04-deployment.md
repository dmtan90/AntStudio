# AntFlow Deployment Guide

This document covers how to deploy the AntFlow backend and its related infrastructure.

## 1. Docker Deployment (Recommended)

The backend comes with a `Dockerfile` for easy containerization.

### Build the Image
```bash
docker build -t antflow-backend:latest ./server
```

### Run with Docker Compose
It is recommended to use `docker-compose` to manage the backend, MongoDB, and Redis.

**`docker-compose.yml` (Example)**:
```yaml
version: '3.8'
services:
  backend:
    image: antflow-backend:latest
    ports:
      - "3000:3000"
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

## 2. Manual Deployment

If not using Docker:
1.  Ensure **Node.js 18+**, **FFmpeg**, and **MongoDB** are installed on the host.
2.  Clone the repository and `npm install` in the `server` directory.
3.  Set up the `.env` file.
4.  Run `npm run build` and then `npm start`.
5.  Use a process manager like **PM2** to keep the app alive:
    ```bash
    pm2 start dist/index.js --name "antflow-backend"
    ```

## 3. Infrastructure Integrations

### Ant Media Server (AMS)
AntFlow requires an active Ant Media Server instance for WebRTC and RTMP processing.
1.  **Installation**: Install AMS on a dedicated Ubuntu server.
2.  **WebRTC**: Ensure SSL (HTTPS) is enabled on AMS for WebRTC to function in browsers/mobile.
3.  **App Secret**: Configure the `ANT_MEDIA_SECRET` in your backend `.env` to match the secret in the AMS app settings.

### File Storage (S3)
-   Create an S3 bucket with public-read permissions for assets (or use a CloudFront distribution).
-   Ensure the IAM user has `s3:PutObject`, `s3:GetObject`, and `s3:DeleteObject` permissions.

## 4. CI/CD Pipeline

A typical pipeline should:
1.  Run `npm test` to ensure stability.
2.  Run `pnpm build` (or `npm run build`).
3.  Build and push the Docker image to a registry.
4.  Deploy to the staging/production server and restart the container.

## 5. Monitoring & Maintenance

-   **Logs**: Check `server/logs/` or use a logging service.
-   **Health Checks**: `/api/health` (if implemented) monitors database and service connectivity.
-   **Backups**: Regularly backup the MongoDB database using `mongodump`.
