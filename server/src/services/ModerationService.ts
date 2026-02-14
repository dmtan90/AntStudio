import { ModerationAudit } from '../models/ModerationAudit.js';
import { Tenant } from '../models/Tenant.js';
import { systemLogger } from '../utils/systemLogger.js';
import { GoogleGenAI } from '@google/genai';
import { geminiPool } from '../utils/gemini.js';
import axios from 'axios';

/**
 * Service to handle AI Safety and Enterprise Content Moderation.
 * Centralizes vetting for both Text (Prompts) and Visual (Generated Media) assets.
 */
export const moderationService = {
    async getPoolClient(modelId: string) {
        return await geminiPool.getOptimalClient(modelId);
    },

    /**
     * Vets a text prompt for safety violations.
     * Integrates logic for standard toxicity + enterprise blacklists.
     */
    async vetPrompt(userId: string, tenantId: string | undefined, prompt: string): Promise<{ allowed: boolean; reason?: string }> {
        try {
            console.log(`[Moderation] Vetting prompt for user ${userId}...`);

            // 1. Enterprise Custom Blacklist
            if (tenantId) {
                const tenant = await Tenant.findById(tenantId);
                const customBlacklist = (tenant as any)?.settings?.moderation?.blacklist || [];
                const foundBlacklisted = customBlacklist.find((k: string) => prompt.toLowerCase().includes(k.toLowerCase()));

                if (foundBlacklisted) {
                    await this.logViolation(userId, tenantId, 'text', prompt, { brandRisk: 1.0 }, 'blocked');
                    return { allowed: false, reason: `Enterprise policy block: Restricted keyword detected` };
                }
            }

            // 2. AI Safety Check (Gemini)
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await this.getPoolClient(modelName);
            const promptContent = `
                Evaluate the safety of the following text for a public platform. 
                Text: "${prompt}"
                Check for: Hate speech, Harassment, Explicit violence, Self-harm, Sexual content.
                Return ONLY a JSON object: { "safe": boolean, "flag": string | null, "score": number (0-1) }
            `;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: promptContent }] }]
            });
            
            const response = result.response;
            const text = response.text();
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);
            
            // Clean markdown json if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const analysis = JSON.parse(jsonStr);

            if (!analysis.safe) {
                await this.logViolation(userId, tenantId, 'text', prompt, { toxicity: analysis.score }, 'blocked');
                return { allowed: false, reason: `Safety Violation: ${analysis.flag || 'Restricted Content'}` };
            }

            return { allowed: true };

        } catch (error: any) {
            console.error('[Moderation] Prompt vetting failed:', error);
            // Fallback to basic keyword check if AI fails
            const toxicKeywords = ['hate speech', 'extremism', 'violence'];
            if (toxicKeywords.some(k => prompt.toLowerCase().includes(k))) {
                 return { allowed: false, reason: 'Safety block (Fallback)' };
            }
            return { allowed: true }; // Fail open for minor errors
        }
    },

    /**
     * Vets a generated media asset (thumbnail/video).
     */
    async vetMedia(userId: string, tenantId: string | undefined, mediaUrl: string): Promise<{ allowed: boolean; status: 'ready' | 'flagged' | 'blocked' }> {
        try {
            console.log(`[Moderation] Scanning media content: ${mediaUrl}`);

            // Only analyze if it's an accessible HTTP/HTTPS image
            if (!mediaUrl.startsWith('http') || mediaUrl.match(/\.(mp4|webm|mov)$/i)) {
                 return { allowed: true, status: 'ready' };
            }

            try {
                // Fetch image buffer
                const response = await axios.get(mediaUrl, { responseType: 'arraybuffer', timeout: 5000 });
                const base64 = Buffer.from(response.data).toString('base64');
                const mimeType = response.headers['content-type'] || 'image/jpeg';

                const modelName = "gemini-2.5-flash";
                const { client: ai, key } = await this.getPoolClient(modelName);
                const result = await (ai as any).models.generateContent({
                    model: modelName,
                    contents: [{
                        parts: [
                            { text: "Analyze this image for safety. Check for: Nudity, Gore, Hate Symbols. Return JSON: { \"safe\": boolean, \"reason\": string }" },
                            { inlineData: { data: base64, mimeType } }
                        ]
                    }]
                });
                
                const aiRes = result.response;
                const jsonStr = aiRes.text().replace(/```json/g, '').replace(/```/g, '').trim();
                
                // Record usage
                await geminiPool.recordUsage(key, modelName);
                const analysis = JSON.parse(jsonStr);

                if (!analysis.safe) {
                    await this.logViolation(userId, tenantId, 'image', mediaUrl, { nsfw: 1.0 }, 'flagged');
                    return { allowed: true, status: 'flagged' };
                }

            } catch (fetchErr) {
                console.warn('[Moderation] Could not fetch/analyze media for vetting:', fetchErr);
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
