import { Project } from '../models/Project.js';
import { MarketplaceAsset } from '../models/MarketplaceAsset.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { User } from '../models/User.js';
import { Logger } from '../utils/Logger.js';

export class GrowthService {
    /**
     * Generate tactical SEO metadata for a public project or asset.
     */
    static async getSEOMetadata(type: 'project' | 'asset', id: string) {
        let title = 'AntStudio | Autonomous AI Production';
        let description = 'Create, broadcast, and automate high-fidelity AI content at scale.';
        let image = 'https://antstudio.ai/splash.png';

        try {
            if (type === 'asset') {
                const asset = await MarketplaceAsset.findById(id);
                if (asset) {
                    title = `${asset.title} | AntStudio Marketplace`;
                    description = asset.description.substring(0, 160);
                    image = asset.previewUrl || image;
                }
            } else {
                const project = await Project.findById(id);
                if (project) {
                    title = `${project.title} | Created on AntStudio`;
                    description = `High-fidelity AI production: ${project.description.substring(0, 140)}`;
                }
            }
        } catch (e) {
            Logger.error(`SEO Metadata generation failure: ${e}`, 'GrowthService');
        }

        return {
            title,
            meta: [
                { name: 'description', content: description },
                { property: 'og:title', content: title },
                { property: 'og:description', content: description },
                { property: 'og:image', content: image },
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: title },
                { name: 'twitter:description', content: description },
                { name: 'twitter:image', content: image }
            ]
        };
    }

    /**
     * Orchestrate A/B test variant assignment (Deterministic Hash based).
     */
    static getLandingVariant(visitorId: string): 'A' | 'B' {
        // Simple deterministic assignment based on string hash
        let hash = 0;
        for (let i = 0; i < visitorId.length; i++) {
            hash = ((hash << 5) - hash) + visitorId.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash) % 2 === 0 ? 'A' : 'B';
    }

    /**
     * Get global growth metrics for the admin dashboard
     */
    static async getGlobalGrowthStats() {
        try {
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            // 1. Total Impressions (Page Views)
            const totalImpressions = await AnalyticsEvent.countDocuments({ event: 'page_view' });
            
            // 2. Weekly Impressions to calculate trend
            const currentWeeklyImpressions = await AnalyticsEvent.countDocuments({
                event: 'page_view',
                timestamp: { $gte: sevenDaysAgo }
            });
            const prevWeeklyImpressions = await AnalyticsEvent.countDocuments({
                event: 'page_view',
                timestamp: { $gte: fourteenDaysAgo, $lt: sevenDaysAgo }
            });

            const impressionTrend = prevWeeklyImpressions > 0 
                ? ((currentWeeklyImpressions - prevWeeklyImpressions) / prevWeeklyImpressions) * 100 
                : 0;

            // 3. Conversion Rate (Signups / Impressions)
            const totalUsers = await User.countDocuments({});
            const conversionRate = totalImpressions > 0 ? (totalUsers / totalImpressions) * 100 : 0;

            // 4. Viral Velocity (New projects with viral clips in last 7 days)
            const viralProjects = await Project.countDocuments({
                createdAt: { $gte: sevenDaysAgo },
                'visualAssets.metadata.isViralClip': true
            });

            // 5. Active Tests (Placeholder for AB testing logic)
            const activeTests = [
                { id: '1', name: 'Phase 14 Hero Conversion', status: 'Running', startDate: '2026-01-20', conversionA: 14.2, conversionB: 18.5 },
                { id: '2', name: 'Pricing Page Tactical Layout', status: 'Running', startDate: '2026-01-22', conversionA: 4.1, conversionB: 3.8 }
            ];

            // 6. Top Keywords (Placeholder/Mock Keywords)
            const keywords = ['AI Studio', 'Autonomous Streaming', 'VEO 3.1', 'VTuber Production', 'Live AI Translation', 'Virtual Media Hub'];

            return {
                impressions: {
                    total: totalImpressions,
                    weekly: currentWeeklyImpressions,
                    trend: impressionTrend.toFixed(1)
                },
                conversion: {
                    rate: conversionRate.toFixed(2),
                    status: 'OPTIMAL'
                },
                discovery: {
                    index: 8.4,
                    status: 'CRITICAL-GREEN'
                },
                viralVelocity: {
                    score: viralProjects > 0 ? (viralProjects * 1.5).toFixed(1) : '0.0',
                    status: viralProjects > 10 ? 'PEAK' : 'STABLE'
                },
                activeTests,
                keywords
            };
        } catch (error: any) {
            Logger.error(`[GrowthService] Failed to get global growth stats: ${error.message}`, 'GrowthService');
            throw error;
        }
    }
}
