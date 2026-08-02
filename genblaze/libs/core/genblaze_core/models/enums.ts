/** Enumerations for genblaze models — 1:1 port of models/enums.py */

export enum Modality {
    IMAGE = 'image',
    VIDEO = 'video',
    AUDIO = 'audio',
    TEXT = 'text'
}

export enum StepStatus {
    PENDING = 'pending',
    SUBMITTED = 'submitted',
    PROCESSING = 'processing',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum PromptVisibility {
    PUBLIC = 'public',
    PRIVATE = 'private',
    REDACTED = 'redacted',
    ENCRYPTED = 'encrypted'
}

export enum RunStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
    CANCELLED = 'cancelled'
}

export enum StepType {
    GENERATE = 'generate',
    UPSCALE = 'upscale',
    TRANSCODE = 'transcode',
    MIX = 'mix',
    EDIT = 'edit',
    CUSTOM = 'custom',
    INGEST = 'ingest',
    IMPORT = 'import'
}

export enum ProviderErrorCode {
    TIMEOUT = 'timeout',
    RATE_LIMIT = 'rate_limit',
    AUTH_FAILURE = 'auth_failure',
    INVALID_INPUT = 'invalid_input',
    MODEL_ERROR = 'model_error',
    SERVER_ERROR = 'server_error',
    CONTENT_POLICY = 'content_policy',
    UNKNOWN = 'unknown'
}

/** Error codes that are safe to retry (transient failures) */
export const RETRYABLE_ERROR_CODES = new Set<ProviderErrorCode>([
    ProviderErrorCode.TIMEOUT,
    ProviderErrorCode.RATE_LIMIT,
    ProviderErrorCode.SERVER_ERROR
]);
