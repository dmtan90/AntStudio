import { reactive } from 'vue';

export interface VFXEvent {
    type: 'shake' | 'flash' | 'particles';
    intensity: number;
    duration: number;
    timestamp: number;
}

class DirectorVFXService {
    public events: VFXEvent[] = reactive([]);

    public triggerShake(intensity = 5, duration = 300) {
        this.addEvent({ type: 'shake', intensity, duration, timestamp: Date.now() });
    }

    public triggerFlash(intensity = 0.5, duration = 200) {
        this.addEvent({ type: 'flash', intensity, duration, timestamp: Date.now() });
    }

    public triggerParticles(intensity = 1.0, duration = 1000) {
        this.addEvent({ type: 'particles', intensity, duration, timestamp: Date.now() });
    }

    private addEvent(event: VFXEvent) {
        this.events.push(event);
        // Auto-cleanup after duration
        setTimeout(() => {
            const idx = this.events.indexOf(event);
            if (idx > -1) this.events.splice(idx, 1);
        }, event.duration + 100);
    }

    public getActiveShake(): number {
        let maxShake = 0;
        const now = Date.now();
        for (const e of this.events) {
            if (e.type === 'shake') {
                const elapsed = now - e.timestamp;
                const progress = 1 - (elapsed / e.duration);
                if (progress > 0) {
                    maxShake = Math.max(maxShake, e.intensity * progress);
                }
            }
        }
        return maxShake;
    }
}

export const directorVFX = new DirectorVFXService();
