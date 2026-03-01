import ffmpeg from 'fluent-ffmpeg';
import { Readable } from 'stream';
import { config } from '../../utils/config.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

import { Logger } from '../../utils/Logger.js';

// Set FFmpeg paths from config
ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);

/**
 * Service for detecting non-silent regions in audio/video using FFmpeg.
 */
export class SilenceDetectionService {
    /**
     * Detects silent regions and returns non-silent (active) segments.
     * @param buffer The audio/video buffer
     * @param noise The noise threshold in dB (e.g., -30)
     * @param duration The minimum duration of silence in seconds
     */
    public async detectNonSilentRegions(buffer: Buffer, noise: number = -30, duration: number = 0.5): Promise<{ start: number, end: number }[]> {
        const tempId = uuidv4();
        const tempPath = path.join(os.tmpdir(), `${tempId}.mp4`);

        try {
            // Write buffer to temp file for FFmpeg processing
            fs.writeFileSync(tempPath, buffer);

            return new Promise((resolve, reject) => {
                const silenceStartRegex = /silence_start: ([\d.]+)/;
                const silenceEndRegex = /silence_end: ([\d.]+)/;

                const silences: { start: number, end: number }[] = [];
                let currentSilenceStart: number | null = null;
                let totalDuration = 0;

                ffmpeg(tempPath)
                    .ffprobe((err: any, data: any) => {
                        if (!err && data.format.duration) {
                            totalDuration = data.format.duration;
                        }
                    });

                ffmpeg(tempPath)
                    .audioFilters(`silencedetect=n=${noise}dB:d=${duration}`)
                    .format('null')
                    .on('start', (commandLine: string) => {
                        Logger.info(`[SilenceDetection] Spawned FFmpeg with command: ${commandLine}`);
                    })
                    .on('stderr', (stderrLine: string) => {
                        // silencedetect outputs to stderr
                        const startMatch = stderrLine.match(silenceStartRegex);
                        if (startMatch) {
                            currentSilenceStart = parseFloat(startMatch[1]);
                        }

                        const endMatch = stderrLine.match(silenceEndRegex);
                        if (endMatch && currentSilenceStart !== null) {
                            silences.push({
                                start: currentSilenceStart,
                                end: parseFloat(endMatch[1])
                            });
                            currentSilenceStart = null;
                        }
                    })
                    .on('error', (err: Error) => {
                        Logger.error('[SilenceDetection] FFmpeg error:', err);
                        reject(err);
                    })
                    .on('end', () => {
                        // Convert silences to active regions
                        const activeRegions: { start: number, end: number }[] = [];
                        let lastActivePoint = 0;

                        silences.forEach(silence => {
                            if (silence.start > lastActivePoint) {
                                activeRegions.push({
                                    start: lastActivePoint,
                                    end: silence.start
                                });
                            }
                            lastActivePoint = silence.end;
                        });

                        // Add final segment if exists
                        if (lastActivePoint < totalDuration) {
                            activeRegions.push({
                                start: lastActivePoint,
                                end: totalDuration
                            });
                        }

                        resolve(activeRegions);
                    })
                    .save('pipe:1'); // Trigger processing
            });

        } catch (error: any) {
            Logger.error('[SilenceDetectionService] Detection failed:', error.message);
            throw error;
        } finally {
            // Cleanup temp file
            if (fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch (e) { }
            }
        }
    }
}

export const silenceDetectionService = new SilenceDetectionService();
