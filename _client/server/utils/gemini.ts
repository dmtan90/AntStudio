import { aiManager } from './ai/AIServiceManager'

/**
 * Get the Google GenAI instance from the central manager
 * Note: Now Async
 */
export const getGeminiClient = async () => {
    return await aiManager.getProvider('google')
}

/**
 * Generate content using the central AI Manager
 * This preserves the signature but delegates logic.
 * Note: Key rotation is now handled by the Manager (if multiple providers are configured) or simplified.
 */
export const generateWithGemini = async (
    prompt: string,
    modelName?: string,
    options: any = {}
) => {
    const config = useRuntimeConfig()
    const targetModel = modelName || config.geminiModelTextAnalysis || 'gemini-1.5-flash'

    // Delegate to AI Manager
    // We assume 'google' provider for "generateWithGemini" functions
    return await aiManager.generateText(prompt, targetModel, 'google', options)
}

/**
 * Generate JSON response from Gemini with parsing
 */
export const generateJSONWithGemini = async <T = any>(
    prompt: string,
    modelName?: string
): Promise<T> => {
    const config = useRuntimeConfig()
    const targetModel = modelName || config.geminiModelTextAnalysis || 'gemini-1.5-flash'

    // Using Genkit's structured output capability if possible, 
    // but without a strict schema defined in code, we might rely on text parsing or 'json' hint.
    // Ideally we use: output: { format: 'json' }

    let ai = await getGeminiClient()

    // Add JSON instruction strongly
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON. Do not include any explanations or markdown formatting.`

    // Option 1: Use generateWithGemini to handle rotation, then parse
    // But since we want to try Genkit's json features, let's stick to text generation 
    // and manual parsing unless we define a schema. 
    // Since T is generic, we can't define a schema easily.
    // So we wrap generateWithGemini logic.

    const text = await generateWithGemini(fullPrompt, targetModel, {
        output: { format: 'json' }
    })

    // Clean up response - remove markdown code blocks if present (Genkit might clean it but good to be safe)
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
    cleanedText = cleanedText.replace(/[\x00-\x1F\x7F-\x9F]/g, (c) => {
        return ['\b', '\f', '\n', '\r', '\t'].includes(c) ? c : ''
    })

    try {
        return JSON.parse(cleanedText)
    } catch (error) {
        // Fallback or retry logic matching previous implementation
        try {
            console.warn('JSON parse failed, attempting heuristic fix...')
            // Naive fix for internal quotes
            const fixedText = cleanedText.replace(/(?<!\\)"/g, (match, offset, string) => {
                // Skip first and last chart if they are quotes
                if (offset === 0 || offset === string.length - 1) return match
                // A simple heuristic is hard here without context
                return match
            })
            throw error // Re-throw for now as the fix logic was risky
        } catch (e) {
            console.error('Failed to parse Gemini JSON response:', cleanedText)
            throw new Error('Invalid JSON response from Gemini')
        }
    }
}
