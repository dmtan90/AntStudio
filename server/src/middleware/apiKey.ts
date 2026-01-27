import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKey } from '../models/ApiKey.js';
import { User } from '../models/User.js';
import { Tenant } from '../models/Tenant.js';

/**
 * Middleware to authenticate requests using an API Key.
 * Look for 'x-api-key' header.
 */
export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const rawKey = req.headers['x-api-key'] as string;

    if (!rawKey) {
        return next(); // Proceed to standard JWT auth if no API key
    }

    try {
        // 1. Hash the incoming key
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        // 2. Find active key
        const keyDoc = await ApiKey.findOne({ keyHash, status: 'active' });

        if (!keyDoc) {
            return res.status(401).json({ success: false, error: 'Invalid or revoked API Key' });
        }

        // 3. Update last used
        keyDoc.lastUsedAt = new Date();
        await keyDoc.save();

        // 4. Fetch and Attach User Context
        const user = await User.findById(keyDoc.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'Account associated with this key is inactive' });
        }

        // 5. Build Auth Payload (Standard AuthRequest format)
        (req as any).user = {
            userId: user._id.toString(),
            email: user.email,
            role: user.role
        };

        // 6. Fetch and Attach Tenant Context
        if (user.tenantId) {
            const tenant = await Tenant.findById(user.tenantId);
            if (tenant) {
                (req as any).tenant = tenant;
            }
        }

        console.log(`[Headless] Authenticated via API Key: ${keyDoc.name} for user ${user.email}`);
        next();
    } catch (error) {
        console.error('[ApiKeyMiddleware] Authentication failed:', error);
        res.status(500).json({ success: false, error: 'Internal API security error' });
    }
};
