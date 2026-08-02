import { GoogleGenAI, Modality, FileState } from '@google/genai';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { AIAccountProvider, AIAccountType, IAIAccount } from '~/models/AIAccount.js';
import { geminiPool } from '~/utils/gemini.js';
import { aiAccountManager } from '~/utils/ai/AIAccountManager.js';
import { CloudCodeClient } from './CloudCodeClient.js';
import { AntigravityClient } from './AntigravityClient.js';
import { OpenAIClient } from './OpenAIClient.js';
import { AIModelType, getAdminSettings } from '~/models/AdminSettings.js';
import { Logger } from '~/utils/Logger.js';
import { getFromS3 } from '~/utils/s3.js';
import { Readable } from 'stream';
import { EnvConfig } from '~/utils/ConfigService.js'

/**
 * GeminiClient: Unified client for all Google Gemini tasks.
 * Abstracts away the difference between API Key Pool and AI Accounts.
 */
export class GeminiClient {
    private apiKey?: string;
    private account?: IAIAccount;
    private serviceAccount?: string | Record<string, any>;
    private googleGenAI?: GoogleGenAI;

    private static instance?: GeminiClient;

    public static getInstance(): GeminiClient {
        if (!GeminiClient.instance) {
            GeminiClient.instance = new GeminiClient();
        }
        return GeminiClient.instance;
    }

    /**
     * @param options Provide apiKey, account, or serviceAccount
     */
    constructor(options?: { apiKey?: string; account?: IAIAccount; serviceAccount?: string | Record<string, any>; keyFilename?: string }) {
        this.apiKey = options?.apiKey;
        this.account = options?.account;
        this.serviceAccount = options?.serviceAccount || options?.keyFilename;

        if (this.serviceAccount) {
            this.setupServiceAccount(this.serviceAccount);
        } else if (this.apiKey) {
            this.googleGenAI = new GoogleGenAI({ apiKey: this.apiKey });
        } else if (GeminiClient.detectADC()) {
            this.setupADC();
        }
    }

    private setupServiceAccount(serviceAccount: string | Record<string, any>) {
        let projectId: string | undefined;
        let location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

        if (typeof serviceAccount === 'object' && serviceAccount !== null) {
            projectId = (serviceAccount as any).project_id;
            try {
                const tempPath = path.join(os.tmpdir(), `gcp_sa_${Date.now()}.json`);
                fs.writeFileSync(tempPath, JSON.stringify(serviceAccount, null, 2));
                process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
            } catch (e) {
                Logger.warn('[GeminiClient] Failed to write temporary serviceAccount file', 'GeminiClient');
            }
        } else if (typeof serviceAccount === 'string') {
            const trimmed = serviceAccount.trim();
            if (trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    projectId = parsed.project_id;
                    const tempPath = path.join(os.tmpdir(), `gcp_sa_${Date.now()}.json`);
                    fs.writeFileSync(tempPath, JSON.stringify(parsed, null, 2));
                    process.env.GOOGLE_APPLICATION_CREDENTIALS = tempPath;
                } catch (e) {
                    Logger.warn('[GeminiClient] Failed to parse serviceAccount JSON string', 'GeminiClient');
                }
            } else if (fs.existsSync(trimmed)) {
                const resolvedPath = path.resolve(trimmed);
                process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath;
                try {
                    const content = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
                    if (content.project_id) projectId = content.project_id;
                } catch (e) {}
            }
        }

        if (!projectId) {
            projectId = process.env.GOOGLE_CLOUD_PROJECT;
        }

        if (projectId) {
            try {
                this.googleGenAI = new GoogleGenAI({ vertexai: true, project: projectId, location });
                Logger.info(`[GeminiClient] Initialized GoogleGenAI with Service Account for project ${projectId}`, 'GeminiClient');
            } catch (e: any) {
                Logger.warn(`[GeminiClient] Failed to initialize GoogleGenAI with Service Account: ${e.message}`, 'GeminiClient');
            }
        }
    }

    private setupADC() {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        if (projectId) {
            try {
                this.googleGenAI = new GoogleGenAI({ vertexai: true, project: projectId, location });
                Logger.info(`[GeminiClient] Initialized GoogleGenAI with Application Default Credentials for project ${projectId}`, 'GeminiClient');
            } catch (e: any) {
                Logger.warn(`[GeminiClient] Failed to initialize GoogleGenAI with ADC: ${e.message}`, 'GeminiClient');
            }
        }
    }

    private parseVertexParams(baseUrl?: string) {
        let project: string | undefined;
        let location: string | undefined;
        if (baseUrl) {
            const projectMatch = baseUrl.match(/\/projects\/([^/]+)/);
            if (projectMatch) {
                project = projectMatch[1];
            }
            const locationMatch = baseUrl.match(/\/locations\/([^/]+)/);
            if (locationMatch) {
                location = locationMatch[1];
            } else {
                const subdomainMatch = baseUrl.match(/https?:\/\/([^.]+)-aiplatform/);
                if (subdomainMatch) {
                    location = subdomainMatch[1];
                }
            }
        }
        return { project, location };
    }

    private static detectADC(): boolean {
        let credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        if (credPath) {
            try {
                const filename = path.basename(credPath);
                const possiblePaths = [
                    credPath,
                    path.resolve(process.cwd(), credPath),
                    path.resolve(process.cwd(), '..', credPath),
                    path.resolve(process.cwd(), '..', filename),
                    path.resolve(process.cwd(), filename)
                ];
                for (const p of possiblePaths) {
                    if (fs.existsSync(p)) {
                        process.env.GOOGLE_APPLICATION_CREDENTIALS = p;
                        return true;
                    }
                }
            } catch (e) {}
        }
        
        try {
            let defaultPath = '';
            if (process.platform === 'win32') {
                if (process.env.APPDATA) {
                    defaultPath = path.join(process.env.APPDATA, 'gcloud/application_default_credentials.json');
                }
            } else {
                const home = os.homedir();
                if (home) {
                    defaultPath = path.join(home, '.config/gcloud/application_default_credentials.json');
                }
            }
            if (defaultPath && fs.existsSync(defaultPath)) {
                return true;
            }
        } catch (e) {}
        
        if (process.env.K_SERVICE || process.env.GAE_SERVICE || process.env.CLOUD_RUN_JOB) {
            return true;
        }
        
        return false;
    }

    private async getGoogleGenAI(apiKey: string, baseUrl?: string): Promise<GoogleGenAI> {
        return new GoogleGenAI({ apiKey });
    }

    private async getClientInstance(cred: any): Promise<GoogleGenAI> {
        if (cred.googleGenAI) return cred.googleGenAI;

        const apiKey = cred.apiKey || cred.provider?.apiKey || cred.account?.serviceKeys?.get('apiKey');
        const baseUrl = cred.provider?.baseUrl || cred.account?.serviceKeys?.get('baseUrl');

        if (cred.type === AIAccountProvider.GOOGLE_VERTEX) {
            const { project: parsedProject, location: parsedLocation } = this.parseVertexParams(baseUrl);
            const project = parsedProject || process.env.GOOGLE_CLOUD_PROJECT || undefined;
            let location = parsedLocation || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            if (!location || location === 'global') {
                location = 'us-central1';
            }
            const hasADC = GeminiClient.detectADC();

            const clientOptions: any = {};
            if (project && location && hasADC) {
                clientOptions.vertexai = true;
                clientOptions.project = project;
                clientOptions.location = location;
                Logger.info(`[GeminiClient] Initializing Vertex AI client with ADC. Project: ${project}, Location: ${location}`, 'GeminiClient');

                const oldGeminiKey = process.env.GEMINI_API_KEY;
                const oldGoogleKey = process.env.GOOGLE_API_KEY;
                delete process.env.GEMINI_API_KEY;
                delete process.env.GOOGLE_API_KEY;

                try {
                    return new GoogleGenAI(clientOptions);
                } finally {
                    if (oldGeminiKey) process.env.GEMINI_API_KEY = oldGeminiKey;
                    if (oldGoogleKey) process.env.GOOGLE_API_KEY = oldGoogleKey;
                }
            } else {
                if (apiKey) {
                    clientOptions.apiKey = apiKey;
                    Logger.info('[GeminiClient] Initializing AI Studio client with apiKey (fallback from Vertex config).', 'GeminiClient');
                } else {
                    clientOptions.vertexai = true;
                    if (project) clientOptions.project = project;
                    if (location) clientOptions.location = location;
                    Logger.info('[GeminiClient] Initializing Vertex AI client without apiKey (no ADC or API key found).', 'GeminiClient');
                }
                return new GoogleGenAI(clientOptions);
            }
        }

        if (cred.type === 'apikey' && apiKey) {
            return await this.getGoogleGenAI(apiKey, baseUrl);
        }

        const initOptions: any = {};
        if (apiKey) initOptions.apiKey = apiKey;
        return new GoogleGenAI(initOptions);
    }


    /**
     * Build an ordered chain of credential sources to try:
     * 1. Antigravity accounts (quota-aware)
     * 2. Standard Google OAuth accounts (quota-aware)
     * 3. API Key pool
     * 
     * If the caller provided an explicit account or apiKey, only that is used.
     */
    private async resolveCredentialsChain(modality: AIModelType): Promise<Array<{ type: AIAccountType; account?: IAIAccount; apiKey?: string; googleGenAI?: GoogleGenAI; provider?: any, keyFile?: string }>> {
        const chain: Array<{ type: AIAccountType; account?: IAIAccount; apiKey?: string; googleGenAI?: GoogleGenAI; provider?: any }> = [];

        // If caller provided explicit credentials, use only those
        // if (this.account) {
        //     const t = this.account.accountType === 'antigravity' ? 'antigravity' as const : 'standard' as const;
        //     chain.push({ type: t, account: this.account });
        //     return chain;
        // }
        let types = [];
        if(modality == AIModelType.TEXT){
            types = [AIAccountType.ANTIGRAVITY, AIAccountType.GOOGLE_VERTEX, AIAccountType.STANDARD, AIAccountType.OPENAI, AIAccountType.CUSTOM, AIAccountType.API_KEY];
        }
        else if(modality == AIModelType.MUSIC){
            types = [AIAccountType.GOOGLE_VERTEX, AIAccountType.OPENAI, AIAccountType.CUSTOM, AIAccountType.API_KEY];
        }
        else if(modality == AIModelType.VOICE){
            types = [AIAccountType.GOOGLE_VERTEX, AIAccountType.API_KEY];
        }
        else if(modality == AIModelType.AUDIO){
            types = [AIAccountType.GOOGLE_VERTEX, AIAccountType.OPENAI, AIAccountType.CUSTOM, AIAccountType.API_KEY];
        }
        else{
            types = [AIAccountType.GOOGLE_VERTEX, AIAccountType.OPENAI, AIAccountType.CUSTOM, AIAccountType.API_KEY];
        }

        // Auto-resolve: build full chain from account pool
        // Step 1: Antigravity accounts
        if(types.includes(AIAccountType.ANTIGRAVITY)){
            const antigravityAccount = await aiAccountManager.getOptimalAccount(modality, AIAccountType.ANTIGRAVITY);
            if (antigravityAccount) {
                chain.push({ type: AIAccountType.ANTIGRAVITY, account: antigravityAccount });
            }
        }

        // Step 2: Standard Google OAuth accounts
        if(types.includes(AIAccountType.STANDARD)){
            const standardAccount = await aiAccountManager.getOptimalAccount(modality, 'standard');
            if (standardAccount) {
                chain.push({ type: AIAccountType.STANDARD, account: standardAccount });
            }
        }

        if(types.includes(AIAccountType.GOOGLE_VERTEX) || types.includes(AIAccountType.OPENAI) || types.includes(AIAccountType.CUSTOM)){
            const settings = await getAdminSettings();
            if (settings?.aiSettings?.providers) {
                for (const p of settings.aiSettings.providers) {
                    if (p.isActive && p.supportedTypes.includes(modality)) {
                        if (p.id === AIAccountType.GOOGLE_VERTEX || p.id.includes(AIAccountType.GOOGLE_CLOUD)) {
                            if(p.supportedTypes.includes(modality)){
                                const ai = await this.getClientInstance({ type: AIAccountType.GOOGLE_VERTEX, provider: p });
                                chain.push({ type: AIAccountType.GOOGLE_VERTEX, provider: p, googleGenAI: ai });
                            }
                        } else if (p.id === AIAccountType.OPENAI || p.id === AIAccountType.CUSTOM || p.baseUrl) {
                            if(p.supportedTypes.includes(modality)){
                                chain.push({ type: p.id === AIAccountType.OPENAI ? AIAccountType.OPENAI : AIAccountType.CUSTOM, provider: p });
                            }
                        }
                    }
                }
            }
        }
        
        if(types.includes(AIAccountType.API_KEY)){
            if (this.apiKey) {
                const ai = await this.getClientInstance({ type: AIAccountType.API_KEY, apiKey: this.apiKey });
                chain.push({ type: AIAccountType.API_KEY, apiKey: this.apiKey, googleGenAI: ai });
            }
            
            // Step 3: API Key pool
            try {
                const { key } = await geminiPool.getOptimalClient();
                if (key) {
                    const ai = await this.getClientInstance({ type: AIAccountType.API_KEY, apiKey: key });
                    chain.push({ type: AIAccountType.API_KEY, apiKey: key, googleGenAI: ai });
                }
            } catch (e) {
                // No API keys available
            }
        }

        if (this.googleGenAI && !chain.some(c => c.googleGenAI === this.googleGenAI)) {
            chain.push({ type: AIAccountType.GOOGLE_VERTEX, googleGenAI: this.googleGenAI });
        } else if (chain.length === 0 && GeminiClient.detectADC()) {
            const project = process.env.GOOGLE_CLOUD_PROJECT;
            const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
            if (project) {
                try {
                    const ai = new GoogleGenAI({ vertexai: true, project, location });
                    chain.push({ type: AIAccountType.GOOGLE_VERTEX, googleGenAI: ai });
                } catch (e) {}
            }
        }

        return chain;
    }

    /**
     * Generate Text / Multimodal Content
     * Fallback chain: Antigravity → Standard Google → API Key
     */
    public async generateContent(prompt: string | any[], modelId: string = EnvConfig.geminiModelTextAnalysis, options: any = {}) {
        const chain = await this.resolveCredentialsChain(AIModelType.TEXT);
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if (cred.type === AIAccountType.ANTIGRAVITY && cred.account) {
                    const client = new AntigravityClient(cred.account);
                    return await client.generateContent(prompt, modelId, options);
                }

                if (cred.type === AIAccountType.STANDARD && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.generateContent(prompt, modelId, options);
                }

                if ((cred.type === AIAccountType.API_KEY || cred.type === AIAccountType.GOOGLE_VERTEX) && cred.googleGenAI) {
                    const parts: any[] = Array.isArray(prompt) ? prompt : [{ text: String(prompt) }];
                    
                    if (options.image) {
                        parts.push({
                            inlineData: {
                                data: Buffer.isBuffer(options.image) ? options.image.toString('base64') : options.image,
                                mimeType: options.mimeType || 'image/png'
                            }
                        });
                    }

                    const response = await (cred.googleGenAI as any).models.generateContent({
                        model: modelId,
                        contents: [{ role: 'user', parts }],
                        config: {
                            systemInstruction: options.systemPrompt ? { parts: [{ text: options.systemPrompt }] } : undefined,
                            tools: options.grounding ? [{ googleSearch: {} }] : options.tools,
                            maxOutputTokens: options.maxTokens || 4096,
                            temperature: options.temperature ?? 0.7,
                            ...options.generationConfig,
                            thinkingConfig: options.thinkingConfig,
                        }
                    });

                    if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);
                    
                    return {
                        text: response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || '',
                        usage: response.usageMetadata
                    };
                }

                if ((cred.type === AIAccountType.OPENAI || cred.type === AIAccountType.CUSTOM) && (cred.account || cred.provider)) {
                    const client = new OpenAIClient({
                        apiKey: cred.provider?.apiKey || cred.account?.serviceKeys?.get('apiKey') || '',
                        baseUrl: cred.provider?.baseUrl || cred.account?.serviceKeys?.get('baseUrl')
                    });
                    return await client.generateContent(prompt, modelId, options);
                }
            } catch (error: any) {
                const label = cred.type === AIAccountType.API_KEY ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateContent failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateContent: ${errors.join(' | ')}`);
    }

    /**
     * Generate Image
     * Fallback chain: Antigravity → Standard Google → API Key
     * API Key path supports:
     * - Gemini native image models (gemini-*-image) → generateContent() with responseModalities: ['IMAGE']
     * - Imagen dedicated models (imagen-*) → generateImages() dedicated API
     */
    public async generateImage(prompt: string, modelId: string = EnvConfig.geminiModelImageGeneration, options: any = {}): Promise<{ url: string; mimeType: string } | null> {
        try{
            const chain = await this.resolveCredentialsChain(AIModelType.IMAGE);
            const errors: string[] = [];

            for (const cred of chain) {
                try {
                    if (cred.type === AIAccountType.ANTIGRAVITY && cred.account) {
                        const client = new AntigravityClient(cred.account);
                        const result = await client.generateImage(prompt, modelId);
                        return { url: result.url, mimeType: 'image/png' };
                    }

                    if (cred.type === AIAccountType.STANDARD && cred.account) {
                        const client = new CloudCodeClient(cred.account);
                        const result = await client.generateImage(prompt, modelId) as any;
                        return {
                            url: result.media?.url || result.url,
                            mimeType: result.media?.mimeType || result.mimeType || 'image/png'
                        };
                    }

                    if ((cred.type === AIAccountType.API_KEY || cred.type === AIAccountType.GOOGLE_VERTEX) && cred.googleGenAI) {
                        const isImagenModel = modelId.startsWith('imagen-');

                        if (isImagenModel) {
                            Logger.info(`[GeminiClient] Using generateImages() for Imagen model: ${modelId}`, 'GeminiClient');
                            const response = await (cred.googleGenAI as any).models.generateImages({
                                model: modelId,
                                prompt: prompt,
                                config: {
                                    numberOfImages: 1,
                                    outputMimeType: 'image/png',
                                    aspectRatio: options.aspectRatio || '1:1',
                                    ...options.parameters
                                }
                            });
                            if (response.generatedImages?.length > 0) {
                                const img = response.generatedImages[0];
                                return { url: `data:image/png;base64,${img.image.imageBytes}`, mimeType: 'image/png' };
                            }
                            throw new Error('No images returned from Imagen API');
                        } else {
                            Logger.info(`[GeminiClient] Using generateContent() for Gemini image model: ${modelId}`, 'GeminiClient');
                            const parts = Array.isArray(prompt) ? prompt : [{ text: String(prompt) }];
                            const response = await (cred.googleGenAI as any).models.generateContent({
                                model: modelId,
                                contents: [{ role: 'user', parts }],
                                config: { responseModalities: ['IMAGE'] }
                            });
                            const responseParts = response?.candidates?.[0]?.content?.parts || [];
                            for (const part of responseParts) {
                                if (part?.inlineData?.data) {
                                    const mimeType = part.inlineData.mimeType || 'image/png';
                                    return { url: `data:${mimeType};base64,${part.inlineData.data}`, mimeType };
                                }
                            }
                            throw new Error('No image data in Gemini response');
                        }
                    }

                    if ((cred.type === AIAccountType.OPENAI || cred.type === AIAccountType.CUSTOM) && (cred.account || cred.provider)) {
                        const client = new OpenAIClient({
                            apiKey: cred.provider?.apiKey || cred.account?.serviceKeys?.get('apiKey') || '',
                            baseUrl: cred.provider?.baseUrl || cred.account?.serviceKeys?.get('baseUrl')
                        });
                        const result = await client.generateImage(prompt, modelId, options);
                        return { url: result.url, mimeType: result.mimeType || 'image/png' };
                    }
                } catch (error: any) {
                    const label = cred.type === AIAccountType.API_KEY ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                    Logger.warn(`[GeminiClient] generateImage failed via ${label}: ${error.message}`, 'GeminiClient');
                    errors.push(`${label}: ${error.message}`);
                }
            }
        }catch(error: any){
            Logger.error(`[GeminiClient] generateImage failed: ${error.message}`, 'GeminiClient');
            // throw error;
        }
        return null;
        // throw new Error(`All credential sources failed for generateImage: ${errors.join(' | ')}`);
    }

    /**
     * Generate Video (Veo)
     * Fallback chain: Antigravity → Standard Google → API Key
     * API Key path uses generateVideos() + async polling
     */
    public async generateVideo(prompt: string, modelId: string = EnvConfig.geminiModelVideoGeneration, options: any = {}): Promise<{ url?: string; mimeType?: string; sceneId?: string; statusUrl?: string; jobId?: string; status?: string } | null> {
        try{
            const chain = await this.resolveCredentialsChain(AIModelType.VIDEO);
            const errors: string[] = [];

            // Helper to resolve images for Veo API structure
            const resolveToVeoImage = async (input: any) => {
                if (!input) return undefined;
                if (typeof input !== 'string') return input; // Already resolved or object

                try {
                    let buffer: Buffer;
                    let mimeType = 'image/png';

                    if (input.startsWith('https://') || input.startsWith('http://')) {
                        const response = await axios.get(input, { responseType: 'arraybuffer' });
                        buffer = Buffer.from(response.data);
                        mimeType = String(response.headers['content-type'] || 'image/png');
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

            // RESOLVE ALL IMAGES UPFRONT
            const resolvedOptions = { ...options };
            Logger.info(`[GeminiClient] Starting image resolution for video generation...`, 'GeminiClient');
            
            if (options.imageStart || options.image) {
                Logger.info(`[GeminiClient] Resolving imageStart/image: ${options.imageStart || options.image}`, 'GeminiClient');
                resolvedOptions.imageStart = await resolveToVeoImage(options.imageStart || options.image);
                resolvedOptions.image = resolvedOptions.imageStart;
            }

            if (options.imageEnd) {
                Logger.info(`[GeminiClient] Resolving imageEnd: ${options.imageEnd}`, 'GeminiClient');
                resolvedOptions.imageEnd = await resolveToVeoImage(options.imageEnd);
            }

            const charRefs = options.characterImages || options.characterReferences || [];
            Logger.info(`[GeminiClient] Found ${charRefs.length} character references to resolve.`, 'GeminiClient');
            if (Array.isArray(charRefs) && charRefs.length > 0) {
                const resolvedChars = await Promise.all(charRefs.map(async (img, idx) => {
                    Logger.info(`[GeminiClient] Resolving character image [${idx}]: ${img}`, 'GeminiClient');
                    return await resolveToVeoImage(img);
                }));
                resolvedOptions.characterImages = resolvedChars.filter(img => !!img);
                resolvedOptions.characterReferences = resolvedOptions.characterImages;
                Logger.info(`[GeminiClient] Successfully resolved ${resolvedOptions.characterImages.length} character images.`, 'GeminiClient');
            }

            for (const cred of chain) {
                try {
                    if (cred.type === AIAccountType.ANTIGRAVITY && cred.account) {
                        // const client = new AntigravityClient(cred.account);
                        // if (typeof client.generateVideo === 'function') {
                        //     return await client.generateVideo(prompt, modelId, resolvedOptions);
                        // }
                        // // If AntigravityClient has no generateVideo, fall through to next
                        // throw new Error('AntigravityClient does not support generateVideo');
                    } else if (cred.type === AIAccountType.STANDARD && cred.account) {
                        const client = new CloudCodeClient(cred.account);
                        return await client.generateVideo(prompt, modelId, resolvedOptions);
                    } else if ((cred.type === AIAccountType.API_KEY || cred.type === AIAccountType.GOOGLE_VERTEX) && cred.googleGenAI) {
                        const genConfig: any = {};
                        if (options.aspectRatio) genConfig.aspectRatio = options.aspectRatio;
                        if (options.resolution) genConfig.resolution = options.resolution;
                        if (options.durationSeconds) genConfig.durationSeconds = String(options.durationSeconds);
                        if (options.personGeneration) genConfig.personGeneration = options.personGeneration;
                        if (options.negativePrompt) genConfig.negativePrompt = options.negativePrompt;
                        // genConfig.includeAudio = false;

                        // Interpolation (lastFrame)
                        if (resolvedOptions.imageEnd) {
                            genConfig.lastFrame = resolvedOptions.imageEnd;
                        }

                        // Reference Images (R2V) - Only if not using I2V interpolation (lastFrame)
                        if (!genConfig.lastFrame && resolvedOptions.characterImages && Array.isArray(resolvedOptions.characterImages) && resolvedOptions.characterImages.length > 0) {
                            genConfig.referenceImages = resolvedOptions.characterImages.map((img: any) => ({
                                image: img,
                                referenceType: 'asset'
                            }));
                        }

                        const generateParams: any = { 
                            model: modelId, 
                            prompt,
                            image: resolvedOptions.imageStart || resolvedOptions.image
                        };

                        // Currently Veo3 doesn't support both image and referenceImages
                        if(genConfig.referenceImages){
                            delete generateParams.image;
                        }

                        // Logger.info("generateParams: ", generateParams);

                        // Logger.info("genConfig", JSON.stringify(genConfig));
                        // Logger.info(modelId, prompt);
                        
                        if (Object.keys(genConfig).length > 0) generateParams.config = genConfig;

                        Logger.info(`[GeminiClient] Final API Key Payload structure: hasImage=${!!generateParams.image}, hasLastFrame=${!!generateParams.config?.lastFrame}, referenceImageCount=${generateParams.config?.referenceImages?.length || 0}`, 'GeminiClient');

                        const ai = cred.type === AIAccountType.GOOGLE_VERTEX 
                            ? cred.googleGenAI 
                            : new GoogleGenAI({ apiKey: cred.apiKey, apiVersion: "v1alpha" } as any);

                        let operation;
                        if (options.jobId) {
                            Logger.info(`[GeminiClient] Checking existing operation: ${options.jobId}`, 'GeminiClient');
                            operation = { name: options.jobId };
                            operation = await (cred.googleGenAI as any).operations.getVideosOperation({ operation });
                        } else {
                            operation = await ai.models.generateVideos(generateParams);
                        }

                        if (options.async) {
                            Logger.info(`[GeminiClient] Async generation requested. Returning jobId: ${operation.name}`, 'GeminiClient');
                            return { jobId: operation.name, status: 'pending' };
                        }

                        const maxPolls = 60;
                        let pollCount = 0;
                        while (!operation.done && pollCount < maxPolls) {
                            Logger.debug(`[GeminiClient] Waiting for video generation... (poll ${pollCount + 1}/${maxPolls})`, 'GeminiClient');
                            await new Promise(resolve => setTimeout(resolve, 10000));
                            operation = await (cred.googleGenAI as any).operations.getVideosOperation({ operation });
                            pollCount++;
                        }

                        if (!operation.done) throw new Error('Video generation timed out after 10 minutes');

                        // Logger.info(`[GeminiClient] Veo operation response content: ${JSON.stringify(operation.response)}`, 'GeminiClient');

                        const generatedVideos = operation.response?.generatedVideos || [];
                        if (generatedVideos.length === 0) throw new Error('No videos returned from Veo API');

                        const videoFile = generatedVideos[0].video;
                        const videoBytes = videoFile?.videoBytes || generatedVideos[0].videoBytes;
                        const videoUrl = videoFile?.uri || videoFile?.gcsUri || generatedVideos[0].uri || generatedVideos[0].gcsUri;

                        if (videoBytes) {
                            const finalUrl = `data:${videoFile?.mimeType || 'video/mp4'};base64,${videoBytes}`;
                            Logger.info(`[GeminiClient] Video generated inline successfully (bytes length: ${videoBytes.length})`, 'GeminiClient');
                            return { url: finalUrl, mimeType: videoFile?.mimeType || 'video/mp4', sceneId: options.sceneId };
                        } else if (videoUrl) {
                            let finalUrl = videoUrl;
                            if (finalUrl.includes('generativelanguage.googleapis.com') && cred.apiKey) {
                                finalUrl += (finalUrl.includes('?') ? '&' : '?') + `key=${cred.apiKey}`;
                            }
                            Logger.info(`[GeminiClient] Video generated via URI successfully: ${finalUrl}`, 'GeminiClient');
                            return { url: finalUrl, mimeType: videoFile?.mimeType || 'video/mp4', sceneId: options.sceneId };
                        }
                        throw new Error('No video URI or bytes in Veo response');
                    }
                } catch (error: any) {
                    const label = cred.type === AIAccountType.API_KEY ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                    
                    // Detailed logging for Google API Errors (like 403 Service Disabled)
                    let detail = error.message;
                    if (error.response?.data?.error) {
                        const apiError = error.response.data.error;
                        detail = `[${apiError.code} ${apiError.status}] ${apiError.message}`;
                        if (apiError.details) {
                            Logger.error(`[GeminiClient] Full API Error Details: ${JSON.stringify(apiError.details, null, 2)}`, 'GeminiClient');
                        }
                    } else if (error.details) {
                        detail = `${error.message} - ${JSON.stringify(error.details)}`;
                    }

                    Logger.warn(`[GeminiClient] generateVideo failed via ${label}: ${detail}`, 'GeminiClient');
                    errors.push(`${label}: ${detail}`);
                }
            }

        }
        catch(error: any){
            Logger.error(`[GeminiClient] generateVideo failed: ${error.message}`, 'GeminiClient');
            // throw error;
        }
        return null;
        // throw new Error(`All credential sources failed for generateVideo: ${errors.join(' | ')}`);
    }

    /**
     * List available voices (Gemini 2.0 Flash supports 30 distinct voices)
     * Language is auto-detected from input text
     * Reference: https://ai.google.dev/gemini-api/docs/speech-generation
     */
    async listVoices(language?: string) {
        return [
            { id: 'Zephyr', name: 'Zephyr', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Bright, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zephyr.wav" },
            { id: 'Puck', name: 'Puck', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Upbeat, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Puck.wav" },
            { id: 'Charon', name: 'Charon', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Informative, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Charon.wav" },
            { id: 'Kore', name: 'Kore', language: 'auto', gender: 'female', provider: 'gemini', description: 'Firm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Kore.wav" },
            { id: 'Fenrir', name: 'Fenrir', language: 'auto', gender: 'male', provider: 'gemini', description: 'Excitable, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Fenrir.wav" },
            { id: 'Leda', name: 'Leda', language: 'auto', gender: 'female', provider: 'gemini', description: 'Youthful, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Leda.wav" },
            { id: 'Orus', name: 'Orus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Orus.wav" },
            { id: 'Aoede', name: 'Aoede', language: 'auto', gender: 'female', provider: 'gemini', description: 'Breezy, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Aoede.wav" },
            { id: 'Callirrhoe', name: 'Callirrhoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Easy-going, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Callirrhoe.wav" },
            { id: 'Autonoe', name: 'Autonoe', language: 'auto', gender: 'female', provider: 'gemini', description: 'Bright, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Autonoe.wav" },
            { id: 'Enceladus', name: 'Enceladus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Breathy, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Enceladus.wav" },
            { id: 'Iapetus', name: 'Iapetus', language: 'auto', gender: 'male', provider: 'gemini', description: 'Clear, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Iapetus.wav" },
            { id: 'Umbriel', name: 'Umbriel', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Easy-going, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Umbriel.wav" },
            { id: 'Algieba', name: 'Algieba', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algieba.wav" },
            { id: 'Despina', name: 'Despina', language: 'auto', gender: 'female', provider: 'gemini', description: 'Smooth, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Despina.wav" },
            { id: 'Erinome', name: 'Erinome', language: 'auto', gender: 'female', provider: 'gemini', description: 'Clear, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Erinome.wav" },
            { id: 'Algenib', name: 'Algenib', language: 'auto', gender: 'male', provider: 'gemini', description: 'Gravelly, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Algenib.wav" },
            { id: 'Rasalgethi', name: 'Rasalgethi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Informative, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Rasalgethi.wav" },
            { id: 'Laomedeia', name: 'Laomedeia', language: 'auto', gender: 'female', provider: 'gemini', description: 'Upbeat, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Laomedeia.wav" },
            { id: 'Achernar', name: 'Achernar', language: 'auto', gender: 'male', provider: 'gemini', description: 'Soft, Higher Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achernar.wav" },
            { id: 'Alnilam', name: 'Alnilam', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Firm, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Alnilam.wav" },
            { id: 'Schedar', name: 'Schedar', language: 'auto', gender: 'female', provider: 'gemini', description: 'Even, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Schedar.wav" },
            { id: 'Gacrux', name: 'Gacrux', language: 'auto', gender: 'male', provider: 'gemini', description: 'Mature, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Gacrux.wav" },
            { id: 'Pulcherrima', name: 'Pulcherrima', language: 'auto', gender: 'female', provider: 'gemini', description: 'Forward, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Pulcherrima.wav" },
            { id: 'Achird', name: 'Achird', language: 'auto', gender: 'female', provider: 'gemini', description: 'Friendly, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Achird.wav" },
            { id: 'Zubenelgenubi', name: 'Zubenelgenubi', language: 'auto', gender: 'male', provider: 'gemini', description: 'Casual, Lower-Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Zubenelgenubi.wav" },
            { id: 'Vindemiatrix', name: 'Vindemiatrix', language: 'auto', gender: 'female', provider: 'gemini', description: 'Gentle, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Vindemiatrix.wav" },
            { id: 'Sadachbia', name: 'Sadachbia', language: 'auto', gender: 'neutral', provider: 'gemini', description: 'Lively, Lower Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadachbia.wav" },
            { id: 'Sadaltager', name: 'Sadaltager', language: 'auto', gender: 'male', provider: 'gemini', description: 'Knowledgeable, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sadaltager.wav" },
            { id: 'Sulafat', name: 'Sulafat', language: 'auto', gender: 'male', provider: 'gemini', description: 'Warm, Middle Pitch', audioSampleUrl: "https://gstatic.com/aistudio/voices/samples/Sulafat.wav" }
        ];
    }

    /**
     * Generate Audio (TTS via Gemini)
     * Fallback chain: Antigravity → Standard Google → API Key
     * Output: raw PCM16 24kHz mono → auto-wrapped in WAV header
     */
    public async generateAudio(text: string, voiceId: string = 'Puck', modelId: string = EnvConfig.geminiModelTTS, options: any = {}): Promise<{ url: string; mimeType: string }> {
        const chain = await this.resolveCredentialsChain(AIModelType.AUDIO);
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                let base64: string;
                let mimeType: string;

                if (cred.type === AIAccountType.STANDARD && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    const result = await client.generateAudio(text, voiceId, modelId, options);
                    base64 = result.url.split(',')[1];
                    mimeType = result.mimeType || 'audio/wav';
                } else if ((cred.type === AIAccountType.API_KEY || cred.type === AIAccountType.GOOGLE_VERTEX) && cred.googleGenAI) {
                    let speechConfig: any;
                    let finalText = text;
                    
                    if (options.multiSpeaker && options.multiSpeaker.enabled && Array.isArray(options.multiSpeaker.speakers) && options.multiSpeaker.speakers.length > 0) {
                        const speakers = options.multiSpeaker.speakers;
                        
                        const speakerNames = speakers.map((_: any, i: number) => `Speaker ${i + 1}`);
                        const intro = `TTS the following conversation between ${speakerNames.join(' and ')}:`;
                        
                        const lines = text.split('\n').filter(l => l.trim().length > 0);
                        const mappedLines = lines.map((line, idx) => {
                           const sName = speakerNames[idx % speakerNames.length];
                           return `${sName}: ${line.trim()}`;
                        });
                        
                        finalText = [intro, ...mappedLines].join('\n');
                        
                        speechConfig = {
                            multiSpeakerVoiceConfig: {
                                speakerVoiceConfigs: speakers.map((s: any, idx: number) => ({
                                    speaker: `Speaker ${idx + 1}`,
                                    voiceConfig: {
                                        prebuiltVoiceConfig: { voiceName: s.voiceId || voiceId }
                                    }
                                }))
                            }
                        };
                    } else {
                        speechConfig = { 
                            voiceConfig: { 
                                prebuiltVoiceConfig: { 
                                    voiceName: voiceId
                                } 
                            } 
                        };

                        // Gemini Native Audio prompt steering for speed and pitch
                        const styleInstructions: string[] = [];
                        if (options.speed && options.speed !== 1.0) {
                            styleInstructions.push(options.speed > 1.0 ? `speak faster at ${options.speed}x speed` : `speak slower at ${options.speed}x speed`);
                        }
                        if (options.pitch && options.pitch !== 0) {
                            styleInstructions.push(options.pitch > 0 ? `use a higher pitch (+${options.pitch})` : `use a lower pitch (${options.pitch})`);
                        }

                        if (styleInstructions.length > 0) {
                            finalText = `Instructions: Please ${styleInstructions.join(' and ')} when reading the following text aloud.\n\nText:\n${text}`;
                        }
                    }

                    const response = await (cred.googleGenAI as any).models.generateContent({
                        model: modelId,
                        contents: [{ role: 'user', parts: [{ text: finalText }] }],
                        config: { responseModalities: ['AUDIO'], speechConfig }
                    });

                    const part = response.candidates?.[0]?.content?.parts?.[0];
                    base64 = part?.inlineData?.data;
                    mimeType = part?.inlineData?.mimeType || 'audio/L16;rate=24000';
                    if (!base64) throw new Error('No audio data returned from Gemini TTS API');
                    if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);
                } else {
                    continue;
                }

                // PCM → WAV conversion
                if (mimeType.toLowerCase().includes('l16') || mimeType.toLowerCase().includes('pcm')) {
                    try {
                        const audioBuffer = Buffer.from(base64, 'base64');
                        const sampleRate = 24000;
                        const numChannels = 1;
                        const wavBuffer = Buffer.allocUnsafe(44 + audioBuffer.length);
                        wavBuffer.write('RIFF', 0);
                        wavBuffer.writeUInt32LE(36 + audioBuffer.length, 4);
                        wavBuffer.write('WAVE', 8);
                        wavBuffer.write('fmt ', 12);
                        wavBuffer.writeUInt32LE(16, 16);
                        wavBuffer.writeUInt16LE(1, 20);
                        wavBuffer.writeUInt16LE(numChannels, 22);
                        wavBuffer.writeUInt32LE(sampleRate, 24);
                        wavBuffer.writeUInt32LE(sampleRate * numChannels * 2, 28);
                        wavBuffer.writeUInt16LE(numChannels * 2, 32);
                        wavBuffer.writeUInt16LE(16, 34);
                        wavBuffer.write('data', 36);
                        wavBuffer.writeUInt32LE(audioBuffer.length, 40);
                        audioBuffer.copy(wavBuffer, 44);
                        base64 = wavBuffer.toString('base64');
                        mimeType = 'audio/wav';
                    } catch (e: any) {
                        Logger.warn(`[GeminiClient] Failed to add WAV header: ${e.message}`, 'GeminiClient');
                    }
                }

                return { url: `data:${mimeType};base64,${base64}`, mimeType };
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateAudio failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateAudio: ${errors.join(' | ')}`);
    }

    /**
     * Generate Music (Lyria 3)
     * Uses Interactions API to generate high-fidelity audio clips.
     */
    public async generateMusic(prompt: string, modelId: string = EnvConfig.geminiModelMusic, options: any = {}): Promise<{ url: string; mimeType: string }> {
        const chain = await this.resolveCredentialsChain(AIModelType.MUSIC);
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if (cred.type === AIAccountType.ANTIGRAVITY && cred.account) {
                    const client = new AntigravityClient(cred.account);
                    const result = await client.generateMusic(prompt, modelId, options) as any;
                    return {
                        url: result.url || result.media?.url,
                        mimeType: result.mimeType || result.media?.mimeType || 'audio/mpeg'
                    };
                }
                if (cred.type === AIAccountType.STANDARD && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    const result = await client.generateMusic(prompt, modelId, options) as any;
                    return {
                        url: result.url || result.media?.url,
                        mimeType: result.media?.mimeType || result.media?.mimeType || 'audio/mpeg'
                    };
                }
                if ((cred.type === AIAccountType.API_KEY || cred.type === AIAccountType.GOOGLE_VERTEX) && cred.googleGenAI) {
                    const isVertex = cred.type === AIAccountType.GOOGLE_VERTEX;
                    const hasADC = GeminiClient.detectADC();

                    if (isVertex && hasADC) {
                        Logger.info(`[GeminiClient] Using Vertex Interactions API for music generation: ${modelId}`, 'GeminiClient');
                        const interaction = await (cred.googleGenAI as any).interactions.create({
                            model: modelId,
                            input: prompt,
                        });

                        Logger.info(`[GeminiClient] interaction keys: ${Object.keys(interaction).join(', ')}`, 'GeminiClient');

                        let generatedAudio = interaction.outputAudio || interaction.output_audio;
                        if (!generatedAudio && Array.isArray(interaction.outputs)) {
                            const audioOutput = interaction.outputs.find((out: any) => out.data && (out.mime_type?.startsWith('audio/') || out.mimeType?.startsWith('audio/')));
                            if (audioOutput) {
                                generatedAudio = {
                                    data: audioOutput.data,
                                    mime_type: audioOutput.mime_type || audioOutput.mimeType || 'audio/mp3'
                                };
                            }
                        }

                        if (!generatedAudio) {
                            throw new Error('No audio data returned from Lyria via interactions');
                        }

                        if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);

                        return {
                            url: `data:${generatedAudio.mime_type || 'audio/mp3'};base64,${generatedAudio.data}`,
                            mimeType: generatedAudio.mime_type || 'audio/mp3'
                        };
                    } else {
                        Logger.info(`[GeminiClient] Using Gemini/AI Studio generateContent API for music generation: ${modelId}`, 'GeminiClient');
                        const response = await (cred.googleGenAI as any).models.generateContent({
                            model: modelId,
                            contents: [{ role: 'user', parts: [{ text: prompt }] }],
                            config: {
                                responseModalities: ['AUDIO'],
                                speechConfig: {
                                    voiceConfig: {
                                        prebuiltVoiceConfig: {
                                            voiceName: 'Puck'
                                        }
                                    }
                                }
                            }
                        });

                        const part = response.candidates?.[0]?.content?.parts?.[0];
                        const base64 = part?.inlineData?.data;
                        const mimeType = part?.inlineData?.mimeType || 'audio/mp3';

                        if (!base64) {
                            throw new Error('No audio data returned from Lyria via generateContent');
                        }

                        if (cred.apiKey) await geminiPool.recordUsage(cred.apiKey, modelId);

                        return {
                            url: `data:${mimeType};base64,${base64}`,
                            mimeType
                        };
                    }
                }
            } catch (error: any) {
                const label = cred.type === AIAccountType.API_KEY ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] generateMusic failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for generateMusic: ${errors.join(' | ')}`);
    }

    /**
     * Connect to Multimodal Live API
     */
    public async connectLive(config: { 
        model?: string;
        systemInstruction?: string;
        generationConfig?: any;
        contextWindowCompression?: any;
        sessionResumption?: any;
        tools?: any[];
        callbacks: {
            onopen?: (session?: any) => void | Promise<void>;
            onmessage?: (msg: any) => void;
            onerror?: (err: any) => void;
            onclose?: (event: any) => void;
        }}){
        const chain = await this.resolveCredentialsChain(AIModelType.VOICE);
        const model = config.model || EnvConfig.geminiModelVoice;
        
        // For Live API, find the first usable credential
        for (const cred of chain) {
            try {
                let session: any;
                let finalApiKey: string | undefined;
                let finalAccount: any = undefined;

                if (cred.type === AIAccountType.GOOGLE_VERTEX) {
                    if (cred.keyFile && !fs.existsSync(cred.keyFile)) {
                        Logger.info(`[GeminiClient] Vertex keyFile ${cred.keyFile} does not exist, skipping vertex cred`, 'GeminiClient');
                        continue;
                    }
                    if (!cred.googleGenAI) continue;

                    session = await (cred.googleGenAI as any).live.connect({
                        model: model,
                        config: {
                            systemInstruction: config.systemInstruction,
                            responseModalities: config.generationConfig?.responseModalities,
                            speechConfig: config.generationConfig?.speechConfig,
                            tools: config.tools,
                            enableAffectiveDialog: true,
                            contextWindowCompression: config.contextWindowCompression,
                            sessionResumption: config.sessionResumption,
                            realtimeInputConfig: {
                                automaticActivityDetection: {
                                    disabled: true,
                                }
                            }
                        },
                        callbacks: config.callbacks
                    });
                    finalApiKey = cred.provider?.apiKey || this.apiKey;
                } else {
                    let token: string | undefined;
                    let isApiKey = false;

                    if (cred.type === AIAccountType.API_KEY && cred.apiKey) {
                        token = cred.apiKey;
                        isApiKey = true;
                    } else if (cred.account) {
                        try {
                            token = await aiAccountManager.refreshAccessToken(cred.account);
                        } catch (e) { continue; }
                    }
                    if (!token) continue;

                    const ai = new GoogleGenAI({ apiKey: isApiKey ? token : undefined, httpOptions: {"apiVersion": "v1alpha"} }); 
                    session = await (ai as any).live.connect({
                        model: model,
                        config: {
                            systemInstruction: config.systemInstruction,
                            responseModalities: config.generationConfig?.responseModalities,
                            speechConfig: config.generationConfig?.speechConfig,
                            tools: config.tools,
                        // proactivity: { proactiveAudio: false },
                            enableAffectiveDialog: true,
                            contextWindowCompression: config.contextWindowCompression,
                            sessionResumption: config.sessionResumption,
                            realtimeInputConfig: {
                                automaticActivityDetection: {
                                    disabled: true,
                                }
                            }
                        },
                        callbacks: config.callbacks
                    });
                    finalApiKey = isApiKey ? token : undefined;
                    finalAccount = !isApiKey ? cred.account : undefined;
                }

                return {
                    session,
                    apiKey: finalApiKey,
                    account: finalAccount
                };
            } catch (error: any) {
                Logger.warn(`[GeminiClient] Live connection failed via ${cred.type}: ${error.message}`, 'GeminiClient');
            }
        }

        throw new Error('All credential sources failed for connectLive');
    }

    /**
     * Upload a file to Gemini File API
     */
    public async uploadFile(filePath: string, mimeType: string, displayName?: string) {
        const chain = await this.resolveCredentialsChain(AIModelType.VIDEO);
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if ((cred.type === AIAccountType.ANTIGRAVITY || cred.type === AIAccountType.STANDARD) && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.uploadFile(filePath, mimeType, displayName);
                }
                if (cred.type === AIAccountType.API_KEY && cred.googleGenAI) {
                    return await cred.googleGenAI.files.upload({
                        file: filePath,
                        config: { mimeType, displayName: displayName || filePath.split('/').pop() }
                    });
                }
            } catch (error: any) {
                const label = cred.type === 'apikey' ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] uploadFile failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for uploadFile: ${errors.join(' | ')}`);
    }

    public async waitForFileActive(fileIdOrUri: string) {
        const chain = await this.resolveCredentialsChain(AIModelType.VIDEO);
        const errors: string[] = [];

        for (const cred of chain) {
            try {
                if ((cred.type === AIAccountType.ANTIGRAVITY || cred.type === AIAccountType.STANDARD) && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.waitForFileActive(fileIdOrUri);
                }
                if (cred.type === AIAccountType.API_KEY && cred.googleGenAI) {
                    const fileName = fileIdOrUri.includes('/')
                        ? (fileIdOrUri.startsWith('http') ? `files/${fileIdOrUri.split('/').pop()}` : fileIdOrUri)
                        : `files/${fileIdOrUri}`;
                    let file = await cred.googleGenAI.files.get({ name: fileName });
                    while (file.state === FileState.PROCESSING) {
                        await new Promise((resolve) => setTimeout(resolve, 3000));
                        file = await cred.googleGenAI.files.get({ name: fileName });
                    }
                    if (file.state === FileState.FAILED) throw new Error('Gemini File API processing failed');
                    return file;
                }
            } catch (error: any) {
                const label = cred.type === AIAccountType.API_KEY ? 'API Key' : `${cred.type} (${cred.account?.email})`;
                Logger.warn(`[GeminiClient] waitForFileActive failed via ${label}: ${error.message}`, 'GeminiClient');
                errors.push(`${label}: ${error.message}`);
            }
        }

        throw new Error(`All credential sources failed for waitForFileActive: ${errors.join(' | ')}`);
    }

    public async deleteFile(fileIdOrUri: string) {
        const chain = await this.resolveCredentialsChain(AIModelType.VIDEO);

        for (const cred of chain) {
            try {
                if ((cred.type === AIAccountType.ANTIGRAVITY || cred.type === AIAccountType.STANDARD) && cred.account) {
                    const client = new CloudCodeClient(cred.account);
                    return await client.deleteFile(fileIdOrUri);
                }
                if (cred.type === AIAccountType.API_KEY && cred.googleGenAI) {
                    const fileName = fileIdOrUri.includes('/')
                        ? (fileIdOrUri.startsWith('http') ? `files/${fileIdOrUri.split('/').pop()}` : fileIdOrUri)
                        : `files/${fileIdOrUri}`;
                    await cred.googleGenAI.files.delete({ name: fileName });
                    return true;
                }
            } catch (error: any) {
                Logger.warn(`[GeminiClient] deleteFile failed via ${cred.type}: ${error.message}`, 'GeminiClient');
            }
        }

        return false;
    }
}
