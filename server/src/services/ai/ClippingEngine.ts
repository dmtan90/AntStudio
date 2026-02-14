import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { Project } from '../../models/Project.js';
import { systemLogger } from '../../utils/systemLogger.js';
import { socialSyndicationService } from '../SocialSyndicationService.js';
import { geminiPool } from '../../utils/gemini.js';

// FFmpeg setup
const FFMPEG_BIN = 'D:\\Tools\\vanthe_video\\bin\\ffmpeg.exe';
ffmpeg.setFfmpegPath(FFMPEG_BIN);

/**
 * Service for autonomous short-form clipping of live sessions.
 */
export class ClippingEngine {
    constructor() {}

    /**
     * Processes a recording to extract viral segments.
     */
    public async processRecording(config: { videoPath: string, projectId: string, userId: string }) {
        const { videoPath, projectId, userId } = config;

        try {
            systemLogger.info(`✂️ [ClippingEngine] Processing recording for Project: ${projectId}`, 'ClippingEngine');

            // 1. Identification logic using Gemini Flash
            const segments = await this.identifyViralSegments(videoPath);
            
            if (segments.length === 0) {
                systemLogger.info(`⚠️ [ClippingEngine] No viral segments detected for ${projectId}`, 'ClippingEngine');
                return;
            }

            systemLogger.info(`✂️ [ClippingEngine] Identified ${segments.length} segments to clip`, 'ClippingEngine');

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
                                        description: seg.description || 'AI-Generated Viral Clip',
                                        type: 'video',
                                        status: 'ready',
                                        url: `/tmp/recordings/${clipName}`, // Temporary local access
                                        metadata: { isViralClip: true, segment: seg, viralScore: seg.score }
                                    }
                                }
                            }, { new: true });

                            // 3. Trigger Syndication using the real asset ID
                            const newAsset = updatedProject?.visualAssets?.find(a => a.name === seg.title) as any;
                            if (newAsset && newAsset._id) {
                                // Don't await syndication to prevent blocking
                                socialSyndicationService.syndicateClip(projectId, newAsset._id.toString())
                                    .catch((err: any) => systemLogger.error(`Syndication failed for clip ${clipName}: ${err.message}`, 'ClippingEngine'));
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

    /**
     * Analyzes video content to find viral moments.
     */
    private async identifyViralSegments(videoPath: string): Promise<Array<{ start: number, duration: number, title: string, description: string, score: number }>> {
        try {
            // Read file buffer (Note: For very large files, createGoogleGenerativeAIFileManager is better, 
            // but for now we stick to inline buffer for consistency with other services, assuming segments < 2GB)
            // If file is too large, we might need to implement the File API
            const videoBuffer = fs.readFileSync(videoPath);
            const videoBase64 = videoBuffer.toString('base64');

            const modelName = "gemini-2.5-flash";
            const { client: ai, key } = await geminiPool.getOptimalClient(modelName);

            const prompt = `
                Analyze this video recording of a live stream/event.
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

            const result = await (ai as any).models.generateContent({
                model: modelName,
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                data: videoBase64,
                                mimeType: "video/mp4" 
                            }
                        }
                    ]
                }],
                config: {
                    responseMimeType: "application/json"
                }
            });

            const response = result.response;
            const text = response.text();
            
            // Record usage
            await geminiPool.recordUsage(key, modelName);
            let segments = JSON.parse(text);

            if (!Array.isArray(segments)) {
                 if (segments.segments) segments = segments.segments; // Handle wrapped object
                 else return [];
            }

            // Validate and sanitize
            return segments.map((s: any) => ({
                start: Number(s.start),
                duration: Number(s.duration),
                title: s.title || 'Untitled Clip',
                description: s.description || '',
                score: Number(s.score) || 5
            })).filter((s: any) => s.duration > 0 && !isNaN(s.start));

        } catch (error: any) {
             systemLogger.error(`[ClippingEngine] AI Analysis failed, falling back to basic split. Error: ${error}`, 'ClippingEngine');
             // Fallback: Return a single chunk from the middle if AI fails
             return [{ start: 0, duration: 15, title: 'Highlight (Fallback)', description: 'Auto-generated fallback clip', score: 1 }];
        }
    }
}

export const clippingEngine = new ClippingEngine();
