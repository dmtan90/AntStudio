import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({ configService: { domain: 'http://localhost:4000' } }));

let tmpDir: string;
let adapter: any;

beforeAll(async () => {
    // The adapter stores files under <cwd>/uploads; point cwd at a temp dir
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antstudio-storage-'));
    vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
    const { LocalStorageAdapter } = await import('../src/services/storage/LocalStorageAdapter.js');
    adapter = LocalStorageAdapter.getInstance();
});

afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('LocalStorageAdapter key containment', () => {
    it('writes normal keys inside the upload directory', async () => {
        await adapter.uploadFile('projects/p1/image.png', Buffer.from('ok'));
        expect(fs.readFileSync(path.join(tmpDir, 'uploads/projects/p1/image.png'), 'utf8')).toBe('ok');
    });

    it('treats a leading slash as relative to the upload directory', async () => {
        await adapter.uploadFile('/projects/p2/a.txt', 'x');
        expect(fs.existsSync(path.join(tmpDir, 'uploads/projects/p2/a.txt'))).toBe(true);
    });

    // Backslash is only a path separator on Windows
    const traversalKeys = ['../escape.txt', 'projects/../../escape.txt', ...(process.platform === 'win32' ? ['..\\escape.txt'] : [])];
    it.each(traversalKeys)('rejects traversal key %s', async (key) => {
        await expect(adapter.uploadFile(key, 'x')).rejects.toThrow('Invalid storage key');
        expect(fs.existsSync(path.join(tmpDir, 'escape.txt'))).toBe(false);
    });

    it('refuses to delete the upload root', async () => {
        await expect(adapter.deleteFolder('.')).rejects.toThrow('upload root');
        await expect(adapter.deleteFolder('')).rejects.toThrow('upload root');
    });
});
