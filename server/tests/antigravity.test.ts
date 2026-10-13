import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

const m = vi.hoisted(() => ({
    refreshAccessToken: vi.fn(async () => 'token'),
    discoverProjectId: vi.fn(async () => 'companion-project'),
    env: { antigravityModel: 'auto', geminiModelTextAnalysis: 'gemini-3.1-flash-lite' } as any
}));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({ EnvConfig: m.env }));
vi.mock('../src/utils/ai/AIAccountManager.js', () => ({
    aiAccountManager: { refreshAccessToken: m.refreshAccessToken, discoverProjectId: m.discoverProjectId }
}));

const { selectModel, newestInFamily, parseModelId } = await import('../src/integrations/ai/AntigravityModelSelector.js');
const { AntigravityClient } = await import('../src/integrations/ai/AntigravityClient.js');

// Shape of a real fetchAvailableModels response (Oct 2026)
const offered = [
    'gemini-3.6-flash-medium', 'tab_jump_flash_lite_preview', 'claude-sonnet-4-6', 'gemini-3.5-flash-low',
    'gemini-3.1-pro-low', 'gemini-2.5-flash', 'gemini-3.8-flash-tiered', 'gemini-3.6-flash-high',
    'gemini-pro-agent', 'gemini-2.5-pro', 'gemini-3-flash', 'gemini-3.1-pro-high', 'gemini-3-flash-agent',
];

describe('AntigravityModelSelector (ported tests)', () => {
    it('parses version and family', () => {
        expect(parseModelId('gemini-3.8-flash-tiered')).toEqual({ id: 'gemini-3.8-flash-tiered', version: [3, 8], family: 'flash-tiered' });
        expect(parseModelId('claude-sonnet-4-6')).toBeNull();
        expect(parseModelId('gemini-pro-agent')).toBeNull();
    });

    it('compares versions numerically', () => {
        expect(newestInFamily('flash-tiered', ['gemini-3.9-flash-tiered', 'gemini-3.10-flash-tiered'])).toBe('gemini-3.10-flash-tiered');
        expect(newestInFamily('flash', ['gemini-2.5-flash', 'gemini-3-flash'])).toBe('gemini-3-flash');
    });

    it('selects by auto / family / exact id', () => {
        expect(selectModel('auto', offered)).toBe('gemini-3.8-flash-tiered');
        expect(selectModel('auto', ['gemini-2.5-flash', 'gemini-3-flash', 'gemini-3.1-pro-low'])).toBe('gemini-3-flash');
        expect(selectModel('pro-high', offered)).toBe('gemini-3.1-pro-high');
        expect(selectModel('gemini-2.5-pro', offered)).toBe('gemini-2.5-pro');
        expect(selectModel('gemini-3.7-flash-tiered', offered)).toBe('gemini-3.8-flash-tiered');
        expect(selectModel('auto', ['claude-sonnet-4-6'])).toBeNull();
    });

    it("maps AntStudio's default Gemini model to a model the gateway offers", () => {
        expect(selectModel('gemini-3.1-flash-lite', offered)).toBe('gemini-3.8-flash-tiered');
    });
});

describe('AntigravityClient.generateContent', () => {
    const account = { _id: 'ag1', email: 'ag@example.com' } as any;
    let post: ReturnType<typeof vi.spyOn>;
    const answer = (parts: any[]) => ({ data: { response: { candidates: [{ content: { parts } }] } } });

    beforeEach(() => {
        vi.restoreAllMocks();
        m.env.antigravityModel = 'auto';
        post = vi.spyOn(axios, 'post');
    });

    function gateway(models: string[], generate: (payload: any) => any) {
        post.mockImplementation(async (url: string, payload: any) => {
            if (url.endsWith(':fetchAvailableModels')) return { data: { models: Object.fromEntries(models.map(id => [id, {}])) } } as any;
            return generate(payload);
        });
    }

    it('calls a gateway model, joins answer parts and skips thoughts', async () => {
        const payloads: any[] = [];
        gateway(offered, (payload) => { payloads.push(payload); return answer([{ thought: true, text: 'thinking...' }, { text: 'Hello ' }, { text: 'world' }]); });

        const result = await new AntigravityClient(account).generateContent('hi', 'gemini-2.5-pro');
        expect(result.text).toBe('Hello world');
        expect(payloads[0]).toMatchObject({ model: 'gemini-2.5-pro', project: 'companion-project', requestType: 'agent' });
        expect(payloads[0].request.systemInstruction.parts[0].text).toMatch(/^You are Antigravity/);
    });

    it('JSON requests get the JSON system instruction and responseMimeType', async () => {
        const payloads: any[] = [];
        gateway(offered, (payload) => { payloads.push(payload); return answer([{ text: '{"ok":true}' }]); });

        await new AntigravityClient(account).generateContent('give json', 'gemini-3.8-flash-tiered', {
            systemPrompt: 'Extract fields.',
            generationConfig: { responseMimeType: 'application/json' }
        });
        const request = payloads[0].request;
        expect(request.generationConfig).toMatchObject({ responseMimeType: 'application/json', temperature: 0.2 });
        expect(request.systemInstruction.parts[0].text).toMatch(/JSON API engine[\s\S]*Task Instructions:\nExtract fields\./);
    });

    it('switches model after a 404 for a retired one', async () => {
        let models = ['gemini-3.9-flash-high'];
        const used: string[] = [];
        gateway([], () => { throw new Error('unused'); });
        post.mockImplementation(async (url: string, payload: any) => {
            if (url.endsWith(':fetchAvailableModels')) return { data: { models: Object.fromEntries(models.map(id => [id, {}])) } } as any;
            used.push(payload.model);
            if (payload.model === 'gemini-3.9-flash-high') {
                models = ['gemini-4.0-flash-high'];
                throw Object.assign(new Error('not found'), { response: { status: 404 } });
            }
            return answer([{ text: 'ok' }]);
        });

        const result = await new AntigravityClient(account).generateContent('hi', 'gemini-3.9-flash-high');
        expect(result.text).toBe('ok');
        expect(used).toEqual(['gemini-3.9-flash-high', 'gemini-4.0-flash-high']);
    });

    it('cools a rate-limited account down so the next request skips it', async () => {
        const limited = { _id: 'ag-limited', email: 'busy@example.com' } as any;
        gateway(offered, () => { throw Object.assign(new Error('quota'), { response: { status: 429, data: { error: { message: 'RESOURCE_EXHAUSTED' } } } }); });

        await expect(new AntigravityClient(limited).generateContent('hi')).rejects.toThrow('quota');
        const callsAfterFirst = post.mock.calls.length;
        await expect(new AntigravityClient(limited).generateContent('hi')).rejects.toThrow(/rate limited/);
        expect(post.mock.calls.length).toBe(callsAfterFirst);
    });
});
