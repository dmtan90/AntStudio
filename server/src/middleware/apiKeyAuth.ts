import { Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/ApiKeyService.js';
import { AuthRequest } from './auth.js';
import { User } from '../models/User.js';

/**
 * API Key Authentication Middleware.
 * Allows programmatic access via 'x-api-key' header.
 */
export const apiKeyAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const apiKey = req.headers['x-api-key'] as string;

        if (!apiKey) {
            return next(); // Continue to next auth (JWT) if no key present
        }

        const keyRecord = await ApiKeyService.verifyKey(apiKey);
        if (!keyRecord) {
            return res.status(401).json({ success: false, error: 'Invalid or revoked tactical API key.' });
        }

        // Fetch full user record to populate context
        const user = await User.findById(keyRecord.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, error: 'Specialist account inactive for this key.' });
        }

        // Populate request context
        req.user = {
            id: user.id,
            userId: user.id,
            email: user.email,
            role: user.role
        };

        // Attach tactical tenant context if present
        (req as any).tenantId = keyRecord.tenantId;

        next();
    } catch (error) {
        console.error('API Key Auth Error:', error);
        res.status(500).json({ success: false, error: 'Tactical authentication engine failure.' });
    }
};
