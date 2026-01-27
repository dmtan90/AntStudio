import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { Project } from '../../models/Project.js';
import { systemLogger } from '../../utils/systemLogger.js';
import { socialSyndicationService } from '../SocialSyndicationService.js';

// FFmpeg setup
const FFMPEG_BIN = 'D:\\Tools\\vanthe_video\\bin\\ffmpeg.exe';
ffmpeg.setFfmpegPath(FFMPEG_BIN);

/**
 * Service for autonomous short-form clipping of live sessions.
 */
export class ClippingEngine {
    /**
     * Processes a recording to extract viral segments.
     */
    public async processRecording(config: { videoPath: string, projectId: string, userId: string }) {
        const { videoPath, projectId, userId } = config;

        try {
            systemLogger.info(`✂️ [ClippingEngine] Processing recording for Project: ${projectId}`, 'ClippingEngine');

            // 1. Identification logic (Mocked for Phase 7 implementation)
            // In production, this would use Vision/Audio energy analysis to find peak moments.
            const segments = [
                { start: 5, duration: 15, title: 'Viral Highlight #1' },
                { start: 45, duration: 20, title: 'Epic Moment #2' }
            ];

            const project = await Project.findById(projectId);
            if (!project) throw new Error('Project not found');

            const clipTasks = segments.map(async (seg, idx) => {
                const clipName = `clip-${Date.now()}-${idx}.mp4`;
                const outputPath = path.join(path.dirname(videoPath), clipName);

                return new Promise<void>((resolve, reject) => {
                    ffmpeg(videoPath)
                        .setStartTime(seg.start)
                        .setDuration(seg.duration)
                        .output(outputPath)
                        .on('end', async () => {
                            // 2. Register as Visual Asset
                            const updatedProject = await Project.findByIdAndUpdate(projectId, {
                                $push: {
                                    visualAssets: {
                                        name: seg.title,
                                        description: 'AI-Generated Viral Clip',
                                        type: 'video',
                                        status: 'ready',
                                        url: `/tmp/recordings/${clipName}`, // Temporary local access
                                        metadata: { isViralClip: true, segment: seg }
                                    }
                                }
                            }, { new: true });

                            // 3. Trigger Syndication (Phase 7)
                            const newAsset = updatedProject?.visualAssets?.find(a => a.name === seg.title) as any;
                            if (newAsset && newAsset._id) {
                                socialSyndicationService.syndicateClip(projectId, newAsset._id.toString());
                            }

                            resolve();
                        })
                        .on('error', (err: any) => reject(err))
                        .run();
                });
            });

            await Promise.all(clipTasks);
            systemLogger.info(`✅ [ClippingEngine] Generated ${segments.length} viral clips for ${projectId}`, 'ClippingEngine');

        } catch (error: any) {
            systemLogger.error(`❌ [ClippingEngine] Processing failed: ${error.message}`, 'ClippingEngine');
        }
    }
}

export const clippingEngine = new ClippingEngine();
