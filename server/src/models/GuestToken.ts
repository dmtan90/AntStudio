import mongoose from 'mongoose';

export interface IGuestToken {
    token: string;
    sessionId: string;
    expiresAt: Date;
}

const guestTokenSchema = new mongoose.Schema<IGuestToken>({
    token: { type: String, required: true, unique: true, index: true },
    sessionId: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } } // TTL Index
}, {
    timestamps: true
});

export const GuestToken = mongoose.model<IGuestToken>('GuestToken', guestTokenSchema);
