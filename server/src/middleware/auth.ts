import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '../utils/jwt.js';
import { User } from '../models/User.js';

export interface AuthRequest extends Request {
    user?: {
        id: string; // Alias for userId
        userId: string;
        email: string;
        role: string;
        currentOrganizationId?: string;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        let token = extractTokenFromHeader(req.headers.authorization);
        if (!token) token = extractTokenFromCookie(req.headers.cookie);
        if (!token && req.body && req.body.token) token = req.body.token;

        if (!token) {
            return res.status(401).json({ success: false, data: null, error: 'Authentication required' });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return res.status(401).json({ success: false, data: null, error: 'Invalid or expired token' });
        }

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, data: null, error: 'User not found or inactive' });
        }

        req.user = {
            ...decoded,
            id: decoded.userId
        } as any;

        next();
    } catch (error) {
        return res.status(401).json({ success: false, data: null, error: 'Authentication failed' });
    }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'sys-admin')) {
        return res.status(403).json({ success: false, data: null, error: 'Admin access required' });
    }
    next();
};

export const sysAdminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || req.user.role !== 'sys-admin') {
        return res.status(403).json({ success: false, data: null, error: 'Admin access required' });
    }
    next();
};
