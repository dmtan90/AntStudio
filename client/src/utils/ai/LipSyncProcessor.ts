/**
 * Engine to synchronize digital persona mouth movements with neural audio.
 * Maps audio phonemes to Face Mesh landmark transformations.
 */
export class LipSyncProcessor {
    private phonemeMap: Record<string, number[]> = {
        'A': [13, 14, 312, 311], // Landmarks for open mouth
        'E': [312, 311, 82, 81],
        'O': [13, 14, 78, 308], // Rounded
        'M': [13, 14] // Closed
    };

    /**
     * Calculates the lip-sync offsets based on real-time audio analysis.
     * @param volume Current frequency intensity (0-1)
     * @param text Optional text hint for phoneme guessing
     */
    public getMouthOffsets(volume: number, text?: string): Record<number, { x: number, y: number }> {
        const offsets: Record<number, { x: number, y: number }> = {};

        // Multiplier based on volume
        const intensity = volume * 15; // Shift depth

        // Generic mouth opening landmarks (13 = upper lip, 14 = lower lip)
        offsets[13] = { x: 0, y: -intensity * 0.5 };
        offsets[14] = { x: 0, y: intensity * 1.0 };

        // Corner landmarks (78, 308) - Subtle widen based on volume
        offsets[78] = { x: -intensity * 0.2, y: 0 };
        offsets[308] = { x: intensity * 0.2, y: 0 };

        return offsets;
    }

    /**
     * Applies lip-sync transformations to raw MediaPipe landmarks.
     */
    public applyToMesh(landmarks: any[], volume: number): any[] {
        if (!landmarks || volume < 0.02) return landmarks;

        const offsets = this.getMouthOffsets(volume);

        return landmarks.map((p, i) => {
            if (offsets[i]) {
                // Return transformed coords adjusted for normalized range (0-1)
                return {
                    ...p,
                    x: p.x + (offsets[i].x / 1280), // normalize based on studio width
                    y: p.y + (offsets[i].y / 720)
                };
            }
            return p;
        });
    }
}

export const lipSyncProcessor = new LipSyncProcessor();
