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

import paymentRouter from './routes/payment.js';
import socialRouter from './routes/social.js';
import configsRouter from './routes/configs.js';
import videosRouter from './routes/videos.js';
import licenseRouter from './routes/license.js';

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

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

// Start server
const startServer = async () => {
    try {
        // Initialize dynamic config from DB
        await configService.initialize();

        // Connect to MongoDB
        await connectDB();

        // Start License Scheduler
        licenseService.startScheduler();

        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
            console.log(`📡 API available at http://localhost:${PORT}/api`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
