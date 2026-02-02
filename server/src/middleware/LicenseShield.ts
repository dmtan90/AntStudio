import { Request, Response, NextFunction } from 'express';
import { AdminSettings } from '../models/AdminSettings.js';

/**
 * Middleware to restrict access based on license tier.
 * @param requiredTier The minimum tier required to access the route.
 */
export const licenseShield = (requiredTier: 'trial' | 'pro' | 'enterprise') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const settings = await AdminSettings.findOne();

            if (!settings || !settings.license || settings.license.info.status !== 'valid') {
                return res.status(402).json({
                    success: false,
                    error: 'LICENSE_INVALID',
                    message: 'A valid license is required to access this feature.'
                });
            }

            const tiers = ['trial', 'pro', 'enterprise'];
            const userTierIndex = tiers.indexOf(settings.license.info.type);
            const requiredTierIndex = tiers.indexOf(requiredTier);

            if (userTierIndex < requiredTierIndex) {
                return res.status(403).json({
                    success: false,
                    error: 'TIER_INSUFFICIENT',
                    message: `This feature requires a ${requiredTier} license.`
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
