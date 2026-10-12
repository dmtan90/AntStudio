import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';

const state = vi.hoisted(() => ({ launches: 0, contexts: [] as any[], browsers: [] as any[] }));

vi.mock('../src/utils/Logger.js', () => ({ Logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('playwright', () => ({
    chromium: {
        launch: vi.fn(async () => {
            state.launches++;
            const browser: any = new EventEmitter();
            browser.newContext = vi.fn(async (options: any) => {
                const context = { options, closed: false, close: vi.fn(async () => { context.closed = true; }) };
                state.contexts.push(context);
                return context;
            });
            browser.close = vi.fn(async () => {});
            state.browsers.push(browser);
            return browser;
        })
    }
}));

process.env.PLAYWRIGHT_MAX_CONCURRENCY = '2';
const { withBrowserContext, getBrowserPoolStats, closeBrowserPool } = await import('../src/utils/browserPool.js');

const deferred = () => {
    let resolve!: () => void;
    const promise = new Promise<void>(r => { resolve = r; });
    return { promise, resolve };
};

beforeEach(async () => {
    await closeBrowserPool();
    state.launches = 0;
    state.contexts.length = 0;
    state.browsers.length = 0;
});

describe('browserPool', () => {
    it('reuses one browser and gives each task its own context', async () => {
        await withBrowserContext(async () => 'a', { userAgent: 'UA-1' });
        await withBrowserContext(async () => 'b');
        expect(state.launches).toBe(1);
        expect(state.contexts).toHaveLength(2);
        expect(state.contexts[0].options).toEqual({ userAgent: 'UA-1' });
        expect(state.contexts.every(c => c.closed)).toBe(true);
    });

    it('caps concurrent contexts and queues the rest', async () => {
        const gates = [deferred(), deferred(), deferred()];
        const runs = gates.map((gate, i) => withBrowserContext(async () => { await gate.promise; return i; }));
        try {
            // Wait on conditions rather than a fixed number of ticks (the mocked dynamic import is async)
            await vi.waitFor(() => expect(state.contexts).toHaveLength(2));
            expect(getBrowserPoolStats()).toMatchObject({ active: 2, waiting: 1 });

            gates[0].resolve();
            await runs[0];
            await vi.waitFor(() => expect(state.contexts).toHaveLength(3)); // queued task started after a slot freed

            gates[1].resolve(); gates[2].resolve();
            await expect(Promise.all(runs)).resolves.toEqual([0, 1, 2]);
            expect(getBrowserPoolStats()).toMatchObject({ active: 0, waiting: 0 });
        } finally {
            // Never leave slots held for later tests, even if an assertion failed
            gates.forEach(g => g.resolve());
            await Promise.allSettled(runs);
        }
    });

    it('closes the context and frees the slot when the task throws', async () => {
        await expect(withBrowserContext(async () => { throw new Error('navigation failed'); })).rejects.toThrow('navigation failed');
        expect(state.contexts[0].closed).toBe(true);
        expect(getBrowserPoolStats().active).toBe(0);
    });

    it('relaunches the browser after it disconnects', async () => {
        await withBrowserContext(async () => null);
        state.browsers[0].emit('disconnected');
        await withBrowserContext(async () => null);
        expect(state.launches).toBe(2);
    });
});
