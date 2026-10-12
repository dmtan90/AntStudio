import { beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({
    generateGuestDialogue: vi.fn(async () => ({ text: 'dialogue' })),
    generateGiftReaction: vi.fn(async () => ({ text: 'gift' })),
    generateChatReaction: vi.fn(async () => ({ text: 'chat' })),
    generateSpeech: vi.fn(async () => ({ media: { url: 'https://cdn/audio.mp3' } }))
}));

vi.mock('../src/services/ai/AIGuestService.js', () => ({ aiGuestService: svc }));
vi.mock('../src/services/ai/TTSService.js', () => ({ ttsService: { generateSpeech: svc.generateSpeech } }));
vi.mock('../src/services/ai/AIPerformanceService.js', () => ({ aiPerformanceService: {} }));
vi.mock('../src/services/ai/StyleABTestingEngine.js', () => ({ styleABTestingEngine: {} }));
vi.mock('../src/services/ai/AIProducerService.js', () => ({ aiProducerService: {} }));
vi.mock('../src/middleware/auth.js', () => ({ authMiddleware: vi.fn(), adminMiddleware: vi.fn() }));
vi.mock('../src/utils/Logger.js', () => ({ Logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() } }));

const { default: liveRouter } = await import('../src/routes/ai/live.js');

/** Invokes the (single) handler registered for a POST path with a fake req/res. */
async function post(path: string, body: any) {
    const layers = liveRouter.stack.filter((l: any) => l.route?.path === path && l.route.methods.post);
    expect(layers).toHaveLength(1); // the shadowed duplicate registrations are gone
    const handler = layers[0].route.stack.at(-1).handle;
    const res: any = { statusCode: 200, body: undefined };
    res.status = (code: number) => { res.statusCode = code; return res; };
    res.json = (payload: any) => { res.body = payload; return res; };
    await handler({ body, user: { userId: 'u1' } }, res);
    return res;
}

beforeEach(() => Object.values(svc).forEach(fn => fn.mockClear()));

describe('POST /ai/guest/talk', () => {
    it('keeps the original dialogue behaviour when no type is given', async () => {
        const res = await post('/guest/talk', { entityId: 'e1', prompt: 'hi', context: { vibe: 'calm' } });
        expect(res.body).toEqual({ success: true, data: { text: 'dialogue' } });
        expect(svc.generateGuestDialogue).toHaveBeenCalledWith('u1', 'e1', 'hi', { vibe: 'calm' });
    });

    it('still requires a prompt for plain dialogue', async () => {
        const res = await post('/guest/talk', { entityId: 'e1' });
        expect(res.statusCode).toBe(400);
        expect(svc.generateGuestDialogue).not.toHaveBeenCalled();
    });

    it('generates gift reactions (fields top-level or nested in context)', async () => {
        await post('/guest/talk', { entityId: 'e1', type: 'gift', userName: 'Ann', giftName: 'Rose', amount: 3 });
        await post('/guest/talk', { entityId: 'e1', context: { type: 'gift', userName: 'Bob', giftName: 'Car' } });
        expect(svc.generateGiftReaction).toHaveBeenNthCalledWith(1, 'u1', 'e1', 'Ann', 'Rose', 3);
        expect(svc.generateGiftReaction).toHaveBeenNthCalledWith(2, 'u1', 'e1', 'Bob', 'Car', undefined);
    });

    it('generates chat reactions without requiring a prompt field', async () => {
        const res = await post('/guest/talk', { entityId: 'e1', type: 'chat', content: 'nice stream!' });
        expect(res.body.data).toEqual({ text: 'chat' });
        expect(svc.generateChatReaction).toHaveBeenCalledWith('u1', 'e1', 'Someone', 'nice stream!');
    });

    it('rejects reactions without an entityId', async () => {
        const res = await post('/guest/talk', { type: 'gift' });
        expect(res.statusCode).toBe(400);
    });
});

describe('POST /ai/guest/tts', () => {
    it('keeps the original defaults', async () => {
        const res = await post('/guest/tts', { text: 'hello' });
        expect(res.body).toEqual({ success: true, data: { url: 'https://cdn/audio.mp3' } });
        expect(svc.generateSpeech).toHaveBeenCalledWith({ text: 'hello', voiceId: 'en-US-Standard-A', provider: 'google', language: 'en-US' });
    });
});
