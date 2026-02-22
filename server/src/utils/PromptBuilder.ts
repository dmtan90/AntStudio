import { IDetailedCharacter } from '../models/Project.js'

/**
 * PROMPT BUILDER UTILITIES
 * Combines logic for character sheets, cinematic scenes, and video generation prompts.
 */

// ============================================================================
// TRANSLATION HELPER
// ============================================================================

export const translateToEnglish = async (text: string, language?: string, translator?: (prompt: string) => Promise<string>): Promise<string> => {
    if (!language || typeof language !== 'string' || language.toLowerCase().includes('english') || language.toLowerCase() === 'en') {
        return text
    }
    if (!translator) {
        console.warn('[PromptBuilder] No translator provided, returning original text');
        return text;
    }
    const prompt = `Translate the following text to English. Only return the translation, nothing else:\n\n${text}`
    try {
        const translation = await translator(prompt)
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
    hair_style_and_color?: string;
    body_build?: string;
    face_shape?: string;
    skin_or_fur_color?: string;
    skin_complexion?: string;
    eye_color?: string;
    eyes?: string;
    signature_feature?: string;
    clothing?: string;
    outfit_top?: string;
    outfit_bottom?: string;
    headwear?: string;
    props?: string;
    color_spec?: any;
    species?: string;
    clothing_style?: string;
    personality_traits?: string;
    overall_energy?: string;
    voice_personality?: string;
    loras?: Array<{ id: string; trigger?: string; weight: number }>;
}

// ============================================================================
// GROUNDING HELPER
// ============================================================================

export const getProjectGroundingPrompt = (projectAnalysis: any, options: { skipCharacters?: boolean } = {}): string => {
    if (!projectAnalysis) return '';
    const characters = options.skipCharacters ? [] : (projectAnalysis.characters || []);
    const locations = projectAnalysis.locations || [];
    const visuals = projectAnalysis.visuals || {};

    if (!characters.length && !locations.length) {
        // Even if no characters/locations, we might want the visual style context
        if (!visuals.visualWorldRules) return '';
    }

    const charSection = characters.length > 0 ? `
**CHARACTERS**:
${characters.map((c: any) => {
    const pt = c.physical_traits || {};
    const traits = [
        c.species, c.gender, c.age,
        pt.body, pt.hair, pt.eyes, pt.skin,
        c.clothing, c.signature_feature
    ].filter(Boolean).join(', ');
    return `- [CHAR: ${c.char_id || (c.name || '').toUpperCase()}] ${c.name}: ${c.description}. Traits: ${traits}.`
}).join('\n')}` : '';

    const locSection = locations.length > 0 ? `
**LOCATIONS**:
${locations.map((l: any) => {
    return `- [LOC: ${l.name?.toUpperCase()}] ${l.name}: ${l.description || l.atmosphere}.`
}).join('\n')}` : '';

    const worldRules = visuals.visualWorldRules || {};
    const lighting = worldRules.lighting || 'Cinematic';
    const physics = worldRules.physics || 'Realistic';

    return `
### PROJECT VISUAL CONTEXT & GROUNDING ###
Use the following definitions to ensure visual and narrative consistency. 

**STRICT ADHERENCE TO THESE DESCRIPTIONS IS REQUIRED.**
${charSection}
${locSection}

**VISUAL STYLE CONTEXT**:
- Lighting: ${lighting}
- Physics/Vibe: ${physics}
`.trim();
};

// ============================================================================
// IMAGE GENERATION PROMPTS
// ============================================================================

export const buildCharacterSheetPrompt = async (
    character: CharacterContext,
    style: string = 'Cinematic, Photo-realistic',
    projectAnalysis?: any,
    language?: string,
    translator?: (prompt: string) => Promise<string>
): Promise<string> => {
    // For character sheets, we skip the main character list in grounding to avoid model confusion/duplication
    const grounding = "";//getProjectGroundingPrompt(projectAnalysis, { skipCharacters: true });
    const translatedDesc = await translateToEnglish(character.description, language, translator)
    
    // Global context
    const worldRules = projectAnalysis?.visuals?.visualWorldRules || {};
    const lighting = projectAnalysis?.visuals?.visualWorldRules?.lighting || 'Studio lighting';
    const physics = projectAnalysis?.visuals?.visualWorldRules?.physics || 'Realistic';

    const traitsArr = [
        character.species ? `Species: ${character.species}` : '',
        character.gender ? `Gender: ${character.gender}` : '',
        character.age ? `Age: ${character.age}` : '',
        character.body_build ? `Body: ${character.body_build}` : '',
        character.face_shape ? `Face Shape: ${character.face_shape}` : '',
        character.hair || character.hair_style_and_color ? `Hair: ${character.hair || character.hair_style_and_color}` : '',
        character.eyes || character.eye_color ? `Eyes: ${character.eyes || character.eye_color}` : '',
        character.skin_or_fur_color || character.skin_complexion ? `Skin/Fur: ${character.skin_or_fur_color || character.skin_complexion}` : '',
        character.signature_feature ? `Signature Feature: ${character.signature_feature}` : '',
        character.outfit_top ? `Outfit Top: ${character.outfit_top}` : '',
        character.outfit_bottom ? `Outfit Bottom: ${character.outfit_bottom}` : '',
        character.headwear ? `Headwear: ${character.headwear}` : '',
        character.props ? `Props: ${character.props}` : '',
        character.overall_energy ? `Energy: ${character.overall_energy}` : ''
    ].filter(Boolean);

    let traits = traitsArr.join(', ');
    
    // Fallback: If traits are too sparse, try to use the description or personality to add flavor
    if (traitsArr.length < 3 && translatedDesc) {
        traits += `. Context: ${translatedDesc.substring(0, 100)}`;
    }

    const styleInstructions = character.loras?.map(l => l.trigger).filter(Boolean).join(', ') || style;


    return `
${grounding}

### CHARACTER REFERENCE SHEET ###
**VISUAL STYLE**: ${style}
**SUBJECT**: ${character.name}
**DESCRIPTION**: ${translatedDesc}
**TRAITS**: ${traits}
**GLOBAL STYLE RULES**: Physics: ${physics}, Lighting: ${lighting}
**STYLE INSTRUCTIONS**: ${styleInstructions}

Generate 3 views: portrait, front full body, side profile. Neutral background. High fidelity.
`.trim();
};

export const buildScenePrompt = async (
    sceneDescription: string,
    characters: CharacterContext[],
    style: string = 'Cinematic, Photo-realistic',
    projectAnalysis?: any,
    language?: string,
    translator?: (prompt: string) => Promise<string>
): Promise<string> => {
    const translatedStyle = await translateToEnglish(style, language, translator);
    const translatedScene = await translateToEnglish(sceneDescription, language, translator);

    const charRulesPromises = characters.map(async (c) => {
        const triggers = c.loras?.map(l => l.trigger).filter(Boolean).join(', ') || '';
        const translatedCharDesc = await translateToEnglish(c.description, language, translator);
        const traits = [
            c.species, 
            c.gender, 
            c.age, 
            c.body_build, 
            c.face_shape, 
            c.hair || (c as any).hair_style_and_color, 
            c.eyes || (c as any).eye_color,
            c.skin_or_fur_color || (c as any).skin_complexion,
            c.signature_feature
        ].filter(Boolean).join(', ');
        return `[CHARACTER: ${c.name.toUpperCase()}] -> ${translatedCharDesc}. Physical: ${traits}. Style: ${triggers}`;
    });

    const charRules = (await Promise.all(charRulesPromises)).join('\n');

    // Global context
    const worldRules = projectAnalysis?.visuals?.visualWorldRules || {};
    const lighting = worldRules.lighting || 'Cinematic lighting';
    const physics = worldRules.physics || 'Realistic';
    const palette = worldRules.colorHarmony?.map((c: any) => `${c.name} (${c.hex})`).join(', ') || '';

    const grounding = getProjectGroundingPrompt(projectAnalysis);

    return `
${grounding}

### CINEMATIC SCENE ###
**DESCRIPTION**: ${translatedScene}
**STYLE**: ${translatedStyle}
**GLOBAL RULES**: Physics: ${physics}, Lighting: ${lighting}
**PALETTE**: ${palette || 'Natural colors'}
${charRules}
Generate high-quality cinematic frame. STRICT ADHERENCE TO VISUAL STYLE IS MANDATORY.

`.trim();
};

// ============================================================================
// VIDEO GENERATION (VEO) - HIGH FIDELITY
// ============================================================================

export const buildVeoVideoPrompt = async (
    segment: any,
    allCharacters: any[], // Use any to allow full IDetailedCharacter + actor_background fields
    projectAnalysis: any,
    language?: string,
    translator?: (prompt: string) => Promise<string>
) => {
    const projectStyle = projectAnalysis?.creativeBrief?.visualStyle || projectAnalysis?.visuals?.visualStyle?.label || 'Cinematic, high fidelity';
    const translatedStyle = await translateToEnglish(projectStyle, language, translator);

    
    // 0. Global Visual Context
    const globalStyle = projectAnalysis?.visuals?.visualStyle || {};
    const worldRules = projectAnalysis?.visuals?.visualWorldRules || {};
    const colorHarmony = worldRules.colorHarmony?.map((c: any) => `${c.name} (${c.hex}): ${c.usage}`).join(', ') || '';

    const globalContextPrompt = `
**GLOBAL STYLE CONTEXT**
- Category: ${globalStyle.category || 'N/A'}
- Description: ${await translateToEnglish(globalStyle.description || '', language, translator)}
- World Physics: ${await translateToEnglish(worldRules.physics || 'Realistic', language, translator)}
- Lighting Model: ${await translateToEnglish(worldRules.lighting || 'Cinematic', language, translator)}
- Color Harmony: ${colorHarmony || 'Natural colors'}
`.trim();

    // 1. Resolve Location Details
    const loc = segment.locationDetails || {};
    const locationPrompt = loc.type ? `
**LOCATION**
- Type: ${await translateToEnglish(loc.type, language, translator)}
- Atmosphere: ${await translateToEnglish(loc.atmosphere || 'Cinematic', language, translator)}
- Lighting: ${await translateToEnglish(loc.lighting || 'Natural', language, translator)}
- Layout: ${await translateToEnglish(loc.layout || 'Wide', language, translator)}
- Visual Style: ${translatedStyle}
`.trim() : `**LOCATION**: ${await translateToEnglish(segment.location || 'Unknown', language, translator)} (${translatedStyle})`;

    // 2. Resolve Camera Details
    const cam = segment.cameraDetails || {};
    const cameraPrompt = cam.framing ? `
**CAMERA**
- Framing: ${cam.framing}
- Angle: ${cam.angle || 'Eye-level'}
- Movement: ${cam.movement || 'Static'}
- Focus: ${cam.focus || 'Deep focus'}
`.trim() : `**CAMERA**: ${segment.cameraAngle || 'Cinematic Framing'}`;

    // 3. Resolve Character Details
    const charSectionPromises = (segment.characters || []).map(async (name: string) => {
        const char = allCharacters.find(c => (c.name || '').toLowerCase() === name.toLowerCase());
        if (!char) return `- [UNKNOWN] ${name}`;
        
        const translatedDesc = await translateToEnglish(char.description, language, translator);
        const pt = char.physical_traits || {};
        const tts = char.tts_config || {};
        const physical = [
            char.species,
            char.gender,
            char.age,
            pt.body || char.body_build, 
            pt.skin || char.skin_complexion || char.skin_or_fur_color, 
            pt.eyes || char.eye_color, 
            pt.hair || char.hair_style_and_color || char.hair, 
            char.clothing || char.clothing_and_accessories || `${char.outfit_top}, ${char.outfit_bottom}`,
            char.signature_feature
        ].filter(Boolean).join(', ');

        const voiceTag = tts.voice_id ? `[TTS: ${tts.voice_id} | pitch: ${tts.pitch || 0.0} | rate: ${tts.rate || 1.0} | personality: ${char.voice_personality || 'natural'}]` : '';

        return `- [CHAR: ${char.name.toUpperCase()}] ${translatedDesc}. Physical: ${physical}. ${voiceTag} Action: ${await translateToEnglish(segment.description, language, translator)}`;
    });
    const charSection = (await Promise.all(charSectionPromises)).join('\n');

    // 4. Resolve Audio details
    const audio = segment.audioDetails || {};
    const audioPrompt = audio.ambience ? `
**AUDIO PRODUCTION**
- Ambience: ${await translateToEnglish(audio.ambience, language, translator)}
- SFX: ${await translateToEnglish(audio.sfx || 'None', language, translator)}
- Music Score: ${await translateToEnglish(audio.music || 'None', language, translator)} (Mood: ${segment.mood || 'Matching scene theme'})
- Sound Cues: ${segment.audioKeywords?.join(', ') || 'N/A'}
`.trim() : `**AUDIO**: ${segment.mood || 'Cinematic'}`;

    // 5. Resolve Dialogue
    const dialogues = (segment.detailedDialogue || []).map((d: any) => 
        `[DIALOGUE] ${d.characterName}: "${d.line}" (${d.delivery || 'natural delivery'})`
    ).join('\n');

    const grounding = getProjectGroundingPrompt(projectAnalysis);

    return `
${grounding}

### HIGH FIDELITY VIDEO GENERATION PROMPT ###
[SEGMENT ${segment.order}] [DURATION: ${segment.duration}s]

${globalContextPrompt}

${locationPrompt}

${cameraPrompt}

**CHARACTERS**
${charSection}

${audioPrompt}

**DIALOGUE**
${dialogues || segment.voiceover || 'None'}

**VISUAL KEYWORDS**
${segment.visualKeywords?.join(', ') || 'Cinematic, High Fidelity'}

**INSTRUCTIONS**
- NO TEXT OVERLAYS.
- High cinematic fidelity.
- Style: ${translatedStyle}.
- Strict adherence to World Physics and Lighting Model.
- Maintain character consistency based on Physical traits defined.
`.trim();

};

// ============================================================================
// AUDIO GENERATION (TTS & MUSIC)
// ============================================================================

export const buildVoiceoverPrompt = async (
    text: string,
    characterName: string,
    allCharacters: any[],
    language?: string,
    translator?: (prompt: string) => Promise<string>
): Promise<string> => {
    const char = allCharacters.find(c => (c.name || '').toLowerCase() === characterName.toLowerCase());
    const voiceProfile = char?.voice_profile || {};
    const translatedText = await translateToEnglish(text, language, translator);

    const context = [
        voiceProfile.gender ? `Gender: ${voiceProfile.gender}` : '',
        voiceProfile.age ? `Age: ${voiceProfile.age}` : '',
        voiceProfile.accent ? `Accent: ${voiceProfile.accent}` : '',
        voiceProfile.tone ? `Tone: ${voiceProfile.tone}` : '',
        voiceProfile.description ? `Description: ${voiceProfile.description}` : ''
    ].filter(Boolean).join('. ');

    return `
### VOICEOVER SCRIPT ###
**CHARACTER**: ${characterName}
**VOICE PROFILE**: ${context || 'Natural, expressive'}
**TEXT**: ${translatedText}

IMPORTANT: Only generate the audio for the content in the TEXT section. Do not read the metadata headers (CHARACTER, VOICE PROFILE, TEXT) or labels.
Generate a clear, high-quality voiceover following the character's profile and delivery notes.
`.trim();
};

export const buildMusicPrompt = async (
    moodDescription: string,
    projectAnalysis: any,
    language?: string,
    translator?: (prompt: string) => Promise<string>
): Promise<string> => {
    const genre = projectAnalysis?.overview?.genre || 'Cinematic';
    const themes = projectAnalysis?.overview?.themes || 'Atmospheric';
    const translatedMood = await translateToEnglish(moodDescription, language, translator);

    return `
### BACKGROUND MUSIC PROMPT ###
**GENRE**: ${genre}
**THEMES**: ${themes}
**MOOD**: ${translatedMood}

Generate a high-quality cinematic background track that matches the project's genre and mood.
`.trim();
};
