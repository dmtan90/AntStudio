export interface FunctionDeclaration {
    name: string;
    description: string;
    parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
    };
}

// Avatar control tools definitions
export const AVATAR_TOOLS: FunctionDeclaration[] = [
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    {
        name: 'switch_scene',
        description: 'Switch the active studio scene to a different layout or camera focus',
        parameters: {
            type: 'object',
            properties: {
                sceneId: {
                    type: 'string',
                    enum: ['standard', 'interview', 'grid', 'shoutout', 'sale_duo', 'sale_trio', 'fullscreen', 'pip', 'sidebyside', 'supergrid', 'guestfocus'],
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
    /*{
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
    },*/
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
        },
    },
    /*{
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
    },*/
    /*{
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
    },*/
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
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
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
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
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
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
        name: 'set_eye_focus',
        description: 'Control the gaze direction of the avatar.',
        parameters: {
            type: 'object',
            properties: {
                target: { type: 'string', enum: ['camera', 'audience', 'left', 'right', 'up', 'down'], description: 'Where to look' }
            },
            required: ['target']
        }
    },*/
    /*{
        name: 'set_expression',
        description: 'Set the facial expression of the avatar (e.g., joy, sorrow, neutral).',
        parameters: {
            type: 'object',
            properties: {
                expression: { type: 'string', description: 'The emotion to express' }
            },
            required: ['expression']
        }
    },*/
    /*{
        name: 'set_mood',
        description: 'Set the overall mood/atmosphere of the avatar interaction.',
        parameters: {
            type: 'object',
            properties: {
                mood: { type: 'string', description: 'The mood to apply' }
            },
            required: ['mood']
        }
    },*/
    /*{
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
    },*/
    /*{
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
    },*/
    /*{
        name: 'stop_performance',
        description: 'Stop the current music performance or singing.',
        parameters: {
            type: 'object',
            properties: {}
        }
    },*/
    /*{
        name: 'assign_floor',
        description: 'Assign the "Floor" (speaking turn) to a specific agent in a debate or talk show.',
        parameters: {
            type: 'object',
            properties: {
                targetAgentId: { type: 'string', description: 'The ID of the agent to give common control to' }
            },
            required: ['targetAgentId']
        }
    },*/
    /*{
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
    },*/
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
