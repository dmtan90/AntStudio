import axios from 'axios';

/**
 * Service to handle real-time VTuber Dubbing (Voice Cloning + Translation).
 * Translates Host's voice into target languages while maintaining their unique vocal tone.
 */
export class VTuberDubber {
    private isDubbing = false;
    private targetLanguage = 'en-US';
    private sourceLanguage = 'vi-VN';
    private currentVoiceId: string | null = null;
    private audioQueue: HTMLAudioElement[] = [];
    private isPlaying = false;
    private volume = 0.8;

    /**
     * Initializes the Dubber with the host's voice profile.
     * @param voiceId Cloned Voice ID from ElevenLabs or local provider
     */
    public initialize(voiceId: string) {
        this.currentVoiceId = voiceId;
        console.log(`[VTuberDubber] Initialized with VoiceID: ${voiceId}`);
    }

    /**
     * Processes a chunk of text (from STT) and generates VTuber audio.
     * Automatically queues and plays the audio.
     */
    public async dubText(text: string, lang?: string): Promise<string | null> {
        if (!this.isDubbing || !text) return null;

        try {
            console.log(`[VTuberDubber] Dubbing text to ${lang || this.targetLanguage}: "${text.substring(0, 30)}..."`);

            // In production, this would be a stream/binary call to ElevenLabs Multilingual V2
            // For now, we simulate the synthesize and cache process
            const response = await axios.post('/api/ai/tts/dub', {
                text,
                voiceId: this.currentVoiceId,
                language: lang || this.targetLanguage
            });

            const audioUrl = response.data.audioUrl;

            // Queue and play
            if (audioUrl) {
                this.queueAudio(audioUrl);
            }

            return audioUrl;

        } catch (error) {
            console.error("[VTuberDubber] Dubbing failed:", error);
            return null;
        }
    }

    /**
     * Queues an audio URL for playback with sequential management.
     */
    private queueAudio(url: string) {
        const audio = new Audio(url);
        audio.volume = this.volume;

        audio.onended = () => {
            this.isPlaying = false;
            this.playNext();
        };

        audio.onerror = (e) => {
            console.error("[VTuberDubber] Audio playback error:", e);
            this.isPlaying = false;
            this.playNext();
        };

        this.audioQueue.push(audio);

        if (!this.isPlaying) {
            this.playNext();
        }
    }

    /**
     * Plays the next audio in the queue.
     */
    private playNext() {
        if (this.audioQueue.length === 0) {
            this.isPlaying = false;
            return;
        }

        const nextAudio = this.audioQueue.shift();
        if (nextAudio) {
            this.isPlaying = true;
            nextAudio.play().catch(e => {
                console.error("[VTuberDubber] Play failed:", e);
                this.isPlaying = false;
                this.playNext();
            });
        }
    }

    public setDubbing(active: boolean, targetLang?: string) {
        this.isDubbing = active;
        if (targetLang) this.targetLanguage = targetLang;

        // Clear queue when disabling
        if (!active) {
            this.audioQueue.forEach(audio => audio.pause());
            this.audioQueue = [];
            this.isPlaying = false;
        }

        console.log(`[VTuberDubber] VTuber Dubbing: ${active ? 'ACTIVE' : 'OFF'} (Target: ${this.targetLanguage})`);
    }

    public setVolume(vol: number) {
        this.volume = Math.max(0, Math.min(1, vol));
        this.audioQueue.forEach(audio => audio.volume = this.volume);
    }

    public getStatus() {
        return {
            active: this.isDubbing,
            language: this.targetLanguage,
            queueLength: this.audioQueue.length,
            isPlaying: this.isPlaying
        };
    }

    public clearQueue() {
        this.audioQueue.forEach(audio => audio.pause());
        this.audioQueue = [];
        this.isPlaying = false;
    }
}

export const vtuberDubber = new VTuberDubber();
