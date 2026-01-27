import { OrganizationService } from '../services/OrganizationService.js';
import { authMiddleware } from '../middleware/auth.js';
import { rbacMiddleware } from '../middleware/rbac.js';
import { Permission } from '../utils/permissions.js';
import express, { Request, Response } from 'express';

const router = express.Router();

// Get all organizations for current user
router.get('/', authMiddleware, async (req: any, res: Response) => {
    try {
        const orgs = await OrganizationService.getUserOrganizations(req.user.id);
        res.json({ success: true, data: orgs });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Create new organization
router.post('/', authMiddleware, async (req: any, res: Response) => {
    try {
        const org = await OrganizationService.createOrganization(req.user.id, req.body);
        res.json({ success: true, data: org });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Add member (requires owner/producer check)
router.post('/:id/members', authMiddleware, rbacMiddleware(Permission.ORG_INVITE), async (req: any, res: Response) => {
    try {
        const org = await OrganizationService.addMember(req.params.id, req.body.userId, req.body.role, req.user.id);
        res.json({ success: true, data: org });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Remove member
router.delete('/:id/members/:userId', authMiddleware, rbacMiddleware(Permission.ORG_REMOVE_MEMBER), async (req: any, res: Response) => {
    try {
        const org = await OrganizationService.removeMember(req.params.id, req.params.userId);
        res.json({ success: true, data: org });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Associate project
router.post('/:id/projects/:projectId', authMiddleware, async (req: Request, res: Response) => {
    try {
        await OrganizationService.associateProject(req.params.projectId, req.params.id);
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Send Investigation
router.post('/:id/invitations', authMiddleware, rbacMiddleware(Permission.ORG_INVITE), async (req: any, res: Response) => {
    try {
        const invite = await OrganizationService.inviteMember(req.params.id, req.user.id, req.body.email, req.body.role);
        res.json({ success: true, data: invite });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Get Pending Invitations
router.get('/:id/invitations', authMiddleware, async (req: Request, res: Response) => {
    try {
        const invites = await OrganizationService.getPendingInvitations(req.params.id);
        res.json({ success: true, data: invites });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Accept Invitation
router.post('/accept-invite', authMiddleware, async (req: any, res: Response) => {
    try {
        await OrganizationService.acceptInvitation(req.user.id, req.body.token);
        res.json({ success: true, message: 'Tactical Onboarding Successful' });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

// Switch Active Context
router.post('/switch/:id', authMiddleware, async (req: any, res: Response) => {
    try {
        // Actual logic: update user.currentOrganizationId
        res.json({ success: true });
    } catch (e: any) {
        res.status(400).json({ success: false, error: e.message });
    }
});

export default router;
