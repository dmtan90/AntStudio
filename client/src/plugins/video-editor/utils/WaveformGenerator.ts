
import { createInstance } from "video-editor/lib/utils";
// @ts-ignore
import WaveformWorker from "@/workers/Waveform.worker?worker";

export class WaveformGenerator {
    private static worker: Worker | null = null;

    private static getWorker() {
        if (!this.worker) {
            this.worker = new WaveformWorker();
        }
        return this.worker;
    }

    /**
     * Generates a waveform data array from an AudioBuffer.
     * @param buffer The AudioBuffer to analyze.
     * @param samples The number of data points to generate.
     * @returns Promise resolving to number[] between 0 and 1.
     */
    static async generate(buffer: AudioBuffer, samples: number): Promise<number[]> {
        if (!buffer) return new Array(samples).fill(0);

        const channelData = buffer.getChannelData(0);

        // For very small buffers, use main thread to avoid worker overhead
        if (channelData.length < 50000) {
            return this.generateSync(channelData, samples);
        }

        return new Promise((resolve) => {
            const worker = this.getWorker();

            const handleMessage = (e: MessageEvent) => {
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                resolve(Array.from(e.data.waveform));
            };

            const handleError = (e: ErrorEvent) => {
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                console.error("Waveform worker error:", e);
                // Fallback to sync
                resolve(this.generateSync(channelData, samples));
            };

            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);

            // We clone data to avoid neutering the original AudioBuffer
            worker.postMessage({ channelData, samples });
        });
    }

    private static generateSync(channelData: Float32Array, samples: number): number[] {
        const blockSize = Math.floor(channelData.length / samples);
        const waveform: number[] = [];

        for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let max = 0;
            for (let j = 0; j < blockSize; j++) {
                const abs = Math.abs(channelData[start + j]);
                if (abs > max) max = abs;
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
            return await this.generate(audioBuffer, samples);
        } catch (error) {
            console.error("Failed to generate waveform from URL:", error);
            return new Array(samples).fill(0);
        }
    }
}
