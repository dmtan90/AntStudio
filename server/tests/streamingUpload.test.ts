import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Readable } from 'stream';
import type { AddressInfo } from 'net';

const h = vi.hoisted(() => ({ mediaCreate: vi.fn(async (doc: any) => ({ _id: 'm1', ...doc })), s3Send: vi.fn() }));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({
    configService: { domain: 'http://localhost', aws: { bucketName: 'bucket', region: 'us-east-1', endpoint: '' }, s3: {} },
    EnvConfig: {}
}));
vi.mock('../src/utils/db.js', () => ({ connectDB: vi.fn(async () => {}) }));
vi.mock('../src/models/Media.js', () => ({ Media: { create: h.mediaCreate } }));
vi.mock('../src/middleware/auth.js', () => ({ authMiddleware: (req: any, _res: any, next: any) => { req.user = { userId: 'alice' }; next(); } }));

let root: string;
let uploadTmp: string;
let baseUrl: string;
let server: any;

beforeAll(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'antstudio-upload-'));
    uploadTmp = path.join(root, 'multer-tmp');
    fs.mkdirSync(uploadTmp);
    // multer's disk storage destination and the local storage root both come from these
    vi.spyOn(os, 'tmpdir').mockReturnValue(uploadTmp);
    vi.spyOn(process, 'cwd').mockReturnValue(root);

    const { LocalStorageAdapter } = await import('../src/services/storage/LocalStorageAdapter.js');
    const adapter = LocalStorageAdapter.getInstance();
    vi.doMock('../src/services/storage/StorageFactory.js', () => ({ StorageFactory: { getActiveAdapter: async () => adapter } }));

    const { default: libraryRouter } = await import('../src/routes/media/library.js');
    const app = express();
    app.use('/api/media', libraryRouter);
    server = app.listen(0);
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/media`;
});

afterAll(() => {
    server?.close();
    vi.restoreAllMocks();
    fs.rmSync(root, { recursive: true, force: true });
});

describe('POST /api/media/upload (disk-buffered, streamed to storage)', () => {
    it('stores the file under a sanitized key and removes the temp files', async () => {
        const form = new FormData();
        form.append('file', new Blob([Buffer.from('VIDEO-BYTES')], { type: 'video/mp4' }), '../../evil clip.mp4');
        form.append('thumbnail', new Blob([Buffer.from('THUMB')], { type: 'image/jpeg' }), 'thumb.jpg');

        const res = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
        const json: any = await res.json();

        expect(res.status).toBe(200);
        expect(json.data.key).toMatch(/^media\/alice\/\d+-evil clip\.mp4$/);
        expect(fs.readFileSync(path.join(root, 'uploads', json.data.key), 'utf8')).toBe('VIDEO-BYTES');
        expect(h.mediaCreate).toHaveBeenCalledWith(expect.objectContaining({ size: 11, contentType: 'video/mp4', metadata: { thumbnail: expect.stringMatching(/^thumbnails\/alice\//) } }));
        expect(fs.readdirSync(uploadTmp)).toEqual([]); // multer temp files cleaned up
    });

    it('cleans up temp files when the request is rejected', async () => {
        const form = new FormData();
        form.append('thumbnail', new Blob([Buffer.from('THUMB')], { type: 'image/jpeg' }), 'thumb.jpg');
        const res = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });
        expect(res.status).toBe(400);
        expect(fs.readdirSync(uploadTmp)).toEqual([]);
    });
});

describe('safeKeyFileName', () => {
    it.each([
        ['../../etc/passwd', 'passwd'],
        ['C:\\Users\\me\\photo (1).png', 'photo _1_.png'],
        ['...hidden', 'hidden'],
        ['', 'file']
    ])('%s -> %s', async (input, expected) => {
        const { safeKeyFileName } = await import('../src/routes/media/shared.js');
        expect(safeKeyFileName(input)).toBe(expected);
    });
});

describe('S3StorageAdapter.uploadFromPath', () => {
    it('sends a file stream with an explicit ContentLength', async () => {
        vi.doMock('@aws-sdk/client-s3', async (orig) => {
            const real: any = await orig();
            return { ...real, S3Client: class { send = h.s3Send; } };
        });
        vi.resetModules();
        const { S3StorageAdapter } = await import('../src/services/storage/S3StorageAdapter.js');
        const adapter: any = Object.create(S3StorageAdapter.prototype);
        adapter.client = { send: h.s3Send };
        adapter.bucket = 'bucket';

        const file = path.join(root, 'big.bin');
        fs.writeFileSync(file, Buffer.alloc(4096, 1));
        await adapter.uploadFromPath('media/alice/big.bin', file, 'application/octet-stream');

        const input = h.s3Send.mock.calls[0][0].input;
        expect(input.ContentLength).toBe(4096);
        expect(input.Body).toBeInstanceOf(Readable);
        expect(input.Key).toBe('media/alice/big.bin');
        // Drain the stream so the file is read (and closed) before the temp dir is removed
        let read = 0;
        for await (const chunk of input.Body) read += chunk.length;
        expect(read).toBe(4096);
    });
});
