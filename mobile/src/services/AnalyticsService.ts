import { apiClient } from '../api/client';

export interface OverviewStats {
    totalViews: number;
    totalLikes: number;
    watchTimeHours: number;
    projects: {
        total: number;
        published: number;
        drafts: number;
    };
    recentActivity: Array<{
        type: string;
        project: string;
        time: string;
    }>;
}

export interface StreamHealth {
    status: 'excellent' | 'good' | 'fair' | 'poor';
    bitrate: number;
    fps: number;
    latency: number;
    viewers: number;
    cpuUsage: number;
}

export interface AudienceData {
    locations: Array<{ country: string; percent: number }>;
    devices: Array<{ type: string; percent: number }>;
}

class AnalyticsService {
    async getOverview(): Promise<OverviewStats> {
        try {
            const response = await apiClient.get('/analytics/overview');
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch analytics overview:', error);
            throw error;
        }
    }

    async getStreamHealth(): Promise<StreamHealth> {
        try {
            const response = await apiClient.get('/analytics/stream-health');
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch stream health:', error);
            throw error;
        }
    }

    async getAudience(): Promise<AudienceData> {
        try {
            const response = await apiClient.get('/analytics/audience');
            return response.data.data;
        } catch (error) {
            console.error('Failed to fetch audience data:', error);
            throw error;
        }
    }
}

export const analyticsDataService = new AnalyticsService();
