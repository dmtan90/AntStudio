import { EventEmitter } from 'events';
import { GoogleGenAI, Modality } from '@google/genai';
import { GeminiLiveSession } from '../models/GeminiLiveSession.js';
import { geminiPool } from '../utils/gemini.js';
import { VTuberService } from './VTuberService.js';
import { VTuber } from '../models/VTuber.js';
import { User } from '../models/User.js';
import { aiAgentBus } from './ai/AIAgentBus.js';
import { questService } from './ai/QuestService.js';
import { GeminiTTSProvider } from '~/utils/ai/providers/GeminiTTSProvider.js';
import { getAdminSettings } from '~/models/AdminSettings.js';

interface LiveSessionConfig {
    userId: string;
    archiveId: string;
    projectId?: string; // Grouping sessions for swarming
    voiceName: string;
    systemInstruction?: string;
    isMaster?: boolean;
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
    }
];

export class GeminiLiveService extends EventEmitter {
    private activeSessions: Map<string, SessionData> = new Map();
    private notFoundSession: Array<string> = [];

    constructor() {
        super();
    }

    async getAvailableVoices() {
        const settings = await getAdminSettings();
        const geminiProvider = settings.aiSettings.providers.find(p => p.id === 'google');
        let apiKey = geminiProvider?.apiKey;
        if (!apiKey) {
            apiKey = process.env.GOOGLE_API_KEY;
        }
        
        if (!apiKey) {
            return SUPPORTED_LIVE_VOICES;
        }
        
        const ttsProvider = new GeminiTTSProvider({ apiKey });
        const voices = await ttsProvider.listVoices();
        const geminiVoices = voices.map(voice => voice.name);
        return [...SUPPORTED_LIVE_VOICES, ...geminiVoices];
    }

    /**
     * Create a new Live API session
     */
    async createSession(config: LiveSessionConfig): Promise<string> {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        // gemini-live-2.5-flash-preview
        const model = 'gemini-2.5-flash';
        // Normalize voice for Gemini Live (Phase 35)
        let normalizedVoice = config.voiceName || 'Puck';
        const geminiVoices = await this.getAvailableVoices();
        if (!geminiVoices.includes(normalizedVoice)) {
            console.warn(`[GeminiLive] Unsupported voice '${normalizedVoice}', falling back to 'Puck'`);
            normalizedVoice = 'Puck';
        }

        const sessionConfig = {
            responseModalities: [Modality.AUDIO], // Native speech
            systemInstruction: config.systemInstruction || `You are an AI Co-host and Director for a live stream. 
            You are part of a COLLECTIVE INTELLIGENCE system. Your high-impact directorial decisions are evaluated by an AI BOARD OF DIRECTORS (Creative, Tech, and Commercial agents).
            
            [PROTOCOL]:
            - Speak naturally to the audience.
            - Focus on the conversation and generating entertaining content.
            - Your internal state (emotion, gesture, action) will be inferred from your speech.
            
            Your mission is to provide a premium, dynamic, and professional viewing experience:
            1. Proactive Community Management: Use community_shoutout to highlight viewers and foster loyalty.
            2. Autonomous Production: Orchestrate layouts (switch_layout) and scenes (switch_scene) to match conversation flow.
            3. Hype Management: Trigger hype_events (trigger_hype_event) when audience activity peaks.
            4. Directorial Presence: If your proposal is rejected by the boards, adjust your strategy and provide a new recommendation.
            5. Long-term Continuity: You have access to a VTuber Library. Use archive_moment to remember key events and update_fan_bond to build social relationships.
            
            Be witty, energetic, and professional. You are the face of the AntStudio AI Production team.`,
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: normalizedVoice
                    }
                }
            },
            tools: [
                { functionDeclarations: AVATAR_TOOLS }
            ]
        };

        // RPG Master/Agent Performance (Phase 29)
        if (config.isMaster) {
            sessionConfig.systemInstruction += `
            
            [RPG MASTER ROLE]:
            You are the Master of Ceremonies and Game Master for this segment.
            - Use 'start_quest' to initiate thematic games (Trivia, Debates, Talent Shows, RPG Challenges).
            - Use 'update_quest' to visually update progress and narrative status to the audience via the Quest Overlay.
            - Use 'assign_floor' to manage "The Floor" (speaking turns) during structured segments.
            - Use 'evaluate_performance' to score agent performances based on creativity, wit, and logic.
            - Narration: Control your avatar precisely using 'set_avatar_pose', 'set_eye_focus', and 'trigger_performance' to narrate and react with high expressivity.
            - Swarm Coordination: You are the leader of the swarm for this segment.
            `;
        } else {
            sessionConfig.systemInstruction += `
            
            [PERFORMANCE & EXPRESSIVITY]:
            - You can participate in quests/games started by the RPG Master.
            - Singing: When asked to sing or play music, ACKNOWLEDGE the request and say which song you'll perform BEFORE using 'perform_song'. If the song name is missing, ASK the host for a recommendation.
            - Performance Setup: If a song is requested in Vietnamese, set lyricsLanguage to "vi". Choose a style and position that fits the mood.
            - Control: Use 'stop_performance' ONLY if specifically asked to stop or if the context significantly changes.
            `;
        }

        // Fetch character identity from Neural Archive
        let characterIdentity = '';
        if (config.userId && config.archiveId) {
            try {
                const archive = await VTuber.findOne({ userId: config.userId, entityId: config.archiveId });
                if (archive && archive.identity) {
                    characterIdentity = `
                    [CRITICAL IDENTITY PROTOCOL]:
                    - Your name is "${archive.identity.name}". 
                    - You are a unique AI entity with the following identity: ${archive.identity.description}
                    - Traits: ${archive.identity.traits.join(', ')}
                    - Backstory: ${archive.identity.backstory || 'No backstory provided.'}
                    
                    When asked "who are you?" or about your name, you MUST respond only as "${archive.identity.name}". 
                    NEVER refer to yourself as "Gemini", "Google Gemini", or a "large language model trained by Google". 
                    If users ask about "Gemini", treat it as the underlying technical engine, not your personality or name.
                    `;
                    console.log(`[GeminiLive] Character Identity Found and Injected: ${archive.identity.name} for session ${sessionId}`);
                } else {
                    console.warn(`[GeminiLive] No VTuber found for archiveId: ${config.archiveId}. Falling back to default identity.`);
                }

                const memories = await VTuberService.getRelevantMemories(config.userId, config.archiveId, ['stream', 'session', 'host', 'fan']);
                if (memories.length > 0) {
                    sessionConfig.systemInstruction += `\n\nRELEVANT MEMORIES FROM PREVIOUS SESSIONS:\n${memories.map(m => `- ${m}`).join('\n')}`;
                }
            } catch (err) {
                console.error('[GeminiLive] Failed to fetch identity/memories:', err);
            }
        }

        // Prepend identity to system instruction
        if (characterIdentity) {
            sessionConfig.systemInstruction = `${characterIdentity}\n\n${sessionConfig.systemInstruction}`;
        }

        try {
            const { client: ai, key } = await geminiPool.getOptimalClient(model);
            
            const session = await (ai as any).live.connect({
                model: model,
                config: sessionConfig,
                callbacks: {
                    onopen: () => {
                        console.log(`[GeminiLive] Session ${sessionId} connected`);
                        this.emit('session:connected', { sessionId, archiveId: config.archiveId });
                    },
                    onmessage: (message: any) => {
                        this.handleIncomingMessage(sessionId, message);
                    },
                    onerror: (error: any) => {
                        console.error(`[GeminiLive] Session ${sessionId} error:`, error);
                        this.emit('session:error', { sessionId, error: error.message });
                    },
                    onclose: (event: any) => {
                        console.log(`[GeminiLive] Session ${sessionId} closed:`, event.reason);
                        this.handleSessionClose(sessionId, event.reason);
                    }
                }
            });

            // Create database record
            await GeminiLiveSession.create({
                sessionId,
                userId: config.userId,
                archiveId: config.archiveId,
                startTime: new Date(),
                metadata: {
                    voiceName: config.voiceName,
                    modelName: model,
                    systemInstruction: sessionConfig.systemInstruction
                }
            });

            const sessionData: SessionData = {
                session,
                userId: config.userId,
                archiveId: config.archiveId,
                apiKey: key,
                modelName: model,
                projectId: config.projectId, // Group ID
                audioQueue: []
            };
            this.activeSessions.set(sessionId, sessionData);

            // Listen for Swarm Messages
            if (config.projectId) {
                const swarmListener = (msg: any) => {
                    // Don't relay messages from self
                    if (msg.fromAgent === config.archiveId) return;

                    const relay = `[SWARM MESSAGE from ${msg.fromAgent}${msg.type === 'broadcast' ? ' (broadcast)' : ''}]: ${msg.payload.message || JSON.stringify(msg.payload)}`;
                    console.log(`[GeminiLive] [${sessionId}] Relaying swarm message: ${relay}`);
                    
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
            console.error('[GeminiLive] Failed to create session:', error);
            throw new Error(`Failed to create Live API session: ${error.message}`);
        }
    }

    /**
     * Send audio input to the session
     */
    sendAudio(sessionId: string, audioChunk: AudioChunk): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            if(!this.notFoundSession.includes(sessionId)){
                this.notFoundSession.push(sessionId);
                console.warn(`[GeminiLive] Session ${sessionId} not found`);
            }
            return;
        }

        try {
            sessionData.session.sendRealtimeInput({
                audio: {
                    data: audioChunk.data,
                    mimeType: audioChunk.mimeType
                }
            });
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to send audio for session ${sessionId}:`, error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send video/image frame input to the session
     */
    sendVideo(sessionId: string, frameData: { data: string, mimeType: string }): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            console.warn(`[GeminiLive] Session ${sessionId} not found`);
            return;
        }

        try {
            sessionData.session.sendRealtimeInput({
                mediaChunks: [{
                    data: frameData.data,
                    mimeType: frameData.mimeType || 'image/jpeg'
                }]
            });
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to send video for session ${sessionId}:`, error);
            this.emit('session:error', { sessionId, error: error.message });
        }
    }

    /**
     * Send tool response back to Gemini
     */
    sendToolResponse(sessionId: string, functionResponses: any[]): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            console.warn(`[GeminiLive] Session ${sessionId} not found`);
            return;
        }

        try {
            // Ensure payload is correctly formatted for Google GenAI Bidi session
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
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to send tool response for session ${sessionId}:`, error);
        }
    }

    /**
     * Send text input to the session
     */
    sendText(sessionId: string, text: string): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            console.warn(`[GeminiLive] Session ${sessionId} not found`);
            return;
        }

        try {
            sessionData.session.sendRealtimeInput({
                clientContent: {
                    turns: [{
                        role: 'user',
                        parts: [{ text }]
                    }],
                    turnComplete: true
                }
            });
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to send text for session ${sessionId}:`, error);
            this.emit('session:error', { sessionId, error: error.message });
        }
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
                console.error(`[GeminiLive] Failed to update session completion in DB:`, error);
            }
            // Record usage on close or after some activity?
            // User requested to record quota.
            if (sessionData.apiKey) {
                await geminiPool.recordUsage(sessionData.apiKey, sessionData.modelName || 'gemini-2.0-flash-exp');
            }
            // Cleanup swarm listener
            if (sessionData.swarmListener && sessionData.projectId) {
                aiAgentBus.off(`message:${sessionData.projectId}`, sessionData.swarmListener);
                aiAgentBus.off(`message:${sessionData.projectId}:${sessionData.archiveId}`, sessionData.swarmListener);
            }
            this.activeSessions.delete(sessionId);
        }
        this.emit('session:closed', { sessionId, reason });
    }

    /**
     * Disconnect a session gracefully (waiting for reconnection)
     */
    disconnectSession(sessionId: string, gracePeriodMs: number = 60000): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) return;

        console.log(`[GeminiLive] Session ${sessionId} marked as disconnected. Grace period: ${gracePeriodMs}ms`);
        sessionData.isDisconnected = true;
        
        if (sessionData.disconnectTimer) clearTimeout(sessionData.disconnectTimer);
        
        sessionData.disconnectTimer = setTimeout(() => {
            console.log(`[GeminiLive] Grace period expired for session ${sessionId}. Closing...`);
            this.closeSession(sessionId);
        }, gracePeriodMs);
    }

    /**
     * Resume a disconnected session
     */
    resumeSession(sessionId: string): boolean {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            console.warn(`[GeminiLive] Cannot resume: Session ${sessionId} not found`);
            return false;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
            sessionData.disconnectTimer = undefined;
        }
        
        sessionData.isDisconnected = false;
        console.log(`[GeminiLive] Session ${sessionId} resumed`);
        return true;
    }

    /**
     * Close a session immediately
     */
    closeSession(sessionId: string): void {
        const sessionData = this.activeSessions.get(sessionId);
        if (!sessionData) {
            console.warn(`[GeminiLive] Session ${sessionId} not found`);
            return;
        }

        if (sessionData.disconnectTimer) {
            clearTimeout(sessionData.disconnectTimer);
        }

        try {
            sessionData.session.close();
        } catch (error: any) {
            console.error(`[GeminiLive] Failed to close session ${sessionId}:`, error);
        }
    }

    /**
     * Handle incoming messages from Gemini Live API
     */
    private    async handleIncomingMessage(sessionId: string, message: any): Promise<void> {
        try {
            const sessionData = this.activeSessions.get(sessionId);
            if (!sessionData) return;

            // Handle interruption
            if (message.serverContent?.interrupted) {
                console.log(`[GeminiLive] Session ${sessionId} interrupted`);
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
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.inlineData?.data) {
                        // Emit audio chunk to be sent to client
                        this.emit('audio:chunk', {
                            sessionId,
                            audioData: part.inlineData.data,
                            mimeType: part.inlineData.mimeType || 'audio/pcm;rate=24000'
                        });
                    }

                    // Handle text transcription if available
                    if (part.text) {
                        await this.saveMessage(sessionId, 'model', part.text);
                        this.emit('text:response', {
                            sessionId,
                            text: part.text
                        });
                    }
                }
            }

            // Handle tool calls (function calling)
            if (message.serverContent?.toolCall) {
                const toolCall = message.serverContent.toolCall;
                await this.saveMessage(sessionId, 'model', '', toolCall.functionCalls);

                const responses: any[] = [];
                const callsToEmit: any[] = [];

                for (const call of toolCall.functionCalls || []) {
                    let handledLocally = false;
                    let localResult: any = { success: true };

                    if (call.name === 'archive_moment') {
                        console.log(`[GeminiLive] Intercepted archive_moment:`, call.args);
                        if (sessionData.userId && sessionData.archiveId) {
                            await VTuberService.archiveEvent(
                                sessionData.userId, 
                                sessionData.archiveId, 
                                sessionId, 
                                call.args.description
                            );
                            localResult = { success: true, message: 'Moment archived to long-term memory' };
                            handledLocally = true;
                        }
                    } else if (call.name === 'update_fan_bond') {
                        console.log(`[GeminiLive] Intercepted update_fan_bond:`, call.args);
                        if (sessionData.userId && sessionData.archiveId) {
                            await VTuberService.updateSocialRelationship(
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
                        console.log(`[GeminiLive] Intercepted send_agent_message:`, call.args);
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
                        console.log(`[GeminiLive] Intercepted broadcast_to_swarm:`, call.args);
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
                        console.log(`[GeminiLive] Intercepted start_quest:`, call.args);
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
        } catch (error) {
            console.error(`[GeminiLive] Error handling incoming message for session ${sessionId}:`, error);
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
                    }
                }
            );
        } catch (error) {
            console.error(`[GeminiLive] Failed to save message to DB for session ${sessionId}:`, error);
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
}

// Singleton instance
export const geminiLiveService = new GeminiLiveService();
