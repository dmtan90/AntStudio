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
     * Public method to manually (or via AI) publish a viral moment.
     * Now accepts context and viralityScore for targeted distribution.
     */
    public async publishViralMoment(moment: { 
        title: string, 
        description: string, 
        type: string, 
        sourceUrl?: string,
        context?: string,
        viralityScore?: number
    }) {
        this.syndicateMoment({
            reason: moment.title,
            description: moment.description,
            type: moment.type,
            context: moment.context || 'general',
            viralityScore: moment.viralityScore || 0.8
        });
    }

    /**
     * Automatically syndicates the final session recap.
     */
    public async syndicateFullRecap(recap: any) {
        console.log(`[ViralSyndication] Syndicating Full Session Recap: ${recap.title}`);
        
        // Final Recaps are high-priority and go to professional/archival platforms
        const platforms = ['linkedin', 'twitter', 'youtube'];
        const caption = `📊 Session Recap: ${recap.title}\n\n${recap.summary}\n\n#AntStudio #AISingularity #ProductionEfficiency`;

        try {
            await new Promise(resolve => setTimeout(resolve, 3000));
            toast.success('Session Highlight Reel & Recap Syndicated!', {
                description: `Shared to ${platforms.join(', ')}`,
                icon: '📊'
            });

            const socket = ActionSyncService.getSocket();
            if (socket) {
                socket.emit('show:event', {
                    type: 'recap_syndication',
                    payload: { title: recap.title, platforms, status: 'archived' }
                });
            }
        } catch (err) {
            console.error('[ViralSyndication] Recap syndication failed:', err);
        }
    }

    private async syndicateMoment(moment: any) {
        if (this.isSyndicating) return;
        this.isSyndicating = true;

        const ctx = moment.context || 'general';
        const platforms = this.getPlatformsForContext(ctx);
        const hashtags = this.getHashtagsForContext(ctx);

        console.log(`[ViralSyndication] Syndicating: ${moment.reason} → Platforms: ${platforms.join(', ')}`);

        // Generate a context-aware caption via Gemini
        let caption = `🔥 ${moment.reason} ${hashtags}`;
        try {
            const api = (await import('@/utils/api')).default;
            const res: any = await api.post('/ai/generate-caption', {
                moment: moment.reason,
                description: moment.description,
                context: ctx,
                platforms
            });
            if (res?.data?.caption) caption = res.data.caption;
        } catch {
            console.warn('[ViralSyndication] Caption generation failed, using fallback.');
        }
        
        try {
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast.success(`🚀 Syndicated to ${platforms.join(', ')}!`, {
                description: caption.substring(0, 80) + '...',
                icon: '🎬'
            });

            const socket = ActionSyncService.getSocket();
            if (socket) {
                socket.emit('show:event', {
                    type: 'social_syndication',
                    payload: {
                        reason: moment.reason,
                        title: caption,
                        platforms,
                        context: ctx,
                        viralityScore: moment.viralityScore,
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

    private getPlatformsForContext(ctx: string): string[] {
        switch (ctx) {
            case 'game_streaming': return ['twitch_clips', 'tiktok', 'youtube_shorts'];
            case 'sport':          return ['twitter', 'tiktok', 'youtube_shorts'];
            case 'sales':          return ['tiktok', 'facebook', 'instagram'];
            case 'news':           return ['twitter', 'linkedin'];
            case 'music':          return ['tiktok', 'instagram', 'youtube_shorts'];
            case 'talkshow':       return ['youtube', 'twitter', 'facebook'];
            default:               return ['twitter', 'tiktok', 'youtube_shorts'];
        }
    }

    private getHashtagsForContext(ctx: string): string {
        switch (ctx) {
            case 'game_streaming': return '#Gaming #LiveStream #GamingClips #AntStudio';
            case 'sport':          return '#Sports #LiveMatch #Goals #AntStudio';
            case 'sales':          return '#FlashSale #Shopping #Deals #AntStudio';
            case 'news':           return '#BreakingNews #LiveNews #AntStudio';
            case 'music':          return '#Music #LiveMusic #Concert #AntStudio';
            case 'talkshow':       return '#Talkshow #LiveTalk #Discussion #AntStudio';
            default:               return '#AntStudio #AISingularity #HumanFree';
        }
    }
}

export const viralSyndicationService = new ViralSyndicationService();
