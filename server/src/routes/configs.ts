import { Router } from 'express';
import { AdminSettings } from '../models/AdminSettings.js';
import { connectDB } from '../utils/db.js';

import { Logger } from '../utils/Logger.js';

const router = Router();

/**
 * GET /api/configs/plans
 * Public endpoint to fetch active subscription plans and credit packages
 */
router.get('/plans', async (req, res) => {
    try {
        await connectDB();
        const settings = await AdminSettings.findOne().select('plans creditPackages aiSettings');

        if (!settings) {
            return res.status(404).json({
                success: false,
                data: null,
                error: 'Settings not found'
            });
        }

        // Filter active credit packages
        const activePackages = (settings.creditPackages || []).filter(pkg => pkg.isActive);

        res.json({
            success: true,
            data: {
                plans: settings.plans || [],
                creditPackages: activePackages,
                aiSettings: {
                    defaults: settings.aiSettings?.defaults || {},
                    models: (settings.aiSettings?.models || []).filter(m => m.isActive)
                }
            },
            error: null
        });
    } catch (error: any) {
        Logger.error('Fetch public plans error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

/**
 * GET /api/configs/public
 * Public endpoint to fetch whitelabel settings
 */
router.get('/public', async (req, res) => {
    try {
        await connectDB();
        const adminSettings = await AdminSettings.findOne();
        const settings = adminSettings?.whitelabel;
        const domain = adminSettings?.apiConfigs?.publicDomain;

        res.json({
            success: true,
            data: {
                appName: settings?.appName || 'AntStudio',
                logo: settings?.logo || '/logo.png',
                favicon: settings?.favicon || '/favicon.png',
                domain: domain || 'https://studio.agrhub.com'
            }
        });
    } catch (error: any) {
        Logger.error('Fetch public config error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

export default router;
