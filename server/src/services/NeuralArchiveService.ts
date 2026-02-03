import { NeuralArchive, INeuralArchive } from '../models/NeuralArchive.js';
import { Types } from 'mongoose';

export class NeuralArchiveService {
    /**
     * Retrieve or initialize a neural archive for an entity.
     */
    static async getOrCreateArchive(userId: string, entityId: string, name: string, orgId?: string): Promise<INeuralArchive> {
        let archive = await NeuralArchive.findOne({ userId, entityId });

        if (!archive) {
            archive = await NeuralArchive.create({
                userId,
                organizationId: orgId,
                entityId,
                identity: { name, description: '', traits: [] }
            });
        }

        return archive;
    }

    /**
     * Synchronize character memory from a mission event.
     */
    static async archiveEvent(userId: string, entityId: string, missionId: string, description: string): Promise<void> {
        await NeuralArchive.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.keyEvents': { missionId, description, date: new Date() } },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Holistic update of a neural archive.
     */
    static async updateNeuralArchive(userId: string, entityId: string, data: {
        identity?: INeuralArchive['identity'];
        loras?: INeuralArchive['customization']['loras'];
        knowledgeEntries?: INeuralArchive['memory']['knowledgeEntries'];
    }): Promise<void> {
        const update: any = { lastUpdated: new Date() };
        if (data.identity) update['identity'] = data.identity;
        if (data.loras) update['customization.loras'] = data.loras;
        if (data.knowledgeEntries) update['memory.knowledgeEntries'] = data.knowledgeEntries;

        await NeuralArchive.findOneAndUpdate({ userId, entityId }, { $set: update });
    }

    /**
     * Summarize character evolution (Cognitive Compression).
     */
    static async archiveSummary(userId: string, entityId: string, summary: string): Promise<void> {
        await NeuralArchive.findOneAndUpdate(
            { userId, entityId },
            {
                $push: { 'memory.summaries': summary },
                $set: { lastUpdated: new Date() }
            }
        );
    }

    /**
     * Update visual identity (Digital Double) for an AI soul.
     */
    static async updateVisualIdentity(userId: string, entityId: string, visual: INeuralArchive['visualIdentity']): Promise<void> {
        await NeuralArchive.findOneAndUpdate(
            { userId, entityId },
            {
                $set: {
                    'visualIdentity': {
                        ...visual,
                        lastGenerated: new Date()
                    },
                    lastUpdated: new Date()
                }
            }
        );
    }
}
