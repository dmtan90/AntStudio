import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import config from '../utils/config.js';
import { License } from '../models/License.js';
import { connectDB } from '../utils/db.js';
import { authMiddleware, adminMiddleware, sysAdminMiddleware, AuthRequest } from '../middleware/auth.js';

import { LicensePackage } from '../models/LicensePackage.js';
import { Release } from '../models/Release.js';

const router = Router();

// Middleware to ensure DB connection
router.use(async (req, res, next) => {
    await connectDB();
    next();
});

// GET /api/license/packages - Public (Master Mode)
router.get('/packages', async (req, res) => {
    try {
        const pkgs = await LicensePackage.find({ isActive: true });
        res.json({ success: true, data: { packages: pkgs } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// GET /api/license/my-licenses - Customer view (Master Mode)
router.get('/my-licenses', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const licenses = await License.find({ owner: req.user!.email }).sort({ createdAt: -1 });
        res.json({ success: true, data: { licenses } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/license/activate - Edge Server Activation Handshake
router.post('/activate', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { key } = req.body;
        if (!key) return res.status(400).json({ success: false, error: 'Key Identity required.' });

        // 1. Call Master Hub for validation
        const response = await axios.post(`${config.masterServerUrl}/api/license/license-status`, {
            key,
            instanceId: process.env.INSTANCE_ID || 'edge-default',
            version: '1.4.0'
        });

        const remote = response.data;
        if (remote.status !== 'valid') {
            return res.status(402).json({ success: false, error: remote.message || 'Registry Handshake Failed.' });
        }

        // 2. Persist local registry cache
        await License.deleteMany({}); // Only one active registry per Edge unit
        const localLic = await License.create({
            key,
            owner: remote.owner,
            tier: remote.tier,
            startDate: new Date(),
            endDate: new Date(remote.endDate),
            status: 'valid',
            instancesLimit: 1, // Edge doesn't manage multiple units
            maxUsersPerInstance: remote.limits.maxUsersPerInstance,
            maxProjectsPerInstance: remote.limits.maxProjectsPerInstance
        });

        res.json({ success: true, data: { license: localLic } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: 'Target Registry Hub Unreachable.' });
    }
});

// POST /api/license/renew - High-Fidelity Renewal (Master Mode)
router.post('/renew', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { key, packageId } = req.body;
        const lic = await License.findOne({ key, owner: req.user!.email });
        if (!lic) return res.status(404).json({ success: false, error: 'Registry identity not found.' });

        const pkg = await LicensePackage.findById(packageId);
        if (!pkg) return res.status(404).json({ success: false, error: 'Tactical package not found.' });

        // Logic: Add duration relative to current endDate or Now
        const base = lic.endDate > new Date() ? lic.endDate : new Date();
        const newEnd = new Date(base);
        if (pkg.billingPeriod === 'monthly') newEnd.setMonth(newEnd.getMonth() + 1);
        else if (pkg.billingPeriod === 'yearly') newEnd.setFullYear(newEnd.getFullYear() + 1);

        lic.endDate = newEnd;
        lic.status = 'valid';
        lic.tier = pkg.tier;
        lic.instancesLimit = pkg.limits.instances;
        lic.maxUsersPerInstance = pkg.limits.usersPerInstance;
        lic.maxProjectsPerInstance = pkg.limits.projectsPerInstance;

        await lic.save();
        res.json({ success: true, data: { license: lic, message: 'Renewal established.' } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/license/generate - Specialized Master Engine
router.post('/generate', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { owner, tier, instancesLimit, durationDays, maxUsersPerInstance } = req.body;

        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + (durationDays || 365));

        const key = 'LIC-' + crypto.randomBytes(8).toString('hex').toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

        const license = await License.create({
            key,
            owner,
            tier: tier || 'trial',
            instancesLimit: instancesLimit || 1,
            maxUsersPerInstance: maxUsersPerInstance || 10,
            startDate,
            endDate,
            status: 'valid'
        });

        res.json({ success: true, data: { license } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/license/all - Sys-Admin view of all global registries (Master Mode)
router.get('/all', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        const licenses = await License.find().sort({ createdAt: -1 });
        res.json({ success: true, data: { licenses } });
    } catch (e: any) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// POST /api/license/license-status - The Neural Heartbeat (Edge -> Master)
router.post('/license-status', async (req, res) => {
    try {
        const { key, instanceId, ip, version } = req.body;

        const license = await License.findOne({ key });
        if (!license) return res.json({ status: 'invalid', message: 'Registry identity not found.' });
        if (license.status === 'revoked') return res.json({ status: 'revoked', message: 'License access terminated.' });

        const now = new Date();
        if (now > license.endDate) {
            if (license.status !== 'expired') {
                license.status = 'expired';
                await license.save();
            }
            return res.json({ status: 'expired', endDate: license.endDate.getTime() });
        }

        // Fleet Telemetry Update
        let telemetry = license.fleetTelemetry.find(f => f.instanceId === instanceId);
        if (!telemetry) {
            // New instance pairing
            if (license.activeInstances >= license.instancesLimit) {
                return res.json({ status: 'invalid', message: 'Instance limit reached. Upgrade required.' });
            }
            license.fleetTelemetry.push({
                instanceId,
                lastIp: ip || req.ip,
                lastHeartbeat: now,
                version: version || '1.0.0'
            });
            license.activeInstances += 1;
        } else {
            telemetry.lastIp = ip || req.ip;
            telemetry.lastHeartbeat = now;
            telemetry.version = version || '1.0.0';
        }

        license.lastCheckedAt = now;
        await license.save();

        res.json({
            status: 'valid',
            licenseId: license._id,
            tier: license.tier,
            owner: license.owner,
            endDate: license.endDate.getTime(),
            limits: {
                users: license.maxUsersPerInstance,
                projects: license.maxProjectsPerInstance
            }
        });
    } catch (error: any) {
        res.status(500).json({ status: 'error', message: 'Neural validation engine failure.' });
    }
});

// PUT /api/license/:id - Update License (Master Mode)
router.put('/:id', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const license = await License.findByIdAndUpdate(id, updates, { new: true });
        if (!license) return res.status(404).json({ success: false, error: 'License not found' });

        res.json({ success: true, data: { license } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// DELETE /api/license/:id - Delete License (Master Mode)
router.delete('/:id', authMiddleware, sysAdminMiddleware, async (req: AuthRequest, res) => {
    try {
        const { id } = req.params;
        const license = await License.findByIdAndDelete(id);
        if (!license) return res.status(404).json({ success: false, error: 'License not found' });

        res.json({ success: true, data: { message: 'License deleted' } });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
