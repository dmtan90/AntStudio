/**
 * Engine for sensing the "Vibe" of the live broadcast.
 * Aggregates audience chat sentiment and host emotional expressions.
 */
export class VibeEngine {
    private currentVibe: 'calm' | 'hype' | 'serious' | 'joy' = 'calm';
    private history: { timestamp: number, score: number, vibe: string }[] = [];
    private listeners: ((vibe: string, score: number) => void)[] = [];

    private sentimentKeywords = {
        hype: ['wow', 'amazing', 'love', 'fire', 'lfg', 'hype', '🔥', '🚀', '❤️'],
        serious: ['why', 'problem', 'wait', 'issue', 'bad', 'fix', 'error'],
        joy: ['lol', 'haha', 'funny', '😂', 'iconic']
    };

    /**
     * Analyzes a batch of chat messages to update audience sentiment.
     */
    public analyzeChat(messages: any[]) {
        if (messages.length === 0) return;

        let score = 0;
        const recent = messages.slice(-10); // Look at last 10 messages

        recent.forEach(m => {
            const text = m.text?.toLowerCase() || '';
            this.sentimentKeywords.hype.forEach(k => { if (text.includes(k)) score += 2; });
            this.sentimentKeywords.joy.forEach(k => { if (text.includes(k)) score += 1.5; });
            this.sentimentKeywords.serious.forEach(k => { if (text.includes(k)) score -= 1.5; });
        });

        this.updateVibe(score);
    }

    /**
     * Analyzes host facial landmarks to detect emotion.
     */
    public analyzeHost(landmarks: any) {
        if (!landmarks) return;

        // Simplified emotion detection logic
        // 13, 14 = Mouth opening. 70, 105 = Eyebrow height.
        const mouthOpen = Math.abs(landmarks[13].y - landmarks[14].y);
        const browHeight = (landmarks[70].y + landmarks[105].y) / 2;

        if (mouthOpen > 0.05) {
            // Host is likely laughing or surprised
            this.updateVibe(5);
        }
    }

    private updateVibe(delta: number) {
        let numericVibe = this.getNumericVibe();
        numericVibe += delta;

        // Clamp & Set State
        if (numericVibe > 20) this.currentVibe = 'hype';
        else if (numericVibe > 10) this.currentVibe = 'joy';
        else if (numericVibe < -5) this.currentVibe = 'serious';
        else this.currentVibe = 'calm';

        this.history.push({ timestamp: Date.now(), score: numericVibe, vibe: this.currentVibe });
        if (this.history.length > 100) this.history.shift();

        this.notifyListeners();
    }

    private getNumericVibe(): number {
        if (this.currentVibe === 'hype') return 25;
        if (this.currentVibe === 'joy') return 15;
        if (this.currentVibe === 'serious') return -10;
        return 0;
    }

    public onVibeChange(callback: (vibe: string, score: number) => void) {
        this.listeners.push(callback);
    }

    private notifyListeners() {
        this.listeners.forEach(cb => cb(this.currentVibe, this.getNumericVibe()));
    }

    public getHistory() {
        return this.history;
    }

    public getCurrentVibe() {
        return this.currentVibe;
    }
}

export const vibeEngine = new VibeEngine();
