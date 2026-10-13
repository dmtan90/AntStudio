import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    getCredits: vi.fn(),
    createProject: vi.fn(),
    findById: vi.fn()
}));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/models/AIAccount.js', () => ({
    AIAccount: { find: vi.fn(async () => []), findById: m.findById },
    AIAccountStatus: { READY: 'ready', ERROR: 'error', RATE_LIMITED: 'rate-limited', UNAUTHORIZED: 'unauthorized' },
    AIAccountType: { GOOGLE_FLOW: 'google-flow' }
}));
vi.mock('../src/utils/ai/providers/FlowFrontendClient.js', async (importOriginal) => {
    const actual: any = await importOriginal();
    return { ...actual, flowFrontendClient: { getCredits: m.getCredits, createProject: m.createProject } };
});

const { flowSyncService, flowRequestContext, FLOW_FRONTEND_ACCESS_TOKEN } = await import('../src/utils/ai/FlowSyncService.js');
const { FlowRpcError } = await import('../src/utils/ai/providers/FlowFrontendClient.js');

const COOKIES = 'OSID=o; SID=s; SAPISID=a';

function account(overrides: any = {}) {
    return {
        _id: 'acc1',
        email: 'flow@example.com',
        flowST: COOKIES,
        lastFingerprint: new Map([['user_agent', 'UA/1'], ['sec_ch_ua_platform', '"macOS"']]),
        status: 'ready',
        save: vi.fn(async () => {}),
        ...overrides
    } as any;
}

beforeEach(() => Object.values(m).forEach(fn => fn.mockReset()));

describe('flowRequestContext', () => {
    it('uses the stored cookies and browser fingerprint', () => {
        expect(flowRequestContext(account())).toMatchObject({ cookies: COOKIES, userAgent: 'UA/1', secChUaPlatform: '"macOS"' });
    });
});

describe('FlowSyncService.refreshAccountTokens', () => {
    it('validates the cookies, stores credits and creates a Flow project when missing', async () => {
        m.getCredits.mockResolvedValue(42);
        m.createProject.mockResolvedValue('11111111-2222-3333-4444-555555555555');
        const acc = account();

        expect(await flowSyncService.refreshAccountTokens(acc)).toBe(true);
        expect(acc).toMatchObject({ credits: 42, flowAT: FLOW_FRONTEND_ACCESS_TOKEN, status: 'ready', projectId: '11111111-2222-3333-4444-555555555555' });
        expect(acc.save).toHaveBeenCalled();
    });

    it('rejects a legacy next-auth session token without calling Flow', async () => {
        const acc = account({ flowST: 'eyJhbGciOiJkaXIi.legacy-session-token' });
        expect(await flowSyncService.refreshAccountTokens(acc)).toBe(false);
        expect(acc.status).toBe('unauthorized');
        expect(acc.errorMessage).toMatch(/incomplete/);
        expect(m.getCredits).not.toHaveBeenCalled();
    });

    it('marks the account unauthorized when Google rejects the cookies', async () => {
        m.getCredits.mockRejectedValue(new FlowRpcError('Flow authentication failed', 'nzlxg', '401'));
        const acc = account({ projectId: 'p1', flowAT: FLOW_FRONTEND_ACCESS_TOKEN });
        expect(await flowSyncService.refreshAccountTokens(acc)).toBe(false);
        expect(acc).toMatchObject({ status: 'unauthorized', flowAT: undefined });
    });

    it('keeps the account as is on transient errors', async () => {
        m.getCredits.mockRejectedValue(new Error('ETIMEDOUT'));
        const acc = account({ projectId: 'p1', flowAT: FLOW_FRONTEND_ACCESS_TOKEN });
        expect(await flowSyncService.refreshAccountTokens(acc)).toBe(false);
        expect(acc.status).toBe('ready');
        expect(acc.save).not.toHaveBeenCalled();
    });
});

describe('FlowSyncService.recoverAccountCookies', () => {
    const select = (doc: any) => ({ select: vi.fn(async () => doc) });

    it('adopts cookies an admin saved since the account was loaded', async () => {
        m.findById.mockReturnValue(select({ flowST: 'OSID=new; SID=new' }));
        m.getCredits.mockResolvedValue(5);
        const acc = account({ projectId: 'p1' });
        expect(await flowSyncService.recoverAccountCookies(acc)).toBe(true);
        expect(acc.flowST).toBe('OSID=new; SID=new');
    });

    it('does nothing when the stored cookies did not change', async () => {
        m.findById.mockReturnValue(select({ flowST: COOKIES }));
        expect(await flowSyncService.recoverAccountCookies(account())).toBe(false);
        expect(m.getCredits).not.toHaveBeenCalled();
    });
});
