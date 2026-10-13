import { Project } from '../../models/Project.js';
import { aiManager } from '../../utils/ai/AIServiceManager.js';
import { uploadToS3, S3KeyGenerator } from '../../utils/s3.js';
import { connectDB } from '../../utils/db.js';
import { Logger } from '../../utils/Logger.js';
import { socketServer } from '../streaming/SocketServer.js';

/**
 * Storyboard video generation for a project (POST /projects/:id/assets/generate with type 'video',
 * and the batch POST /projects/:id/storyboard/generate-assets). Runs through VideoJobService, so it
 * uses the BullMQ queue when Redis is configured.
 *
 * The project is updated with targeted $set/$push operations instead of saving a document loaded
 * minutes earlier: a full save would overwrite edits the user made to the project while the video
 * was being generated (and the results of other segments finishing in parallel).
 */
export interface SegmentVideoJobData {
    userId: string;
    projectId: string;
    /** Storyboard segment to attach the video to; null for a free-standing project asset */
    segmentOrder: number | null;
    segmentDuration?: number;
    prompt: string;
    modelId?: string;
    providerId?: string;
    /** Provider options (aspectRatio, duration, imageStart, imageEnd, characterImages, ...) */
    options: Record<string, any>;
    /** Also list the video in project.visualAssets */
    addToAssets: boolean;
    assetName?: string;
    description?: string;
}

/** Sets storyboard.segments[order].generatedVideo without touching the rest of the project. */
export async function setSegmentVideo(projectId: string, segmentOrder: number, generatedVideo: Record<string, any>, extra: Record<string, any> = {}) {
    await Project.updateOne(
        { _id: projectId, 'storyboard.segments.order': segmentOrder },
        { $set: { 'storyboard.segments.$.generatedVideo': generatedVideo }, ...extra }
    );
}

export async function runSegmentVideoJob(jobId: string, data: SegmentVideoJobData) {
    const { userId, projectId, segmentOrder } = data;
    try {
        const result = await aiManager.generateVideo(data.prompt, data.modelId, data.providerId, data.options);

        const s3Key = segmentOrder
            ? S3KeyGenerator.sceneVideo(projectId, segmentOrder)
            : S3KeyGenerator.asset(projectId, 'video', `${Date.now()}`, 'mp4');
        await uploadToS3(s3Key, result.buffer, result.mimeType || 'video/mp4');

        await connectDB();
        const assetPush = data.addToAssets
            ? { $push: { visualAssets: { name: data.assetName || `Video ${Date.now()}`, description: data.description, type: 'video', status: 'ready', s3Key, createdAt: new Date() } } }
            : {};
        if (segmentOrder) {
            await setSegmentVideo(projectId, segmentOrder, { s3Key, status: 'completed', generatedAt: new Date(), duration: data.segmentDuration }, assetPush);
            socketServer.emitProjectUpdate(userId, projectId, { type: 'segment_video_ready', segmentOrder, jobId });
        } else if (data.addToAssets) {
            await Project.updateOne({ _id: projectId }, assetPush);
        }
        Logger.info(`[SegmentVideo] ${jobId}: project ${projectId} segment ${segmentOrder ?? '-'} ready`, 'VideoJobs');
        return { jobId, url: s3Key, media: null };
    } catch (error: any) {
        if (segmentOrder) {
            await setSegmentVideo(projectId, segmentOrder, { s3Key: '', status: 'failed', generatedAt: new Date() })
                .catch((dbError: any) => Logger.error(`[SegmentVideo] Could not mark segment ${segmentOrder} failed: ${dbError?.message}`, 'VideoJobs'));
            socketServer.emitProjectUpdate(userId, projectId, { type: 'segment_video_failed', segmentOrder, jobId, error: error?.message });
        }
        throw error;
    }
}
