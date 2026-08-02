export class GenblazeError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'GenblazeError';
    }
}

export class PipelineError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'PipelineError';
    }
}

export class ProviderError extends GenblazeError {
    public readonly provider: string;
    public readonly errorCode?: string;

    constructor(message: string, provider: string, errorCode?: string) {
        super(`[${provider}] ${message}`);
        this.name = 'ProviderError';
        this.provider = provider;
        this.errorCode = errorCode;
    }
}

export class StorageError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'StorageError';
    }
}

export class ValidationError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class ManifestError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'ManifestError';
    }
}

export class EmbedError extends GenblazeError {
    constructor(message: string) {
        super(message);
        this.name = 'EmbedError';
    }
}

export class ModelNotFoundError extends GenblazeError {
    constructor(model: string, provider?: string) {
        super(`Model '${model}' not found in registry${provider ? ` for provider '${provider}'` : ''}.`);
        this.name = 'ModelNotFoundError';
    }
}

export class AuthenticationError extends ProviderError {
    constructor(message: string, provider: string) {
        super(message, provider, 'auth_failure');
        this.name = 'AuthenticationError';
    }
}

export class RateLimitError extends ProviderError {
    constructor(message: string, provider: string) {
        super(message, provider, 'rate_limit');
        this.name = 'RateLimitError';
    }
}

export class TimeoutError extends ProviderError {
    constructor(message: string, provider: string) {
        super(message, provider, 'timeout');
        this.name = 'TimeoutError';
    }
}

export class ContentPolicyError extends ProviderError {
    constructor(message: string, provider: string) {
        super(message, provider, 'content_policy');
        this.name = 'ContentPolicyError';
    }
}
