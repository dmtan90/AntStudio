import { Router } from 'express';
import { envManager } from '../utils/EnvironmentManager.js';
import { adminMiddleware as adminAuth } from '../middleware/auth.js';
import { SystemConfig } from '../models/SystemConfig.js';

const router = Router();

// Only admins can manage env overrides
router.use(adminAuth);

/**
 * List all overrides
 */
router.get('/', async (req, res) => {
    try {
        const configs = await SystemConfig.find().sort({ group: 1, key: 1 });
        res.json({ success: true, data: configs });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Get specific key
 */
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        const value = envManager.get(key);
        res.json({ success: true, key, value });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Create or update override
 */
router.post('/', async (req, res) => {
    try {
        const { key, value, description, group, isPublic } = req.body;
        if (!key || value === undefined) {
            return res.status(400).json({ success: false, error: 'Key and value are required' });
        }

        await envManager.set(key, String(value), description, isPublic);
        res.json({ success: true, message: `Configuration ${key} updated` });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Delete override
 */
router.delete('/:key', async (req, res) => {
    try {
        const { key } = req.params;
        await envManager.delete(key);
        res.json({ success: true, message: `Configuration ${key} removed` });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * Force refresh from DB
 */
router.post('/refresh', async (req, res) => {
    try {
        await envManager.refresh();
        res.json({ success: true, message: 'Cache refreshed from database' });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
