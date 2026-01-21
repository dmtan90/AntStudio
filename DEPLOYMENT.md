# Deployment Guide - AntFlow

This guide covers deploying AntFlow (Flova.ai) to production environments.

## 📋 Pre-Deployment Checklist

- [ ] MongoDB database provisioned
- [ ] AWS S3 bucket created
- [ ] Domain name configured
- [ ] SSL certificate obtained
- [ ] Environment variables prepared
- [ ] OAuth apps created (Google/Facebook)
- [ ] Stripe account configured

## 🌐 Deployment Options

### Option 1: VPS Deployment (Recommended)

**Requirements:**
- Ubuntu 20.04+ or similar Linux distribution
- 2GB+ RAM
- Node.js 18+
- MongoDB 6.0+
- Nginx (reverse proxy)
- PM2 (process manager)

**Steps:**

1. **Install Dependencies**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install pnpm
npm install -g pnpm

# Install PM2
npm install -g pm2

# Install MongoDB
# Follow: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/
```

2. **Clone and Build**
```bash
# Clone repository
git clone https://github.com/yourusername/flova.ai.git
cd flova.ai

# Install dependencies
pnpm install

# Build both client and server
pnpm build
```

3. **Configure Environment**
```bash
# Create server/.env
cp server/.env.example server/.env
nano server/.env

# Update all production values
```

4. **Setup PM2**
```bash
# Start backend
cd server
pm2 start dist/index.js --name "antflow-api"

# Serve frontend with static server
cd ../client
pm2 serve dist 5173 --name "antflow-client" --spa

# Save PM2 configuration
pm2 save
pm2 startup
```

5. **Configure Nginx**
```nginx
# /etc/nginx/sites-available/antflow
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization' always;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:4000/health;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/antflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

6. **Setup SSL with Let's Encrypt**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### Option 2: Docker Deployment

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    restart: always
    volumes:
      - mongodb_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    ports:
      - "27017:27017"

  backend:
    build:
      context: ./server
      dockerfile: Dockerfile
    restart: always
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://admin:${MONGO_PASSWORD}@mongodb:27017/flova?authSource=admin
      - JWT_SECRET=${JWT_SECRET}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET=${AWS_S3_BUCKET}
      - PUBLIC_BASE_URL=${PUBLIC_BASE_URL}
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./client
      dockerfile: Dockerfile
    restart: always
    ports:
      - "5173:5173"
    environment:
      - VITE_API_BASE_URL=${PUBLIC_BASE_URL}/api

volumes:
  mongodb_data:
```

**Server Dockerfile:**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 4000

CMD ["node", "dist/index.js"]
```

**Client Dockerfile:**
```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY pnpm-lock.yaml ./

RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]
```

### Option 3: Cloud Platform (Vercel + Railway)

**Frontend (Vercel):**
1. Connect GitHub repository to Vercel
2. Set build command: `cd client && pnpm build`
3. Set output directory: `client/dist`
4. Add environment variable: `VITE_API_BASE_URL`

**Backend (Railway):**
1. Connect GitHub repository to Railway
2. Set root directory: `server`
3. Add all environment variables
4. Deploy

## 🔧 Environment Variables

### Server (.env)

```env
# Server Configuration
PORT=4000
NODE_ENV=production
PUBLIC_BASE_URL=https://yourdomain.com

# Database
MONGODB_URI=mongodb://username:password@host:27017/flova

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# AWS S3 Storage
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-production-bucket

# AI Services (Optional - can be configured via Admin Settings)
GEMINI_API_KEY=AIza...

# Stripe Payments (Optional - can be configured via Admin Settings)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# OAuth Login (Optional - can be configured via Admin Settings)
GOOGLE_CLIENT_ID=...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
FACEBOOK_APP_ID=...
FACEBOOK_APP_SECRET=...

# Email (Optional - can be configured via Admin Settings)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=...
```

### Client (.env)

```env
VITE_API_BASE_URL=https://yourdomain.com/api
```

## 🔐 Security Checklist

- [ ] Use strong JWT_SECRET (min 32 characters)
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set secure cookie flags in production
- [ ] Use environment variables for all secrets
- [ ] Enable MongoDB authentication
- [ ] Restrict S3 bucket permissions
- [ ] Setup Stripe webhook signature verification
- [ ] Configure rate limiting
- [ ] Enable security headers (Helmet.js)

## 📊 Post-Deployment Setup

### 1. Create Admin Account

```bash
# Register via UI, then update in MongoDB:
mongo
use flova
db.users.updateOne(
  { email: "admin@yourdomain.com" },
  { $set: { role: "admin" } }
)
```

### 2. Configure Admin Settings

Navigate to `/admin/settings` and configure:

**General Tab:**
- SMTP settings for email
- AWS S3 credentials
- Stripe payment keys
- OAuth credentials (Google/Facebook)

**AI Models Tab:**
- Add AI provider API keys
- Configure default models
- Set credit costs

**Subscription Plans Tab:**
- Define pricing tiers
- Set monthly credits
- Configure credit packages

### 3. Setup Stripe Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://yourdomain.com/api/payment/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

### 4. Configure OAuth Apps

**Google OAuth:**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
4. Copy Client ID and Secret to Admin Settings

**Facebook OAuth:**
1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create app and add Facebook Login
3. Add redirect URI: `https://yourdomain.com/api/auth/facebook/callback`
4. Copy App ID and Secret to Admin Settings

## 🔄 Updates and Maintenance

### Update Application

```bash
# Pull latest changes
git pull origin main

# Install dependencies
pnpm install

# Build
pnpm build

# Restart services
pm2 restart all
```

### Backup Database

```bash
# Backup MongoDB
mongodump --uri="mongodb://user:pass@host:27017/flova" --out=/backup/$(date +%Y%m%d)

# Backup to S3
aws s3 sync /backup s3://your-backup-bucket/mongodb-backups/
```

### Monitor Logs

```bash
# PM2 logs
pm2 logs

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# MongoDB logs
tail -f /var/log/mongodb/mongod.log
```

## 🚨 Troubleshooting

### Issue: OAuth redirect fails
- Check redirect URIs match exactly in OAuth app settings
- Verify `PUBLIC_BASE_URL` is correct
- Check OAuth credentials in Admin Settings

### Issue: Video upload fails
- Verify S3 bucket permissions
- Check AWS credentials
- Ensure CORS is configured on S3 bucket

### Issue: Payment webhook not working
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint is accessible
- Review Stripe webhook logs

## 📈 Performance Optimization

1. **Enable Gzip Compression** in Nginx
2. **Setup CDN** for static assets (CloudFlare, AWS CloudFront)
3. **Database Indexing** for frequently queried fields
4. **Redis Caching** for session management
5. **Load Balancing** for high traffic

## 📞 Support

For deployment assistance, contact: support@flova.ai
