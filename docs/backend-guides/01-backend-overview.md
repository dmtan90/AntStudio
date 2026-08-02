# AntStudio Backend Overview

The AntStudio Backend is a robust Node.js/Express application designed to power the AntStudio platform's video editing, streaming, and collaboration features.

## 1. Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Real-time**: Socket.IO
- **Video Processing**: FFmpeg
- **Language**: TypeScript

## 2. Directory Structure

- `src/index.ts`: Application entry point.
- `src/routes/`: API route definitions (REST endpoints).
- `src/services/`: Business logic and external service integrations.
- `src/models/`: Mongoose database schemas.
- `src/middleware/`: Auth check, validation, and error handling.
- `src/utils/`: Helper functions (S3/B2, Logger).

## 3. Environment Variables (`.env.example` Schema)

Create a `.env` file in the root workspace directory with the exact keys defined in `.env.example`:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/antstudio

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# AWS S3
#STORAGE_PROVIDER=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
AWS_S3_ENDPOINT=https://s3.amazonaws.com

# BLAZE B2
STORAGE_PROVIDER=b2
BLAZE_B2_APPLICATION_ID=your-b2-application-id
BLAZE_B2_APPLICATION_KEY=your-b2-application-key
BLAZE_B2_BUCKET_NAME=your-b2-bucket

# GMICLOUD
GMI_API_KEY=your-gmicloud-api-key

# Google Enterprise Agent AI
GEMINI_MODEL_TEXT_ANALYSIS=gemini-3.1-flash-lite
GEMINI_MODEL_IMAGE_GENERATION=gemini-3.1-flash-lite-image
GEMINI_MODEL_VIDEO_GENERATION=veo-3.1-generate-001
GEMINI_MODEL_TTS=gemini-3.1-flash-tts-preview
GEMINI_MODEL_VOICE=gemini-live-2.5-flash-native-audio
GEMINI_MODEL_MUSIC=lyria-3-clip-preview
GEMINI_MODEL_AGENT=gemini-3.1-flash-lite

# Google Vertex AI
GCP_PROJECT=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=1
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-vertexai-credential-service-account.json

# Stripe
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-secret-webhook-secret

# Paypal
PAYPAL_CLIENT_ID=your-paypal-id
PAYPAL_CLIENT_SECRET=your-paypal-secret-key
PAYPAL_WEBHOOK_SECRET=whsec_your-paypal-webhook-secret

# SMTP (Email)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-email-password
SMTP_FROM_EMAIL=noreply@antstudio.io
SMTP_FROM_NAME=AntStudio

# Google OAuth refs
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Assets config
GIPHY_API_KEY=your-giphy-api-key
PEXELS_API_KEY=your-pexels-api-key
UNSPLASH_API_KEY=your-unsplash-api-key

# Application
PORT=5000
BASE_URL=http://localhost:5000
NODE_ENV=production

# License server
SYSTEM_MODE=master
MASTER_SERVER_URL=http://localhost:5000

# RTMP port for streaming
RTMP_PORT=1935
```

## 4. Getting Started

1. **Install Dependencies**:
    ```bash
    pnpm install
    ```
2. **Start Development Server**:
    ```bash
    pnpm dev
    ```
3. **Build for Production**:
    ```bash
    pnpm run build
    ```
