import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    generateVideo: vi.fn(),
    checkVideoStatus: vi.fn(async (jobId: string) => ({ jobId, status: 'not_found' })),
    deductCredits: vi.fn(async () => true),
    refundUserCredits: vi.fn(async () => true),
    mediaFindOne: vi.fn(async () => null),
    mediaCreate: vi.fn(async (doc: any) => ({ _id: 'media1', ...doc })),
    emitToUser: vi.fn()
}));

/** In-memory stand-in for BullMQ: jobs run on the registered worker processor on the next tick. */
const bull = vi.hoisted(() => {
    const jobs = new Map<string, any>();
    const handlers: Record<string, (...args: any[]) => void> = {};
    let processor: ((job: any) => Promise<any>) | null = null;

    class FakeJob {
        state = 'waiting';
        returnvalue: any;
        failedReason?: string;
        finished: Promise<any>;
        private settle!: { resolve: (v: any) => void; reject: (e: any) => void };
        constructor(public id: string, public data: any) {
            this.finished = new Promise((resolve, reject) => { this.settle = { resolve, reject }; });
            this.finished.catch(() => {});
        }
        async run() {
            if (!processor) return;
            this.state = 'active';
            try {
                this.returnvalue = await processor(this);
                this.state = 'completed';
                handlers.completed?.(this, this.returnvalue);
                this.settle.resolve(this.returnvalue);
            } catch (error: any) {
                this.state = 'failed';
                this.failedReason = error.message;
                handlers.failed?.(this, error);
                this.settle.reject(error);
            }
        }
        waitUntilFinished() { return this.finished; }
        async getState() { return this.state; }
    }

    return {
        jobs,
        handlers,
        Queue: class {
            async add(_name: string, data: any, opts: any) {
                const job = new FakeJob(opts.jobId, data);
                jobs.set(job.id, job);
                setTimeout(() => void job.run(), 0);
                return job;
            }
            async getJob(id: string) { return jobs.get(id); }
            async close() {}
        },
        Worker: class {
            constructor(_name: string, proc: any) { processor = proc; }
            on(event: string, cb: any) { handlers[event] = cb; return this; }
            async close() { processor = null; }
        },
        QueueEvents: class {
            async waitUntilReady() {}
            async close() {}
        }
    };
});

vi.mock('bullmq', () => ({ Queue: bull.Queue, Worker: bull.Worker, QueueEvents: bull.QueueEvents }));
vi.mock('../src/utils/AIGenerator.js', () => ({
    generateVideo: m.generateVideo, checkVideoStatus: m.checkVideoStatus,
    generateText: vi.fn(), generateImage: vi.fn(), generateAudio: vi.fn(), generateMusic: vi.fn()
}));
vi.mock('../src/utils/credits.js', () => ({ deductCredits: m.deductCredits, refundUserCredits: m.refundUserCredits, getCreditCost: async () => 2 }));
vi.mock('../src/models/Media.js', () => ({ Media: { findOne: m.mediaFindOne, create: m.mediaCreate } }));
vi.mock('../src/services/system/RedisService.js', () => ({
    isRedisConfigured: () => !!process.env.REDIS_HOST,
    getRedisConnectionOptions: () => ({})
}));
vi.mock('../src/services/streaming/SocketServer.js', () => ({ socketServer: { emitToUser: m.emitToUser } }));
vi.mock('../src/utils/ConfigService.js', () => ({ configService: { bucketName: 'bucket' } }));
vi.mock('../src/utils/db.js', () => ({ connectDB: vi.fn(async () => {}) }));
vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/PromptBuilder.js', () => ({}));
vi.mock('../src/utils/AudioEnhancer.js', () => ({}));
vi.mock('../src/services/ai/PromptService.js', () => ({ promptService: {} }));
vi.mock('../src/routes/ai/shared.js', () => ({ upload: { single: () => vi.fn(), fields: () => vi.fn() } }));

const { default: mediaRouter } = await import('../src/routes/ai/media.js');
const { startVideoWorker, closeVideoJobs } = await import('../src/services/ai/VideoJobService.js');

async function call(method: 'post' | 'get', path: string, { body = {}, params = {}, userId = 'alice' }: any = {}) {
    const layer = mediaRouter.stack.find((l: any) => l.route?.path === path && l.route.methods[method]);
    const handler = layer.route.stack.at(-1).handle;
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (payload: any) => { res.body = payload; return res; };
    await handler({ body, params, user: { userId } }, res);
    return res;
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

beforeEach(() => {
    Object.values(m).forEach(fn => fn.mockClear());
    m.generateVideo.mockReset().mockImplementation(async (opts: any) => ({ url: `projects/${opts.metadata.projectId}/videos/${opts.metadata.filename}.mp4`, jobId: opts.metadata.jobId }));
    bull.jobs.clear();
});
afterEach(() => { delete process.env.REDIS_HOST; });
afterAll(() => closeVideoJobs());

describe('POST /generate-video without Redis (in-process)', () => {
    it('generates inside the request and returns media + url as before', async () => {
        const res = await call('post', '/generate-video', { body: { prompt: 'a cat', duration: 4, filename: 'clip' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({ url: 'projects/alice/videos/clip.mp4', jobId: expect.stringMatching(/^vid-/) });
        expect(m.deductCredits).toHaveBeenCalledWith('alice', 'video', 8, expect.any(String));
        expect(m.mediaCreate).toHaveBeenCalledWith(expect.objectContaining({ userId: 'alice', purpose: 'ai-video', metadata: expect.objectContaining({ jobId: res.body.data.jobId }) }));
        expect(m.generateVideo.mock.calls[0][0].metadata.jobId).toBe(res.body.data.jobId);
        expect(m.refundUserCredits).not.toHaveBeenCalled();
    });

    it('refunds the credits when generation fails', async () => {
        m.generateVideo.mockRejectedValueOnce(new Error('provider down'));
        const res = await call('post', '/generate-video', { body: { prompt: 'a cat', duration: 5 } });
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe('provider down');
        expect(m.refundUserCredits).toHaveBeenCalledWith('alice', 'video', 10, expect.any(String));
    });

    it('does not start anything when credits are insufficient', async () => {
        m.deductCredits.mockRejectedValueOnce(new Error('Insufficient credits. Required: 10'));
        const res = await call('post', '/generate-video', { body: { prompt: 'a cat' } });
        expect(res.statusCode).toBe(402);
        expect(m.generateVideo).not.toHaveBeenCalled();
    });

    it('async: true answers 202 at once and finishes in the background', async () => {
        const res = await call('post', '/generate-video', { body: { prompt: 'a cat', async: true } });
        expect(res.statusCode).toBe(202);
        expect(res.body.data).toEqual({ jobId: expect.stringMatching(/^vid-/), status: 'pending' });
        await vi.waitFor(() => expect(m.mediaCreate).toHaveBeenCalled());
    });
});

describe('POST /generate-video with Redis (BullMQ)', () => {
    beforeEach(async () => {
        process.env.REDIS_HOST = 'redis';
        await startVideoWorker();
    });

    it('runs the job on the worker and still answers with media + url', async () => {
        const res = await call('post', '/generate-video', { body: { prompt: 'a dog', filename: 'dog' } });
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toMatchObject({ url: 'projects/alice/videos/dog.mp4', media: expect.objectContaining({ _id: 'media1' }) });
        expect(bull.jobs.size).toBe(1);
        expect(m.emitToUser).toHaveBeenCalledWith('alice', 'ai:video-job', expect.objectContaining({ status: 'processing' }));
        expect(m.emitToUser).toHaveBeenCalledWith('alice', 'ai:video-job', expect.objectContaining({ status: 'completed', url: 'projects/alice/videos/dog.mp4' }));
    });

    it('async: reports progress through /video-status, only to the job owner', async () => {
        let finish!: () => void;
        m.generateVideo.mockImplementationOnce((opts: any) => new Promise(resolve => {
            finish = () => resolve({ url: 'projects/alice/videos/x.mp4', jobId: opts.metadata.jobId });
        }));
        const res = await call('post', '/generate-video', { body: { prompt: 'a dog', async: true } });
        expect(res.statusCode).toBe(202);
        const { jobId } = res.body.data;

        await flush();
        let status = await call('get', '/video-status/:jobId', { params: { jobId } });
        expect(status.body.data).toMatchObject({ jobId, status: 'processing' });

        const stranger = await call('get', '/video-status/:jobId', { params: { jobId }, userId: 'mallory' });
        expect(stranger.body.data.status).toBe('not_found');

        finish();
        await vi.waitFor(async () => {
            status = await call('get', '/video-status/:jobId', { params: { jobId } });
            expect(status.body.data).toMatchObject({ status: 'completed', videoUrl: 'projects/alice/videos/x.mp4', media: expect.any(Object) });
        });
    });

    it('marks failed jobs, refunds and notifies the user', async () => {
        m.generateVideo.mockRejectedValueOnce(new Error('quota exceeded'));
        const res = await call('post', '/generate-video', { body: { prompt: 'a dog', async: true, duration: 3 } });
        const { jobId } = res.body.data;

        await vi.waitFor(() => expect(m.emitToUser).toHaveBeenCalledWith('alice', 'ai:video-job', { jobId, status: 'failed', error: 'quota exceeded' }));
        expect(m.refundUserCredits).toHaveBeenCalledWith('alice', 'video', 6, expect.any(String));
        const status = await call('get', '/video-status/:jobId', { params: { jobId } });
        expect(status.body.data).toMatchObject({ status: 'failed', error: 'quota exceeded' });
    });

    it('a synchronous request gets the failure as a 500', async () => {
        m.generateVideo.mockRejectedValueOnce(new Error('quota exceeded'));
        const res = await call('post', '/generate-video', { body: { prompt: 'a dog' } });
        expect(res.statusCode).toBe(500);
        expect(res.body.error).toBe('quota exceeded');
    });
});

describe('getRedisConnectionOptions', () => {
    afterEach(() => { delete process.env.REDIS_URI; });

    it('parses REDIS_URI for BullMQ connections', async () => {
        const { getRedisConnectionOptions } = await vi.importActual<any>('../src/services/system/RedisService.js');
        process.env.REDIS_URI = 'rediss://user:p%40ss@cache.example.com:6380/2';
        expect(getRedisConnectionOptions()).toMatchObject({
            host: 'cache.example.com', port: 6380, username: 'user', password: 'p@ss', db: 2, tls: {}, maxRetriesPerRequest: null
        });
    });
});
