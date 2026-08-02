/**
 * Influencer Management Tools
 * Maps to: /api/influencer endpoints
 */

import { apiCall } from './product.tools.js';

let _authToken: string = '';
export function setInfluencerAuthToken(token: string) { _authToken = token; }
function call(method: string, path: string, body?: any) {
    return apiCall(method, path, body, _authToken);
}

// Active influencer state tracking for context-aware UI updates
let lastActiveInfluencer: any = null;

export function getLastActiveInfluencer() {
    return lastActiveInfluencer;
}

export function clearLastActiveInfluencer() {
    lastActiveInfluencer = null;
}

// ─── Influencer Tools ────────────────────────────────────────

/**
 * List all AI influencers/avatars
 */
export async function listInfluencers({
    page = 1,
    limit = 12,
}: {
    page?: number;
    limit?: number;
} = {}): Promise<any> {
    return call('GET', `/api/influencer/list?page=${page}&limit=${limit}`);
}

/**
 * Get details of a specific influencer
 */
export async function getInfluencer({
    entityId,
}: {
    entityId: string;
}): Promise<any> {
    const res = await call('GET', `/api/influencer/${entityId}`);
    if (res && res.success && res.data) {
        lastActiveInfluencer = res.data;
    }
    return res;
}

/**
 * Update influencer information (identity, voice, visual settings)
 */
export async function updateInfluencer({
    entityId,
    identity,
    meta,
    visual,
}: {
    entityId: string;
    identity?: { name?: string; description?: string; personality?: string };
    meta?: { voiceConfig?: { voiceId?: string; language?: string; pitch?: number; rate?: number } };
    visual?: { style?: string };
}): Promise<any> {
    const res = await call('POST', `/api/influencer/${entityId}/update`, {
        identity, meta, visual
    });
    if (res && res.success && res.data) {
        lastActiveInfluencer = res.data;
    }
    return res;
}

/**
 * Delete an influencer
 */
export async function deleteInfluencer({
    entityId,
}: {
    entityId: string;
}): Promise<any> {
    return call('DELETE', `/api/influencer/${entityId}`);
}

/**
 * List available TTS voices
 * @param provider 'google' | 'gemini'
 */
export async function listVoices({
    provider = 'gemini',
    language,
}: {
    provider?: 'google' | 'gemini';
    language?: string;
}): Promise<any> {
    const params = language ? `?language=${language}` : '';
    return call('GET', `/api/influencer/voices/${provider}${params}`);
}

/**
 * Get influencer analytics/engagement stats
 */
export async function getInfluencerAnalytics({
    entityId,
}: {
    entityId: string;
}): Promise<any> {
    return call('GET', `/api/influencer/${entityId}/analytics`);
}

/**
 * Generate a product video for an influencer
 * ⚠️ Costs credits
 */
export async function generateProductVideo({
    entityId,
    productId,
}: {
    entityId: string;
    productId: string;
}): Promise<any> {
    const res = await call('POST', `/api/influencer/${entityId}/generate-product-video`, { productId });
    if (res && res.success && res.data) {
        lastActiveInfluencer = res.data;
    }
    return res;
}

/**
 * Get the sales video playlist for an influencer session
 */
export async function getSalesPlaylist({
    entityId,
    productIds,
}: {
    entityId: string;
    productIds?: string[];
}): Promise<any> {
    const params = productIds?.length ? `?productIds=${productIds.join(',')}` : '';
    return call('GET', `/api/influencer/${entityId}/sales/playlist${params}`);
}
