import { StorageError } from '../exceptions.js';

export enum StorageErrorCode {
    NOT_FOUND = 'not_found',
    ACCESS_DENIED = 'access_denied',
    AUTH_FAILURE = 'auth_failure',
    REGION_REDIRECT = 'region_redirect',
    RATE_LIMIT = 'rate_limit',
    SERVER_ERROR = 'server_error',
    NETWORK = 'network',
    TIMEOUT = 'timeout',
    INVALID_INPUT = 'invalid_input',
    ENCRYPTION_REQUIRED = 'encryption_required',
    OBJECT_LOCKED = 'object_locked',
    UNKNOWN = 'unknown'
}

export const RETRYABLE_STORAGE_CODES = new Set<StorageErrorCode>([
    StorageErrorCode.RATE_LIMIT,
    StorageErrorCode.SERVER_ERROR,
    StorageErrorCode.NETWORK,
    StorageErrorCode.TIMEOUT
]);

export function classifyStorageError(exc: any, operation: string, key?: string): StorageError {
    const msg = String(exc?.message || exc);
    const target = key ? ` for '${key}'` : '';

    let code = StorageErrorCode.UNKNOWN;
    if (msg.includes('404') || msg.includes('NoSuchKey') || msg.includes('NotFound')) {
        code = StorageErrorCode.NOT_FOUND;
    } else if (msg.includes('403') || msg.includes('AccessDenied')) {
        code = StorageErrorCode.ACCESS_DENIED;
    } else if (msg.includes('429') || msg.includes('SlowDown')) {
        code = StorageErrorCode.RATE_LIMIT;
    } else if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
        code = StorageErrorCode.SERVER_ERROR;
    } else if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) {
        code = StorageErrorCode.TIMEOUT;
    } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        code = StorageErrorCode.NETWORK;
    }

    return new StorageError(`Storage ${operation}${target} failed: ${msg}`);
}
