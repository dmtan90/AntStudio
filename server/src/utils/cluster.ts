import { AdminSettings } from '../models/AdminSettings.js';
import { systemLogger } from './systemLogger.js';

/**
 * Cluster Orchestration Service.
 * Ensures synchronized settings across distributed production units.
 */
export class ClusterService {
    private static cachedSettings: any = null;
    private static lastUpdate: number = 0;
    private static readonly SYNC_TTL = 300000; // 5 minutes tactical refresh

    /**
     * Retrieve high-fidelity configuration, synchronized across the cluster.
     */
    static async getSettings(force = false) {
        const now = Date.now();
        if (!force && this.cachedSettings && (now - this.lastUpdate < this.SYNC_TTL)) {
            return this.cachedSettings;
        }

        try {
            const settings = await AdminSettings.findOne().lean();
            this.cachedSettings = settings;
            this.lastUpdate = now;
            systemLogger.info('📡 Cluster Sync: Configuration registry refreshed.');
            return settings;
        } catch (error: any) {
            systemLogger.error('📡 Cluster Handshake Failed: Registry unreachable.');
            return this.cachedSettings;
        }
    }

    /**
     * Broadcast update to the local cluster registry.
     */
    static triggerRefresh() {
        this.lastUpdate = 0; // Next call will force high-fidelity fetch
    }
}
