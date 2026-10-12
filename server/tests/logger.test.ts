import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

vi.mock('../src/models/SystemLog.js', () => ({ SystemLog: vi.fn() }));
vi.mock('../src/services/system/EmailService.js', () => ({ emailService: { sendEmail: vi.fn() } }));
vi.mock('../src/services/system/AlertService.js', () => ({ alertService: { sendCriticalAlert: vi.fn() } }));
vi.mock('../src/utils/ConfigService.js', () => ({ configService: { logs: { retentionDays: 30 } } }));

let tmpDir: string;
let Logger: any;
const logFile = () => path.join(tmpDir, 'logs', 'antstudio-system.log');
// Stream writes are buffered: wait for the content instead of a fixed delay (slow CI machines)
const readWhenReady = async (file: string, pattern: RegExp) => {
    await vi.waitFor(() => expect(fs.existsSync(file) && fs.readFileSync(file, 'utf8')).toMatch(pattern), { timeout: 5000 });
    return fs.readFileSync(file, 'utf8');
};

beforeAll(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'antstudio-logs-'));
    process.env.APP_USER_DATA_PATH = tmpDir;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    ({ Logger } = await import('../src/utils/Logger.js'));
});

afterAll(() => {
    vi.useRealTimers();
    fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('Logger file output', () => {
    it('appends formatted lines to the current log file', async () => {
        await Logger.info('first line', 'Test');
        await Logger.info('second line', 'Test');

        const content = await readWhenReady(logFile(), /second line/);
        expect(content).toMatch(/\[INFO\] \[Test\] first line/);
        expect(content).toMatch(/\[INFO\] \[Test\] second line/);
    });

    it('rotates the file when the day changes', async () => {
        const yesterday = new Date();
        const tomorrow = new Date(yesterday);
        tomorrow.setDate(tomorrow.getDate() + 1);
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(tomorrow);

        // Concurrent writes during the rotation must all land in the new file
        await Promise.all([Logger.info('after rollover A', 'Test'), Logger.info('after rollover B', 'Test')]);

        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        const rotated = path.join(tmpDir, 'logs', `antstudio-system-${mm}-${dd}-${yesterday.getFullYear()}.log`);

        await readWhenReady(rotated, /first line/);
        await readWhenReady(logFile(), /after rollover A/);
        const current = await readWhenReady(logFile(), /after rollover B/);
        expect(current).toMatch(/after rollover A/);
        expect(current).toMatch(/after rollover B/);
        expect(current).not.toMatch(/first line/);
    });
});
