/**
 * Engine for VTuber haptic feedback simulation.
 * Maps stream intensity to physical device vibrations.
 */
export class HapticEngine {
    /**
     * Triggers a haptic pulse based on stream events.
     * @param magnitude Intensity score 0.0 - 1.0
     */
    public async triggerPulse(magnitude: number) {
        if (!('vibrate' in navigator)) return;

        console.log(`📳 [Haptic] Triggering vibration pulse: M=${magnitude}`);

        if (magnitude > 0.8) {
            // Intense Peak (e.g. Explosion, Celebration)
            navigator.vibrate([100, 50, 100, 50, 200]);
        } else if (magnitude > 0.5) {
            // Moderate Hype
            navigator.vibrate(100);
        } else {
            // Subtle Nudge
            navigator.vibrate(20);
        }
    }

    /**
     * Simulates "Virtual Bass" through high-frequency short pulses.
     */
    public async simulateVirtualBass() {
        navigator.vibrate([10, 10, 10, 10, 10]);
    }
}

export const hapticEngine = new HapticEngine();
