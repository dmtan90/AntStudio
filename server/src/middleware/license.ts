import { Request, Response, NextFunction } from 'express';
import { AdminSettings } from '../models/AdminSettings.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';

export const checkLicenseStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await AdminSettings.findOne();
        const status = (settings?.license?.info?.status || 'invalid') as string;

        if (status !== 'valid' && status !== 'trial') { // Assuming 'trial' is also a valid state for usage until expired
            // Actually, the requirement says "Nếu status là expired hoặc invalid thì không cho phép..."
            // My Scheduler sets 'expired' if date passed. 'invalid' if key is wrong.
            // So if valid or trial (and not expired date, which scheduler handles), it is fine.
            // Wait, scheduler updates status to 'expired'. So I just check status.

            // However, 'trial' might be just a type, status would be 'valid' or 'expired'.
            // Let's check my model default.
            // status: 'invalid' (default).
            console.log(`[License Check] FAILED. Status: ${status}`);
            return res.status(403).json({ success: false, error: 'License invalid or expired. Please contact administrator.' });
        }
        console.log(`[License Check] PASSED. Status: ${status}`);
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error during license check' });
    }
};

export const checkUserLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await AdminSettings.findOne();
        const maxUsers = settings?.license?.info?.maxUsers || 5;
        const currentUsers = await User.countDocuments();
        if (maxUsers == -1) {//unlimited
            next();
            return;
        }

        if (currentUsers >= maxUsers) {
            return res.status(403).json({ success: false, error: `User limit reached (${maxUsers}). Please upgrade license.` });
        }
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error during limit check' });
    }
};

export const checkProjectLimit = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const settings = await AdminSettings.findOne();
        const maxProjects = settings?.license?.info?.maxProjects || 10;
        const currentProjects = await Project.countDocuments();
        if (maxProjects == -1) {//unlimited
            next();
            return;
        }

        if (currentProjects >= maxProjects) {
            console.log(`[Project Limit] FAILED. Current: ${currentProjects}, Max: ${maxProjects}`);
            return res.status(403).json({ success: false, error: `Project limit reached (${maxProjects}). Please upgrade license.` });
        }
        console.log(`[Project Limit] PASSED. Current: ${currentProjects}, Max: ${maxProjects}`);
        next();
    } catch (error) {
        res.status(500).json({ success: false, error: 'Internal Server Error during limit check' });
    }
};
