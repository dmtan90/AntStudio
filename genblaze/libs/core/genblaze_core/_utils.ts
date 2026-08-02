import crypto from 'crypto';
import { Buffer } from 'buffer';

export function canonicalJsonSerialize(obj: any): string {
    if (obj === null || obj === undefined) return 'null';
    if (typeof obj === 'number') {
        if (!Number.isFinite(obj)) throw new TypeError('Cannot serialize non-finite numbers to canonical JSON');
        return String(obj);
    }
    if (typeof obj === 'boolean') return obj ? 'true' : 'false';
    if (typeof obj === 'string') return JSON.stringify(obj);

    if (Array.isArray(obj)) {
        return '[' + obj.map(item => canonicalJsonSerialize(item)).join(',') + ']';
    }

    if (typeof obj === 'object') {
        const sortedKeys = Object.keys(obj).sort();
        const kvPairs = sortedKeys
            .filter(key => obj[key] !== undefined)
            .map(key => JSON.stringify(key) + ':' + canonicalJsonSerialize(obj[key]));
        return '{' + kvPairs.join(',') + '}';
    }

    return JSON.stringify(obj);
}

export function sha256Digest(data: string | Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
}

export function generateUuid(): string {
    return crypto.randomUUID();
}
