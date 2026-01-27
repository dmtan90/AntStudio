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
     * Apply tactical LoRA weights to an AI personality.
     */
    static async updateStyling(userId: string, entityId: string, loras: Array<{ id: string; weight: number; trigger?: string }>): Promise<void> {
        await NeuralArchive.findOneAndUpdate(
            { userId, entityId },
            {
                $set: { 'customization.loras': loras, lastUpdated: new Date() }
            }
        );
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
}
