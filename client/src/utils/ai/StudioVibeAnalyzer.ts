import { reactive } from 'vue';

export interface VibeState {
    energy: number;       // 0 to 1 (Audio spikes, chat velocity)
    sentiment: number;    // -1 (negative) to 1 (positive)
    mood: 'chill' | 'hype' | 'tense' | 'curious' | 'professional';
    engagement: number;   // 0 to 1
}

/**
 * Quantifies the "Vibe" of the Studio based on multiple inputs.
 * used to guide AI Guest emotions and proactive conversation.
 */
export class StudioVibeAnalyzer {
    public state = reactive<VibeState>({
        energy: 0.2,
        sentiment: 0,
        mood: 'chill',
        engagement: 0.1
    });

    private audioHistory: number[] = [];
    private chatHistory: number[] = [];
    private MAX_HISTORY = 20;

    private lastMood: string = 'chill';

    public update(context: {
        voiceLevel: number,
        chatVelocity: number, // messages per minute
        userSentiment?: number
    }): boolean {
        // 1. Calculate Raw Energy
        this.audioHistory.push(context.voiceLevel);
        if (this.audioHistory.length > this.MAX_HISTORY) this.audioHistory.shift();
        
        const avgAudio = this.audioHistory.reduce((a, b) => a + b, 0) / this.audioHistory.length;
        
        // Energy derived from volume and chat speed
        this.state.energy = Math.min(1, (avgAudio * 2) + (context.chatVelocity / 50));
        
        // 2. Sentiment
        if (context.userSentiment !== undefined) {
            this.state.sentiment = (this.state.sentiment * 0.8) + (context.userSentiment * 0.2);
        }

        // 3. Mood Categorization
        const prevMood = this.state.mood;
        this.calculateMood(context.chatVelocity);
        
        // 4. Engagement
        this.state.engagement = Math.min(1, (context.chatVelocity / 30) + (avgAudio * 1.5));

        // Return true if mood actually changed
        if (prevMood !== this.state.mood) {
            console.log(`[StudioVibe] Mood shifted: ${prevMood} -> ${this.state.mood}`);
            return true;
        }
        return false;
    }

    private calculateMood(chatVelocity: number) {
        const prevMood = this.state.mood;
        
        if (this.state.energy > 0.8 || chatVelocity > 30) {
            this.state.mood = 'hype';
        } else if (this.state.sentiment < -0.4) {
            this.state.mood = 'tense';
        } else if (this.state.sentiment > 0.4) {
            this.state.mood = 'chill';
        } else if (this.state.energy > 0.5 || chatVelocity > 15) {
            this.state.mood = 'professional';
        } else if (this.state.energy < 0.2 && chatVelocity < 5) {
            this.state.mood = 'chill';
        } else {
            this.state.mood = 'chill';
        }

        if (prevMood !== this.state.mood) {
            window.dispatchEvent(new CustomEvent('show:atmosphere_shift', { 
                detail: { 
                    mood: this.state.mood,
                    sentiment: this.state.sentiment,
                    energy: this.state.energy
                } 
            }));
        }
    }

    public getPromptContext(): string {
        return `Mood: ${this.state.mood.toUpperCase()}, Energy: ${Math.round(this.state.energy * 100)}%, Sentiment: ${this.state.sentiment.toFixed(2)}`;
    }
}

export const studioVibeAnalyzer = new StudioVibeAnalyzer();
