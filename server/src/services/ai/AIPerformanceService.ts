import { Project } from '../../models/Project.js';
import { systemLogger } from '../../utils/systemLogger.js';

export interface PerformanceSnapshot {
    timestamp: Date;
    viewerCount: number;
    chatVelocity: number; // msgs per minute
    vibeScore: number;
    activeStyle: string;
    activePersona: string;
}

/**
 * Service for tracking AI performance and engagement correlations.
 */
export class AIPerformanceService {
    private streamSessions: Map<string, PerformanceSnapshot[]> = new Map();

    /**
     * Records a data point for an active stream.
     */
    public recordSnapshot(projectId: string, data: Partial<PerformanceSnapshot>) {
        if (!this.streamSessions.has(projectId)) {
            this.streamSessions.set(projectId, []);
        }

        const snapshot: PerformanceSnapshot = {
            timestamp: new Date(),
            viewerCount: data.viewerCount || 0,
            chatVelocity: data.chatVelocity || 0,
            vibeScore: data.vibeScore || 0,
            activeStyle: data.activeStyle || 'default',
            activePersona: data.activePersona || 'none'
        };

        this.streamSessions.get(projectId)!.push(snapshot);
    }

    /**
     * Analyzes which AI configurations are performing best for a project.
     */
    public async generateDirectorInsights(projectId: string) {
        const snapshots = this.streamSessions.get(projectId);
        if (!snapshots || snapshots.length < 5) return "Insufficient data for AI performance analysis.";

        // Simple identification of peaks
        const sortedByEngagement = [...snapshots].sort((a, b) =>
            (b.viewerCount + b.chatVelocity) - (a.viewerCount + a.chatVelocity)
        );

        const topState = sortedByEngagement[0];

        return {
            optimalStyle: topState.activeStyle,
            optimalPersona: topState.activePersona,
            insight: `Director suggests keeping the "${topState.activeStyle}" style as it correlates with your highest viewer retention peaks.`
        };
    }

    /**
     * Cleans up session data.
     */
    public endSession(projectId: string) {
        this.streamSessions.delete(projectId);
    }
}

export const aiPerformanceService = new AIPerformanceService();
