import { randomUUID } from 'crypto';
import type { Job, Queue, QueueEvents, Worker } from 'bullmq';
import { generateVideo, Veo3GenerateOptions } from '../../utils/AIGenerator.js';
import { refundUserCredits } from '../../utils/credits.js';
import { Media } from '../../models/Media.js';
import { ServiceType } from '../../models/CreditUsage.js';
import { configService } from '../../utils/ConfigService.js';
import { connectDB } from '../../utils/db.js';
import { Logger } from '../../utils/Logger.js';
import { isRedisConfigured, getRedisConnectionOptions } from '../system/RedisService.js';
import { socketServer } from '../streaming/SocketServer.js';

/**
 * AI video generation jobs (POST /api/ai/generate-video).
 *
 * Without Redis the video is generated inside the request, as before. When Redis is configured the
 * job goes through a BullMQ queue instead, so generation is bounded by worker concurrency, survives
 * a restart of the node that accepted it, and can run on dedicated worker nodes:
 *   VIDEO_QUEUE=off                 keep generating inside the request even with Redis
 *   VIDEO_WORKER=off                this node only enqueues (API node); another node runs the worker
 *   VIDEO_WORKER_CONCURRENCY=2      videos generated at the same time per worker node
 *
 * Clients that send `async: true` get 202 { jobId } at once and follow the job via
 * GET /api/ai/video-status/:jobId or the `ai:video-job` socket event (user:<id> room).
 * Other clients keep waiting for { media, url } as before.
 */
export interface VideoJobData {
    userId: string;
    prompt: string;
    duration: number;
    aspectRatio: NonNullable<Veo3GenerateOptions['aspectRatio']>;
    imageStart?: string;
    imageEnd?: string;
    characterImages?: string[];
    filename: string;
    /** Credits deducted when the job was accepted; refunded if it fails */
    creditAmount: number;
    creditDescription: string;
}

export interface VideoJobResult {
    jobId: string;
    url: string;
    media: any;
}

export type VideoJobStatus = 'pending' | 'processing' | 'completed' | 'failed';

const QUEUE_NAME = 'ai-video';
const JOB_NAME = 'generate';

let queue: Queue<VideoJobData, VideoJobResult> | null = null;
let queueEvents: QueueEvents | null = null;
let worker: Worker<VideoJobData, VideoJobResult> | null = null;

export function isVideoQueueEnabled(): boolean {
    return isRedisConfigured() && (process.env.VIDEO_QUEUE || '').toLowerCase() !== 'off';
}

export function newVideoJobId(): string {
    // BullMQ custom job ids must not contain ':'
    return `vid-${randomUUID()}`;
}

/**
 * Generates the video and records it in the media library. On failure the deducted credits are
 * refunded and the error is rethrown.
 */
export async function runVideoJob(jobId: string, data: VideoJobData): Promise<VideoJobResult> {
    try {
        const { url } = await generateVideo({
            prompt: data.prompt,
            duration: data.duration,
            aspectRatio: data.aspectRatio,
            imageStart: data.imageStart,
            imageEnd: data.imageEnd,
            characterImages: data.characterImages,
            metadata: { jobId, projectId: data.userId, filename: data.filename }
        });

        await connectDB();
        let media = await Media.findOne({ $or: [{ 'metadata.jobId': jobId }, { key: url }] });
        if (!media) {
            media = await Media.create({
                userId: data.userId,
                key: url,
                fileName: `AI Video - ${jobId}`,
                contentType: 'video/mp4',
                size: 0,
                bucket: configService.bucketName,
                purpose: 'ai-video',
                metadata: { jobId, status: 'completed', prompt: data.prompt }
            });
        }
        return { jobId, url, media };
    } catch (error: any) {
        const refunded = await refundUserCredits(data.userId, ServiceType.VIDEO, data.creditAmount, data.creditDescription)
            .catch((refundError: any) => {
                Logger.error(`[VideoJobs] Refund failed for ${jobId}: ${refundError?.message}`, 'VideoJobs');
                return false;
            });
        if (refunded) Logger.info(`[VideoJobs] Refunded ${data.creditAmount} credits for failed job ${jobId}`, 'VideoJobs');
        throw error;
    }
}

async function getQueue(): Promise<Queue<VideoJobData, VideoJobResult>> {
    if (!queue) {
        const { Queue } = await import('bullmq');
        queue = new Queue<VideoJobData, VideoJobResult>(QUEUE_NAME, { connection: getRedisConnectionOptions() as any });
    }
    return queue;
}

async function getQueueEvents(): Promise<QueueEvents> {
    if (!queueEvents) {
        const { QueueEvents } = await import('bullmq');
        queueEvents = new QueueEvents(QUEUE_NAME, { connection: getRedisConnectionOptions() as any });
        await queueEvents.waitUntilReady();
    }
    return queueEvents;
}

export async function enqueueVideoJob(jobId: string, data: VideoJobData): Promise<Job<VideoJobData, VideoJobResult>> {
    const q = await getQueue();
    return q.add(JOB_NAME, data, {
        jobId,
        // Each attempt costs provider money, so a failed generation is not retried automatically
        attempts: 1,
        removeOnComplete: { age: 24 * 3600 },
        removeOnFail: { age: 7 * 24 * 3600 }
    });
}

/** Resolves with the job result once a worker has finished it; rejects with the failure reason. */
export async function waitForVideoJob(job: Job<VideoJobData, VideoJobResult>): Promise<VideoJobResult> {
    return job.waitUntilFinished(await getQueueEvents());
}

const STATE_MAP: Record<string, VideoJobStatus> = {
    waiting: 'pending',
    'waiting-children': 'pending',
    delayed: 'pending',
    prioritized: 'pending',
    active: 'processing',
    completed: 'completed',
    failed: 'failed'
};

/** Status of a queued job, or null when the queue does not know it (or it belongs to another user). */
export async function getQueuedVideoJobStatus(jobId: string, userId: string) {
    const q = await getQueue();
    const job = await q.getJob(jobId);
    if (!job || job.data.userId !== userId) return null;
    const status = STATE_MAP[await job.getState()] || 'pending';
    return {
        jobId,
        status,
        videoUrl: status === 'completed' ? job.returnvalue?.url : undefined,
        media: status === 'completed' ? job.returnvalue?.media : undefined,
        error: status === 'failed' ? job.failedReason : undefined
    };
}

function notify(userId: string, payload: Record<string, any>) {
    try {
        socketServer.emitToUser(userId, 'ai:video-job', payload);
    } catch (error: any) {
        Logger.warn(`[VideoJobs] Could not notify user ${userId}: ${error?.message}`, 'VideoJobs');
    }
}

/** Starts the worker on this node unless VIDEO_WORKER=off. Safe to call more than once. */
export async function startVideoWorker(): Promise<void> {
    if (worker || !isVideoQueueEnabled() || (process.env.VIDEO_WORKER || '').toLowerCase() === 'off') return;
    const { Worker } = await import('bullmq');
    const concurrency = Math.max(1, parseInt(process.env.VIDEO_WORKER_CONCURRENCY || '2') || 2);

    worker = new Worker<VideoJobData, VideoJobResult>(QUEUE_NAME, async (job) => {
        notify(job.data.userId, { jobId: job.id, status: 'processing' });
        return runVideoJob(job.id!, job.data);
    }, { connection: getRedisConnectionOptions() as any, concurrency });

    worker.on('completed', (job, result) => {
        notify(job.data.userId, { jobId: job.id, status: 'completed', url: result.url, media: result.media });
    });
    worker.on('failed', (job, error) => {
        Logger.error(`[VideoJobs] Job ${job?.id} failed: ${error?.message}`, 'VideoJobs');
        if (job) notify(job.data.userId, { jobId: job.id, status: 'failed', error: error?.message });
    });
    worker.on('error', (error) => Logger.error(`[VideoJobs] Worker error: ${error?.message}`, 'VideoJobs'));

    Logger.info(`[VideoJobs] Worker started (concurrency ${concurrency})`, 'VideoJobs');
}

/**
 * Closes the worker and Redis connections without waiting for running generations (they can take
 * minutes). BullMQ sees those jobs as stalled and hands them to a worker again after restart.
 */
export async function closeVideoJobs(): Promise<void> {
    await Promise.allSettled([worker?.close(true), queueEvents?.close(), queue?.close()]);
    worker = null;
    queueEvents = null;
    queue = null;
}
