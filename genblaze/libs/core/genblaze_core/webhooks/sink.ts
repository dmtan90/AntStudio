/** WebhookSink — BaseSink that posts pipeline completion events via webhook. 1:1 port of webhooks/sink.py */

import { BaseSink } from '../sinks/base.js';
import { Run } from '../models/run.js';
import { Manifest } from '../models/manifest.js';
import { RunStatus } from '../models/enums.js';
import { WebhookConfig, WebhookEvent, WebhookNotifier } from './notifier.js';

export class WebhookSink extends BaseSink {
    /** Fire-and-forget: the notifier flushes via its own mechanism. */
    protected _closeWithRun = false;

    private notifier: WebhookNotifier;

    constructor(config: WebhookConfig) {
        super();
        this.notifier = new WebhookNotifier(config);
    }

    async writeRun(run: Run, manifest: Manifest): Promise<void> {
        const isCompleted = run.status === RunStatus.COMPLETED;
        const event = isCompleted ? WebhookEvent.PIPELINE_COMPLETED : WebhookEvent.PIPELINE_FAILED;

        await this.notifier.send(event, {
            runId: run.runId,
            status: run.status,
            stepCount: run.steps.length,
            canonicalHash: manifest.canonicalHash,
            timestamp: new Date().toISOString()
        });
    }

    close(): void {
        // Notifier cleanup (if needed, e.g., abort pending requests)
    }
}
