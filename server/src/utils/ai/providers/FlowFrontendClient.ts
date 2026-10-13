import axios from 'axios';
import { randomInt, randomUUID } from 'crypto';
import { Logger } from '../../Logger.js';

/**
 * Transport for the current flow.google.com web app.
 *
 * Google retired the Labs tRPC (labs.google/fx/api/trpc/*) and AI Sandbox REST
 * (aisandbox-pa.googleapis.com/v1/*) endpoints. The Flow frontend now talks to
 * protobuf RPCs through Google batchexecute, authenticated purely by the
 * Google account cookies (OSID on flow.google.com + SID family on .google.com).
 *
 * Ported from openvideo/apps/shine (FlowFrontendClient), itself based on flow2api.
 */

export const FLOW_ORIGIN = 'https://flow.google.com';
export const FLOW_RECAPTCHA_SITE_KEY = '6LdsFiUsAAAAAIjVDZcuLhaHiDn5nnHVXVRQGeMV';
export const FLOW_DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
const FLOW_SESSION_COOKIE_NAMES = new Set(['OSID', '__Secure-OSID']);
const GOOGLE_ACCOUNT_COOKIE_NAMES = new Set(['SID', 'HSID', 'SSID', 'APISID', 'SAPISID', '__Secure-1PSID', '__Secure-3PSID']);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const UUID_SEARCH_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export type FlowVideoMode = 'text' | 'start' | 'start_end' | 'references' | 'extend' | 'upsample';

export interface FlowVideoOperation {
    name: string;
    mediaName: string;
    projectId: string;
    status: 'MEDIA_GENERATION_STATUS_ACTIVE' | 'MEDIA_GENERATION_STATUS_SUCCESSFUL' | 'MEDIA_GENERATION_STATUS_FAILED';
    videoUrl?: string;
    errorCode?: string;
}

export interface FlowVideoSubmission {
    operations: FlowVideoOperation[];
    videoUrl?: string;
}

export interface FlowRequestContext {
    /** Raw cookie storage: "a=b; c=d" header text or a browser cookie JSON export */
    cookies: string;
    userAgent?: string;
    acceptLanguage?: string;
    /** UA client hints captured from the account's browser; inferred from userAgent when missing */
    secChUa?: string;
    secChUaMobile?: string;
    secChUaPlatform?: string;
}

/**
 * Browser identity headers for every Flow request, mirroring flow2api's _make_text_request:
 * fingerprint values win, otherwise the UA client hints are inferred from the User-Agent so
 * they never contradict it (Google scores mismatches as PUBLIC_ERROR_UNUSUAL_ACTIVITY).
 */
export function flowBrowserHeaders(ctx: FlowRequestContext): Record<string, string> {
    const userAgent = ctx.userAgent || FLOW_DEFAULT_USER_AGENT;
    const ua = userAgent.toLowerCase();
    const major = userAgent.match(/(?:Chrome|Chromium)\/(\d+)/i)?.[1] || '124';
    const inferredSecChUa = `"Google Chrome";v="${major}", "Chromium";v="${major}", "Not)A;Brand";v="24"`;
    // A Chrome UA with hints from another browser brand is replaced by the inferred value
    const secChUa = ctx.secChUa && !(ua.includes('chrome/') && !ctx.secChUa.toLowerCase().includes('google chrome'))
        ? ctx.secChUa
        : inferredSecChUa;

    let platform = '"Windows"';
    let mobile = '?0';
    if (ua.includes('android')) { platform = '"Android"'; mobile = '?1'; }
    else if (/iphone|ipad|ios/.test(ua)) { platform = '"iOS"'; mobile = '?1'; }
    else if (ua.includes('mac')) platform = '"macOS"';
    else if (/linux|x11/.test(ua)) platform = '"Linux"';

    return {
        'User-Agent': userAgent,
        'Accept-Language': ctx.acceptLanguage || 'en-US,en;q=0.9',
        'sec-ch-ua': secChUa,
        'sec-ch-ua-mobile': ctx.secChUaMobile || mobile,
        'sec-ch-ua-platform': ctx.secChUaPlatform || platform,
    };
}

// ---------------------------------------------------------------------------
// Cookie helpers
// ---------------------------------------------------------------------------

interface CookieRecord {
    name?: string;
    value?: string;
    domain?: string;
    path?: string;
    secure?: boolean;
    hostOnly?: boolean;
    expirationDate?: number;
    expires?: number;
}

function parseCookieJson(raw: string): CookieRecord[] | Record<string, string> | null {
    const text = raw.trim();
    if (!text.startsWith('[') && !text.startsWith('{')) return null;
    try {
        const payload = JSON.parse(text);
        if (Array.isArray(payload)) return payload;
        if (payload && Array.isArray(payload.cookies)) return payload.cookies;
        if (payload && typeof payload === 'object' && 'name' in payload && 'value' in payload) return [payload];
        if (payload && typeof payload === 'object') return payload as Record<string, string>;
    } catch {
        // Not JSON, treat as header text
    }
    return null;
}

function isSafeCookiePair(name: string, value: string): boolean {
    return !!name && !!value && /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/.test(name) && !value.includes(';') && !/[\x00-\x1f]/.test(value);
}

function cookieMatchesUrl(cookie: CookieRecord, target: URL): boolean {
    const host = target.hostname.toLowerCase();
    const domain = String(cookie.domain || '').trim().toLowerCase();
    if (domain) {
        const normalized = domain.replace(/^\./, '');
        if (cookie.hostOnly) {
            if (host !== normalized) return false;
        } else if (host !== normalized && !host.endsWith(`.${normalized}`)) {
            return false;
        }
    }
    if (cookie.secure && target.protocol !== 'https:') return false;
    const cookiePath = String(cookie.path || '/');
    const requestPath = target.pathname || '/';
    if (requestPath !== cookiePath && !requestPath.startsWith(cookiePath.endsWith('/') ? cookiePath : `${cookiePath}/`)) {
        return false;
    }
    const expires = cookie.expirationDate ?? cookie.expires;
    if (typeof expires === 'number' && expires > 0 && expires * 1000 <= Date.now()) return false;
    return true;
}

/** Return the cookie pairs a browser would send to `targetUrl`. */
export function flowCookiePairsForUrl(rawCookies: string, targetUrl = `${FLOW_ORIGIN}/projects`): Array<[string, string]> {
    let text = String(rawCookies || '').trim();
    if (!text) return [];
    text = text.replace(/^cookie:\s*/i, '');

    const json = parseCookieJson(text);
    if (Array.isArray(json)) {
        const target = new URL(targetUrl);
        return json
            .map((cookie, index) => ({ cookie, index }))
            .filter(({ cookie }) => cookie && typeof cookie === 'object' && cookieMatchesUrl(cookie, target))
            .map(({ cookie, index }) => ({ name: String(cookie.name || '').trim(), value: String(cookie.value || '').trim(), pathLength: String(cookie.path || '/').length, index }))
            .filter(c => isSafeCookiePair(c.name, c.value))
            .sort((a, b) => b.pathLength - a.pathLength || a.index - b.index)
            .map(c => [c.name, c.value] as [string, string]);
    }
    if (json && typeof json === 'object') {
        return Object.entries(json)
            .map(([name, value]) => [name.trim(), String(value ?? '').trim()] as [string, string])
            .filter(([name, value]) => isSafeCookiePair(name, value));
    }

    const pairs: Array<[string, string]> = [];
    for (const chunk of text.replace(/\n/g, ';').split(';')) {
        const idx = chunk.indexOf('=');
        if (idx <= 0) continue;
        const name = chunk.slice(0, idx).trim();
        const value = chunk.slice(idx + 1).trim();
        if (isSafeCookiePair(name, value)) pairs.push([name, value]);
    }
    return pairs;
}

export function serializeFlowCookieHeader(rawCookies: string, targetUrl = `${FLOW_ORIGIN}/projects`): string {
    return flowCookiePairsForUrl(rawCookies, targetUrl).map(([n, v]) => `${n}=${v}`).join('; ');
}

/** Names of the required cookie groups that are missing from the storage (empty = OK). */
export function missingFlowCookies(rawCookies: string): string[] {
    const names = new Set(flowCookiePairsForUrl(rawCookies).map(([name]) => name));
    const missing: string[] = [];
    if (![...FLOW_SESSION_COOKIE_NAMES].some(n => names.has(n))) {
        missing.push('flow.google.com session cookie (OSID or __Secure-OSID)');
    }
    if (![...GOOGLE_ACCOUNT_COOKIE_NAMES].some(n => names.has(n))) {
        missing.push('.google.com account cookies (SID/HSID/SSID/APISID/SAPISID)');
    }
    return missing;
}

/** True when the raw value looks like full Google cookies usable with flow.google.com. */
export function isFlowCookieStorage(rawCookies: string): boolean {
    return !!rawCookies && missingFlowCookies(rawCookies).length === 0;
}

// ---------------------------------------------------------------------------
// Payload helpers
// ---------------------------------------------------------------------------

function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_RE.test(value);
}

/** Video operation ids are UUIDs, except derived jobs such as "<sourceId>_upsampled" (p0UkFb) */
export const FLOW_OPERATION_ID_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?:_[a-z0-9]+)?';
const OPERATION_ID_RE = new RegExp(`^${FLOW_OPERATION_ID_PATTERN}$`, 'i');

function isOperationId(value: unknown): value is string {
    return typeof value === 'string' && OPERATION_ID_RE.test(value);
}

export function findFlowContentUrl(value: unknown, kind: 'image' | 'video'): string {
    if (typeof value === 'string') {
        return value.startsWith('https://') && value.includes(`/${kind}/`) ? value : '';
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            const url = findFlowContentUrl(item, kind);
            if (url) return url;
        }
    } else if (value && typeof value === 'object') {
        for (const item of Object.values(value)) {
            const url = findFlowContentUrl(item, kind);
            if (url) return url;
        }
    }
    return '';
}

function findUuid(value: unknown, excluded: Set<string> = new Set()): string {
    if (typeof value === 'string') {
        for (const candidate of value.match(UUID_SEARCH_RE) || []) {
            if (!excluded.has(candidate.toLowerCase())) return candidate;
        }
        return '';
    }
    const items = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
    for (const item of items) {
        const found = findUuid(item, excluded);
        if (found) return found;
    }
    return '';
}

function findEncodedMedia(value: unknown): string {
    if (typeof value === 'string') {
        return !value.startsWith('https://') && value.length >= 512 && /^[A-Za-z0-9+/=_-]+$/.test(value) ? value : '';
    }
    const items = Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : [];
    for (const item of items) {
        const found = findEncodedMedia(item);
        if (found) return found;
    }
    return '';
}

function extractErrorCode(value: unknown): string {
    if (typeof value === 'string') return /^(PUBLIC_ERROR_|ERROR_)/.test(value) ? value : '';
    if (Array.isArray(value)) {
        for (const item of value) {
            const code = extractErrorCode(item);
            if (code) return code;
        }
    }
    return '';
}

function normalizeMediaName(mediaName: string): string {
    const normalized = String(mediaName || '').trim().replace(/\/+$/, '');
    return normalized.includes('/') ? normalized.slice(normalized.lastIndexOf('/') + 1) : normalized;
}

function upperUuid(): string {
    return randomUUID().toUpperCase();
}

function randomSeed(): number {
    return randomInt(1, 2147483647);
}

function parseBatchexecuteFrames(responseText: string): unknown[][] {
    const frames: unknown[][] = [];
    for (const rawLine of String(responseText || '').split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line.startsWith('[')) continue;
        try {
            const frame = JSON.parse(line);
            if (Array.isArray(frame)) frames.push(frame);
        } catch {
            // skip length prefixes / partial chunks
        }
    }
    return frames;
}

const GRPC_STATUS_NAMES: Record<string, string> = {
    '3': 'INVALID_ARGUMENT',
    '5': 'NOT_FOUND',
    '7': 'PERMISSION_DENIED',
    '8': 'RESOURCE_EXHAUSTED',
    '9': 'FAILED_PRECONDITION',
    '13': 'INTERNAL',
    '14': 'UNAVAILABLE',
    '16': 'UNAUTHENTICATED',
};

export class FlowRpcError extends Error {
    constructor(message: string, public readonly rpcId: string, public readonly code?: string) {
        super(message);
        this.name = 'FlowRpcError';
    }

    get isAuthError(): boolean {
        return this.code === '401' || this.code === '16';
    }

    /** gRPC NOT_FOUND: an unknown model key, media id or project */
    get isNotFound(): boolean {
        return this.code === '5';
    }

    /** reCAPTCHA token scored too low; a fresh token usually passes */
    get isCaptchaRejected(): boolean {
        return /UNUSUAL_ACTIVITY|RECAPTCHA/i.test(this.code || '');
    }
}

function raiseBatchexecuteError(frames: unknown[][], rpcId: string): void {
    for (const frame of frames) {
        for (const item of frame) {
            if (!Array.isArray(item) || item.length < 3) continue;
            if (item[0] === 'er') {
                let code = item.length > 5 && item[5] != null ? item[5] : undefined;
                if (code == null && item.length > 6) code = item[6];
                const codeText = code != null ? String(code) : 'unknown';
                if (codeText === '401') {
                    throw new FlowRpcError(`Flow authentication failed: Google cookies are expired, incomplete or from another account (rpc=${rpcId}, code=401)`, rpcId, '401');
                }
                throw new FlowRpcError(`Flow frontend RPC rejected: rpc=${rpcId}, code=${codeText}`, rpcId, codeText);
            }
            if (item[0] !== 'wrb.fr' || item[1] !== rpcId) continue;
            const detail = item.length > 5 ? item[5] : undefined;
            const errorCode = extractErrorCode(detail);
            if (errorCode) {
                throw new FlowRpcError(`Flow frontend RPC rejected: rpc=${rpcId}, error=${errorCode}`, rpcId, errorCode);
            }
            if (item[2] == null && detail != null) {
                // Status envelope such as [5] carries a gRPC status code
                const code = String(Array.isArray(detail) ? detail[0] : detail);
                const name = GRPC_STATUS_NAMES[code];
                throw new FlowRpcError(`Flow frontend RPC rejected: rpc=${rpcId}, code=${code}${name ? ` (${name})` : ''}`, rpcId, code);
            }
        }
    }
}

function extractBatchexecutePayload(frames: unknown[][], rpcId: string): unknown {
    for (const frame of frames) {
        for (const item of frame) {
            if (!Array.isArray(item) || item.length < 3 || item[0] !== 'wrb.fr' || item[1] !== rpcId) continue;
            try {
                return JSON.parse(String(item[2]));
            } catch {
                return null;
            }
        }
    }
    return null;
}

function projectContext(projectId: string, recaptchaToken: string): unknown[] {
    return [null, 22, null, null, null, projectId, null, null, null, null, [recaptchaToken, 1]];
}

function mapImageAspectRatio(aspectRatio: string): number {
    const mapping: Record<string, number> = {
        IMAGE_ASPECT_RATIO_SQUARE: 1,
        IMAGE_ASPECT_RATIO_PORTRAIT: 2,
        IMAGE_ASPECT_RATIO_16_9: 3,
        IMAGE_ASPECT_RATIO_LANDSCAPE: 3,
        IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE: 4,
        IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR: 5,
    };
    const value = mapping[String(aspectRatio || '').trim().toUpperCase()];
    if (!value) throw new Error(`Unsupported Flow image aspect ratio: ${aspectRatio}`);
    return value;
}

function mapVideoAspectRatio(aspectRatio: string): number {
    const normalized = String(aspectRatio || '').toUpperCase();
    if (normalized.includes('PORTRAIT')) return 1;
    if (normalized.includes('SQUARE')) return 0;
    return 2;
}

function mapVideoResolution(resolution?: string): number | null {
    const normalized = String(resolution || '').toUpperCase();
    if (!normalized) return null;
    if (normalized.includes('4K')) return 4;
    if (normalized.includes('1080')) return 3;
    if (normalized.includes('720')) return 2;
    if (normalized.includes('360')) return 1;
    return null;
}

/**
 * p0UkFb resolution enum. 1080p = 2 was captured from the UI; 4K = 3 follows the same ordering
 * and is not verified yet.
 */
function mapUpsampleResolution(resolution?: string): number {
    return String(resolution || '').toUpperCase().includes('4K') ? 3 : 2;
}

/** Find [operationId, projectId, mediaId, ...] records in a video RPC payload. */
function extractVideoRecords(payload: unknown, projectId?: string): unknown[][] {
    const records: unknown[][] = [];
    const walk = (value: unknown) => {
        if (Array.isArray(value)) {
            if (value.length >= 3 && isOperationId(value[0]) && (projectId == null || String(value[1] ?? '') === projectId) && isUuid(value[2])) {
                records.push(value);
                return;
            }
            value.forEach(walk);
        } else if (value && typeof value === 'object') {
            Object.values(value).forEach(walk);
        }
    };
    walk(payload);
    const seen = new Set<string>();
    return records.filter(r => {
        const key = String(r[0]);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class FlowFrontendClient {
    private static instance: FlowFrontendClient;

    public static getInstance(): FlowFrontendClient {
        if (!FlowFrontendClient.instance) {
            FlowFrontendClient.instance = new FlowFrontendClient();
        }
        return FlowFrontendClient.instance;
    }

    public projectPageUrl(projectId: string): string {
        return `${FLOW_ORIGIN}/project/${projectId}`;
    }

    private async loadBootstrap(ctx: FlowRequestContext, pageUrl: string, timeoutMs: number) {
        const cookieHeader = serializeFlowCookieHeader(ctx.cookies, pageUrl);
        if (!cookieHeader) throw new Error('Flow frontend RPC requires Google session cookies');

        const response = await axios.get<string>(pageUrl, {
            // A top-level navigation, as curl_cffi's Chrome impersonation sends it in flow2api
            headers: {
                ...flowBrowserHeaders(ctx),
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Cookie': cookieHeader,
                'Referer': `${FLOW_ORIGIN}/`,
                'sec-fetch-dest': 'document',
                'sec-fetch-mode': 'navigate',
                'sec-fetch-site': 'same-origin',
                'upgrade-insecure-requests': '1',
            },
            responseType: 'text',
            timeout: Math.max(10_000, Math.min(timeoutMs, 30_000)),
            validateStatus: () => true,
        });

        const finalUrl: string = (response.request as any)?.res?.responseUrl || pageUrl;
        let finalHost = '';
        try { finalHost = new URL(finalUrl).hostname.toLowerCase(); } catch { /* ignore */ }
        if (response.status === 401 || response.status === 403 || (finalHost && finalHost !== 'flow.google.com')) {
            throw new FlowRpcError(`Flow authentication failed: Google cookies are expired, incomplete or redirected to sign-in (status=${response.status})`, 'bootstrap', '401');
        }
        if (response.status >= 400) {
            throw new Error(`Flow frontend bootstrap failed: HTTP ${response.status}`);
        }

        const html = String(response.data || '');
        const bootloader = html.match(/boq_labs-ai-sandbox-frontend_[A-Za-z0-9_.-]+/)?.[0];
        const frontendSessionId = html.match(/"FdrFJe":"(-?[0-9]+)"/)?.[1];
        if (!bootloader || !frontendSessionId) {
            throw new FlowRpcError('Flow frontend bootstrap metadata is unavailable (cookies may be invalid)', 'bootstrap', '401');
        }
        return { bootloader, frontendSessionId };
    }

    /** Call a batchexecute RPC on flow.google.com and return its decoded payload. */
    public async rpc(
        ctx: FlowRequestContext,
        rpcId: string,
        argument: unknown[],
        options: { projectId?: string; sourcePath?: string; timeoutMs?: number } = {},
    ): Promise<any> {
        const timeoutMs = options.timeoutMs || 30_000;
        const sourcePath = options.sourcePath || (options.projectId ? `/project/${options.projectId}` : '/projects');
        const { bootloader, frontendSessionId } = await this.loadBootstrap(ctx, `${FLOW_ORIGIN}${sourcePath}`, timeoutMs);

        const url = `${FLOW_ORIGIN}/_/AiSandboxAngularFrontend/data/batchexecute`
            + `?rpcids=${encodeURIComponent(rpcId)}`
            + `&source-path=${encodeURIComponent(sourcePath)}`
            + `&bl=${encodeURIComponent(bootloader)}`
            + `&f.sid=${frontendSessionId}&hl=en`
            + `&_reqid=${randomInt(10_000, 90_000)}&rt=c`;

        const headers = {
            ...flowBrowserHeaders(ctx),
            'Accept': '*/*',
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'Cookie': serializeFlowCookieHeader(ctx.cookies, url),
            'Origin': FLOW_ORIGIN,
            'Referer': `${FLOW_ORIGIN}${sourcePath}`,
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-origin',
            'x-same-domain': '1',
        };
        const fReq = JSON.stringify([[[rpcId, JSON.stringify(argument), null, 'generic']]]);
        const body = new URLSearchParams({ 'f.req': fReq }).toString();

        const post = async (requestBody: string) => {
            const res = await axios.post<string>(url, requestBody, {
                headers,
                responseType: 'text',
                timeout: timeoutMs,
                validateStatus: () => true,
                transformResponse: [(data) => data],
            });
            if (res.status === 401) {
                throw new FlowRpcError(`Flow authentication failed (rpc=${rpcId}, status=401)`, rpcId, '401');
            }
            return String(res.data || '');
        };

        let responseText = await post(body);
        const xsrf = responseText.match(/\["xsrf","([^"]+)"/)?.[1];
        if (xsrf) {
            responseText = await post(`${body}&at=${encodeURIComponent(xsrf)}`);
        }

        const frames = parseBatchexecuteFrames(responseText);
        raiseBatchexecuteError(frames, rpcId);
        const payload = extractBatchexecutePayload(frames, rpcId);
        if (payload == null) {
            throw new FlowRpcError(`Flow frontend RPC returned no payload: rpc=${rpcId}`, rpcId);
        }
        return payload;
    }

    // --- Account / project -------------------------------------------------

    public async getCredits(ctx: FlowRequestContext): Promise<number> {
        const payload = await this.rpc(ctx, 'nzlxg', []);
        const values = Array.isArray(payload) ? payload : [];
        const credits = values.find(v => typeof v === 'number');
        return typeof credits === 'number' ? Math.trunc(credits) : 0;
    }

    public async createProject(ctx: FlowRequestContext, title: string): Promise<string> {
        const payload = await this.rpc(ctx, 'jHPbke', ['projects/*', [null, [title]], [null, 22]], { timeoutMs: 30_000 });
        const projectId = findUuid(payload);
        if (!projectId) throw new Error('Flow createProject response missing projectId');
        return projectId;
    }

    // --- Media --------------------------------------------------------------

    /** Resolve a media id (or video operation id) into its signed flow-content URL. */
    public async getMediaUrl(ctx: FlowRequestContext, mediaName: string, projectId?: string, operationId?: string): Promise<string> {
        const name = normalizeMediaName(mediaName);
        const operation = normalizeMediaName(operationId || '');
        const payload = await this.rpc(ctx, 'as29s', [operation || name], {
            projectId,
            sourcePath: projectId ? `/project/${projectId}/edit/${name}` : undefined,
        });
        return findFlowContentUrl(payload, 'video') || findFlowContentUrl(payload, 'image');
    }

    public async uploadImage(ctx: FlowRequestContext, projectId: string, buffer: Buffer, mimeType: string, recaptchaToken: string): Promise<string> {
        const normalizedMime = mimeType && mimeType.startsWith('image/') ? mimeType : 'image/png';
        const ext = normalizedMime.includes('png') ? 'png' : 'jpg';
        const payload = await this.rpc(ctx, 'maseQ', [
            projectContext(projectId, recaptchaToken),
            buffer.toString('base64'),
            normalizedMime,
            1,
            null,
            null,
            null,
            null,
            `antstudio_${randomUUID().replace(/-/g, '').slice(0, 12)}.${ext}`,
            null,
            upperUuid(),
            upperUuid(),
        ], { projectId, timeoutMs: 90_000 });

        const imageUrl = findFlowContentUrl(payload, 'image');
        const mediaId = imageUrl.match(/\/image\/([0-9a-f-]{36})/i)?.[1] || findUuid(payload, new Set([projectId.toLowerCase()]));
        if (!mediaId) throw new Error('Flow upload response missing mediaId');
        return mediaId;
    }

    // --- Image generation ---------------------------------------------------

    public async generateImage(
        ctx: FlowRequestContext,
        params: { projectId: string; prompt: string; modelName: string; aspectRatio: string; recaptchaToken: string; referenceMediaIds?: string[] },
    ): Promise<Array<{ mediaId: string; url: string }>> {
        const sessionId = upperUuid();
        const clientContext = projectContext(params.projectId, params.recaptchaToken);
        const references = (params.referenceMediaIds || []).filter(Boolean).map(id => [id, null, null, null, 1]);
        const request = [
            null,
            null,
            references.length > 0 ? references : null,
            randomSeed(),
            mapImageAspectRatio(params.aspectRatio),
            params.modelName,
            null,
            clientContext,
            [[[params.prompt]]],
            null,
            null,
            null,
            null,
            sessionId,
            upperUuid(),
        ];
        const payload = await this.rpc(ctx, 'ogiZ0b', [null, [request], 1, clientContext, [sessionId]], {
            projectId: params.projectId,
            timeoutMs: 120_000,
        });

        const items = Array.isArray(payload) && Array.isArray(payload[0]) ? payload[0] : [];
        const media: Array<{ mediaId: string; url: string }> = [];
        for (const item of items) {
            if (!Array.isArray(item) || item.length === 0) continue;
            const mediaId = String(item[0] ?? '').trim();
            const url = findFlowContentUrl(item, 'image');
            if (mediaId && url) media.push({ mediaId, url });
        }
        if (media.length === 0) throw new Error('Flow image RPC returned no downloadable media');
        return media;
    }

    /** Upscale an image. Returns a flow-content URL or a base64 encoded image. */
    public async upsampleImage(ctx: FlowRequestContext, projectId: string, mediaId: string, targetResolution: string, recaptchaToken: string): Promise<string> {
        // Page enum values: 1 = 2K, 2 = 4K
        const resolution = String(targetResolution).toUpperCase().includes('4K') ? 2 : 1;
        const payload = await this.rpc(ctx, 'SPrCad', [normalizeMediaName(mediaId), resolution, projectContext(projectId, recaptchaToken)], {
            projectId,
            timeoutMs: 300_000,
        });
        return findFlowContentUrl(payload, 'video') || findFlowContentUrl(payload, 'image') || findEncodedMedia(payload);
    }

    // --- Video generation ---------------------------------------------------

    public async generateVideo(
        ctx: FlowRequestContext,
        params: {
            projectId: string;
            prompt: string;
            modelKey: string;
            aspectRatio: string;
            recaptchaToken: string;
            mode: FlowVideoMode;
            referenceMediaIds?: string[];
            startMediaId?: string;
            endMediaId?: string;
            videoMediaId?: string;
            /** Upsample only: media name of the source video (third field of its jwpduf record) */
            sourceMediaName?: string;
            resolution?: string;
        },
    ): Promise<FlowVideoSubmission> {
        const promptMessage = [null, null, [[[String(params.prompt || '')]]]];
        const aspect = mapVideoAspectRatio(params.aspectRatio);
        const metadata = [null, null, null, null, upperUuid(), upperUuid()];
        const resolution = mapVideoResolution(params.resolution);
        const mediaRef = (id?: string) => [null, String(id || '').trim()];

        let rpcId: string;
        let request: unknown[];
        switch (params.mode) {
            case 'references':
                rpcId = 'MZZa6b';
                request = [promptMessage, (params.referenceMediaIds || []).filter(Boolean).map(mediaRef), params.modelKey, aspect, null, metadata, null, null, null, null, null, resolution];
                break;
            case 'start_end':
                rpcId = 'nprQif';
                request = [promptMessage, params.modelKey, aspect, null, mediaRef(params.startMediaId), mediaRef(params.endMediaId), metadata, null, null];
                break;
            case 'start':
                rpcId = 'eb1hJf';
                request = [promptMessage, params.modelKey, aspect, null, mediaRef(params.startMediaId), metadata, null, null, null, resolution];
                break;
            case 'extend':
                rpcId = 'fZytfe';
                request = [mediaRef(params.videoMediaId), promptMessage, params.modelKey, aspect, null, metadata, null, null];
                break;
            case 'upsample':
                // Layout captured from the flow.google.com UI (2026-10): no seed, a 5-field metadata
                // carrying the source video's media name, its own resolution enum and the upsampler key at [31]
                rpcId = 'p0UkFb';
                request = [
                    mediaRef(params.videoMediaId),
                    null,
                    aspect,
                    null,
                    [null, params.sourceMediaName || null, null, null, upperUuid()],
                    null,
                    mapUpsampleResolution(params.resolution),
                ];
                while (request.length < 31) request.push(null);
                request.push(params.modelKey);
                break;
            default:
                rpcId = 'YhhmEf';
                request = [promptMessage, params.modelKey, aspect, null, metadata, null, null, resolution];
        }

        const batch = params.mode === 'upsample' ? [upperUuid()] : [upperUuid(), 2];
        const payload = await this.rpc(ctx, rpcId, [[request], projectContext(params.projectId, params.recaptchaToken), batch], {
            projectId: params.projectId,
            timeoutMs: 120_000,
        });

        const videoUrl = findFlowContentUrl(payload, 'video');
        // Records normally carry the project id at [1]; fall back to any [uuid, ?, uuid] record
        let records = extractVideoRecords(payload, params.projectId);
        if (records.length === 0) records = extractVideoRecords(payload);
        const operations: FlowVideoOperation[] = records.map(record => ({
            name: String(record[0]),
            mediaName: isUuid(record[2]) ? String(record[2]) : String(record[0]),
            projectId: params.projectId,
            status: 'MEDIA_GENERATION_STATUS_ACTIVE',
        }));
        if (!videoUrl && operations.length === 0) {
            throw new Error(`Flow video RPC returned no generation operations (rpc=${rpcId}, payload=${JSON.stringify(payload).slice(0, 800)})`);
        }
        return { operations, videoUrl: videoUrl || undefined };
    }

    /** Poll the status of submitted video operations (jwpduf). */
    public async checkVideoStatus(ctx: FlowRequestContext, operations: FlowVideoOperation[]): Promise<FlowVideoOperation[]> {
        const ids = [...new Set(operations.map(o => o.name).filter(Boolean))];
        if (ids.length === 0) throw new Error('Video status check requires Flow operation ids');
        const projectId = operations[0]?.projectId || undefined;
        const payload = await this.rpc(ctx, 'jwpduf', [null, null, ids.map(id => [id])], { projectId, timeoutMs: 30_000 });

        const previous = new Map(operations.map(o => [o.name, o]));
        const result: FlowVideoOperation[] = extractVideoRecords(payload).map(record => {
            const name = String(record[0]);
            const prior = previous.get(name);
            const videoUrl = findFlowContentUrl(record, 'video');
            const errorCode = extractErrorCode(record);
            return {
                name,
                mediaName: isUuid(record[2]) ? String(record[2]) : (prior?.mediaName || name),
                projectId: record[1] != null ? String(record[1]) : (prior?.projectId || ''),
                status: videoUrl ? 'MEDIA_GENERATION_STATUS_SUCCESSFUL' : errorCode ? 'MEDIA_GENERATION_STATUS_FAILED' : 'MEDIA_GENERATION_STATUS_ACTIVE',
                videoUrl: videoUrl || undefined,
                errorCode: errorCode || undefined,
            };
        });

        if (result.length === 0) {
            const errorCode = extractErrorCode(payload);
            if (errorCode) {
                return operations.map(o => ({ ...o, status: 'MEDIA_GENERATION_STATUS_FAILED', errorCode }));
            }
            return operations;
        }

        // Records not yet marked successful: the signed URL may only be exposed via as29s.
        for (const op of result) {
            if (op.status !== 'MEDIA_GENERATION_STATUS_ACTIVE' || !op.mediaName) continue;
            try {
                const url = await this.getMediaUrl(ctx, op.mediaName, op.projectId || projectId, op.name);
                if (url.includes('/video/')) {
                    op.videoUrl = url;
                    op.status = 'MEDIA_GENERATION_STATUS_SUCCESSFUL';
                }
            } catch (err: any) {
                Logger.warn(`[FlowFrontendClient] media fallback failed for ${op.mediaName}: ${err.message}`);
            }
        }
        return result;
    }
}

export const flowFrontendClient = FlowFrontendClient.getInstance();
