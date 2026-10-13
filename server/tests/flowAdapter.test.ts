import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const m = vi.hoisted(() => ({
    solve: vi.fn(async () => 'captcha-token'),
    generateImage: vi.fn(),
    generateVideo: vi.fn(),
    checkVideoStatus: vi.fn(),
    uploadImage: vi.fn(async () => 'aaaaaaaa-1111-1111-1111-111111111111'),
    refreshAccountTokens: vi.fn(async () => true),
    ensureProject: vi.fn(async () => 'project-1'),
    createNewProject: vi.fn(async () => 'project-2'),
    recoverAccountCookies: vi.fn(async () => false)
}));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/s3.js', () => ({ getFromS3: vi.fn() }));
vi.mock('../src/utils/ai/CaptchaService.js', () => ({ captchaService: { solve: m.solve } }));
vi.mock('../src/utils/ai/FlowSyncService.js', () => ({
    FLOW_FRONTEND_ACCESS_TOKEN: 'flow-frontend-cookie',
    flowRequestContext: (account: any) => ({ cookies: account.flowST, userAgent: 'UA/7' }),
    flowSyncService: {
        refreshAccountTokens: m.refreshAccountTokens,
        ensureProject: m.ensureProject,
        createNewProject: m.createNewProject,
        recoverAccountCookies: m.recoverAccountCookies
    }
}));
vi.mock('../src/utils/ai/providers/FlowFrontendClient.js', async (importOriginal) => {
    const actual: any = await importOriginal();
    return {
        ...actual,
        flowFrontendClient: {
            generateImage: m.generateImage,
            generateVideo: m.generateVideo,
            checkVideoStatus: m.checkVideoStatus,
            uploadImage: m.uploadImage,
            getMediaUrl: vi.fn()
        }
    };
});

const { flowAdapter } = await import('../src/utils/ai/providers/FlowAdapter.js');
const { FlowRpcError } = await import('../src/utils/ai/providers/FlowFrontendClient.js');

const account = (overrides: any = {}) => ({ _id: 'acc1', email: 'f@example.com', flowST: 'OSID=o; SID=s', flowAT: 'flow-frontend-cookie', projectId: 'project-1', ...overrides }) as any;

beforeEach(() => {
    Object.values(m).forEach(fn => fn.mockClear());
    vi.restoreAllMocks();
    vi.spyOn(axios, 'get').mockResolvedValue({ data: Buffer.from('BYTES') } as any);
});

describe('FlowAdapter.generateImage', () => {
    it('solves the captcha with the account User-Agent and returns the downloaded bytes', async () => {
        m.generateImage.mockResolvedValue([{ mediaId: 'm1', url: 'https://flow-content.google/image/m1?sig=1' }]);
        const result = await flowAdapter.generateImage(account(), 'a cat', 'gemini-3.1-flash-image', { aspectRatio: '9:16' });

        expect(m.solve).toHaveBeenCalledWith(expect.objectContaining({ projectId: 'project-1', action: 'IMAGE_GENERATION', userAgent: 'UA/7' }));
        expect(m.generateImage).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
            projectId: 'project-1', modelName: 'BELUGA', aspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT', recaptchaToken: 'captcha-token'
        }));
        expect(result.buffer?.toString()).toBe('BYTES');
        expect(m.refreshAccountTokens).not.toHaveBeenCalled(); // cookies already validated
    });

    it('validates legacy accounts first and falls back to the standard model on NOT_FOUND', async () => {
        m.generateImage
            .mockRejectedValueOnce(new FlowRpcError('rejected', 'ogiZ0b', '5'))
            .mockResolvedValueOnce([{ mediaId: 'm2', url: 'https://flow-content.google/image/m2' }]);
        const legacy = account({ flowAT: 'old-labs-bearer-token' });

        await flowAdapter.generateImage(legacy, 'a dog', 'gemini-3-pro-image');
        expect(m.refreshAccountTokens).toHaveBeenCalledWith(legacy);
        expect(m.generateImage.mock.calls.map(c => c[1].modelName)).toEqual(['GEM_PIX_2', 'BELUGA']);
    });

    it('retries reCAPTCHA rejections with a fresh token', async () => {
        vi.useFakeTimers();
        m.generateImage
            .mockRejectedValueOnce(new FlowRpcError('rejected', 'ogiZ0b', 'PUBLIC_ERROR_UNUSUAL_ACTIVITY'))
            .mockResolvedValueOnce([{ mediaId: 'm3', url: 'https://flow-content.google/image/m3' }]);
        const pending = flowAdapter.generateImage(account(), 'p', 'x');
        await vi.advanceTimersByTimeAsync(5000);
        await expect(pending).resolves.toMatchObject({ mediaId: 'm3' });
        expect(m.solve).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});

describe('FlowAdapter.generateVideo', () => {
    it('submits text-to-video, polls the operation and downloads the video', async () => {
        vi.useFakeTimers();
        const op = { name: 'op-1', mediaName: 'media-1', projectId: 'project-1', status: 'MEDIA_GENERATION_STATUS_ACTIVE' };
        m.generateVideo.mockResolvedValue({ operations: [op] });
        m.checkVideoStatus.mockResolvedValue([{ ...op, status: 'MEDIA_GENERATION_STATUS_SUCCESSFUL', videoUrl: 'https://flow-content.google/video/media-1?sig=1' }]);

        const pending = flowAdapter.generateVideo(account(), 'waves', 'veo-3.1-generate-preview', { aspectRatio: '16:9', duration: 8 });
        await vi.advanceTimersByTimeAsync(6000);
        const result = await pending;

        expect(m.generateVideo).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ mode: 'text', modelKey: 'veo_3_1_t2v_fast', aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE' }));
        expect(result).toMatchObject({ mediaId: 'op-1', mimeType: 'video/mp4' });
        expect(result.buffer.toString()).toBe('BYTES');
        vi.useRealTimers();
    });

    it('uses image-to-video with a start frame and creates a new project when the old one is gone', async () => {
        m.generateVideo.mockReset().mockRejectedValueOnce(new FlowRpcError('rejected', 'eb1hJf', '5'));

        // A Flow media id as start frame is reused without uploading; NOT_FOUND then must not recreate
        // the project (media ids belong to it), so expect the error to surface
        await expect(flowAdapter.generateVideo(account(), 'p', 'veo-3.1', { imageStart: 'aaaaaaaa-1111-1111-1111-111111111111' }))
            .rejects.toThrow(/Flow Video Generation Failed/);
        expect(m.createNewProject).not.toHaveBeenCalled();
        expect(m.uploadImage).not.toHaveBeenCalled();
        expect(m.generateVideo.mock.calls[0][1]).toMatchObject({ mode: 'start', startMediaId: 'aaaaaaaa-1111-1111-1111-111111111111' });

        // Text-only request: NOT_FOUND recreates the project once
        m.generateVideo.mockReset()
            .mockRejectedValueOnce(new FlowRpcError('rejected', 'YhhmEf', '5'))
            .mockResolvedValueOnce({ operations: [], videoUrl: 'https://flow-content.google/video/aaaaaaaa-3333-3333-3333-333333333333' });
        const result = await flowAdapter.generateVideo(account(), 'p', 'veo-3.1');
        expect(m.createNewProject).toHaveBeenCalledTimes(1);
        expect(m.generateVideo.mock.calls.at(-1)![1].projectId).toBe('project-2');
        expect(result.url).toContain('/video/aaaaaaaa-3333');
    });
});
