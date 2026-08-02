import { IDetailedCharacter } from '../models/Project.js'
import { Logger } from './Logger.js';
import { promptService } from '../services/ai/PromptService.js';

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
        Logger.warn('[PromptBuilder] No translator provided, returning original text', 'PromptBuilder');
        return text;
    }
    const prompt = await promptService.get('common/translation', { text });
    try {
        const translation = await translator(prompt)
        return translation.trim()
    } catch (error) {
        Logger.error(`Translation failed, using original text: ${error}`, 'PromptBuilder');
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
    nationality?: string;
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
    translator?: (prompt: string) => Promise<string>,
    views: string = 'portrait, front full body, side profile',
    greenScreen: boolean = false,
): Promise<string> => {
    const grounding = "";
    const translatedDesc = await translateToEnglish(character.description, language, translator)
    
    // Global context
    const worldRules = projectAnalysis?.visuals?.visualWorldRules || {};
    const lighting = worldRules.lighting || 'Studio lighting';
    const physics = worldRules.physics || 'Realistic';

    const traitsArr = [
        // Nationality first — most specific identity signal for the AI
        character.nationality ? `Nationality: ${character.nationality}` : '',
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
    if (traitsArr.length < 3 && translatedDesc) {
        traits += `. Context: ${translatedDesc.substring(0, 100)}`;
    }

    const styleInstructions = character.loras?.map(l => l.trigger).filter(Boolean).join(', ') || style;

    return await promptService.get('image_generation/character_sheet', {
        grounding,
        style,
        name: character.name,
        description: translatedDesc,
        traits,
        physics,
        lighting,
        styleInstructions,
        views,
        backgroundInstructions: greenScreen ? 'Green screen background.' : 'Neutral background.'
    });
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

    return await promptService.get('image_generation/scene', {
        grounding,
        sceneDescription: translatedScene,
        style: translatedStyle,
        physics,
        lighting,
        palette: palette || 'Natural colors',
        charRules
    });
};

// ============================================================================
// STORYBOARD & PROJECT PLANNING
// ============================================================================

export const buildStoryboardPrompt = async (
    scriptOrTopic: string,
    projectAnalysis: any,
    targetDuration: number = 60,
    language: string = 'English',
    translator?: (prompt: string) => Promise<string>,
    useGreenScreen?: boolean
): Promise<string> => {
    const grounding = getProjectGroundingPrompt(projectAnalysis);
    const translatedInput = await translateToEnglish(scriptOrTopic, language, translator);

    return await promptService.get('video_creation/storyboard_gen', {
        grounding,
        translatedInput,
        targetDuration,
        language,
        useGreenScreen,
        greenScreenEnforcement: useGreenScreen ? '\n### GREEN SCREEN ENFORCEMENT ###\n- ALL visual descriptions and prompts MUST specify a pure, flat, evenly lit GREEN SCREEN background (#00FF00).' : ''
    });
};

// ============================================================================
// VIDEO GENERATION (VEO) - HIGH FIDELITY
// ============================================================================

export const buildVeoVideoPrompt = async (
    segment: any,
    allCharacters: any[], // Use any to allow full IDetailedCharacter + actor_background fields
    projectAnalysis: any,
    language?: string,
    translator?: (prompt: string) => Promise<string>,
    useGreenScreen?: boolean
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

    return await promptService.get('video_generation/high_fidelity', {
        grounding,
        order: segment.order,
        duration: segment.duration,
        globalContextPrompt,
        locationPrompt,
        cameraPrompt,
        charSection,
        audioPrompt,
        dialogues: dialogues || segment.voiceover || 'None',
        visualKeywords: segment.visualKeywords?.join(', ') || 'Cinematic, High Fidelity',
        style: translatedStyle,
        greenScreenEnforcement: useGreenScreen ? '- MANDATORY: Use a pure flat GREEN SCREEN background (Hex #00FF00) for this segment.' : ''
    });

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

    return await promptService.get('audio_generation/voiceover', {
        characterName,
        voiceProfile: context || 'Natural, expressive',
        text: translatedText
    });
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

    return await promptService.get('audio_generation/music', {
        genre,
        themes,
        mood: translatedMood
    });
};

// ============================================================================
// CONTENT ANALYSIS & METADATA
// ============================================================================

export const buildHighlightsPrompt = async (context: string): Promise<string> => {
    return await promptService.get('analysis/highlights', { context });
};

export const buildSocialMetaPrompt = async (contentSummary: string): Promise<string> => {
    return await promptService.get('analysis/social_meta', { contentSummary });
};

export const buildTranslationPrompt = async (text: string, targetLanguage: string): Promise<string> => {
    return await promptService.get('common/language_translation', { text, targetLanguage });
};

// ============================================================================
// STUDIO & INTERACTIVE AI PROMPTS
// ============================================================================

export const buildVeoProductPrompt = async (config: {
    productName: string,
    metadata: { style: string, category: string },
    vibe: string,
    customEvent?: string
}): Promise<string> => {
    const { productName, metadata, vibe, customEvent } = config;
    let basePrompt = '';

    if (customEvent && customEvent.startsWith('product')) {
        basePrompt = `A charming woman wearing the ${productName}, showing off the ${metadata.style} detail.`;
    } else if (customEvent && customEvent.startsWith('checkout')) {
        basePrompt = `A charming woman pointing at the ${productName} with excitement, encouraging viewers to buy.`;
    } else {
        switch (metadata.category) {
            case 'clothing':
                basePrompt = `A stunning young woman wearing a ${metadata.style} ${productName}, showcasing the fabric detail and fit.`;
                break;
            case 'tech':
                basePrompt = `Close-up cinematic shot of the ${productName}, showing its sleek design and advanced features.`;
                break;
            case 'beauty':
                basePrompt = `Professional close-up of a model applying ${productName}, focusing on the smooth texture and vibrant color.`;
                break;
            default:
                basePrompt = `A lifestyle preview of the ${productName} in a ${vibe} studio setting.`;
        }
    }

    const lighting = vibe === 'hype' ? 'dynamic flashing neon lights' :
                     vibe === 'chill' ? 'soft warm morning light' :
                     vibe === 'professional' ? 'clean studio lighting' : 'natural light';

    return await promptService.get('studio/veo_video', {
        base_prompt: basePrompt,
        lighting
    });
};

export const buildOrchestratorTurnPrompt = async (data: {
    name: string,
    instruction: string,
    history: string,
    vibeMood?: string,
    vision?: string
}): Promise<string> => {
    const vibeLead = data.vibeMood ? `[Environment Vibe: ${data.vibeMood}] ` : '';
    const visionContext = data.vision ? `[Visual Context: ${data.vision}] ` : '';

    return await promptService.get('studio/orchestrator_turn', {
        vibe_lead: vibeLead,
        vision_context: visionContext,
        history: data.history,
        name: data.name,
        instruction: data.instruction
    });
};

export const buildVisionReactionPrompt = async (data: {
    visionData: any,
    context: string
}): Promise<string> => {
    return await promptService.get('studio/vision_reaction', {
        vision_data: JSON.stringify(data.visionData),
        context: data.context
    });
};

export const buildChatReactionPrompt = async (data: {
    chatText: string,
    socialNote?: string,
    directive?: string
}): Promise<string> => {
    return await promptService.get('studio/chat_reaction', {
        chat_text: data.chatText,
        social_note: data.socialNote || '',
        directive_context: data.directive ? `ShowRunner Directive: ${data.directive}.` : ''
    });
};

export const buildBanterPrompt = async (data: {
    type: 'init' | 'reply',
    targetName: string,
    socialContext: string,
    otherName?: string,
    text?: string
}): Promise<string> => {
    if (data.type === 'init') {
        return await promptService.get('studio/banter_init', {
            target_name: data.targetName,
            social_context: data.socialContext
        });
    } else {
        return await promptService.get('studio/banter_reply', {
            other_name: data.otherName || 'The other guest',
            text: data.text || '',
            social_context: data.socialContext
        });
    }
};

export const buildResearchTopicPrompt = async (data: {
    topic: string
}): Promise<string> => {
    return await promptService.get('studio/research_topic', {
        topic: data.topic
    });
};

export const buildKnowledgeExplanationPrompt = async (data: {
    topic: string,
    facts: any
}): Promise<string> => {
    return await promptService.get('studio/knowledge_explanation', {
        topic: data.topic,
        facts: JSON.stringify(data.facts)
    });
};

// ============================================================================
// CORE AI ROUTE PROMPTS (ai.ts)
// ============================================================================

export const buildKnowledgeSearchPrompt = async (data: {
    query: string,
    context?: string,
    historicalContext?: string,
    language?: string
}): Promise<string> => {
    return await promptService.get('ai/knowledge_search', {
        query: data.query,
        context: data.context || '',
        historicalContext: data.historicalContext || '',
        language: data.language || 'en'
    });
};

export const buildGeneratePollPrompt = async (data: {
    topic: string,
    context?: string,
    directive?: string
}): Promise<string> => {
    return await promptService.get('ai/generate_poll', {
        topic: data.topic,
        context: data.context || '',
        directive: data.directive || ''
    });
};

export const buildVerifyFactPrompt = async (data: {
    claim: string,
    context?: string,
    strictness?: string
}): Promise<string> => {
    return await promptService.get('ai/verify_fact', {
        claim: data.claim,
        context: data.context || '',
        strictness: data.strictness || 'normal'
    });
};

export const buildAdHeadlinesPrompt = async (data: {
    product_name: string,
    description: string
}): Promise<string> => {
    return await promptService.get('ai/ad_headlines', {
        product_name: data.product_name,
        description: data.description
    });
};

export const buildAdSubheadlinesPrompt = async (data: {
    product_name: string,
    description: string
}): Promise<string> => {
    return await promptService.get('ai/ad_subheadlines', {
        product_name: data.product_name,
        description: data.description
    });
};

export const buildAdCTAPrompt = async (data: {
    name: string,
    description: string,
    objective: string
}): Promise<string> => {
    return await promptService.get('ai/ad_cta', {
        name: data.name,
        description: data.description,
        objective: data.objective
    });
};

export const buildVisionAnalyzePrompt = async (data: {
    prompt: string
}): Promise<string> => {
    return await promptService.get('ai/vision_analyze', {
        prompt: data.prompt
    });
};

export const buildVisionOCRPrompt = async (): Promise<string> => {
    return await promptService.get('ai/vision_ocr');
};

export const buildVisionFacesPrompt = async (): Promise<string> => {
    return await promptService.get('ai/vision_faces');
};

export const buildVisionObjectsPrompt = async (): Promise<string> => {
    return await promptService.get('ai/vision_objects');
};

export const buildVisionCaptionPrompt = async (): Promise<string> => {
    return await promptService.get('ai/vision_caption');
};

export const buildGuestSystemPrompt = async (data: {
    influencer: any,
    input: any,
    flashbacks: string[]
}): Promise<string> => {
    const getSystemInstruction = (input: any) => {
        switch (input.type) {
            case 'chat':
                return `A viewer named ${input.userName} said: "${input.content}". Reply directly to them. Be concise and engaging.`;
            case 'gift':
                return `A viewer named ${input.userName} sent a gift: ${input.content}. Express gratitude and excitement! High energy!`;
            case 'poll':
                return `React to the poll results: ${input.content}. Share your opinion on the winner.`;
            case 'dialogue':
                let inst = input.content;
                if (input.context?.vibe) inst += ` [Vibe: ${input.context.vibe}]`;
                if (input.context?.vision) inst += ` [Visual: ${input.context.vision}]`;
                return inst;
            default:
                return input.content;
        }
    };

    return await promptService.get('ai/guest_system', {
        name: data.influencer.identity.name,
        description: data.influencer.identity.description,
        traits: data.influencer.identity.traits.join(', '),
        relationships: data.influencer.social?.relationships.map((r: any) => `- ${r.targetName} (${r.type}): Level ${r.level}/100 - ${r.description || 'No established bond'}`).join('\n') || 'No established relationships.',
        vibe: data.input.context?.vibe || 'Neutral',
        vision: data.input.context?.vision || 'Normal room setup',
        flashbacks: data.flashbacks.length > 0 ? `CONTEXTUAL FLASHBACKS (Long-term Memory):\n${data.flashbacks.map(f => `- ${f}`).join('\n')}` : '',
        systemInstruction: getSystemInstruction(data.input),
        keyEvents: data.influencer.memory.keyEvents.slice(-5).map((e: any) => `- ${e.description} (${new Date(e.date).toLocaleDateString()})`).join('\n'),
        summary: data.influencer.memory.summaries.slice(-1)[0] || 'No summary available.'
    });
};

export const buildGuestNormalizePrompt = async (data: {
    text: string,
    vibe?: string
}): Promise<string> => {
    return await promptService.get('ai/guest_normalize', {
        text: data.text,
        vibe: data.vibe || 'Neutral'
    });
};

export const buildAnalyzeProductPrompt = async (data: {
    contextType: string,
    contentToAnalyze: string,
    sourceUrl?: string
}): Promise<string> => {
    return await promptService.get('analysis/analyze_product', {
        contextType: data.contextType,
        contentToAnalyze: data.contentToAnalyze,
        sourceUrl: data.sourceUrl || ''
    });
};

export const buildAvatarVideoPrompt = async (data: {
    script: string,
    background?: string,
}): Promise<string> => {
    return await promptService.get('video_generation/avatar_video', {
        script: data.script,
        background: data.background || 'Professional studio background, neutral lighting'
    });
};

export const buildPresentationAnalyzePrompt = async (data: {
    slideNumber: number,
    slideText: string
}): Promise<string> => {
    return await promptService.get('analysis/presentation_analyze', {
        slideNumber: data.slideNumber,
        slideText: data.slideText
    });
};

export const buildTranslateTextPrompt = async (data: {
    sourceLang?: string,
    targetLang?: string
}): Promise<string> => {
    return await promptService.get('common/translate_text', {
        sourceLang: data.sourceLang || 'auto',
        targetLang: data.targetLang || 'English'
    });
};

export const buildTrendingTopicsPrompt = async (data: {
    context: string,
    lang: string
}): Promise<string> => {
    return await promptService.get('ai/trending_topics', {
        context: data.context,
        lang: data.lang
    });
};
export const buildFlowVideoNormalizePrompt = async (prompt: string): Promise<string> => {
    return await promptService.get('video_generation/normalize_flow_prompt', {
        prompt
    });
};

export const getFlowVideoConstraints = async (): Promise<string> => {
    return await promptService.get('video_generation/flow_constraints');
};
