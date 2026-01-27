import { Request, Response, NextFunction } from 'express';
import { Tenant, ITenant } from '../models/Tenant.js';

// Extend Express Request to include tenant context
declare global {
    namespace Express {
        interface Request {
            tenant?: ITenant;
            tenantId?: string;
        }
    }
}

/**
 * Middleware to detect and inject the Tenant context based on Host or Subdomain.
 * Essential for White-Label B2B Data Isolation.
 */
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const host = req.headers.host || '';

        // 1. Identify Subdomain (e.g., 'acme' from 'acme.antflow.ai')
        // Assuming base domain configured in process.env.BASE_DOMAIN
        const baseDomain = process.env.BASE_DOMAIN || 'localhost';
        let subdomain = '';

        if (host.includes(baseDomain)) {
            subdomain = host.split(`.${baseDomain}`)[0];
        } else {
            // Assume it's a Custom Domain (e.g., 'stream.client.com')
            const tenantByDomain = await Tenant.findOne({ customDomain: host });
            if (tenantByDomain) {
                req.tenant = tenantByDomain;
                req.tenantId = (tenantByDomain._id as any).toString();
                return next();
            }
        }

        // 2. Resolve by Subdomain
        if (subdomain && subdomain !== 'www' && subdomain !== baseDomain) {
            const tenantBySub = await Tenant.findOne({ subdomain: subdomain.toLowerCase() });
            if (tenantBySub) {
                req.tenant = tenantBySub;
                req.tenantId = (tenantBySub._id as any).toString();
                return next();
            }
        }

        // 3. Fallback: If no tenant found, check if it's the Main Platform Admin
        // For development/master access, we might allow no tenant context
        // But for White-label strictness, we might block here.

        // Allow public/main domain routes to proceed without tenant
        next();

    } catch (error) {
        console.error('[TenantMiddleware] Resolution failed:', error);
        res.status(500).json({ error: 'Tenant resolution error' });
    }
};
