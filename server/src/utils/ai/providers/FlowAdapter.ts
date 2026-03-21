import axios from 'axios';
import { IAIAccount, AIAccount } from '../../../models/AIAccount.js';
import { captchaService } from '../CaptchaService.js';
import { Logger } from '../../Logger.js';
import { v4 as uuidv4 } from 'uuid';
import { getFromS3 } from '~/utils/s3.js';
import { Readable } from 'stream';

export class FlowAdapter {
    private apiBaseUrl = 'https://aisandbox-pa.googleapis.com/v1';

    constructor() {}

    /**
     * Map common ratio strings to Google Flow enum values
     */
    private mapAspectRatio(type: 'image' | 'video', ratio: string): string {
        const cleanRatio = ratio.trim().toLowerCase();

        if (type === 'image') {
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
        } else {
            const videoMap: Record<string, string> = {
                '16:9': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                '9:16': 'VIDEO_ASPECT_RATIO_PORTRAIT',
                'landscape': 'VIDEO_ASPECT_RATIO_LANDSCAPE',
                'portrait': 'VIDEO_ASPECT_RATIO_PORTRAIT'
            };
            return videoMap[cleanRatio] || ratio;
        }
    }

    /**
     * Upload an image to Google Flow to get a mediaId
     */
    public async uploadMedia(account: IAIAccount, buffer: Buffer, mimeType: string, projectId: string): Promise<string> {
        const url = `${this.apiBaseUrl}/flow/uploadImage`;
        const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
        
        const headers = {
            'authorization': `Bearer ${account.flowAT}`,
            'Content-Type': 'application/json',
            'User-Agent': userAgent,
            'x-browser-channel': 'stable',
            'Referer': 'https://labs.google/fx/tools/flow',
            'Origin': 'https://labs.google',
        };

        const sessionId = Math.random().toString().slice(2, 17);
        const fileName = `upload_${Date.now()}.png`;

        const payload = {
            clientContext: {
                projectId: projectId,
                sessionId: sessionId,
                tool: 'PINHOLE'
            },
            fileName: fileName,
            imageBytes: buffer.toString('base64'),
            isHidden: false,
            isUserUploaded: true,
            mimeType: mimeType || 'image/png'
        };

        try {
            Logger.info(`[FlowAdapter] Uploading image to Flow... (${buffer.length} bytes)`);
            const response = await axios.post(url, payload, { headers });
            
            // Flow API returns media name in a nested object: data.media.name (UUID)
            // It needs to be converted to the full resource name format
            Logger.info(`[FlowAdapter] Image uploaded successfully. Response: ${JSON.stringify(response.data)}`);
            const mediaName = response.data.media?.name || response.data.name || response.data.mediaId;
            // const mediaId = mediaName?.startsWith('projects/') ? mediaName : `projects/${projectId}/media/${mediaName}`;
            if (!mediaName) {
                Logger.info(`[FlowAdapter] No media name in response. Data: ${JSON.stringify(response.data)}`);
                throw new Error('No mediaId returned from upload');
            }
            
            Logger.info(`[FlowAdapter] Image uploaded successfully. MediaId: ${mediaName}`);
            return mediaName;
        } catch (error: any) {
            const msg = error.response?.data?.error?.message || error.message;
            Logger.error(`[FlowAdapter] uploadMedia failed: ${msg}`);
            throw new Error(`Flow Upload Failed: ${msg}`);
        }
    }

    /**
     * Resolve media input: if it's a URL or base64, upload it first.
     */
    private async resolveMediaInput(account: IAIAccount, input: any, projectId: string): Promise<string> {
        const resolveToVeoImage = async (input: any) => {
            if (!input) return undefined;
            if (typeof input !== 'string') return input; // Already resolved or object

            try {
                let buffer: Buffer;
                let mimeType = 'image/png';

                if (input.startsWith('https://') || input.startsWith('http://')) {
                    const response = await axios.get(input, { responseType: 'arraybuffer' });
                    buffer = Buffer.from(response.data);
                    mimeType = response.headers['content-type'] || 'image/png';
                } else {
                    // Assume S3 Key
                    const s3Stream = await getFromS3(input) as Readable;
                    const chunks = [];
                    for await (const chunk of s3Stream) {
                        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
                    }
                    buffer = Buffer.concat(chunks);
                    
                    if (input.endsWith('.jpg') || input.endsWith('.jpeg')) mimeType = 'image/jpeg';
                    else if (input.endsWith('.webp')) mimeType = 'image/webp';
                }

                Logger.info(`[GeminiClient] Resolved image reference ${input} to ${buffer.length} bytes, mime: ${mimeType}`, 'GeminiClient');

                return {
                    imageBytes: buffer.toString('base64'),
                    mimeType
                };
            } catch (err: any) {
                Logger.warn(`[GeminiClient] Failed to resolve reference image ${input}: ${err.message}`, 'GeminiClient');
                return undefined;
            }
        };

        Logger.info(`[FlowAdapter] Resolving media input: ${input}`, 'FlowAdapter');

        // If it's already a Flow mediaId string (projects/.../media/...)
        if (typeof input === 'string' && input.startsWith('projects/') && input.includes('/media/')) {
            return input;
        }

        const data = await resolveToVeoImage(input);
        if (data) {
            const buffer = Buffer.from(data.imageBytes, 'base64');
            return await this.uploadMedia(account, buffer, data.mimeType, projectId);
        }

        return input;
        
        // // If it's already a Flow mediaId string (projects/.../media/...)
        // if (typeof input === 'string' && input.startsWith('projects/') && input.includes('/media/')) {
        //     return input;
        // }

        // const inputStr = typeof input === 'string' ? input : (input.url || input.data || input.mediaId);
        // if (!inputStr) throw new Error('Invalid media input');
        
        // if (inputStr.startsWith('projects/') && inputStr.includes('/media/')) return inputStr;

        // // Otherwise, download/get buffer and upload
        // const { getFileBuffer } = await import('../../AIGenerator.js');
        // const buffer = await getFileBuffer(inputStr);
        // let mimeType = inputStr.startsWith('data:') ? inputStr.split(';')[0].split(':')[1] : 'image/png';
        
        // // Improve mimeType for S3 keys
        // if (inputStr.endsWith('.jpg') || inputStr.endsWith('.jpeg')) mimeType = 'image/jpeg';
        // else if (inputStr.endsWith('.webp')) mimeType = 'image/webp';
        
        // return await this.uploadMedia(account, buffer, mimeType, projectId);
    }

    /**
     * Resolve model settings based on generic model ID and config
     */
    private resolveModelSettings(type: 'image' | 'video', modelId: string, config: any = {}) {
        const rawRatio = config.aspectRatio || (type === 'image' ? 'IMAGE_ASPECT_RATIO_LANDSCAPE' : 'VIDEO_ASPECT_RATIO_LANDSCAPE');
        const ratio = this.mapAspectRatio(type, rawRatio);
        
        // Better portrait detection: check if it's the PORTRAIT enum OR if the raw ratio is 9:16 or 3:4
        const isPortrait = ratio.includes('PORTRAIT') || 
                          rawRatio === '9:16' || 
                          rawRatio === '3:4' || 
                          modelId.includes('portrait');
        
        const imageCount = (config.imageInputs || config.referenceImages || []).length;

        if (type === 'image') {
            let imageModelName = 'IMAGEN_3_5';
            if (modelId.includes('gemini-2.5-flash')) imageModelName = 'GEM_PIX';
            else if (modelId.includes('gemini-3.0-pro') || modelId.includes('gemini-3-pro') || modelId.includes('gemini-3-pro-image')) imageModelName = 'GEM_PIX_2';
            else if (modelId.includes('imagen-4.0')) imageModelName = 'IMAGEN_3_5';
            else if (modelId.includes('gemini-3.1-flash') || modelId.includes('narwhal')) imageModelName = 'NARWHAL';

            let upsample = null;
            if (modelId.includes('-2k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_2K';
            else if (modelId.includes('-4k')) upsample = 'UPSAMPLE_IMAGE_RESOLUTION_4K';

            return { imageModelName, aspectRatio: ratio, upsample };
        } else {
            // Video mapping
            let videoType: 't2v' | 'i2v' | 'r2v' = 't2v';
            
            // Collect all potential images
            const images = config.imageInputs || config.referenceImages || [];
            const hasStartEnd = !!(config.imageStart || config.imageEnd || config.image);
            const hasCharacters = !!(config.characterImages && config.characterImages.length > 0);

            // Prioritize R2V for aidol/influencer character consistency or when mixing characters with start/end
            if (hasCharacters || (images.length > 0)) {
                videoType = 'r2v';
            } else if (hasStartEnd || images.length >= 1) {
                // Default to I2V if we have few images and no specific character references
                videoType = (config.mode === 'r2v') ? 'r2v' : 'i2v';
            }

            let prefix = 'veo_3_1';
            if(modelId.includes('veo-3.0')){
                prefix = "veo_3_0";
            }
            else if(modelId.includes('veo-3.1')){
                prefix = "veo_3_1";
            }
            else if(modelId.includes('veo-2.0')){
                prefix = "veo_2_0";
            }
            else if(modelId.includes('veo-2.1')){
                prefix = "veo_2_1";
            }

            let videoModelKey = `${prefix}_t2v_fast_landscape`;
            // Handle Veo 2.0 or 2.1 specific overrides
            if (prefix === 'veo_2_0') {
                if (videoType === 't2v') {
                    videoModelKey = isPortrait ? `${prefix}_t2v_portrait` : `${prefix}_t2v_landscape`;
                } else if (videoType === 'i2v') {
                    videoModelKey = isPortrait ? `${prefix}_i2v_portrait` : `${prefix}_i2v_landscape`;
                }
            } else if (prefix === 'veo_2_1') {
                if (videoType === 't2v') {
                    videoModelKey = isPortrait ? `${prefix}_fast_d_15_t2v_portrait` : `${prefix}_fast_d_15_t2v_landscape`;
                } else if (videoType === 'i2v') {
                    videoModelKey = isPortrait ? `${prefix}_fast_d_15_i2v_portrait` : `${prefix}_fast_d_15_i2v_landscape`;
                }
            } else {//3.0/3.1
                if (videoType === 't2v') {
                    videoModelKey = isPortrait ? `${prefix}_t2v_fast_portrait` : `${prefix}_t2v_fast_landscape`;
                } else if (videoType === 'i2v') {
                    videoModelKey = isPortrait ? `${prefix}_i2v_s_fast_portrait_fl` : `${prefix}_i2v_s_fast_fl`;
                } else if (videoType === 'r2v') {
                    videoModelKey = isPortrait ?    `${prefix}_r2v_fast_portrait` : `${prefix}_r2v_fast`;
                }
            }

            return { videoModelKey, aspectRatio: ratio, videoType };
        }
    }

    private getSessionId(){
        return ';' + new Date().getTime();
    }

    /**
     * Generate image using Google Flow
     */
    public async generateImage(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        const { flowSyncService } = await import('../FlowSyncService.js');
        try {
            // await flowSyncService.refreshAccountTokens(account);
            // Reload fresh account from DB to use the newly saved token
            const freshAccount = await AIAccount.findById((account as any)._id);
            if (freshAccount && freshAccount.flowAT) {
                account = freshAccount;
            }
        } catch (refreshErr: any) {
            Logger.warn(`[FlowAdapter] Token refresh failed, using existing token: ${refreshErr.message}`);
        }
        
        if (!account.flowAT) {
            await flowSyncService.refreshAccountTokens(account);
            // throw new Error('Flow Access Token (AT) is missing for this account');
        }

        let projectId = account.projectId || config.projectId;
        if (!projectId) {
            Logger.info(`[FlowAdapter] Project ID missing for ${account.email}, attempting to resolve...`);
            projectId = await flowSyncService.ensureProject(account);
        }

        // 1. Resolve inputs (upload if necessary)
        const imageInputs = [];
        if (config.imageInputs && config.imageInputs.length > 0) {
            for (const img of config.imageInputs) {
                const mediaId = await this.resolveMediaInput(account, img, projectId);
                imageInputs.push({
                    name: mediaId,
                    imageInputType: 'IMAGE_INPUT_TYPE_REFERENCE'
                });
            }
        }

        // 2. Resolve model settings
        const settings = this.resolveModelSettings('image', modelName, { ...config, imageInputs });
        Logger.info(`[FlowAdapter] Resolved model settings: ${JSON.stringify(settings)}`);

        let retry = 5;
        while(retry > 0){
            try{
                // 3. Get reCAPTCHA token
                const recaptchaToken = await captchaService.solve({
                    projectId: projectId,
                    action: 'IMAGE_GENERATION',
                    tokenId: (account as any)._id
                });

                if (!recaptchaToken) {
                    throw new Error('Failed to obtain reCAPTCHA token for Flow generation');
                }

                // 4. Prepare request
                const sessionId = this.getSessionId();//Math.random().toString().slice(2, 17);
                const url = `${this.apiBaseUrl}/projects/${projectId}/flowMedia:batchGenerateImages`;
                const clientContext = {
                    recaptchaContext: {
                        token: recaptchaToken,
                        applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB"
                    },
                    sessionId: sessionId,
                    projectId: projectId,
                    tool: 'PINHOLE'
                };

                const requestData: any = {
                    clientContext: clientContext,
                    seed: Math.floor(Math.random() * 99999) + 1,
                    imageModelName: settings.imageModelName,
                    imageAspectRatio: settings.aspectRatio,
                    structuredPrompt: {
                        parts: [{
                            text: prompt
                        }]
                    },
                };

                if (imageInputs.length > 0) {
                    requestData.imageInputs = imageInputs;
                }

                const payload: any = {
                    clientContext: clientContext,
                    mediaGenerationContext: {
                        batchId: uuidv4()
                    },
                    useNewMedia: true,
                    requests: [requestData]
                };

                if (settings.upsample) {
                    payload.requests[0].upsampleImageResolution = settings.upsample;
                }

                const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
                const headers: any = {
                    'authorization': `Bearer ${account.flowAT}`,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent,
                    'x-browser-channel': 'stable',
                    'Referer': 'https://labs.google/fx/tools/flow',
                    'Origin': 'https://labs.google',
                };

                if (account.lastFingerprint) {
                    const fp = account.lastFingerprint;
                    if (fp.get('sec_ch_ua')) headers['sec-ch-ua'] = fp.get('sec_ch_ua');
                    if (fp.get('sec_ch_ua_mobile')) headers['sec-ch-ua-mobile'] = fp.get('sec_ch_ua_mobile');
                    if (fp.get('sec_ch_ua_platform')) headers['sec-ch-ua-platform'] = fp.get('sec_ch_ua_platform');
                    if (fp.get('accept_language')) headers['Accept-Language'] = fp.get('accept_language');
                }

                Logger.info(`[FlowAdapter] [generateImage] targetURL: ${url}`);

                const response = await axios.post(url, payload, { headers });
            
                // Search for image in the response payload
                // Google may return it in `data.media`, `data.results`, or `data.requests[0].media`
                let imageBytes = null;
                let fifeUrl = null;

                if (response.data.media?.[0]?.image?.imageBytes) {
                    imageBytes = response.data.media[0].image.imageBytes;
                } else if (response.data.results?.[0]?.image?.imageBytes) {
                    imageBytes = response.data.results[0].image.imageBytes;
                } else if (response.data.media?.[0]?.image?.generatedImage?.fifeUrl) {
                    fifeUrl = response.data.media[0].image.generatedImage.fifeUrl;
                }

                // Ignore reCAPTCHA evaluation failed
                retry = 0;

                if (imageBytes) {
                    return {
                        buffer: Buffer.from(imageBytes, 'base64'),
                        mimeType: 'image/png'
                    };
                }

                if (fifeUrl) {
                    return {
                        url: fifeUrl,
                        mimeType: 'image/jpeg'
                    };
                }

                const mediaName = response.data.media?.[0]?.name || response.data.name;
                if (mediaName && mediaName.includes('operations/')) {
                    Logger.info(`[FlowAdapter] Image generation is async, polling operation: ${mediaName}`);
                    return await this.pollMedia(account, projectId, mediaName, 'image');
                }

                Logger.error(`[FlowAdapter] Response did not contain inline image bytes or operation: ${JSON.stringify(response.data).substring(0, 300)}...`);
                throw new Error('Flow API Error: No image returned from generation');
            }catch(error: any){
                const msg = error.response?.data?.error?.message || error.message;
                // Logger.error(`[FlowAdapter] generateImage failed: ${msg}`);
                if(msg != "reCAPTCHA evaluation failed"){
                    throw new Error(`Flow Image Generation Failed: ${msg}`);
                }
                Logger.info(`[FlowAdapter] reCAPTCHA evaluation failed. Retrying...`);
                retry--;
            }
        }
        return null;
    }

    /**
     * Generate video using Google Flow (Veo)
     */
    public async generateVideo(account: IAIAccount, prompt: string, modelName: string, config: any = {}) {
        const { flowSyncService } = await import('../FlowSyncService.js');
        try {
            // await flowSyncService.refreshAccountTokens(account);
            // Reload fresh account from DB to use the newly saved token
            const freshAccount = await AIAccount.findById((account as any)._id);
            if (freshAccount && freshAccount.flowAT) {
                account = freshAccount;
            }
        } catch (refreshErr: any) {
            Logger.warn(`[FlowAdapter] Token refresh failed, using existing token: ${refreshErr.message}`);
        }
        
        if (!account.flowAT) {
            await flowSyncService.refreshAccountTokens(account);
        }

        let projectId = account.projectId || config.projectId;
        if (!projectId) {
            Logger.info(`[FlowAdapter] Project ID missing for ${account.email}, attempting to resolve...`);
            projectId = await flowSyncService.ensureProject(account);
        }

        // 1. Resolve inputs (upload if necessary)
        // Combine all potential sources into a unified reference pool
        const rawImages = [
            ...(config.imageInputs || []),
            ...(config.referenceImages || []),
            ...(config.characterImages || []),
            ...(config.characterReferences || []),
            config.imageStart,
            config.imageEnd,
            config.image
        ].filter(img => !!img);

        // Deduplicate and resolve
        const uniqueImages = [...new Set(rawImages)];
        const resolvedMediaIds = [];
        for (const img of uniqueImages.slice(0, 3)) { // API Limit is 3
            resolvedMediaIds.push(await this.resolveMediaInput(account, img, projectId));
        }

        // 2. Resolve model settings
        const settings = this.resolveModelSettings('video', modelName, { ...config, imageInputs: resolvedMediaIds });

        let retry = 5;
        while(retry > 0){
            try{
                // 3. Get reCAPTCHA token
                const recaptchaToken = await captchaService.solve({
                    projectId: projectId,
                    action: 'VIDEO_GENERATION',
                    tokenId: (account as any)._id
                });

                if (!recaptchaToken) {
                    throw new Error('Failed to obtain reCAPTCHA token for Flow generation');
                }

                // 4. Prepare request
                const sessionId = this.getSessionId();//Math.random().toString().slice(2, 17);
                const sceneId = uuidv4();
                
                // Select URL based on video type and image count
                let url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoText`;
                if (settings.videoType === 'i2v') {
                    if (resolvedMediaIds.length === 1) {
                        url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoStartImage`;
                    } else {
                        url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoStartAndEndImage`;
                    }
                } else if (settings.videoType === 'r2v') {
                    url = `${this.apiBaseUrl}/video:batchAsyncGenerateVideoReferenceImages`;
                }

                const clientContext = {
                    recaptchaContext: {
                        token: recaptchaToken,
                        applicationType: "RECAPTCHA_APPLICATION_TYPE_WEB"
                    },
                    sessionId: sessionId,
                    projectId: projectId,
                    tool: 'PINHOLE',
                    userPaygateTier: config.userPaygateTier || "PAYGATE_TIER_ZERO" //"PAYGATE_TIER_ONE" || "PAYGATE_TIER_ZERO"
                };

                const requests: any = {
                    aspectRatio: settings.aspectRatio,
                    seed: Math.floor(Math.random() * 99999) + 1,
                    textInput: {
                        structuredPrompt: {
                            parts: [{
                                text: prompt
                            }]
                        }
                    },
                    // textInput: {
                    //     prompt: prompt
                    // },
                    startImage: undefined,
                    endImage: undefined,
                    referenceImages: undefined,
                    videoModelKey: settings.videoModelKey,
                    metadata: {
                        sceneId: sceneId
                    }
                };

                if (settings.videoType === 'i2v') {
                    requests.startImage = resolvedMediaIds[0] ? { mediaId: resolvedMediaIds[0] } : undefined;
                    requests.endImage = resolvedMediaIds[1] ? { mediaId: resolvedMediaIds[1] } : undefined;
                } else if (settings.videoType === 'r2v') {
                    if(resolvedMediaIds.length > 0){
                        requests.referenceImages = resolvedMediaIds.map(id => ({
                            mediaId: id,
                            imageUsageType: 'IMAGE_USAGE_TYPE_ASSET'
                        }));
                    }
                }

                const payload: any = {
                    clientContext: clientContext,
                    requests: [requests],
                    useV2ModelConfig: true,
                    mediaGenerationContext: {
                        batchId: uuidv4()
                    }
                };

                const userAgent = account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36';
                const headers: any = {
                    'authorization': `Bearer ${account.flowAT}`,
                    'Content-Type': 'application/json',
                    'User-Agent': userAgent,
                    'x-browser-channel': 'stable',
                    'Referer': 'https://labs.google/fx/tools/flow',
                    'Origin': 'https://labs.google',
                };

                // Add fingerprint headers if available
                if (account.lastFingerprint) {
                    const fp = account.lastFingerprint;
                    if (fp.get('sec_ch_ua')) headers['sec-ch-ua'] = fp.get('sec_ch_ua');
                    if (fp.get('sec_ch_ua_mobile')) headers['sec-ch-ua-mobile'] = fp.get('sec_ch_ua_mobile');
                    if (fp.get('sec_ch_ua_platform')) headers['sec-ch-ua-platform'] = fp.get('sec_ch_ua_platform');
                }

                Logger.info(`[FlowAdapter] [generateVideo] targetURL: ${url}`);
                // Logger.info(`[FlowAdapter] [generateVideo] payload: ${JSON.stringify(payload, null, 2)}`);
                const response = await axios.post(url, payload, { headers });
                
                const mediaName = response.data.name || 
                                response.data.operation?.name || 
                                response.data.results?.[0]?.name ||
                                response.data.media?.[0]?.name;

                if (!mediaName) {
                    Logger.info(`[FlowAdapter] [generateVideo] No mediaName. Full response: ${JSON.stringify(response.data)}`);
                    throw new Error('Flow API Error: No operation name returned');
                }

                Logger.info(`[FlowAdapter] Generation submitted. Operation: ${mediaName}`);

                if (config.async !== false) {
                    return { jobId: mediaName, status: 'pending' };
                }

                //ignore reCAPTCHA evaluation failed
                retry = 0;

                return await this.pollMedia(account, projectId, mediaName, 'video');
            }catch(error: any){
                const msg = error.response?.data?.error?.message || error.message;
                // Logger.error(`[FlowAdapter] generateVideo failed: ${msg}`, 'FlowAdapter', error.response?.data);
                if(msg.includes("Resource has been exhausted")){
                    await flowSyncService.refreshAccountTokens(account);
                }
                if(msg != "reCAPTCHA evaluation failed"){
                    throw new Error(`Flow Video Generation Failed: ${msg}`);
                }
                Logger.info(`[FlowAdapter] reCAPTCHA evaluation failed. Retrying...`);
                retry--;
            }
        }
        return null;
    }

    /**
     * Poll for media generation results
     */
    private async pollMedia(account: IAIAccount, projectId: string, mediaName: string, type: 'image' | 'video'): Promise<any> {
        const url = type === 'video' 
            ? `${this.apiBaseUrl}/video:batchCheckAsyncVideoGenerationStatus`
            : `${this.apiBaseUrl}/projects/${projectId}/${mediaName}`;

        const headers = {
            'Authorization': `Bearer ${account.flowAT}`,
            'User-Agent': account.lastFingerprint?.get('user_agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
            'Origin': 'https://labs.google',
            'Referer': 'https://labs.google/fx/tools/flow',
        };

        const maxPolls = 18; // 3 minutes
        let pollCount = 0;
        let results = null;

        while (pollCount < maxPolls) {
            try {
                if (type === 'video') {
                    const payload = {
                        operations: [{ operation: { name: mediaName } }] // FIXED PAYLOAD FORMAT
                    };
                    const response = await axios.post(url, payload, { headers });
                    Logger.info(`[FlowAdapter] [pollMedia] response: ${JSON.stringify(response.data)}`);
                    const opResult = response.data.operations?.[0]?.operation || {};
                    const status = response.data.operations?.[0]?.status || "";

                    if(status === 'MEDIA_GENERATION_STATUS_ACTIVE'){
                        //continue polling
                    }
                    else if(status === 'MEDIA_GENERATION_STATUS_FAILED'){
                        throw new Error(opResult.error?.message || 'Video generation failed');
                    }
                    else if(status === 'MEDIA_GENERATION_STATUS_SUCCESSFUL'){
                        const videoUri = opResult.metadata?.video?.fifeUrl;// || opResult.response?.media?.[0]?.video?.uri;
                        if (videoUri) {
                            Logger.info(`[FlowAdapter] Video completed: ${mediaName}`);
                            results = { url: videoUri, mimeType: 'video/mp4' };
                        }
                        break
                    }
                    // if (opResult.status) {
                    //     if (opResult.error) throw new Error(opResult.error.message || 'Video generation failed');
                        
                    //     const videoUri = opResult.response?.video?.uri || opResult.response?.media?.[0]?.video?.uri;
                    //     if (videoUri) {
                    //         Logger.info(`[FlowAdapter] Video completed: ${mediaName}`);
                    //         return { url: videoUri, mimeType: 'video/mp4' };
                    //     }
                    // }
                } else {
                    const response = await axios.get(url, { headers });
                    const data = response.data;

                    if (data.done || data.state === 'SUCCEEDED') {
                        const result = data.media?.[0] || data.results?.[0] || data.response?.results?.[0];
                        if (result?.image?.imageBytes) {
                            results = { buffer: Buffer.from(result.image.imageBytes, 'base64'), mimeType: 'image/png' };
                        }
                        if (result?.image?.generatedImage?.fifeUrl) {
                            results = { url: result.image.generatedImage.fifeUrl, mimeType: 'image/jpeg' };
                        }
                        break;
                    }
                    if (data.error || (data.state === 'FAILED')) throw new Error(data.error?.message || 'Generation failed');
                }
            } catch (err: any) {
                Logger.warn(`[FlowAdapter] Polling attempt ${pollCount + 1} failed: ${err.message}`);
                break
            }

            pollCount++;
            await new Promise(resolve => setTimeout(resolve, 10000));
        }
        if(results){
            return results;
        }
        throw new Error(`${type} generation failed.`);
    }
}

export const flowAdapter = new FlowAdapter();
