import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '../utils/jwt.js';
import { User } from '../models/User.js';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        role: string;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Try to get token from Authorization header first, then from cookie
        let token = extractTokenFromHeader(req.headers.authorization);

        if (!token) {
            token = extractTokenFromCookie(req.headers.cookie);
        }

        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        // Verify user still exists and is active
        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'User not found or inactive' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Authentication failed' });
    }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};
