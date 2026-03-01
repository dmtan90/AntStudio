
import { getFileUrl } from "@/utils/api";

export class BeatDetectionService {
    async analyze(audioUrl: string, onProgress?: (p: number) => void): Promise<number[]> {
        const url = await getFileUrl(audioUrl);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const sampleRate = audioBuffer.sampleRate;
        const channelData = audioBuffer.getChannelData(0);
        
        // Simple Energy-based Onset Detection
        const beats: number[] = [];
        const winSize = 1024;
        const hopSize = 512;
        const energyBuffer: number[] = [];
        
        if (onProgress) onProgress(10);

        for (let i = 0; i < channelData.length; i += hopSize) {
            let energy = 0;
            const end = Math.min(i + winSize, channelData.length);
            for (let j = i; j < end; j++) {
                energy += channelData[j] * channelData[j];
            }
            energyBuffer.push(energy);
        }

        if (onProgress) onProgress(50);

        // Simple peak picking
        const threshold = 1.5; // Average energy multiplier
        const localWindow = 10;
        
        for (let i = localWindow; i < energyBuffer.length - localWindow; i++) {
            let avgEnergy = 0;
            for (let j = i - localWindow; j <= i + localWindow; j++) {
                avgEnergy += energyBuffer[j];
            }
            avgEnergy /= (localWindow * 2 + 1);

            if (energyBuffer[i] > avgEnergy * threshold) {
                // Potential beat
                const time = (i * hopSize) / sampleRate;
                
                // Avoid double detection (min 200ms between beats)
                if (beats.length === 0 || time - beats[beats.length - 1] > 0.2) {
                    beats.push(time);
                }
            }
        }

        if (onProgress) onProgress(100);
        return beats;
    }
}

export const beatDetectionService = new BeatDetectionService();
