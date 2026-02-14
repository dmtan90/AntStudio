import { Router } from 'express';
import { SystemLog } from '../models/SystemLog.js';
import { SystemMetric } from '../models/SystemMetric.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { monitoringService } from '../services/monitoringService.js';
import { connectDB } from '../utils/db.js';
import { ClientLog } from '../models/ClientLog.js';

const router = Router();

// Public-ish route (requires skip tracking and auth, but no admin for ingestion)
router.post('/client-logs', async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const log = await ClientLog.create({
            ...req.body,
            userId: req.user?.userId,
            timestamp: new Date()
        });
        res.json({ success: true, data: { id: log._id } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// All other routes require admin authentication
// router.use(adminMiddleware);

/**
 * GET /api/admin/monitoring/stats
 * Get current real-time system performance
 */
router.get('/stats', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const stats = await monitoringService.getRealtimeStats();
        res.json({ success: true, data: stats, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/health
 */
router.get('/health', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const health = await monitoringService.getDetailedHealth();
        res.json({ success: true, data: health, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/heartbeat
 */
router.get('/heartbeat', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        const heartbeats = await monitoringService.getHeartbeat();
        res.json({ success: true, data: heartbeats, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/history
 * Get historical metrics for charts
 */
router.get('/history', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { limit = 60 } = req.query;
        const history = await monitoringService.getHistory(Number(limit));
        // Reverse to get chronological order for charts
        res.json({ success: true, data: history.reverse(), error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/logs
 * Fetch system logs (same as previous logs route)
 */
router.get('/logs', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { level, source, page = 1, limit = 100, search } = req.query;
        const query: any = {};

        if (level && level !== 'all') query.level = level;
        if (source && source !== 'all') query.source = source;
        if (search) {
            query.$or = [
                { message: { $regex: search, $options: 'i' } },
                { source: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (Number(page) - 1) * Number(limit);
        const logs = await SystemLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(Number(limit));
        const total = await SystemLog.countDocuments(query);

        res.json({ success: true, data: { logs, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) }, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/settings
 */
router.get('/settings', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const settings = await AdminSettings.findOne();
        res.json({ success: true, data: settings?.logSettings, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * PATCH /api/admin/monitoring/settings
 */
router.patch('/settings', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        const { emailNotificationsEnabled, notificationEmail, minNotificationLevel, retentionDays } = req.body;
        const settings = await AdminSettings.findOneAndUpdate({}, {
            $set: {
                'logSettings.emailNotificationsEnabled': emailNotificationsEnabled,
                'logSettings.notificationEmail': notificationEmail,
                'logSettings.minNotificationLevel': minNotificationLevel,
                'logSettings.retentionDays': retentionDays
            }
        }, { new: true, upsert: true });
        res.json({ success: true, data: settings.logSettings, error: null });
    } catch (error: any) {
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/admin/monitoring/export-diagnostics
 * Bundle logs and email to developer
 */
router.get('/export-diagnostics', adminMiddleware, async (req: AuthRequest, res) => {
    try {
        await connectDB();
        await monitoringService.exportAndEmailDiagnostics();
        res.json({ success: true, data: { message: 'Diagnostic bundle sent successfully' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
