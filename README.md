# AntFlow - AI-Powered Video Production Platform

> Transform your ideas into cinematic videos with AI. Everyone can be a director.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)](https://www.mongodb.com/)

## 🎬 Overview

AntFlow (Flova.ai) is a comprehensive AI-powered video production platform that enables users to create professional-quality videos from scripts or ideas. The platform leverages cutting-edge AI models for script analysis, storyboard generation, visual asset creation, and video assembly.

### Key Features

- 🤖 **AI-Powered Workflow**: Automated script analysis, character design, and storyboard generation
- 🎨 **Advanced Video Editor**: Professional timeline-based editor with effects and transitions
- 🎭 **Character Management**: Consistent character generation across scenes with detailed customization
- 🎵 **Audio Integration**: AI voice synthesis and background music generation
- 📊 **Credit System**: Flexible credit-based pricing with subscription plans
- 🔐 **OAuth Login**: Google and Facebook authentication support
- 🌐 **Multi-language**: Support for English, Vietnamese, Chinese, Japanese, and Spanish
- 📱 **Social Integration**: Direct publishing to YouTube and Facebook
- 💳 **Stripe Payments**: Subscription management and credit purchases

## 🏗️ Architecture

### Monorepo Structure

```
flova.ai/
├── client/              # Vite + Vue 3 frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── views/       # Page components
│   │   ├── stores/      # Pinia state management
│   │   ├── utils/       # Helper functions
│   │   └── locales/     # i18n translations
│   └── package.json
├── server/              # Express.js backend
│   ├── src/
│   │   ├── models/      # MongoDB schemas
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── utils/       # Helper utilities
│   │   └── middleware/  # Auth & validation
│   └── package.json
└── pnpm-workspace.yaml
```

### Tech Stack

**Frontend:**
- Vue 3 + TypeScript
- Vite (build tool)
- Pinia (state management)
- Vue Router
- Element Plus (UI components)
- Fabric.js (canvas editing)
- FFmpeg.js (video processing)

**Backend:**
- Node.js + Express
- MongoDB + Mongoose
- JWT authentication
- AWS S3 (file storage)
- Stripe (payments)
- Google Gemini AI
- OAuth 2.0 (Google/Facebook)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- MongoDB 6.0+
- AWS S3 account (for media storage)
- Google Gemini API key
- Stripe account (for payments)
- Google/Facebook OAuth credentials (optional)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/flova.ai.git
cd flova.ai
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Configure environment variables**

Create `server/.env`:
```env
# Server
PORT=4000
NODE_ENV=development
PUBLIC_BASE_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/flova

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-bucket-name

# AI Services (configured via Admin Settings)
GEMINI_API_KEY=your-gemini-api-key

# Stripe (optional - can be configured via Admin Settings)
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-webhook-secret

# OAuth (optional - can be configured via Admin Settings)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
```

Create `client/.env`:
```env
VITE_API_BASE_URL=http://localhost:4000/api
```

4. **Run the application**
```bash
# Development mode (both client and server)
pnpm dev

# Or run separately
pnpm dev:client  # Frontend on http://localhost:5173
pnpm dev:server  # Backend on http://localhost:4000
```

5. **Access the application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000/api
- Health check: http://localhost:4000/health

## 📖 Documentation

### Admin Setup

1. **Create Admin Account**
   - Register a new account via `/register`
   - Update user role to 'admin' in MongoDB:
   ```javascript
   db.users.updateOne(
     { email: "admin@example.com" },
     { $set: { role: "admin" } }
   )
   ```

2. **Configure AI Providers** (Admin > Settings > AI Models)
   - Add API keys for Google Gemini, OpenAI, etc.
   - Configure default models for text, image, video, audio, music
   - Set credit costs per model

3. **Setup OAuth Login** (Admin > Settings > General)
   - Enable Google/Facebook OAuth
   - Enter Client ID and Client Secret
   - Save settings

4. **Configure Payment Plans** (Admin > Settings > Subscription Plans)
   - Define subscription tiers (Free, Pro, Enterprise)
   - Set monthly credits and pricing
   - Configure credit packages

### User Features

**Project Creation:**
1. Create project from topic/idea or upload script
2. AI analyzes content and generates creative brief
3. Review and approve storyboard
4. Generate visual assets (characters, scenes)
5. Assemble video with timeline editor
6. Export and publish

**Credit System:**
- Credits consumed for AI operations (text, image, video generation)
- Balance = Membership + Bonus + Weekly credits
- Purchase credit packages or subscribe for monthly credits

**Social Login:**
- Login with Google or Facebook (if enabled by admin)
- Automatic account creation or linking
- New users receive 500 free credits

## 🛠️ Development

### Project Scripts

```bash
# Development
pnpm dev              # Run both client and server
pnpm dev:client       # Run frontend only
pnpm dev:server       # Run backend only

# Build
pnpm build            # Build both client and server
pnpm build:client     # Build frontend
pnpm build:server     # Build backend

# Production
pnpm start:client     # Serve built frontend
pnpm start:server     # Run production backend
```

### API Documentation

See [API.md](./docs/API.md) for detailed API endpoint documentation.

### Database Schema

See [SCHEMA.md](./docs/SCHEMA.md) for MongoDB collection schemas.

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment instructions.

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- Element Plus for UI components
- Fabric.js for canvas editing
- FFmpeg.js for video processing

## 📞 Support

For support, email support@flova.ai or join our Discord community.

---

**Made with ❤️ by the AntFlow Team**
