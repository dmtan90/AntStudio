import { ModerationAudit } from '../models/ModerationAudit.js';
import { Tenant } from '../models/Tenant.js';
import { systemLogger } from '../utils/systemLogger.js';

/**
 * Service to handle AI Safety and Enterprise Content Moderation.
 * Centralizes vetting for both Text (Prompts) and Visual (Generated Media) assets.
 */
export const moderationService = {
    /**
     * Vets a text prompt for safety violations.
     * Integrates logic for standard toxicity + enterprise blacklists.
     */
    async vetPrompt(userId: string, tenantId: string | undefined, prompt: string): Promise<{ allowed: boolean; reason?: string }> {
        try {
            console.log(`[Moderation] Vetting prompt for user ${userId}...`);

            // 1. Check Standard Blacklist (Mocking Perspective API/Local Regex)
            const toxicKeywords = ['hate speech', 'extremsim', 'violence', 'harassment'];
            const foundToxic = toxicKeywords.find(k => prompt.toLowerCase().includes(k));

            if (foundToxic) {
                await this.logViolation(userId, tenantId, 'text', prompt, { toxicity: 0.9 }, 'blocked');
                return { allowed: false, reason: `Standard safety block: Restricted content detected (${foundToxic})` };
            }

            // 2. Check Enterprise Custom Blacklist
            if (tenantId) {
                const tenant = await Tenant.findById(tenantId);
                const customBlacklist = (tenant as any)?.settings?.moderation?.blacklist || [];
                const foundBlacklisted = customBlacklist.find((k: string) => prompt.toLowerCase().includes(k.toLowerCase()));

                if (foundBlacklisted) {
                    await this.logViolation(userId, tenantId, 'text', prompt, { brandRisk: 1.0 }, 'blocked');
                    return { allowed: false, reason: `Enterprise policy block: Restricted keyword detected` };
                }
            }

            return { allowed: true };

        } catch (error: any) {
            console.error('[Moderation] Prompt vetting failed:', error);
            return { allowed: true }; // Fail open for now (Production should fail closed)
        }
    },

    /**
     * Vets a generated media asset (thumbnail/video).
     */
    async vetMedia(userId: string, tenantId: string | undefined, mediaUrl: string): Promise<{ allowed: boolean; status: 'ready' | 'flagged' | 'blocked' }> {
        try {
            console.log(`[Moderation] Scanning media content: ${mediaUrl}`);

            // Mock Vision analysis (e.g. searching for NSFW markers in metadata or visual fingerprint)
            const isSuspicious = mediaUrl.includes('edgy') || Math.random() > 0.95;

            if (isSuspicious) {
                await this.logViolation(userId, tenantId, 'video', mediaUrl, { nsfw: 0.8 }, 'flagged');
                return { allowed: true, status: 'flagged' }; // Flag for review but don't hard block yet
            }

            return { allowed: true, status: 'ready' };
        } catch (error) {
            return { allowed: true, status: 'ready' };
        }
    },

    async logViolation(userId: string, tenantId: string | undefined, type: 'text' | 'image' | 'video', content: string, scores: any, status: 'flagged' | 'blocked') {
        try {
            await ModerationAudit.create({
                userId,
                tenantId,
                type,
                content,
                scores,
                status
            });
            systemLogger.warn(`Moderation Alert [${status}]: User ${userId} triggered safety filter for ${type}`, 'ModerationService');
        } catch (e) {
            console.error('Failed to log moderation audit:', e);
        }
    }
};
