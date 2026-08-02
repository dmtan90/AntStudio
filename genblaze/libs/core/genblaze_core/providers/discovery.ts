/**
 * Discovery cache — single-flight, async-safe upstream catalog snapshot.
 * 1:1 port of providers/discovery.py
 */

export const DEFAULT_TTL_SECONDS = 3600.0;
export const SINGLE_FLIGHT_WAIT_SECONDS = 30.0;

export enum DiscoveryStatus {
    OK = 'ok',
    UNSUPPORTED = 'unsupported',
    FAILED = 'failed'
}

export interface DiscoveryResult<T = any> {
    status: DiscoveryStatus;
    items?: T[];
    error?: Error;
}

export class DiscoveryCache<T = any> {
    private ttlMs: number;
    private cachedItems: T[] | null = null;
    private cachedAt: number | null = null;
    private inFlight: Promise<T[]> | null = null;

    constructor(ttlSeconds = DEFAULT_TTL_SECONDS) {
        this.ttlMs = ttlSeconds * 1000;
    }

    async get(fetcher: () => Promise<T[]>, options: { maxAgeSeconds?: number; refresh?: boolean } = {}): Promise<DiscoveryResult<T>> {
        const maxAgeMs = (options.maxAgeSeconds ?? (this.ttlMs / 1000)) * 1000;
        const now = Date.now();

        if (!options.refresh && this.cachedItems && this.cachedAt && (now - this.cachedAt < maxAgeMs)) {
            return { status: DiscoveryStatus.OK, items: this.cachedItems };
        }

        if (this.inFlight) {
            try {
                const items = await this.inFlight;
                return { status: DiscoveryStatus.OK, items };
            } catch (err: any) {
                return { status: DiscoveryStatus.FAILED, error: err };
            }
        }

        this.inFlight = fetcher();
        try {
            const items = await this.inFlight;
            this.cachedItems = items;
            this.cachedAt = Date.now();
            return { status: DiscoveryStatus.OK, items };
        } catch (err: any) {
            return { status: DiscoveryStatus.FAILED, error: err };
        } finally {
            this.inFlight = null;
        }
    }

    clear(): void {
        this.cachedItems = null;
        this.cachedAt = null;
        this.inFlight = null;
    }
}
