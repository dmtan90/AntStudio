import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IMessage {
    role: 'user' | 'model';
    content: string;
    toolCalls?: any[];
    timestamp: Date;
}

export interface IGeminiLiveSession extends Document {
    sessionId: string;
    userId: string;
    archiveId: string;
    messages: IMessage[];
    startTime: Date;
    endTime?: Date;
    metadata?: {
        voiceName?: string;
        modelName?: string;
        systemInstruction?: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>({
    role: { type: String, enum: ['user', 'model'], required: true },
    content: { type: String },
    toolCalls: { type: Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now }
});

const GeminiLiveSessionSchema = new Schema<IGeminiLiveSession>(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true
        },
        userId: {
            type: String,
            required: true,
            index: true
        },
        archiveId: {
            type: String,
            required: true,
            index: true
        },
        messages: [MessageSchema],
        startTime: {
            type: Date,
            default: Date.now
        },
        endTime: {
            type: Date
        },
        metadata: {
            voiceName: String,
            modelName: String,
            systemInstruction: String
        }
    },
    {
        timestamps: true
    }
);

// Indexes for performance
GeminiLiveSessionSchema.index({ userId: 1, createdAt: -1 });
GeminiLiveSessionSchema.index({ archiveId: 1, createdAt: -1 });

export const GeminiLiveSession: Model<IGeminiLiveSession> = mongoose.models.GeminiLiveSession || mongoose.model<IGeminiLiveSession>('GeminiLiveSession', GeminiLiveSessionSchema);
