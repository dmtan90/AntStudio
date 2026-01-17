import { uploadToS3 } from './s3'
import { getGeminiClient } from './gemini'
import { googleAI } from '@genkit-ai/google-genai'

/**
 * Generate image with Gemini Imagen 3
 * Using configured model (e.g. gemini-3-pro-image-preview) with image generation capabilities
 */
export const generateImage = async (
    prompt: string,
    projectId: string,
    filename: string,
    options: {
        aspectRatio?: '1:1' | '16:9' | '9:16'
        numberOfImages?: number
        characterContext?: any[] // Support detailed character metadata
    } = {}
): Promise<{ s3Key: string; s3Url: string }> => {
    // Check if we have a real Gemini Client (Genkit instance)
    const ai = await getGeminiClient()
    const config = useRuntimeConfig()
    const modelName = config.geminiModelImageGeneration || 'gemini-1.5-flash' // fallback

    // Augment prompt with character context for deep consistency
    let optimizedPrompt = prompt
    if (options.characterContext && options.characterContext.length > 0) {
        const charProfiles = options.characterContext
            .map(c => {
                const colors = c.color_spec ? `\nColors: ${JSON.stringify(c.color_spec)}` : ''
                const traits = `\nTraits: ${c.species}, ${c.gender}, ${c.age}, ${c.body_build}, ${c.face_shape}, ${c.hair}, ${c.skin_or_fur_color}`
                const style = `\nStyle Markers: 3D rendered surface, smooth shading, PBR materials`
                return `[CHARACTER IDENTITY: ${c.name.toUpperCase()}]\nDescription: ${c.description}${traits}${colors}${style}\nVisual Reference: This character has an established visual identity from their Key Element reference image.`
            })
            .join('\n\n')

        optimizedPrompt = `### VISUAL IDENTITY RULES (STRICT CONSISTENCY REQUIRED) ###
You are generating a scene for a video project. You MUST maintain perfect visual consistency for the following characters:

${charProfiles}

### SCENE DESCRIPTION ###
${prompt}

### FINAL INSTRUCTION ###
Generate a photo-realistic, cinematic frame that matches the SCENE DESCRIPTION while strictly adhering to the VISUAL IDENTITY RULES for every character mentioned. If a character is in the shot, they must look exactly like their established profile.`
    }

    try {
        const { media } = await ai.generate({
            model: googleAI.model(modelName),
            prompt: optimizedPrompt,
            config: {
                responseModalities: ['IMAGE'],
                safetySettings: [
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' }
                ]
            }
        })

        if (media?.url) {
            const base64Data = media.url.replace(/^data:image\/\w+;base64,/, "");
            const imageBuffer = Buffer.from(base64Data, 'base64')
            const s3Key = `projects/${projectId}/images/${filename}.png`
            const result = await uploadToS3(s3Key, imageBuffer, 'image/png')
            return { s3Key: result.key, s3Url: result.url }
        }
    } catch (error: any) {
        console.warn(`[GeminiImage] Genkit generation failed: ${error.message}. Switching to fallback.`)
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
        console.error('Gemini Image generation (fallback) failed:', error)
        throw new Error('Failed to generate image')
    }
}

/**
 * For now, use text-to-image via external service or placeholder
 * This is a temporary solution until Imagen 3 API is available
 */
export const generateImagePlaceholder = async (
    prompt: string,
    projectId: string,
    filename: string
): Promise<{ s3Key: string; s3Url: string }> => {
    // Generate a placeholder image URL or use external service
    // For development: return a placeholder
    const placeholderUrl = `https://via.placeholder.com/1024x1024/667eea/ffffff?text=${encodeURIComponent(filename)}`

    return {
        s3Key: placeholderUrl,
        s3Url: placeholderUrl
    }
}


