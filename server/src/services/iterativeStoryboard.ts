import { generateJSON } from '../utils/AIGenerator.js'
import type { IProject } from '../models/Project.js'
import { projectContext } from '../utils/ProjectContext.js'
import { Logger } from '../utils/Logger.js'


export interface StoryboardSegment {
    order: number
    uuid?: string
    title: string
    description: string
    duration: number
    voiceover: string
    cameraAngle?: string // Legacy
    mood?: string // Legacy
    style?: string // Legacy
    location?: string // Legacy
    locationDetails?: {
        type: string
        objects: string
        layout: string
        atmosphere: string
        visualStyle: string
        lighting: string
    }
    cameraDetails?: {
        framing: string
        angle: string
        movement: string
        focus: string
    }
    audioDetails?: {
        ambience: string
        sfx: string
        music: string
    }
    detailedDialogue?: {
        characterId: string
        characterName: string
        line: string
        language: string
        delivery: string
        style: string
        timing: string
    }[]
    characters: string[]
    visualKeywords: string[]
    audioKeywords: string[]
    lipSyncRequired: boolean
}

export interface IterativeStoryboardResult {
    segments: StoryboardSegment[]
    totalDuration: number
}

/**
 * Generate storyboard iteratively in blocks
 */
export const generateStoryboardIteratively = async (
    scriptContent: string,
    scriptAnalysis: any,
    targetDuration: number = 60, // in seconds
    language: string = 'English'
): Promise<IterativeStoryboardResult> => {
    let allSegments: StoryboardSegment[] = []
    let currentDuration = 0
    let lastSegmentDescription = 'Start of the story'

    // We'll generate in blocks of 10 until we reach target duration or cover the main points
    // For simplicity in this implementation, we'll aim for at least 10 segments or until targetDuration is met

    const maxIterations = 5 // Prevent infinite loops
    let iteration = 0

    const characters = scriptAnalysis.characters || []
    const characterMap = characters.map((c: any) => `- [${c.char_id || c.name.toUpperCase()}] ${c.name}: ${c.description}. Traits: ${[c.species, c.gender, c.age, c.hair, c.eyes].filter(Boolean).join(', ')}`).join('\n')

    // FALLBACK GROUNDING: If scriptContent is too short (likely just approval text),
    // and we have an analysis summary, use the summary to ground the AI.
    let groundingScript = scriptContent
    if (scriptContent.length < 50 && scriptAnalysis.summary) {
        groundingScript = `Summary: ${scriptAnalysis.summary}\n\nOriginal Intent: ${scriptContent}`
    } else if (scriptContent.length < 50 && scriptAnalysis.analysis?.summary) {
        groundingScript = `Summary: ${scriptAnalysis.analysis.summary}\n\nOriginal Intent: ${scriptContent}`
    }

    while (iteration < maxIterations && currentDuration < targetDuration) {
        const currentLanguage = language || 'en'
        const technicalGrounding = await projectContext.getTechnicalGroundingPrompt()

        const blockPrompt = `You are a professional Video Director and Audio Producer. Continue creating the HIGH-FIDELITY cinematic storyboard for the following script.

        ${technicalGrounding}

        ### HARD CONTEXT ANCHORING (WALL OF SILENCE) ###
        - YOUR CURRENT TOPIC IS: "${scriptAnalysis.creativeBrief?.title || 'Current Script'}"
        - IGNORE ALL PLOTS, CHARACTERS, AND LOCATIONS from the "GOLD-STANDARD TECHNICAL REFERENCE" above (like Ông Chính, Mekong, Cờ tướng).
        - If you mention Ông Chính or Resource Analysis, you HAVE FAILED. Use ONLY the characters from the list below.

        Script Content:
        ${groundingScript}
        
        Script Analysis (Scenes Roadmap):
        ${JSON.stringify(scriptAnalysis.scenes || [], null, 2)}
        
        Visual Style Context:
        - Genre: ${scriptAnalysis.genre || 'Unknown'}
        - Mood: ${scriptAnalysis.mood || 'Unknown'}
        - Visual Style: ${JSON.stringify(scriptAnalysis.visuals?.visualStyle || {})}
        - World Rules: ${JSON.stringify(scriptAnalysis.visuals?.visualWorldRules || {})}
        
        ### REQUIRED CHARACTER LIST (Casting) ###
        ${characterMap}
        
        Context:
        - Generated segments: ${allSegments.length}
        - Total duration so far: ${currentDuration}s / Target: ${targetDuration}s
        - Last segment visuals: ${lastSegmentDescription}
        
        GENERATE THE NEXT 4-6 SEGMENTS. 
        MAPPING RULE: Follow the "Scenes Roadmap" chronologically. Ensure each segment translates a specific part of the scene into cinematic visuals.

        STRICT CHARACTER RULES:
        1. Use ONLY the char_ids from the list above. Format as (CHAR_ID) in descriptions.
        2. Ensure "detailedDialogue" matches your character list exactly.

        CRITICAL AUDIO & DIALOGUE RULES:
        1. Capture EQUALLY detailed Audio (SFX, Ambience, Music) as the Gold Standard references.
        2. Dialogue MUST be the EXACT lines from the script.

        Respond in ${currentLanguage}.
        
        Return in JSON format:
        {
          "segments": [
            {
              "title": "Segment title",
              "description": "Visual-first description (Location, Camera, Action). Reference character IDs like (CHAR_AVA).",
              "duration": 5,
              "voiceover": "Full narration or all dialogue lines combined",
              "visualKeywords": [],
              "audioKeywords": [],
              "locationDetails": { "type": "", "objects": "", "layout": "", "atmosphere": "", "visualStyle": "", "lighting": "" },
              "cameraDetails": { "framing": "", "angle": "", "movement": "", "focus": "" },
              "audioDetails": { "ambience": "Specific environment background", "sfx": "Precise sound triggers", "music": "Description: mood, tempo, instruments" },
              "detailedDialogue": [ { "characterId": "", "characterName": "", "line": "", "language": "", "delivery": "e.g., whispering", "style": "natural", "timing": "mid" } ],
              "characters": ["Name1"],
              "lipSyncRequired": true
            }
          ]
        }`

        let result: { segments: any[] }
        try {
            result = await generateJSON<{ segments: any[] }>(blockPrompt, 'gemini-2.5-flash', {
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 32 * 1024
                }
            })
        } catch (jsonError: any) {
            // If JSON was truncated even at 32K tokens, retry with a smaller batch
            Logger.warn(`[iterativeStoryboard] Block ${iteration + 1} failed (${jsonError.message}). Retrying with smaller batch (2-3 segments)...`)
            const smallerPrompt = blockPrompt.replace('GENERATE THE NEXT 4-6 SEGMENTS', 'GENERATE THE NEXT 2-3 SEGMENTS')
            result = await generateJSON<{ segments: any[] }>(smallerPrompt, 'gemini-2.5-flash', {
                generationConfig: {
                    responseMimeType: 'application/json',
                    maxOutputTokens: 16 * 1024
                }
            })
        }

        if (!result.segments || result.segments.length === 0) break

        for (const segment of result.segments) {
            const cleanedSegment: StoryboardSegment = {
                order: allSegments.length + 1,
                uuid: crypto.randomUUID(),
                title: segment.title || 'Untitled Segment',
                description: segment.description || 'No description provided.',
                duration: Math.max(1, segment.duration || 5),
                voiceover: segment.voiceover || ' ',
                visualKeywords: Array.isArray(segment.visualKeywords) ? segment.visualKeywords : [],
                audioKeywords: Array.isArray(segment.audioKeywords) ? segment.audioKeywords : [],
                locationDetails: segment.locationDetails,
                cameraDetails: segment.cameraDetails,
                audioDetails: segment.audioDetails,
                detailedDialogue: Array.isArray(segment.detailedDialogue) ? segment.detailedDialogue : [],
                characters: Array.isArray(segment.characters) ? segment.characters : [],
                lipSyncRequired: !!segment.lipSyncRequired,
                // Legacy fields for backward compatibility
                cameraAngle: segment.cameraDetails?.framing || 'medium',
                mood: segment.locationDetails?.atmosphere || 'Neutral',
                style: segment.locationDetails?.visualStyle || 'Cinematic',
                location: segment.locationDetails?.type || 'Unknown'
            }

            allSegments.push(cleanedSegment)
            currentDuration += cleanedSegment.duration
            lastSegmentDescription = cleanedSegment.description

            if (currentDuration >= targetDuration) break
        }

        iteration++
    }

    return {
        segments: allSegments,
        totalDuration: currentDuration
    }
}
