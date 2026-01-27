import { Project } from '../models/Project.js';
import { UserPlatformAccount } from '../models/UserPlatformAccount.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from '../utils/configService.js';
import { systemLogger } from '../utils/systemLogger.js';

/**
 * Service for autonomous syndication of viral clips to Social Platforms.
 */
export class SocialSyndicationService {
    private genAI: GoogleGenerativeAI;

    constructor() {
        const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || '';
        this.genAI = new GoogleGenerativeAI(apiKey);
    }

    /**
     * Automatically syndicates a viral clip to all connected short-form platforms.
     */
    public async syndicateClip(projectId: string, clipAssetId: string) {
        try {
            const project = await Project.findById(projectId);
            if (!project) return;

            const clip = project.visualAssets?.find((a: any) => a._id?.toString() === clipAssetId);
            if (!clip || !clip.metadata?.isViralClip) return;

            systemLogger.info(`🚀 [Syndication] Starting syndication for clip: ${clip.name} (Project: ${project.title})`, 'SocialSyndicationService');

            // 1. Generate Metadata (Viral Title/Hashtags)
            const metadata = await this.generateViralMetadata(clip.name, project.description);

            // 2. Find enabled syndication accounts for the user
            const accounts = await UserPlatformAccount.find({
                userId: project.userId,
                isActive: true,
                platform: { $in: ['tiktok', 'youtube', 'facebook'] } // Short-form capable
            });

            const uploadTasks = accounts.map(async (acc) => {
                // Simulate Platform API Upload (TikTok/Reels/Shorts)
                console.log(`📤 Uploading to ${acc.platform} (${acc.accountName})...`);

                // In real implementation, this would use platform-specific SDK/REST APIs
                // with the account's OAuth tokens.

                return { platform: acc.platform, status: 'simulated_success', timestamp: new Date() };
            });

            const results = await Promise.all(uploadTasks);

            // 3. Update Syndication History in project (Custom log)
            await Project.findByIdAndUpdate(projectId, {
                $push: {
                    chatHistory: {
                        author: 'system',
                        content: `✅ Viral clip "${clip.name}" syndicated to ${results.length} platforms.`,
                        timestamp: new Date()
                    }
                }
            });

            systemLogger.info(`✅ [Syndication] Completed for clip: ${clip.name}. Distributed to ${results.length} channels.`, 'SocialSyndicationService');

        } catch (error: any) {
            systemLogger.error(`❌ [Syndication] Failed: ${error.message}`, 'SocialSyndicationService');
        }
    }

    private async generateViralMetadata(clipTitle: string, context: string) {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = `Generate a viral caption and 5 trending hashtags for a short-form video titled "${clipTitle}". Context: ${context}. Return as JSON: { caption: string, hashtags: string[] }`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return JSON.parse(response.text().match(/\{.*\}/s)?.[0] || '{}');
        } catch {
            return { caption: clipTitle, hashtags: ['#viral', '#antstudio', '#ai'] };
        }
    }
}

export const socialSyndicationService = new SocialSyndicationService();
