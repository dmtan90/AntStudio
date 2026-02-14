import { IDetailedCharacter } from '../models/Project.js'
import { generateText } from './AIGenerator.js'

/**
 * PROMPT BUILDER UTILITIES
 * Combines logic for character sheets, cinematic scenes, and video generation prompts.
 */

// ============================================================================
// TRANSLATION HELPER
// ============================================================================

export const translateToEnglish = async (text: string, language?: string): Promise<string> => {
    if (!language || language.toLowerCase().includes('english') || language.toLowerCase() === 'en') {
        return text
    }
    const prompt = `Translate the following text to English. Only return the translation, nothing else:\n\n${text}`
    try {
        const translation = await generateText(prompt, 'gemini-2.5-flash')
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
    loras?: Array<{ id: string; trigger?: string; weight: number }>;
}

// ============================================================================
// IMAGE GENERATION PROMPTS
// ============================================================================

export const buildCharacterSheetPrompt = async (
    character: CharacterContext,
    style: string = 'Cinematic, Photo-realistic',
    language?: string
): Promise<string> => {
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

    const styleInstructions = character.loras?.map(l => l.trigger).filter(Boolean).join(', ') || style;

    return `
### CHARACTER REFERENCE SHEET ###
**SUBJECT**: ${character.name}
**DESCRIPTION**: ${translatedDesc}
**TRAITS**: ${traits}
**STYLE**: ${styleInstructions}

Generate 3 views: portrait, front full body, side profile. Neutral background. High fidelity.
`.trim();
};

export const buildScenePrompt = (
    sceneDescription: string,
    characters: CharacterContext[],
    style: string = 'Cinematic, Photo-realistic'
): string => {
    const charRules = characters.map(c => {
        const triggers = c.loras?.map(l => l.trigger).filter(Boolean).join(', ') || '';
        return `[CHARACTER: ${c.name.toUpperCase()}] -> ${c.description}. Style: ${triggers}`;
    }).join('\n');

    return `
### CINEMATIC SCENE ###
**DESCRIPTION**: ${sceneDescription}
**STYLE**: ${style}
${charRules}
Generate high-quality cinematic frame.
`.trim();
};

// ============================================================================
// VIDEO GENERATION (VEO)
// ============================================================================

export const buildVeoVideoPrompt = async (
    segment: any,
    allCharacters: IDetailedCharacter[],
    projectStyle: string = 'Vintage retro film look',
    language?: string
) => {
    const translatedStyle = await translateToEnglish(projectStyle, language);

    const charSectionPromises = (segment.characters || []).map(async (name: string) => {
        const char = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase());
        if (!char) return `- [UNKNOWN] ${name}`;
        const translatedDesc = await translateToEnglish(char.description, language);
        return `- ${char.name}: ${translatedDesc} (${char.species || 'Human'})`;
    });

    const charSection = (await Promise.all(charSectionPromises)).join('\n');

    return `
[Segment ${segment.order}] ${segment.duration}s
STYLE: ${translatedStyle}
CHARACTERS:
${charSection}
SCENE: ${segment.description}
NO TEXT OVERLAYS.
`.trim();
};
