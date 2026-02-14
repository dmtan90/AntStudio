# AntFlow Development Guide

This guide is intended for developers who want to contribute to AntFlow or build upon it.

## 🏗️ Project Architecture

AntFlow is a monorepo containing both the frontend client and backend server.

```
AntFlow/
├── client/              # Frontend Application (Vue 3)
│   ├── src/
│   │   ├── components/  # Atomic UI Components
│   │   ├── views/       # Page-level Views
│   │   ├── stores/      # Pinia State Management
│   │   ├── hooks/       # Composition API Hooks
│   │   └── utils/       # Utility Functions
├── server/              # Backend Application (Node.js/Express)
│   ├── src/
│   │   ├── controllers/ # Request Handlers
│   │   ├── models/      # Mongoose Schema Definitions
│   │   ├── services/    # Business Logic Layer
│   │   ├── routes/      # API Route Definitions
│   │   └── utils/       # Shared Utilities
└── docker-compose.yml   # Docker Orchestration
```

### ⚙️ Architectural Constraints

- **Client-Side Assembly**: All video rendering and assembly for project exports **MUST** happen on the client-side via `useVideoAssembler` and `videoAssembly.worker.ts`.
- **Stateless Rendering**: The backend should not maintain a render queue or state for video assembly. It only accepts final `Blob` uploads via the `/upload-final-video` route.
- **Resource Offloading**: This architecture is designed to scale horizontally without requiring massive GPU instances for the backend.

## 🛠️ Tech Stack

### Frontend
- **Framework**: Vue 3 (Composition API)
- **Language**: TypeScript
- **Build Tool**: Vite
- **State Management**: Pinia
- **Styling**: TailwindCSS + Element Plus
- **Graphics**: Fabric.js (Canvas), Three.js (3D), WebGL
- **Video Processing**: FFmpeg.wasm + @webav/av-cliper (**Primary Assembly & Export Engine**)

### Backend
- **Runtime**: Node.js v18+
- **Framework**: Express.js
- **Database**: MongoDB v6.0+
- **Video Processing**: FFmpeg (Used for streaming relay & thumbnailing **ONLY**)
- **AI Integration**:
  - Google Gemini (Text/Analysis)
  - Google Veo (Video Generation)
  - ElevenLabs (Voice Synthesis)
  - Custom Tensor Models (local inference)

## 🚀 Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MongoDB >= 6.0
- FFmpeg (installed and added to system PATH)

### 1. Installation

Clone the repository and install dependencies for the entire workspace:

```bash
git clone https://github.com/dmtan90/AntFlow.git
cd AntFlow
pnpm install
```

### 2. Environment Configuration

#### Backend (.env)
Copy `server/.env.example` to `server/.env` and configure your keys:

```ini
PORT=4000
MONGODB_URI=mongodb://localhost:27017/antflow
JWT_SECRET=dev_secret_key_123

# Cloud Services (Optional for local dev, required for full features)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# AI Services
GEMINI_API_KEY=
ELEVENLABS_API_KEY=

# Payment Gateways
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=

# License Portal
LICENSE_PORTAL_URL=https://license.antflow.ai
LICENSE_VERIFICATION_KEY=
```

#### Frontend (.env)
Copy `client/.env.example` to `client/.env`:

```ini
VITE_API_BASE_URL=http://localhost:4000/api
```

### 3. Running the Application

You can run client and server independently or together.

**Run All (Root):**
```bash
pnpm dev
```

**Run Server Only:**
```bash
cd server
pnpm dev
```

**Run Client Only:**
```bash
cd client
pnpm dev
```

The application will be available at:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000`

### 4. Webhook Configuration (Payments)

To test payments locally, you need to expose your local server or use provider CLIs.

**Stripe:**
```bash
stripe listen --forward-to localhost:4000/api/webhooks/stripe
```
Copy the webhook secret (`whsec_...`) to your `.env` file.

**PayPal:**
1. Configure a webhook in the PayPal Developer Dashboard pointing to your ngrok URL (e.g., `https://your-ngrok.io/api/webhooks/paypal`).
2. Event types required: `PAYMENT.SALE.COMPLETED`, `BILLING.SUBSCRIPTION.CREATED`, `BILLING.SUBSCRIPTION.CANCELLED`.

## 🧪 Testing

We use Vitest for both unit and integration testing.

```bash
# Run all tests
pnpm test

# Run specific suite
pnpm test:unit
pnpm test:e2e
```

## 📝 Code Standards

- **Linting**: ESLint + Prettier are enforced via pre-commit hooks.
- **Commits**: Follow Conventional Commits format (e.g., `feat: add new timeline track`, `fix: resolve playback sync`).
- **Typing**: Strict TypeScript mode is enabled. Avoid `any` where possible.

## 📦 Build for Production

To build the production artifacts:

```bash
pnpm build
```

- Client artifacts will be in `client/dist`
- Server artifacts will be in `server/dist`

## 🤝 Contribution Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📚 Additional Resources

- [User Manual](./USER_MANUAL.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [API Documentation](./server/docs/API.md)
