import { Router } from 'express';
import { getAdminSettings } from '~/models/AdminSettings.js';
import { connectDB } from '~/utils/db.js';
import { Logger } from '~/utils/Logger.js';
import { configService } from '~/utils/ConfigService.js';
const router = Router();

/**
 * GET /api/configs/plans
 * Public endpoint to fetch active subscription plans and credit packages
 */
router.get('/plans', async (req, res) => {
    try {
        await connectDB();
        const settings = await getAdminSettings();

        if (!settings) {
            return res.status(404).json({
                success: false,
                data: null,
                error: 'Settings not found'
            });
        }

        // Filter active credit packages
        const activePackages = (settings.creditPackages || []).filter((pkg: any) => pkg.isActive);

        res.json({
            success: true,
            data: {
                plans: settings.plans || [],
                creditPackages: activePackages,
                aiSettings: {
                    defaults: settings.aiSettings?.defaults || {},
                    models: (settings.aiSettings?.models || []).filter((m: any) => m.isActive)
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
        const whitelabel = configService.whitelabel;
        const domain = configService.domain;

        res.json({
            success: true,
            data: {
                appName: whitelabel?.appName || 'AntStudio',
                logo: whitelabel?.logo || '/logo.png',
                favicon: whitelabel?.favicon || '/favicon.png',
                domain: domain,
                creditModeEnabled: configService.creditModeEnabled,
                isLicenseServer: configService.isMasterServer
            }
        });
    } catch (error: any) {
        Logger.error('Fetch public config error:', error);
        res.status(500).json({ success: false, data: null, error: error.message });
    }
});

export default router;
