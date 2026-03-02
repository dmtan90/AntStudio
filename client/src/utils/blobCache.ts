
/**
 * BlobCache Utility
 * Only works in secure contexts (HTTPS or localhost) where the Cache API is available.
 */

const CACHE_NAME = 'antstudio-blob-cache-v1'

export class BlobCache {
    private static instance: BlobCache
    private cachePromise: Promise<Cache> | null = null
    private objectUrls = new Map<string, string>() // Key: original URL, Value: Object URL

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
        // Check local memory first for speed and to avoid multiple object URLs for same blob
        if (this.objectUrls.has(url)) {
            return this.objectUrls.get(url)!
        }

        let blob = await this.get(url)

        if (!blob && fetchIfMissing) {
            blob = await this.fetchAndCache(url, fetchOptions)
        }

        if (blob) {
            const blobUrl = URL.createObjectURL(blob)
            this.objectUrls.set(url, blobUrl)
            return blobUrl
        }

        return null
    }

    /**
     * Clear specific Object URL memory.
     */
    public revokeUrl(url: string): void {
        const objectUrl = this.objectUrls.get(url)
        if (objectUrl) {
            URL.revokeObjectURL(objectUrl)
            this.objectUrls.delete(url)
        }
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
            // Revoke all tracking object URLs before clearing
            for (const objectUrl of this.objectUrls.values()) {
                URL.revokeObjectURL(objectUrl)
            }
            this.objectUrls.clear()
            return await caches.delete(CACHE_NAME)
        } catch (error) {
            console.error('BlobCache clear error:', error)
            return false
        }
    }
}

export const blobCache = BlobCache.getInstance()
