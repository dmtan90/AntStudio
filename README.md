# Flova.ai - Decoupled Architecture

This project has been restructured into a monorepo with independent frontend and backend services.

## Project Structure

```
flova.ai/
├── client/          # Nuxt.js frontend application
├── server/          # Express.js backend API
└── pnpm-workspace.yaml
```

## Development

### Prerequisites
- Node.js 18+
- pnpm
- MongoDB

### Environment Setup

1. **Client** (`client/.env`):
```env
BASE_URL=http://localhost:3000
API_BASE_URL=http://localhost:4000
STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

2. **Server** (`server/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/flova
JWT_SECRET=your_secret_key
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
AWS_S3_BUCKET=flova-assets
GEMINI_API_KEY=your_gemini_key
# ... other keys
```

### Running the Application

```bash
# Install all dependencies
pnpm install

# Run both client and server concurrently
pnpm dev

# Or run separately:
pnpm dev:client  # Frontend on :3000
pnpm dev:server  # Backend on :4000
```

### Building for Production

```bash
# Build client
pnpm build:client

# Build server
pnpm build:server
```

## Architecture

- **Frontend (Client)**: Nuxt 4 application with Vue 3, Pinia, Element Plus
- **Backend (Server)**: Express.js REST API with MongoDB, JWT auth, AWS S3
- **Communication**: Frontend calls backend via HTTP API (CORS enabled)

## Migration Notes

The project was migrated from a monolithic Nuxt application to a decoupled architecture for better scalability and deployment flexibility. All API routes previously in `server/api/*` are now Express routes in the standalone backend.
