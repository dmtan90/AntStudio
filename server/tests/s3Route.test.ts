import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

const m = vi.hoisted(() => ({ verifyToken: vi.fn(), userFindById: vi.fn(), canAccessProject: vi.fn() }));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({ configService: { domain: 'http://localhost' } }));
vi.mock('../src/utils/jwt.js', () => ({
    verifyToken: m.verifyToken,
    extractTokenFromHeader: (h?: string) => (h?.startsWith('Bearer ') ? h.slice(7) : null),
    extractTokenFromCookie: (c?: string) => (c?.match(/auth-token=([^;]+)/) || [])[1] || null
}));
vi.mock('../src/models/User.js', () => ({ User: { findById: m.userFindById }, UserRole: { ADMIN: 'admin', SYS_ADMIN: 'sys-admin' } }));
vi.mock('../src/models/StreamSession.js', () => ({ StreamSessionModel: { findOne: vi.fn() } }));
vi.mock('../src/utils/projectAccess.js', () => ({ userCanAccessProject: m.canAccessProject }));
vi.mock('../src/middleware/auth.js', () => ({ authMiddleware: (req: any, _res: any, next: any) => { req.user = { userId: 'alice' }; next(); } }));

let tmpDir: string;
let baseUrl: string;
let server: any;

beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antstudio-s3-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    const { LocalStorageAdapter } = await import('../src/services/storage/LocalStorageAdapter.js');
    const adapter = LocalStorageAdapter.getInstance();
    vi.doMock('../src/services/storage/StorageFactory.js', () => ({ StorageFactory: { getActiveAdapter: async () => adapter } }));
    await adapter.uploadFile('media/alice/photo.png', Buffer.from('PNGDATA'));
    await adapter.uploadFile('users/bob/avatar.png', Buffer.from('AVATAR'));

    const { default: s3Router } = await import('../src/routes/s3.js');
    const app = express();
    app.use(express.json());
    app.use('/api/s3', s3Router);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/s3`;
});

afterAll(() => {
    server?.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

beforeEach(() => {
    process.env.STORAGE_ACCESS_MODE = 'enforce';
    m.verifyToken.mockReset().mockImplementation((t: string) => (t === 'alice-token' ? { userId: 'alice' } : null));
    m.userFindById.mockReset().mockReturnValue({ select: () => ({ lean: () => Promise.resolve({ role: 'user', isActive: true }) }) });
    m.canAccessProject.mockReset();
});

describe('GET /api/s3/* (local storage)', () => {
    it('streams the owner\'s file using the auth cookie, with private caching', async () => {
        const res = await fetch(`${baseUrl}/media/alice/photo.png`, { headers: { cookie: 'auth-token=alice-token' } });
        expect(res.status).toBe(200);
        expect(await res.text()).toBe('PNGDATA');
        expect(res.headers.get('content-type')).toBe('image/png');
        expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
    });

    it('rejects anonymous and non-owner reads in enforce mode', async () => {
        expect((await fetch(`${baseUrl}/media/alice/photo.png`)).status).toBe(401);
        m.verifyToken.mockReturnValue({ userId: 'bob' });
        expect((await fetch(`${baseUrl}/media/alice/photo.png`, { headers: { authorization: 'Bearer bob-token' } })).status).toBe(403);
    });

    it('serves avatars publicly with public caching', async () => {
        const res = await fetch(`${baseUrl}/users/bob/avatar.png`);
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('public, max-age=3600');
    });

    it('still serves denied files in report mode', async () => {
        process.env.STORAGE_ACCESS_MODE = 'report';
        const res = await fetch(`${baseUrl}/media/alice/photo.png`);
        expect(res.status).toBe(200);
        expect(res.headers.get('cache-control')).toBe('private, max-age=3600');
    });

    it('rejects traversal keys', async () => {
        const res = await fetch(`${baseUrl}/media%2F..%2F..%2Fsecret.txt`, { headers: { cookie: 'auth-token=alice-token' } });
        expect(res.status).toBe(400);
    });

    it('returns 404 for missing files', async () => {
        const res = await fetch(`${baseUrl}/media/alice/missing.png`, { headers: { cookie: 'auth-token=alice-token' } });
        expect(res.status).toBe(404);
    });
});

describe('POST /api/s3/presigned-upload', () => {
    const post = (body: any) => fetch(`${baseUrl}/presigned-upload`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

    it('refuses projects the caller cannot access', async () => {
        m.canAccessProject.mockResolvedValue(false);
        expect((await post({ projectId: '64b7f0f0f0f0f0f0f0f0f0f0' })).status).toBe(403);
    });

    it('sanitizes the client-supplied extension', async () => {
        m.canAccessProject.mockResolvedValue(true);
        const res = await post({ projectId: '64b7f0f0f0f0f0f0f0f0f0f0', extension: 'mp4/../../users/bob/avatar' });
        const json: any = await res.json();
        expect(res.status).toBe(200);
        expect(json.data.key).toMatch(/^projects\/64b7f0f0f0f0f0f0f0f0f0f0\/renders\/video_\d+\.mp4$/);
    });
});
