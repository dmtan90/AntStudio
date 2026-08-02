/**
 * GMICloudAudioProvider — audio, TTS, and Music generation via GMICloud Request Queue API.
 */

import { StepParams, ProviderOutput } from '../../../core/genblaze_core/pipeline.js';
import { GMICloudBase, extractMediaUrl } from './_base.js';

export interface GMICloudAudioOptions {
    apiKey?: string;
    baseUrl?: string;
}

export class GMICloudAudioProvider extends GMICloudBase {
    readonly name = 'gmicloud-audio';

    constructor(options: GMICloudAudioOptions = {}) {
        super(options.apiKey, options.baseUrl);
    }

    async execute(params: StepParams): Promise<ProviderOutput> {
        const isMusicModel = params.model.toLowerCase().includes('music');
        const payload: Record<string, any> = isMusicModel
            ? {
                lyrics: params.prompt || params.params?.lyrics || '',
                prompt: params.params?.prompt,
                format: params.params?.format || 'mp3',
                ...(params.params ?? {})
              }
            : {
                text: params.prompt || params.params?.text || '',
                prompt: params.prompt,
                voice_id: params.params?.voice_id || 'Dennis',
                audio_encoding: params.params?.audio_encoding || 'MP3',
                ...(params.params ?? {})
              };

        const submitUrl = `${this.baseUrl}/requests`;

        const res = await fetch(submitUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ model: params.model, payload })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`GMICloud Audio submit failed (${res.status}): ${errText}`);
        }

        const data: any = await res.json();
        const requestId = data.request_id || data.id;

        // If response already returned success (synchronous response)
        if (data.status === 'success' && data.outcome) {
            const mediaUrl = data.outcome.audio_url || extractMediaUrl(data.outcome);
            if (mediaUrl) {
                return {
                    buffer: Buffer.from(mediaUrl),
                    mimeType: 'audio/mpeg',
                    url: mediaUrl,
                    metadata: { model: params.model, requestId, outcome: data.outcome }
                };
            }
        }

        // Async poll fallback if queued / processing (music generation takes ~30-60s)
        let attempts = 0;
        const maxAttempts = 60; // 3 minutes max
        while (attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;

            const detail = await this._fetchDetail(requestId);
            const status = detail.status;

            if (status === 'success') {
                const outcome = detail.outcome || {};
                const mediaUrl = outcome.audio_url || extractMediaUrl(outcome);
                if (!mediaUrl) {
                    throw new Error('GMICloud Audio request completed but no media URL returned in outcome');
                }

                return {
                    buffer: Buffer.from(mediaUrl),
                    mimeType: 'audio/mpeg',
                    url: mediaUrl,
                    metadata: { model: params.model, requestId, outcome }
                };
            } else if (status === 'failed' || status === 'cancelled') {
                throw new Error(`GMICloud audio generation ${status}: ${detail.error || 'Unknown error'}`);
            }
        }

        throw new Error(`GMICloud audio generation timed out after ${maxAttempts * 3} seconds`);
    }
}
