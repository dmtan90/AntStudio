import ffmpeg from 'fluent-ffmpeg';
import { config } from '../../utils/config.js';
import path from 'path';
import fs from 'fs';
import { Project } from '../../models/Project.js';
import { systemLogger } from '../../utils/systemLogger.js';
import { socialSyndicationService } from '../SocialSyndicationService.js';
import { GeminiClient } from '../../integrations/ai/GeminiClient.js';
import { uploadToS3, deleteFromS3 } from '../../utils/s3.js';

// FFmpeg setup - use portable installer from config
ffmpeg.setFfmpegPath(config.ffmpegPath);
ffmpeg.setFfprobePath(config.ffprobePath);

/**
 * Service for autonomous short-form clipping of live sessions.
 */
export class ClippingEngine {
    private gemini: GeminiClient;

    constructor() {
        this.gemini = new GeminiClient({});
    }

    /**
     * Processes a recording to extract viral segments.
     */
    public async processRecording(config: { videoPath: string, projectId: string, userId: string }) {
        const { videoPath, projectId, userId } = config;

        try {
            systemLogger.info(`✂️ [ClippingEngine] Processing recording for Project: ${projectId}`, 'ClippingEngine');

            // 1. Identification logic using Gemini File API
            const segments = await this.identifyViralSegments(videoPath);
            
            if (segments.length === 0) {
                systemLogger.info(`⚠️ [ClippingEngine] No viral segments detected for ${projectId}`, 'ClippingEngine');
                return;
            }

            systemLogger.info(`✂️ [ClippingEngine] Identified ${segments.length} segments to clip`, 'ClippingEngine');

            const project = await Project.findById(projectId);
            if (!project) throw new Error('Project not found');

            const clipTasks = segments.map(async (seg, idx) => {
                const clipName = `clip_${projectId}_${Date.now()}_${idx}.mp4`;
                const tempOutputPath = path.join(path.dirname(videoPath), clipName);

                return new Promise<void>((resolve, reject) => {
                    ffmpeg(videoPath)
                        .setStartTime(seg.start)
                        .setDuration(seg.duration)
                        .output(tempOutputPath)
                        .on('end', async () => {
                            try {
                                // 2. Upload to S3
                                systemLogger.info(`☁️ [ClippingEngine] Uploading clip to S3: ${clipName}`, 'ClippingEngine');
                                const fileBuffer = fs.readFileSync(tempOutputPath);
                                const s3Key = `projects/${projectId}/clips/${clipName}`;
                                
                                await uploadToS3(s3Key, fileBuffer, 'video/mp4');

                                // 3. Register as Visual Asset in DB
                                const updatedProject = await Project.findByIdAndUpdate(projectId, {
                                    $push: {
                                        visualAssets: {
                                            name: seg.title,
                                            description: seg.description || 'AI-Generated Viral Clip',
                                            type: 'video',
                                            status: 'ready',
                                            s3Key: s3Key, // Use s3Key instead of local URL
                                            metadata: { 
                                                isViralClip: true, 
                                                segment: seg, 
                                                viralScore: seg.score,
                                                duration: seg.duration
                                            }
                                        }
                                    }
                                }, { new: true });

                                // 4. Trigger Syndication using the real asset ID
                                const newAsset = updatedProject?.visualAssets?.find(a => a.name === seg.title) as any;
                                if (newAsset && newAsset._id) {
                                    socialSyndicationService.createAutonomousDraft(projectId, newAsset._id.toString(), seg.title, seg.description)
                                        .catch((err: any) => systemLogger.error(`Draft creation failed for clip ${clipName}: ${err.message}`, 'ClippingEngine'));
                                }

                                // Cleanup temp file
                                if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
                                resolve();
                            } catch (err: any) {
                                systemLogger.error(`Failed to upload/register clip ${clipName}: ${err.message}`, 'ClippingEngine');
                                reject(err);
                            }
                        })
                        .on('error', (err: any) => {
                            systemLogger.error(`FFmpeg clipping error for ${clipName}: ${err.message}`, 'ClippingEngine');
                            reject(err);
                        })
                        .run();
                });
            });

            await Promise.all(clipTasks);
            systemLogger.info(`✅ [ClippingEngine] Generated ${segments.length} viral clips for ${projectId}`, 'ClippingEngine');

        } catch (error: any) {
            systemLogger.error(`❌ [ClippingEngine] Processing failed: ${error.message}`, 'ClippingEngine');
        }
    }

    /**
     * Analyzes video content to find viral moments using Gemini File API.
     */
    private async identifyViralSegments(videoPath: string): Promise<Array<{ start: number, duration: number, title: string, description: string, score: number }>> {
        let fileUri = '';
        try {
            systemLogger.info(`📤 [ClippingEngine] Uploading video to Gemini File API for analysis...`, 'ClippingEngine');
            
            // 1. Upload file to Gemini File API
            const file: any = await this.gemini.uploadFile(videoPath, 'video/mp4', `clip_analysis_${path.basename(videoPath)}`);
            if (!file || !file.uri) throw new Error("File upload failed or missing URI");
            fileUri = file.uri;

            // 2. Wait for file to be active
            systemLogger.info(`⏳ [ClippingEngine] Waiting for video processing (File API)...`, 'ClippingEngine');
            await this.gemini.waitForFileActive(fileUri);

            // 3. Generate Analysis
            const modelName = "gemini-2.5-flash";
            const prompt = `
                Analyze this video recording.
                Identify 1-3 distinct "viral" or highly engaging segments suitable for TikTok/Shorts (15-60 seconds each).
                Look for:
                - High energy moments
                - Funny interactions
                - Key insights or "mic drop" moments
                - Intense gameplay or action (if applicable)

                Return a JSON array:
                [{
                    "start": number (seconds from start),
                    "duration": number (seconds),
                    "title": string (catchy title),
                    "description": string (why this is viral),
                    "score": number (0-10 predictability of virality)
                }]
            `;

            const result = await this.gemini.generateContent([
                { text: prompt },
                { fileData: { fileUri, mimeType: 'video/mp4' } }
            ], modelName, {
                generationConfig: {
                    responseMimeType: "application/json"
                }
            });

            const text = result.text;
            let segments = JSON.parse(text);

            if (!Array.isArray(segments)) {
                 if (segments.segments) segments = segments.segments;
                 else return [];
            }

            // Cleanup File API (Optional, but good practice)
            this.gemini.deleteFile(fileUri).catch(e => systemLogger.warn(`Failed to delete Gemini file ${fileUri}: ${e.message}`));

            // Validate and sanitize
            return segments.map((s: any) => ({
                start: Number(s.start),
                duration: Number(s.duration),
                title: s.title || 'Untitled Clip',
                description: s.description || '',
                score: Number(s.score) || 5
            })).filter((s: any) => s.duration > 0 && !isNaN(s.start));

        } catch (error: any) {
             systemLogger.error(`[ClippingEngine] AI Analysis failed. Error: ${error.message}`, 'ClippingEngine');
             if (fileUri) this.gemini.deleteFile(fileUri).catch(() => {});
             return [];
        }
    }
}

export const clippingEngine = new ClippingEngine();
