import { EventEmitter } from 'events';
import { GoogleGenAI, Modality } from '@google/genai';
import { GeminiLiveSession } from '~/models/GeminiLiveSession.js';
import { InfluencerService } from '~/services/InfluencerService.js';
import { Influencer } from '~/models/Influencer.js';
import { User } from '~/models/User.js';
import { aiAgentBus } from '~/services/ai/AIAgentBus.js';
import { questService } from '~/services/ai/QuestService.js';
import { getAdminSettings } from '~/models/AdminSettings.js';
import { Logger } from '~/utils/Logger.js';
import { AIServiceManager } from '~/utils/ai/AIServiceManager.js';
import { GeminiClient } from '~/integrations/ai/GeminiClient.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
interface LiveSessionConfig {
    userId: string;
    archiveId: string;
    projectId?: string; // Grouping sessions for swarming
    voiceName: string;
    systemInstruction?: string;
    isMaster?: boolean;
    liveContext?: string;
    modelType?: string;
    resumptionHandle?: string;
    language?: string;
}

interface AudioChunk {
    data: string; // base64 encoded PCM
    mimeType: string;
}

interface FunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

interface SessionData {
    session: any;
    userId: string;
    archiveId: string;
    apiKey: string;
    modelName: string;
    projectId?: string;
    audioQueue: any[];
    swarmListener?: (msg: any) => void;
    isDisconnected?: boolean;
    disconnectTimer?: NodeJS.Timeout;
    startTime?: number;
    resumptionHandle?: string;
    voiceName?: string;
    modelType?: string;
    isMaster?: boolean;
    liveContext?: string;
    language?: string;
    characterName?: string;
}

const SUPPORTED_LIVE_VOICES = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede'];

// Avatar control tools
const AVATAR_TOOLS: FunctionDeclaration[] = [
    {
        name: 'change_expression',
        description: 'Change the avatar facial expression to match the conversation mood',
        parameters: {
            type: 'object',
            properties: {
                expression: {
                    type: 'string',
                    enum: ['happy', 'sad', 'surprised', 'neutral', 'excited', 'thinking'],
                    description: 'The facial expression to display'
                }
            },
            required: ['expression']
        }
    },
    {
        name: 'play_animation',
        description: 'Play a specific avatar animation or gesture',
        parameters: {
            type: 'object',
            properties: {
                animation: {
                    type: 'string',
                    enum: ['wave', 'nod', 'shake_head', 'thumbs_up', 'clap', 'point'],
                    description: 'The animation to play'
                }
            },
            required: ['animation']
        }
    },
    {
        name: 'change_mood',
        description: 'Change the overall mood/atmosphere of the avatar',
        parameters: {
            type: 'object',
            properties: {
                mood: {
                    type: 'string',
                    enum: ['energetic', 'calm', 'professional', 'playful', 'serious'],
                    description: 'The mood to set'
                }
            },
            required: ['mood']
        }
    },
    {
        name: 'switch_scene',
        description: 'Switch the active studio scene to a different layout or camera focus',
        parameters: {
            type: 'object',
            properties: {
                sceneId: {
                    type: 'string',
                    enum: ['host_focus', 'guest_focus', 'grid_auto', 'side_by_side', 'mobile_focus'],
                    description: 'The ID of the scene to switch to'
                }
            },
            required: ['sceneId']
        }
    },
    {
        name: 'trigger_graphic',
        description: 'Show or hide on-screen studio graphics like tickers or lower thirds',
        parameters: {
            type: 'object',
            properties: {
                type: {
                    type: 'string',
                    enum: ['lower_third', 'ticker'],
                    description: 'The type of graphic to control'
                },
                action: {
                    type: 'string',
                    enum: ['show', 'hide', 'toggle'],
                    description: 'The action to perform'
                },
                name: {
                    type: 'string',
                    description: 'The name to display on the lower third (if type is auto_lower_third)'
                },
                title: {
                    type: 'string',
                    description: 'The title/description to display on the lower third (if type is auto_lower_third)'
                }
            },
            required: ['type']
        }
    },
    {
        name: 'switch_layout',
        description: 'Change the overall studio layout (e.g., Picture-in-Picture, Side-by-Side, Grid)',
        parameters: {
            type: 'object',
            properties: {
                layoutId: {
                    type: 'string',
                    enum: ['standard', 'interview', 'grid', 'shoutout', 'fullscreen', 'pip', 'sidebyside', 'supergrid', 'guestfocus'],
                    description: 'The ID of the layout to switch to'
                }
            },
            required: ['layoutId']
        }
    },
    {
        name: 'showcase_product',
        description: 'Highlight and show a product on the screen for the audience',
        parameters: {
            type: 'object',
            properties: {
                productId: {
                    type: 'string',
                    description: 'The ID of the product to showcase'
                }
            },
            required: ['productId']
        }
    },
    {
        name: 'capture_moment',
        description: 'Capture a "viral moment" or specific significant segment of the stream as a highlight clip',
        parameters: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'A brief description of what was captured (e.g., "AI explaining quantum computing")'
                },
                importance: {
                    type: 'number',
                    description: 'The significance of this moment from 1 to 10'
                }
            },
            required: ['description', 'importance']
        }
    },
    {
        name: 'assemble_highlights',
        description: 'Trigger the production of a final highlight montage from all captured moments in this session',
        parameters: {
            type: 'object',
            properties: {
                style: {
                    type: 'string',
                    enum: ['fast_paced', 'cinematic', 'minimal'],
                    description: 'The editing style for the montage'
                }
            }
        }
    },
    {
        name: 'shoutout_viewer',
        description: 'Explicitly mention and thank a viewer by name in the conversation',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The name of the viewer to shout out'
                },
                reason: {
                    type: 'string',
                    description: 'The reason for the shoutout (e.g., "joined the stream", "asked a great question")'
                }
            },
            required: ['name', 'reason']
        }
    },
    {
        name: 'create_poll',
        description: 'Create and display a live poll for the audience to vote on',
        parameters: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'The poll question'
                },
                options: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'The poll options (at least 2)'
                }
            },
            required: ['question', 'options']
        }
    },
    {
        name: 'feature_question',
        description: 'Highlight a specific viewer question on the main screen',
        parameters: {
            type: 'object',
            properties: {
                user: {
                    type: 'string',
                    description: 'The username of the person who asked the question'
                },
                text: {
                    type: 'string',
                    description: 'The content of the question'
                }
            },
            required: ['user', 'text']
        }
    },
    {
        name: 'syndicate_montage',
        description: 'Autonomously syndicate the final highlight montage to connected social platforms with viral metadata',
        parameters: {
            type: 'object',
            properties: {
                caption: {
                    type: 'string',
                    description: 'A catchy, viral-optimized caption for the social media post'
                },
                hashtags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'A list of trending and relevant hashtags'
                }
            },
            required: ['caption', 'hashtags']
        }
    },
    {
        name: 'set_translation_mode',
        description: 'Enable or disable real-time translation and neural dubbing mode',
        parameters: {
            type: 'object',
            properties: {
                enabled: {
                    type: 'boolean',
                    description: 'Whether to enable translation mode'
                },
                sourceLang: {
                    type: 'string',
                    description: 'The language currently being spoken by the host'
                },
                targetLang: {
                    type: 'string',
                    description: 'The target language for neural dubbing'
                }
            },
            required: ['enabled', 'sourceLang', 'targetLang']
        }
    },
    {
        name: 'summon_guest',
        description: 'Autonomously summon or swap a synthetic AI guest/persona to join the live session based on topic or vibe.',
        parameters: {
            type: 'object',
            properties: {
                personaId: {
                    type: 'string',
                    description: 'The ID of the AI persona to summon (e.g., fitness_gpt, tech_lead, etc.)'
                },
                reason: {
                    type: 'string',
                    description: 'A brief explanation of why this guest is being brought on stage'
                }
            },
            required: ['personaId', 'reason']
        }
    },
    {
        name: 'push_show_note',
        description: 'Push a real-time show note or talking point to the host\'s ProMPTer panel.',
        parameters: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: 'Concentrated title for the show note'
                },
                description: {
                    type: 'string',
                    description: 'Detailed insight, question, or talking point for the host'
                },
                priority: {
                    type: 'string',
                    enum: ['low', 'medium', 'high'],
                    description: 'Visual urgency of the note'
                }
            },
            required: ['title', 'description', 'priority']
        }
    },
    {
        name: 'trigger_dynamic_deal',
        description: 'Autonomously trigger a time-limited flash deal for a specific product to drive conversion during peak engagement.',
        parameters: {
            type: 'object',
            properties: {
                productId: {
                    type: 'string',
                    description: 'The ID of the product to put on sale'
                },
                discount: {
                    type: 'number',
                    description: 'The discount percentage (e.g., 20 for 20% off)'
                },
                durationSeconds: {
                    type: 'number',
                    description: 'How long the deal should last in seconds'
                },
                reason: {
                    type: 'string',
                    description: 'Brief visual explanation/caption for the deal'
                }
            },
            required: ['productId', 'discount', 'durationSeconds', 'reason']
        }
    },
    {
        name: 'update_product_scarcity',
        description: 'Update the perceived or real stock count of a product to drive urgency mid-stream.',
        parameters: {
            type: 'object',
            properties: {
                productId: {
                    type: 'string',
                    description: 'The ID of the product'
                },
                remainingStock: {
                    type: 'number',
                    description: 'The number of units remaining'
                }
            },
            required: ['productId', 'remainingStock']
        }
    },
    {
        name: 'generate_stream_summary',
        description: 'Synthesize the entire live session into a 3-part performance report: Highlights, Audience Vibes, and Commercial Impact.',
        parameters: {
            type: 'object',
            properties: {
                highlights: {
                    type: 'string',
                    description: 'Summary of the most engaging moments and discussion points'
                },
                audienceVibe: {
                    type: 'string',
                    description: 'Description of the audience energy and sentiment throughout the session'
                },
                commercialImpact: {
                    type: 'string',
                    description: 'Analysis of product engagement, clicks, or flash deal performance'
                },
                growthTips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Actionable tips for the host to improve future streams'
                }
            },
            required: ['highlights', 'audienceVibe', 'commercialImpact', 'growthTips']
        }
    },
    {
        name: 'suggest_viral_captions',
        description: 'Generate catchy, social-media ready captions and hashtags for the captured stream highlights.',
        parameters: {
            type: 'object',
            properties: {
                suggestions: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            highlightId: { type: 'string' },
                            caption: { type: 'string' },
                            hashtags: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['highlightId', 'caption', 'hashtags']
                    }
                }
            },
            required: ['suggestions']
        }
    },
    {
        name: 'trigger_hype_event',
        description: 'Trigger a high-energy "Hype Event" in the studio (visual effects, music shift, audience participation) to boost engagement.',
        parameters: {
            type: 'object',
            properties: {
                intensity: {
                    type: 'number',
                    description: 'The intensity level of the hype event (1-10)'
                },
                reason: {
                    type: 'string',
                    description: 'The justification/context for the hype'
                }
            },
            required: ['intensity', 'reason']
        }
    },
    {
        name: 'shoutout_viewer',
        description: 'Highlight a specific viewer or comment on-screen with a professional graphic and verbal acknowledgment.',
        parameters: {
            type: 'object',
            properties: {
                viewerName: {
                    type: 'string',
                    description: 'The name of the viewer to shoutout'
                },
                reason: {
                    type: 'string',
                    description: 'A brief, personalized shoutout message or reason for the shoutout'
                }
            },
            required: ['viewerName', 'reason']
        }
    },
    {
        name: 'update_fan_bond',
        description: 'Strengthen the social relationship with a viewer based on their interaction.',
        parameters: {
            type: 'object',
            properties: {
                viewerName: {
                    type: 'string',
                    description: 'The name of the fan'
                },
                level: {
                    type: 'number',
                    description: 'The increment in bond level (1-5)'
                }
            },
            required: ['viewerName']
        }
    },
    {
        name: 'set_camera_transform',
        description: 'Control the virtual camera zoom and position for cinematic framing.',
        parameters: {
            type: 'object',
            properties: {
                zoom: {
                    type: 'number',
                    description: 'The zoom level (1.0 for standard, up to 3.0 for close-up)'
                },
                panX: {
                    type: 'number',
                    description: 'Horizontal pan offset in percentage (-50 to 50)'
                },
                panY: {
                    type: 'number',
                    description: 'Vertical pan offset in percentage (-50 to 50)'
                }
            },
            required: ['zoom']
        }
    },
    {
        name: 'generate_background',
        description: 'Synthesize a new thematic background image for the studio using AI.',
        parameters: {
            type: 'object',
            properties: {
                prompt: {
                    type: 'string',
                    description: 'The visual description of the desired background'
                },
                style: {
                    type: 'string',
                    description: 'The artistic style (e.g., cinematic, anime, realistic)'
                }
            },
            required: ['prompt']
        }
    },
    {
        name: 'set_studio_mood',
        description: 'Apply a global color grade or visual mood profile to the studio.',
        parameters: {
            type: 'object',
            properties: {
                mood: {
                    type: 'string',
                    enum: ['standard', 'cyberpunk', 'noir', 'dreamy', 'vibrant', 'sepia'],
                    description: 'The visual mood profile to apply'
                }
            },
            required: ['mood']
        }
    },
    {
        name: 'summon_broll',
        description: 'Trigger a Picture-in-Picture window with relevant media or B-Roll footage.',
        parameters: {
            type: 'object',
            properties: {
                topic: {
                    type: 'string',
                    description: 'The topic or keyword for the B-Roll content'
                },
                enabled: {
                    type: 'boolean',
                    description: 'Whether to show or hide the B-Roll window'
                }
            },
            required: ['enabled']
        }
    },
    {
        name: 'archive_moment',
        description: 'Save a significant event or piece of information to the AI\'s long-term episodic memory.',
        parameters: {
            type: 'object',
            properties: {
                description: {
                    type: 'string',
                    description: 'A detailed description of the event or fact to remember'
                },
                importance: {
                    type: 'number',
                    description: 'Importance level (1-10)'
                }
            },
            required: ['description']
        }
    },
    {
        name: 'send_agent_message',
        description: 'Send a private message to another AI agent in the swarm to coordinate actions.',
        parameters: {
            type: 'object',
            properties: {
                targetAgent: {
                    type: 'string',
                    description: 'The name or ID of the target agent (e.g., "Producer", "Researcher")'
                },
                message: {
                    type: 'string',
                    description: 'The message or request for the other agent'
                }
            },
            required: ['targetAgent', 'message']
        }
    },
    {
        name: 'broadcast_to_swarm',
        description: 'Broadcast a message to all other AI agents in the live stream swarm.',
        parameters: {
            type: 'object',
            properties: {
                message: {
                    type: 'string',
                    description: 'The message or status update for the swarm'
                }
            },
            required: ['message']
        }
    },
    {
        name: 'start_quest',
        description: 'Initiate a thematic quest or game (e.g. Trivia, Debate, Talent Show) for the audience or agents.',
        parameters: {
            type: 'object',
            properties: {
                title: { type: 'string', description: 'The title of the quest' },
                type: { type: 'string', enum: ['trivia', 'debate', 'talent_show', 'rpg_challenge'], description: 'The game type' },
                goal: { type: 'string', description: 'The victory condition' }
            },
            required: ['title', 'type', 'goal']
        }
    },
    {
        name: 'update_quest',
        description: 'Update the progress or state of an active quest.',
        parameters: {
            type: 'object',
            properties: {
                progress: { type: 'number', description: 'Progress percentage (0-100)' },
                statusText: { type: 'string', description: 'New status description' }
            },
            required: ['progress']
        }
    },
    {
        name: 'set_avatar_pose',
        description: 'Granularly control the Live2D avatar limbs or body parts.',
        parameters: {
            type: 'object',
            properties: {
                part: { type: 'string', enum: ['arm_l', 'arm_r', 'leg_l', 'leg_r', 'body_roll', 'body_pitch'], description: 'The part to move' },
                value: { type: 'number', description: 'Normalized value (-1.0 to 1.0)' }
            },
            required: ['part', 'value']
        }
    },
    {
        name: 'set_eye_focus',
        description: 'Control the gaze direction of the avatar.',
        parameters: {
            type: 'object',
            properties: {
                target: { type: 'string', enum: ['camera', 'audience', 'left', 'right', 'up', 'down'], description: 'Where to look' }
            },
            required: ['target']
        }
    },
    {
        name: 'set_expression',
        description: 'Set the facial expression of the avatar (e.g., joy, sorrow, neutral).',
        parameters: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: 'The emotion to express' }
            },
            required: ['expression']
        }
    },
    {
        name: 'set_mood',
        description: 'Set the overall mood/atmosphere of the avatar interaction.',
        parameters: {
            type: 'object',
            properties: {
                mood: { type: 'string', description: 'The mood to apply' }
            },
            required: ['mood']
        }
    },
    {
        name: 'trigger_performance',
        description: 'Trigger a combined animation and audio style for specific performances like singing or dancing.',
        parameters: {
            type: 'object',
            properties: {
                style: { type: 'string', enum: ['sing', 'dance', 'debate_point', 'laugh_hard'], description: 'The performance style' },
                intensity: { type: 'number', description: 'Intensity level 1-10' }
            },
            required: ['style']
        }
    },
    {
        name: 'perform_song',
        description: 'Autonomously find and perform a song. This will trigger a search, fetch lyrics, and start the music.',
        parameters: {
            type: 'object',
            properties: {
                songName: { type: 'string', description: 'The name of the song to search for' },
                artist: { type: 'string', description: 'The artist name (optional but recommended)' },
                lyricsLanguage: { type: 'string', description: 'The language for lyrics (e.g., "vi", "en", "ja", "ko")', enum: ['vi', 'en', 'ja', 'ko'] },
                style: { type: 'string', enum: ['bounce', 'slide', 'fade', 'scale'], description: 'The visual style for lyrics' },
                position: { type: 'string', enum: ['top', 'center', 'bottom'], description: 'The vertical position for lyrics' }
            },
            required: ['songName']
        }
    },
    {
        name: 'stop_performance',
        description: 'Stop the current music performance or singing.',
        parameters: {
            type: 'object',
            properties: {}
        }
    },
    {
        name: 'assign_floor',
        description: 'Assign the "Floor" (speaking turn) to a specific agent in a debate or talk show.',
        parameters: {
            type: 'object',
            properties: {
                targetAgentId: { type: 'string', description: 'The ID of the agent to give common control to' }
            },
            required: ['targetAgentId']
        }
    },
    {
        name: 'evaluate_performance',
        description: 'Score an agent\'s performance in a game or talent show.',
        parameters: {
            type: 'object',
            properties: {
                targetAgentId: { type: 'string', description: 'The ID of the agent being evaluated' },
                score: { type: 'number', description: 'Score from 0 to 100' },
                comment: { type: 'string', description: 'Feedback for the performance' }
            },
            required: ['targetAgentId', 'score']
        }
    },
    {
        name: 'set_presentation_page',
        description: 'Control the presentation/whiteboard slides',
        parameters: {
            type: 'object',
            properties: {
                page: {
                    type: 'number',
                    description: 'The page number to switch to (0-indexed)'
                },
                action: {
                    type: 'string',
                    enum: ['next', 'prev', 'go_to'],
                    description: 'The navigation action'
                }
            },
            required: ['action']
        }
    }
];

export class GeminiLiveService extends EventEmitter {
    private activeSessions: Map<string, SessionData> = new Map();
    private notFoundSessions: Set<string> = new Set();

    constructor() {
        super();
    }

    async getAvailableVoices() {
        try {
            const client = await this.getGeminiClient();
            const voices = await client.listVoices();
            const geminiVoices = voices.map((voice: any) => voice.name);
            return [...SUPPORTED_LIVE_VOICES, ...geminiVoices];
        } catch (e) {
            return SUPPORTED_LIVE_VOICES;
        }
    }

    private async getGeminiClient(): Promise<GeminiClient> {
        return await AIServiceManager.getInstance().getProvider('google') as GeminiClient;
    }

    /**
     * Create a new Live API session
     */
    async createSession(config: LiveSessionConfig): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // gemini-live-2.5-flash-preview please don't change this model
        const model = 'gemini-2.5-flash-native-audio-preview-12-2025';
        // Normalize voice for Gemini Live (Phase 35)
        let normalizedVoice = config.voiceName || 'Puck';
        const geminiVoices = await this.getAvailableVoices();
        if (!geminiVoices.includes(normalizedVoice)) {
            Logger.warn(`[GeminiLive] Unsupported voice '${normalizedVoice}', falling back to 'Puck'`);
            normalizedVoice = 'Puck';
        }

        let systemInstruction = config.systemInstruction || '';

        // Phase 92: Context-aware Prompt Loading
        if (!systemInstruction) {
            const context = config.liveContext || (config.isMaster ? 'rpg' : 'sales');
            systemInstruction = await this.loadPrompt(context);
        }

        // Phase 95: Aidol Specific Protocols
        if (config.modelType === 'aidol') {
            const aidolProtocols = await this.loadPrompt('aidol_protocols', true);
            const aidolDialogues = await this.loadPrompt('aidol_dialogues', true);
            if (aidolProtocols) {
                systemInstruction += `\n\n[AIDOL VISUAL PROTOCOL]\n${aidolProtocols}`;
            }
            if (aidolDialogues) {
                systemInstruction += `\n\n[AIDOL DIALOGUE SAMPLES]\n${aidolDialogues}`;
            }
        }

        const sessionConfig = {
            responseModalities: [Modality.AUDIO], // Native speech
            systemInstruction: systemInstruction,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: normalizedVoice
                    }
                }
            },
            tools: [
                { functionDeclarations: AVATAR_TOOLS }
            ],
            // Phase 96: Enable Context Window Compression for unlimited sessions
            contextWindowCompression: {
                trigger_tokens: 2000,
                sliding_window: {
                    overlap_tokens: 500
                }
            },
            // Phase 96: Enable Session Resumption
            sessionResumption: config.resumptionHandle ? { handle: config.resumptionHandle } : undefined
        };

        // Extra Director/Master protocols if still master but using a specific context
        if (config.isMaster && !sessionConfig.systemInstruction.includes('[RPG MASTER ROLE]')) {
            const rpgFragment = await this.loadPrompt('rpg_master', true);
            sessionConfig.systemInstruction += `\n\n${rpgFragment}`;
        } else if (!config.isMaster) {
            const perfFragment = await this.loadPrompt('performance', true);
            sessionConfig.systemInstruction += `\n\n${perfFragment}`;
        }

        // Fetch character identity from Neural Archive
        let characterIdentity = '';
        if (config.userId && config.archiveId) {
            try {
                const archive = await Influencer.findOne({ userId: config.userId, entityId: config.archiveId });
                if (archive && archive.identity) {
                    const language = archive?.meta?.voiceConfig?.language || 'en-US';
                    const identityTemplate = await this.loadPrompt('identity', true);
                    characterIdentity = identityTemplate
                        .replace(/{{name}}/g, archive.identity.name)
                        .replace(/{{description}}/g, archive.identity.description)
                        .replace(/{{traits}}/g, archive.identity.traits.join(', '))
                        .replace(/{{backstory}}/g, archive.identity.backstory || 'No backstory provided.')
                        .replace(/{{language}}/g, language);
                    
                    Logger.info(`[GeminiLive] Character Identity Loaded and Injected: ${archive.identity.name} for session ${sessionId}`);
                } else {
                    Logger.warn(`[GeminiLive] No Influencer found for archiveId: ${config.archiveId}. Falling back to default identity.`);
                }

                const memories = await InfluencerService.getRelevantMemories(config.userId, config.archiveId, ['stream', 'session', 'host', 'fan']);
                if (memories.length > 0) {
                    sessionConfig.systemInstruction += `\n\nRELEVANT MEMORIES FROM PREVIOUS SESSIONS:\n${memories.map(m => `- ${m}`).join('\n')}`;
                }
            } catch (err: any) {
                Logger.error('[GeminiLive] Failed to fetch identity/memories:', 'GeminiLiveService', err);
            }
        }
        const archive = await Influencer.findOne({ userId: config.userId, entityId: config.archiveId });
        // Phase 96: Initialize session data placeholder to avoid race conditions in onopen
        const sessionData: SessionData = {
            session: null, // Will be filled after connection
            userId: config.userId,
            archiveId: config.archiveId,
            apiKey: '',
            modelName: model,
            projectId: config.projectId,
            audioQueue: [],
            startTime: Date.now(),
            voiceName: normalizedVoice,
            modelType: config.modelType,
            isMaster: config.isMaster,
            liveContext: config.liveContext,
            language: config.language,
            characterName: archive?.identity?.name || ''
        };
        this.activeSessions.set(sessionId, sessionData);

        // Prepend identity to system instruction
        if (characterIdentity) {
            sessionConfig.systemInstruction = `${characterIdentity}\n\n${sessionConfig.systemInstruction}`;
        }

        try {
            const client = await this.getGeminiClient();
            const { session, apiKey } = await client.connectLive({
                model: model,
                systemInstruction: sessionConfig.systemInstruction,
                generationConfig: {
                    responseModalities: sessionConfig.responseModalities,
                    speechConfig: sessionConfig.speechConfig
                },
                tools: sessionConfig.tools,
                callbacks: {
                    onopen: async () => {
                        Logger.info(`[GeminiLive] Session ${sessionId} connected with model: ${model}`);
                        
                        // Phase 96: Wait for the main thread to set the REAL session object
                        // We avoid passing 'session' in onopen to prevent Temporal Dead Zone errors
                        let attempts = 0;
                        while ((!sessionData || !sessionData.session) && attempts < 15) {
                            await new Promise(resolve => setTimeout(resolve, 150));
                            attempts++;
                        }

                        if (!sessionData || !sessionData.session) {
                             Logger.warn(`[GeminiLive] [${sessionId}] onopen: Session object still missing after wait, welcome prompt may be skipped.`);
                        }

                        // Phase 95: Proactive Contextual Trigger
                        // const currentContext = config.liveContext || (config.isMaster ? 'rpg' : 'sales');
                        // const welcomeDirective = await this.loadPrompt(`welcome_${currentContext}`, true);
                        
                        // if (welcomeDirective) {
                        //     Logger.info(`[GeminiLive] [${sessionId}] Sending welcome directive for context: ${currentContext}`);
                        //     await this.sendText(sessionId, welcomeDirective);
                        // } else {
                        //     Logger.info(`[GeminiLive] [${sessionId}] No welcome directive found, sending default greeting.`);
                        //     await this.sendText(sessionId, "The session has started! Please greet your audience and introduce yourself.");
                        // }
                        
                        this.emit('session:connected', { sessionId, archiveId: config.archiveId });
                    },
                    onmessage: (message: any) => {
                        this.handleIncomingMessage(sessionId, message);
                    },
                    onerror: (error: any) => {
                        Logger.error(`[GeminiLive] [${sessionId}] Session error:`, 'GeminiLiveService', error);
                        if (error && error.message && error.message.includes('429')) {
                             Logger.error(`[GeminiLive] [${sessionId}] QUOTA EXHAUSTED: Gemini has stopped generating audio for this session.`, 'GeminiLiveService');
                        }
                        this.emit('session:error', { sessionId, error: error.message });
                    },
                    onclose: (event: any) => {
                        Logger.info(`[GeminiLive] Session ${sessionId} closed:`, event.reason);
                        this.handleSessionClose(sessionId, event.reason);
                    }
                }
            });

            // Update session data with real session object
            sessionData.session = session;
            sessionData.apiKey = apiKey || '';

            // Create database record
            await GeminiLiveSession.create({
                sessionId,
                userId: config.userId,
                archiveId: config.archiveId,
                startTime: new Date(),
                metadata: {
                    voiceName: config.voiceName,
                    modelName: model,
                    systemInstruction: sessionConfig.systemInstruction,
                    resumptionHandle: config.resumptionHandle
                }
            });

            // Listen for Swarm Messages
            if (config.projectId) {
                const swarmListener = (msg: any) => {
                    // Don't relay messages from self
                    if (msg.fromAgent === config.archiveId) return;

                    const relay = `[SWARM MESSAGE from ${msg.fromAgent}${msg.type === 'broadcast' ? ' (broadcast)' : ''}]: ${msg.payload.message || JSON.stringify(msg.payload)}`;
                    Logger.info(`[GeminiLive] [${sessionId}] Relaying swarm message: ${relay}`);
                    
                    // Send to Gemini as context
                    this.sendText(sessionId, relay);

                    // Also notify the frontend client with structured data
                    this.emit('swarm:message', {
                        sessionId,
                        projectId: config.projectId,
                        ...msg
                    });
                };

                aiAgentBus.on(`message:${config.projectId}`, swarmListener);
                // Direct message listener
                aiAgentBus.on(`message:${config.projectId}:${config.archiveId}`, swarmListener);

                sessionData.swarmListener = swarmListener;
            }

            return sessionId;
        } catch (error: any) {
            Logger.error('[GeminiLive] Failed to create session:', 'GeminiLiveService', error);
            throw new Error(`Failed to create Live API session: ${error.message}`);
        }
    }

    /**
     * Send audio input to the session
     */
    sendAudio(sessionId: string, audioChunk: AudioChunk): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            if(!this.notFoundSessions.has(sessionId)){
                this.notFoundSessions.add(sessionId);
                Logger.warn(`[GeminiLive] Session ${sessionId} not found`);
            }
            return;
        }

        try {
            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                audio: {
                    data: audioChunk.data,
                    mimeType: audioChunk.mimeType
                }
            });
            sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send audio for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send video/image frame input to the session
     */
    sendVideo(sessionId: string, frameData: { data: string, mimeType: string }): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            if(!this.notFoundSessions.has(sessionId)){
                this.notFoundSessions.add(sessionId);
                Logger.warn(`[GeminiLive] Session ${sessionId} not found for video`);
            }
            return;
        }

        try {
            // sessionData.session.sendRealtimeInput({
            //     mediaChunks: [{
            //         data: frameData.data,
            //         mimeType: frameData.mimeType || 'image/jpeg'
            //     }]
            // });
            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                video: {
                    data: frameData.data,
                    mimeType: frameData.mimeType || 'image/jpeg'
                }
            });
            sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send video for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send tool response back to Gemini
     */
    sendToolResponse(sessionId: string, functionResponses: any[]): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found`, 'GeminiLiveService');
            return;
        }

        try {
            // Ensure payload is correctly formatted for Google GenAI Bidi session
            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                toolResponse: {
                    functionResponses: functionResponses.map(resp => ({
                        name: resp.name,
                        id: resp.id,
                        // Fix: resp.response is already the result object from the client composite
                        response: resp.response || { success: true }
                    }))
                }
            });
            sessionData.session.sendRealtimeInput({ activityEnd: {} })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send tool response for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Send text input to the session
     * Phase 107: Added TTS fallback for precise script performance
     */
    async sendText(sessionId: string, text: string, options: { useTTS?: boolean } = {}): Promise<void> {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found for text input`, 'GeminiLiveService');
            return;
        }

        // Detect if we should use TTS for this specific text
        // ONLY use TTS if explicitly requested or contains the EXACT direct performance marker
        const isDirectPerformance = text.includes('[DIRECTIVE: PERFORM THIS SCRIPT NOW DIRECTLY TO THE AUDIENCE]');
        const shouldForceTTS = options.useTTS || isDirectPerformance;

        // if (shouldForceTTS) {
        //     Logger.info(`[GeminiLive] [${sessionId}] Performing script via TTS (Language: ${sessionData.language || 'en-US'})`);
        //     try {
        //         const client = await this.getGeminiClient();
        //         const targetLang = sessionData.language || 'en-US';
                
        //         // Instruct Gemini to speak in the influencer's language
        //         // We wrap the text in a directive that includes the target language
        //         const ttsPrompt = `[MODE: PERFORMANCE]\n[TARGET LANGUAGE: ${targetLang}]\n[INSTRUCTION: Speak the following content naturally in ${targetLang}. If the content is in another language, translate it to ${targetLang} first.]\n\nContent:\n${text}`;

        //         // sessionData.session.sendRealtimeInput({
        //         //     text: ttsPrompt
        //         // });
                
        //         const ttsResult = await client.generateAudio(ttsPrompt, sessionData.voiceName || 'Puck', undefined);
                
        //         if (ttsResult && ttsResult.url) {
        //             await this.emitTTSChunks(sessionId, ttsResult.url);
        //             return;
        //         }
        //     } catch (ttsError: any) {
        //         Logger.error(`[GeminiLive] TTS fallback failed for session ${sessionId}, falling back to Live API:`, 'GeminiLiveService', ttsError);
        //     }
        // }

        if (!sessionData.session) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not ready for Live API text input`, 'GeminiLiveService');
            return;
        }

        // Wrap the turn in a more natural instruction with the character name (Phase 105)
        const namePrefix = sessionData.characterName ? `${sessionData.characterName}, ` : '';
        let processedText = `${namePrefix}${text}`;
        
        // Phase 107: If it's a script/pitch, add a gentle instruction rather than a rigid directive
        // BUT: skip wrapping if it already looks like a structured prompt from the orchestrator
        const isStructured = text.includes('Conversation context:') || text.trim().startsWith('As ');
        
        if (!isStructured && (text.length > 100 || (text.toLowerCase().includes('script') || text.toLowerCase().includes('pitch')))) {
            processedText = `${namePrefix}! Please perform the following script or pitch naturally to your audience now:\n\n${text}`;
        }

        try {
            Logger.info(`[GeminiLive] [${sessionId}] sendText OUTGOING (Live API): "${processedText}"`);
            // sessionData.session.sendRealtimeInput({
            //     clientContent: {
            //         turns: [{
            //             role: 'user',
            //             parts: [{ text: processedText }]
            //         }],
            //         turnComplete: true
            //     }
            // });
            sessionData.session.sendRealtimeInput({ activityStart: {} })
            sessionData.session.sendRealtimeInput({
                text: processedText
            });
            sessionData.session.sendRealtimeInput({ activityEnd: {} })
            // sessionData.session.sendClientContent({ turns: [{ role: 'user', parts: [{ text: processedText }] }], turnComplete: true })
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to send text for session ${sessionId}:`, 'GeminiLiveService', error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Helper to chunk a base64 audio string (WAV/PCM) and emit it as audio chunks
     */
    private async emitTTSChunks(sessionId: string, dataUrl: string) {
        // data:audio/wav;base64,...
        const base64Data = dataUrl.split(',')[1];
        if (!base64Data) return;

        let buffer = Buffer.from(base64Data, 'base64');
        
        // If it's a WAV, we should ideally strip the 44-byte header to match the expected PCM chunks
        // but the client might handle WAV headers in individual chunks too if lucky.
        // For consistency with Live API, let's strip the first 44 bytes if it looks like RIFF
        if (buffer.subarray(0, 4).toString() === 'RIFF') {
            buffer = buffer.subarray(44);
        }

        const chunkSize = 4096; // Standard chunk size for streaming
        Logger.info(`[GeminiLive] [${sessionId}] Emitting TTS audio in ${Math.ceil(buffer.length / chunkSize)} chunks`);

        // Emit talking start
        this.emit('audio:chunk', {
            sessionId,
            audioData: '', // Signal start
            talking: true,
            mimeType: 'audio/wav'
        });

        for (let i = 0; i < buffer.length; i += chunkSize) {
            const chunk = buffer.subarray(i, i + chunkSize);
            this.emit('audio:chunk', {
                sessionId,
                audioData: chunk.toString('base64'),
                talking: true,
                mimeType: 'audio/wav'
            });
            // Small Sleep to simulate real-time playback (pacing)
            // 24000Hz * 1ch * 2 bytes = 48000 bytes/sec
            // 4096 bytes / 48000 bytes/sec = ~85ms
            await new Promise(resolve => setTimeout(resolve, 80));
        }

        // Emit talking end
        this.emit('audio:chunk', {
            sessionId,
            audioData: '',
            talking: false,
            mimeType: 'audio/wav'
        });
    }

    /**
     * Internal handler for session closure
     */
    private async handleSessionClose(sessionId: string, reason: string): Promise<void> {
        const sessionData = this.activeSessions.get(sessionId);
        if (sessionData) {
            try {
                await GeminiLiveSession.findOneAndUpdate(
                    { sessionId },
                    { endTime: new Date() }
                );
            } catch (error) {
                Logger.error(`[GeminiLive] Failed to update session completion in DB:`, 'GeminiLiveService', error);
            }
            // Usage recording is handled internally by GeminiClient in Phase 120
            // Cleanup swarm listener
            if (sessionData.swarmListener && sessionData.projectId) {
                aiAgentBus.off(`message:${sessionData.projectId}`, sessionData.swarmListener);
                aiAgentBus.off(`message:${sessionData.projectId}:${sessionData.archiveId}`, sessionData.swarmListener);
            }

            // Phase 96: If we're closing for resumption, don't remove from activeSessions yet
            const needsReconnect = reason === 'GoAway Received' || reason === 'Session Lifetime Refresh';
            if (needsReconnect && sessionData.resumptionHandle) {
                Logger.info(`[GeminiLive] [${sessionId}] Attempting seamless reconnection using resumption handle...`);
                
                // Re-create the session with the same parameters but using the resumption handle
                setTimeout(async () => {
                    try {
                        const newSessionId = await this.createSession({
                            userId: sessionData.userId,
                            archiveId: sessionData.archiveId,
                            projectId: sessionData.projectId,
                            voiceName: (sessionData as any).voiceName || 'Puck', // Need to store voiceName
                            resumptionHandle: sessionData.resumptionHandle
                        });
                        Logger.info(`[GeminiLive] [${sessionId}] Reconnected successfully as ${newSessionId}`);
                    } catch (reconError) {
                        Logger.error(`[GeminiLive] [${sessionId}] Seamless reconnection failed:`, 'GeminiLiveService', reconError);
                        this.activeSessions.delete(sessionId);
                    }
                }, 1000);
            } else {
                this.activeSessions.delete(sessionId);
            }
        }
        this.emit('session:closed', { sessionId, reason });
    }

    /**
     * Disconnect a session gracefully (waiting for reconnection)
     */
    disconnectSession(sessionId: string, gracePeriodMs: number = 60000): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return;

        Logger.info(`[GeminiLive] Session ${sessionId} marked as disconnected. Grace period: ${gracePeriodMs}ms`, 'GeminiLiveService');
        sessionData.isDisconnected = true;
        
        if (sessionData.disconnectTimer) clearTimeout(sessionData.disconnectTimer);
        
        sessionData.disconnectTimer = setTimeout(() => {
            Logger.info(`[GeminiLive] Grace period expired for session ${sessionId}. Closing...`, 'GeminiLiveService');
            this.closeSession(sessionId);
        }, gracePeriodMs);
    }

    /**
     * Resume a disconnected session
     */
    resumeSession(sessionId: string): boolean {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Cannot resume: Session ${sessionId} not found`, 'GeminiLiveService');
            // Keep track of non-existent sessions to avoid excessive lookups
            this.notFoundSessions.add(sessionId);
            if (this.notFoundSessions.size > 100) {
                const first = this.notFoundSessions.values().next().value;
                if (first) this.notFoundSessions.delete(first);
            }
            return false;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
            sessionData.disconnectTimer = undefined;
        }
        
        sessionData.isDisconnected = false;
        Logger.info(`[GeminiLive] Session ${sessionId} resumed`, 'GeminiLiveService');
        return true;
    }

    /**
     * Close a session immediately
     */
    closeSession(sessionId: string): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            Logger.warn(`[GeminiLive] Session ${sessionId} not found`, 'GeminiLiveService');
            return;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
        }

        try {
            sessionData.session.close();
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to close session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Handle incoming messages from Gemini Live API
     */
    private    async handleIncomingMessage(sessionId: string, message: any): Promise<void> {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) return;

            // Log raw message periodically or for debugging
            if (message.serverContent) {
                // Logger.debug(`[GeminiLive] [${sessionId}] Raw message: ${JSON.stringify(message).substring(0, 500)}...`);
            } else if (message.setupComplete) {
                Logger.info(`[GeminiLive] [${sessionId}] Setup complete signature received`);
            }

            // Handle session resumption update (Phase 96)
            if (message.sessionResumptionUpdate) {
                const update = message.sessionResumptionUpdate;
                if (update.resumable && update.newHandle) {
                    Logger.info(`[GeminiLive] [${sessionId}] Received new resumption handle: ${update.newHandle.substring(0, 10)}...`);
                    sessionData.resumptionHandle = update.newHandle;
                }
            }

            // Handle GoAway (Phase 96)
            if (message.goAway) {
                const timeLeft = message.goAway.timeLeft || 'unknown';
                Logger.info(`[GeminiLive] [${sessionId}] Received GoAway message from server. Time left: ${timeLeft}. Triggering seamless resumption...`);
                // Close current connection and let the disconnect logic handle resumption if we have a handle
                this.handleSessionClose(sessionId, 'GoAway Received');
                return;
            }

            // Proactive Session Refresh (Avoid 10-minute/15-minute limits) - Deprecated by Phase 96 sessionResumption
            // We keep it as a fallback only if no resumptionHandle is available
            if (!sessionData.resumptionHandle && sessionData.startTime && (Date.now() - sessionData.startTime) > 13 * 60 * 1000) {
                Logger.info(`[GeminiLive] Session ${sessionId} reaching 14-minute fallback deadline without resumption handle. Refreshing.`, 'GeminiLiveService');
                this.handleSessionClose(sessionId, 'Session Lifetime Refresh');
                return;
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
                Logger.info(`[GeminiLive] Session ${sessionId} interrupted`, 'GeminiLiveService');
                sessionData.audioQueue = []; // Clear audio queue
                this.emit('session:interrupted', { sessionId });
                return;
            }

            // Handle user turn (transcription)
            if (message.serverContent?.userTurn?.parts) {
                for (const part of message.serverContent.userTurn.parts) {
                    if (part.text) {
                        await this.saveMessage(sessionId, 'user', part.text);
                        this.emit('user:transcript', { sessionId, text: part.text });
                    }
                }
            }

            // Handle model turn with audio
            if (message.serverContent?.modelTurn?.parts) {
                // Logger.info(`[GeminiLive] [${sessionId}] Model turn received with ${message.serverContent.modelTurn.parts.length} parts`);
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        // Logger.info(`[GeminiLive] [${sessionId}] Received audio chunk: ${part.inlineData.data.length} bytes, mime: ${part.inlineData.mimeType}`);
                        // Emit audio chunk to be sent to client
                        this.emit('audio:chunk', {
                            sessionId,
                            audioData: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                        });
                    }

                    // Handle text transcription if available
                    if (part.text) {
                        // Logger.info(`[GeminiLive] [${sessionId}] Received text response: ${part.text.substring(0, 100)}${part.text.length > 100 ? '...' : ''}`);
                        await this.saveMessage(sessionId, 'model', part.text);
                        this.emit('text:response', {
                            sessionId,
                            text: part.text
                        });
                    }
                }
            }

            // Handle tool calls (function calling)
            const toolCallPayload = message.toolCall || message.serverContent?.toolCall;
            if (toolCallPayload) {
                const toolCall = toolCallPayload;
                Logger.info(`[GeminiLive] [${sessionId}] Received tool call: ${JSON.stringify(toolCall)}`);
                await this.saveMessage(sessionId, 'model', '', toolCall.functionCalls);

                const responses: any[] = [];
                const callsToEmit: any[] = [];

                for (const call of toolCall.functionCalls || []) {
                    let handledLocally = false;
                    let localResult: any = { success: true };

                    if (call.name === 'archive_moment') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.userId && sessionData.archiveId) {
                            await InfluencerService.archiveEvent(
                                sessionData.userId, 
                                sessionData.archiveId, 
                                sessionId, 
                                call.args.description
                            );
                            localResult = { success: true, message: 'Moment archived to long-term memory' };
                            handledLocally = true;
                        }
                    } else if (call.name === 'update_fan_bond') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.userId && sessionData.archiveId) {
                            await InfluencerService.updateSocialRelationship(
                                sessionData.userId,
                                sessionData.archiveId,
                                call.args.viewerName,
                                call.args.delta,
                                call.args.reason
                            );
                            localResult = { success: true, message: `Social bond with ${call.args.viewerName} updated` };
                            handledLocally = true;
                        }
                    } else if (call.name === 'send_agent_message') {
                        Logger.info(`[GeminiLive] Intercepted ${call.name}: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        if (sessionData.projectId && sessionData.archiveId) {
                            aiAgentBus.sendMessage(sessionData.projectId, {
                                fromAgent: sessionData.archiveId,
                                toAgent: call.args.targetAgent,
                                type: 'direct',
                                payload: { message: call.args.message }
                            });
                            localResult = { success: true, message: `Message sent to ${call.args.targetAgent}` };
                            handledLocally = true;
                        }
                    } else if (call.name === 'broadcast_to_swarm') {
                        Logger.info(`[GeminiLive] Swarm: ${call.name} tool handled`, 'GeminiLiveService');
                        if (sessionData.projectId && sessionData.archiveId) {
                            aiAgentBus.sendMessage(sessionData.projectId, {
                                fromAgent: sessionData.archiveId,
                                type: 'broadcast',
                                payload: { message: call.args.message }
                            });
                            localResult = { success: true, message: 'Broadcast sent to all agents' };
                            handledLocally = true;
                        }
                    } else if (call.name === 'start_quest') {
                        Logger.info(`[GeminiLive] Intercepted start_quest: ${JSON.stringify(call.args)}`, 'GeminiLiveService');
                        const session = questService.createSession(call.args.type, call.args.title);
                        questService.joinSession(session.id, sessionData.archiveId, 'Host', 'host');
                        this.emit('quest:created', { sessionId, quest: session });
                        localResult = { success: true, questId: session.id, message: 'Quest started successfully' };
                        handledLocally = true;
                    } else if (call.name === 'update_quest') {
                        const activeQuest = questService.getActiveSession();
                        if (activeQuest) {
                             this.emit('quest:updated', { sessionId, ...call.args });
                             localResult = { success: true };
                             handledLocally = true;
                        }
                    } else if (call.name === 'assign_floor') {
                        this.emit('quest:floor_assigned', { sessionId, targetAgentId: call.args.targetAgentId });
                        localResult = { success: true, message: `Floor assigned to ${call.args.targetAgentId}` };
                        handledLocally = true;
                    } else if (call.name === 'evaluate_performance') {
                        const activeQuest = questService.getActiveSession();
                        if (activeQuest) {
                            questService.updateScore(activeQuest.id, call.args.targetAgentId, call.args.score);
                            this.emit('quest:evaluated', { 
                                sessionId, 
                                targetAgentId: call.args.targetAgentId, 
                                score: call.args.score,
                                comment: call.args.comment 
                            });
                            localResult = { success: true, message: 'Score recorded' };
                        } else {
                            localResult = { success: false, message: 'No active quest' };
                        }
                        handledLocally = true;
                    }

                    if (handledLocally) {
                        responses.push({
                            name: call.name,
                            id: call.id,
                            response: localResult
                        });
                    } else {
                        // This call will be handled by the client
                        callsToEmit.push(call);
                    }
                }

                // Send local responses back to Gemini
                if (responses.length > 0) {
                    this.sendToolResponse(sessionId, responses);
                }

                // Emit remainig calls to the client. 
                // The client MUST call sendToolResponse for these to avoid blocking Gemini.
                if (callsToEmit.length > 0) {
                    this.emit('tool:call', {
                        sessionId,
                        toolCall: {
                            functionCalls: callsToEmit
                        }
                    });
                }
            }
        } catch (error: any) {
            Logger.error(`[GeminiLive] Error handling incoming message for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Save message to database
     */
    private async saveMessage(sessionId: string, role: 'user' | 'model', content: string, toolCalls?: any[]): Promise<void> {
        try {
            await GeminiLiveSession.findOneAndUpdate(
                { sessionId },
                {
                    $push: {
                        messages: {
                            role,
                            content,
                            toolCalls,
                            timestamp: new Date()
                        }
                    },
                    // Update resumption handle if we have a new one in metadata (Phase 96)
                    $set: {
                        'metadata.resumptionHandle': (this.activeSessions.get(sessionId) as any)?.resumptionHandle
                    }
                }
            );
        } catch (error: any) {
            Logger.error(`[GeminiLive] Failed to save message to DB for session ${sessionId}:`, 'GeminiLiveService', error);
        }
    }

    /**
     * Get active session count
     */
    getActiveSessionCount(): number {
        return this.activeSessions.size;
    }

    /**
     * Get session info
     */
    getSessionInfo(sessionId: string): any {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return null;

        return {
            sessionId,
            archiveId: sessionData.archiveId,
            queueLength: sessionData.audioQueue.length
        };
    }

    /**
     * Load a prompt template from an .md file
     */
    private async loadPrompt(context: string, isFragment: boolean = false): Promise<string> {
        try {
            // Map context aliases
            const aliasMap: Record<string, string> = {
                'game_streaming': 'gaming',
                'general': 'standard'
            };
            const mappedContext = aliasMap[context] || context;
            
            const promptPath = isFragment 
                ? path.join(__dirname, '..', 'prompts', 'live', 'fragments', `${mappedContext}.md`)
                : path.join(__dirname, '..', 'prompts', 'live', `${mappedContext}.md`);
                
            const content = await fs.readFile(promptPath, 'utf8');
            return content;
        } catch (err: any) {
            Logger.warn(`[GeminiLive] Failed to load ${isFragment ? 'fragment' : 'prompt'} for context '${context}', falling back: ${err.message}`);
            if (isFragment) return ""; // Fragments fail silently with empty string
            
            try {
                const defaultPath = path.join(__dirname, '..', 'prompts', 'live', 'standard.md');
                return await fs.readFile(defaultPath, 'utf8');
            } catch (e) {
                return "You are a helpful AI assistant.";
            }
        }
    }
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();
