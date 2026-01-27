import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { v4 as uuidv4 } from 'uuid';

export class AnalyticsService {
    private mixpanelToken?: string;

    constructor() {
        this.mixpanelToken = process.env.MIXPANEL_TOKEN;
    }

    async trackEvent(
        event: string,
        properties: any = {},
        userId?: string,
        sessionId?: string
    ): Promise<void> {
        try {
            // Store locally
            await AnalyticsEvent.create({
                userId: userId || undefined,
                sessionId: sessionId || uuidv4(),
                event,
                properties,
                timestamp: new Date()
            });

            // Optionally forward to external service
            if (this.mixpanelToken && userId) {
                await this.sendToMixpanel(userId, event, properties);
            }
        } catch (e) {
            console.error('Analytics tracking error:', e);
        }
    }

    async trackPageView(page: string, userId?: string, sessionId?: string): Promise<void> {
        await this.trackEvent('page_view', { page }, userId, sessionId);
    }

    async getFunnel(steps: string[], startDate?: Date, endDate?: Date): Promise<any[]> {
        const filter: any = { event: { $in: steps } };
        if (startDate) filter.timestamp = { $gte: startDate };
        if (endDate) filter.timestamp = { ...filter.timestamp, $lte: endDate };

        const results = await Promise.all(
            steps.map(step =>
                AnalyticsEvent.countDocuments({ ...filter, event: step })
            )
        );

        return steps.map((step, i) => ({
            step,
            count: results[i],
            dropoff: i > 0 ? ((results[i - 1] - results[i]) / results[i - 1] * 100) : 0
        }));
    }

    async getUserJourney(userId: string, limit: number = 50): Promise<any[]> {
        return AnalyticsEvent.find({ userId })
            .sort({ timestamp: -1 })
            .limit(limit)
            .select('event properties timestamp')
            .lean();
    }

    private async sendToMixpanel(userId: string, event: string, properties: any): Promise<void> {
        // Implement Mixpanel API call if needed
        // This is optional and can be configured via environment variable
    }
}

export const analyticsService = new AnalyticsService();
