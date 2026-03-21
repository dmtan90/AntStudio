import { vibeEngine } from './VibeEngine.js';
import { audioMixerService } from './AudioMixerService.js';
import { neuralMemoryService } from './NeuralMemoryService.js';
import { toast } from 'vue-sonner';

/**
 * Controller to orchestrate production atmosphere (Visuals + Audio) 
 * dynamic changes based on the sensed "Vibe".
 */
export class AtmosphereController {
    private currentIntensity = 0.5;

    public init() {
        vibeEngine.onVibeChange((vibe, score) => {
            this.adaptAtmosphere(vibe, score);
        });

        // Phase 23: Environmental Shift Listener
        if (typeof window !== 'undefined') {
            window.addEventListener('environmental:shift', (e: Event) => {
                const detail = (e as CustomEvent).detail;
                this.handleEnvironmentalShift(detail);
            });
        }
    }

    private handleEnvironmentalShift(detail: { context: string, vibe: string, effect: string | null }) {
        console.log(`[Atmosphere] CONTEXT SHIFT: ${detail.context}. New Effect: ${detail.effect}`);
        
        // This will be read by the renderer (AtmosphereManager) via studioStore
        if (detail.effect) {
            toast.success(`Atmosphere synced: ${detail.effect.toUpperCase()}`);
        }
        
        neuralMemoryService.recordEvent('ContextShift', `Stream context changed to ${detail.context} with vibe ${detail.vibe}`);
    }

    private adaptAtmosphere(vibe: string, score: number) {
        console.log(`[Atmosphere] Adapting to Vibe: ${vibe.toUpperCase()} (Score: ${score})`);

        // 1. AUDIO ADAPTATION
        if (vibe === 'hype') {
            audioMixerService.setVolume('stinger', 0.8);
            // Trigger upbeat background music via Music FX logic
        } else if (vibe === 'serious') {
            audioMixerService.setVolume('stinger', 0.2);
        } else {
            audioMixerService.setVolume('stinger', 0.5);
        }

        // 2. VISUAL ADAPTATION (State for Vue to read)
        if (score > 30) {
            toast.info("HIGH ENERGY DETECTED: Activating Hype Pro Filters");
        }
    }

    /**
     * returns WebGL filter string or LUT index based on vibe.
     */
    public getFilterForVibe(vibe: string): string {
        switch (vibe) {
            case 'hype': return 'saturate(1.5) contrast(1.2) brightness(1.1)';
            case 'serious': return 'grayscale(0.3) contrast(1.4) sepia(0.2)';
            case 'joy': return 'saturate(1.2) sepia(0.1) brightness(1.1)';
            default: return 'none';
        }
    }
}

export const atmosphereController = new AtmosphereController();
