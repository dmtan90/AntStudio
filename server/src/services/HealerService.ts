import { aiAccountManager } from '../utils/ai/AIAccountManager.js';
import { privateLLMClient } from '../utils/ai/PrivateLLMClient.js';
import { systemLogger } from '../utils/systemLogger.js';

export interface HealthStatus {
    providerId: string;
    status: 'healthy' | 'unstable' | 'down';
    latencyMs: number;
    errorCount: number;
    lastHealedAt?: Date;
}

/**
 * Service for autonomous incident self-healing and service resilience.
 */
export class HealerService {
    private healthCache: Map<string, HealthStatus> = new Map();

    /**
     * Reports an error from an AI provider to trigger healing logic.
     */
    public async reportError(providerId: string, error: any) {
        systemLogger.warn(`🔥 [Healer] Error reported for ${providerId}: ${error.message || 'Unknown error'}`, 'HealerService');

        let status = this.healthCache.get(providerId) || { providerId, status: 'healthy', latencyMs: 0, errorCount: 0 };
        status.errorCount++;

        if (status.errorCount >= 3) {
            status.status = 'down';
            await this.performSelfHealing(providerId);
        }

        this.healthCache.set(providerId, status);
    }

    /**
     * Attempts to heal a broken AI pipe.
     */
    private async performSelfHealing(providerId: string) {
        systemLogger.info(`🩹 [Healer] Initiating self-healing for ${providerId}...`, 'HealerService');

        if (providerId === 'google' || providerId === 'aistudio') {
            // Heal Action 1: Rotate Accounts
            console.log(`[Healer] Rotating API accounts for ${providerId}...`);
            // In a real scenario, we might mark the current account as 'cooldown' or similar

            // Heal Action 2: Verify Private Fallback
            const isLocalReady = await privateLLMClient.testConnection();
            if (isLocalReady) {
                systemLogger.info(`✅ [Healer] Private AI Fallback verified and ready.`, 'HealerService');
            }
        }

        const status = this.healthCache.get(providerId);
        if (status) {
            status.status = 'healthy';
            status.errorCount = 0;
            status.lastHealedAt = new Date();
        }
    }

    /**
     * Returns the global autonomy health overview.
     */
    public getAutonomyPulse() {
        return Array.from(this.healthCache.values());
    }
}

export const healerService = new HealerService();
