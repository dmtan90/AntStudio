import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import cors from 'cors';
import config from './utils/config.js';
import { configService } from './utils/configService.js';
import { connectDB } from './utils/db.js';
import authRouter from './routes/auth.js';
import s3Router from './routes/s3.js';
import projectsRouter from './routes/projects.js';
import adminRouter from './routes/admin.js';
import aiConfigRouter from './routes/aiConfig.js'; // Changed from aiConfigRoutes
import mediaRouter from './routes/media.js';
import aiRouter from './routes/ai.js';
import promptsRouter from './routes/prompts.js';
// import templatesRouter from './routes/templates.js';
import voiceRouter from './routes/voice.js';
import platformsRouter from './routes/platforms.js';
import streamingRouter from './routes/streaming.js';
import mobileStreamingRouter from './routes/mobileStreaming.js';
import broadcasterRouter from './routes/broadcaster.js';
import networkRouter from './routes/network.js';
import organizationRoutes from './routes/organizations.js';
import developerRoutes from './routes/developer.js';
import vtuberRouter from './routes/vtuber.js';
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
import aiAccountsRouter from './routes/aiAccounts.js';
import aiAuthRouter from './routes/aiAuth.js';
import commerceRouter from './routes/commerce.js';
import monitoringRouter from './routes/monitoring.js';
import { monitoringService } from './services/monitoringService.js';
import { Logger } from './utils/Logger.js';
import { authMiddleware } from './middleware/auth.js';
import { apiKeyAuthMiddleware } from './middleware/apiKeyAuth.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { creditRefreshService } from './services/CreditRefreshService.js';
import { referralMiddleware } from './middleware/referral.js';
import resaleBillingRouter from './routes/resaleBilling.js';
import affiliateRouter from './routes/affiliate.js';
import subTenantRouter from './routes/subTenant.js';
import marketplaceRouter from './routes/marketplace.js';
import headlessRouter from './routes/headless.js';
import mobileRouter from './routes/mobile.js';
import moderationRouter from './routes/moderation.js';
import commentsRouter from './routes/comments.js';
import versionsRouter from './routes/versions.js';
// import { recoveryService } from './services/RecoveryService.js';
import { apiKeyMiddleware } from './middleware/apiKey.js';
import showRouter from './routes/show.js';
import economyRouter from './routes/economy.js';
import gamificationRouter from './routes/gamification.js';
import { createServer } from 'http';
import { socketServer, SocketServer } from './services/SocketServer.js';
import { collaborationService } from './services/CollaborationService.js';
import { LicenseWorker } from './services/LicenseWorker.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeLiveWebSocket } from './routes/live.js';
import { streamingService } from './services/StreamingService.js';
import envRouter from './routes/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy if behind Nginx/Load Balancer
app.set('trust proxy', 1);

// Middleware
// Security Headers
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin for S3/Media
    contentSecurityPolicy: false, // Disable CSP for now as it can break some frontend features if not tuned
}));
app.use(cors({
    origin: config.public.baseUrl,
    credentials: true
}));

// Security headers for FFmpeg.js (SharedArrayBuffer support)
app.use((req, res, next) => {
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    next();
});

// Capture raw body for Stripe webhooks
app.use(express.json({
    limit: '50mb',
    verify: (req: any, res, buf) => {
        if (req.originalUrl.startsWith('/api/payment/webhook')) {
            req.rawBody = buf.toString();
        }
    }
}));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// NoSQL Injection Protection
app.use(mongoSanitize());

// detect if we are running in a pkg binary
const isPkg = typeof (process as any).pkg !== 'undefined';
const clientDistPath = isPkg 
    ? path.join(__dirname, './client') // internal to pkg binary
    : path.join(__dirname, '../../../client/dist');

const publicPath = isPkg 
    ? path.join(__dirname, './public') 
    : path.join(__dirname, '../../public');

app.use(express.static(publicPath));
app.use(express.static(clientDistPath));
app.use(apiKeyAuthMiddleware);

// Tenant Context Isolation
app.use(tenantMiddleware);

// Headless API Key Auth (Populates req.user if x-api-key present)
app.use(apiKeyMiddleware);

// Affiliate & Referral Tracking
app.use(referralMiddleware);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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
app.use('/api/vtuber', vtuberRouter);
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
app.use('/api/admin/env', envRouter);
app.use('/api/economy', economyRouter);
app.use('/api/gamification', gamificationRouter);

// Rate Limiting
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 1000, // Limit each IP to 1000 requests per window
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 20, // Limit each IP to 20 auth requests per hour
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many authentication attempts, please try again in an hour.' }
});

const aiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 50, // Limit each IP to 50 AI generations per hour
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'AI generation limit reached, please try again in an hour.' }
});

// Apply global rate limit
app.use('/api/', globalLimiter);

// Specific limiters
app.use('/api/auth/', authLimiter);
app.use('/api/ai/', aiLimiter);

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

        // Initialize dynamic config from DB (Must happen after DB connection)
        await configService.initialize();

        // Initialize EnvironmentManager for process.env overrides
        const { envManager } = await import('./utils/EnvironmentManager.js');
        await envManager.initialize();

        // Initialize Redis cache (Optional - continues without cache if unavailable)
        const { redisService } = await import('./services/RedisService.js');
        await redisService.connect();

        // Start Monitoring Service
        monitoringService.startMonitoring();

        // Start Credit Refresh Scheduler (B2B Resale Economy)
        creditRefreshService.startScheduler();

        // Start License Heartbeat (Edge Mode Only)
        LicenseWorker.start();

        // Initialize Streaming Service (NMS) - Async to prevent blocking startup
        await streamingService.initialize();

        const httpServer = createServer(app);
        socketServer.initialize(httpServer);

        // Initialize Live WebSocket for Gemini Live API
        initializeLiveWebSocket(httpServer);

        // Connect SocketServer to SystemLogger for real-time streaming
        Logger.setSocketServer(socketServer.getIO()!);

        // Initialize collaboration service
        collaborationService.initialize(socketServer.getIO()!);

        // Initialize commerce sync service
        const { commerceSyncService } = await import('./services/CommerceSyncService.js');
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
