import { IDetailedCharacter } from '../models/Project'

/**
 * Builds a highly detailed, cinematic prompt for Veo video generation.
 */
export const buildVeoVideoPrompt = (
    segment: any, // ISegment from Project model
    allCharacters: IDetailedCharacter[],
    projectStyle: string = 'Vintage retro film look'
) => {
    const segmentOrder = segment.order
    const duration = segment.duration || 8

    // 1. Visual Style Header
    const visualStyleHeader = `VISUAL STYLE: ${projectStyle}, filmed with real actors and authentic environments. Natural skin tones, professional lighting. NOT CGI, NOT animated, NOT cartoon, NOT stylized, NOT 3D, NOT render. Aspect ratio 16:9 full frame, no black bars.`

    // 2. Location Details
    const loc = segment.locationDetails || {}
    const locationSection = `LOCATION:
- Location: ${loc.type || segment.location}
  Layout: ${loc.layout || 'Standard layout'}
  Objects: ${loc.objects || 'N/A'}
  Atmosphere: ${loc.atmosphere || segment.mood}
  Visual Style: ${loc.visualStyle || projectStyle}
  Lighting: ${loc.lighting || 'Cinematic lighting'}`

    // 3. Characters Section
    const charSection = (segment.characters || []).map((name: string) => {
        const char = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase())
        if (!char) return `- [UNKNOWN] ${name}`

        const colors = char.color_spec ? `\n  Colors: ${JSON.stringify(char.color_spec)}` : ''
        const traits = `\n  Appearance: ${char.species || 'Human'}, ${char.gender || 'N/A'}, ${char.age || 'N/A'}, ${char.body_build || ''}, ${char.face_shape || ''}, ${char.hair || ''}, ${char.skin_or_fur_color || ''}`
        const outfit = `\n  Outfit: ${char.outfit_top || ''} ${char.outfit_bottom || ''} ${char.shoes_or_footwear || ''} ${char.props || ''}`
        const voice = `\n  Voice: ${char.voice_personality || 'N/A'} [TTS: ${char.tts_config?.voice_id || 'Alnilam'} | pitch=${char.tts_config?.base_pitch || 0} | style=${char.tts_config?.style_category || 'Professional'}]`

        return `- [${char.char_id || 'ID'}] ${char.name} (${char.species || 'Human'}) - ${char.gender || ''}, ${char.age || ''}${traits}${outfit}${voice}`
    }).join('\n')

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

    // 5. Dialogue Section
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
