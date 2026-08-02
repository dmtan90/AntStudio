# AntStudio - Developer Guide

This guide describes the architecture, codebase structure, development setup, and coding conventions for AntStudio developers and contributors.

---

## 🏗️ Project Architecture

AntStudio is structured as a TypeScript monorepo managed via `pnpm` workspaces:

```
AntStudio/
├── client/              # Frontend Application (Vue 3 + Vite + TypeScript)
│   ├── src/
│   │   ├── components/  # Reusable UI & Dialog Components (ProjectCreationDialog.vue, AppNavbar.vue)
│   │   ├── views/       # Application Views (LandingPage.vue, SaleStudio.vue, LiveStudio.vue)
│   │   ├── stores/      # Pinia Stores (studio.ts, user.ts, editor.ts)
│   │   ├── utils/ai/    # AI Service Clients (ActionSyncService.ts, StudioDirector.ts)
│   │   └── locales/     # 5-Locale Dictionaries (en.json, vi.json, es.json, ja.json, zh.json)
├── server/              # Backend Server (Node.js + Express + Socket.IO + MongoDB)
│   ├── src/
│   │   ├── models/      # Mongoose Schemas (User.ts, Product.ts, StreamSession.ts)
│   │   ├── routes/      # REST API Controllers (/api/auth, /api/projects, /api/health)
│   │   ├── services/
│   │   │   ├── ai/      # LiveSalesServiceV3.ts (FSM loop), AIServiceManager.ts
│   │   │   └── streaming/ SocketServer.ts (WS manager), StreamingService.ts (FFmpeg relay)
│   │   └── index.ts     # Express server entry point (supports /health & /api/health)
├── electron/            # Electron Desktop Launcher
│   ├── main.cjs         # Electron main process (supports dev URL & auto-hide menu bar)
│   └── preload.cjs      # IPC bridge
└── docs/                # Comprehensive platform documentation
```

---

## 📡 WebSocket & Autonomous FSM Architecture

### 1. FSM Loop (`LiveSalesServiceV3.ts`)
- **Session FSM Engine**: Manages autonomous 24/7 sales streams.
- **State Machine States**: `GREETING` -> `PITCHING` -> `Q_AND_A` -> `CLOSING`.
- **WebSocket Broadcast**:
  - Emits `studio:state_change` to room subscribers via `socketServer.emitToRoom(sessionId, 'studio:state_change', payload)` and to all clients via `socketServer.emitToAll('studio:state_change', payload)`.
  - Room Connection Monitoring: Calls `await socketServer.getRoomSocketCount(sessionId)` to detect active WS clients.

### 2. Client Receiver (`ActionSyncService.ts`)
- Listens to `studio:state_change` socket events.
- Normalizes script payloads and dispatches `window.dispatchEvent(new CustomEvent('showrunner:directive', { detail: normalizedStep }))`.
- Handlers in `SaleStudio.vue`, `SyntheticGuestManager.ts`, and `NeuralAudioDirector.ts` intercept `showrunner:directive` to display speech text and trigger voice synthesis instantly.

---

## 🛠️ Environment & Setup

### Environment Configuration (`.env.example` Schema)

Copy `.env.example` to `.env` in the root workspace. All backend services parse environment keys directly from this schema:

```env
# MongoDB & JWT
MONGODB_URI=mongodb://localhost:27017/antstudio
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Storage (S3 or B2)
STORAGE_PROVIDER=b2
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_S3_BUCKET=your-s3-bucket
AWS_S3_ENDPOINT=https://s3.amazonaws.com
BLAZE_B2_APPLICATION_ID=your-b2-application-id
BLAZE_B2_APPLICATION_KEY=your-b2-application-key
BLAZE_B2_BUCKET_NAME=your-b2-bucket

# Google Enterprise & Vertex AI Models
GEMINI_MODEL_TEXT_ANALYSIS=gemini-3.1-flash-lite
GEMINI_MODEL_IMAGE_GENERATION=gemini-3.1-flash-lite-image
GEMINI_MODEL_VIDEO_GENERATION=veo-3.1-generate-001
GEMINI_MODEL_TTS=gemini-3.1-flash-tts-preview
GEMINI_MODEL_VOICE=gemini-live-2.5-flash-native-audio
GEMINI_MODEL_MUSIC=lyria-3-clip-preview
GEMINI_MODEL_AGENT=gemini-3.1-flash-lite
GCP_PROJECT=your-gcp-project-id
GCP_LOCATION=us-central1
GOOGLE_GENAI_USE_VERTEXAI=1
GOOGLE_APPLICATION_CREDENTIALS=path/to/your/google-vertexai-credential-service-account.json

# Application & Streaming Server
PORT=5000
BASE_URL=http://localhost:5000
NODE_ENV=production
RTMP_PORT=1935
```

---

## 🚀 Development & Build Scripts

| Command | Action |
|---|---|
| `pnpm dev` | Runs Vite Client (`:3000`) and Express Server (`:4000`) concurrently |
| `pnpm run dev:electron` | Starts dev server and launches Electron desktop window |
| `pnpm run build:client` | Compiles Vue 3 frontend bundle (`client/dist`) |
| `pnpm run build:electron` | Packages standard Electron desktop executable binaries |
| `node electron/build.cjs --env=.env.electron` | Packages Electron desktop app with embedded encrypted `.env.enc` resource |
| `pnpm run test` | Runs workspace unit and integration test suite |

---

## 🌍 i18n Localization Workflow

Marketing and application strings are located under `client/src/locales/`:
- `en.json` (English)
- `vi.json` (Vietnamese)
- `es.json` (Spanish)
- `ja.json` (Japanese)
- `zh.json` (Chinese)

To add new localized strings:
1. Add the key under `marketing.projects.new.options.*` or `saleStudio.*` in `en.json`.
2. Replicate the key across `vi.json`, `es.json`, `ja.json`, and `zh.json`.
3. Reference in Vue template: `{{ $t('key.name') }}` or `$t('key.name', { param: val })`.

---

## 🛡️ Coding Standards

- **Code Language**: All code, variables, function names, and comments **MUST** be written in English.
- **Strict TypeScript**: Avoid `any` types where possible.
- **Client-Side Rendering Principle**: Video assembly and final MP4 export are performed on the browser side via `@webav/av-cliper` and WebWorkers to offload backend CPU/GPU usage.
