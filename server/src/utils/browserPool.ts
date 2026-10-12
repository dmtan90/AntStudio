import type { Browser, BrowserContext, BrowserContextOptions } from 'playwright';
import { Logger } from './Logger.js';

/**
 * Shared headless Chromium for scraping/import tasks.
 *
 * Previously every request launched (and sometimes leaked) its own Chromium process, so a burst of
 * product-extraction requests could exhaust memory. Callers now get an isolated BrowserContext from
 * one long-lived browser, with a cap on concurrent contexts; extra callers wait in a FIFO queue.
 */

const MAX_CONCURRENCY = Math.max(1, parseInt(process.env.PLAYWRIGHT_MAX_CONCURRENCY || '2', 10) || 2);
const ACQUIRE_TIMEOUT_MS = 60_000;

let browserPromise: Promise<Browser> | null = null;
let active = 0;
const waiters: Array<() => void> = [];

async function getBrowser(): Promise<Browser> {
    if (!browserPromise) {
        browserPromise = (async () => {
            const { chromium } = await import('playwright');
            const browser = await chromium.launch({ headless: true });
            browser.on('disconnected', () => {
                Logger.warn('[BrowserPool] Chromium disconnected; it will be relaunched on next use', 'BrowserPool');
                browserPromise = null;
            });
            return browser;
        })().catch((err) => {
            browserPromise = null;
            throw err;
        });
    }
    return browserPromise;
}

function acquireSlot(): Promise<void> {
    if (active < MAX_CONCURRENCY) {
        active++;
        return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
        const waiter = () => {
            clearTimeout(timer);
            active++;
            resolve();
        };
        const timer = setTimeout(() => {
            const index = waiters.indexOf(waiter);
            if (index >= 0) waiters.splice(index, 1);
            reject(new Error('Browser pool is busy, please try again later'));
        }, ACQUIRE_TIMEOUT_MS);
        waiters.push(waiter);
    });
}

function releaseSlot() {
    active = Math.max(0, active - 1);
    const next = waiters.shift();
    if (next) next();
}

/**
 * Runs `task` with a fresh, isolated browser context and always closes it afterwards.
 * At most PLAYWRIGHT_MAX_CONCURRENCY (default 2) tasks run at once.
 */
export async function withBrowserContext<T>(
    task: (context: BrowserContext) => Promise<T>,
    options: BrowserContextOptions = {}
): Promise<T> {
    await acquireSlot();
    let context: BrowserContext | null = null;
    try {
        const browser = await getBrowser();
        context = await browser.newContext(options);
        return await task(context);
    } finally {
        if (context) await context.close().catch(() => {});
        releaseSlot();
    }
}

/** Closes the shared browser (used on graceful shutdown). */
export async function closeBrowserPool() {
    const pending = browserPromise;
    browserPromise = null;
    if (pending) {
        try {
            const browser = await pending;
            await browser.close();
        } catch {
            // Already gone
        }
    }
}

/** Exposed for tests/monitoring. */
export function getBrowserPoolStats() {
    return { active, waiting: waiters.length, maxConcurrency: MAX_CONCURRENCY };
}
