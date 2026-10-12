import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
    canAccessProject: vi.fn(),
    sessionFindOne: vi.fn(),
    userFindById: vi.fn(),
    verifyToken: vi.fn(),
    warn: vi.fn()
}));

vi.mock('../src/utils/projectAccess.js', () => ({ userCanAccessProject: m.canAccessProject }));
vi.mock('../src/models/StreamSession.js', () => ({ StreamSessionModel: { findOne: m.sessionFindOne } }));
vi.mock('../src/models/User.js', () => ({ User: { findById: m.userFindById }, UserRole: { ADMIN: 'admin', SYS_ADMIN: 'sys-admin' } }));
vi.mock('../src/utils/jwt.js', () => ({
    verifyToken: m.verifyToken,
    extractTokenFromHeader: (h?: string) => (h?.startsWith('Bearer ') ? h.slice(7) : null),
    extractTokenFromCookie: (c?: string) => (c?.match(/auth-token=([^;]+)/) || [])[1] || null
}));
vi.mock('../src/utils/Logger.js', () => ({ Logger: { warn: m.warn, info: vi.fn(), error: vi.fn() } }));

const { checkStorageAccess, normalizeStorageKey, authorizeStorageRequest } = await import('../src/utils/storageAccess.js');

const alice = { id: 'alice', isAdmin: false };
const admin = { id: 'root', isAdmin: true };
const lean = (value: any) => ({ select: () => ({ lean: () => Promise.resolve(value) }) });

beforeEach(() => {
    Object.values(m).forEach(fn => fn.mockReset());
    delete process.env.STORAGE_ACCESS_MODE;
});
afterEach(() => { delete process.env.STORAGE_ACCESS_MODE; });

describe('normalizeStorageKey', () => {
    it.each([
        ['projects%2Fp1%2Fthumbnail.jpg', 'projects/p1/thumbnail.jpg'],
        ['media/alice/a%20b.png', 'media/alice/a b.png'],
        ['projects\\p1\\x.png', 'projects/p1/x.png']
    ])('normalizes %s', (raw, expected) => {
        expect(normalizeStorageKey(raw)).toBe(expected);
    });

    it.each(['../etc/passwd', 'projects/../users/bob/x', '/abs/path', 'projects/%2e%2e/x', '%E0%A4%A', ''])('rejects %s', (raw) => {
        expect(normalizeStorageKey(raw)).toBeNull();
    });
});

describe('checkStorageAccess', () => {
    it('serves avatars publicly', async () => {
        await expect(checkStorageAccess('users/bob/avatar.png', null)).resolves.toMatchObject({ allowed: true, isPublic: true });
    });

    it('requires sign-in for everything else', async () => {
        await expect(checkStorageAccess('temp/x.png', null)).resolves.toMatchObject({ allowed: false, reason: 'not-signed-in' });
    });

    it('lets admins read anything', async () => {
        await expect(checkStorageAccess('media/bob/private.png', admin)).resolves.toMatchObject({ allowed: true, reason: 'admin' });
    });

    it('checks project membership for project files', async () => {
        m.canAccessProject.mockResolvedValueOnce(true).mockResolvedValueOnce(false).mockResolvedValueOnce(null);
        await expect(checkStorageAccess('projects/p1/final.mp4', alice)).resolves.toMatchObject({ allowed: true });
        await expect(checkStorageAccess('projects/p2/final.mp4', alice)).resolves.toMatchObject({ allowed: false, reason: 'not-project-member' });
        await expect(checkStorageAccess('projects/gone/final.mp4', alice)).resolves.toMatchObject({ allowed: false, reason: 'project-not-found' });
        expect(m.canAccessProject).toHaveBeenCalledWith('alice', 'p1');
    });

    it.each(['media', 'influencer', 'users'])('restricts %s/<userId>/ to that user', async (prefix) => {
        await expect(checkStorageAccess(`${prefix}/alice/file.png`, alice)).resolves.toMatchObject({ allowed: true, isPublic: false });
        await expect(checkStorageAccess(`${prefix}/bob/file.png`, alice)).resolves.toMatchObject({ allowed: false, reason: 'not-owner' });
    });

    it('restricts highlights to the stream session owner', async () => {
        m.sessionFindOne.mockReturnValueOnce(lean({ userId: 'alice' })).mockReturnValueOnce(lean({ userId: 'bob' }));
        await expect(checkStorageAccess('highlights/s1/h.webm', alice)).resolves.toMatchObject({ allowed: true });
        await expect(checkStorageAccess('highlights/s2/h.webm', alice)).resolves.toMatchObject({ allowed: false });
    });

    it('allows any signed-in user for unclassified prefixes', async () => {
        await expect(checkStorageAccess('music/abc.mp3', alice)).resolves.toMatchObject({ allowed: true, reason: 'signed-in' });
    });
});

describe('authorizeStorageRequest modes', () => {
    const anonymous = { headers: {} } as any;
    const signedIn = { headers: { cookie: 'auth-token=tok' } } as any;

    it('report (default): serves denied requests but logs them once', async () => {
        const first = await authorizeStorageRequest(anonymous, 'media/bob/x.png', 'test');
        await authorizeStorageRequest(anonymous, 'media/bob/y.png', 'test');
        expect(first.status).toBeNull();
        expect(first.decision?.allowed).toBe(false);
        expect(m.warn).toHaveBeenCalledTimes(1);
    });

    it('enforce: 401 when not signed in, 403 when signed in without access', async () => {
        process.env.STORAGE_ACCESS_MODE = 'enforce';
        await expect(authorizeStorageRequest(anonymous, 'media/bob/x.png', 'test')).resolves.toMatchObject({ status: 401 });

        m.verifyToken.mockReturnValue({ userId: 'alice' });
        m.userFindById.mockReturnValue(lean({ role: 'user', isActive: true }));
        await expect(authorizeStorageRequest(signedIn, 'media/bob/x.png', 'test')).resolves.toMatchObject({ status: 403 });
        await expect(authorizeStorageRequest(signedIn, 'media/alice/x.png', 'test')).resolves.toMatchObject({ status: null });
    });

    it('off: skips all checks', async () => {
        process.env.STORAGE_ACCESS_MODE = 'off';
        await expect(authorizeStorageRequest(anonymous, 'media/bob/x.png', 'test')).resolves.toEqual({ status: null, decision: null });
        expect(m.verifyToken).not.toHaveBeenCalled();
    });
});
