export enum ProviderErrorCode {
    AUTH_FAILURE = 'auth_failure',
    RATE_LIMIT = 'rate_limit',
    INVALID_INPUT = 'invalid_input',
    SERVER_ERROR = 'server_error',
    CONTENT_POLICY = 'content_policy',
    TIMEOUT = 'timeout',
    UNKNOWN = 'unknown'
}

export function mapGmiCloudError(exc: any, statusCode?: number): ProviderErrorCode {
    const msg = String(exc?.message || exc).toLowerCase();

    if (
        msg.includes('content_policy') ||
        msg.includes('content policy') ||
        msg.includes('safety') ||
        msg.includes('policy violation')
    ) {
        return ProviderErrorCode.CONTENT_POLICY;
    }

    if (statusCode === 429) return ProviderErrorCode.RATE_LIMIT;
    if (statusCode === 401 || statusCode === 403) return ProviderErrorCode.AUTH_FAILURE;
    if (statusCode === 400) return ProviderErrorCode.INVALID_INPUT;
    if (statusCode && statusCode >= 500) return ProviderErrorCode.SERVER_ERROR;

    if (msg.includes('unauthorized') || msg.includes('invalid credentials') || msg.includes('401')) {
        return ProviderErrorCode.AUTH_FAILURE;
    }
    if (msg.includes('forbidden') || msg.includes('403')) {
        return ProviderErrorCode.AUTH_FAILURE;
    }

    return ProviderErrorCode.UNKNOWN;
}
