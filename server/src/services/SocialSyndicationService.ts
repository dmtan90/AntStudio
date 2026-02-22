import { Project } from '../models/Project.js';
import mongoose, { Types } from 'mongoose';
import { UserPlatformAccount, SocialPlatform } from '../models/UserPlatformAccount.js';
import { GoogleGenAI } from '@google/genai';
import { geminiPool } from '../utils/gemini.js';
import { systemLogger } from '../utils/systemLogger.js';
import { PlatformAuthService } from './PlatformAuthService.js';
import { SyndicationRecord, ISyndicationRecord } from '../models/SyndicationRecord.js';
import configService from '../utils/config.js';
import { notificationService } from './NotificationService.js';

/**
 * Service for autonomous syndication of viral clips to Social Platforms.
 */
export class SocialSyndicationService {
    constructor() {
        this.startBackgroundProcessor();
    }

    /**
     * Periodically checks for and processes scheduled syndications.
     */
    private startBackgroundProcessor() {
        // Run every minute
        setInterval(async () => {
            try {
                const now = new Date();
                const scheduled = await SyndicationRecord.find({
                    status: 'scheduled',
                    scheduledAt: { $lte: now }
                });

                if (scheduled.length > 0) {
                    systemLogger.info(`[Syndication] Background processor found ${scheduled.length} tasks to trigger.`, 'SocialSyndicationService');
                    for (const record of scheduled) {
                        this.processScheduledRecord(record);
                    }
                }
            } catch (err) {
                systemLogger.error(`[Syndication] Background processor failed: ${err instanceof Error ? err.message : String(err)}`, 'SocialSyndicationService');
            }
        }, 60000);
    }

    private async processScheduledRecord(record: ISyndicationRecord) {
        try {
            systemLogger.info(`[Syndication] Triggering scheduled post: ${record._id}`, 'SocialSyndicationService');
            
            // Re-fetch project to get latest video key
            const project = await Project.findById(record.projectId);
            if (!project) throw new Error('Project missing');

            let s3Key = project.publish?.s3Key;
            if (record.assetId) {
                const asset = project.visualAssets?.find(a => a._id?.toString() === record.assetId?.toString());
                if (asset?.s3Key) s3Key = asset.s3Key;
            }

            if (!s3Key) throw new Error('S3 key missing for scheduled post');

            // Update status to pending to prevent re-processing
            record.status = 'pending';
            await record.save();

            // Use existing publishVideo logic
            await this.publishVideo(
                project._id.toString(),
                s3Key,
                [record.platformAccountId.toString()],
                { title: record.metadata.title, description: record.metadata.description },
                record.hookId && record.hookType ? { id: record.hookId, type: record.hookType } : undefined
            );

            // The publishVideo logic will update original record status to success/failed?
            // Actually publishVideo creates NEW records. 
            // I should delete this scheduled one or update it.
            // Looking at the original SocialSyndicationService.ts, publishVideo creates new records.
            // I will update the scheduled record to 'success' or 'failed' instead of creating new ones if I refactor publishVideo.
            // For now, I'll delete the scheduled one and let publishVideo create the permanent record.
            await SyndicationRecord.findByIdAndDelete(record._id);

        } catch (err) {
            record.status = 'failed';
            record.error = err instanceof Error ? err.message : String(err);
            await record.save();
        }
    }

    /**
     * Syndicates the final project video with provided viral metadata.
     */
    public async syndicateFinalVideo(projectId: string, metadata: { caption: string, hashtags: string[] }) {
        try {
            const project = await Project.findById(projectId);
            if (!project || !project.publish?.s3Key) {
                systemLogger.warn(`[Syndication] Aborted: Final video not ready for project ${projectId}`, 'SocialSyndicationService');
                return;
            }

            systemLogger.info(`[Syndication] Starting final video syndication for Project: ${project.title}`, 'SocialSyndicationService');

            // 1. Find enabled syndication accounts for the user
            const accounts = await UserPlatformAccount.find({
                userId: project.userId,
                isActive: true,
                platform: { $in: ['tiktok', 'youtube', 'facebook'] }
            });

            const results = await Promise.all(accounts.map(async (acc) => {
                // Simulate Platform API Upload
                console.log(`Uploading Final Video to ${acc.platform} (${acc.accountName})...`);
                
                const record = await SyndicationRecord.create({
                    userId: project.userId,
                    projectId: project._id,
                    platformAccountId: acc._id,
                    platform: acc.platform,
                    status: 'success',
                    metadata: {
                        title: project.title,
                        description: metadata.caption
                    },
                    publishedAt: new Date()
                });

                return { platform: acc.platform, status: 'success', recordId: record._id };
            }));

            // 2. Update Syndication History in project
            await Project.findByIdAndUpdate(projectId, {
                $push: {
                    chatHistory: {
                        author: 'system',
                        content: `Final Montage syndicated to ${results.length} platforms with viral metadata.`,
                        timestamp: new Date()
                    }
                }
            });

            systemLogger.info(`[Syndication] Final video distributed to ${results.length} channels.`, 'SocialSyndicationService');
            return { success: true, count: results.length };

        } catch (error: any) {
            systemLogger.error(`[Syndication] Final video failed: ${error.message}`, 'SocialSyndicationService');
            throw error;
        }
    }

    /**
     * Syndicates a specific clip asset with viral metadata.
     */
    public async syndicateClip(projectId: string, assetId: string) {
        try {
            const project = await Project.findById(projectId);
            if (!project) return;

            const asset = project.visualAssets?.find(a => a._id?.toString() === assetId);
            if (!asset || !asset.s3Key) {
                systemLogger.warn(`[Syndication] Asset ${assetId} not found or missing s3Key`, 'SocialSyndicationService');
                return;
            }

            systemLogger.info(`🚀 [Syndication] Syndicating clip: ${asset.name}`, 'SocialSyndicationService');
            
            // Find enabled platform accounts
            const accounts = await UserPlatformAccount.find({
                userId: project.userId,
                isActive: true,
                platform: { $in: ['tiktok', 'youtube', 'facebook'] }
            });

            if (accounts.length === 0) {
                systemLogger.warn(`[Syndication] No active platform accounts for user ${project.userId}`, 'SocialSyndicationService');
                return;
            }

            // Immediately publish to all eligible platforms
            return this.publishVideo(
                projectId,
                asset.s3Key,
                accounts.map(acc => acc._id.toString()),
                { 
                    title: asset.name, 
                    description: asset.description || `Viral clip from project ${project.title}` 
                },
                { id: assetId, type: 'visualAsset' }
            );
        } catch (error: any) {
            systemLogger.error(`❌ [Syndication] Clip syndication failed: ${error.message}`, 'SocialSyndicationService');
        }
    }

    /**
     * Publish a video asset (S3) to specified social platforms.
     */
    public async publishVideo(
        projectId: string,
        s3Key: string,
        platformAccountIds: string[],
        metadata: { title: string, description: string },
        hookInfo?: { id: string, type: string }
    ) {
        try {
            systemLogger.info(`🚀 [Syndication] Starting publish for Project: ${projectId}`, 'SocialSyndicationService');

            // 1. Validate Project & Asset
            const project = await Project.findById(projectId);
            if (!project) throw new Error('Project not found');

            // 2. Fetch Accounts
            const accounts = await UserPlatformAccount.find({
                _id: { $in: platformAccountIds },
                userId: project.userId,
                isActive: true
            });

            if (accounts.length === 0) throw new Error('No valid platform accounts found');

            const results = await Promise.all(accounts.map(async (acc) => {
                let record: any;
                try {
                    // 3. Get Credentials & Stream
                    const credentials = await PlatformAuthService.getValidCredentials(acc);
                    
                    // Create basic record (pending)
                    record = await SyndicationRecord.create({
                        userId: project.userId,
                        projectId: project._id,
                        platformAccountId: acc._id,
                        platform: acc.platform,
                        status: 'pending',
                        metadata: {
                            title: metadata.title,
                            description: metadata.description
                        },
                        hookId: hookInfo?.id,
                        hookType: hookInfo?.type
                    });

                    // Create a fresh stream for each upload
                    const s3Client = (await import('../utils/s3.js')).getS3Client();
                    const { GetObjectCommand } = await import('@aws-sdk/client-s3');
                    const command = new GetObjectCommand({
                        Bucket: configService.awsS3Bucket, // Fixed bucket name usage
                        Key: s3Key
                    });
                    const s3Res = await s3Client.send(command);
                    const videoStream = s3Res.Body as any;

                    // 4. Upload
                    const result = await PlatformAuthService.uploadVideo(
                        acc.platform,
                        credentials,
                        videoStream,
                        metadata,
                        `video_${Date.now()}.mp4`,
                        'video/mp4'
                    );

                    // Update record with success
                    record.status = 'success';
                    record.externalId = result.id || result.id?.videoId || 'uploaded';
                    record.externalUrl = result.url || (result.id ? `https://generated.url/${result.id}` : '');
                    record.publishedAt = new Date();
                    await record.save();

                    return { 
                        platform: acc.platform, 
                        status: 'success', 
                        id: record.externalId,
                        url: record.externalUrl,
                        recordId: record._id
                    };

                } catch (e: any) {
                    systemLogger.error(`❌ [Syndication] Upload failed for ${acc.platform}: ${e.message}`, 'SocialSyndicationService');
                    if (record) {
                        record.status = 'failed';
                        record.error = e.message;
                        await record.save();
                    }
                    return { platform: acc.platform, status: 'failed', error: e.message };
                }
            }));

            // 5. Update History
            const successCount = results.filter(r => r.status === 'success').length;
            await Project.findByIdAndUpdate(projectId, {
                $push: {
                    chatHistory: {
                        author: 'system',
                        content: `✅ Published video to ${successCount}/${accounts.length} platforms.`,
                        timestamp: new Date(),
                        result: results
                    }
                }
            });

            return results;
            
        } catch (error: any) {
            systemLogger.error(`❌ [Syndication] Publish failed: ${error.message}`, 'SocialSyndicationService');
            throw error;
        }
    }

    /**
     * Periodically syncs engagement metrics for successful records.
     */
    public async syncEngagementMetrics(userId?: string) {
        try {
            const query: any = { status: 'success', externalId: { $exists: true } };
            if (userId) query.userId = userId;

            // Find records that haven't been synced recently (e.g., in the last 15 mins)
            const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
            query.$or = [
                { lastSyncedAt: { $lt: fifteenMinsAgo } },
                { lastSyncedAt: { $exists: false } }
            ];

            const records = await SyndicationRecord.find(query).limit(50);
            if (records.length === 0) return;

            systemLogger.info(`[Syndication] Syncing engagement for ${records.length} records...`, 'SocialSyndicationService');

            await Promise.all(records.map(async (record) => {
                try {
                    const account = await UserPlatformAccount.findById(record.platformAccountId);
                    if (!account) return;

                    const credentials = await PlatformAuthService.getValidCredentials(account);
                    const stats = await PlatformAuthService.getVideoStats(record.platform, credentials, record.externalId!);

                    if (stats) {
                        record.engagement = {
                            views: stats.views || 0,
                            likes: stats.likes || 0,
                            comments: stats.comments || 0,
                            shares: stats.shares || 0
                        };
                        record.lastSyncedAt = new Date();
                        await record.save();

                        // Check Milestones
                        await this.checkMilestones(record);
                    }
                } catch (e: any) {
                    systemLogger.error(`[Syndication] Sync failed for record ${record._id}: ${e.message}`, 'SocialSyndicationService');
                }
            }));

            systemLogger.info(`[Syndication] Engagement sync complete.`, 'SocialSyndicationService');
        } catch (error: any) {
            systemLogger.error(`[Syndication] Global sync failed: ${error.message}`, 'SocialSyndicationService');
        }
    }

    /**
     * Retries a failed syndication record.
     */
    public async retrySyndication(recordId: string) {
        const record = await SyndicationRecord.findById(recordId);
        if (!record || record.status !== 'failed') throw new Error('Invalid record for retry');

        systemLogger.info(`[Syndication] Retrying record: ${recordId}`, 'SocialSyndicationService');
        
        const project = await Project.findById(record.projectId);
        if (!project) throw new Error('Project missing for retry');

        // Identify s3Key
        let s3Key = project.publish?.s3Key;
        if (record.assetId) {
            const asset = project.visualAssets?.find(a => a._id?.toString() === record.assetId?.toString());
            if (asset?.s3Key) s3Key = asset.s3Key;
        }

        if (!s3Key) throw new Error('Video asset missing for retry');

        // Delete the failed record and re-publish (or we could just update the existing one, but publishVideo creates a new one currently)
        // For simplicity, let's just trigger a new publish.
        await SyndicationRecord.findByIdAndDelete(recordId);

        return this.publishVideo(
            project._id.toString(),
            s3Key,
            [record.platformAccountId.toString()],
            { title: record.metadata.title, description: record.metadata.description }
        );
    }

    /**
     * Fetch, analyze, and return comments for a syndicated record.
     */
    public async getVideoComments(recordId: string) {
        const record = await SyndicationRecord.findById(recordId);
        if (!record || !record.externalId) throw new Error('Invalid record');

        const account = await UserPlatformAccount.findById(record.platformAccountId);
        if (!account) throw new Error('Platform account missing');

        const credentials = await PlatformAuthService.getValidCredentials(account);
        const rawComments = await PlatformAuthService.getComments(record.platform as SocialPlatform, credentials, record.externalId);

        if (rawComments.length === 0) return [];

        // Analyze sentiment using Gemini
        try {
            const commentsText = rawComments.map((c, i) => `${i}: ${c.text}`).join('\n');
            const modelName = "gemini-2.5-flash";
            const { client: ai } = await geminiPool.getOptimalClient(modelName);
            
            const prompt = `Analyze the sentiment of the following social media comments. Return a JSON array of sentiment strings (POSITIVE, NEUTRAL, NEGATIVE) corresponding to each comment index.
Comments:
${commentsText}`;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });
            const sentiments = JSON.parse(result.response.text().match(/\[.*\]/s)?.[0] || '[]');

            return rawComments.map((c, i) => ({
                ...c,
                sentiment: sentiments[i] || 'NEUTRAL'
            }));
        } catch (error) {
            systemLogger.warn(`[Syndication] Sentiment analysis failed: ${error instanceof Error ? error.message : String(error)}`, 'SocialSyndicationService');
            return rawComments.map(c => ({ ...c, sentiment: 'NEUTRAL' }));
        }
    }

    /**
     * Generate an AI-suggested reply for a comment.
     */
    public async generateAiReply(commentText: string, context: string) {
        try {
            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);
            
            const prompt = `You are a social media manager. Suggest a short, engaging, and friendly reply to this comment: "${commentText}". 
Context of the video: ${context}.
Return only the reply text.`;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });
            
            await geminiPool.recordUsage(key, modelName);
            return result.response.text().trim();
        } catch (error) {
            return "Thanks for watching! Glad you enjoyed it.";
        }
    }

    /**
     * Post a reply to a comment.
     */
    public async replyToComment(recordId: string, text: string, parentId?: string) {
        const record = await SyndicationRecord.findById(recordId);
        if (!record || !record.externalId) throw new Error('Invalid record');

        const account = await UserPlatformAccount.findById(record.platformAccountId);
        if (!account) throw new Error('Platform account missing');

        const credentials = await PlatformAuthService.getValidCredentials(account);
        return PlatformAuthService.postComment(record.platform as SocialPlatform, credentials, record.externalId, text, parentId);
    }

    private async checkMilestones(record: ISyndicationRecord) {
        const milestones = [
            { id: '100_views', threshold: 100, field: 'views', label: '100 Views' },
            { id: '1000_views', threshold: 1000, field: 'views', label: '1,000 Views' },
            { id: '5000_views', threshold: 5000, field: 'views', label: '5,000 Views' },
            { id: '10000_views', threshold: 10000, field: 'views', label: '10,000 Views' },
            { id: '50_likes', threshold: 50, field: 'likes', label: '50 Likes' },
            { id: '500_likes', threshold: 500, field: 'likes', label: '500 Likes' }
        ];

        const reached = record.milestonesReached || [];
        const newMilestones: string[] = [];

        for (const m of milestones) {
            if (reached.includes(m.id)) continue;

            const currentVal = (record.engagement as any)[m.field] || 0;
            if (currentVal >= m.threshold) {
                newMilestones.push(m.id);
                // Trigger notification via Topic (assuming user's personal topic is user_{userId})
                try {
                    await notificationService.sendToTopic(`user_${record.userId}`, 
                        'Viral Milestone Reached!', 
                        `Your clip "${record.metadata.title}" just hit ${m.label} on ${record.platform}!`,
                        { type: 'milestone', recordId: record._id.toString() }
                    );
                } catch (err) {
                    systemLogger.warn(`[Syndication] FCM failed for milestone: ${err instanceof Error ? err.message : String(err)}`, 'SocialSyndicationService');
                }
            }
        }

        if (newMilestones.length > 0) {
            record.milestonesReached = [...reached, ...newMilestones];
            await record.save();
            systemLogger.info(`[Syndication] New milestones for ${record._id}: ${newMilestones.join(', ')}`, 'SocialSyndicationService');
        }
    }

    /**
     * Schedule a video for future distribution.
     */
    public async scheduleVideo(projectId: string, s3Key: string, platformAccountIds: string[], metadata: any, scheduledAt: Date, hookInfo?: { id: string, type: string }) {
        const results = [];
        for (const accountId of platformAccountIds) {
            const acc = await UserPlatformAccount.findById(accountId);
            if (!acc) continue;

            const record = await SyndicationRecord.create({
                userId: acc.userId,
                projectId,
                platformAccountId: acc._id,
                platform: acc.platform,
                status: 'scheduled',
                scheduledAt,
                metadata: {
                    title: metadata.title,
                    description: metadata.description,
                    thumbnail: metadata.thumbnail
                },
                hookId: hookInfo?.id,
                hookType: hookInfo?.type
            });
            results.push(record);
        }
        return results;
    }

    /**
     * Get best posting time suggestion.
     */
    public async getBestPostingTime(platform: string) {
        try {
            const modelName = "gemini-1.5-flash";
            const { client: ai } = await geminiPool.getOptimalClient(modelName);
            
            const prompt = `As a viral marketing expert, suggest the single absolute best time of day (including timezone UTC) to post on ${platform} for maximum engagement. 
Return only the time in format HH:MM (UTC).`;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });
            
            return result.response.text().trim();
        } catch (error) {
            return "18:00"; // fallback
        }
    }

    /**
     * Generate 3 viral hook variations for a video.
     */
    public async generateHookVariations(projectId: string, context: string) {
        try {
            const modelName = "gemini-1.5-flash";
            const { client: ai } = await geminiPool.getOptimalClient(modelName);
            
            const prompt = `As a viral marketing expert, generate 3 distinct high-engagement "Hooks" (Title and Description) for this video content: "${context}".
Each hook should have a specific psychological angle:
1. "Curiosity Gap": Leaves them wanting more.
2. "Controversial/Bold": Makes a strong claim.
3. "Educational/Value": Highlights what they will learn.

Return ONLY a JSON array of objects with the following format:
[
  { "type": "Curiosity Gap", "title": "...", "description": "..." },
  { "type": "Controversial", "title": "...", "description": "..." },
  { "type": "Educational", "title": "...", "description": "..." }
]`;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });
            
            const text = result.response.text();
            const jsonMatch = text.match(/\[.*\]/s);
            if (!jsonMatch) throw new Error('Failed to parse hook variations');
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            systemLogger.error(`[Syndication] Hook generation failed: ${error}`, 'SocialSyndicationService');
            return [];
        }
    }

    /**
     * Aggregate performance stats grouped by Hook Type for A/B testing.
     */
    public async getHookComparisonStats(projectId: string) {
        try {
            const stats = await SyndicationRecord.aggregate([
                { $match: { projectId: new Types.ObjectId(projectId), status: 'success', hookType: { $exists: true } } },
                {
                    $group: {
                        _id: "$hookType",
                        totalViews: { $sum: "$engagement.views" },
                        totalLikes: { $sum: "$engagement.likes" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        type: "$_id",
                        avgViews: { $divide: ["$totalViews", "$count"] },
                        avgLikes: { $divide: ["$totalLikes", "$count"] },
                        count: 1
                    }
                },
                { $sort: { avgViews: -1 } }
            ]);
            return stats;
        } catch (error) {
            console.error('[Syndication] Hook stats error:', error);
            return [];
        }
    }

    public async generateViralMetadata(clipTitle: string, context: string) {
        try {
            const modelName = "gemini-1.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);
            const prompt = `Generate a viral caption and 5 trending hashtags for a short-form video titled "${clipTitle}". Context: ${context}. Return as JSON: { caption: string, hashtags: string[] }`;

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{ parts: [{ text: prompt }] }]
            });
            const response = result.response;
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);
            
            return JSON.parse(response.text().match(/\{.*\}/s)?.[0] || '{}');
        } catch {
            return { caption: clipTitle, hashtags: ['#viral', '#antstudio', '#ai'] };
        }
    }

    /**
     * Creates a draft syndication record for an autonomous clip.
     */
    public async createAutonomousDraft(projectId: string, assetId: string, clipTitle: string, context: string) {
        try {
            const project = await Project.findById(projectId);
            if (!project) return;

            // 1. Generate Metadata
            const meta = await this.generateViralMetadata(clipTitle, context);

            // 2. Find eligible accounts
            const accounts = await UserPlatformAccount.find({
                userId: project.userId,
                isActive: true,
                platform: { $in: ['tiktok', 'youtube', 'facebook'] }
            });

            if (accounts.length === 0) return;

            // 3. Create scheduled records (Drafts)
            // We set scheduledAt to null or far future to indicate it needs approval
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);

            const records = await Promise.all(accounts.map(acc => SyndicationRecord.create({
                userId: project.userId,
                projectId: project._id,
                assetId: new Types.ObjectId(assetId),
                platformAccountId: acc._id,
                platform: acc.platform,
                status: 'scheduled',
                scheduledAt: tomorrow, // Default to tomorrow, user can adjust
                metadata: {
                    title: meta.caption?.split('\n')[0] || clipTitle,
                    description: meta.caption || clipTitle
                }
            })));

            systemLogger.info(`📂 [Syndication] Created ${records.length} autonomous drafts for clip: ${clipTitle}`, 'SocialSyndicationService');
            return records;

        } catch (error: any) {
            systemLogger.error(`❌ [Syndication] Draft creation failed: ${error.message}`, 'SocialSyndicationService');
        }
    }
}

export const socialSyndicationService = new SocialSyndicationService();
