import axios from 'axios';
import { Readable } from 'stream';
import { IAIAccount } from '../../../models/AIAccount.js';
import { AIModelType } from '~/models/AdminSettings.js';
import { getFromS3 } from '~/utils/s3.js';
import { captchaService } from '../CaptchaService.js';
import { flowSyncService, flowRequestContext, FLOW_FRONTEND_ACCESS_TOKEN } from '../FlowSyncService.js';
import {
    flowFrontendClient, flowBrowserHeaders, FlowRpcError, FlowVideoMode, FlowVideoOperation, FlowVideoSubmission,
    FLOW_ORIGIN, FLOW_DEFAULT_USER_AGENT, FLOW_OPERATION_ID_PATTERN
} from './FlowFrontendClient.js';
import { Logger } from '../../Logger.js';

/**
 * Google Flow adapter (flow.google.com).
 *
 * The old Labs tRPC / aisandbox-pa REST endpoints are retired; every call goes through the Flow
 * frontend batchexecute RPCs (see FlowFrontendClient), authenticated by the account's Google
 * cookies (`account.flowST`). Ported from openvideo/apps/shine (FlowAdapter) without its external
 * "Flow Worker" fast path.
 */

/**
 * Image model keys sent in ogiZ0b, captured from the flow.google.com UI (2026-10).
 * NARWHAL and IMAGEN_3_5 now answer NOT_FOUND.
 */
const FLOW_IMAGE_MODELS = {
    pro: 'GEM_PIX_2',       // Nano Banana Pro
    lite: 'HARBOR_SEAL',    // Nano Banana 2 Lite
    standard: 'BELUGA',     // Nano Banana 2.1 (Flow's default, 0 credits)
};
/** Used when the requested model answers NOT_FOUND */
const FALLBACK_IMAGE_MODEL = FLOW_IMAGE_MODELS.standard;
/** How long a model that answered NOT_FOUND is skipped before being tried again */
const UNAVAILABLE_MODEL_TTL_MS = 6 * 60 * 60 * 1000;

export interface FlowOmniVideoOptions {
    aspectRatio?: string;
    durationSeconds?: number;
    referenceImages?: any[];
    resolution?: string;
    async?: boolean;
}

type FlowVideoParams = {
    prompt: string;
    modelKey: string;
    aspectRatio: string;
    mode: FlowVideoMode;
    referenceMediaIds?: string[];
    startMediaId?: string;
    endMediaId?: string;
    videoMediaId?: string;
    sourceMediaName?: string;
    resolution?: string;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class FlowAdapter {
    private unavailableImageModels = new Map<string, number>();

    /** reCAPTCHA rejections are transient and worth retrying with a fresh token */
    private isRetryableCaptchaError(msg: string): boolean {
        return /recaptcha|UNUSUAL_ACTIVITY/i.test(msg || '');
    }

    /** Error message plus the Flow RPC code (e.g. PUBLIC_ERROR_UNUSUAL_ACTIVITY), which the retry checks match on */
    private errorText(error: any): string {
        const message = error?.message || String(error);
        return error instanceof FlowRpcError && error.code && !message.includes(error.code) ? `${message} (${error.code})` : message;
    }

    /** UNUSUAL_ACTIVITY_TOO_MUCH_TRAFFIC means the account is being rate limited: back off longer */
    private captchaRetryDelayMs(msg: string): number {
        return /TOO_MUCH_TRAFFIC/i.test(msg || '') ? 20_000 : 5_000;
    }

    /** Expired cookies: try cookies an admin pasted since this account was loaded, once per request */
    private async recoverFromAuthError(account: IAIAccount, error: unknown, alreadyTried: boolean): Promise<boolean> {
        if (alreadyTried || !(error instanceof FlowRpcError && error.isAuthError)) return false;
        return flowSyncService.recoverAccountCookies(account);
    }

    /** gRPC NOT_FOUND: unknown model key, media id or project */
    private isNotFoundError(error: unknown): boolean {
        return error instanceof FlowRpcError && error.isNotFound;
    }

    /**
     * reCAPTCHA scores a token against the browser that solved it; the solver must use the same
     * User-Agent as the Flow requests or Google answers PUBLIC_ERROR_UNUSUAL_ACTIVITY.
     */
    private captchaUserAgent(account: IAIAccount): string {
        return flowRequestContext(account).userAgent || FLOW_DEFAULT_USER_AGENT;
    }

    private async solveCaptcha(account: IAIAccount, projectId: string, action: 'IMAGE_GENERATION' | 'VIDEO_GENERATION' | 'UPLOAD_IMAGE'): Promise<string> {
        const token = await captchaService.solve({
            projectId,
            action,
            tokenId: String(account._id),
            userAgent: this.captchaUserAgent(account)
        });
        if (!token) throw new Error(`Failed to obtain reCAPTCHA token for Flow (${action})`);
        return token;
    }

    private resolveAvailableImageModel(model: string): string {
        const until = this.unavailableImageModels.get(model);
        if (until && until > Date.now()) {
            return FALLBACK_IMAGE_MODEL;
        }
        this.unavailableImageModels.delete(model);
        return model;
    }

    /**
     * Map common ratio strings to Google Flow enum values
     */
    private mapAspectRatio(type: AIModelType.IMAGE | AIModelType.VIDEO, ratio: string): string {
        const cleanRatio = ratio.trim().toLowerCase();

        if (type === AIModelType.IMAGE) {
            const imageMap: Record<string, string> = {
                '16:9': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
                '9:16': 'IMAGE_ASPECT_RATIO_PORTRAIT',
                '1:1': 'IMAGE_ASPECT_RATIO_SQUARE',
                '4:3': 'IMAGE_ASPECT_RATIO_LANDSCAPE_FOUR_THREE',
                '3:4': 'IMAGE_ASPECT_RATIO_PORTRAIT_THREE_FOUR',
                'landscape': 'IMAGE_ASPECT_RATIO_LANDSCAPE',
                'portrait': 'IMAGE_ASPECT_RATIO_PORTRAIT',
                'square': 'IMAGE_ASPECT_RATIO_SQUARE'
            };
            return imageMap[cleanRatio] || ratio; // Fallback to original if already enum or unknown
        }
        const videoMap: Record<string, string> = {
            '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
            '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
            'landscape': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
            'portrait': 'VIDEO_ASPECT_RATIO_PORTRAIT'
        };
        return videoMap[cleanRatio] || ratio;
    }

    /**
     * Upload an image to Google Flow to get a mediaId
     */
    public async uploadMedia(account: IAIAccount, buffer: Buffer, mimeType: string, projectId: string): Promise<string> {
        try {
            Logger.info(`[FlowAdapter] Uploading media to Flow... (${buffer.length} bytes, mime: ${mimeType})`);
            const recaptchaToken = await this.solveCaptcha(account, projectId, 'UPLOAD_IMAGE');
            return await flowFrontendClient.uploadImage(flowRequestContext(account), projectId, buffer, mimeType, recaptchaToken);
        } catch (error: any) {
            Logger.error(`[FlowAdapter] uploadMedia failed: ${error.message}`);
            throw new Error(`Flow Upload Failed: ${error.message}`);
        }
    }

    /** Bytes and mime type of a URL, data URI or storage key. */
    private async loadMedia(input: string): Promise<{ buffer: Buffer; mimeType: string } | undefined> {
        try {
            if (input.startsWith('https://') || input.startsWith('http://')) {
                const response = await axios.get(input, { responseType: 'arraybuffer', timeout: 60_000 });
                return { buffer: Buffer.from(response.data), mimeType: String(response.headers['content-type'] || 'image/png') };
            }
            if (input.startsWith('data:')) {
                const [header, data] = input.split(',');
                return { buffer: Buffer.from(data, 'base64'), mimeType: header.split(':')[1].split(';')[0] };
            }
            // Storage key
            const stream = await getFromS3(input) as Readable;
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
                chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
            }
            let mimeType = 'image/png';
            if (input.endsWith('.jpg') || input.endsWith('.jpeg')) mimeType = 'image/jpeg';
            else if (input.endsWith('.webp')) mimeType = 'image/webp';
            else if (input.endsWith('.mp4')) mimeType = 'video/mp4';
            return { buffer: Buffer.concat(chunks), mimeType };
        } catch (err: any) {
            Logger.warn(`[FlowAdapter] Failed to resolve reference media: ${err.message}`, 'FlowAdapter');
            return undefined;
        }
    }

    /**
     * Resolve media input to a Flow media id: reuse Flow ids / URLs, upload anything else.
     */
    private async resolveMediaInput(account: IAIAccount, input: any, projectId: string): Promise<string> {
        if (typeof input !== 'string') return input;

        // Legacy Flow media name (projects/.../media/...)
        if (input.startsWith('projects/') && input.includes('/media/')) {
            return input.split('/media/')[1];
        }

        // Media generated by Flow: a signed flow-content URL or a bare media id is reused as-is.
        // Extend / upsample require the source video's Flow media id, it cannot be re-uploaded.
        const flowContentId = input.match(new RegExp(`^https://flow-content\\.google/(?:image|video)/(${FLOW_OPERATION_ID_PATTERN})`, 'i'))?.[1];
        if (flowContentId) return flowContentId;
        if (new RegExp(`^${FLOW_OPERATION_ID_PATTERN}$`, 'i').test(input)) return input;

        const media = await this.loadMedia(input);
        if (media) {
            return this.uploadMedia(account, media.buffer, media.mimeType, projectId);
        }
        return input;
    }

    /**
     * Resolve model settings based on generic model ID and config
     */
    private resolveModelSettings(type: AIModelType.IMAGE | AIModelType.VIDEO, modelId: string, config: any = {}) {
        const rawRatio = config.aspectRatio || (type === AIModelType.IMAGE ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' : 'VIDEO_ASPECT_RATIO_LANDSCAPE');
        const ratio = this.mapAspectRatio(type, rawRatio);

        const isPortrait = ratio.includes('PORTRAIT') ||
                          rawRatio === '9:16' ||
                          rawRatio === '3:4' ||
                          modelId.includes('portrait');

        if (type === AIModelType.IMAGE) {
            // Flow no longer serves Imagen or NARWHAL; gemini-2.5 / 3.1 / imagen requests use the standard model
            let imageModelName = FLOW_IMAGE_MODELS.standard;
            if (modelId.includes('lite')) imageModelName = FLOW_IMAGE_MODELS.lite;
            else if (modelId.includes('gemini-3.0-pro') || modelId.includes('gemini-3-pro')) imageModelName = FLOW_IMAGE_MODELS.pro;

            let upsample: string | null = null;
            if (modelId.includes('-2k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_2K';
            else if (modelId.includes('-4k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_4K';

            return { imageModelName, aspectRatio: ratio, upsample } as any;
        }

        // Video mapping
        let videoType: 't2v' | 'i2v' | 'r2v' | 'extend' | 'upsample' = 't2v';

        const images = config.imageInputs || config.referenceImages || [];
        const hasStart = (config.imageStart || config.image);
        const hasStartEnd = (hasStart && config.imageEnd);
        const hasCharacters = !!(config.characterImages?.length || config.characterReferences?.length);

        let prefix = 'veo_3_1';
        if (modelId.includes('veo-3.0')) prefix = 'veo_3_0';
        else if (modelId.includes('veo-3.1')) prefix = 'veo_3_1';
        else if (modelId.includes('veo-2.0')) prefix = 'veo_2_0';
        else if (modelId.includes('veo-2.1')) prefix = 'veo_2_1';

        if (config.mode === 'extend' || config.videoType === 'extend' || modelId.includes('extend')) {
            videoType = 'extend';
        } else if (config.mode === 'upsample' || config.videoType === 'upsample' || modelId.includes('upsample') || modelId.includes('upsampler')) {
            videoType = 'upsample';
        } else if (hasStartEnd || (hasStart && !hasCharacters)) {
            videoType = 'i2v';
        } else if (hasCharacters || images.length > 0) {
            videoType = 'r2v';
        }

        let videoModelKey = `${prefix}_t2v_fast_landscape`;
        if (videoType === 'extend') {
            videoModelKey = isPortrait ? `${prefix}_extend_portrait` : `${prefix}_extend_landscape`;
        } else if (videoType === 'upsample') {
            // 1080p by default: 4K upscale needs a higher Flow tier than PRO (it shows "Upgrade" in the UI)
            const resolution = config.resolution || 'VIDEO_RESOLUTION_1080P';
            videoModelKey = String(resolution).toUpperCase().includes('4K') ? `${prefix}_upsampler_4k` : `${prefix}_upsampler_1080p`;
        } else if (prefix === 'veo_2_0') {
            if (videoType === 't2v') videoModelKey = isPortrait ? `${prefix}_t2v_portrait` : `${prefix}_t2v_landscape`;
            else if (videoType === 'i2v') videoModelKey = isPortrait ? `${prefix}_i2v_portrait` : `${prefix}_i2v_landscape`;
        } else if (prefix === 'veo_2_1') {
            if (videoType === 't2v') videoModelKey = isPortrait ? `${prefix}_fast_d_15_t2v_portrait` : `${prefix}_fast_d_15_t2v_landscape`;
            else if (videoType === 'i2v') videoModelKey = isPortrait ? `${prefix}_fast_d_15_i2v_portrait` : `${prefix}_fast_d_15_i2v_landscape`;
        } else { // 3.0 / 3.1
            if (videoType === 't2v') videoModelKey = isPortrait ? `${prefix}_t2v_fast_portrait` : `${prefix}_t2v_fast`;
            else if (videoType === 'i2v') videoModelKey = isPortrait ? `${prefix}_i2v_s_fast_portrait_fl` : `${prefix}_i2v_s_fast_fl`;
            else if (videoType === 'r2v') videoModelKey = isPortrait ? `${prefix}_r2v_fast_portrait` : `${prefix}_r2v_fast_landscape`;
        }

        return { videoModelKey, aspectRatio: ratio, videoType, resolution: config.resolution || 'VIDEO_RESOLUTION_1080P' };
    }

    /**
     * Make sure the account's cookies were validated on flow.google.com (accounts stored by the
     * legacy Labs flow were not) and that it has a Flow project.
     */
    private async prepareAccount(account: IAIAccount, config: any = {}): Promise<string> {
        try {
            if (account.flowAT !== FLOW_FRONTEND_ACCESS_TOKEN) {
                await flowSyncService.refreshAccountTokens(account);
            }
            if (!account.projectId) {
                account.projectId = config.projectId || await flowSyncService.ensureProject(account);
            }
        } catch (err: any) {
            Logger.warn(`[FlowAdapter] Account preparation failed, using existing cookies: ${err.message}`);
        }
        if (!account.projectId) throw new Error('Flow Project ID not found');
        return account.projectId;
    }

    private async createFlowProject(account: IAIAccount, projectId: string): Promise<string> {
        Logger.warn(`[FlowAdapter] Project ${projectId} not found. Creating fresh project on flow.google.com...`);
        try {
            return await flowSyncService.createNewProject(account);
        } catch (pErr: any) {
            throw new Error(`Flow project creation failed: ${pErr.message}`);
        }
    }

    /**
     * Signed flow-content URLs expire and need the browser identity, so keep the bytes when we can
     * (AIServiceManager would otherwise refetch the URL without these headers).
     */
    private async downloadMedia(url: string, account: IAIAccount, kind: 'image' | 'video'): Promise<Buffer | undefined> {
        try {
            const res = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: kind === 'video' ? 180_000 : 60_000,
                headers: {
                    ...flowBrowserHeaders(flowRequestContext(account)),
                    'Accept': kind === 'video' ? '*/*' : 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                    'Referer': `${FLOW_ORIGIN}/`,
                    'sec-fetch-dest': kind,
                    'sec-fetch-mode': 'cors',
                    'sec-fetch-site': 'same-origin',
                },
            });
            return Buffer.from(res.data);
        } catch (err: any) {
            Logger.warn(`[FlowAdapter] Failed to download Flow ${kind}, returning URL only: ${err.message}`);
            return undefined;
        }
    }

    /**
     * Upscale a generated image (SPrCad). Returns a URL or base64 bytes, or null to keep the base resolution.
     */
    private async upsampleImage(account: IAIAccount, projectId: string, mediaId: string, resolution: string): Promise<string | null> {
        const ctx = flowRequestContext(account);
        const maxAttempts = 4;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                const token = await this.solveCaptcha(account, projectId, 'IMAGE_GENERATION');
                return await flowFrontendClient.upsampleImage(ctx, projectId, mediaId, resolution, token) || null;
            } catch (err: any) {
                if (attempt < maxAttempts && this.isRetryableCaptchaError(err.message)) {
                    Logger.info(`[FlowAdapter] Upsample reCAPTCHA rejected (${err.message}), retrying in ${this.captchaRetryDelayMs(err.message) / 1000}s...`);
                    await sleep(this.captchaRetryDelayMs(err.message));
                    continue;
                }
                Logger.warn(`[FlowAdapter] Image upsample failed, returning base resolution: ${err.message}`);
                return null;
            }
        }
        return null;
    }

    /**
     * Generate image using Google Flow
     */
    public async generateImage(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        let projectId = await this.prepareAccount(account, config);

        // 1. Resolve reference images (upload if necessary)
        const referenceMediaIds: string[] = [];
        const refInputs = [...(config.imageInputs || []), ...(config.referenceImages || [])].filter(Boolean);
        for (const img of refInputs) {
            referenceMediaIds.push(await this.resolveMediaInput(account, img, projectId));
        }

        // 2. Resolve model settings
        const settings: any = this.resolveModelSettings(AIModelType.IMAGE, modelName || '', { ...config, imageInputs: referenceMediaIds });
        Logger.info(`[FlowAdapter] Resolved image settings: ${JSON.stringify(settings)}`);

        let ctx = flowRequestContext(account);
        let authRecovered = false;
        let imageModel = this.resolveAvailableImageModel(settings.imageModelName);
        // Model that answered NOT_FOUND; only blacklisted once the fallback proves the project is fine
        let suspectedUnavailableModel: string | undefined;
        let projectRecreated = false;
        let lastError: unknown;
        for (let attempt = 1; attempt <= 5; attempt++) {
            try {
                const recaptchaToken = await this.solveCaptcha(account, projectId, 'IMAGE_GENERATION');

                Logger.info(`[FlowAdapter] [generateImage] rpc=ogiZ0b project=${projectId} model=${imageModel}`);
                const media = await flowFrontendClient.generateImage(ctx, {
                    projectId,
                    prompt,
                    modelName: imageModel,
                    aspectRatio: settings.aspectRatio,
                    recaptchaToken,
                    referenceMediaIds,
                });

                let url = media[0].url;
                let buffer: Buffer | undefined;

                // Optional upscale (SPrCad)
                if (settings.upsample) {
                    const upsampled = await this.upsampleImage(account, projectId, media[0].mediaId, settings.upsample);
                    if (upsampled?.startsWith('https://')) {
                        url = upsampled;
                    } else if (upsampled) {
                        buffer = Buffer.from(upsampled, 'base64');
                    }
                }

                if (suspectedUnavailableModel) {
                    this.unavailableImageModels.set(suspectedUnavailableModel, Date.now() + UNAVAILABLE_MODEL_TTL_MS);
                }

                buffer = buffer || await this.downloadMedia(url, account, 'image');
                return { buffer, url, mediaId: media[0].mediaId, mimeType: 'image/jpeg' };
            } catch (error: any) {
                lastError = error;
                const msg = this.errorText(error);
                if (await this.recoverFromAuthError(account, error, authRecovered)) {
                    authRecovered = true;
                    ctx = flowRequestContext(account);
                    continue;
                }
                if (this.isNotFoundError(error)) {
                    // NOT_FOUND on ogiZ0b mostly means the model key is not served. Fall back to a
                    // known-good model before suspecting the project.
                    if (imageModel !== FALLBACK_IMAGE_MODEL) {
                        Logger.warn(`[FlowAdapter] Image model ${imageModel} answered NOT_FOUND, retrying with ${FALLBACK_IMAGE_MODEL}`);
                        suspectedUnavailableModel = imageModel;
                        imageModel = FALLBACK_IMAGE_MODEL;
                        continue;
                    }
                    if (!projectRecreated && referenceMediaIds.length === 0) {
                        projectRecreated = true;
                        // The project was the problem, not the requested model
                        if (suspectedUnavailableModel) imageModel = suspectedUnavailableModel;
                        suspectedUnavailableModel = undefined;
                        projectId = await this.createFlowProject(account, projectId);
                        continue;
                    }
                }
                if (!this.isRetryableCaptchaError(msg) || attempt >= 5) {
                    throw new Error(`Flow Image Generation Failed: ${msg}`);
                }
                Logger.info(`[FlowAdapter] reCAPTCHA rejected (${msg}). Retrying in ${this.captchaRetryDelayMs(msg) / 1000}s...`);
                await sleep(this.captchaRetryDelayMs(msg));
            }
        }
        throw new Error(`Flow Image Generation Failed: ${(lastError as any)?.message || 'retries exhausted'}`);
    }

    /**
     * Submit a video RPC with reCAPTCHA / project-recovery retries and wait for the result.
     */
    private async submitVideo(account: IAIAccount, projectId: string, params: FlowVideoParams, options: { async?: boolean; label: string }): Promise<any> {
        let ctx = flowRequestContext(account);
        let authRecovered = false;
        const hasMediaInputs = !!(params.referenceMediaIds?.length || params.startMediaId || params.videoMediaId);
        let projectRecreated = false;
        let lastError: unknown;
        let submission: FlowVideoSubmission | undefined;

        // Retries cover the submission only: once Flow accepted the job, resubmitting would spend credits twice
        for (let attempt = 1; attempt <= 5 && !submission; attempt++) {
            try {
                const recaptchaToken = await this.solveCaptcha(account, projectId, 'VIDEO_GENERATION');
                Logger.info(`[FlowAdapter] [${options.label}] mode=${params.mode} model=${params.modelKey} project=${projectId}`);
                submission = await flowFrontendClient.generateVideo(ctx, { ...params, projectId, recaptchaToken });
            } catch (error: any) {
                lastError = error;
                const msg = this.errorText(error);
                if (await this.recoverFromAuthError(account, error, authRecovered)) {
                    authRecovered = true;
                    ctx = flowRequestContext(account);
                    continue;
                }
                // Media ids belong to the current project, so a fresh project cannot help those requests
                if (this.isNotFoundError(error) && !projectRecreated && !hasMediaInputs) {
                    projectRecreated = true;
                    projectId = await this.createFlowProject(account, projectId);
                    continue;
                }
                if (msg.includes('MODEL_ACCESS_DENIED') || !this.isRetryableCaptchaError(msg) || attempt >= 5) {
                    throw new Error(`Flow Video Generation Failed: ${msg}`);
                }
                Logger.info(`[FlowAdapter] reCAPTCHA rejected (${msg}). Retrying in ${this.captchaRetryDelayMs(msg) / 1000}s...`);
                await sleep(this.captchaRetryDelayMs(msg));
            }
        }
        if (!submission) {
            throw new Error(`Flow Video Generation Failed: ${(lastError as any)?.message || 'retries exhausted'}`);
        }

        if (submission.videoUrl) {
            const mediaId = submission.videoUrl.match(new RegExp(`/video/(${FLOW_OPERATION_ID_PATTERN})`, 'i'))?.[1];
            return { url: submission.videoUrl, mediaId, mimeType: 'video/mp4', buffer: await this.downloadMedia(submission.videoUrl, account, 'video') };
        }

        const operationName = submission.operations[0].name;
        Logger.info(`[FlowAdapter] Generation submitted. Operation: ${operationName}`);

        if (options.async === true) {
            return { jobId: operationName, status: 'pending' };
        }

        // Upscaling runs much longer than generation (up to ~30 minutes)
        return this.pollVideo(account, submission.operations, params.mode === 'upsample' ? 180 : 18);
    }

    /**
     * Generate video using Google Flow (Veo)
     */
    public async generateVideo(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        modelName = modelName || '';
        const rawImages = [
            ...(config.imageInputs || []),
            ...(config.referenceImages || []),
            ...(config.characterImages || []),
            ...(config.characterReferences || []),
            config.imageStart,
            config.imageEnd,
            config.image
        ].filter(Boolean);

        // Omni Flash (model family "abra")
        if (modelName.toLowerCase().includes('omni') || modelName.toLowerCase().includes('abra')) {
            return this.generateOmniVideo(account, prompt, {
                aspectRatio: config.aspectRatio,
                durationSeconds: config.durationSeconds || config.duration,
                referenceImages: rawImages,
                resolution: config.resolution,
                async: config.async,
            });
        }

        const projectId = await this.prepareAccount(account, config);

        // Source video for extend / upsample
        const sourceVideo = config.videoInput || config.referenceVideo || config.video;
        const videoMediaId = sourceVideo ? await this.resolveMediaInput(account, sourceVideo, projectId) : undefined;

        const settings: any = this.resolveModelSettings(AIModelType.VIDEO, modelName, { ...config, imageInputs: rawImages });
        Logger.info(`[FlowAdapter] generateVideo settings: ${JSON.stringify(settings)}`);

        // Map the video type to a Flow frontend RPC mode and upload only the images that mode uses.
        // Start / end frames are taken from their own fields, never from their position in rawImages.
        let mode: FlowVideoMode = 'text';
        let startMediaId: string | undefined;
        let endMediaId: string | undefined;
        const referenceMediaIds: string[] = [];
        if (settings.videoType === 'i2v') {
            const startInput = config.imageStart || config.image || rawImages[0];
            if (!startInput) throw new Error('Image-to-video requires a start frame (imageStart)');
            startMediaId = await this.resolveMediaInput(account, startInput, projectId);
            if (config.imageEnd) {
                endMediaId = await this.resolveMediaInput(account, config.imageEnd, projectId);
            }
            mode = endMediaId ? 'start_end' : 'start';
        } else if (settings.videoType === 'r2v') {
            for (const img of [...new Set(rawImages)].slice(0, 3)) { // Flow limits references to 3
                referenceMediaIds.push(await this.resolveMediaInput(account, img, projectId));
            }
            mode = 'references';
        } else if (settings.videoType === 'extend' || settings.videoType === 'upsample') {
            if (!videoMediaId) {
                throw new Error(`${settings.videoType === 'extend' ? 'Extend' : 'Upsample'} mode requires a source video reference (videoInput, referenceVideo, or video)`);
            }
            mode = settings.videoType;
        }

        const sourceMediaName = mode === 'upsample' && videoMediaId
            ? await this.resolveVideoMediaName(account, projectId, videoMediaId)
            : undefined;

        return this.submitVideo(account, projectId, {
            prompt: mode === 'upsample' ? '' : prompt,
            modelKey: settings.videoModelKey,
            aspectRatio: settings.aspectRatio,
            mode,
            referenceMediaIds: mode === 'references' ? referenceMediaIds : undefined,
            startMediaId,
            endMediaId,
            videoMediaId,
            sourceMediaName,
            resolution: mode === 'upsample' ? settings.resolution : undefined,
        }, { async: config.async, label: 'generateVideo' });
    }

    /**
     * A finished video is addressed by its generation (operation) id, but p0UkFb also wants the
     * media name, which only the jwpduf status record exposes ([operationId, projectId, mediaName]).
     */
    private async resolveVideoMediaName(account: IAIAccount, projectId: string, videoMediaId: string): Promise<string | undefined> {
        try {
            const [record] = await flowFrontendClient.checkVideoStatus(flowRequestContext(account), [{
                name: videoMediaId,
                mediaName: '',
                projectId,
                status: 'MEDIA_GENERATION_STATUS_ACTIVE',
            }]);
            const mediaName = record?.mediaName && record.mediaName !== videoMediaId ? record.mediaName : undefined;
            Logger.info(`[FlowAdapter] Upsample source ${videoMediaId} -> mediaName=${mediaName || '(none)'}`);
            return mediaName;
        } catch (err: any) {
            Logger.warn(`[FlowAdapter] Could not resolve media name of ${videoMediaId}: ${err.message}`);
            return undefined;
        }
    }

    /**
     * Omni Flash video generation (model family "abra").
     * Text-only prompts use YhhmEf + abra_t2v_{n}s, reference images use MZZa6b + abra_r2v_{n}s.
     */
    public async generateOmniVideo(account: IAIAccount, prompt: string, options: FlowOmniVideoOptions): Promise<any> {
        const projectId = await this.prepareAccount(account, options);

        const uniqueImages = [...new Set((options.referenceImages || []).filter(Boolean))];
        const resolvedMediaIds: string[] = [];
        for (const img of uniqueImages.slice(0, 3)) { // Flow limits to 3 references
            resolvedMediaIds.push(await this.resolveMediaInput(account, img, projectId));
        }

        // Flow supports 4/6/8/10 second Omni clips; snap to the nearest one
        const requested = Number(options.durationSeconds) || 8;
        const seconds = [4, 6, 8, 10].reduce((best, s) => Math.abs(s - requested) < Math.abs(best - requested) ? s : best, 8);
        const hasReferences = resolvedMediaIds.length > 0;
        const modelKey = hasReferences ? `abra_r2v_${seconds}s` : `abra_t2v_${seconds}s`;
        const aspectRatio = this.mapAspectRatio(AIModelType.VIDEO, options.aspectRatio || 'VIDEO_ASPECT_RATIO_LANDSCAPE');

        return this.submitVideo(account, projectId, {
            prompt,
            modelKey,
            aspectRatio,
            mode: hasReferences ? 'references' : 'text',
            referenceMediaIds: resolvedMediaIds,
        }, { async: options.async, label: 'generateOmniVideo' });
    }

    /**
     * Poll video operations (jwpduf) until a signed video URL is available
     */
    private async pollVideo(account: IAIAccount, operations: FlowVideoOperation[], maxPolls = 18): Promise<any> {
        let ctx = flowRequestContext(account);
        let authRecovered = false;
        // maxPolls x 10s: 18 = 3 minutes
        let current = operations;

        await sleep(5000);

        for (let pollCount = 0; pollCount < maxPolls; pollCount++) {
            try {
                current = await flowFrontendClient.checkVideoStatus(ctx, current);
                Logger.info(`[FlowAdapter] [pollVideo] [${pollCount + 1}/${maxPolls}] status=${current[0]?.status}`);
                const done = current.find(op => op.status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL' && op.videoUrl);
                if (done) {
                    let url = done.videoUrl!;
                    // Upscaled videos come back without a signature; as29s exchanges the id for a signed URL
                    if (!url.includes('?')) {
                        try {
                            url = await flowFrontendClient.getMediaUrl(ctx, done.name, done.projectId || undefined, done.name) || url;
                        } catch (err: any) {
                            Logger.warn(`[FlowAdapter] Could not sign video URL for ${done.name}: ${err.message}`);
                        }
                    }
                    Logger.info(`[FlowAdapter] Video completed: ${done.name}`);
                    // The operation id doubles as the Flow media id used by extend / upsample
                    return { url, mediaId: done.name, mimeType: 'video/mp4', buffer: await this.downloadMedia(url, account, 'video') };
                }
                const failed = current.find(op => op.status === 'MEDIA_GENERATION_STATUS_FAILED');
                if (failed && current.every(op => op.status === 'MEDIA_GENERATION_STATUS_FAILED')) {
                    throw new Error(`Video generation failed: ${failed.errorCode || 'unknown error'}`);
                }
            } catch (err: any) {
                // Cookies rotated while the job runs: keep polling the same job with the fresh copy
                if (await this.recoverFromAuthError(account, err, authRecovered)) {
                    authRecovered = true;
                    ctx = flowRequestContext(account);
                    continue;
                }
                if (err.message?.includes('Video generation failed') || (err instanceof FlowRpcError && err.isAuthError)) {
                    throw err;
                }
                Logger.warn(`[FlowAdapter] Polling attempt ${pollCount + 1} notice: ${err.message}`);
            }

            await sleep(10000);
        }
        throw new Error('Flow video generation timed out');
    }

    /**
     * Resolve the signed flow-content URL of a generated media (as29s)
     */
    public async getMediaUrlRedirect(account: IAIAccount, mediaName: string, projectId?: string): Promise<string | null> {
        const normalizedMediaName = (mediaName || '').trim();
        if (!normalizedMediaName) return null;
        try {
            const url = await flowFrontendClient.getMediaUrl(flowRequestContext(account), normalizedMediaName, projectId || account.projectId);
            return url || null;
        } catch (err: any) {
            Logger.warn(`[FlowAdapter] getMediaUrlRedirect failed for ${mediaName}: ${err.message}`);
            return null;
        }
    }

    /**
     * Text generation through Flow is no longer available: the aisandbox-pa `flow:generateContent`
     * endpoint was retired with the move to flow.google.com. Callers fall back to other providers.
     */
    public async generateContent(): Promise<string | null> {
        throw new Error('Flow generateContent Failed: text generation is not available on flow.google.com');
    }
}

export const flowAdapter = new FlowAdapter();
