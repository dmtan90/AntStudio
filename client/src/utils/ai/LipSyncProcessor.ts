/**
 * VisemeShapeAnalyzer
 * Inspired by Amoner/lipsync-engine (beer-digital)
 * 
 * Instead of just one "volume" signal, we produce 3 independent shape parameters:
 *   - open  (0-1): vertical gap between lips. High for A, O vowels.
 *   - width (0-1): horizontal stretch. High for I, E sounds (teeth-showing).
 *   - round (0-1): lip pucker. High for O, U sounds (rounded lip).
 * 
 * These are derived purely from the volume signal (0-1) with phoneme character curves,
 * since we don't have raw PCM access. If you have an AnalyserNode, you can upgrade
 * this to real FFT band analysis.
 */

export interface VisemeShape {
    /** 0=fully closed, 1=wide open (A sound) */
    open: number;
    /** 0=neutral, 1=wide smile (I/E sounds) */
    width: number;
    /** 0=neutral, 1=puckered O/U */
    round: number;
    /** Detected viseme label (A, I, O, U, M, S) */
    viseme: string;
    /** 0-1 intensity of the current articulation */
    intensity: number;
}

// These curves simulate how each shape parameter behaves as volume increases.
// Think of it as a lookup table of "how does this viseme's physical shape feel at this volume"
// Values are piecewise linear: [vol_threshold, open, width, round]
const VISEME_CURVES: Record<string, { minVol: number; maxVol: number; open: number; width: number; round: number }> = {
    // Silence (Idle) — mouth remains in natural photo state (open)
    'SIL': { minVol: 0.00, maxVol: 0.02, open: 1.00, width: 0.00, round: 0.00 },
    // M / B / P — volume is low but active, compress lips gently
    'M': { minVol: 0.02, maxVol: 0.08, open: 0.75, width: 0.00, round: 0.00 },
    // U — slightly open, strongly rounded (like "oo")
    'U': { minVol: 0.08, maxVol: 0.16, open: 0.80, width: 0.00, round: 0.90 },
    // I — half-open, strongly wide (like "ee")
    'I': { minVol: 0.30, maxVol: 0.50, open: 0.85, width: 0.85, round: 0.00 },
    // O — moderately open, very rounded
    'O': { minVol: 0.16, maxVol: 0.30, open: 0.90, width: 0.00, round: 0.90 },
    // A — wide open, neutral width, no rounding
    'A': { minVol: 0.50, maxVol: 1.00, open: 1.00, width: 0.20, round: 0.00 },
};

// Smoothed state (exponential moving average)
let _prevOpen = 0;
let _prevWidth = 0;
let _prevRound = 0;
let _prevViseme = 'M';
const EMA = 0.25; // How fast to react (lower = smoother but slower)

/**
 * Given a normalized volume (0-1), returns a VisemeShape object.
 * Applies EMA smoothing to avoid jitter between frames.
 * 
 * @param vol Current volume (0-1), should be smoothed upstream.
 * @param dt  Delta-time in seconds (default 0.033 for 30fps)
 */
export function analyzeVisemeShape(vol: number, dt = 0.033): VisemeShape {
    const clampedVol = Math.max(0, Math.min(1, vol));
    
    // Choose current viseme by volume range
    let currentCurve = VISEME_CURVES['M']; // Default: silence
    let currentViseme = 'M';
    
    for (const [label, curve] of Object.entries(VISEME_CURVES)) {
        if (clampedVol >= curve.minVol && clampedVol <= curve.maxVol) {
            currentCurve = curve;
            currentViseme = label;
            break;
        }
    }
    
    // How far into this range we are (for internal interpolation)
    const range = currentCurve.maxVol - currentCurve.minVol;
    const t = range > 0 ? (clampedVol - currentCurve.minVol) / range : 0;
    
    // Target values from curve, scaled by position in range
    // open is the only one that scales linearly with t; width/round are fixed for the phoneme
    const targetOpen = currentCurve.open * (currentViseme === 'A' ? t : 1.0);
    const targetWidth = currentCurve.width;
    const targetRound = currentCurve.round;
    
    // EMA smoothing — prevents hard cuts between phonemes
    const eased = Math.min(1, EMA + dt * 3.0);
    _prevOpen = _prevOpen * (1 - eased) + targetOpen * eased;
    _prevWidth = _prevWidth * (1 - eased) + targetWidth * eased;
    _prevRound = _prevRound * (1 - eased) + targetRound * eased;
    _prevViseme = currentViseme;
    
    return {
        open: _prevOpen,
        width: _prevWidth,
        round: _prevRound,
        viseme: currentViseme,
        intensity: clampedVol
    };
}

/**
 * Maps a VisemeShape to vertex compression parameters for Reverse Mesh Deformation.
 * Returns how many pixels (in local vertex space) to move each lip group.
 */
export interface LipDeformParams {
    /** Push upper lip DOWN by this amount (in local vertex units) */
    upperLipDown: number;
    /** Push lower lip UP by this amount */
    lowerLipUp: number;
    /** Widen/narrow lip corners horizontally */
    cornerStretch: number;
    /** Pucker: pull corners inward */
    cornerPucker: number;
}

export function computeLipDeform(shape: VisemeShape, mouthHeight: number, mouthWidth: number): LipDeformParams {
    // Closing = opposite of opening
    const closeWeight = 1.0 - shape.open;
    
    // Vertical close: each lip moves toward center proportionally
    // Reduced from 0.55 to 0.42 for a gentler "bóp nhẹ" instead of "ép chặt"
    const verticalClose = mouthHeight * closeWeight * 0.42;
    
    // Horizontal stretch for I (wide smile)
    const horizStretch = mouthWidth * shape.width * 0.15;
    
    // Pucker for O/U (inward pull of corners)
    const horizPucker = mouthWidth * shape.round * 0.12;
    
    return {
        upperLipDown: verticalClose,
        lowerLipUp: verticalClose,
        cornerStretch: horizStretch,
        cornerPucker: -horizPucker, // negative = inward
    };
}

/** Reset smoothing state (call on init or speaker change) */
export function resetVisemeShape() {
    _prevOpen = 0;
    _prevWidth = 0;
    _prevRound = 0;
    _prevViseme = 'M';
}

// Legacy compatibility
export class LipSyncProcessor {
    public getMouthOffsets(volume: number): Record<number, { x: number; y: number }> {
        const shape = analyzeVisemeShape(volume);
        const intensity = shape.open * 15;
        return {
            13: { x: 0, y: -intensity * 0.5 },
            14: { x: 0, y: intensity * 1.0 },
            78: { x: -intensity * 0.2, y: 0 },
            308: { x: intensity * 0.2, y: 0 },
        };
    }
    public applyToMesh(landmarks: any[], volume: number): any[] {
        if (!landmarks || volume < 0.02) return landmarks;
        const offsets = this.getMouthOffsets(volume);
        return landmarks.map((p, i) => offsets[i]
            ? { ...p, x: p.x + (offsets[i].x / 1280), y: p.y + (offsets[i].y / 720) }
            : p
        );
    }
}
export const lipSyncProcessor = new LipSyncProcessor();
