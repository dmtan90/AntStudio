import { VTuber, IVTuber } from '../models/VTuber.js';
import { Types } from 'mongoose';

import { Logger } from '../utils/Logger.js';

export class VTuberService {
    /**
     * Retrieve or initialize a VTuber for an entity.
     */
    static async getOrCreateVTuber(userId: string, entityId: string, name: string, orgId?: string): Promise<IVTuber> {
        let vtuber = await VTuber.findOne({ userId, entityId });

        if (!vtuber) {
            vtuber = await VTuber.create({
                userId,
                organizationId: orgId,
                entityId,
                identity: { name, description: '', traits: [] }
            });
        }

        return vtuber;
    }

    /**
     * Synchronize VTuber memory from a mission event.
     */
    static async archiveEvent(userId: string, entityId: string, missionId: string, description: string): Promise<void> {
        await VTuber.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.keyEvents': { missionId, description, date: new Date() } },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Holistic update of a VTuber.
     */
    static async updateVTuber(userId: string, entityId: string, data: {
        identity?: IVTuber['identity'];
        meta?: IVTuber['meta'];
        memory?: IVTuber['memory'];
        visual?: IVTuber['visual'];
        social?: IVTuber['social'];
        performanceConfig?: IVTuber['performanceConfig'];
        animationConfig?: IVTuber['animationConfig'];
    }): Promise<void> {
        Logger.info("VTuber meta update", JSON.stringify(data.meta), JSON.stringify(data.visual));
        const update: any = { lastUpdated: new Date() };
        if (data.identity) update['identity'] = data.identity;
        if (data.meta?.loras) update['meta.loras'] = data.meta.loras;
        if (data.meta?.voiceConfig) update['meta.voiceConfig'] = data.meta.voiceConfig;
        if (data.memory?.knowledgeEntries) update['memory.knowledgeEntries'] = data.memory.knowledgeEntries;
        if (data.visual) update['visual'] = data.visual;
        if (data.social) update['social'] = data.social;
        if (data.performanceConfig) update['performanceConfig'] = data.performanceConfig;
        if (data.animationConfig) update['animationConfig'] = data.animationConfig;

        await VTuber.findOneAndUpdate({ userId, entityId }, { $set: update });
    }

    /**
     * Summarize VTuber evolution (Cognitive Compression).
     */
    static async archiveSummary(userId: string, entityId: string, summary: string): Promise<void> {
        await VTuber.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.summaries': summary },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Update visual configuration for a VTuber.
     */
    static async updateVisual(userId: string, entityId: string, visual: IVTuber['visual']): Promise<void> {
        await VTuber.findOneAndUpdate(
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
     * Update or create a social relationship bond.
     */
    static async updateSocialRelationship(userId: string, entityId: string, targetName: string, delta: number, description?: string): Promise<void> {
        const vtuber = await VTuber.findOne({ userId, entityId });
        if (!vtuber) return;

        if (!vtuber.social) vtuber.social = { relationships: [] };
        
        const existingRelIndex = vtuber.social.relationships.findIndex(r => r.targetName === targetName);
        
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
            vtuber.social.relationships.push(newRel);
            // Get the reference to the last element
            rel = vtuber.social.relationships[vtuber.social.relationships.length - 1];
        } else {
            rel = vtuber.social.relationships[existingRelIndex];
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

        await vtuber.save();
    }

    /**
     * Retrieves key events that match specific keywords for contextual flashbacks.
     */
    static async getRelevantMemories(userId: string, entityId: string, keywords: string[]): Promise<string[]> {
        const vtuber = await VTuber.findOne({ userId, entityId });
        if (!vtuber) return [];

        // Simple keyword filter for now. In production, this would use vector search.
        const matches = vtuber.memory.keyEvents.filter(e => 
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
        await VTuber.findOneAndUpdate(
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
        const vtuber = await VTuber.findOne({ userId, entityId }, { interactions: 1 });
        if (vtuber && vtuber.interactions && vtuber.interactions.length > 50) {
            await VTuber.updateOne(
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

        await VTuber.findOneAndUpdate({ userId, entityId }, update);
    }

    /**
     * Update performance configuration
     */
    static async updatePerformanceConfig(userId: string, entityId: string, config: IVTuber['performanceConfig']): Promise<void> {
        // Dot notation update to preserve other fields if partial update
        const update: any = { $set: { lastUpdated: new Date() } };
        
        if (config?.auraEnabled !== undefined) update.$set['performanceConfig.auraEnabled'] = config.auraEnabled;
        if (config?.auraColor) update.$set['performanceConfig.auraColor'] = config.auraColor;
        if (config?.particleType !== undefined) update.$set['performanceConfig.particleType'] = config.particleType;
        if (config?.lightingPreset) update.$set['performanceConfig.lightingPreset'] = config.lightingPreset;

        await VTuber.findOneAndUpdate({ userId, entityId }, update);
    }

    /**
     * Update animation configuration
     */
    static async updateAnimationConfig(userId: string, entityId: string, config: IVTuber['animationConfig']): Promise<void> {
        const update: any = { $set: { lastUpdated: new Date() } };
        
        if (config?.gestureIntensity !== undefined) update.$set['animationConfig.gestureIntensity'] = config.gestureIntensity;
        if (config?.headTiltRange !== undefined) update.$set['animationConfig.headTiltRange'] = config.headTiltRange;
        if (config?.nodIntensity !== undefined) update.$set['animationConfig.nodIntensity'] = config.nodIntensity;

        await VTuber.findOneAndUpdate({ userId, entityId }, update);
    }
}
