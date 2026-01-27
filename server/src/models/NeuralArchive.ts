import mongoose, { Schema, Document, Types } from 'mongoose';

export interface INeuralArchive extends Document {
    userId: Types.ObjectId;
    organizationId?: Types.ObjectId;
    entityId: string; // The character name or specialized ID
    entityType: 'character' | 'world' | 'style';

    // Core Identity
    identity: {
        name: string;
        description: string;
        traits: string[]; // ['stoic', 'sarcastic', 'tech-savvy']
        backstory?: string;
    };

    // Neural Memory
    memory: {
        summaries: string[]; // Historical session summaries
        keyEvents: Array<{
            missionId: string;
            description: string;
            date: Date;
        }>;
    };

    // Stylistic Weights (LoRAs/Embeddings)
    customization: {
        loras: Array<{
            id: string;      // e.g. "pixar_style"
            weight: number;   // 0.0 to 1.5
            trigger?: string; // "in style of pixar"
        }>;
        embeddings: string[];
    };

    lastUpdated: Date;
}

const NeuralArchiveSchema = new Schema<INeuralArchive>({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    entityId: { type: String, required: true, index: true },
    entityType: { type: String, enum: ['character', 'world', 'style'], default: 'character' },

    identity: {
        name: { type: String, required: true },
        description: String,
        traits: [String],
        backstory: String
    },

    memory: {
        summaries: [String],
        keyEvents: [{
            missionId: String,
            description: String,
            date: { type: Date, default: Date.now }
        }]
    },

    customization: {
        loras: [{
            id: String,
            weight: { type: Number, default: 1.0 },
            trigger: String
        }],
        embeddings: [String]
    },

    lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

// Ensure unique archive per entity within a user/org context
NeuralArchiveSchema.index({ userId: 1, entityId: 1 }, { unique: true });

export const NeuralArchive = mongoose.model<INeuralArchive>('NeuralArchive', NeuralArchiveSchema);
