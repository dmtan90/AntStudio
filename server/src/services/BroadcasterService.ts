import { Project } from '../models/Project.js';
import { streamingService } from './StreamingService.js';
import { Logger } from '../utils/Logger.js';

export interface BroadcastSchedule {
    id: string;
    projectId: string;
    items: Array<{
        type: 'live' | 'highlight';
        assetId?: string;
        duration: number;
        startTime: Date;
    }>;
}

/**
 * Service for 24/7 autonomous channel orchestration.
 */
export class BroadcasterService {
    private activeCycles: Map<string, NodeJS.Timeout> = new Map();

    /**
     * Engages "Auto-Pilot" mode for a project.
     */
    public async startAutonomousChannel(projectId: string) {
        if (this.activeCycles.has(projectId)) return;

        Logger.info(`🌌 [Broadcaster] Autonomous 24/7 loop engaged for project: ${projectId}`, 'BroadcasterService');

        // Start the infinite loop
        this.runNextCycle(projectId);
    }

    private async runNextCycle(projectId: string) {
        try {
            const project = await Project.findById(projectId);
            if (!project) return;

            // 1. Pick content (Simulated scheduling logic)
            // In production, this would look at engagement trends and pick the best viral clips.
            const viralClips = project.visualAssets?.filter(a => a.metadata?.isViralClip) || [];
            const nextItem = viralClips[Math.floor(Math.random() * viralClips.length)] || { name: 'fallback_placeholder' };

            Logger.info(`📺 [Broadcaster] Transitioning to content: ${nextItem.name}`, 'BroadcasterService');

            // 2. Trigger Studio Auto-Transition (via Socket/Direct call)
            // This would inform the LiveStudio instance to switch layers/source.

            // 3. Schedule next transition (e.g. after 30 seconds)
            const timer = setTimeout(() => this.runNextCycle(projectId), 30000);
            this.activeCycles.set(projectId, timer);

        } catch (error: any) {
            Logger.error(`❌ [Broadcaster] Cycle failed for ${projectId}: ${error.message}`, 'BroadcasterService');
            this.stopAutonomousChannel(projectId);
        }
    }

    public stopAutonomousChannel(projectId: string) {
        const timer = this.activeCycles.get(projectId);
        if (timer) clearTimeout(timer);
        this.activeCycles.delete(projectId);
        Logger.info(`🌌 [Broadcaster] Autonomous loop disengaged for ${projectId}`, 'BroadcasterService');
    }

    public isProjectRunning(projectId: string): boolean {
        return this.activeCycles.has(projectId);
    }
}

export const broadcasterService = new BroadcasterService();
