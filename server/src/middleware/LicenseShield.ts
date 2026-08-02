import { Request, Response, NextFunction } from 'express';
import { LicenseStatus, LicenseType } from '~/models/License.js';
import { configService } from '~/utils/ConfigService.js';
/**
 * Middleware to restrict access based on license tier.
 * @param requiredTier The minimum tier required to access the route.
 */
export const licenseShield = (requiredTier: LicenseType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const license = configService.license;
            if (!license || !license?.info || license.info.status !== LicenseStatus.VALID) {
                return res.status(402).json({
                    success: false,
                    error: 'LICENSE_INVALID',
                    message: 'A valid license is required to access this feature.'
                });
            }

            const tiers = [LicenseType.TRIAL, LicenseType.BASIC, LicenseType.PRO, LicenseType.ENTERPRISE];
            const userTierIndex = tiers.indexOf(license.info.type as LicenseType);
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
