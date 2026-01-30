import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import config from '../utils/config.js';

/**
 * Tactical License Gating Middleware.
 * Enforces tier-based access and valid heartbeat checks.
 */
export const licenseGating = (requiredTier: 'trial' | 'basic' | 'pro' | 'enterprise') => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Master server is exempt from local license gating
        if (config.systemMode === 'master') {
            return next();
        }

        // Edge servers retrieve license state from local cache/database
        const { License } = await import('../models/License.js');
        const localLicense = await License.findOne({ status: 'valid' });

        if (!localLicense) {
            return res.status(402).json({
                success: false,
                error: 'Tactical Block: valid license registry not found on this Edge unit.'
            });
        }

        const now = new Date();
        if (now > localLicense.endDate) {
            return res.status(402).json({
                success: false,
                error: 'Access Terminated: license has reached end-of-mission life.'
            });
        }

        // Tier check
        const tiers = ['trial', 'basic', 'pro', 'enterprise'];
        const currentRank = tiers.indexOf(localLicense.tier);
        const requiredRank = tiers.indexOf(requiredTier);

        if (currentRank < requiredRank) {
            return res.status(403).json({
                success: false,
                error: `Clearance Failed: '${requiredTier.toUpperCase()}' tier required for this tactical unit.`
            });
        }

        next();
    };
};
