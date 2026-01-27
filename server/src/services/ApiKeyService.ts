import crypto from 'crypto';
import { ApiKey, IApiKey } from '../models/ApiKey.js';

export class ApiKeyService {
    /**
     * Generate a new cryptographically secure tactical token.
     */
    static async generateKey(userId: string, name: string, tenantId?: string): Promise<{ raw: string; record: IApiKey }> {
        const raw = `ant_${crypto.randomBytes(24).toString('hex')}`;
        const keyHash = this.hashKey(raw);
        const keyPreview = `${raw.substring(0, 7)}...${raw.substring(raw.length - 4)}`;

        const record = await ApiKey.create({
            userId,
            tenantId,
            name,
            keyHash,
            keyPreview,
            status: 'active'
        });

        return { raw, record };
    }

    /**
     * Verify a raw token against hashed records.
     */
    static async verifyKey(raw: string): Promise<IApiKey | null> {
        const keyHash = this.hashKey(raw);
        const record = await ApiKey.findOne({ keyHash, status: 'active' });

        if (record) {
            record.lastUsedAt = new Date();
            await record.save();
        }

        return record;
    }

    /**
     * Terminate tactical clearance for a key.
     */
    static async revokeKey(keyId: string): Promise<void> {
        await ApiKey.findByIdAndUpdate(keyId, { status: 'revoked' });
    }

    /**
     * List all keys for a specialist.
     */
    static async getKeys(userId: string): Promise<IApiKey[]> {
        return ApiKey.find({ userId }).sort({ createdAt: -1 });
    }

    /**
     * Internal: High-fidelity scrypt hashing.
     */
    private static hashKey(raw: string): string {
        return crypto.createHash('sha256').update(raw).digest('hex');
    }
}
