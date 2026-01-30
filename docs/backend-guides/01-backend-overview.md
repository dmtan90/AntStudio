# AntFlow Backend Overview

The AntFlow Backend is a robust Node.js/Express application designed to power the AntFlow platform's video editing, streaming, and collaboration features.

## 1. Tech Stack

-   **Runtime**: Node.js (v18+)
-   **Framework**: Express.js
-   **Database**: MongoDB (Mongoose ORM)
-   **Real-time**: Socket.IO
-   **Video Processing**: FFmpeg (via Fluent-FFmpeg & FFmpeg-Kit)
-   **Streaming**, Ant Media Server Integration
-   **Language**: TypeScript

## 2. Directory Structure

-   `src/index.ts`: Application entry point.
-   `src/routes/`: API route definitions (REST endpoints).
-   `src/services/`: Business logic and external service integrations (Video, AI, Streaming).
-   `src/models/`: Mongoose database schemas.
-   `src/middleware/`: Auth check, validation, and error handling.
-   `src/utils/`: Helper functions (S3, Logger).

## 3. Environment Variables

Create a `.env` file in the `server/` root with the following keys:

```bash
# Server Configuration
PORT=3000
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/antflow

# Security
JWT_SECRET=your_super_secret_key
JWT_EXPIRES_IN=7d

# File Storage (AWS S3)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=antflow-assets

# AI Services
OPENAI_API_KEY=sk-...
ELEVENLABS_API_KEY=...

# Streaming Server
ANT_MEDIA_URL=https://your-ant-media-server.com:5443
ANT_MEDIA_APP_NAME=WebRTCAppEE
ANT_MEDIA_SECRET=...
```

## 4. Getting Started

1.  **Install Dependencies**:
    ```bash
    cd server
    npm install
    ```
2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
3.  **Build for Production**:
    ```bash
    npm run build
    npm start
    ```
