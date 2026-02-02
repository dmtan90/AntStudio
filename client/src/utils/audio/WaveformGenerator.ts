/**
 * WaveformGenerator - Utility for generating and rendering audio waveforms
 * Uses Web Audio API to extract peak data from audio buffers
 */

export interface WaveformOptions {
    width: number
    height?: number
    color?: string
    backgroundColor?: string
    barWidth?: number
    barGap?: number
}

export class WaveformGenerator {
    private audioContext: AudioContext | null = null
    private cache: Map<string, number[]> = new Map()

    constructor() {
        // Lazy initialization of AudioContext
    }

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        }
        return this.audioContext
    }

    /**
     * Generate waveform peaks from audio URL
     */
    async generateFromUrl(audioUrl: string, width: number): Promise<number[]> {
        const cacheKey = `${audioUrl}-${width}`

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey)!
        }

        try {
            const response = await fetch(audioUrl)
            const arrayBuffer = await response.arrayBuffer()
            const peaks = await this.generateFromBuffer(arrayBuffer, width)

            // Cache the result
            this.cache.set(cacheKey, peaks)

            return peaks
        } catch (error) {
            console.error('Failed to generate waveform:', error)
            return new Array(width).fill(0)
        }
    }

    /**
     * Generate waveform peaks from ArrayBuffer
     */
    async generateFromBuffer(arrayBuffer: ArrayBuffer, width: number): Promise<number[]> {
        const audioContext = this.getAudioContext()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)

        return this.extractPeaks(audioBuffer, width)
    }

    /**
     * Extract peak values from audio buffer
     */
    private extractPeaks(buffer: AudioBuffer, width: number): number[] {
        const samples = buffer.getChannelData(0) // Use first channel
        const samplesPerPixel = Math.floor(samples.length / width)
        const peaks: number[] = []

        for (let i = 0; i < width; i++) {
            const start = i * samplesPerPixel
            const end = Math.min(start + samplesPerPixel, samples.length)
            let max = 0

            // Find peak in this segment
            for (let j = start; j < end; j++) {
                const abs = Math.abs(samples[j])
                if (abs > max) max = abs
            }

            peaks.push(max)
        }

        return peaks
    }

    /**
     * Render waveform to canvas
     */
    renderToCanvas(
        ctx: CanvasRenderingContext2D,
        peaks: number[],
        options: WaveformOptions
    ): void {
        const {
            width,
            height = 40,
            color = 'rgba(168, 85, 247, 0.6)',
            backgroundColor = 'transparent',
            barWidth = 2,
            barGap = 1
        } = options

        // Clear canvas
        ctx.clearRect(0, 0, width, height)

        // Draw background
        if (backgroundColor !== 'transparent') {
            ctx.fillStyle = backgroundColor
            ctx.fillRect(0, 0, width, height)
        }

        // Draw waveform bars
        ctx.fillStyle = color
        const totalBarWidth = barWidth + barGap
        const actualWidth = peaks.length * totalBarWidth

        peaks.forEach((peak, i) => {
            const barHeight = peak * height * 0.9 // 90% of height for padding
            const x = (i * totalBarWidth * width) / actualWidth
            const y = (height - barHeight) / 2

            ctx.fillRect(x, y, barWidth, barHeight)
        })
    }

    /**
     * Render waveform as SVG path
     */
    generateSVGPath(peaks: number[], width: number, height: number): string {
        if (peaks.length === 0) return ''

        const points: string[] = []
        const barWidth = width / peaks.length

        peaks.forEach((peak, i) => {
            const x = i * barWidth
            const barHeight = peak * height * 0.9
            const y = (height - barHeight) / 2

            if (i === 0) {
                points.push(`M ${x} ${y + barHeight / 2}`)
            }

            // Create smooth curve
            points.push(`L ${x} ${y}`)
            points.push(`L ${x + barWidth} ${y}`)
            points.push(`L ${x + barWidth} ${y + barHeight}`)
            points.push(`L ${x} ${y + barHeight}`)
        })

        return points.join(' ')
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.cache.clear()
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.clearCache()
        if (this.audioContext) {
            this.audioContext.close()
            this.audioContext = null
        }
    }
}

// Singleton instance
let instance: WaveformGenerator | null = null

export function getWaveformGenerator(): WaveformGenerator {
    if (!instance) {
        instance = new WaveformGenerator()
    }
    return instance
}
