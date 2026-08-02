import crypto from 'crypto';
import { normalize } from './_normalize.js';

export function canonicalJson(data: any): string {
    const normalized = normalize(data);
    return JSON.stringify(normalized);
}

export function canonicalHash(data: any): string {
    return crypto.createHash('sha256').update(canonicalJson(data)).digest('hex');
}
