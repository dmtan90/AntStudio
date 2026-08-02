/** WebhookNotifier — fire-and-forget HTTP notifications for pipeline events. 1:1 port of webhooks/notifier.py */

export enum WebhookEvent {
    PIPELINE_STARTED = 'pipeline.started',
    PIPELINE_COMPLETED = 'pipeline.completed',
    PIPELINE_FAILED = 'pipeline.failed',
    STEP_STARTED = 'step.started',
    STEP_COMPLETED = 'step.completed',
    STEP_FAILED = 'step.failed'
}

export interface WebhookConfig {
    url: string;
    headers?: Record<string, string> | null;
    timeout: number;
    maxRetries: number;
    includeEvents?: Set<string> | null;
}

export function createWebhookConfig(options: Partial<WebhookConfig> & { url: string }): WebhookConfig {
    const parsed = new URL(options.url);
    if (parsed.protocol !== 'https:') {
        throw new Error(`Webhook URL must use HTTPS, got: ${parsed.protocol}//`);
    }
    if (!parsed.hostname) {
        throw new Error(`Webhook URL is missing a hostname: ${options.url}`);
    }
    if (parsed.hostname.toLowerCase() === 'localhost') {
        throw new Error(`Webhook URL cannot target private/loopback hosts: ${parsed.hostname}`);
    }

    return {
        url: options.url,
        headers: options.headers ?? null,
        timeout: options.timeout ?? 10.0,
        maxRetries: options.maxRetries ?? 2,
        includeEvents: options.includeEvents ?? null
    };
}

export class WebhookNotifier {
    private config: WebhookConfig;
    private queue: Array<Record<string, any>> = [];
    private processing = false;

    constructor(config: WebhookConfig) {
        this.config = config;
    }

    async send(eventType: string, payload: Record<string, any>): Promise<void> {
        if (this.config.includeEvents && !this.config.includeEvents.has(eventType)) {
            return;
        }

        const body = JSON.stringify({
            event: eventType,
            timestamp: new Date().toISOString(),
            ...payload
        });

        for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.config.timeout * 1000);

                const response = await fetch(this.config.url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...this.config.headers
                    },
                    body,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.ok) return;
                if (response.status < 500) break; // Client error — don't retry
            } catch (err: any) {
                if (attempt === this.config.maxRetries) {
                    console.warn(`[WebhookNotifier] Failed to deliver ${eventType} after ${attempt + 1} attempts: ${err.message}`);
                }
            }
        }
    }

    async notifyPipelineStarted(runId: string, pipelineName?: string): Promise<void> {
        await this.send(WebhookEvent.PIPELINE_STARTED, { runId, pipelineName });
    }

    async notifyPipelineCompleted(runId: string, manifestHash?: string): Promise<void> {
        await this.send(WebhookEvent.PIPELINE_COMPLETED, { runId, manifestHash });
    }

    async notifyPipelineFailed(runId: string, error?: string): Promise<void> {
        await this.send(WebhookEvent.PIPELINE_FAILED, { runId, error });
    }

    async notifyStepCompleted(runId: string, stepId: string, provider?: string, model?: string): Promise<void> {
        await this.send(WebhookEvent.STEP_COMPLETED, { runId, stepId, provider, model });
    }
}
