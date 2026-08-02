import crypto from 'crypto';
import { Buffer } from 'buffer';

export class Encryption {
    readonly key: Buffer;

    constructor(key: Buffer | string) {
        if (typeof key === 'string') {
            this.key = Buffer.from(key, 'hex');
        } else {
            this.key = key;
        }
    }

    public static generateKey(): Encryption {
        return new Encryption(crypto.randomBytes(32));
    }
}
