import { studioDirector } from './StudioDirector.js';

/**
 * Neural Audio Director (Phase 28 & 34)
 * Acts as the AI Audio Engineer. Manages Background Music (BGM) crossfading,
 * Auto-Ducking (lowering volume when speaking), and Sound Effects (SFX/Foley).
 */
export class NeuralAudioDirector {
    private bgmAudio: HTMLAudioElement | null = null;
    private sfxAudio: HTMLAudioElement | null = null;
    
    private currentVibe: string = 'chill';
    private baseVolume: number = 0.4; // 40% default BGM volume
    private isDucking: boolean = false;
    private enabled: boolean = false;

    // Simulated asset paths for vibes (would be replaced with actual audio files)
    private readonly vibeTracks: Record<string, string> = {
        'chill': '/audio/bgm_chill_lofi.mp3',
        'hype': '/audio/bgm_hype_edm.mp3',
        'dramatic': '/audio/bgm_dramatic_orchestral.mp3',
        'professional': '/audio/bgm_professional_synth.mp3'
    };

    // Simulated SFX paths
    private readonly sfxLibrary: Record<string, string> = {
        'publish_viral': '/audio/sfx_cash_register.mp3',
        'react_gift': '/audio/sfx_magical_chime.mp3',
        'ui_swoosh': '/audio/sfx_ui_swoosh.mp3',
        'notification': '/audio/sfx_notification.mp3'
    };

    constructor() {
        if (typeof window !== 'undefined') {
            this.bgmAudio = new Audio();
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = this.baseVolume;

            this.sfxAudio = new Audio();
            
            // Listen for showrunner vibe changes
            window.addEventListener('showrunner:directive', (e: Event) => {
                const data = (e as CustomEvent).detail;
                if (data.vibe && data.vibe !== this.currentVibe) {
                    this.crossfadeToVibe(data.vibe);
                }
            });
        }
    }

    public setEnabled(enable: boolean) {
        this.enabled = enable;
        if (!enable && this.bgmAudio) {
            this.bgmAudio.pause();
        } else if (enable && this.bgmAudio && this.bgmAudio.src) {
            this.bgmAudio.play().catch(e => console.warn('BGM Play prevented:', e));
        }
    }

    /**
     * Smoothly crossfades BGM to the new vibe track, fetching from stock API if needed (Phase 34)
     */
    private async crossfadeToVibe(newVibe: string) {
        if (!this.bgmAudio || !this.enabled) return;
        
        console.log(`[NeuralAudioDirector] Crossfading BGM to: ${newVibe}`);
        this.currentVibe = newVibe;
        
        // Fading out
        await this.fadeAudio(this.bgmAudio, 0, 500);
        
        let newSrc = this.vibeTracks[newVibe];
        
        // Phase 34: If no local track mapping exists, try fetching from Stock Audio API
        if (!newSrc) {
            console.log(`[NeuralAudioDirector] Fetching stock BGM for vibe: ${newVibe}...`);
            const stockAudio = await studioDirector.fetchStockMedia('sound', newVibe);
            if (stockAudio && stockAudio.url) {
                newSrc = stockAudio.url;
            } else {
                newSrc = this.vibeTracks['chill']; // Fallback
            }
        }

        if (this.bgmAudio) {
            this.bgmAudio.src = newSrc;
            this.bgmAudio.play().catch(() => {});
            this.fadeAudio(this.bgmAudio, this.isDucking ? 0.15 : this.baseVolume, 500);
        }
    }

    /**
     * Auto-Ducking algorithm to lower BGM when people are speaking
     * @param voiceLevel The current audio level of the host/guests (0.0 to 1.0)
     */
    public processAutoDucking(voiceLevel: number) {
        if (!this.bgmAudio || !this.enabled) return;

        // Threshold for speaking
        if (voiceLevel > 0.1 && !this.isDucking) {
            this.isDucking = true;
            console.log('[NeuralAudioDirector] Auto-Ducking: ENGAGED (Voice detected)');
            // Fade down to 15% quickly (200ms)
            this.fadeAudio(this.bgmAudio, 0.15, 200);
        } else if (voiceLevel <= 0.05 && this.isDucking) {
            this.isDucking = false;
            console.log('[NeuralAudioDirector] Auto-Ducking: RELEASED (Silence)');
            // Fade back up to base volume slowly (1000ms)
            this.fadeAudio(this.bgmAudio, this.baseVolume, 1000);
        }
    }

    /**
     * Play a specific sound effect on top of everything
     */
    public async playSFX(effectName: string) {
        if (!this.enabled || !this.sfxAudio) return;
        
        let src = this.sfxLibrary[effectName];
        
        if (!src) {
            // Phase 34: Use Sound API if local SFX not found
            const stockAudio = await studioDirector.fetchStockMedia('sound', effectName);
            if (stockAudio && stockAudio.url) {
                src = stockAudio.url;
            }
        }

        if (src) {
            console.log(`[NeuralAudioDirector] Playing Foley SFX: ${effectName}`);
            // Clone audio to allow overlapping sounds
            const sfx = new Audio(src);
            sfx.volume = 0.8;
            sfx.play().catch(e => console.warn('SFX Play prevented:', e));
        }
    }

    // Helper to fade HTMLAudioElement volume
    private fadeAudio(element: HTMLAudioElement, targetVolume: number, durationMs: number): Promise<void> {
        return new Promise(resolve => {
            const startVolume = element.volume;
            const change = targetVolume - startVolume;
            const steps = 20;
            const stepTime = durationMs / steps;
            let currentStep = 0;

            const fadeInterval = setInterval(() => {
                currentStep++;
                let newVol = startVolume + (change * (currentStep / steps));
                // clamp 0 - 1
                element.volume = Math.max(0, Math.min(1, newVol));
                
                if (currentStep >= steps) {
                    clearInterval(fadeInterval);
                    element.volume = targetVolume;
                    resolve();
                }
            }, stepTime);
        });
    }

    // Expose state for Dashboard HUD
    public getState() {
        return {
            enabled: this.enabled,
            currentVibe: this.currentVibe,
            isDucking: this.isDucking,
            volume: this.bgmAudio ? Math.round(this.bgmAudio.volume * 100) : 0
        };
    }
}

export const neuralAudioDirector = new NeuralAudioDirector();
