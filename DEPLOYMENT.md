# Deployment Guide for AntFlow

AntFlow is built with Nuxt 3 and Nitro, which can be deployed to almost any provider (Vercel, Netlify, Railway, VPS).

## 1. Environment Setup

Ensure the following variables are set in your production environment:

### Core
- `BASE_URL`: The public URL of your app (e.g., `https://flova.ai`).
- `MONGODB_URI`: Connection string for your production MongoDB.
- `JWT_SECRET`: A long, random string for authentication.

### AI Services
- `GEMINI_API_KEY`: Main API key for script analysis and images.
- `GEMINI_API_KEYS`: (Optional) Comma-separated list for rotation.

### Storage
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`.
- `AWS_S3_BUCKET`: The production S3 bucket name.

### Payments
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`.
- `STRIPE_WEBHOOK_SECRET`: Obtain this after setting up your webhook endpoint to `https://yourdomain.com/api/payment/webhook`.

### Social Integrations
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`.
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_REDIRECT_URI`.

## 2. Deployment Options

### VPS (Docker or PM2)
Nuxt 3 can be built into a standalone Node.js server.
```bash
npm run build
# Start with PM2
pm2 start .output/server/index.mjs
```

### Vercel / Netlify
Nuxt 3 has built-in presets for these providers. Simply push to Git and configure environment variables in the provider's dashboard.

## 3. Post-Deployment Steps

1. **Initialize Admin**: Log in as a regular user, then manually change your `role` to `admin` in the MongoDB `users` collection.
2. **Configure Settings**: Go to `/admin/settings` and ensure your API keys and SMTP settings are correctly saved in the database.
3. **Check Webhooks**: Test the Stripe webhook to ensure subscriptions are correctly synchronized.

## 4. Maintenance
- Regularly monitor `/admin` for system health and storage usage.
- Rotate Gemini API keys if usage limits are reached.
