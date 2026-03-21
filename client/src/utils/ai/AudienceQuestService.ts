import { useStudioStore } from '@/stores/studio';
import { generateUUID } from '@/utils/uuid';

/**
 * Phase 29: Audience Quest Service
 * Manages interactive RPG-style challenges that the audience can complete together.
 */
export class AudienceQuestService {
    private questTimer: any = null;
    private questDurationMs: number = 60000; // Default 1 minute
    
    // Quest definitions library
    private readonly questLibrary: Record<string, any> = {
        'hype_ritual': {
            title: 'The Hype Ritual',
            description: 'Unleash a wave of energy in the chat!',
            target: 100,
            type: 'hype',
            rewardXp: 500,
            icon: '🔥'
        },
        'sales_surge': {
            title: 'Sales Flash Mob',
            description: 'Show interest in the products to unlock a hidden deal!',
            target: 10,
            type: 'intent',
            rewardXp: 800,
            icon: '💰'
        },
        'viral_storm': {
            title: 'Viral Storm',
            description: 'Spam likes to trigger a global celebration!',
            target: 200,
            type: 'likes',
            rewardXp: 1000,
            icon: '⚡'
        },
        'knowledge_pact': {
            title: 'Knowledge Pact',
            description: 'Ask insightful questions to deepen the discussion.',
            target: 5,
            type: 'questions',
            rewardXp: 600,
            icon: '🧠'
        }
    };

    constructor() {
        // Listen for audience signals to auto-progress quests
        if (typeof window !== 'undefined') {
            window.addEventListener('audience:signal', (e: Event) => {
                const data = (e as CustomEvent).detail;
                this.handleSignal(data);
            });
            
            // Listen for economy events (gifts)
            window.addEventListener('economy:gift', (e: Event) => {
                this.progressQuest('gift', 10); // Gifts give huge progress
            });
        }
    }

    /**
     * Start a random or specific quest
     */
    public startQuest(questKey?: string) {
        const studio = useStudioStore();
        if (studio.activeQuest) return; // Only one active quest at a time

        const keys = Object.keys(this.questLibrary);
        const key = questKey || keys[Math.floor(Math.random() * keys.length)];
        const questDef = this.questLibrary[key];

        if (!questDef) return;

        const newQuest = {
            id: generateUUID(),
            ...questDef,
            current: 0,
            completed: false,
            timestamp: Date.now()
        };

        studio.triggerQuest(newQuest);

        // Start countdown
        if (this.questTimer) clearTimeout(this.questTimer);
        this.questTimer = setTimeout(() => {
            this.handleQuestTimeout();
        }, this.questDurationMs);

        // Emit global event for overlays and AI guests to react
        window.dispatchEvent(new CustomEvent('quest:start', { detail: newQuest }));
    }

    private handleSignal(signal: any) {
        // Map signals to quest types
        if (signal.type === 'velocity_surge') {
            this.progressQuest('hype', signal.velocity * 5);
        } else if (signal.type === 'intent_spike') {
            this.progressQuest('intent', 2);
        }
    }

    /**
     * Manual progress bypass or internal trigger
     */
    public progressQuest(type: string, amount: number) {
        const studio = useStudioStore();
        if (!studio.activeQuest || studio.activeQuest.completed) return;

        // Only progress if the type matches our current quest or is a global boost
        if (studio.activeQuest.type === type || type === 'gift') {
            studio.updateQuestProgress(amount);
            
            if (studio.activeQuest.completed) {
                if (this.questTimer) clearTimeout(this.questTimer);
                window.dispatchEvent(new CustomEvent('quest:success', { detail: studio.activeQuest }));
            }
        }
    }

    private handleQuestTimeout() {
        const studio = useStudioStore();
        if (studio.activeQuest && !studio.activeQuest.completed) {
            console.log(`[Quest] Failed: ${studio.activeQuest.title}`);
            window.dispatchEvent(new CustomEvent('quest:fail', { detail: studio.activeQuest }));
            studio.activeQuest = null;
        }
    }
}

export const audienceQuestService = new AudienceQuestService();
