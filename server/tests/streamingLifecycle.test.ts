import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';

const h = vi.hoisted(() => ({
    nms: null as any,
    ffmpegInputs: [] as string[],
    deductCredits: vi.fn(async () => {}),
    stopFSM: vi.fn(),
    findOneAndUpdate: vi.fn(async () => {})
}));

vi.mock('node-media-server', () => ({
    default: class FakeNMS extends EventEmitter {
        constructor() { super(); h.nms = this; }
        run() {}
    }
}));
vi.mock('fluent-ffmpeg', () => ({
    default: Object.assign((input: string) => {
        h.ffmpegInputs.push(input);
        const cmd: any = new EventEmitter();
        for (const m of ['inputOptions', 'outputOptions', 'output', 'input', 'videoCodec', 'audioCodec', 'format']) cmd[m] = () => cmd;
        cmd.run = () => {};
        cmd.kill = () => {};
        return cmd;
    }, { setFfmpegPath: () => {}, setFfprobePath: () => {} })
}));
vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({ configService: {}, EnvConfig: { ffmpegPath: 'ffmpeg' } }));
vi.mock('../src/utils/CreditManager.js', () => ({ creditManager: { deductCredits: h.deductCredits } }));
vi.mock('../src/models/StreamSession.js', () => ({ StreamSessionModel: { findOneAndUpdate: h.findOneAndUpdate } }));
vi.mock('../src/models/User.js', () => ({ User: {} }));
vi.mock('../src/models/GuestToken.js', () => ({ GuestToken: {} }));
vi.mock('../src/models/CreditUsage.js', () => ({ ServiceType: { STREAMING: 'streaming' } }));
vi.mock('../src/models/UserPlatformAccount.js', () => ({ UserPlatformAccount: {}, SocialPlatform: {} }));
vi.mock('../src/services/streaming/SocketServer.js', () => ({ socketServer: { getIO: () => null } }));
vi.mock('../src/services/ai/LiveSalesServiceV3.js', () => ({ liveSalesServiceV3: { stopFSM: h.stopFSM } }));
vi.mock('../src/services/streaming/HighlightService.js', () => ({ highlightService: {} }));
vi.mock('../src/services/system/RedisService.js', () => ({ redisService: { removeSession: vi.fn(async () => {}) } }));
vi.mock('systeminformation', () => ({ default: {} }));

const { StreamingService } = await import('../src/services/streaming/StreamingService.js');

const SESSION = 'stream_123';
const publisher = () => ({ streamPath: `/live/${SESSION}`, id: 'nms-session' });
let svc: any;

beforeEach(async () => {
    vi.useFakeTimers();
    h.ffmpegInputs.length = 0;
    h.deductCredits.mockClear();
    h.stopFSM.mockClear();
    svc = new StreamingService();
    await svc.initialize();
    svc.sessions.set(SESSION, {
        id: SESSION,
        userId: 'u1',
        status: 'live',
        targets: [{ platform: 'youtube', url: 'rtmp://a.rtmp.youtube.com/live2', key: 'k' }],
        startTime: new Date()
    });
});

afterEach(() => {
    vi.useRealTimers();
});

describe('StreamingService NMS publish lifecycle', () => {
    it('stops the session when the publisher stays gone past the grace period', async () => {
        h.nms.emit('donePublish', publisher());
        await vi.advanceTimersByTimeAsync(29_000);
        expect(svc.sessions.has(SESSION)).toBe(true);

        await vi.advanceTimersByTimeAsync(2_000);
        expect(svc.sessions.has(SESSION)).toBe(false);
        expect(h.deductCredits).toHaveBeenCalledTimes(1);
        expect(h.stopFSM).toHaveBeenCalledWith(SESSION);
    });

    it('keeps the session when the publisher reconnects within the grace period', async () => {
        h.nms.emit('donePublish', publisher());
        await vi.advanceTimersByTimeAsync(5_000);
        h.nms.emit('postPublish', publisher());
        await vi.advanceTimersByTimeAsync(60_000);

        expect(svc.sessions.has(SESSION)).toBe(true);
        expect(h.deductCredits).not.toHaveBeenCalled();
    });

    it('spawns relays to external targets only once across re-publishes', () => {
        h.nms.emit('postPublish', publisher());
        h.nms.emit('postPublish', publisher());
        const relayInputs = h.ffmpegInputs.filter(input => input.includes(`/live/${SESSION}?sign=`));
        expect(relayInputs).toHaveLength(1);
    });

    it('ignores the legacy (id, streamPath) signature for unknown sessions and handles it for known ones', async () => {
        h.nms.emit('donePublish', 'id', '/live/unknown_session');
        h.nms.emit('donePublish', 'id', `/live/${SESSION}`);
        await vi.advanceTimersByTimeAsync(31_000);
        expect(svc.sessions.has(SESSION)).toBe(false);
    });

    it('stopRestream is idempotent', async () => {
        await Promise.all([svc.stopRestream(SESSION), svc.stopRestream(SESSION)]);
        expect(h.deductCredits).toHaveBeenCalledTimes(1);
    });
});
