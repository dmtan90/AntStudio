import { ActionSyncService } from './ActionSyncService';
import { toast } from 'vue-sonner';

/**
 * ViralSyndicationService: Automates the distribution of viral clips.
 * Monitors the 'studio:viral_peak' events and triggers social syndication.
 */
export class ViralSyndicationService {
    private isSyndicating = false;

    public init() {
        const socket = ActionSyncService.getSocket();
        if (socket) {
            socket.on('studio:viral_peak', (data: any) => {
                this.syndicateMoment(data);
            });
        }
        console.log('[ViralSyndication] Active and monitoring peaks');
    }

    /**
     * Phase 43: Public method to manually (or via AI) publish a viral moment.
     */
    public async publishViralMoment(moment: { title: string, description: string, type: string, sourceUrl?: string }) {
        this.syndicateMoment({
            reason: moment.title,
            description: moment.description,
            type: moment.type
        });
    }

    private async syndicateMoment(moment: any) {
        if (this.isSyndicating) return;
        this.isSyndicating = true;

        console.log(`[ViralSyndication] Syndicating viral moment: ${moment.reason}`);
        
        // 1. Simulate AI Clipping & Title Generation
        const socialTitle = `🔥 [ANT STUDIO] AI SENSATION: ${moment.reason} #AntStudio #AISingularity #HumanFree`;
        
        // 2. Trigger Mock Webhook for Social Platforms
        try {
            // In a real scenario, this would post to a worker that handles X/TikTok/Youtube uploads
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            toast.success(`Social Syndication Active!`, {
                description: `Clipped: "${moment.reason}". Distributed to X, TikTok, and YouTube Shorts.`,
                icon: '🚀'
            });

            // 3. Emit sync event to room
            const socket = ActionSyncService.getSocket();
            if (socket) {
                socket.emit('show:event', {
                    type: 'social_syndication',
                    payload: {
                        title: socialTitle,
                        platforms: ['x', 'tiktok', 'youtube'],
                        status: 'published'
                    }
                });
            }
        } catch (err) {
            console.error('[ViralSyndication] Failed to syndicate:', err);
        } finally {
            this.isSyndicating = false;
        }
    }
}

export const viralSyndicationService = new ViralSyndicationService();
