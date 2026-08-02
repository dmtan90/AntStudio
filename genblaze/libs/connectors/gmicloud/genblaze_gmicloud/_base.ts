import process from 'process';
import { BaseProviderAdapter, StepParams, ProviderOutput } from '../../../core/genblaze_core/index.js';
import { mapGmiCloudError, ProviderErrorCode } from './_errors.js';

export const DEFAULT_GMI_BASE_URL = 'https://console.gmicloud.ai/api/v1/ie/requestqueue/apikey';

export function extractMediaUrls(outcome: Record<string, any>, imageFallback = false): string[] {
    const urls: string[] = [];
    const mediaUrls = outcome?.media_urls;
    if (Array.isArray(mediaUrls)) {
        for (const entry of mediaUrls) {
            if (typeof entry === 'object' && entry?.url) {
                urls.push(String(entry.url));
            } else if (typeof entry === 'string' && entry) {
                urls.push(entry);
            }
        }
    }
    if (urls.length > 0) return urls;

    const legacyKeys = ['video_url', 'image_url', 'audio_url', 'url'];
    for (const key of legacyKeys) {
        if (outcome?.[key]) return [String(outcome[key])];
    }
    if (imageFallback && outcome?.thumbnail_image_url) {
        return [String(outcome.thumbnail_image_url)];
    }
    return [];
}

export function extractMediaUrl(outcome: Record<string, any>, imageFallback = false): string | null {
    const urls = extractMediaUrls(outcome, imageFallback);
    return urls.length > 0 ? urls[0] : null;
}

export abstract class GMICloudBase extends BaseProviderAdapter {
    protected apiKey: string;
    protected baseUrl: string;

    constructor(apiKey?: string, baseUrl?: string) {
        super();
        this.apiKey = apiKey || process.env.GMI_API_KEY || '';
        this.baseUrl = baseUrl || process.env.GMI_BASE_URL || DEFAULT_GMI_BASE_URL;
    }

    protected async _submitRequest(model: string, payload: Record<string, any>): Promise<string> {
        if (!this.apiKey) {
            // Demo fallback prediction ID when no API key configured
            return `gmi_pred_${Date.now()}`;
        }

        try {
            const response = await fetch(`${this.baseUrl}/requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({ model, payload })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`GMICloud API HTTP ${response.status}: ${text}`);
            }

            const json: any = await response.json();
            return json.request_id || json.id || `gmi_${Date.now()}`;
        } catch (err: any) {
            throw new Error(`GMICloud submit failed: ${err.message}`);
        }
    }

    protected async _fetchDetail(requestId: string): Promise<Record<string, any>> {
        if (!this.apiKey) {
            return {
                status: 'success',
                outcome: { video_url: `https://f000.backblazeb2.com/file/antstudio-media/genblaze/demo_video.mp4` }
            };
        }

        try {
            const response = await fetch(`${this.baseUrl}/requests/${requestId}`, {
                headers: { 'Authorization': `Bearer ${this.apiKey}` }
            });

            if (!response.ok) {
                throw new Error(`GMICloud poll failed with status ${response.status}`);
            }

            return await response.json();
        } catch (err: any) {
            return { status: 'failed', error: err.message };
        }
    }
}
