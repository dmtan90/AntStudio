import fs from 'fs'
import { aiManager } from './ai/AIServiceManager.js'
import config from './config.js'
import { configService } from './configService.js'
import { uploadToS3 } from './s3.js'
import { buildCharacterSheetPrompt, buildScenePrompt, buildVeoVideoPrompt } from './PromptBuilder.js'
import { VTuberService } from '../services/VTuberService.js'

/**
 * AI GENERATOR UTILITIES
 * Unified interface for Text, Image, and Video generation using configured providers.
 */

// ============================================================================
// TEXT GENERATION
// ============================================================================

export const generateText = async (prompt: string, modelName?: string, options: any = {}) => {
    return await aiManager.generateText(prompt, modelName, undefined, options)
}

export const generateJSON = async <T = any>(prompt: string, modelName?: string): Promise<T> => {
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON. Do not include explanations.`
    const text = await generateText(fullPrompt, modelName)
    let cleanedText = text.trim()
    const startIdx = Math.min(cleanedText.indexOf('{') === -1 ? Infinity : cleanedText.indexOf('{'), cleanedText.indexOf('[') === -1 ? Infinity : cleanedText.indexOf('['))
    const endIdx = Math.max(cleanedText.lastIndexOf('}'), cleanedText.lastIndexOf(']'))
    
    if (startIdx !== Infinity && endIdx !== -1) {
        cleanedText = cleanedText.substring(startIdx, endIdx + 1)
    }

    try {
        return JSON.parse(cleanedText)
    } catch (error: any) {
        console.error(`[AIGenerator] JSON Parsing Failed. Error: ${error.message}`)
        console.error(`[AIGenerator] Malformed text preview (first 500 chars): ${cleanedText.substring(0, 500)}`)
        console.error(`[AIGenerator] Malformed text preview (last 500 chars): ${cleanedText.substring(cleanedText.length - 500)}`)
        
        // Log to a temporary file for deep inspection if it's large
        const debugPath = `json_error_${Date.now()}.txt`
        try {
            fs.writeFileSync(debugPath, cleanedText)
            console.error(`[AIGenerator] Full malformed JSON saved to: ${debugPath}`)
        } catch (e: any) {
            console.error(`[AIGenerator] Failed to save debug file: ${e.message}`)
        }
        
        throw new Error(`AI generated invalid JSON: ${error.message}`)
    }
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
    } = {}
): Promise<{ s3Key: string }> => {
    let optimizedPrompt: string = prompt;

    const translator = async (p: string) => await generateText(p, 'gemini-2.5-flash');

    const style = options.videoStyle || 'Cinematic, Photo-realistic';
    if (options.generationType === 'character' && options.characterContext && options.characterContext.length > 0) {
        optimizedPrompt = await buildCharacterSheetPrompt(options.characterContext[0], style, options.projectAnalysis, 'vi', translator);
    } else {
        optimizedPrompt = await buildScenePrompt(prompt, options.characterContext || [], style, options.projectAnalysis, 'vi', translator);
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
}

export const generateVideo = async (options: Veo3GenerateOptions): Promise<{ jobId: string }> => {
    await configService.refresh();
    const videoDefault = configService.ai.defaults?.video;
    const model = videoDefault?.modelId || 'veo-2.0';
    const provider = videoDefault?.providerId || 'google';

    const jobId = options.metadata?.jobId || `gen-native-${Date.now()}`;

    // Background execution with LoRA and consistency support
    (async () => {
        try {
            console.log(`[AIGenerator] Starting video generation job: ${jobId}`);
            const result: any = await aiManager.generateVideo(options.prompt, model, provider, {
                ...options
            });
            console.log(`[AIGenerator] Job ${jobId} finished. Output: ${result.url || 'Success'}`);
        } catch (e: any) {
            console.error(`[AIGenerator] Job ${jobId} failed: ${e.message}`);
        }
    })();

    return { jobId };
}

export const checkVideoStatus = async (jobId: string) => {
    // ... polling logic
    return { jobId, status: 'completed', videoUrl: '' };
}

export const downloadVideo = async (videoUrl: string): Promise<Buffer> => {
    const response = await fetch(videoUrl)
    return Buffer.from(await response.arrayBuffer())
}

export const generateAudio = async (prompt: string, projectId: string, filename: string, options: any = {}) => {
    return await aiManager.generateAudio(prompt, options.voice, undefined, { ...options, projectId, filename })
}

export const getFileBuffer = async (input: string): Promise<Buffer> => {
    if (input.startsWith('http')) {
        const res = await fetch(input)
        return Buffer.from(await res.arrayBuffer())
    }
    return Buffer.from(input, input.startsWith('data:') ? 'base64' : 'utf8')
}
