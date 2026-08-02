export enum OpenAIErrorCode {
    AUTH_FAILURE = 'auth_failure',
    RATE_LIMIT = 'rate_limit',
    INVALID_INPUT = 'invalid_input',
    SERVER_ERROR = 'server_error',
    CONTENT_POLICY = 'content_policy'
}

export function mapOpenAIError(exc: any, statusCode?: number): OpenAIErrorCode {
    const msg = String(exc?.message || exc).toLowerCase();
    if (msg.includes('content_policy') || msg.includes('safety system')) return OpenAIErrorCode.CONTENT_POLICY;
    if (statusCode === 429) return OpenAIErrorCode.RATE_LIMIT;
    if (statusCode === 401 || statusCode === 403) return OpenAIErrorCode.AUTH_FAILURE;
    if (statusCode === 400) return OpenAIErrorCode.INVALID_INPUT;
    return OpenAIErrorCode.SERVER_ERROR;
}
