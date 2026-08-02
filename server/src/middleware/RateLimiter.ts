import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limit store
const apiLimitStore = new Map<string, { count: number, resetAt: number }>();

/**
 * Middleware to rate limit requests based on API Key.
 * Default: 60 requests per minute per key.
 */
export const headlessRateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const rawKey = req.headers['x-api-key'] as string;

    if (!rawKey) {
        return next(); // Standard auth routes have their own/no limiter
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute
    const limit = 60; // 60 RPM

    // 1. Clean up or initialize entry
    let record = apiLimitStore.get(rawKey);
    if (!record || record.resetAt < now) {
        record = { count: 0, resetAt: now + windowMs };
    }

    // 2. Check Limit
    if (record.count >= limit) {
        return res.status(429).json({
            success: false,
            error: 'Too many requests. Please slow down and respect the rate limit (60 RPM).',
            retryAfter: Math.ceil((record.resetAt - now) / 1000)
        });
    }

    // 3. Increment
    record.count += 1;
    apiLimitStore.set(rawKey, record);

    // 4. Add headers for developer visibility
    res.setHeader('X-RateLimit-Limit', limit);
    res.setHeader('X-RateLimit-Remaining', limit - record.count);
    res.setHeader('X-RateLimit-Reset', record.resetAt);

    next();
};
