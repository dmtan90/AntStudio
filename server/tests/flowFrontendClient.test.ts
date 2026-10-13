import { afterEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { flowFrontendClient, flowBrowserHeaders, missingFlowCookies, serializeFlowCookieHeader, isFlowCookieStorage, FlowRpcError } =
    await import('../src/utils/ai/providers/FlowFrontendClient.js');

// Ported from openvideo/apps/shine FlowFrontendClient.test.ts (node:test -> vitest)

const COOKIE_HEADER = 'OSID=osid1; SID=sid1; HSID=hsid1; __Secure-1PSID=p1';
const PROJECT_ID = '11111111-2222-3333-4444-555555555555';
const BOOTSTRAP_HTML = '<script>var x="boq_labs-ai-sandbox-frontend_20261001.00_p0";WIZ_global_data={"FdrFJe":"-123456789"};</script>';

/** batchexecute response body as returned by Google (anti-XSSI prefix + length-prefixed frames) */
function batchexecuteBody(rpcId: string, payload: unknown): string {
    const frame = JSON.stringify([['wrb.fr', rpcId, JSON.stringify(payload), null, null, null, 'generic']]);
    return `)]}'\n\n${frame.length}\n${frame}\n25\n[["e",4,null,null,123]]\n`;
}

function mockFlow(rpcPayload: (rpcId: string, body: string) => string) {
    const calls: Array<{ url: string; body: string; headers: any }> = [];
    vi.spyOn(axios, 'get').mockImplementation(async (url: string) => ({
        status: 200,
        data: BOOTSTRAP_HTML,
        request: { res: { responseUrl: url } },
    }) as any);
    vi.spyOn(axios, 'post').mockImplementation(async (url: string, body: any, config: any) => {
        calls.push({ url, body, headers: config.headers });
        const rpcId = new URL(url).searchParams.get('rpcids') || '';
        return { status: 200, data: rpcPayload(rpcId, body) } as any;
    });
    return calls;
}

const fReqOf = (body: string) => JSON.parse(new URLSearchParams(body).get('f.req')!);

afterEach(() => vi.restoreAllMocks());

describe('Flow cookies', () => {
    it('accepts a cookie header with OSID and SID cookies', () => {
        expect(missingFlowCookies(COOKIE_HEADER)).toEqual([]);
        expect(isFlowCookieStorage(`Cookie: ${COOKIE_HEADER}`)).toBe(true);
    });

    it('reports a legacy next-auth token as incomplete', () => {
        expect(missingFlowCookies('__Secure-next-auth.session-token=abc')).toHaveLength(2);
        expect(isFlowCookieStorage('abc')).toBe(false);
    });

    it('scopes a browser JSON export to flow.google.com', () => {
        const exported = JSON.stringify([
            { name: 'OSID', value: 'flow', domain: 'flow.google.com', hostOnly: true, path: '/' },
            { name: 'OSID', value: 'mail', domain: 'mail.google.com', hostOnly: true, path: '/' },
            { name: 'SID', value: 'sid', domain: '.google.com', path: '/' },
            { name: 'OLD', value: 'x', domain: '.google.com', path: '/', expirationDate: 1 },
        ]);
        expect(serializeFlowCookieHeader(exported)).toBe('OSID=flow; SID=sid');
        expect(isFlowCookieStorage(exported)).toBe(true);
    });
});

describe('Flow batchexecute RPC', () => {
    it('getCredits posts f.req and decodes the wrb.fr payload', async () => {
        const calls = mockFlow((rpcId) => batchexecuteBody(rpcId, [null, 1250]));
        expect(await flowFrontendClient.getCredits({ cookies: COOKIE_HEADER })).toBe(1250);

        expect(calls).toHaveLength(1);
        const url = new URL(calls[0].url);
        expect(url.origin + url.pathname).toBe('https://flow.google.com/_/AiSandboxAngularFrontend/data/batchexecute');
        expect(url.searchParams.get('bl')).toBe('boq_labs-ai-sandbox-frontend_20261001.00_p0');
        expect(url.searchParams.get('f.sid')).toBe('-123456789');
        expect(url.searchParams.get('source-path')).toBe('/projects');
        expect(fReqOf(calls[0].body)).toEqual([[['nzlxg', '[]', null, 'generic']]]);
        expect(calls[0].headers.Cookie).toBe(COOKIE_HEADER);
        expect(calls[0].headers['User-Agent']).toMatch(/Chrome\/145/);
        expect(calls[0].headers['sec-ch-ua']).toBe('"Google Chrome";v="145", "Chromium";v="145", "Not)A;Brand";v="24"');
        expect(calls[0].headers['sec-ch-ua-platform']).toBe('"Windows"');
        expect(calls[0].headers['x-same-domain']).toBe('1');
    });

    it('client hints follow the account fingerprint unless they contradict its User-Agent', () => {
        const mac = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36';
        const inferred = flowBrowserHeaders({ cookies: '', userAgent: mac });
        expect(inferred['sec-ch-ua-platform']).toBe('"macOS"');
        expect(inferred['sec-ch-ua']).toMatch(/"Google Chrome";v="150"/);

        const captured = '"Google Chrome";v="150", "Not_A Brand";v="8"';
        expect(flowBrowserHeaders({ cookies: '', userAgent: mac, secChUa: captured })['sec-ch-ua']).toBe(captured);
        expect(flowBrowserHeaders({ cookies: '', userAgent: mac, secChUa: '"Microsoft Edge";v="150"' })['sec-ch-ua']).toMatch(/Google Chrome/);
    });

    it('createProject returns the project uuid', async () => {
        mockFlow((rpcId) => batchexecuteBody(rpcId, [[`projects/${PROJECT_ID}`, PROJECT_ID]]));
        expect(await flowFrontendClient.createProject({ cookies: COOKIE_HEADER }, 'title')).toBe(PROJECT_ID);
    });

    it('retries with the xsrf token when Google asks for it', async () => {
        const calls = mockFlow((rpcId, body) => body.includes('&at=')
            ? batchexecuteBody(rpcId, [7])
            : `)]}'\n\n[["xsrf","TOKEN123"]]\n`);
        expect(await flowFrontendClient.getCredits({ cookies: COOKIE_HEADER })).toBe(7);
        expect(calls).toHaveLength(2);
        expect(calls[1].body).toMatch(/&at=TOKEN123$/);
    });

    it('maps an "er" frame with code 401 to an auth error', async () => {
        mockFlow(() => `)]}'\n\n[["er",null,null,null,null,401,"generic"]]\n`);
        const error = await flowFrontendClient.getCredits({ cookies: COOKIE_HEADER }).catch(e => e);
        expect(error).toBeInstanceOf(FlowRpcError);
        expect(error.isAuthError).toBe(true);
    });

    it('maps a [5] status envelope to NOT_FOUND and UNUSUAL_ACTIVITY to a captcha rejection', async () => {
        const frame = (detail: unknown) => `)]}'\n\n${JSON.stringify([['wrb.fr', 'ogiZ0b', null, null, null, detail, 'generic']])}\n`;
        const params = { projectId: PROJECT_ID, prompt: 'p', modelName: 'BELUGA', aspectRatio: 'IMAGE_ASPECT_RATIO_LANDSCAPE', recaptchaToken: 't' };

        mockFlow(() => frame([5]));
        const notFound = await flowFrontendClient.generateImage({ cookies: COOKIE_HEADER }, params).catch(e => e);
        expect(notFound.isNotFound).toBe(true);
        expect(notFound.isAuthError).toBe(false);
        expect(notFound.message).toMatch(/code=5 \(NOT_FOUND\)/);

        mockFlow(() => frame([3, null, [['PUBLIC_ERROR_UNUSUAL_ACTIVITY']]]));
        const captcha = await flowFrontendClient.generateImage({ cookies: COOKIE_HEADER }, params).catch(e => e);
        expect(captcha.isCaptchaRejected).toBe(true);
        expect(captcha.isNotFound).toBe(false);
    });

    it('treats a redirect to accounts.google.com as expired cookies', async () => {
        vi.spyOn(axios, 'get').mockResolvedValue({ status: 200, data: '', request: { res: { responseUrl: 'https://accounts.google.com/signin' } } } as any);
        const error = await flowFrontendClient.getCredits({ cookies: COOKIE_HEADER }).catch(e => e);
        expect(error.isAuthError).toBe(true);
    });

    it('generateImage builds the ogiZ0b request and extracts media urls', async () => {
        const mediaId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
        const url = `https://flow-content.google/image/${mediaId}?sig=1`;
        const calls = mockFlow((rpcId) => batchexecuteBody(rpcId, [[[mediaId, null, [url]]]]));

        const media = await flowFrontendClient.generateImage({ cookies: COOKIE_HEADER }, {
            projectId: PROJECT_ID, prompt: 'a cat', modelName: 'BELUGA', aspectRatio: 'IMAGE_ASPECT_RATIO_PORTRAIT', recaptchaToken: 'captcha',
        });
        expect(media).toEqual([{ mediaId, url }]);

        const [[[rpcId, argJson]]] = fReqOf(calls[0].body);
        expect(rpcId).toBe('ogiZ0b');
        const request = JSON.parse(argJson)[1][0];
        expect(request[4]).toBe(2); // portrait
        expect(request[5]).toBe('BELUGA');
        expect(request[8]).toEqual([[['a cat']]]);
        expect(request[7][10]).toEqual(['captcha', 1]);
        expect(request[7][5]).toBe(PROJECT_ID);
    });

    it('generateVideo + checkVideoStatus follow the operation to its video url', async () => {
        const operationId = 'aaaaaaaa-0000-0000-0000-000000000001';
        const mediaName = 'aaaaaaaa-0000-0000-0000-000000000002';
        const videoUrl = `https://flow-content.google/video/${mediaName}?sig=1`;
        mockFlow((rpcId) => rpcId === 'YhhmEf'
            ? batchexecuteBody(rpcId, [[[operationId, PROJECT_ID, mediaName]]])
            : batchexecuteBody(rpcId, [[[operationId, PROJECT_ID, mediaName, [videoUrl]]]]));

        const ctx = { cookies: COOKIE_HEADER };
        const submission = await flowFrontendClient.generateVideo(ctx, {
            projectId: PROJECT_ID, prompt: 'waves', modelKey: 'veo_3_1_t2v_fast', aspectRatio: 'VIDEO_ASPECT_RATIO_LANDSCAPE',
            recaptchaToken: 'captcha', mode: 'text',
        });
        expect(submission.operations[0]).toMatchObject({ name: operationId, mediaName });

        const status = await flowFrontendClient.checkVideoStatus(ctx, submission.operations);
        expect(status[0]).toMatchObject({ status: 'MEDIA_GENERATION_STATUS_SUCCESSFUL', videoUrl });
    });
});
