/**
 * Performance Utilities for Video Editor
 * Provides debouncing, throttling, and optimization helpers
 */

/**
 * Debounce function - delays execution until after wait time has elapsed since last call
 */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null;

    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };

        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - ensures function is called at most once per specified time period
 */
export function throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
): (...args: Parameters<T>) => void {
    let inThrottle: boolean = false;

    return function executedFunction(...args: Parameters<T>) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => {
                inThrottle = false;
            }, limit);
        }
    };
}

/**
 * Request Animation Frame wrapper for smooth animations
 */
export function rafThrottle<T extends (...args: any[]) => any>(
    func: T
): (...args: Parameters<T>) => void {
    let rafId: number | null = null;

    return function executedFunction(...args: Parameters<T>) {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
        }

        rafId = requestAnimationFrame(() => {
            func(...args);
            rafId = null;
        });
    };
}

/**
 * Batch DOM updates using requestIdleCallback
 */
export function idleCallback(callback: () => void, options?: IdleRequestOptions): void {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(callback, options);
    } else {
        // Fallback for browsers that don't support requestIdleCallback
        setTimeout(callback, 1);
    }
}

/**
 * Object pool for reusing objects and reducing GC pressure
 */
export class ObjectPool<T> {
    private pool: T[] = [];
    private factory: () => T;
    private reset: (obj: T) => void;
    private maxSize: number;

    constructor(factory: () => T, reset: (obj: T) => void, maxSize: number = 100) {
        this.factory = factory;
        this.reset = reset;
        this.maxSize = maxSize;
    }

    acquire(): T {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        return this.factory();
    }

    release(obj: T): void {
        if (this.pool.length < this.maxSize) {
            this.reset(obj);
            this.pool.push(obj);
        }
    }

    clear(): void {
        this.pool = [];
    }

    get size(): number {
        return this.pool.length;
    }
}

/**
 * Memoization cache with LRU eviction
 */
export class LRUCache<K, V> {
    private cache: Map<K, V>;
    private maxSize: number;

    constructor(maxSize: number = 100) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key);
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key);
            this.cache.set(key, value);
        }
        return value;
    }

    set(key: K, value: V): void {
        // Delete if exists to reinsert at end
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        this.cache.set(key, value);

        // Evict oldest if over max size
        if (this.cache.size > this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    has(key: K): boolean {
        return this.cache.has(key);
    }

    clear(): void {
        this.cache.clear();
    }

    get size(): number {
        return this.cache.size;
    }
}

/**
 * Measure performance of a function
 */
export function measurePerformance<T extends (...args: any[]) => any>(
    name: string,
    func: T
): T {
    return ((...args: Parameters<T>) => {
        const start = performance.now();
        const result = func(...args);
        const end = performance.now();
        console.log(`[Performance] ${name}: ${(end - start).toFixed(2)}ms`);
        return result;
    }) as T;
}

/**
 * Batch multiple state updates into a single render cycle
 */
export class BatchUpdater {
    private pending: Set<() => void> = new Set();
    private rafId: number | null = null;

    schedule(callback: () => void): void {
        this.pending.add(callback);

        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.flush();
            });
        }
    }

    private flush(): void {
        const callbacks = Array.from(this.pending);
        this.pending.clear();
        this.rafId = null;

        callbacks.forEach(cb => cb());
    }

    cancel(): void {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.pending.clear();
    }
}
