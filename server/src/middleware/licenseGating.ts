import { Response, NextFunction, Request } from 'express';
import { AuthRequest } from './auth.js';
import { configService } from '../utils/ConfigService.js';
import { LicenseType, LicenseStatus } from '~/models/License.js';
import { LicenseService } from '../services/system/LicenseService.js';
import { User } from '~/models/User.js';
import { Project } from '~/models/Project.js';

/**
 * Tactical License Gating Middleware.
 * Enforces tier-based access and valid heartbeat checks.
 */
export const licenseGating = (requiredTier: LicenseType) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Master server is exempt from local license gating
        if (configService.isMasterServer) {
            return next();
        }

        // Edge servers retrieve license state from local cache/service
        const localLicense = await LicenseService.getLicense();

        if (!localLicense || localLicense.status !== LicenseStatus.VALID) {
            return res.status(402).json({
                success: false,
                error: 'Tactical Block: valid license registry not found or expired on this Edge unit.'
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

export const checkUserLimit = async (req: Request, res: Response, next: NextFunction) => {
    if (configService.isMasterServer) return next();

    const localLicense = await LicenseService.getLicense();
    if (!localLicense) return next();

    const maxUsers = localLicense.maxUsersPerInstance ?? 5;
    if (maxUsers === -1) return next();

    const currentUsers = await User.countDocuments();
    if (currentUsers >= maxUsers) {
        return res.status(403).json({ success: false, error: `User limit reached (${maxUsers}). Please upgrade license.` });
    }
    next();
};

export const checkProjectLimit = async (req: Request, res: Response, next: NextFunction) => {
    if (configService.isMasterServer) return next();

    const localLicense = await LicenseService.getLicense();
    if (!localLicense) return next();

    const maxProjects = localLicense.maxProjectsPerInstance ?? 10;
    if (maxProjects === -1) return next();

    const currentProjects = await Project.countDocuments();
    if (currentProjects >= maxProjects) {
        return res.status(403).json({ success: false, error: `Project limit reached (${maxProjects}). Please upgrade license.` });
    }
    next();
};
