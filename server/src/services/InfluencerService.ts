import { Influencer, IInfluencer } from '../models/Influencer.js';
import { Types } from 'mongoose';

import { Logger } from '../utils/Logger.js';

export class InfluencerService {
    /**
     * Retrieve or initialize a Influencer for an entity.
     */
    static async getOrCreateInfluencer(userId: string, entityId: string, name: string, orgId?: string): Promise<IInfluencer> {
        let influencer = await Influencer.findOne({ userId, entityId });

        if (!influencer) {
            influencer = await Influencer.create({
                userId,
                organizationId: orgId,
                entityId,
                identity: { name, description: '', traits: [] }
            });
        }

        return influencer;
    }

    /**
     * Synchronize Influencer memory from a mission event.
     */
    static async archiveEvent(userId: string, entityId: string, missionId: string, description: string): Promise<void> {
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.keyEvents': { missionId, description, date: new Date() } },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Holistic update of a Influencer.
     */
    static async updateInfluencer(userId: string, entityId: string, data: {
        identity?: IInfluencer['identity'];
        meta?: IInfluencer['meta'];
        memory?: IInfluencer['memory'];
        visual?: IInfluencer['visual'];
        social?: IInfluencer['social'];
        performanceConfig?: IInfluencer['performanceConfig'];
        animationConfig?: IInfluencer['animationConfig'];
    }): Promise<void> {
        Logger.info("Influencer meta update", JSON.stringify(data.meta), JSON.stringify(data.visual));
        const update: any = { lastUpdated: new Date() };
        if (data.identity) update['identity'] = data.identity;
        if (data.meta?.loras) update['meta.loras'] = data.meta.loras;
        if (data.meta?.voiceConfig) update['meta.voiceConfig'] = data.meta.voiceConfig;
        if (data.memory?.knowledgeEntries) update['memory.knowledgeEntries'] = data.memory.knowledgeEntries;
        if (data.visual) update['visual'] = data.visual;
        if (data.social) update['social'] = data.social;
        if (data.performanceConfig) update['performanceConfig'] = data.performanceConfig;
        if (data.animationConfig) update['animationConfig'] = data.animationConfig;

        await Influencer.findOneAndUpdate({ userId, entityId }, { $set: update });
    }

    /**
     * Summarize Influencer evolution (Cognitive Compression).
     */
    static async archiveSummary(userId: string, entityId: string, summary: string): Promise<void> {
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.summaries': summary },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Update visual configuration for a Influencer.
     */
    static async updateVisual(userId: string, entityId: string, visual: IInfluencer['visual']): Promise<void> {
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            {
                $set: {
                    'visual': {
                        ...visual,
                        lastGenerated: new Date()
                    },
                    lastUpdated: new Date()
                }
            }
        );
    }

    /**
     * Specifically synchronize aidolClips for an influencer.
     */
    static async syncAidolClips(userId: string, entityId: string, aidolClips: any): Promise<void> {
        const update: any = { lastUpdated: new Date() };
        
        // Use dot notation to update/add specific keys in the Map without overwriting the entire Map
        if (typeof aidolClips === 'object' && aidolClips !== null) {
            for (const [key, value] of Object.entries(aidolClips)) {
                update[`visual.aidolClips.${key}`] = value;
            }
        }
        
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            { $set: update }
        );
    }

    /**
     * Update or create a social relationship bond.
     */
    static async updateSocialRelationship(userId: string, entityId: string, targetName: string, delta: number, description?: string): Promise<void> {
        const influencer = await Influencer.findOne({ userId, entityId });
        if (!influencer) return;

        if (!influencer.social) influencer.social = { relationships: [] };
        
        const existingRelIndex = influencer.social.relationships.findIndex(r => r.targetName === targetName);
        
        let rel;
        if (existingRelIndex === -1) {
            // New relationship
            const newRel = { 
                targetName, 
                targetId: `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Auto-generate ID if not found
                type: 'stranger' as const, // Default valid type
                level: 50, 
                description: 'Newly met in the studio.' 
            };
            influencer.social.relationships.push(newRel);
            // Get the reference to the last element
            rel = influencer.social.relationships[influencer.social.relationships.length - 1];
        } else {
            rel = influencer.social.relationships[existingRelIndex];
        }

        if (rel) {
            rel.level = Math.max(0, Math.min(100, rel.level + delta));
            if (description) rel.description = description;

            // Auto-evolve type based on level
            if (rel.level > 85) rel.type = 'mentor';
            else if (rel.level > 70) rel.type = 'friend';
            else if (rel.level < 30) rel.type = 'rival';
            else rel.type = 'colleague';
        }

        await influencer.save();
    }

    /**
     * Retrieves key events that match specific keywords for contextual flashbacks.
     */
    static async getRelevantMemories(userId: string, entityId: string, keywords: string[]): Promise<string[]> {
        const influencer = await Influencer.findOne({ userId, entityId });
        if (!influencer) return [];

        // Simple keyword filter for now. In production, this would use vector search.
        const matches = influencer.memory.keyEvents.filter(e => 
            keywords.some(kw => e.description.toLowerCase().includes(kw.toLowerCase()))
        );

        return matches.slice(-3).map(m => m.description);
    }

    /**
     * Record a new interaction (Chat, Gift, Poll)
     */
    static async recordInteraction(userId: string, entityId: string, interaction: {
        type: 'chat' | 'gift' | 'poll' | 'qa';
        userName: string;
        content: string;
        response?: string;
        sentiment?: number;
    }): Promise<void> {
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 
                    interactions: {
                        ...interaction,
                        timestamp: new Date()
                    } 
                },
                $inc: { 'analytics.totalInteractions': 1 },
                $set: { 
                    'analytics.lastActive': new Date(),
                    lastUpdated: new Date()
                }
            }
        );
        
        // Trim interactions history if it gets too long (keep last 50)
        // This is a simple implementation; ideally done via aggregation or separate collection
        const influencer = await Influencer.findOne({ userId, entityId }, { interactions: 1 });
        if (influencer && influencer.interactions && influencer.interactions.length > 50) {
            await Influencer.updateOne(
                { userId, entityId },
                { $pop: { interactions: -1 } } // Remove oldest
            );
        }
    }

    /**
     * Update runtime analytics
     */
    static async updateAnalytics(userId: string, entityId: string, metrics: {
        streamTimeDelta?: number;
        engagementScore?: number;
    }): Promise<void> {
        const update: any = { $set: { 'analytics.lastActive': new Date() } };
        
        if (metrics.streamTimeDelta) {
            update['$inc'] = { 'analytics.totalStreamTime': metrics.streamTimeDelta };
        }
        
        if (metrics.engagementScore !== undefined) {
            update['$set']['analytics.engagementScore'] = metrics.engagementScore;
        }

        await Influencer.findOneAndUpdate({ userId, entityId }, update);
    }

    /**
     * Update performance configuration
     */
    static async updatePerformanceConfig(userId: string, entityId: string, config: IInfluencer['performanceConfig']): Promise<void> {
        // Dot notation update to preserve other fields if partial update
        const update: any = { $set: { lastUpdated: new Date() } };
        
        if (config?.auraEnabled !== undefined) update.$set['performanceConfig.auraEnabled'] = config.auraEnabled;
        if (config?.auraColor) update.$set['performanceConfig.auraColor'] = config.auraColor;
        if (config?.particleType !== undefined) update.$set['performanceConfig.particleType'] = config.particleType;
        if (config?.lightingPreset) update.$set['performanceConfig.lightingPreset'] = config.lightingPreset;

        await Influencer.findOneAndUpdate({ userId, entityId }, update);
    }

    /**
     * Update animation configuration
     */
    static async updateAnimationConfig(userId: string, entityId: string, config: IInfluencer['animationConfig']): Promise<void> {
        const update: any = { $set: { lastUpdated: new Date() } };
        
        if (config?.gestureIntensity !== undefined) update.$set['animationConfig.gestureIntensity'] = config.gestureIntensity;
        if (config?.headTiltRange !== undefined) update.$set['animationConfig.headTiltRange'] = config.headTiltRange;
        if (config?.nodIntensity !== undefined) update.$set['animationConfig.nodIntensity'] = config.nodIntensity;

        await Influencer.findOneAndUpdate({ userId, entityId }, update);
    }

    /**
     * Add or remove a co-host from an active session.
     */
    static async toggleCoHost(userId: string, entityId: string, coHostId: string, action: 'add' | 'remove'): Promise<void> {
        const update = action === 'add' 
            ? { $addToSet: { 'activeSession.coHosts': coHostId } }
            : { $pull: { 'activeSession.coHosts': coHostId } };
        
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            { 
                ...update,
                $set: { 'activeSession.isLive': true, lastUpdated: new Date() }
            }
        );
    }

    /**
     * Add or remove an influencer from the collaboration network.
     */
    static async toggleCollaborator(userId: string, entityId: string, collaboratorId: string, action: 'add' | 'remove'): Promise<void> {
        const update = action === 'add'
            ? { $addToSet: { collaborationNetwork: collaboratorId } }
            : { $pull: { collaborationNetwork: collaboratorId } };
        
        await Influencer.findOneAndUpdate(
            { userId, entityId },
            { 
                ...update,
                $set: { lastUpdated: new Date() }
            }
        );
    }
}
