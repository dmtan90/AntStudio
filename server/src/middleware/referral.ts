import { Request, Response, NextFunction } from 'express';
import { Affiliate } from '../models/Affiliate.js';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            referralCode?: string;
        }
    }
}

/**
 * Middleware to capture and persist referral codes from URLs.
 * Automatically tracks 'ref' parameter and stores in cookies for 30 days.
 */
export const referralMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const refCode = req.query.ref as string;

        if (refCode) {
            console.log(`[Referral] Detected code: ${refCode}`);

            // 1. Verify Affiliate exists
            const affiliate = await Affiliate.findOne({ referralCode: refCode.toLowerCase(), status: 'active' });

            if (affiliate) {
                // 2. Set Cookie (30 day persistence)
                res.cookie('antflow_ref', refCode.toLowerCase(), {
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                    httpOnly: false, // Allow frontend access if needed for UI badges
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax'
                });

                // 3. Increment Clicks (Passive tracking)
                affiliate.metrics.totalClicks += 1;
                await affiliate.save();

                req.referralCode = refCode.toLowerCase();
            }
        } else {
            // Check if cookie exists from previous visit
            const cookieRef = req.cookies?.antflow_ref;
            if (cookieRef) {
                req.referralCode = cookieRef;
            }
        }

        next();
    } catch (error) {
        console.error('[ReferralMiddleware] Tracking failed:', error);
        next(); // Don't block requests if tracking fails
    }
};
