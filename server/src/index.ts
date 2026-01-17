import express from 'express';
import cors from 'cors';
import config from './utils/config.js';
import { connectDB } from './utils/db.js';
import authRouter from './routes/auth.js';
import s3Router from './routes/s3.js';
import projectsRouter from './routes/projects.js';
import adminRouter from './routes/admin.js';
import mediaRouter from './routes/media.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: config.public.baseUrl,
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/s3', s3Router);
app.use('/api/projects', projectsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/media', mediaRouter);

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
        // Connect to MongoDB
        await connectDB();

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
