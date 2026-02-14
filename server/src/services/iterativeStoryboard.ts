import { generateJSON } from '../utils/AIGenerator.js'
import type { IProject } from '../models/Project.js'

export interface StoryboardSegment {
    order: number
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

    while (currentDuration < targetDuration && iteration < maxIterations) {
        const remainingDuration = targetDuration - currentDuration
        const blockPrompt = `You are a professional video director. Continue creating the storyboard for the following script.
        
        Script Content:
        ${scriptContent}
        
        Script Analysis:
        - Genre: ${scriptAnalysis.genre || 'Unknown'}
        - Mood: ${scriptAnalysis.mood || 'Unknown'}
        - Summary: ${scriptAnalysis.summary || 'No summary'}
        - Characters: ${JSON.stringify(scriptAnalysis.characters?.map((c: any) => ({ char_id: c.char_id, name: c.name })) || [])}
        
        Context:
        - We have already generated ${allSegments.length} segments.
        - Total duration so far: ${currentDuration} seconds.
        - Target duration: ${targetDuration} seconds.
        - Last segment visuals: ${lastSegmentDescription}
        
        Generate the NEXT 4-6 segments (fewer segments but EXTREMELY high detail). For each segment, calculate a realistic duration (in seconds) based on the voiceover length and visual complexity.
        
        CRITICAL RULES:
        1. Use accurate "char_id" in "description" and "detailedDialogue" for all characters. Mention "char_id" in description like (CHAR_AVA).
        2. "title" should be a simple descriptive name. DO NOT include "Segment 1:", "Segment 2:", etc.
        3. Respond ONLY with a valid JSON object. No prose.
        
        Respond in ${language}.
        
        Return in JSON format:
        {
          "segments": [
            {
              "title": "Segment title",
              "description": "Visual-first description",
              "duration": 5,
              "voiceover": "Narration or dialogue",
              "locationDetails": { "type": "", "objects": "", "layout": "", "atmosphere": "", "visualStyle": "", "lighting": "" },
              "cameraDetails": { "framing": "", "angle": "", "movement": "", "focus": "" },
              "audioDetails": { "ambience": "", "sfx": "", "music": "" },
              "detailedDialogue": [ { "characterId": "", "characterName": "", "line": "", "language": "", "delivery": "", "style": "", "timing": "" } ],
              "characters": ["Name1"],
              "lipSyncRequired": true
            }
          ]
        }`

        const result = await generateJSON<{ segments: any[] }>(blockPrompt, 'gemini-2.5-flash')

        if (!result.segments || result.segments.length === 0) break

        for (const segment of result.segments) {
            const cleanedSegment: StoryboardSegment = {
                order: allSegments.length + 1,
                title: segment.title || 'Untitled Segment',
                description: segment.description || 'No description provided.',
                duration: Math.max(1, segment.duration || 5),
                voiceover: segment.voiceover || ' ',
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
