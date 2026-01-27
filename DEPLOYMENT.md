# AntFlow Deployment Guide

This document outlines the deployment strategies for AntStudio/AntFlow, covering Single Tenant, Multiple Tenant, and Edge computing modes.

## 1. Cloud Deployment (Master Mode)

The standard deployment configuration for centralized management.

### Prerequisites
- Docker & Docker Compose
- Nginx (Reverse Proxy)
- SSL Certificate (Let's Encrypt recommended)
- Domain Name (e.g., `app.antflow.ai`)

### Configuration (docker-compose.yml)

Use the root `docker-compose.yml` for standard deployment.

```bash
# 1. Update environment variables in docker-compose.yml
# 2. Start services
docker-compose up -d --build
```

### Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name app.antflow.ai;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 2. Enterprise Deployment (Multiple Tenant)

For B2B scenarios where you host isolated environments for different organizations.

### Architecture
- **Global Load Balancer**: Routes traffic based on subdomain (e.g., `org1.antflow.ai`).
- **Shared or Isolated DB**: Configurable via `ClusterManager`.
- **White-labeling**: Branding assets served dynamically.

### Setup

1. Use `docker-compose.enterprise.yml`.
2. Configure `BASE_DOMAIN` in your environment.

```bash
export BASE_DOMAIN=antflow.enterprise.com
docker-compose -f docker-compose.enterprise.yml up -d
```

### Tenant Setup
Tenants are managed via the Super Admin panel.
1. Go to `Admin -> Tenants`.
2. Create new Tenant.
3. Assign domain alias and resource quotas.

## 3. Edge Mode Deployment (Single Tenant)

Optimized for on-premise or edge node deployment (e.g., local rendering nodes, high-security internal networks).

### Use Case
- Zero-latency video processing.
- High-security data requirements (air-gapped).
- GPU-accelerated local rendering.

### Configuration

Create a `docker-compose.edge.yml`:

```yaml
version: '3.8'
services:
  antflow-edge:
    image: antflow/edge-node:latest
    network_mode: host
    environment:
      - MODE=EDGE
      - SYNC_SERVER=https://master.antflow.ai
      - LOCAL_GPU=true
    volumes:
      - ./data:/data/db
```

### Synchronization
Edge nodes can optionally sync metadata back to the Master server if configured. Video assets remain local by default.

## 4. Scaling & Clusters

AntFlow supports database read/write splitting and read-replicas for high availability.

### Database Cluster
Edit `server/.env`:

```ini
MQ_URI=amqp://localhost
MONGODB_URI=mongodb://primary-node:27017/antflow
MONGODB_READ_REPLICAS=mongodb://read-node-1:27017/antflow,mongodb://read-node-2:27017/antflow
```

The `ClusterManager` service will automatically route write operations to the primary node and load-balance read operations across replicas.

## 5. CI/CD Pipeline

We recommend setting up a standard pipeline (GitHub Actions / GitLab CI):

1. **Test**: Run `pnpm test`
2. **Build**: Run `pnpm build`
3. **Containerize**: Push images to registry
4. **Deploy**: SSH to target server and update stack

```yaml
# Example GitHub Action snippet
deploy:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v2
    - name: Deploy to Production
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.HOST }}
        script: |
          cd /opt/antflow
          git pull
          docker-compose up -d --build
```
