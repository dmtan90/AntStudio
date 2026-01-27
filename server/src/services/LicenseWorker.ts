import axios from 'axios';
import config from '../utils/config.js';
import { License } from '../models/License.js';
import { systemLogger } from '../utils/systemLogger.js';

export class LicenseWorker {
    private static interval: NodeJS.Timeout | null = null;

    /**
     * Start the neural heartbeat sync (Master <-> Edge).
     */
    static start() {
        if (config.systemMode === 'master') return;
        if (this.interval) return;

        console.log('📡 LicenseWorker: Initializing Edge-to-Master neural heartbeat...');

        // Immediate check
        this.checkStatus();

        // Periodic sync (every 6 hours for production stability)
        this.interval = setInterval(() => this.checkStatus(), 1000 * 60 * 60 * 6);
    }

    /**
     * Execute high-fidelity validation with central registry.
     */
    private static async checkStatus() {
        try {
            const localLic = await License.findOne();
            if (!localLic) return;

            const response = await axios.post(`${config.masterServerUrl}/api/license/license-status`, {
                key: localLic.key,
                instanceId: process.env.INSTANCE_ID || 'edge-default',
                version: '1.4.0'
            });

            const remote = response.data;
            if (remote.status === 'valid') {
                localLic.tier = remote.tier;
                localLic.endDate = new Date(remote.endDate);
                localLic.status = 'valid';
                localLic.maxUsersPerInstance = remote.limits.users;
                localLic.maxProjectsPerInstance = remote.limits.projects;
                await localLic.save();
                console.log(`✅ License VALID: Tier [${remote.tier.toUpperCase()}] sync complete.`);
            } else {
                localLic.status = remote.status || 'expired';
                await localLic.save();
                systemLogger.warn(`🛡️ License ${remote.status.toUpperCase()}: Production units throttled.`);
            }
        } catch (error: any) {
            systemLogger.error(`📡 Neural Handshake Failure (Master Registry Offline): ${error.message}`);
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
