import * as PIXI from 'pixi.js';

/**
 * High-Performance Custom PIXI Filter for Chromakey
 * Processes Video -> Transparent Mesh in a single GPU pass.
 */
export class ChromakeyFilter extends PIXI.Filter {
    constructor(keyColor = [0, 1, 0], similarity = 0.08, smoothness = 0.05) {
        const fragment = `
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;
            uniform vec3 uKeyColor;
            uniform float uSimilarity;
            uniform float uSmoothness;

            void main(void) {
                vec4 texColor = texture2D(uSampler, vTextureCoord);
                
                // Convert to YCbCr for better chromakey
                float maskY = 0.2989 * uKeyColor.r + 0.5866 * uKeyColor.g + 0.1145 * uKeyColor.b;
                float maskCr = 0.7132 * (uKeyColor.r - maskY);
                float maskCb = 0.5647 * (uKeyColor.b - maskY);
                
                float Y = 0.2989 * texColor.r + 0.5866 * texColor.g + 0.1145 * texColor.b;
                float Cr = 0.7132 * (texColor.r - Y);
                float Cb = 0.5647 * (texColor.b - Y);
                
                float chromaDist = distance(vec2(Cr, Cb), vec2(maskCr, maskCb));
                float colorDist = chromaDist + abs(Y - maskY) * 0.1;

                float blendValue = smoothstep(uSimilarity, uSimilarity + uSmoothness, colorDist);
                
                // Advanced Spill Suppression
                // If a pixel is somewhat close to green but still visible
                float despillFactor = 1.0 - smoothstep(uSimilarity + uSmoothness, uSimilarity + uSmoothness + 0.1, colorDist);
                if (despillFactor > 0.0) {
                    float maxRB = max(texColor.r, texColor.b);
                    if (texColor.g > maxRB) {
                        texColor.g = mix(texColor.g, maxRB, despillFactor * 0.8);
                    }
                }
                
                // Strict Premultiplied Alpha
                gl_FragColor = vec4(texColor.rgb * blendValue, texColor.a * blendValue);
            }
        `;
        super(undefined, fragment, {
            uKeyColor: new Float32Array(keyColor),
            uSimilarity: similarity,
            uSmoothness: smoothness
        });
    }

    set keyColor(v: number[] | Float32Array) { 
        this.uniforms.uKeyColor = new Float32Array(v);
    }
    
    set similarity(v: number) { this.uniforms.uSimilarity = v; }
    set smoothness(v: number) { this.uniforms.uSmoothness = v; }

    /**
     * Detect the background key color, if it's a chroma key, and the optimal shader parameters.
     * Works for any solid background: bright green, dark green, blue, etc.
     * Calculates dynamic similarity/smoothness based on the background's variance.
     */
    static analyzeBackground(video: HTMLVideoElement | HTMLImageElement): {
        isChromaKey: boolean;
        color: number[];
        similarity: number;
        smoothness: number;
    } {
        const W = 160, H = 160;
        const canvas = document.createElement('canvas');
        canvas.width = W; canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return { isChromaKey: false, color: [0, 1, 0], similarity: 0.08, smoothness: 0.2 };
        
        ctx.drawImage(video, 0, 0, W, H);
        const data = ctx.getImageData(0, 0, W, H).data;

        const px = (x: number, y: number) => {
            const i = (y * W + x) * 4;
            return [data[i] / 255, data[i+1] / 255, data[i+2] / 255];
        };

        // Sample border pixels: top strip + left/right strips (avoid character center)
        const samples: number[][] = [];
        for (let x = 5; x < W - 5; x += 6) {               // top row
            samples.push(px(x, 3));
            samples.push(px(x, 6));
        }
        for (let y = 10; y < H * 0.6; y += 6) {             // left/right columns
            samples.push(px(3, y));
            samples.push(px(W - 4, y));
        }

        // 1. Compute mean color
        let rSum = 0, gSum = 0, bSum = 0;
        samples.forEach(([r,g,b]) => { rSum+=r; gSum+=g; bSum+=b; });
        const n = samples.length;
        const meanR = rSum/n, meanG = gSum/n, meanB = bSum/n;

        // 2. Check chroma saturation to ignore black/white/grey
        const maxC = Math.max(meanR, meanG, meanB);
        const minC = Math.min(meanR, meanG, meanB);
        const chromaD = maxC - minC;

        if (maxC < 0.1 || chromaD < 0.08) {
            return { isChromaKey: false, color: [0, 1, 0], similarity: 0.08, smoothness: 0.2 }; // Not a colored chroma key
        }

        // 3. Compute variance (average deviation from mean distance)
        let varianceSum = 0;
        samples.forEach(([r,g,b]) => {
            const d = Math.sqrt((r-meanR)**2 + (g-meanG)**2 + (b-meanB)**2);
            varianceSum += d;
        });
        const avgDeviation = varianceSum / samples.length;

        // 4. Decide if it's a chroma key
        const isChromaKey = avgDeviation < 0.12;

        if (!isChromaKey) {
            return { isChromaKey: false, color: [0, 1, 0], similarity: 0.08, smoothness: 0.2 };
        }

        // 5. Calculate Dynamic Similarity and Smoothness
        // If variance is very low (perfect uniform background), keep similarity tight (0.35 - 0.40)
        // If variance is higher (noisy background/lighting), loosen similarity (0.45 - 0.55) to catch shadows/highlights
        
        // Base similarity very low (0.08) for solid backgrounds to preserve dark clothing/hair. Add up to 0.12 based on deviation.
        let dynamicSimilarity = 0.08 + (avgDeviation / 0.12) * 0.12;
        // Clamp similarity to sane limits: 0.08 is safe, 0.20 is upper bound for noisy green screens.
        dynamicSimilarity = Math.min(Math.max(dynamicSimilarity, 0.08), 0.20);

        // Smoothness controls the gradient alpha edge. A noisier background needs slightly more smoothness to not look harsh.
        // Keep it much lower (0.02 - 0.06) to avoid aggressive transparency bleed into the character.
        let dynamicSmoothness = 0.02 + (avgDeviation / 0.12) * 0.04;
        dynamicSmoothness = Math.min(Math.max(dynamicSmoothness, 0.02), 0.06);

        return {
            isChromaKey: true,
            color: [meanR, meanG, meanB],
            similarity: dynamicSimilarity,
            smoothness: dynamicSmoothness
        };
    }
}
