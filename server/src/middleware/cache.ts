import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { redisService } from '../services/RedisService.js';
import { Logger } from '../utils/Logger.js';

export const cacheMiddleware = (options: {
    ttl?: number;
    keyPrefix?: string;
    varyByUser?: boolean;
} = {}) => {
    const { ttl = 300, keyPrefix = 'cache', varyByUser = true } = options;

    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        const userPart = varyByUser && req.user ? `:user:${req.user.userId}` : '';
        const key = `${keyPrefix}:${req.originalUrl}${userPart}`;

        const cached = await redisService.get(key);
        if (cached) {
            return res.json(cached);
        }

        // Intercept res.json to cache the response
        const originalJson = res.json.bind(res);
        res.json = (data: any) => {
            // Only cache successful responses
            if (res.statusCode === 200) {
                redisService.set(key, data, ttl).catch(err => Logger.error('Redis cache set failed:', 'CacheMiddleware', err));
            }
            return originalJson(data);
        };

        next();
    };
};
