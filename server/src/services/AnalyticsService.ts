import { Project } from '../models/Project.js';
import { Logger } from '../utils/Logger.js';

export class AnalyticsService {
    /**
     * Track a view for a project
     */
    static async trackView(projectId: string) {
        try {
            await Project.findByIdAndUpdate(projectId, {
                $inc: { 'analytics.viewCount': 1 },
                $set: { 'analytics.lastViewedAt': new Date() }
            });
        } catch (error) {
            Logger.error('[AnalyticsService] Error tracking view', 'AnalyticsService', { error });
        }
    }

    /**
     * Track engagement (like/dislike/share)
     */
    static async trackEngagement(projectId: string, type: 'like' | 'dislike' | 'share') {
        try {
            const field = `analytics.${type}Count`;
            await Project.findByIdAndUpdate(projectId, {
                $inc: { [field]: 1 }
            });
        } catch (error) {
            Logger.error(`[AnalyticsService] Error tracking ${type}`, 'AnalyticsService', { error });
        }
    }

    /**
     * Set assembly performance metric
     */
    static async setAssemblyTime(projectId: string, timeMs: number) {
        try {
            await Project.findByIdAndUpdate(projectId, {
                $set: { 'analytics.assemblyTime': timeMs }
            });
        } catch (error) {
            Logger.error('[AnalyticsService] Error setting assembly time', 'AnalyticsService', { error });
        }
    }

    /**
     * Track which asset was used
     */
    static async trackAssetUsage(projectId: string, assetName: string) {
        try {
            // Track asset usage in a metadata field for now
            await Project.findByIdAndUpdate(projectId, {
                $inc: { [`metadata.assetUsage.${assetName.replace(/\./g, '_')}`]: 1 }
            });
        } catch (error) {
            Logger.error('[AnalyticsService] Error tracking asset usage', 'AnalyticsService', { error });
        }
    }

    /**
     * Get aggregated project analytics
     */
    static async getProjectAnalytics(projectId: string) {
        try {
            const project = await Project.findById(projectId).select('analytics title createdAt status');
            if (!project) return null;

            return {
                projectId: project._id,
                title: project.title,
                createdAt: project.createdAt,
                status: project.status,
                metrics: project.analytics || {
                    viewCount: 0,
                    shareCount: 0,
                    likeCount: 0,
                    dislikeCount: 0,
                    peakViewers: 0
                }
            };
        } catch (error) {
            Logger.error('[AnalyticsService] Error fetching analytics', 'AnalyticsService', { error });
            throw error;
        }
    }

    /**
     * Get platform wide global stats (for Admin dashboard)
     */
    static async getGlobalStats() {
        try {
            const stats = await Project.aggregate([
                {
                    $group: {
                        _id: null,
                        totalViews: { $sum: "$analytics.viewCount" },
                        totalShares: { $sum: "$analytics.shareCount" },
                        totalLikes: { $sum: "$analytics.likeCount" },
                        avgAssemblyTime: { $avg: "$analytics.assemblyTime" },
                        totalCompletedProjects: {
                            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
                        }
                    }
                }
            ]);

            return stats[0] || {
                totalViews: 0,
                totalShares: 0,
                totalLikes: 0,
                avgAssemblyTime: 0,
                totalCompletedProjects: 0
            };
        } catch (error) {
            Logger.error('[AnalyticsService] Error fetching global stats', 'AnalyticsService', { error });
            throw error;
        }
    }
}
