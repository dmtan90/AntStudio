import express from 'express';
import cors from 'cors';
import config from './utils/config.js';
import { configService } from './utils/configService.js';
import { connectDB } from './utils/db.js';
import { licenseService } from './services/licenseScheduler.js';
import authRouter from './routes/auth.js';
import s3Router from './routes/s3.js';
import projectsRouter from './routes/projects.js';
import adminRouter from './routes/admin.js';
import aiConfigRoutes from './routes/aiConfig.js';
import mediaRouter from './routes/media.js';
import aiRouter from './routes/ai.js';
import promptsRouter from './routes/prompts.js';
import templatesRouter from './routes/templates.js';
import voiceRouter from './routes/voice.js';
import platformsRouter from './routes/platforms.js';
import streamingRouter from './routes/streaming.js';
import broadcasterRouter from './routes/broadcaster.js';
import networkRouter from './routes/network.js';
import organizationRoutes from './routes/organizations.js';
import developerRoutes from './routes/developer.js';
import neuralRoutes from './routes/neural.js';

import releaseRouter from './routes/release.js';
import paymentRouter from './routes/payment.js';
import socialRouter from './routes/social.js';
import configsRouter from './routes/configs.js';
import videosRouter from './routes/videos.js';
import licenseRouter from './routes/license.js';
import aiAccountsRouter from './routes/aiAccounts.js';
import monitoringRouter from './routes/monitoring.js';
import { monitoringService } from './services/monitoringService.js';
import { systemLogger } from './utils/systemLogger.js';
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
import { recoveryService } from './services/RecoveryService.js';
import { apiKeyMiddleware } from './middleware/apiKey.js';
import { createServer } from 'http';
import { SocketServer } from './services/SocketServer.js';
import { collaborationService } from './services/CollaborationService.js';
import { LicenseWorker } from './services/LicenseWorker.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
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

app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.static(path.join(__dirname, '../../../client/dist')));
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
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/ai', aiRouter);

app.use('/api/media', mediaRouter);
app.use('/api/payment', paymentRouter);
app.use('/api/social', socialRouter);
app.use('/api/configs', configsRouter);
app.use('/api/videos', videosRouter);
app.use('/api/license', licenseRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/voice', voiceRouter);
app.use('/api/platforms', platformsRouter);
app.use('/api/streaming', streamingRouter);
app.use('/api/broadcaster', broadcasterRouter);
app.use('/api/network', networkRouter);
app.use('/api/admin/ai/accounts', aiAccountsRouter);
app.use('/api/admin/monitoring', monitoringRouter);
app.use('/api/resale/billing', resaleBillingRouter);
app.use('/api/affiliate', affiliateRouter);
app.use('/api/sub-tenant', subTenantRouter);
app.use('/api/marketplace', marketplaceRouter);
app.use('/api/developer', developerRoutes);
app.use('/api/neural', neuralRoutes);
app.use('/api/headless', headlessRouter);
app.use('/api/mobile', mobileRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/organizations', organizationRoutes);
app.use('/api/releases', releaseRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/versions', versionsRouter);

// SPA Handling: Redirect all non-API 404s to index.html
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/health')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    res.sendFile(path.join(__dirname, '../../../client/dist/index.html'));
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Log error to system monitoring
    systemLogger.error(`${req.method} ${req.originalUrl} - ${status}: ${message}`, 'HttpErrorHandler', {
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

        // Initialize Redis cache (Optional - continues without cache if unavailable)
        const { redisService } = await import('./services/RedisService.js');
        await redisService.connect();

        // Start Monitoring Service
        monitoringService.startMonitoring();

        // Start License Scheduler
        licenseService.startScheduler();

        // Start Credit Refresh Scheduler (B2B Resale Economy)
        creditRefreshService.startScheduler();

        // Start License Heartbeat (Edge Mode Only)
        LicenseWorker.start();

        const httpServer = createServer(app);
        const socketServer = new SocketServer(httpServer);

        // Initialize collaboration service
        collaborationService.initialize(socketServer['io']);

        httpServer.listen(PORT, () => {
            console.log(`🚀 AntStudio Engine is running on port ${PORT}`);
            // Start Industrial Watchdog (Phase 25)
            recoveryService.startMonitoring();
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
