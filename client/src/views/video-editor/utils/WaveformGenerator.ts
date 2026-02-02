
import { createInstance } from "video-editor/lib/utils";

export class WaveformGenerator {
    /**
     * Generates a waveform data array from an AudioBuffer.
     * @param buffer The AudioBuffer to analyze.
     * @param samples The number of data points to generate.
     * @returns An array of numbers between 0 and 1 representing the peak amplitude.
     */
    static generate(buffer: AudioBuffer, samples: number): number[] {
        if (!buffer) return new Array(samples).fill(0);

        const channelData = buffer.getChannelData(0); // Use first channel (Left)
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let max = 0;
            for (let j = 0; j < blockSize; j++) {
                if (channelData[start + j]) {
                    const abs = Math.abs(channelData[start + j]);
                    if (abs > max) max = abs;
                }
            }
            waveform.push(max);
        }

        return waveform;
    }

    /**
     * Generates a waveform from a URL (decodes it first).
     * @param url The URL of the audio file.
     * @param samples The number of samples.
     * @returns Promise resolving to number[].
     */
    static async generateFromUrl(url: string, samples: number): Promise<number[]> {
        try {
            const context = createInstance(AudioContext);
            const response = await fetch(url);
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await context.decodeAudioData(arrayBuffer);
            return this.generate(audioBuffer, samples);
        } catch (error) {
            console.error("Failed to generate waveform from URL:", error);
            return new Array(samples).fill(0);
        }
    }
}
