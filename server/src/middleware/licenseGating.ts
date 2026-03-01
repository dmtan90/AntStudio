import { Response, NextFunction, Request } from 'express';
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

        //bypass license to check features
        return next();

        // // Edge servers retrieve license state from local cache/service
        // const { LicenseWorker } = await import('../services/LicenseWorker.js');
        // const localLicense = await LicenseWorker.getLicense();

        // if (!localLicense || localLicense.status !== 'valid') {
        //     return res.status(402).json({
        //         success: false,
        //         error: 'Tactical Block: valid license registry not found or expired on this Edge unit.'
        //     });
        // }

        // const now = new Date();
        // if (now > localLicense.endDate) {
        //     return res.status(402).json({
        //         success: false,
        //         error: 'Access Terminated: license has reached end-of-mission life.'
        //     });
        // }

        // // Tier check
        // const tiers = ['trial', 'basic', 'pro', 'enterprise'];
        // const currentRank = tiers.indexOf(localLicense.tier);
        // const requiredRank = tiers.indexOf(requiredTier);

        // if (currentRank < requiredRank) {
        //     return res.status(403).json({
        //         success: false,
        //         error: `Clearance Failed: '${requiredTier.toUpperCase()}' tier required for this tactical unit.`
        //     });
        // }

        // next();
    };
};

export const checkUserLimit = async (req: Request, res: Response, next: NextFunction) => {
    if (config.systemMode === 'master') return next();
    return next();

    // const { LicenseWorker } = await import('../services/LicenseWorker.js');
    // const { User } = await import('../models/User.js');
    
    // const localLicense = await LicenseWorker.getLicense();
    // if (!localLicense) return next();

    // const maxUsers = localLicense.maxUsersPerInstance || 5;
    // if (maxUsers === -1) return next();

    // const currentUsers = await User.countDocuments();
    // if (currentUsers >= maxUsers) {
    //     return res.status(403).json({ success: false, error: `User limit reached (${maxUsers}). Please upgrade license.` });
    // }
    // next();
};

export const checkProjectLimit = async (req: Request, res: Response, next: NextFunction) => {
    if (config.systemMode === 'master') return next();
    return next();

    // const { LicenseWorker } = await import('../services/LicenseWorker.js');
    // const { Project } = await import('../models/Project.js');
    
    // const localLicense = await LicenseWorker.getLicense();
    // if (!localLicense) return next();

    // const maxProjects = localLicense.maxProjectsPerInstance || 10;
    // if (maxProjects === -1) return next();

    // const currentProjects = await Project.countDocuments();
    // if (currentProjects >= maxProjects) {
    //     return res.status(403).json({ success: false, error: `Project limit reached (${maxProjects}). Please upgrade license.` });
    // }
    // next();
};
