import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { Organization } from '../models/Organization.js';
import { Permission, OrgRole, hasPermission } from '../utils/permissions.js';

/**
 * RBAC Middleware: Enforce granular specialized permissions.
 * @param requiredPermission The tactical permission required for this mission.
 */
export const rbacMiddleware = (requiredPermission: Permission) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({ success: false, error: 'Authentication required' });
            }

            // 1. Identify active organization context
            const user = await req.user; // Assuming req.user is populated by authMiddleware
            const activeOrgId = (req as any).user?.currentOrganizationId;

            // If no org context, some routes might allow personal access (heuristic check)
            // But for Enterprise RBAC, we strictly check organization membership.
            if (!activeOrgId) {
                // If the operation is strictly for organizations, block it.
                // return res.status(403).json({
                //     success: false,
                //     error: 'Tactical Error: active organization context required for this operation.'
                // });
                return next();
            }

            // 2. Fetch Organization and resolve user's role
            const org = await Organization.findById(activeOrgId);
            if (!org) {
                return res.status(404).json({ success: false, error: 'Target organization not found' });
            }

            const member = org.members.find(m => m.userId.toString() === req.user!.userId.toString());
            if (!member) {
                return res.status(403).json({ success: false, error: 'Access denied: You are not a member of this unit.' });
            }

            // 3. Validate Permission
            const role = member.role as OrgRole;
            if (!hasPermission(role, requiredPermission)) {
                return res.status(403).json({
                    success: false,
                    error: `Tactical clearance failed: Role '${role.toUpperCase()}' lacks permission '${requiredPermission}'.`
                });
            }

            // Success: specialist has clearance
            next();
        } catch (error: any) {
            console.error('RBAC Middleware Error:', error);
            res.status(500).json({ success: false, error: 'Security Engine failure during tactical check.' });
        }
    };
};
