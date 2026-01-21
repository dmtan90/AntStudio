import { IDetailedCharacter } from '../models/Project.js'
import { generateText } from './AIGenerator.js'

/**
 * PROMPT BUILDER UTILITIES
 * Combines logic for character sheets, cinematic scenes, and video generation prompts.
 */

// ============================================================================
// TRANSLATION HELPER
// ============================================================================

/**
 * Translates text to English if needed for AI model consistency
 */
export const translateToEnglish = async (text: string, language?: string): Promise<string> => {
    // If already in English or language is English, return as-is
    if (!language || language.toLowerCase().includes('english') || language.toLowerCase() === 'en') {
        return text
    }

    // Use Gemini to translate
    const prompt = `Translate the following text to English. Only return the translation, nothing else:\n\n${text}`
    try {
        const translation = await generateText(prompt, 'gemini-2.0-flash-exp')
        return translation.trim()
    } catch (error) {
        console.error('Translation failed, using original text:', error)
        return text
    }
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface CharacterContext {
    name: string;
    description: string;
    gender?: string;
    age?: string;
    hair?: string;
    body_build?: string;
    face_shape?: string;
    skin_or_fur_color?: string;
    color_spec?: any;
    species?: string;
    clothing_style?: string;
    accessories?: string;
}

// ============================================================================
// IMAGE GENERATION PROMPTS
// ============================================================================

/**
 * Builds a prompt for generating a character reference sheet
 * Requirement: 3 poses (Close-up, Full-body Front, Full-body Side), neutral background.
 */
export const buildCharacterSheetPrompt = async (
    character: CharacterContext,
    style: string = 'Cinematic, Photo-realistic',
    language?: string
): Promise<string> => {
    // Translate character description to English
    const translatedDesc = await translateToEnglish(character.description, language)

    const traits = [
        character.species ? `Species: ${character.species}` : '',
        character.gender ? `Gender: ${character.gender}` : '',
        character.age ? `Age: ${character.age}` : '',
        character.body_build ? `Body: ${character.body_build}` : '',
        character.face_shape ? `Face: ${character.face_shape}` : '',
        character.hair ? `Hair: ${character.hair}` : '',
        character.skin_or_fur_color ? `Skin/Fur: ${character.skin_or_fur_color}` : '',
        character.clothing_style ? `Clothing: ${character.clothing_style}` : '',
        character.accessories ? `Accessories: ${character.accessories}` : ''
    ].filter(Boolean).join(', ');

    const colorSpec = character.color_spec ? `\nColor Palette: ${JSON.stringify(character.color_spec)}` : '';

    return `
### CHARACTER REFERENCE SHEET GENERATION ###

**SUBJECT**: ${character.name}
**DESCRIPTION**: ${translatedDesc}
**TRAITS**: ${traits}
${colorSpec}

**REQUEST**:
Generate a **professional character reference sheet** containing exactly THREE distinct views of this single character on a neutral, solid grey studio background. Do NOT comprise the image with elaborate environments.

**VIEW 1: CLOSE-UP PORTRAIT**
- Focus on face, expression, and head details.
- Sharp focus, perfect lighting.

**VIEW 2: FULL BODY (FRONTAL)**
- Head-to-toe, standing neutrally.
- Showing full outfit and proportions clearly.

**VIEW 3: FULL BODY (SIDE PROFILE)**
- Head-to-toe, side view.
- Showing silhouette and depth.

**STYLE**: ${style}. High detail, 8k resolution, suitable for 3D modeling reference.
    `.trim();
};

/**
 * Builds a prompt for a cinematic scene (Segment)
 * Requirement: Consistent characters, cinematic environment, storytelling.
 */
export const buildScenePrompt = (
    sceneDescription: string,
    characters: CharacterContext[],
    style: string = 'Cinematic, Photo-realistic'
): string => {
    let characterRules = '';

    if (characters && characters.length > 0) {
        const rules = characters.map(c => {
            const traits = [c.gender, c.age, c.hair, c.clothing_style].filter(Boolean).join(', ');
            return `[CHARACTER: ${c.name.toUpperCase()}] -> Looks like: ${c.description}. Traits: ${traits}.`;
        }).join('\n');

        characterRules = `
### CHARACTER CONSISTENCY RULES ###
You MUST maintain the visual identity of the following characters if they appear in the scene:
${rules}
`;
    }

    return `
### CINEMATIC SCENE GENERATION ###

**SCENE DESCRIPTION**:
${sceneDescription}

**VISUAL STYLE**: ${style}

${characterRules}

**INSTRUCTIONS**:
- Generate a single, high-quality cinematic frame.
- Focus on lighting, composition, and mood described in the scene.
- If characters are present, ensure they strictly match their descriptions above.
- NO text overlays, NO split screens, NO UI elements.
- Aspect Ratio: Match the project's aspect ratio.
    `.trim();
};

// ============================================================================
// VIDEO GENERATION PROMPTS (VEO)
// ============================================================================

/**
 * Builds a highly detailed, cinematic prompt for Veo video generation.
 * Translates all descriptions to English for AI model consistency.
 */
export const buildVeoVideoPrompt = async (
    segment: any, // ISegment from Project model
    allCharacters: IDetailedCharacter[],
    projectStyle: string = 'Vintage retro film look',
    language?: string
) => {
    const segmentOrder = segment.order
    const duration = segment.duration || 8

    // Translate project style to English
    const translatedStyle = await translateToEnglish(projectStyle, language)

    // 1. Visual Style Header
    const visualStyleHeader = `VISUAL STYLE: ${translatedStyle}, filmed with real actors and authentic environments. Natural skin tones, professional lighting. NOT CGI, NOT animated, NOT cartoon, NOT stylized, NOT 3D, NOT render. Aspect ratio 16:9 full frame, no black bars.`

    // 2. Location Details (translate to English)
    const loc = segment.locationDetails || {}
    const translatedLocation = await translateToEnglish(loc.type || segment.location, language)
    const translatedLayout = await translateToEnglish(loc.layout || 'Standard layout', language)
    const translatedObjects = await translateToEnglish(loc.objects || 'N/A', language)
    const translatedAtmosphere = await translateToEnglish(loc.atmosphere || segment.mood, language)
    const translatedLighting = await translateToEnglish(loc.lighting || 'Cinematic lighting', language)

    const locationSection = `LOCATION:
- Location: ${translatedLocation}
  Layout: ${translatedLayout}
  Objects: ${translatedObjects}
  Atmosphere: ${translatedAtmosphere}
  Visual Style: ${translatedStyle}
  Lighting: ${translatedLighting}`

    // 3. Characters Section (translate descriptions to English)
    const charSectionPromises = (segment.characters || []).map(async (name: string) => {
        const char = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase())
        if (!char) return `- [UNKNOWN] ${name}`

        // Translate character description
        const translatedDesc = await translateToEnglish(char.description, language)

        const colors = char.color_spec ? `\n  Colors: ${JSON.stringify(char.color_spec)}` : ''
        const traits = `\n  Appearance: ${char.species || 'Human'}, ${char.gender || 'N/A'}, ${char.age || 'N/A'}, ${char.body_build || ''}, ${char.face_shape || ''}, ${char.hair || ''}, ${char.skin_or_fur_color || ''}`
        const outfit = `\n  Outfit: ${char.outfit_top || ''} ${char.outfit_bottom || ''} ${char.shoes_or_footwear || ''} ${char.props || ''}`
        const voice = `\n  Voice: ${char.voice_personality || 'N/A'} [TTS: ${char.tts_config?.voice_id || 'Alnilam'} | pitch=${char.tts_config?.base_pitch || 0} | style=${char.tts_config?.style_category || 'Professional'}]`

        return `- [${char.char_id || 'ID'}] ${char.name} (${char.species || 'Human'}) - ${char.gender || ''}, ${char.age || ''}\n  Description: ${translatedDesc}${traits}${outfit}${voice}`
    })

    const charSection = (await Promise.all(charSectionPromises)).join('\n')

    // 4. Camera & Audio
    const cam = segment.cameraDetails || {}
    const cameraSection = `CAMERA:
- Framing: ${cam.framing || segment.cameraAngle}
- Angle: ${cam.angle || segment.cameraAngle}
- Movement: ${cam.movement || 'Static'}
- Focus: ${cam.focus || 'Deep focus'}`

    const audio = segment.audioDetails || {}
    const audioSection = `AUDIO:
- Ambience: ${audio.ambience || 'Ambient noise'}
- Sound FX: ${audio.sfx || 'N/A'}
- Music: ${audio.music || 'Dramatic score'}`

    // 5. Dialogue Section (keep original language for TTS)
    const dialogueSection = (segment.detailedDialogue || []).map((d: any) => {
        return `- ${d.characterId} [TTS: ${d.tts_config?.voice_id || 'Default'}] (${d.language || 'en-US'}): [${d.line}] [delivery: ${d.delivery}, style: ${d.style}, timing: ${d.timing}]`
    }).join('\n')

    // 6. Subtitle Prevention Block
    const subtitlePrevention = `
======================================================================
CRITICAL VEO GENERATION CONSTRAINT - SUBTITLE PREVENTION
======================================================================
**ABSOLUTELY FORBIDDEN - NEVER GENERATE:**
- Subtitles, captions, or text overlays of ANY kind
- Burnt-in text or visual dialogue transcription
- On-screen text boxes, closed captions, or title cards
- Visual rendering of spoken dialogue as text elements
- Text overlays in ANY language

**REQUIRED - AUDIO-ONLY DELIVERY:**
- ALL dialogue delivered EXCLUSIVELY through audio track
- Final video output MUST contain ZERO text overlays
`

    // Construct Full Prompt
    return `[Segment ${segmentOrder}] 0.0s - ${duration}s
Scene ${segmentOrder} (${duration} seconds):

${visualStyleHeader}

${locationSection}

CHARACTERS:
${charSection || 'None'}

${cameraSection}

${audioSection}

DIALOGUE:
${dialogueSection || 'None'}

LIP SYNC: ${segment.lipSyncRequired ? 'Required for on-screen speakers' : 'None required'}

${subtitlePrevention}`
}

