import express from 'express';
import fs from 'fs';
import http from 'http';
import net from 'net';
// @ts-ignore
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cors from 'cors';
import { configService, EnvConfig } from './utils/ConfigService.js';
import { connectDB } from './utils/db.js';
import authRouter from './routes/auth.js';
import s3Router from './routes/s3.js';
import projectsRouter from './routes/projects.js';
import adminRouter from './routes/admin.js';
import aiConfigRouter from './routes/AiConfig.js'; // Changed from aiConfigRoutes
import mediaRouter from './routes/media.js';
import aiRouter from './routes/ai.js';
import promptsRouter from './routes/prompts.js';
// import templatesRouter from './routes/templates.js';
import voiceRouter from './routes/voice.js';
import platformsRouter from './routes/platforms.js';
import streamingRouter from './routes/streaming.js';
import mobileStreamingRouter from './routes/MobileStreaming.js';
import broadcasterRouter from './routes/broadcaster.js';
import networkRouter from './routes/network.js';
import organizationRoutes from './routes/organizations.js';
import developerRoutes from './routes/developer.js';
import influencerRouter from './routes/influencer.js';
import liveRouter from './routes/live.js';

import releaseRouter from './routes/release.js';
import paymentRouter from './routes/payment.js';
import socialRouter from './routes/social.js';
import syndicationRouter from './routes/syndication.js';
import configsRouter from './routes/configs.js';
import videosRouter from './routes/videos.js';
import analyticsRouter from './routes/analytics.js';
import licenseRouter from './routes/license.js';
import collaborationRouter from './routes/collaboration.js';
import aiAccountsRouter from './routes/AiAccounts.js';
import aiAuthRouter from './routes/AiAuth.js';
import commerceRouter from './routes/commerce.js';
import monitoringRouter from './routes/monitoring.js';
import { monitoringService } from './services/system/MonitoringService.js';
import { Logger } from './utils/Logger.js';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyAuthMiddleware } from './middleware/ApiKeyAuth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { creditRefreshService } from './services/system/CreditRefreshService.js';
import { referralMiddleware } from './middleware/referral.js';
import resaleBillingRouter from './routes/ResaleBilling.js';
import affiliateRouter from './routes/affiliate.js';
import subTenantRouter from './routes/SubTenant.js';
import marketplaceRouter from './routes/marketplace.js';
import headlessRouter from './routes/headless.js';
import mobileRouter from './routes/mobile.js';
import moderationRouter from './routes/moderation.js';
import commentsRouter from './routes/comments.js';
import versionsRouter from './routes/versions.js';
// import { recoveryService } from './services/RecoveryService.js';
import { apiKeyMiddleware } from './middleware/ApiKey.js';
import showRouter from './routes/show.js';
import economyRouter from './routes/economy.js';
import gamificationRouter from './routes/gamification.js';
import { createServer } from 'http';
import { socketServer } from './services/streaming/SocketServer.js';
import { collaborationService } from './services/streaming/CollaborationService.js';
import { LicenseService } from './services/system/LicenseService.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeLiveWebSocket } from './routes/live.js';
import { streamingService } from './services/streaming/StreamingService.js';
import envRouter from './routes/env.js';
import { flowSyncService } from './utils/ai/FlowSyncService.js';
import webhooksRouter from './routes/webhooks.js';
import agentChatRouter from './routes/AgentChat.js';
import googleAgentRouter from './routes/GoogleAgent.js';
import { aiManager } from '~/utils/ai/AIServiceManager.js';
import { ensurePlaywrightBrowsers } from '~/utils/PlaywrightHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Trust proxy if behind Nginx/Load Balancer
app.set('trust proxy', 1);

// Middleware
// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for S3/Media
    contentSecurityPolicy: false, // Disable CSP for now as it can break some frontend features if not tuned
}));

app.use(cors({
    origin: EnvConfig.baseUrl,
    credentials: true
}));

// Security headers for FFmpeg.js (SharedArrayBuffer support) & OAuth Popups
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Capture raw body for Stripe webhooks
app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
        // Raw bytes are needed for webhook signature verification (Stripe, Facebook)
        if (req.originalUrl.startsWith('/api/payment/webhook') || req.originalUrl.startsWith('/api/webhooks/')) {
            req.rawBody = Buffer.from(buf);
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// NoSQL Injection Protection
app.use(mongoSanitize());

const isPkg = typeof (process as any).pkg !== 'undefined';
const resourcesClientDist = (process as any).resourcesPath ? path.join((process as any).resourcesPath, 'client/dist') : '';

const clientDistPath = (resourcesClientDist && fs.existsSync(path.join(resourcesClientDist, 'index.html')))
    ? resourcesClientDist
    : (isPkg ? path.join(__dirname, './client') : path.join(__dirname, '../../client/dist'));

const publicPath = isPkg 
    ? path.join(__dirname, './public') 
    : path.join(__dirname, '../../public');

app.use(express.static(publicPath));
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
app.use(express.static(clientDistPath));
app.use(apiKeyAuthMiddleware);

// Tenant Context Isolation
app.use(tenantMiddleware);

// Headless API Key Auth (Populates req.user if x-api-key present)
app.use(apiKeyMiddleware);

// Affiliate & Referral Tracking
app.use(referralMiddleware);

// Health check
app.get(['/health', '/api/health'], (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate Limiting — must be registered before the routers, otherwise matched routes never reach it.
// Relies on `trust proxy` + X-Forwarded-For from the reverse proxy for per-client IPs.
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // Asset fetches (images/video thumbnails) are high-volume GETs; don't let them exhaust the API budget
    skip: (req) => req.method === 'GET' && /^\/(s3|media\/proxy)(\/|\?|$)/.test(req.path),
    message: { success: false, error: 'Too many requests, please try again later.' }
});

// Brute-force protection: only failed logins count
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many failed login attempts, please try again later.' }
});

// Account creation / recovery endpoints (spam + email abuse)
const accountLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: 'Too many attempts, please try again in an hour.' }
});

// AI generation (cost control); status polling GETs are not counted
const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 600,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: (req) => req.method === 'GET',
    message: { success: false, error: 'AI generation limit reached, please try again later.' }
});

app.use('/api/', globalLimiter);
app.use('/api/auth/login', loginLimiter);
app.use(['/api/auth/register', '/api/auth/register-owner', '/api/auth/forgot-password', '/api/auth/reset-password', '/api/auth/change-password'], accountLimiter);
app.use('/api/ai/', aiLimiter);

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/s3', s3Router);
app.use('/api/projects', projectsRouter);
app.use('/api/prompts', promptsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai-config', aiConfigRouter);
app.use('/api/ai', aiRouter);
app.use('/api/commerce', commerceRouter);

app.use('/api/media', mediaRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/social', socialRouter);
app.use('/api/configs', configsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/license', licenseRouter);
// app.use('/api/templates', templatesRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/streaming', streamingRouter);
app.use('/api/streaming/mobile', mobileStreamingRouter);
app.use('/api/broadcaster', broadcasterRouter);
app.use('/api/network', networkRouter);
app.use('/api/admin/ai/accounts', aiAccountsRouter);
app.use('/api/admin/ai/auth', aiAuthRouter);
app.use('/api/admin/monitoring', monitoringRouter);
app.use('/api/resale/billing', resaleBillingRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/sub-tenant', subTenantRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/developer', developerRoutes);
app.use('/api/influencer', influencerRouter);
app.use('/api/headless', headlessRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/organizations', organizationRoutes);
app.use('/api/releases', releaseRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/collaboration', collaborationRouter);
app.use('/api/versions', versionsRouter);
app.use('/api/syndication', syndicationRouter);
app.use('/api/live', liveRouter);
app.use('/api/show', showRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/admin/env', envRouter);
app.use('/api/economy', economyRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/agent', agentChatRouter);
app.use('/api/google-agent', googleAgentRouter);

// SPA Handling: Redirect all non-API 404s to index.html
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log error to system monitoring
    Logger.error(`${req.method} ${req.originalUrl} - ${status}: ${message}`, 'HttpErrorHandler', {
        stack: err.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });

    res.status(status).json({
        error: message
    });
});

// Start server
const startServer = async () => {
    try {
        // Connect to MongoDB
        await connectDB();

        // Ensure Playwright browsers are installed
        // const { ensurePlaywrightBrowsers } = await import('~/utils/PlaywrightHelper.js');
        await ensurePlaywrightBrowsers();

        // Initialize dynamic config from DB (Must happen after DB connection)
        await configService.initialize();
        await aiManager.initialize();

        // Initialize EnvironmentManager for process.env overrides
        const { envManager } = await import('./utils/EnvironmentManager.js');
        await envManager.initialize();

        // Report misconfiguration once, after DB overrides are applied
        const { validateEnv } = await import('./utils/envSchema.js');
        const envWarnings = validateEnv();
        if (envWarnings.length > 0) {
            Logger.warn(`[Config] ${envWarnings.length} configuration issue(s):\n  - ${envWarnings.join('\n  - ')}`, 'System');
        }

        // Initialize Redis cache (Optional - continues without cache if unavailable)
        const { redisService } = await import('./services/system/RedisService.js');
        await redisService.connect();

        // Start Monitoring Service
        monitoringService.startMonitoring();

        // Start Credit Refresh Scheduler (B2B Resale Economy)
        creditRefreshService.startScheduler();

        // Start License Heartbeat (Edge Mode Only)
        LicenseService.start();

        // Initialize Streaming Service (NMS) - Async to prevent blocking startup
        await streamingService.initialize();

        // Start Google Flow token synchronization service
        flowSyncService.start();

        // Create main HTTP Server and attach Socket.io directly to it
        const httpServer = createServer(app);
        activeHttpServer = httpServer;
        socketServer.initialize(httpServer);

        // Initialize Live WebSocket for Gemini Live API
        initializeLiveWebSocket(httpServer);

        // Connect SocketServer to SystemLogger for real-time streaming
        Logger.setSocketServer(socketServer.getIO()!);

        // Initialize collaboration service
        collaborationService.initialize(socketServer.getIO()!);

        // Initialize commerce sync service
        const { commerceSyncService } = await import('./services/streaming/CommerceSyncService.js');
        commerceSyncService.setSocketServer(socketServer.getIO()!);

        // Initialize autonomous style testing engine
        const { styleABTestingEngine } = await import('./services/ai/StyleABTestingEngine.js');
        styleABTestingEngine.setSocketServer(socketServer.getIO()!);

        httpServer.listen(PORT, () => {
            Logger.info(`🚀 AntStudio Engine is running on port ${PORT}`);
            // Start Industrial Watchdog (Phase 25)
            // recoveryService.startMonitoring();
            Logger.info(`📡 API available at http://localhost:${PORT}/api`);
            Logger.info(`🎙️ Live Studio WebSocket available at ws://localhost:${PORT}/api/live`);
        });
    } catch (error) {
        Logger.error('Failed to start server:', 'System', error);
        process.exit(1);
    }
};

let activeHttpServer: ReturnType<typeof createServer> | null = null;
let isShuttingDown = false;

/**
 * Graceful shutdown: stop taking traffic, kill streaming child processes (FFmpeg relays/encoders),
 * close sockets and DB connections, then exit. Forced exit after a timeout.
 */
const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    Logger.info(`[Shutdown] Received ${signal}, shutting down gracefully...`, 'System');
    const forceExit = setTimeout(() => process.exit(1), 15000);
    forceExit.unref();

    try {
        activeHttpServer?.close();
        await streamingService.shutdown();
        const { closeBrowserPool } = await import('./utils/browserPool.js');
        await closeBrowserPool();
        await new Promise<void>((resolve) => {
            const io = socketServer.getIO();
            if (io) void io.close(() => resolve()); else resolve();
        });
        const mongoose = (await import('mongoose')).default;
        await mongoose.disconnect();
    } catch (err: any) {
        Logger.error(`[Shutdown] Error during shutdown: ${err?.message}`, 'System');
    } finally {
        process.exit(0);
    }
};

process.on('SIGTERM', () => { void shutdown('SIGTERM'); });
process.on('SIGINT', () => { void shutdown('SIGINT'); });

process.on('unhandledRejection', (reason, promise) => {
    Logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason}`, 'GlobalErrorHandler');
});

process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught Exception: ${error.message}`, 'GlobalErrorHandler', {
        stack: error.stack
    });
    // Give some time for logging before exiting
    setTimeout(() => process.exit(1), 1000);
});

startServer();
