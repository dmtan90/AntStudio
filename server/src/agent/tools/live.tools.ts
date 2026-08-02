/**
 * Live Stream & Agent Orchestration Tools
 * Maps to: /api/live, /api/google-agent endpoints
 */

import { apiCall } from './product.tools.js';

let _authToken: string = '';
export function setLiveAuthToken(token: string) { _authToken = token; }
function call(method: string, path: string, body?: any) {
    return apiCall(method, path, body, _authToken);
}

// Active live session state tracking for context-aware UI updates
let lastActiveLiveSession: any = null;

export function getLastActiveLiveSession() {
    return lastActiveLiveSession;
}

export function clearLastActiveLiveSession() {
    lastActiveLiveSession = null;
}

// ─── Live Session Tools ──────────────────────────────────────

/**
 * List recent Gemini Live sessions
 */
export async function listLiveSessions(): Promise<any> {
    return call('GET', '/api/live/sessions');
}

/**
 * Get full transcript of a live session
 */
export async function getLiveSession({
    sessionId,
}: {
    sessionId: string;
}): Promise<any> {
    const res = await call('GET', `/api/live/sessions/${sessionId}`);
    if (res && res.success && res.data) {
        lastActiveLiveSession = res.data;
    }
    return res;
}

// ─── Agent Orchestration Tools ───────────────────────────────

/**
 * Show/highlight a product in the active livestream
 * Use when user wants to spotlight a product during live
 */
export async function showProductInLive({
    projectId,
    productId,
    productName,
    price,
    discount,
}: {
    projectId: string;
    productId: string;
    productName?: string;
    price?: number;
    discount?: number;
}): Promise<any> {
    const res = await call('POST', '/api/google-agent/action', {
        action: 'show_product',
        projectId,
        payload: { productId, productName, price, discount }
    });
    if (res && res.success && res.data) {
        lastActiveLiveSession = res.data;
    }
    return res;
}

/**
 * Switch scene/layout in the active livestream
 */
export async function switchLiveScene({
    projectId,
    sceneId,
    transition = 'fade',
}: {
    projectId: string;
    sceneId: string;
    transition?: 'fade' | 'cut' | 'slide';
}): Promise<any> {
    return call('POST', '/api/google-agent/action', {
        action: 'switch_scene',
        projectId,
        payload: { sceneId, transition }
    });
}

/**
 * Send a message/announcement to the livestream chat
 */
export async function sendMessageToStream({
    projectId,
    message,
}: {
    projectId: string;
    message: string;
}): Promise<any> {
    return call('POST', '/api/google-agent/action', {
        action: 'send_message',
        projectId,
        payload: { text: message }
    });
}

/**
 * Play audio/TTS in the livestream
 */
export async function playAudioInStream({
    projectId,
    text,
    voice,
    audioUrl,
}: {
    projectId: string;
    text?: string;
    voice?: string;
    audioUrl?: string;
}): Promise<any> {
    return call('POST', '/api/google-agent/action', {
        action: 'play_audio',
        projectId,
        payload: { text, voice, url: audioUrl }
    });
}

/**
 * Highlight a comment in the livestream
 */
export async function highlightComment({
    projectId,
    text,
    commentId,
    duration = 10000,
}: {
    projectId: string;
    text: string;
    commentId?: string;
    duration?: number;
}): Promise<any> {
    return call('POST', '/api/google-agent/action', {
        action: 'highlight_comment',
        projectId,
        payload: { text, commentId, duration }
    });
}

/**
 * Sync all product inventory for a project
 */
export async function syncProjectInventory({
    projectId,
}: {
    projectId: string;
}): Promise<any> {
    return call('POST', '/api/google-agent/sync-all', { projectId });
}

/**
 * Get product inventory for agent orchestration
 */
export async function getAgentInventory({
    inventoryUrl,
}: {
    inventoryUrl: string;
}): Promise<any> {
    return call('GET', `/api/google-agent/inventory?inventoryUrl=${encodeURIComponent(inventoryUrl)}`);
}

/**
 * Simulate a flash sale (for testing/demo)
 */
export async function triggerFlashSale({
    productId,
    discount,
    durationMinutes = 10,
}: {
    productId: string;
    discount: number;
    durationMinutes?: number;
}): Promise<any> {
    return call('POST', '/api/commerce/flash-sale', { productId, discount, durationMinutes });
}
