# AntStudio Wiki

Welcome to the AntStudio documentation wiki. This guide covers all aspects of the platform.

## 📚 Table of Contents

1. [Getting Started](#getting-started)
2. [User Guide](#user-guide)
3. [Admin Guide](#admin-guide)
4. [Developer Guide](#developer-guide)
5. [API Reference](#api-reference)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### What is AntStudio?

AntStudio is an AI-powered video production platform that transforms scripts and ideas into professional cinematic videos. The platform automates the entire video production workflow from script analysis to final video assembly.

### Key Concepts

**Credits System:**
- Credits are consumed for AI operations (text, image, video generation)
- Balance = Membership Credits + Bonus Credits + Weekly Credits
- Membership credits from subscription plans
- Bonus credits from promotions
- Weekly credits refresh every week

**Project Workflow:**
1. Create project (from topic or script upload)
2. AI analyzes and generates creative brief
3. Review storyboard with character and scene designs
4. Generate visual assets (images/videos)
5. Edit timeline with advanced editor
6. Export final video

**User Roles:**
- **User**: Standard account with project creation and editing
- **Admin**: Full system access including settings and user management

---

## User Guide

### Creating Your First Project

1. **Navigate to Dashboard**
   - Click "Start New Project" button

2. **Choose Input Method**
   - **Topic Mode**: Describe your video idea
   - **Upload Mode**: Upload script file (txt, pdf, docx, pptx)

3. **Enter Project Details**
   - Project title
   - Description (optional)
   - Topic/idea or upload file

4. **AI Analysis**
   - Wait for AI to analyze content
   - Review script analysis, creative brief, and storyboard
   - Click "Re-Generate" if needed

5. **Generate Visual Assets**
   - Review character designs
   - Customize characters if needed
   - Generate scene images/videos
   - Add voiceover and music

6. **Edit Timeline**
   - Arrange clips on timeline
   - Adjust timing and transitions
   - Add effects and filters
   - Preview final video

7. **Export**
   - Click "Export" → "Full Video (.mp4)"
   - Wait for processing
   - Download or publish to YouTube/Facebook

### Managing Credits

**View Balance:**
- Dashboard shows current credit balance
- Click on balance to see breakdown

**Purchase Credits:**
- Navigate to Subscription page
- Choose credit package
- Complete Stripe checkout

**Subscription Plans:**
- **Free**: 500 credits/month
- **Pro**: 2000 credits/month + priority support
- **Enterprise**: 6000 credits/month + priority support

**Credit Costs:**
- Text generation: 1 credit
- Image generation: 4 credits
- Video generation: 10 credits
- Audio/TTS: 1 credit
- Music generation: 5 credits

### Social Account Integration

**Connect YouTube:**
1. Open Account Dialog (click avatar)
2. Go to "Integrations" tab
3. Click "Connect YouTube"
4. Authorize access
5. Select channel

**Connect Facebook:**
1. Open Account Dialog
2. Go to "Integrations" tab
3. Click "Connect Facebook"
4. Authorize access
5. Select page

**Publishing Videos:**
- After exporting video
- Click "Share" → "YouTube" or "Facebook"
- Add title, description, tags
- Publish

### Profile Settings

**Update Profile:**
- Name, avatar, language
- Change password
- View credit history

**Notification Preferences:**
- Email notifications
- Project updates
- Credit alerts

---

## Admin Guide

### Accessing Admin Panel

Navigate to `/admin` (visible only to admin users)

### System Settings

**General Tab:**

1. **SMTP Configuration**
   - Host, port, credentials
   - From email and name
   - Test email sending

2. **AWS S3 Storage**
   - Access key and secret
   - Bucket name and region
   - Endpoint (optional)

3. **Stripe Payments**
   - Public and secret keys
   - Webhook secret
   - Test mode toggle

4. **Social Login (OAuth)**
   - **Google OAuth**:
     - Enable/disable toggle
     - Client ID and secret
   - **Facebook OAuth**:
     - Enable/disable toggle
     - App ID and secret

**AI Models Tab:**

1. **AI Providers**
   - Add/edit/delete providers
   - Configure API keys
   - Set supported types
   - Enable/disable providers

2. **Task Defaults**
   - Select default provider and model for:
     - Text generation
     - Image generation
     - Video generation
     - Audio/TTS
     - Music generation
   - Set credit costs per task

3. **AI Models**
   - Add custom models
   - Configure credit costs
   - Enable/disable models

**Subscription Plans Tab:**

1. **Membership Plans**
   - Define tiers (Free, Pro, Enterprise)
   - Set monthly/yearly pricing
   - Configure monthly credits
   - Enable priority support

2. **Credit Packages**
   - Create one-time credit packages
   - Set credits and pricing
   - Enable/disable packages

### User Management

**View Users:**
- List all registered users
- Search and filter
- View user details

**Manage Users:**
- Change user role (user/admin)
- Activate/deactivate accounts
- View credit history
- Reset passwords

### OAuth Setup Guide

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI:
   ```
   https://yourdomain.com/api/auth/google/callback
   ```
6. Copy Client ID and Client Secret
7. Paste in Admin Settings → General → Social Login
8. Enable Google OAuth toggle
9. Save settings

**Facebook OAuth:**

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create new app
3. Add "Facebook Login" product
4. Configure OAuth redirect URIs:
   ```
   https://yourdomain.com/api/auth/facebook/callback
   ```
5. Copy App ID and App Secret
6. Paste in Admin Settings → General → Social Login
7. Enable Facebook OAuth toggle
8. Save settings

---

## Developer Guide

### Architecture Overview

**Frontend (Client):**
- Vue 3 + TypeScript
- Vite build tool
- Pinia state management
- Vue Router for navigation
- Element Plus UI components

**Backend (Server):**
- Express.js REST API
- MongoDB with Mongoose
- JWT authentication
- AWS S3 file storage
- Stripe payment processing

### Project Structure

```
AntStudio/
├── client/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/           # Base components (GButton, GInput, etc.)
│   │   │   ├── projects/     # Project-specific components
│   │   │   └── layout/       # Layout components
│   │   ├── views/            # Page components
│   │   │   ├── auth/         # Login, Register, Reset Password
│   │   │   ├── user/         # Dashboard, Projects, Gallery, Resources
│   │   │   ├── project/      # Project Editor
│   │   │   ├── admin/        # Admin Settings
│   │   │   └── video-editor/ # Advanced video editor
│   │   ├── stores/           # Pinia stores
│   │   │   ├── user.ts       # User state and auth
│   │   │   ├── project.ts    # Project state
│   │   │   ├── media.ts      # Media management
│   │   │   ├── admin.ts      # Admin settings
│   │   │   └── ui.ts         # UI state
│   │   ├── utils/            # Helper functions
│   │   │   ├── api.ts        # Axios instance
│   │   │   └── vidmateAdapter.ts # Video editor adapter
│   │   ├── locales/          # i18n translations
│   │   │   ├── en.json
│   │   │   ├── vi.json
│   │   │   └── ...
│   │   └── composables/      # Vue composables
│   └── package.json
├── server/
│   ├── src/
│   │   ├── models/           # MongoDB schemas
│   │   │   ├── User.ts
│   │   │   ├── Project.ts
│   │   │   ├── Media.ts
│   │   │   ├── Payment.ts
│   │   │   └── AdminSettings.ts
│   │   ├── routes/           # API endpoints
│   │   │   ├── auth.ts       # Authentication
│   │   │   ├── projects.ts   # Project CRUD
│   │   │   ├── media.ts      # Media upload/management
│   │   │   ├── payment.ts    # Stripe integration
│   │   │   ├── social.ts     # Social integrations
│   │   │   ├── admin.ts      # Admin operations
│   │   │   └── aiConfig.ts   # AI configuration
│   │   ├── services/         # Business logic
│   │   │   ├── email.ts
│   │   │   ├── scriptAnalyzer.ts
│   │   │   └── storyboardGenerator.ts
│   │   ├── utils/            # Helper utilities
│   │   │   ├── config.ts
│   │   │   ├── db.ts
│   │   │   ├── jwt.ts
│   │   │   ├── s3.ts
│   │   │   ├── gemini.ts
│   │   │   ├── googleAuth.ts
│   │   │   ├── facebookAuth.ts
│   │   │   └── credits.ts
│   │   ├── middleware/       # Express middleware
│   │   │   └── auth.ts
│   │   └── index.ts          # Server entry point
│   └── package.json
└── pnpm-workspace.yaml
```

### Database Schema

**User Collection:**
```typescript
{
  email: string
  passwordHash: string
  name: string
  avatar?: string
  role: 'user' | 'admin'
  subscription: {
    plan: 'free' | 'pro' | 'enterprise'
    status: 'active' | 'cancelled' | 'expired'
    stripeCustomerId?: string
    stripeSubscriptionId?: string
  }
  credits: {
    balance: number
    membership: number
    bonus: number
    weekly: number
  }
  creditLogs: [{
    type: 'consumed' | 'obtained'
    amount: number
    description: string
    timestamp: Date
  }]
  oauthProviders?: {
    google?: { id: string, email: string }
    facebook?: { id: string, email: string }
  }
  socialAccounts: {
    youtube?: { accessToken, refreshToken, channelId }
    facebook?: { accessToken, pageId }
  }
}
```

**Project Collection:**
```typescript
{
  userId: ObjectId
  title: string
  description?: string
  status: 'draft' | 'analyzing' | 'storyboard' | 'generating' | 'completed'
  inputType: 'topic' | 'upload'
  inputData: { topic?: string, fileUrl?: string }
  analysis: { /* AI analysis results */ }
  storyboard: { /* Generated storyboard */ }
  advancedEditorState?: { /* Video editor state */ }
  exportedVideoUrl?: string
}
```

### API Endpoints

**Authentication:**
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with email/password
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/facebook` - Initiate Facebook OAuth
- `GET /api/auth/facebook/callback` - Facebook OAuth callback
- `GET /api/auth/oauth-config` - Get enabled OAuth providers
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/change-password` - Change password

**Projects:**
- `GET /api/projects` - List user projects
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/analyze` - Analyze script
- `POST /api/projects/:id/generate-storyboard` - Generate storyboard
- `POST /api/projects/:id/export` - Export video

**Media:**
- `GET /api/media` - List user media
- `POST /api/media/upload` - Upload file
- `DELETE /api/media/:id` - Delete media

**Payments:**
- `GET /api/payment/history` - Get payment history
- `POST /api/payment/create-checkout` - Create Stripe checkout
- `POST /api/payment/webhook` - Stripe webhook handler

**Admin:**
- `GET /api/admin/settings` - Get admin settings
- `PUT /api/admin/settings` - Update admin settings
- `GET /api/admin/users` - List all users
- `PUT /api/admin/users/:id` - Update user

### Adding New Features

**1. Add New AI Provider:**

```typescript
// server/src/utils/newProvider.ts
export const generateWithNewProvider = async (prompt: string) => {
  // Implementation
}

// Add to Admin Settings UI
// Configure in AI Providers section
```

**2. Add New Payment Plan:**

```typescript
// Update in Admin Settings → Subscription Plans
{
  name: 'Premium',
  price: 49,
  yearlyPrice: 490,
  currency: 'usd',
  features: {
    monthlyCredits: 4000,
    prioritySupport: true
  }
}
```

**3. Add New Language:**

```typescript
// client/src/locales/de.json
{
  "nav": {
    "home": "Startseite",
    // ... translations
  }
}

// client/src/composables/useTranslations.ts
export type Locale = 'en' | 'vi' | 'zh' | 'ja' | 'es' | 'de'
```

---

## API Reference

See [API.md](./API.md) for detailed API documentation.

---

## Troubleshooting

### Common Issues

**Issue: Login fails with "Invalid credentials"**
- Verify email and password are correct
- Check MongoDB connection
- Ensure user exists in database

**Issue: OAuth login redirects to error page**
- Check OAuth credentials in Admin Settings
- Verify redirect URIs match exactly
- Ensure OAuth provider is enabled

**Issue: Video upload fails**
- Check S3 credentials and bucket permissions
- Verify file size is within limits
- Check network connectivity

**Issue: Credits not deducted after AI operation**
- Check credit logs in user profile
- Verify AI provider is configured
- Review server logs for errors

**Issue: Stripe webhook not working**
- Verify webhook secret matches Stripe dashboard
- Check webhook endpoint is accessible
- Review Stripe webhook logs

### Getting Help

- **Documentation**: Read this wiki thoroughly
- **GitHub Issues**: Report bugs and feature requests
- **Email Support**: dmtan90@gmail.com
- **Discord Community**: Join for real-time help

---

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

**Last Updated**: January 2026
**Version**: 2.0.0
