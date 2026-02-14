import { EventEmitter } from 'events';
import { systemLogger } from '../../utils/systemLogger.js';
import { PerformanceSnapshot } from './AIPerformanceService.js';
import { socketServer } from '../SocketServer.js';
import { highlightService } from '../HighlightService.js';
import { StreamSessionModel } from '../../models/StreamSession.js';
import { Project } from '../../models/Project.js';
import { socialSyndicationService } from '../SocialSyndicationService.js';

/**
 * Service to detect engagement peaks in real-time and trigger highlights.
 */
export class MarkerService extends EventEmitter {
    private cooldowns: Map<string, number> = new Map();
    private readonly PEAK_COOLDOWN_MS = 180000; // 3 minutes between auto-clips

    constructor() {
        super();
    }

    /**
     * Evaluates a performance snapshot for viral potential.
     */
    public evaluateSnapshot(projectId: string, snapshot: PerformanceSnapshot) {
        // 1. Check Cooldown
        const lastClip = this.cooldowns.get(projectId) || 0;
        if (Date.now() - lastClip < this.PEAK_COOLDOWN_MS) return;

        // 2. Multi-modal Peak Detection
        let isPeak = false;
        let reason = '';

        // Criteria A: High Chat Velocity
        if (snapshot.chatVelocity > 25) {
            isPeak = true;
            reason = 'Chat is blowing up!';
        }

        // Criteria B: Sentiment Surge (Assuming vibeScore > 80 is very positive)
        if (snapshot.vibeScore > 85 && snapshot.chatVelocity > 10) {
            isPeak = true;
            reason = 'Huge positive audience vibe!';
        }

        // Criteria C: Viewer Retention Peak (Sudden jump in viewers)
        // (Note: To detect "jumps" we'd need history, but snapshot comparison is better managed in Service)

        if (isPeak) {
            this.triggerViralPeak(projectId, snapshot, reason);
        }
    }

    /**
     * Manually or automatically trigger a viral highlight.
     */
    public async triggerViralPeak(projectId: string, snapshot: PerformanceSnapshot, reason: string) {
        this.cooldowns.set(projectId, Date.now());

        systemLogger.info(`🚀 [MarkerService] VIRAL PEAK DETECTED for ${projectId}: ${reason}`, 'MarkerService');

        // 1. Notify Studio via Socket
        socketServer.getIO()?.to(projectId).emit('studio:viral_peak', {
            reason,
            vibe: snapshot.vibeScore,
            velocity: snapshot.chatVelocity,
            timestamp: Date.now()
        });

        // 2. Perform Clipping (Autonomous Producer)
        try {
            // Find active session for this project
            const session = await StreamSessionModel.findOne({ projectId, status: 'live' });
            if (!session) {
                systemLogger.warn(`[MarkerService] No active live session found for project ${projectId}. Skipping clip.`, 'MarkerService');
                return;
            }

            const highlight = await highlightService.captureHighlight(session.sessionId);
            if (highlight) {
                const asset = {
                    name: `AI_Clip_${reason.replace(/\s+/g, '_')}`,
                    description: `Autonomous viral highlight captured during a engagement spike. Reason: ${reason}`,
                    type: 'video',
                    status: 'ready',
                    url: highlight.s3Url,
                    s3Key: highlight.s3Key,
                    metadata: { 
                        isViralClip: true, 
                        viralScore: 8, 
                        capturedBy: 'AI_Producer',
                        reason 
                    },
                    createdAt: new Date()
                };

                const updatedProject = await Project.findByIdAndUpdate(projectId, {
                    $push: {
                        visualAssets: asset
                    }
                }, { new: true });

                const newAsset = updatedProject?.visualAssets?.find(a => a.name === asset.name);

                systemLogger.info(`✅ [MarkerService] Successfully captured and registered viral clip for ${projectId}`, 'MarkerService');
                
                // 3. Auto-Draft Social Posts (Phase 90)
                if (newAsset && newAsset._id) {
                    socialSyndicationService.createAutonomousDraft(
                        projectId, 
                        newAsset._id.toString(), 
                        asset.name, 
                        `Segment captured because: ${reason}`
                    ).catch(e => systemLogger.error(`[MarkerService] Draft failed: ${e.message}`, 'MarkerService'));
                }

                // Notify frontend about the new asset
                socketServer.getIO()?.to(projectId).emit('project:asset_ready', {
                    projectId,
                    assetName: asset.name
                });
            }
        } catch (error: any) {
            systemLogger.error(`❌ [MarkerService] Clipping failed: ${error.message}`, 'MarkerService');
        }

        this.emit('marker:created', { projectId, reason, snapshot });
    }
}

export const markerService = new MarkerService();
