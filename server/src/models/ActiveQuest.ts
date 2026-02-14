import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IActiveQuest extends Document {
    userId: string;
    questId: string;
    title: string;
    description: string;
    target: number;
    current: number;
    rewardXp: number;
    type: 'chat' | 'poll' | 'watch_time' | 'share';
    completed: boolean;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const ActiveQuestSchema = new Schema<IActiveQuest>(
    {
        userId: { type: String, required: true, index: true },
        questId: { type: String, required: true },
        title: { type: String, required: true },
        description: { type: String },
        target: { type: Number, default: 1 },
        current: { type: Number, default: 0 },
        rewardXp: { type: Number, default: 100 },
        type: { 
            type: String, 
            enum: ['chat', 'poll', 'watch_time', 'share'],
            required: true 
        },
        completed: { type: Boolean, default: false },
        expiresAt: { type: Date, required: true, index: true }
    },
    {
        timestamps: true
    }
);

// Index for getting active quests for a user
ActiveQuestSchema.index({ userId: 1, completed: 1 });

export const ActiveQuest: Model<IActiveQuest> = mongoose.models.ActiveQuest || mongoose.model<IActiveQuest>('ActiveQuest', ActiveQuestSchema);
