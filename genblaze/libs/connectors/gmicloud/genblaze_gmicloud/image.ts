/**
 * GMICloudImageProvider — image generation via GMICloud Request Queue API.
 */

import { StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';
import { GMICloudBase, extractMediaUrl } from './_base.js';

export interface GMICloudImageOptions {
    apiKey?: string;
    baseUrl?: string;
}

export class GMICloudImageProvider extends GMICloudBase {
    readonly name = 'gmicloud-image';

    constructor(options: GMICloudImageOptions = {}) {
        super(options.apiKey, options.baseUrl);
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const payload: Record<string, any> = {
            prompt: params.prompt,
            ...(params.params ?? {})
        };

        const requestId = await this._submitRequest(params.model, payload);

        // Poll for completion
        let attempts = 0;
        const maxAttempts = 60; // 3 minutes max
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;

            const detail = await this._fetchDetail(requestId);
            const status = detail.status;

            if (status === 'success') {
                const outcome = detail.outcome || {};
                const mediaUrl = extractMediaUrl(outcome, true);
                if (!mediaUrl) {
                    throw new Error('GMICloud Image request completed but no media URL returned in outcome');
                }

                return {
                    buffer: Buffer.from(mediaUrl), // URL representation
                    mimeType: 'image/png',
                    url: mediaUrl,
                    metadata: { model: params.model, requestId, outcome }
                };
            } else if (status === 'failed' || status === 'cancelled') {
                throw new Error(`GMICloud image generation ${status}: ${detail.error || 'Unknown error'}`);
            }
        }

        throw new Error(`GMICloud image generation timed out after ${maxAttempts * 3} seconds`);
    }
}
