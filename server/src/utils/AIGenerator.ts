import { aiManager } from './ai/AIServiceManager.js'
import config from './config.js'
import { configService } from './configService.js'
import { uploadToS3 } from './s3.js'
import { buildCharacterSheetPrompt, buildScenePrompt } from './PromptBuilder.js'

/**
 * AI GENERATOR UTILITIES
 * Unified interface for Text, Image, and Video generation using configured providers.
 */

// ============================================================================
// TEXT GENERATION
// ============================================================================

/**
 * Generate content using the central AI Manager
 */
export const generateText = async (
    prompt: string,
    modelName?: string,
    options: any = {}
) => {
    // If modelName is provided, we pass it.
    // If not, we pass undefined, and AI Manager resolves the default for 'text'.
    const targetModel = modelName

    return await aiManager.generateText(prompt, targetModel, undefined, options)
}

/**
 * Generate JSON response from Gemini with parsing
 */
export const generateJSON = async <T = any>(
    prompt: string,
    modelName?: string
): Promise<T> => {
    const targetModel = modelName

    // Add JSON instruction strongly
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON. Do not include any explanations or markdown formatting.`

    const text = await generateText(fullPrompt, targetModel)

    // Clean up response - remove markdown code blocks if present
    let cleanedText = text.trim()

    // Enhanced cleanup - find the first { or [ and last } or ]
    const startIdx = Math.min(
        cleanedText.indexOf('{') === -1 ? Infinity : cleanedText.indexOf('{'),
        cleanedText.indexOf('[') === -1 ? Infinity : cleanedText.indexOf('[')
    )
    const endIdx = Math.max(
        cleanedText.lastIndexOf('}'),
        cleanedText.lastIndexOf(']')
    )

    if (startIdx !== Infinity && endIdx !== -1 && endIdx > startIdx) {
        cleanedText = cleanedText.substring(startIdx, endIdx + 1)
    } else {
        // Fallback to existing logic if indices are invalid
        if (cleanedText.startsWith('```json')) {
            cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '')
        } else if (cleanedText.startsWith('```')) {
            cleanedText = cleanedText.replace(/```\n?/g, '')
        }
    }

    // Basic cleanup for control characters
    cleanedText = cleanedText.replace(/[\x00-\x1F\x7F-\x9F]/g, (c: string) => {
        return ['\b', '\f', '\n', '\r', '\t'].includes(c) ? c : ''
    })

    try {
        return JSON.parse(cleanedText)
    } catch (error) {
        try {
            console.warn('JSON parse failed, attempting heuristic fix...')
            // Naive fix for internal quotes
            const fixedText = cleanedText.replace(/(?<!\\)"/g, (match: string, offset: number, string: string) => {
                // Skip first and last chart if they are quotes
                if (offset === 0 || offset === string.length - 1) return match
                return match
            })
            // This re-throw is intentional as the fix logic is risky without context
            throw error
        } catch (e) {
            console.error('Failed to parse Gemini JSON response:', cleanedText)
            throw new Error('Invalid JSON response from Gemini')
        }
    }
}

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Generate image with configured provider (e.g. Imagen 3)
 */
export const generateImage = async (
    prompt: string,
    projectId: string,
    filename: string,
    options: {
        aspectRatio?: '1:1' | '16:9' | '9:16'
        numberOfImages?: number
        numberOfImages?: number
        characterContext?: any[] // Support detailed character metadata
        generationType?: 'character' | 'scene'
        s3Key?: string // Allow overriding S3 key (Standardization)
    } = {}
): Promise<{ s3Key: string; s3Url: string }> => {
    console.debug("generateImage", filename, options);

    // Build optimized prompt using the builder
    let optimizedPrompt = prompt;

    if (options.generationType === 'character' && options.characterContext && options.characterContext.length > 0) {
        // Assume the first character in context is the one we are generating the sheet for
        optimizedPrompt = buildCharacterSheetPrompt(options.characterContext[0]);
    } else {
        // Default to scene generation
        optimizedPrompt = buildScenePrompt(prompt, options.characterContext || []);
    }


    try {
        // Use aiManager to generate image. 
        // passing undefined for model/provider lets it resolve defaults for 'image' type
        const { buffer, mimeType } = await aiManager.generateImage(optimizedPrompt, undefined, undefined, {
            aspectRatio: options.aspectRatio
        });

        let s3Key = options.s3Key;
        if (!s3Key) {
            s3Key = `projects/${projectId}/images/${filename}.png`
        }

        const result = await uploadToS3(s3Key, buffer, mimeType)
        return { s3Key: result.key, s3Url: result.url }
    } catch (error: any) {
        console.warn(`[AIGenerator] Genkit generation failed: ${error.message}. Switching to fallback.`);
    }

    // --- FALLBACK: Pollinations (High Quality) ---
    try {
        const encodedPrompt = encodeURIComponent(optimizedPrompt)
        const seed = Math.floor(Math.random() * 1000000)
        let width = 1024, height = 1024
        if (options.aspectRatio === '16:9') { width = 1280; height = 720 }
        else if (options.aspectRatio === '9:16') { width = 720; height = 1280 }

        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&model=flux`
        return { s3Key: imageUrl, s3Url: imageUrl }
    } catch (error) {
        console.error('Image generation (fallback) failed:', error)
        throw new Error('Failed to generate image')
    }
}

/**
 * Generate a placeholder image (for dev purposes)
 */
export const generateImagePlaceholder = async (
    prompt: string,
    projectId: string,
    filename: string
): Promise<{ s3Key: string; s3Url: string }> => {
    const placeholderUrl = `https://via.placeholder.com/1024x1024/667eea/ffffff?text=${encodeURIComponent(filename)}`
    return {
        s3Key: placeholderUrl,
        s3Url: placeholderUrl
    }
}

// ============================================================================
// VIDEO GENERATION (VEO)
// ============================================================================

export interface Veo3GenerateOptions {
    prompt: string
    duration?: number // in seconds
    aspectRatio?: '16:9' | '9:16' | '1:1'
    imageStart?: string // URL or base64 for first frame
    imageEnd?: string   // URL or base64 for last frame
    characterImages?: string[] // reference character appearance
}

export interface Veo3JobStatus {
    jobId: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    progress?: number // 0-100
    videoUrl?: string
    error?: string
}

/**
 * Initialize Veo 3 client
 */
export const initializeVeo3 = () => {
    const apiKey = configService.ai.providers.find((p: any) => p.id === 'google')?.apiKey || process.env.GEMINI_API_KEY

    if (!apiKey) {
        throw new Error('Google AI API key not configured')
    }

    return {
        apiKey,
        endpoint: process.env.VEO_API_ENDPOINT || 'https://aiplatform.googleapis.com/v1/veo3'
    }
}

/**
 * Generate video with Veo 3
 * @param options Video generation options
 */
export const generateVideo = async (
    options: Veo3GenerateOptions
): Promise<{ jobId: string }> => {
    // Ensure dynamic config is loaded
    await configService.refresh()

    // Check default provider
    const videoDefault = configService.ai.defaults?.video
    const defaultProvider = videoDefault?.providerId || 'google';
    const defaultModelName = videoDefault?.modelId || 'veo-2.0'

    // If NOT google, delegate to AI Manager (generic providers like GeminiGen AI)
    if (defaultProvider !== 'google') {
        try {
            const result: any = await aiManager.generateVideo(options.prompt, defaultModelName, defaultProvider, {
                ...options
            });
            const jobId = result.jobId || result.job_id || result.id || 'unknown';
            return { jobId };
        } catch (error) {
            console.error("Generic Video Generation Failed, falling back to Google/Mock logic if applicable or throwing", error);
            throw error;
        }
    }

    const client = initializeVeo3()

    console.log(`🎬 Veo 3 generation (Model: ${defaultModelName}): "${options.prompt.substring(0, 50)}..."`)
    console.log(`🖼️ Start Frame: ${options.imageStart ? 'Yes' : 'No'}, End Frame: ${options.imageEnd ? 'Yes' : 'No'}, Characters: ${options.characterImages?.length || 0}`)

    // In real implementation, we would send these to Vertex AI / Google AI
    // For now, if no endpoint is configured, we might still want to use mock
    const veoEndpoint = process.env.VEO_API_ENDPOINT || ''
    if (!veoEndpoint || veoEndpoint.includes('placeholder')) {
        // Fallback to mock for now but log the advanced parameters
        const { jobId } = await generateMockVideo(options.prompt, options.duration)
        return { jobId }
    }

    // Actual API call placeholder
    const body = {
        prompt: options.prompt,
        duration: options.duration || 5,
        aspect_ratio: options.aspectRatio || '16:9',
        image_start: options.imageStart,
        image_end: options.imageEnd,
        character_references: options.characterImages || []
    }

    try {
        const response = await fetch(`${client.endpoint}/generate`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${client.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })

        if (!response.ok) {
            const err = await response.text()
            throw new Error(`Veo 3 API error: ${err}`)
        }

        const data = await response.json()
        return { jobId: data.jobId || data.job_id }
    } catch (error: any) {
        console.error('Veo 3 API Call failed:', error)
        throw error
    }
}

/**
 * Check video generation status
 */
export const checkVideoStatus = async (jobId: string): Promise<Veo3JobStatus> => {
    const client = initializeVeo3()

    if (jobId.startsWith('mock-')) {
        return { jobId, status: 'completed', videoUrl: 'https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4' }
    }

    try {
        const response = await fetch(`${client.endpoint}/status/${jobId}`, {
            headers: { 'Authorization': `Bearer ${client.apiKey}` }
        })
        const data = await response.json()
        return {
            jobId,
            status: data.status,
            progress: data.progress,
            videoUrl: data.videoUrl,
            error: data.error
        }
    } catch (error) {
        return { jobId, status: 'failed', error: 'Failed to check status' }
    }
}

/**
 * Download generated video
 */
export const downloadVideo = async (videoUrl: string): Promise<Buffer> => {
    const response = await fetch(videoUrl)
    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
}

/**
 * Utility to get buffer from URL or base64 (useful for API)
 */
export const getFileBuffer = async (input: string): Promise<Buffer> => {
    if (input.startsWith('http')) {
        const res = await fetch(input)
        return Buffer.from(await res.arrayBuffer())
    }
    if (input.startsWith('data:')) {
        const base64 = input.split(',')[1]
        return Buffer.from(base64, 'base64')
    }
    return Buffer.from(input)
}

/**
 * For development: Create a placeholder/mock video generation
 */
export const generateMockVideo = async (
    prompt: string,
    duration: number = 5
): Promise<{ jobId: string; s3Key: string }> => {
    const jobId = `mock-${Date.now()}`
    const mockUrl = `https://storage.googleapis.com/gweb-tveo-website.appspot.com/short-films/ElectricPink-rollover.mp4`

    console.log(`🎬 Mock video generation for: "${prompt.substring(0, 50)}..." (${duration}s)`)

    return { jobId, s3Key: mockUrl }
}

// ============================================================================
// AUDIO GENERATION (TTS)
// ============================================================================

/**
 * Generate audio (TTS) and upload to S3
 */
export const generateAudio = async (
    prompt: string,
    projectId: string,
    filename: string,
    options: {
        modelId?: string
        providerId?: string
        voice?: string
        s3Key?: string
    } = {}
): Promise<{ s3Key: string; s3Url: string }> => {
    try {
        const result: any = await aiManager.generateAudio(prompt, options.modelId, options.providerId, {
            voice: options.voice
        });

        if (!result?.media?.url) {
            throw new Error('No audio URL returned from provider');
        }

        const buffer = await getFileBuffer(result.media.url);

        let s3Key = options.s3Key;
        if (!s3Key) {
            s3Key = `projects/${projectId}/audio/${filename}.mp3`
        }

        const uploadResult = await uploadToS3(s3Key, buffer, 'audio/mpeg');
        return { s3Key: uploadResult.key, s3Url: uploadResult.url };
    } catch (error) {
        console.error('Audio generation failed:', error);
        throw error;
    }
}
