export interface RetryConfig {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
}

export class RetryPolicy {
    private maxAttempts: number;
    private initialDelayMs: number;
    private maxDelayMs: number;
    private backoffFactor: number;

    constructor(config: RetryConfig = {}) {
        this.maxAttempts = config.maxAttempts || 3;
        this.initialDelayMs = config.initialDelayMs || 1000;
        this.maxDelayMs = config.maxDelayMs || 10000;
        this.backoffFactor = config.backoffFactor || 2;
    }

    public async execute<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
        let lastError: any;
        let delay = this.initialDelayMs;

        for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
            try {
                return await fn(attempt);
            } catch (err: any) {
                lastError = err;
                if (attempt === this.maxAttempts) break;
                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * this.backoffFactor, this.maxDelayMs);
            }
        }

        throw lastError;
    }
}
