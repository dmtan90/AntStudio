import { User } from '../../models/User.js';
import { Logger } from '../../utils/Logger.js';


export interface ViewerAvatarMetadata {
    viewerId: string;
    vrmUrl: string;
    personality: string;
    tier: 'standard' | 'vip' | 'legendary';
}

/**
 * Service for generating and managing 1:1 neural viewer avatars.
 */
export class ViewerAvatarService {
    private avatarCache: Map<string, ViewerAvatarMetadata> = new Map();

    /**
     * Generates or retrieves a personalized avatar for a viewer.
     */
    public async getAvatarForViewer(userId: string): Promise<ViewerAvatarMetadata> {
        if (this.avatarCache.has(userId)) return this.avatarCache.get(userId)!;

        try {
            const user = await User.findById(userId);
            if (!user) throw new Error('User not found');

            const tier = this.resolveViewerTier(user);

            // Logic to generate unique VRM metadata
            const metadata: ViewerAvatarMetadata = {
                viewerId: userId,
                vrmUrl: `https://api.antstudio.io/v1/assets/avatars/neural_gen_${userId}.vrm`,
                personality: user.preferences?.aiPersona || 'Default Enthusiast',
                tier
            };

            this.avatarCache.set(userId, metadata);
            Logger.info(`👥 [ViewerAvatar] Neural avatar generated for: ${user.name} (${tier})`, 'ViewerAvatarService');

            return metadata;
        } catch (error: any) {
            Logger.error('[ViewerAvatar] Generation failed:', error.message);
            return this.getDefaultAvatar(userId);
        }
    }

    private resolveViewerTier(user: any): 'standard' | 'vip' | 'legendary' {
        if (user.points > 10000) return 'legendary';
        if (user.points > 1000) return 'vip';
        return 'standard';
    }

    private getDefaultAvatar(userId: string): ViewerAvatarMetadata {
        return {
            viewerId: userId,
            vrmUrl: 'https://api.antstudio.io/v1/assets/avatars/default_guest.vrm',
            personality: 'Friendly Viewer',
            tier: 'standard'
        };
    }
}

export const viewerAvatarService = new ViewerAvatarService();
