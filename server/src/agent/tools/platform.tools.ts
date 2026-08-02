/**
 * Platform Management Tools
 * Maps to: /api/platforms endpoints
 */

import { apiCall } from './product.tools.js';

let _authToken: string = '';
export function setPlatformAuthToken(token: string) { _authToken = token; }
function call(method: string, path: string, body?: any) {
    return apiCall(method, path, body, _authToken);
}

/**
 * List all connected social platforms (TikTok, YouTube, Facebook, etc.)
 */
export async function listPlatforms(): Promise<any> {
    return call('GET', '/api/platforms');
}

/**
 * Get OAuth authorization URL to connect a new platform
 */
export async function getPlatformAuthUrl({
    platform,
}: {
    platform: 'tiktok' | 'youtube' | 'facebook' | 'instagram' | 'twitter' | 'ant_media';
}): Promise<any> {
    return call('GET', `/api/platforms/auth/${platform}`);
}

/**
 * Disconnect/remove a platform account
 */
export async function disconnectPlatform({
    platformId,
}: {
    platformId: string;
}): Promise<any> {
    return call('DELETE', `/api/platforms/${platformId}`);
}

/**
 * Get statistics for a platform account (subscribers, views, etc.)
 */
export async function getPlatformStats({
    platformId,
}: {
    platformId: string;
}): Promise<any> {
    return call('GET', `/api/platforms/${platformId}/stats`);
}

/**
 * List videos from a connected platform
 */
export async function listPlatformVideos({
    platformId,
    page = 1,
    limit = 12,
    search,
}: {
    platformId: string;
    page?: number;
    limit?: number;
    search?: string;
}): Promise<any> {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set('search', search);
    return call('GET', `/api/platforms/${platformId}/videos?${params.toString()}`);
}

/**
 * Get live stream RTMP info for a platform
 */
export async function getLiveStreamInfo({
    platformId,
    title,
    description,
}: {
    platformId: string;
    title?: string;
    description?: string;
}): Promise<any> {
    const params = new URLSearchParams();
    if (title) params.set('title', title);
    if (description) params.set('description', description);
    return call('GET', `/api/platforms/${platformId}/live-info?${params.toString()}`);
}
