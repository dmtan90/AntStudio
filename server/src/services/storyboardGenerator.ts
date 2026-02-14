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
        tts_config?: {
            voice_id: string
            rate: number
            pitch: number
        }
    }[]
    characters: string[]
    lipSyncRequired: boolean
}

export interface StoryboardResult {
    segments: StoryboardSegment[]
    totalDuration: number
}

/**
 * Calculate duration based on voiceover text (approximate)
 * Average speaking rate: ~150 words per minute
 */
const calculateDuration = (text: string): number => {
    if (!text || text.trim() === '') return 3
    const words = text.trim().split(/\s+/).length
    const wordsPerSecond = 150 / 60
    const duration = Math.ceil(words / wordsPerSecond)
    return Math.max(duration, 3) // Minimum 3 seconds
}

/**
 * Generate storyboard from script using Gemini
 */
export const generateStoryboard = async (
    scriptContent: string,
    scriptAnalysis: any
): Promise<StoryboardResult> => {
    const charactersInfo = scriptAnalysis.characters
        ?.map((c: any) => `- ${c.name}: ${c.description}`)
        .join('\n') || 'No characters defined'

    const locationsInfo = scriptAnalysis.locations
        ?.map((l: any) => `- ${l.name}: ${l.description}`)
        .join('\n') || 'No locations defined'

    const prompt = `You are a professional video director and storyboard artist. Create a detailed storyboard for the following script.

Script Content:
${scriptContent}

Script Analysis:
- Genre: ${scriptAnalysis.genre}
- Mood: ${scriptAnalysis.mood}
- Summary: ${scriptAnalysis.summary}

Characters:
${charactersInfo}

Locations:
${locationsInfo}

Create a cinematic storyboard by breaking down the script into video segments/shots.

**CRITICAL CHARACTER CONSISTENCY RULES:**
- Whenever a character from the "Characters" list above appears in a segment, you MUST use their specific name (e.g., "Ava", "Ông Chính") in all fields.
- DO NOT use generic terms like "a person" or "the user".
- Voice and dialogue MUST match the character's profile and language context.

For each segment, provide:
1. **Title**: Short descriptive title.
2. **Description**: Visual-first summary. MUST mention characters by name.
3. **Voiceover**: The narration or dialogue text.
4. **Duration**: Estimated time in seconds (4-10s per shot).
5. **Location Details**:
   - type: Setting name (e.g., "The Grand Mekong Mansion (1920s)")
   - objects: Key items/props in the scene.
   - layout: Spatial arrangement of the shot.
   - atmosphere: Emotional/environmental tone.
   - visualStyle: Specific stylistic notes (e.g., "Vintage Retro Cinematic 3D").
   - lighting: Detailed lighting setup (e.g., "Golden hour sunset").
6. **Camera Details**:
   - framing: Wide, Medium, Closeup, etc.
   - angle: High-angle, Low-angle, Eye-level, etc.
   - movement: Pan, Tilt, Zoom, Dolly, Flycam glide, etc.
   - focus: Deep focus, Narrow depth of field, etc.
7. **Audio Details**:
   - ambience: Environmental sounds (e.g., "Mekong river flowing").
   - sfx: Specific sound effects (e.g., "Water lapping").
   - music: Description of background melody/tone.
8. **Detailed Dialogue**: Array of lines:
   - characterId: Reference to the character's "char_id" (e.g., "CHAR_AVA"). MUST match exactly.
   - characterName: The display name.
   - line: The spoken text in the project's native language.
   - tts_config: { voice_id, rate, pitch } based on character profile.
   - delivery: How the line is spoken (e.g., "hauntingly").
   - style: Musical or tonal style (e.g., "low-pitched chanting").
   - timing: When it occurs (e.g., "at scene start").
9. **Characters**: Array of "char_id" present in this shot.
10. **Title**: DO NOT include "Segment N:" or shot numbers. Just a descriptive title.

Return your storyboard in the following JSON format:
{
  "segments": [
    {
      "order": 1,
      "title": "Segment Title",
      "description": "...",
      "duration": 8,
      "voiceover": "...",
      "cameraAngle": "wide",
      "mood": "...",
      "style": "...",
      "location": "...",
      "locationDetails": { "type": "...", "objects": "...", "layout": "...", "atmosphere": "...", "visualStyle": "...", "lighting": "..." },
      "cameraDetails": { "framing": "...", "angle": "...", "movement": "...", "focus": "..." },
      "audioDetails": { "ambience": "...", "sfx": "...", "music": "..." },
      "detailedDialogue": [ { "characterId": "...", "characterName": "...", "line": "...", "language": "...", "delivery": "...", "style": "...", "timing": "..." } ],
      "characters": ["..."],
      "lipSyncRequired": true
    }
  ],
  "totalDuration": 120
}`

    const result = await generateJSON<{ segments: any[] }>(
        prompt,
        'gemini-2.5-flash'
    )

    // Map segments with duration and metadata
    const segmentsWithDuration: StoryboardSegment[] = result.segments.map((segment, index) => ({
        ...segment,
        order: index + 1,
        duration: segment.duration || calculateDuration(segment.voiceover),
        detailedDialogue: Array.isArray(segment.detailedDialogue) ? segment.detailedDialogue : [],
        characters: Array.isArray(segment.characters) ? segment.characters : [],
        lipSyncRequired: !!segment.lipSyncRequired,
        // Legacy
        cameraAngle: segment.cameraDetails?.framing || 'medium',
        mood: segment.locationDetails?.atmosphere || 'Neutral',
        style: segment.locationDetails?.visualStyle || 'Cinematic',
        location: segment.locationDetails?.type || 'Unknown'
    }))

    // Calculate total duration
    const totalDuration = segmentsWithDuration.reduce((sum, seg) => sum + seg.duration, 0)

    return {
        segments: segmentsWithDuration,
        totalDuration
    }
}
