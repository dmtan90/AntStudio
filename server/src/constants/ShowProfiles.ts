export type ShowProfileType = 'ecommerce' | 'education' | 'talk_show' | 'game_show' | 'horror_story' | 'infinite_podcast';

export interface ShowProfile {
    id: ShowProfileType;
    name: string;
    description: string;
    icon: string;
    basePrompt: string;
    requiredInputs: {
        key: string;
        label: string;
        type: 'text' | 'textarea' | 'list' | 'file';
        placeholder?: string;
    }[];
}

export const SHOW_PROFILES: Record<ShowProfileType, ShowProfile> = {
    ecommerce: {
        id: 'ecommerce',
        name: 'Live Commerce Stream',
        description: 'Auto-generate a sales script for products, featuring demos and flash sales.',
        icon: 'shopping-bag',
        basePrompt: `You are the Showrunner for a high-energy Live Commerce stream. 
        Generate a minute-by-minute script that introduces products, highlights key features, creates scarcity (flash sales), and engages with viewer questions.
        Structure the show to maximize conversion rates.`,
        requiredInputs: [
            { key: 'products', label: 'Product List (Name - Price - USP)', type: 'textarea', placeholder: '1. SuperPhone X - $999 - AI Camera\n2. MegaBuds - $199 - 48h Battery' },
            { key: 'offers', label: 'Special Offers / Codes', type: 'text', placeholder: 'Use code LIVE20 for 20% off' }
        ]
    },
    education: {
        id: 'education',
        name: 'Educational Workshop',
        description: 'Structure a lecture or workshop with clear learning objectives and Q&A.',
        icon: 'book-open',
        basePrompt: `You are the Showrunner for an educational live workshop.
        Generate a structured lesson plan that breaks down the topic into key concepts, uses analogies, and pauses for audience comprehension checks (quizzes).
        Ensure the tone is authoritative yet accessible.`,
        requiredInputs: [
            { key: 'topic', label: 'Lesson Topic', type: 'text', placeholder: 'Introduction to Quantum Physics' },
            { key: 'key_points', label: 'Key Learning Points', type: 'textarea', placeholder: '- Wave-particle duality\n- Schrödinger\'s cat\n- Entanglement' }
        ]
    },
    talk_show: {
        id: 'talk_show',
        name: 'AI Talk Show',
        description: 'A dynamic debate or discussion between AI agents on a specific topic.',
        icon: 'microphone',
        basePrompt: `You are the Showrunner for a primetime Talk Show.
        Generate a run-of-show that introduces the topic, assigns opposing viewpoints to the AI guests, and guides the debate through specific talking points.
        Include moments for "Audience Polls" and "Hot Takes".`,
        requiredInputs: [
            { key: 'topic', label: 'Debate Topic', type: 'text', placeholder: 'Is AI changing art for better or worse?' },
            { key: 'guests', label: 'Guest Personas', type: 'list' }
        ]
    },
    game_show: {
        id: 'game_show',
        name: 'Interactive Game Show',
        description: 'Host a trivia or challenge show where viewers play along.',
        icon: 'trophy',
        basePrompt: `You are the Showrunner for a live Game Show.
        Generate a script that welcomes players, explains the rules, presents a series of trivia questions with increasing difficulty, and manages the scoreboard.
        Include "Bonus Rounds" and high-energy transitions.`,
        requiredInputs: [
            { key: 'theme', label: 'Game Theme', type: 'text', placeholder: '90s Pop Culture Trivia' },
            { key: 'prizes', label: 'Prizes', type: 'text', placeholder: '1000 Credits, VIP Badge' }
        ]
    },
    horror_story: {
        id: 'horror_story',
        name: 'Horror Storytelling',
        description: 'An immersive storytelling session with sound effects and atmosphere.',
        icon: 'ghost',
        basePrompt: `You are the Showrunner for a midnight Horror Storytelling stream. 
        Generate a narrative script that builds suspense, uses silence effectively, and cues specific atmospheric changes (lights, sound FX).
        The narrator should speak slowly and ominously.`,
        requiredInputs: [
            { key: 'premise', label: 'Story Premise', type: 'textarea', placeholder: 'A night watchman at an abandoned wax museum hears footsteps...' },
            { key: 'scare_factor', label: 'Scare Level (1-10)', type: 'text', placeholder: '8' }
        ]
    },
    infinite_podcast: {
        id: 'infinite_podcast',
        name: 'Infinite AI Podcast',
        description: 'Ongoing AI-to-AI discussion that never ends. Topics shift dynamically.',
        icon: 'infinity',
        basePrompt: `You are the Showrunner for an Infinite AI Podcast. 
        Your goal is to keep the conversation flowing between AI agents indefinitely. 
        Generate a script block that covers approximately 2-3 minutes of debate or discussion. 
        At the end of this block, ensure there is a natural transition point that summarizes the current state so the next block can continue seamlessly.
        Incorporate audience vibes and trending topics frequently.`,
        requiredInputs: [
            { key: 'initial_topic', label: 'Starting Topic', type: 'text', placeholder: 'The future of Mars colonization' },
            { key: 'loop_context', label: 'Initial Vibe', type: 'text', placeholder: 'Enthusiastic and speculative' }
        ]
    }
};
