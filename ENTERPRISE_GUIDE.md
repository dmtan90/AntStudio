# AntStudio Enterprise: Self-Hosting & White-Labeling Guide

This guide is designed for Enterprise IT teams and B2B Resellers who are deploying AntStudio on private infrastructure.

## 🚀 One-Click Installation

The fastest way to deploy the AntStudio stack is using our automated setup utility:

```bash
# Download and run the setup script
curl -O https://raw.githubusercontent.com/antstudio/deploy/main/setup-enterprise.sh
chmod +x setup-enterprise.sh
./setup-enterprise.sh
```

## 🏗️ Architecture Overview

AntStudio Enterprise runs as a multi-container stack:
- **Frontend**: Nginx-hardened Vue.js application.
- **API Engine**: Node.js Express backend with Multi-tenant middleware.
- **Database**: MongoDB 6.0 with persistent volume mapping.
- **Media Engine**: FFmpeg-powered streaming relays.

## 🎨 White-Label Configuration

To customize the branding for your organization or clients, edit the `.env.enterprise` file:

```bash
# Branding
COMPANY_NAME="Your Brand Media"
LOGO_URL="https://cdn.yourdomain.com/logo.png"
PRIMARY_COLOR="#3b82f6"

# Host Configuration
BASE_DOMAIN="stream.yourcompany.com"
```

## ⚙️ Deployment Modes

AntStudio Enterprise supports two high-level business modes:

### 1. Internal Enterprise Mode (Private)
- **Use Case**: Communication for employees only.
- **Security**: Restricted to `@yourcompany.com` email domains.
- **Billing**: Users access Pro features via the corporate master license.

### 2. Public Reseller Mode (Business)
- **Use Case**: Reselling streaming services to end-users.
- **Gateway**: Integrates your own Stripe credentials for direct revenue.
- **Quotas**: Automated monthly credit refreshes (Free/Pro/Enterprise tiers).

## 🛡️ Maintenance & Security

### Backups
Data is stored in the `enterprise_mongo_data` Docker volume. We recommend daily snapshots:
```bash
docker exec antstudio-mongo-b2b mongodump --out /data/db/backups/$(date +%F)
```

### Health Monitoring
View the live dashboard at `http://your-domain/admin/tenant` to monitor organization-wide consumption and node health.

---
© 2026 AntStudio Enterprise Solutions. For VIP support, contact your dedicated account manager.
