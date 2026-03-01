import axios from 'axios';
import config from '../utils/config.js';
import { License } from '../models/License.js';
import { AdminSettings } from '../models/AdminSettings.js';
import { Logger } from '../utils/Logger.js';

export class LicenseWorker {
    private static interval: NodeJS.Timeout | null = null;
    private static currentLicense: any = null;

    /**
     * Start the neural heartbeat sync (Master <-> Edge).
     */
    static start() {
        if (config.systemMode === 'master') return;
        if (this.interval) return;

        Logger.info('📡 LicenseWorker: Initializing Edge-to-Master neural heartbeat...', 'LicenseWorker');

        // Immediate check
        this.checkStatus();

        // Periodic sync (every 6 hours for production stability)
        this.interval = setInterval(() => this.checkStatus(), 1000 * 60 * 60 * 6);
    }

    /**
     * Get the current license status (cached or from DB).
     */
    static async getLicense() {
        if (this.currentLicense) return this.currentLicense;
        
        const localLic = await License.findOne();
        this.currentLicense = localLic;
        return localLic;
    }

    /**
     * Execute high-fidelity validation with central registry.
     */
    public static async checkStatus() {

        try {
            const localLic = await License.findOne();
            if (!localLic) return;

            const response = await axios.post(`${config.masterServerUrl}/api/license/license-status`, {
                key: localLic.key,
                instanceId: process.env.INSTANCE_ID || 'edge-default',
                version: '1.4.0'
            });

            const remote = response.data;
            const settings = await AdminSettings.findOne();

            if (remote.status === 'valid') {
                localLic.tier = remote.tier;
                localLic.endDate = new Date(remote.endDate);
                localLic.status = 'valid';
                localLic.maxUsersPerInstance = remote.limits.users;
                localLic.maxProjectsPerInstance = remote.limits.projects;
                await localLic.save();

                // Update AdminSettings for UI sync
                if (settings) {
                    settings.license.info = {
                        status: 'valid',
                        type: remote.tier,
                        maxUsers: remote.limits.users,
                        maxProjects: remote.limits.projects,
                        startDate: localLic.startDate,
                        endDate: localLic.endDate,
                        owner: remote.owner,
                        lastCheckedAt: new Date()
                    };
                    await settings.save();
                }

                this.currentLicense = localLic;
                Logger.info(`✅ License VALID: Tier [${remote.tier.toUpperCase()}] sync complete.`, 'LicenseWorker');
            } else {
                localLic.status = remote.status || 'expired';
                await localLic.save();

                if (settings) {
                    settings.license.info.status = (remote.status || 'expired') as any;
                    settings.license.info.lastCheckedAt = new Date();
                    await settings.save();
                }

                this.currentLicense = localLic;
                Logger.warn(`🛡️ License ${remote.status?.toUpperCase() || 'EXPIRED'}: Production units throttled.`, 'LicenseWorker');
                Logger.info(`📡 Master Hub Baseline:`, 'LicenseWorker', remote);
            }
        } catch (error: any) {
            Logger.error(`📡 Neural Handshake Failure (Master Registry Offline): ${error.message}`, 'LicenseWorker');
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
