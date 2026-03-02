import axios from 'axios';
import https from 'https';
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
     * Get the current license status (cached, from Settings, or fallback to DB).
     */
    static async getLicense() {
        if (this.currentLicense) return this.currentLicense;
        
        // 1. Try AdminSettings (Primary source for synced info)
        const settings = await AdminSettings.findOne();
        if (settings?.license?.info?.status === 'valid') {
            this.currentLicense = {
                key: settings.license.key,
                ...settings.license.info,
                maxUsersPerInstance: settings.license.info.maxUsers,
                maxProjectsPerInstance: settings.license.info.maxProjects
            };
            return this.currentLicense;
        }

        // 2. Fallback to License collection (Managed by license API routes)
        const localLic = await License.findOne();
        this.currentLicense = localLic;
        return localLic;
    }

    /**
     * Execute high-fidelity validation with central registry.
     * Updates AdminSettings and internal cache but avoids direct License model CRUD
     * to respect separation of concerns with the License API routes.
     */
    public static async checkStatus(forcedKey?: string) {
        try {
            let key = forcedKey;
            const settings = await AdminSettings.findOne();
            
            // 1. Determine the key to validate
            if (!key) {
                key = settings?.license?.key;
            }

            // Fallback to legacy License model key if settings is empty
            if (!key) {
                const localLic = await License.findOne();
                key = localLic?.key;
            }

            if (!key) {
                Logger.warn('LicenseWorker: No license key found in database or settings.', 'LicenseWorker');
                return;
            }

            Logger.info(`LicenseWorker: Validating license [${key.substring(0, 10)}...]`, "LicenseWorker", {
                instanceId: process.env.INSTANCE_ID || 'edge-default',
                version: '1.4.0',
                masterServerUrl: config.masterServerUrl
            });

            const response = await axios.post(`${config.masterServerUrl}/api/license/license-status`, {
                key: key,
                instanceId: process.env.INSTANCE_ID || 'edge-default',
                version: '1.4.0'
            }, {
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            });

            const remote = response.data;
            Logger.info("LicenseWorker: Remote response", "LicenseWorker", { status: remote.status, tier: remote.tier, owner: remote.owner });

            if (remote.status === 'valid') {
                // Update AdminSettings for UI and system sync
                if (settings) {
                    settings.license.info = {
                        status: 'valid',
                        type: remote.tier,
                        maxUsers: remote.limits.users,
                        maxProjects: remote.limits.projects,
                        startDate: settings.license.info?.startDate || new Date(),
                        endDate: new Date(remote.endDate),
                        owner: remote.owner,
                        lastCheckedAt: new Date()
                    };
                    await settings.save();
                }

                // Update memory cache for middleware/workers
                this.currentLicense = {
                    key: key,
                    status: 'valid',
                    tier: remote.tier,
                    owner: remote.owner,
                    endDate: new Date(remote.endDate),
                    maxUsersPerInstance: remote.limits.users,
                    maxProjectsPerInstance: remote.limits.projects
                };

                Logger.info(`✅ License VALID: Tier [${remote.tier.toUpperCase()}] sync complete.`, 'LicenseWorker');
            } else {
                if (settings) {
                    settings.license.info.status = (remote.status || 'expired') as any;
                    settings.license.info.lastCheckedAt = new Date();
                    await settings.save();
                }

                this.currentLicense = {
                    key: key,
                    status: remote.status || 'expired',
                    tier: remote.tier || 'trial'
                };

                Logger.warn(`🛡️ License ${remote.status?.toUpperCase() || 'EXPIRED'}: Production units throttled.`, 'LicenseWorker');
                Logger.info(`📡 Master Hub Baseline:`, 'LicenseWorker', remote);
            }
        } catch (error: any) {
            if (error.response) {
                Logger.error(`📡 Neural Handshake Rejected: ${error.response.data?.error || error.message}`, 'LicenseWorker');
            } else if (error.request) {
                Logger.error(`📡 Neural Handshake Timeout (Master Registry Offline): ${error.message}`, 'LicenseWorker');
            } else {
                Logger.error(`📡 License Engine Fault: ${error.message}`, 'LicenseWorker');
            }
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
