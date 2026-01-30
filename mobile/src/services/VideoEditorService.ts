import { FFmpegKit, FFmpegKitConfig, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';
import RNFS from 'react-native-fs';
import { Clip, Effect } from '../stores/useEditorStore';

class VideoEditorService {
    // Trim video clip
    async trimClip(inputPath: string, startTime: number, duration: number): Promise<string> {
        try {
            const outputPath = `${RNFS.CachesDirectoryPath}/trimmed_${Date.now()}.mp4`;

            // -ss before -i is faster (input seeking)
            const command = `-ss ${startTime} -i ${inputPath} -t ${duration} -c copy ${outputPath}`;

            const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();

            if (ReturnCode.isSuccess(returnCode)) {
                return outputPath;
            } else {
                throw new Error('Failed to trim video');
            }
        } catch (error) {
            console.error('Trim error:', error);
            throw error;
        }
    }

    // Apply effects to video
    async applyEffects(inputPath: string, effects: Effect[]): Promise<string> {
        try {
            const outputPath = `${RNFS.CachesDirectoryPath}/effects_${Date.now()}.mp4`;

            let filterComplex = '';

            effects.forEach((effect) => {
                switch (effect.type) {
                    case 'filter':
                        filterComplex += this.getFilterString(effect);
                        break;
                    case 'speed':
                        filterComplex += `setpts=${1 / effect.params.speed}*PTS,`;
                        break;
                    case 'adjustment':
                        filterComplex += this.getAdjustmentString(effect);
                        break;
                }
            });

            // Remove trailing comma if exists
            if (filterComplex.endsWith(',')) {
                filterComplex = filterComplex.slice(0, -1);
            }

            const command = `-i ${inputPath} -vf "${filterComplex}" -c:a copy ${outputPath}`;

            const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();

            if (ReturnCode.isSuccess(returnCode)) {
                return outputPath;
            } else {
                throw new Error('Failed to apply effects');
            }
        } catch (error) {
            console.error('Effects error:', error);
            throw error;
        }
    }

    // Merge clips
    async mergeClips(clips: Clip[]): Promise<string> {
        try {
            const outputPath = `${RNFS.CachesDirectoryPath}/merged_${Date.now()}.mp4`;

            // Create concat file
            const concatFile = `${RNFS.CachesDirectoryPath}/concat_${Date.now()}.txt`;
            const concatContent = clips.map((clip) => `file '${clip.uri}'`).join('\n');
            await RNFS.writeFile(concatFile, concatContent, 'utf8');

            const command = `-f concat -safe 0 -i ${concatFile} -c copy ${outputPath}`;

            const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();

            if (ReturnCode.isSuccess(returnCode)) {
                // Clean up concat file
                await RNFS.unlink(concatFile).catch(() => { });
                return outputPath;
            } else {
                throw new Error('Failed to merge clips');
            }
        } catch (error) {
            console.error('Merge error:', error);
            throw error;
        }
    }

    // Export final video
    async exportVideo(
        clips: Clip[],
        outputQuality: '720p' | '1080p' = '1080p',
        onProgress?: (progress: number) => void
    ): Promise<string> {
        try {
            const outputPath = `${RNFS.DocumentDirectoryPath}/export_${Date.now()}.mp4`;

            let filterComplex = '';
            let inputs = '';

            // Construct inputs and filter graph safely
            clips.forEach((clip, index) => {
                inputs += `-i ${clip.uri} `;
                // Assume 1 video and 1 audio stream per file for safety
                filterComplex += `[${index}:v][${index}:a]`;
            });

            const resolution = outputQuality === '1080p' ? '1920:1080' : '1280:720';

            // Concat filter: n=clips.length, v=1 (video out), a=1 (audio out)
            filterComplex += `concat=n=${clips.length}:v=1:a=1[outv][outa];[outv]scale=${resolution}[vscale]`;

            // Map the scaled video and the concatenated audio
            const command = `${inputs}-filter_complex "${filterComplex}" -map "[vscale]" -map "[outa]" -c:v libx264 -preset ultrafast -crf 28 ${outputPath}`;

            // Enable statistics callback for progress
            FFmpegKitConfig.enableStatisticsCallback((statistics) => {
                const time = statistics.getTime();
                if (time > 0) {
                    const progress = time / 1000;
                    onProgress?.(progress);
                }
            });

            const session = await FFmpegKit.execute(command);
            const returnCode = await session.getReturnCode();

            if (ReturnCode.isSuccess(returnCode)) {
                return outputPath;
            } else {
                const logs = await session.getLogs();
                const failLog = logs[logs.length - 1]?.getMessage();
                throw new Error(`Failed to export video: ${failLog}`);
            }
        } catch (error) {
            console.error('Export error:', error);
            throw error;
        }
    }

    // Helper: Get filter string for effect
    private getFilterString(effect: Effect): string {
        switch (effect.name) {
            case 'vintage':
                return 'curves=vintage,';
            case 'blackwhite':
                return 'hue=s=0,';
            case 'cinematic':
                // simple approximation
                return 'eq=contrast=1.2:saturation=1.2,curves=strong_contrast,';
            default:
                return '';
        }
    }

    // Helper: Get adjustment string
    private getAdjustmentString(effect: Effect): string {
        const { brightness, contrast, saturation } = effect.params;
        return `eq=brightness=${brightness || 0}:contrast=${contrast || 1}:saturation=${saturation || 1},`;
    }

    // Get video metadata
    async getVideoInfo(path: string): Promise<{ duration: number; width: number; height: number }> {
        try {
            const session = await FFprobeKit.getMediaInformation(path);
            const info = session.getMediaInformation();

            if (!info) {
                return { duration: 0, width: 1920, height: 1080 };
            }

            const format = info.getFormat();
            const streams = info.getStreams();
            const videoStream = streams.find((s: any) => s.getType() === 'video');

            return {
                duration: parseFloat(String(format.getDuration() || '0')),
                width: videoStream ? Number(videoStream.getWidth()) : 1920,
                height: videoStream ? Number(videoStream.getHeight()) : 1080,
            };
        } catch (error) {
            console.error('Get info error:', error);
            return { duration: 0, width: 1920, height: 1080 };
        }
    }
}

export const videoEditorService = new VideoEditorService();
