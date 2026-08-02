export enum GoogleErrorCode {
    AUTH_FAILURE = 'auth_failure',
    RATE_LIMIT = 'rate_limit',
    INVALID_INPUT = 'invalid_input',
    SERVER_ERROR = 'server_error',
    SAFETY = 'safety'
}

export function mapGoogleError(exc: any, statusCode?: number): GoogleErrorCode {
    const msg = String(exc?.message || exc).toLowerCase();
    if (msg.includes('safety') || msg.includes('blocked')) return GoogleErrorCode.SAFETY;
    if (statusCode === 429) return GoogleErrorCode.RATE_LIMIT;
    if (statusCode === 401 || statusCode === 403) return GoogleErrorCode.AUTH_FAILURE;
    return GoogleErrorCode.SERVER_ERROR;
}
