
import { getFileUrl } from "@/utils/api";

export interface SilenceRegion {
    start: number;
    end: number;
    isSilent: boolean;
}

export interface SilenceDetectionOptions {
    threshold?: number;
    minSilenceDuration?: number;
    onProgress?: (p: number) => void;
}

export class SilenceDetectionService {
    async analyze(videoUrl: string, options: SilenceDetectionOptions = {}): Promise<SilenceRegion[]> {
        const { 
            threshold = 0.02, 
            minSilenceDuration = 0.5, 
            onProgress = () => {} 
        } = options;
        const url = await getFileUrl(videoUrl);
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        const sampleRate = audioBuffer.sampleRate;
        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const duration = audioBuffer.duration;
        
        const regions: SilenceRegion[] = [];
        const step = 0.1; // Check every 100ms
        const stepSamples = Math.floor(step * sampleRate);
        
        let isCurrentSilent = false;
        let regionStart = 0;
        
        for (let i = 0; i < channelData.length; i += stepSamples) {
            const end = Math.min(i + stepSamples, channelData.length);
            let sum = 0;
            for (let j = i; j < end; j++) {
                sum += channelData[j] * channelData[j];
            }
            const rms = Math.sqrt(sum / (end - i));
            const silent = rms < threshold;
            const currentTime = i / sampleRate;
            
            if (i === 0) {
                isCurrentSilent = silent;
                regionStart = 0;
            } else if (silent !== isCurrentSilent) {
                regions.push({
                    start: regionStart,
                    end: currentTime,
                    isSilent: isCurrentSilent
                });
                isCurrentSilent = silent;
                regionStart = currentTime;
            }
            
            if (onProgress && i % (stepSamples * 10) === 0) {
                onProgress((i / channelData.length) * 100);
            }
        }
        
        regions.push({
            start: regionStart,
            end: duration,
            isSilent: isCurrentSilent
        });
        
        // Post-process: Filter out silent regions that are too short
        const processedRegions: SilenceRegion[] = [];
        for (const region of regions) {
            if (region.isSilent && (region.end - region.start) < minSilenceDuration) {
                // Too short to be considered "silence", merge with surrounding
                const last = processedRegions[processedRegions.length - 1];
                if (last && !last.isSilent) {
                    last.end = region.end;
                } else {
                    processedRegions.push({ ...region, isSilent: false });
                }
            } else {
                const last = processedRegions[processedRegions.length - 1];
                if (last && last.isSilent === region.isSilent) {
                    last.end = region.end;
                } else {
                    processedRegions.push(region);
                }
            }
        }
        
        if (onProgress) onProgress(100);
        return processedRegions;
    }
}

export const silenceDetectionService = new SilenceDetectionService();
