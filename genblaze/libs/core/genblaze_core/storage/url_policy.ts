import { GenblazeError } from '../exceptions.js';

export enum URLPolicy {
    AUTO = 'auto',
    PUBLIC = 'public',
    PRESIGNED = 'presigned'
}

export class URLPolicyError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'URLPolicyError';
        Object.setPrototypeOf(this, URLPolicyError.prototype);
    }
}
