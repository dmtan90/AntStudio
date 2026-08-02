import fs from 'fs'
import { aiManager } from './ai/AIServiceManager.js'
import config from './config.js'
import { Logger } from './Logger.js'
import { configService } from './ConfigService.js'
import { uploadToS3, getFromS3 } from './s3.js'
import { 
    buildCharacterSheetPrompt, 
    buildScenePrompt, 
    buildVeoVideoPrompt,
    buildStoryboardPrompt,
    buildHighlightsPrompt,
    buildSocialMetaPrompt,
    buildTranslationPrompt,
    buildFlowVideoNormalizePrompt,
    getFlowVideoConstraints
} from './PromptBuilder.js'
import { InfluencerService } from '../services/streaming/InfluencerService.js'
import { Readable } from 'stream'

// Job tracking for async operations
interface VideoJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    videoUrl?: string;
    error?: string;
    createdAt: number;
}
const jobStore = new Map<string, VideoJob>();

// Cleanup old jobs every 1 hour
setInterval(() => {
    const now = Date.now();
    for (const [id, job] of jobStore.entries()) {
        if (now - job.createdAt > 24 * 60 * 60 * 1000) { // 24 hours
            jobStore.delete(id);
        }
    }
}, 60 * 60 * 1000);

/**
 * AI GENERATOR UTILITIES
 * Unified interface for Text, Image, and Video generation using configured providers.
 */

// ============================================================================
// TEXT GENERATION
// ============================================================================

export const generateText = async (prompt: string | any[], modelName?: string, options: any = {}) => {
    return await aiManager.generateText(prompt as any, modelName, undefined, options)
}

export const generateJSON = async <T = any>(prompt: string | any[], modelName?: string, options: any = {}): Promise<T> => {
    let lastError: any = null;
    const maxRetries = options.retries || 0; // Increase default retries slightly
    const baseDelay = options.baseDelay || 10000;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                const delay = baseDelay * Math.pow(2, attempt - 1);
                Logger.warn(`[AIGenerator] Retrying JSON generation in ${delay}ms... (Attempt ${attempt}/${maxRetries})`, 'AIGenerator');
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            const text = await generateText(prompt, modelName, {
                ...options,
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 65535
                }
            });

            let cleanedText = text.trim();

            // Resilient JSON extraction: Strip markdown code blocks if present
            if (cleanedText.startsWith('```')) {
                cleanedText = cleanedText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
            }

            const startIdx = Math.min(
                cleanedText.indexOf('{') === -1 ? Infinity : cleanedText.indexOf('{'),
                cleanedText.indexOf('[') === -1 ? Infinity : cleanedText.indexOf('[')
            );

            // Resilience: Try to find the matching closing brace if we have extra garbage attached
            let endIdx = -1;
            if (startIdx !== Infinity) {
                const startChar = cleanedText[startIdx];
                const endChar = startChar === '{' ? '}' : ']';

                let depth = 0;
                let inString = false;
                let escaped = false;

                for (let i = startIdx; i < cleanedText.length; i++) {
                    const char = cleanedText[i];
                    if (escaped) { escaped = false; continue; }
                    if (char === '\\') { escaped = true; continue; }
                    if (char === '"') { inString = !inString; continue; }
                    if (!inString) {
                        if (char === startChar) depth++;
                        else if (char === endChar) {
                            depth--;
                            if (depth === 0) {
                                endIdx = i;
                                break;
                            }
                        }
                    }
                }

                if (endIdx === -1) {
                    endIdx = Math.max(cleanedText.lastIndexOf('}'), cleanedText.lastIndexOf(']'));
                }
            }

            if (startIdx !== Infinity) {
                if (endIdx === -1 || endIdx < startIdx) {
                    Logger.warn(`[AIGenerator] JSON appears truncated. Attempting to repair...`, 'AIGenerator');

                    let repairText = cleanedText.substring(startIdx);
                    let depthStack: string[] = [];
                    let inString = false;
                    let escaped = false;

                    for (let i = 0; i < repairText.length; i++) {
                        const char = repairText[i];
                        if (escaped) { escaped = false; continue; }
                        if (char === '\\') { escaped = true; continue; }
                        if (char === '"') { inString = !inString; continue; }
                        if (!inString) {
                            if (char === '{') depthStack.push('}');
                            else if (char === '[') depthStack.push(']');
                            else if (char === '}' || char === ']') {
                                if (depthStack.length > 0 && depthStack[depthStack.length - 1] === char) {
                                    depthStack.pop();
                                }
                            }
                        }
                    }

                    if (inString) repairText += '"';
                    while (depthStack.length > 0) {
                        repairText += depthStack.pop();
                    }
                    cleanedText = repairText;
                } else {
                    cleanedText = cleanedText.substring(startIdx, endIdx + 1);
                }
            }

            // Heavy-duty cleanup for common LLM JSON hallucinations
            // 1. Pythonic 'None' -> 'null'
            cleanedText = cleanedText.replace(/:\s*None\s*([,}])/g, ': null$1');
            // 2. Trailing commas in objects/arrays
            cleanedText = cleanedText.replace(/,\s*([}\]])/g, '$1');
            // 3. Fix missing commas between properties (e.g. "prop": "val" "next": "val")
            cleanedText = cleanedText.replace(/"\s*\n\s*"/g, '", "');
            // 4. Fix missing commas between objects in arrays (e.g. } {)
            cleanedText = cleanedText.replace(/}\s*{/g, '}, {');

            try {
                return JSON.parse(cleanedText);
            } catch (parseError: any) {
                lastError = parseError;
                Logger.error(`[AIGenerator] JSON Parse Attempt ${attempt} failed: ${parseError.message}`, 'AIGenerator');
                
                // On failure, if we still have retries, we might want to log the malformed text for debugging
                if (attempt === maxRetries) {
                    throw parseError;
                }
            }
        } catch (error: any) {
            lastError = error;
            if (attempt === maxRetries) break;
        }
    }

    // Final failure handling
    Logger.error(`[AIGenerator] All JSON generation attempts failed. Final Error: ${lastError.message}`, 'AIGenerator', lastError);
    throw new Error(`AI generated invalid JSON after ${maxRetries + 1} attempts: ${lastError.message}`);
}

/**
 * High-level generation of a cinematic storyboard.
 */
export const generateStoryboard = async (
    scriptOrTopic: string,
    projectAnalysis: any,
    targetDuration: number = 60,
    language: string = 'English'
): Promise<any> => {
    const translator = async (p: string) => await generateText(p, undefined);
    const prompt = await buildStoryboardPrompt(scriptOrTopic, projectAnalysis, targetDuration, language, translator);
    return await generateJSON(prompt, undefined);
}

/**
 * Extracts highlights/viral clips from context.
 */
export const extractHighlights = async (context: string): Promise<any> => {
    const prompt = await buildHighlightsPrompt(context);
    return await generateJSON(prompt, undefined);
}

/**
 * Generates social media metadata.
 */
export const generateSocialMeta = async (contentSummary: string): Promise<any> => {
    const prompt = await buildSocialMetaPrompt(contentSummary);
    return await generateJSON(prompt, undefined);
}

/**
 * Translates and localizes content.
 */
export const translateContent = async (text: string, targetLanguage: string): Promise<string> => {
    const prompt = await buildTranslationPrompt(text, targetLanguage);
    return await generateText(prompt, undefined);
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

export const generateImage = async (
    prompt: string,
    projectId: string,
    filename: string,
    options: {
        aspectRatio?: '1:1' | '16:9' | '9:16'
        characterContext?: any[]
        projectAnalysis?: any
        generationType?: 'character' | 'scene'
        loras?: Array<{ id: string; weight: number }>
        referenceImages?: string[]
        s3Key?: string
        videoStyle?: string
        views?: string
        greenScreen?: boolean
    } = {}
): Promise<{ s3Key: string }> => {
    let optimizedPrompt: string = prompt;

    const translator = async (p: string) => await generateText(p, undefined);

    const style = options.videoStyle || 'Cinematic, Photo-realistic';
    if (options.generationType === 'character' && options.characterContext && options.characterContext.length > 0) {
        optimizedPrompt = await buildCharacterSheetPrompt(options.characterContext[0], style, options.projectAnalysis, 'en', translator, options.views, options.greenScreen);
    } else {
        optimizedPrompt = await buildScenePrompt(prompt, options.characterContext || [], style, options.projectAnalysis, 'en', translator);
    }

    try {
        const result: any = await aiManager.generateImage(optimizedPrompt, undefined, undefined, {
            aspectRatio: options.aspectRatio,
            loras: options.loras, // Pass tactical stylistic weights
            referenceImages: options.referenceImages
        });

        const buffer = result.buffer || await getFileBuffer(result.media?.url || result);
        const mimeType = result.mimeType || 'image/png';
        const s3Key = options.s3Key || `projects/${projectId}/images/${filename}.png`;
        const uploadResult = await uploadToS3(s3Key, buffer, mimeType);
        return { s3Key: uploadResult.key }; // Deprecated: Use s3Key and construct /api/s3/ proxy URL
    } catch (error: any) {
        // Fallback or Error handling...
        throw error;
    }
}

// ============================================================================
// VIDEO GENERATION (VEO)
// ============================================================================

export interface Veo3GenerateOptions {
    prompt: string
    duration?: number
    aspectRatio?: '16:9' | '9:16' | '1:1'
    loras?: Array<{ id: string; weight: number }>
    characterImages?: string[]
    imageStart?: string
    imageEnd?: string
    metadata?: any
    useGreenScreen?: boolean
    shouldNormalize?: boolean
}

export const generateVideo = async (options: Veo3GenerateOptions): Promise<{ url: string; jobId?: string }> => {
    // const videoDefault = configService.aiDefaultModels?.video;
    // const model = videoDefault?.modelId || config.geminiModelVideoGeneration;
    // const provider = videoDefault?.providerId || undefined;

    const jobId = options.metadata?.jobId || `gen-native-${Date.now()}`;
    
    // Track job status
    jobStore.set(jobId, {
        id: jobId,
        status: 'pending',
        createdAt: Date.now()
    });

    try {
        Logger.info(`[AIGenerator] Synchronous video generation start: ${jobId}`, 'AIGenerator');
        
        // Normalize prompt using Gemini if explicitly requested (e.g., to handle complex green screen context or avoid filter triggers)
        let finalPrompt = options.prompt;
        if (options.shouldNormalize) {
            try {
                Logger.info(`[AIGenerator] Normalizing flow prompt via Gemini (Opt-in)...`);
                const normalizePromptText = await buildFlowVideoNormalizePrompt(options.prompt);
                const normalized = await aiManager.generateText(normalizePromptText);
                
                if (normalized) {
                    finalPrompt = normalized.trim();
                    Logger.info(`[AIGenerator] Prompt normalized.`);
                }
            } catch (normError: any) {
                Logger.warn(`[AIGenerator] Prompt normalization failed, using original prompt: ${normError.message}`);
                finalPrompt = options.prompt;
            }

            // Explicitly re-enforce Green Screen ONLY if requested via options
            const constraintsBlock = await getFlowVideoConstraints();
            let backgroundConstraints = "";
            
            if (options.useGreenScreen) {
                backgroundConstraints = "\n\n### MANDATORY VISUAL CONSTRAINT ###\n- Use a pure, flat, evenly lit GREEN SCREEN background (Hex #00FF00). No shadows, no gradients, no scenery.";
            }

            if (options.imageStart && options.imageEnd) {
                backgroundConstraints += "\n- The video must begin and end exactly matching the provided posture image seeds to ensure 100% pixel-perfect seamless loops and cuts.";
            }

            finalPrompt = finalPrompt + backgroundConstraints + "\n\n" + constraintsBlock;
            Logger.info(`[AIGenerator] Constraints appended (Green Screen: ${!!options.useGreenScreen}, Loop Enforced: ${!!(options.imageStart && options.imageEnd)}).`);
        }

        const result: any = await aiManager.generateVideo(finalPrompt, undefined, undefined, {
            ...options,
            prompt: finalPrompt, // Pass the normalized prompt
            async: false // Wait for completion
        });

        if (result && (result.url || result.buffer)) {
            Logger.info(`[AIGenerator] Video generation finished. URL: ${result.url}`, 'AIGenerator');
            
            // Upload to S3 like generateImage
            const projectId = options.metadata?.projectId || 'system';
            const filename = options.metadata?.filename || jobId;
            const buffer = result.buffer || await getFileBuffer(result.url);
            const mimeType = 'video/mp4';
            const s3Key = `projects/${projectId}/videos/${filename}.mp4`;
            
            Logger.info(`[AIGenerator] Uploading video to S3: ${s3Key}`);
            const uploadResult = await uploadToS3(s3Key, buffer, mimeType);
            
            // Update job store
            jobStore.set(jobId, {
                ...jobStore.get(jobId)!,
                status: 'completed',
                videoUrl: uploadResult.key
            });

            return { 
                url: uploadResult.key, // Now returning S3 Key per project pattern
                jobId 
            };
        } else {
            throw new Error('Provider did not return a video URL');
        }
    } catch (e: any) {
        Logger.error(`[AIGenerator] Video generation failed: ${e.message}`, 'AIGenerator', e);
        jobStore.set(jobId, {
            ...jobStore.get(jobId)!,
            status: 'failed',
            error: e.message
        });
        throw e;
    }
}

export const checkVideoStatus = async (jobId: string) => {
    const job = jobStore.get(jobId);
    if (!job) {
        return { jobId, status: 'not_found' };
    }
    return { 
        jobId: job.id, 
        status: job.status, 
        videoUrl: job.videoUrl,
        error: job.error
    };
}

export const downloadVideo = async (videoUrl: string): Promise<Buffer> => {
    const response = await fetch(videoUrl)
    return Buffer.from(await response.arrayBuffer())
}

export const generateAudio = async (prompt: string, projectId: string, filename: string, options: any = {}) => {
    const result: any = await aiManager.generateAudio(prompt, undefined, undefined, { ...options, voiceId: options.voice, projectId, filename });
    
    let buffer: Buffer;
    let mimeType = 'audio/mpeg';

    if (result.media && result.media.url && result.media.url.startsWith('data:')) {
        const base64Data = result.media.url.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
        mimeType = result.media.mimeType || 'audio/mpeg';
    } else if (result.url && typeof result.url === 'string' && result.url.startsWith('data:')) {
        const base64Data = result.url.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
        mimeType = result.mimeType || 'audio/wav';
    } else if (result.buffer) {
        buffer = result.buffer;
        mimeType = result.mimeType || 'audio/mpeg';
    } else {
        Logger.error('[AIGenerator] Audio result format error:', 'AIGenerator', Object.keys(result));
        throw new Error('Unsupported audio result format from provider');
    }

    const extension = mimeType.includes('wav') ? 'wav' : 'mp3';
    const s3Key = options.s3Key || `projects/${projectId}/audio/${filename}.${extension}`;
    const uploadResult = await uploadToS3(s3Key, buffer, mimeType);
    return { s3Key: uploadResult.key };
}

export const generateMusic = async (prompt: string, projectId: string, filename: string, options: any = {}) => {
    const result: any = await aiManager.generateMusic(prompt, undefined, undefined, { ...options, projectId, filename });
    
    let buffer: Buffer;
    let mimeType = 'audio/wav'; // Lyria default

    if (result.buffer) {
        buffer = result.buffer;
        mimeType = result.mimeType || 'audio/wav';
    } else if (result.url && result.url.startsWith('data:')) {
        const base64Data = result.url.split(',')[1];
        buffer = Buffer.from(base64Data, 'base64');
        mimeType = result.mimeType || 'audio/wav';
    } else {
        Logger.error('[AIGenerator] Music result format error:', 'AIGenerator', Object.keys(result));
        throw new Error('Unsupported music result format from provider');
    }

    const s3Key = options.s3Key || `projects/${projectId}/music/${filename}.wav`;
    const uploadResult = await uploadToS3(s3Key, buffer, mimeType);
    return { s3Key: uploadResult.key };
}

export const getFileBuffer = async (input: string): Promise<Buffer> => {
    if (input.startsWith('http')) {
        const res = await fetch(input)
        return Buffer.from(await res.arrayBuffer())
    }
    
    if (input.startsWith('data:')) {
        return Buffer.from(input.split(',')[1], 'base64')
    }

    if (input.startsWith('projects/')) {
        const s3Stream = await getFromS3(input) as Readable;
        const chunks = [];
        for await (const chunk of s3Stream) {
            chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        return Buffer.concat(chunks);
    }

    return Buffer.from(input, 'utf8')
}
