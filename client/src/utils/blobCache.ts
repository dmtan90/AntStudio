
/**
 * BlobCache Utility
 * Only works in secure contexts (HTTPS or localhost) where the Cache API is available.
 */

const CACHE_NAME = 'antflow-blob-cache-v1'

export class BlobCache {
    private static instance: BlobCache
    private cachePromise: Promise<Cache> | null = null

    private constructor() {
        if ('caches' in window) {
            this.cachePromise = caches.open(CACHE_NAME)
        } else {
            console.warn('Cache API not supported in this browser.')
        }
    }

    public static getInstance(): BlobCache {
        if (!BlobCache.instance) {
            BlobCache.instance = new BlobCache()
        }
        return BlobCache.instance
    }

    /**
     * Fetch a URL and cache it as a Blob.
     * Returns the Blob.
     */
    async fetchAndCache(url: string, options?: RequestInit): Promise<Blob | null> {
        if (!this.cachePromise) return null

        try {
            const cache = await this.cachePromise
            const response = await fetch(url, options)

            if (!response.ok) {
                throw new Error(`Failed to fetch ${url}: ${response.statusText}`)
            }

            const clone = response.clone()
            await cache.put(url, clone)

            return await response.blob()
        } catch (error) {
            console.error('BlobCache fetch error:', error)
            return null
        }
    }

    /**
     * Put a Blob directly into the cache for a specific URL key.
     */
    async put(url: string, blob: Blob): Promise<void> {
        if (!this.cachePromise) return

        try {
            const cache = await this.cachePromise
            const response = new Response(blob)
            await cache.put(url, response)
        } catch (error) {
            console.error('BlobCache put error:', error)
        }
    }

    /**
     * Get a Blob from the cache.
     */
    async get(url: string): Promise<Blob | null> {
        if (!this.cachePromise) return null

        try {
            const cache = await this.cachePromise
            const response = await cache.match(url)

            if (!response) return null

            return await response.blob()
        } catch (error) {
            console.error('BlobCache get error:', error)
            return null
        }
    }

    /**
     * Check if a URL is in the cache.
     */
    async has(url: string): Promise<boolean> {
        if (!this.cachePromise) return false

        try {
            const cache = await this.cachePromise
            const response = await cache.match(url)
            return !!response
        } catch {
            return false
        }
    }

    /**
     * Get a standard Blob URL (blob:...) for a cached item.
     * If not in cache, optionally fetch it.
     */
    async getBlobUrl(url: string, fetchIfMissing = false, fetchOptions?: RequestInit): Promise<string | null> {
        let blob = await this.get(url)

        if (!blob && fetchIfMissing) {
            blob = await this.fetchAndCache(url, fetchOptions)
        }

        if (blob) {
            return URL.createObjectURL(blob)
        }

        return null
    }

    /**
     * Delete an item from cache.
     */
    async delete(url: string): Promise<boolean> {
        if (!this.cachePromise) return false

        try {
            const cache = await this.cachePromise
            return await cache.delete(url)
        } catch (error) {
            console.error('BlobCache delete error:', error)
            return false
        }
    }

    /**
     * Clear the entire cache.
     */
    async clear(): Promise<boolean> {
        if (!('caches' in window)) return false

        try {
            return await caches.delete(CACHE_NAME)
        } catch (error) {
            console.error('BlobCache clear error:', error)
            return false
        }
    }
}

export const blobCache = BlobCache.getInstance()
