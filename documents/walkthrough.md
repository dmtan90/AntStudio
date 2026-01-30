# Walkthrough - Build & Verification

This walkthrough describes how to build and verify the AntStudio fixes.

## Prerequisites
- Node.js 18+
- PNPM

## 1. Building the Client
To compile the Vue.js frontend:

```bash
cd client
pnpm install
pnpm build
```
**Expected Output**: `Build complete. dist/ created.`

## 2. Building the Server
To compile the TypeScript backend:

```bash
cd server
pnpm install
pnpm build
```
**Expected Output**: `tsc` completes with Exit Code 0.

## 3. Running the Application
After building, you can run the stack locally:

```bash
# In Root
pnpm dev
# OR
docker-compose up
```

## 4. Verification Checklist
- [x] Client builds without TypeScript errors.
- [x] Server builds without TypeScript errors.
- [x] Check for runtime crashes on startup.
- [x] Verify `WebhookService` sends events correctly.
- [x] Verify Video Editor toolbar icons load correctly (stroke-width fixes).
- [x] Verify Audio Visualizer loads props correctly (Bar/Circle/Line types).
