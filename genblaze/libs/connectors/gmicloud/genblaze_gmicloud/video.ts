/**
 * GMICloudVideoProvider — video generation via GMICloud Request Queue API.
 */

import { StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';
import { GMICloudBase, extractMediaUrl } from './_base.js';

export interface GMICloudVideoOptions {
    apiKey?: string;
    baseUrl?: string;
}

export class GMICloudVideoProvider extends GMICloudBase {
    readonly name = 'gmicloud-video';

    constructor(options: GMICloudVideoOptions = {}) {
        super(options.apiKey, options.baseUrl);
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const payload: Record<string, any> = {
            prompt: params.prompt,
            ...(params.params ?? {})
        };

        const requestId = await this._submitRequest(params.model, payload);

        // Poll for completion (videos take longer)
        let attempts = 0;
        const maxAttempts = 120; // 6 minutes max
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;

            const detail = await this._fetchDetail(requestId);
            const status = detail.status;

            if (status === 'success') {
                const outcome = detail.outcome || {};
                const mediaUrl = extractMediaUrl(outcome);
                if (!mediaUrl) {
                    throw new Error('GMICloud Video request completed but no media URL returned in outcome');
                }

                return {
                    buffer: Buffer.from(mediaUrl),
                    mimeType: 'video/mp4',
                    url: mediaUrl,
                    metadata: { model: params.model, requestId, outcome }
                };
            } else if (status === 'failed' || status === 'cancelled') {
                throw new Error(`GMICloud video generation ${status}: ${detail.error || 'Unknown error'}`);
            }
        }

        throw new Error(`GMICloud video generation timed out after ${maxAttempts * 3} seconds`);
    }
}

export class GMICloudProvider extends GMICloudVideoProvider {}
