import { Router } from 'express';
import { Tenant } from '../models/Tenant.js';
import { User } from '../models/User.js';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { connectDB } from '../utils/db.js';

const router = Router();

/**
 * MASTER ENTERPRISE ENDPOINTS
 */

// GET /api/sub-tenant/list - Master lists their clients
router.get('/list', authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant || tenant.tenantType !== 'master') {
            return res.status(403).json({ error: 'Only Master Enterprises can access this' });
        }

        const subTenants = await Tenant.find({ parentId: tenant._id });
        res.json({ success: true, data: subTenants });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sub-tenant/create - Master creates a new Sub-Enterprise
router.post('/create', authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
        const masterTenant = req.tenant;
        if (!masterTenant || masterTenant.tenantType !== 'master') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const { name, subdomain, adminEmail, initialCredits } = req.body;

        // Create the Sub-Tenant
        const subTenant = await Tenant.create({
            name,
            subdomain: `${subdomain}.${masterTenant.subdomain}`, // Automatic hierarchical subdomain
            companyName: name,
            parentId: masterTenant._id,
            tenantType: 'sub',
            branding: { ...masterTenant.branding, companyName: name }, // Inherit but rename
            organizationPool: {
                total: initialCredits || 0,
                used: 0,
                monthlyAllocation: initialCredits || 0,
                negativeLimit: 0
            },
            license: {
                type: 'business',
                status: 'active',
                maxSeats: 10,
                features: masterTenant.license.features
            },
            billing: { plan: 'Managed', amount: 0, billingCycle: 'monthly' }, // Billed by master
            contact: { adminName: 'Sub Admin', adminEmail }
        } as any);

        res.json({ success: true, data: subTenant });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * SUB-ENTERPRISE TEAM MANAGEMENT
 */

// GET /api/sub-tenant/team - Sub-Admin lists their internal employees
router.get('/team', authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant || tenant.tenantType !== 'sub') {
            return res.status(403).json({ error: 'Only Corporate Sub-Admins can manage teams' });
        }

        const users = await User.find({ tenantId: tenant._id }).select('-password');
        res.json({ success: true, data: users });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// POST /api/sub-tenant/team/provision - Sub-Admin creates an employee account
router.post('/team/provision', authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant || tenant.tenantType !== 'sub') {
            return res.status(403).json({ error: 'Unauthorized: Only Sub-Admins can provision team users' });
        }

        const { email, firstName, lastName, role, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

        // 1. Check if user already exists
        const existing = await User.findOne({ email: email.toLowerCase() });
        if (existing) return res.status(400).json({ error: 'User with this email already exists' });

        // 2. Create the internal user linked to this specific sub-tenant
        const newUser = await User.create({
            email: email.toLowerCase(),
            password, // Note: Expecting bcrypt from client or hash here. For this B2B demo, we hash in model pre-save.
            firstName,
            lastName,
            role: role || 'user',
            tenantId: tenant._id,
            isAdmin: role === 'admin',
            isActive: true,
            credits: { balance: 0, membership: 0, bonus: 0, weekly: 0 } // Consumes from Org Pool instead
        } as any);

        res.json({
            success: true,
            message: `Account created for ${email}. User will now consume from ${tenant.name} credit pool.`,
            data: { id: (newUser as any)._id, email: (newUser as any).email }
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
