import { Buffer } from 'buffer';
import { KeyStrategy } from '../types.js';

export { KeyStrategy };

export type ObjectLockMode = 'GOVERNANCE' | 'COMPLIANCE';

export class ObjectLockConfig {
    readonly retainUntil: Date;
    readonly mode: ObjectLockMode;

    constructor(retainUntil: Date, mode: ObjectLockMode = 'GOVERNANCE') {
        if (!retainUntil || isNaN(retainUntil.getTime())) {
            throw new Error('ObjectLockConfig.retainUntil must be a valid Date instance');
        }
        this.retainUntil = retainUntil;
        this.mode = mode;
    }
}

// KeyStrategy imported from types.ts and re-exported above

export abstract class StorageBackend {
    abstract put(
        key: string,
        data: Buffer | string,
        options?: { contentType?: string; metadata?: Record<string, string>; extraArgs?: Record<string, any> }
    ): Promise<string>;

    abstract get(key: string): Promise<Buffer>;
    abstract exists(key: string): Promise<boolean>;
    abstract delete(key: string): Promise<void>;
    abstract getUrl(key: string, options?: { expiresIn?: number }): Promise<string>;
    abstract getDurableUrl(key: string): string;

    public keyFromUrl(url: string): string | null {
        throw new Error(`${this.constructor.name} does not implement keyFromUrl`);
    }

    public async copy(srcKey: string, dstKey: string): Promise<void> {
        const data = await this.get(srcKey);
        await this.put(dstKey, data);
    }
}
