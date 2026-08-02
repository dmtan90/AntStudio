# AntStudio Technical Wiki

Welcome to the **AntStudio Knowledge Base & Technical Wiki**. This document provides in-depth technical documentation covering system architecture, autonomous FSM loops, real-time streaming protocols, AI service managers, and desktop packaging.

---

## 📚 Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Specialized AI Workflows](#specialized-ai-workflows)
3. [24/7 Autonomous FSM Engine (`LiveSalesServiceV3`)](#247-autonomous-fsm-engine-livesalesservicev3)
4. [Real-time Communication & Socket Protocols](#real-time-communication--socket-protocols)
5. [Client-Side Decentralized Rendering Engine](#client-side-decentralized-rendering-engine)
6. [Desktop Application Engine (Electron)](#desktop-application-engine-electron)
7. [Internationalization & 5-Locale System](#internationalization--5-locale-system)
8. [API & Health Check Reference](#api--health-check-reference)

---

## 1. System Architecture Overview

AntStudio is built on a **Decentralized AI Rendering & Orchestration Architecture**:
- **Backend (Node.js/Express/MongoDB/Socket.IO)**: Serves as a data repository, RAG vector lookup engine, streaming relay bridge (FFmpeg/NMS), and autonomous sales FSM state coordinator.
- **Frontend (Vue 3/Vite/TypeScript)**: Handles UI interactions, WebGL virtual stages, real-time WebSockets, and client-side video composition using `@webav/av-cliper` & WebWorkers.
- **Desktop Launcher (Electron)**: Wraps the web application into native binaries for Windows, macOS, and Linux with auto-hiding menu bars and dev server URL fallback logic.

---

## 2. Specialized AI Workflows

AntStudio exposes 6 distinct video production modes via `ProjectCreationDialog.vue`:

| Workflow ID | Name | Route Target | Key Features |
|---|---|---|---|
| `ai-video` | Script-to-Video AI Engine | `/projects/new` | Storyboard generation, AI voiceover, BGM, animated captions |
| `avatar` | AI Digital Avatars & Personas | `/influencer` | 2D Photo avatars, 3D VRM models, Gemini TTS & lip-sync |
| `product-ads` | E-Commerce Product Ads Wizard | `/merchants` | URL scraper, product spec extraction, video ad generator |
| `sales-studio` | 24/7 Autonomous Sale Studio | `/live/sales` | FSM sales loop, AI host, dynamic QR, Flash Sale banner |
| `record` | Screen & Camera Recorder Studio | `/recorder` | Multi-track webcam, desktop screen & audio capture |
| `blank` | Multi-Track Canvas & Timeline Studio | `/projects/new` | Non-linear canvas editor, multi-track timelines |

---

## 3. 24/7 Autonomous FSM Engine (`LiveSalesServiceV3`)

The autonomous selling loop runs 24/7 via `LiveSalesServiceV3.ts`:

### FSM State Transitions

```
[GREETING] ──> [PITCHING] ──> [Q_AND_A (if chat detected)] ──> [CLOSING] ──> Rotate Next Product
```

1. **State `GREETING`**: AI Host welcomes new viewers and introduces the live session atmosphere.
2. **State `PITCHING`**:
   - Queries MongoDB product documents or RAG vector spec indexes.
   - Cleans product IDs into human-readable titles (e.g. *"Wyze Cam Floodlight v2"*).
   - Generates script steps containing text, gestures (`wave`, `excited`, `happy`), and speaker metadata.
3. **State `Q_AND_A`**:
   - Intercepts viewer chat messages stored in `unhandledChats`.
   - Generates a reactive Q&A response using Gemini text models.
4. **State `CLOSING`**:
   - Triggers urgency banners, flash-sale discount countdowns, and checkout QR code overlays.

### WS Directive Emission Code Pattern
```typescript
const stepPayload = {
    sessionId,
    state: step.state,
    text: step.text,
    type: step.type,
    gesture: step.gesture,
    speaker: step.speaker,
    productId: step.productId || ctx.highlightedProductId,
    title: step.title,
    scriptText: step.text,
    highlightProductId: step.productId || ctx.highlightedProductId,
    triggerDiscount: step.state === 'CLOSING'
};

socketServer.emitToRoom(sessionId, 'studio:state_change', stepPayload);
socketServer.emitToAll('studio:state_change', stepPayload);
```

---

## 4. Real-time Communication & Socket Protocols

All real-time collaboration and showrunner directives flow through Socket.IO (`path: '/socket.io'`):

### Primary Socket Events

- `studio:state_change`: Emitted by `LiveSalesServiceV3` when an FSM step or Q&A response is ready.
  - **Client Listener**: `ActionSyncService.ts` receives `studio:state_change` and dispatches `showrunner:directive` window event.
- `stream:relay`: Emitted by client WebRTC/Canvas encoder to stream raw video/audio chunks to backend FFmpeg NMS relay process.
- `comment:new` / `comment:add`: Real-time chat message broadcast.
- `users:update`: Active participant list and viewer count sync.

### Room Socket Management
- `socketServer.emitToRoom(roomId, event, data)`: Delivers messages directly to clients connected in a specific session room.
- `socketServer.getRoomSocketCount(roomId)`: Queries active WebSocket connections in a room to implement grace periods (60s empty room auto-stop).

---

## 5. Client-Side Decentralized Rendering Engine

To ensure infinite scalability without server-side GPU bottlenecks:
- **Assembly Worker**: `client/src/views/video-editor/workers/videoAssembly.worker.ts` executes multi-track layer blending, audio mixing, and WebM/MP4 encoding entirely in the user's browser.
- **Canvas Rendering**: Uses Fabric.js and WebGL shaders for real-time preview and export.
- **Export Upload**: Upon completion, the client uploads the finished video binary to `/upload-final-video` or S3 bucket.

---

## 6. Desktop Application Engine (Electron)

The desktop application (`electron/main.cjs`):
- Detects development environment:
  ```javascript
  if (process.env.NODE_ENV === "development") {
      mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL || serverUrl);
      mainWindow.webContents.openDevTools();
  } else {
      mainWindow.loadURL(serverUrl);
      mainWindow.setAutoHideMenuBar(true);
  }
  ```
- Exposes IPC preload bridge (`electron/preload.cjs`) for native file system access and screen capture source enumeration.

---

## 7. Internationalization & 5-Locale System

AntStudio supports 5 locales configured under `client/src/locales/`:
- `en.json`: English (Default)
- `vi.json`: Tiếng Việt
- `es.json`: Español
- `ja.json`: 日本語
- `zh.json`: 中文

Key translation structures:
- `marketing.projects.new.options.*`: Card titles, descriptions, and CTA button labels on the marketing landing page.
- `saleStudio.*`: Sale studio controls, live mode indicators, reconnecting alerts (`reconnectingMsg`), paused stream sub-banners.

---

## 8. API & Health Check Reference

### REST Health Endpoints
- `GET /health`: Returns `{ "status": "ok", "timestamp": "..." }`.
- `GET /api/health`: Alias returning `{ "status": "ok", "timestamp": "..." }`.

### Core API Groups
- `/api/auth/*`: Authentication, registration, JWT refresh, OAuth callbacks.
- `/api/projects/*`: Project workspace management & script analysis.
- `/api/streaming/*`: Autonomous stream launching, NMS stream relay controls.
- `/api/s3/*`: Asset uploads and signed URL generation.

---

*Last updated: August 2026 | Version: 1.0.0 (Singularity)*
