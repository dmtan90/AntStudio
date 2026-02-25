/**
 * ModelCache - IndexedDB-based cache for VTuber model files and face landmarks.
 * Avoids re-downloading large model files and re-running expensive face detection.
 */

const DB_NAME = 'AntStudioModelCache';
const DB_VERSION = 1;
const STORE_FILES = 'files';       // Blob storage for model files (VRM, Live2D archives, images)
const STORE_LANDMARKS = 'landmarks'; // JSON storage for face landmark detection results
const STORE_LIVE2D = 'live2d';     // Map<filename, Blob> for extracted Live2D archives

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_FILES)) {
                db.createObjectStore(STORE_FILES);
            }
            if (!db.objectStoreNames.contains(STORE_LANDMARKS)) {
                db.createObjectStore(STORE_LANDMARKS);
            }
            if (!db.objectStoreNames.contains(STORE_LIVE2D)) {
                db.createObjectStore(STORE_LIVE2D);
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/** Generate a stable cache key from a URL */
function urlToKey(url: string): string {
    // Strip query params for stability, keep path
    try {
        const u = new URL(url, window.location.origin);
        return u.pathname;
    } catch {
        return url;
    }
}

async function getFromStore<T>(storeName: string, key: string): Promise<T | null> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('[ModelCache] Read failed:', e);
        return null;
    }
}

async function putToStore<T>(storeName: string, key: string, value: T): Promise<void> {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        console.warn('[ModelCache] Write failed:', e);
    }
}

// ============================================================
// Public API
// ============================================================

/** Get a cached file blob (VRM, image, etc.) */
export async function getCachedFile(url: string): Promise<Blob | null> {
    const key = urlToKey(url);
    const result = await getFromStore<Blob>(STORE_FILES, key);
    if (result) console.log('[ModelCache] Hit (file):', key);
    return result;
}

/** Cache a file blob */
export async function cacheFile(url: string, blob: Blob): Promise<void> {
    const key = urlToKey(url);
    await putToStore(STORE_FILES, key, blob);
    console.log('[ModelCache] Stored (file):', key, `${(blob.size / 1024 / 1024).toFixed(1)}MB`);
}

/** Get cached face landmarks for a given image URL */
export async function getCachedLandmarks(url: string): Promise<any | null> {
    const key = urlToKey(url);
    const result = await getFromStore<any>(STORE_LANDMARKS, key);
    if (result) console.log('[ModelCache] Hit (landmarks):', key);
    return result;
}

/** Cache face landmark detection results */
export async function cacheLandmarks(url: string, data: any): Promise<void> {
    const key = urlToKey(url);
    await putToStore(STORE_LANDMARKS, key, data);
    console.log('[ModelCache] Stored (landmarks):', key);
}

/** Get cached extracted Live2D file map */
export async function getCachedLive2D(url: string): Promise<Map<string, Blob> | null> {
    const key = urlToKey(url);
    // IndexedDB can't store Map directly, we store as array of [name, blob]
    const stored = await getFromStore<Array<[string, Blob]>>(STORE_LIVE2D, key);
    if (stored) {
        console.log('[ModelCache] Hit (live2d):', key, `${stored.length} files`);
        return new Map(stored);
    }
    return null;
}

/** Cache extracted Live2D file map */
export async function cacheLive2D(url: string, fileMap: Map<string, Blob>): Promise<void> {
    const key = urlToKey(url);
    const arr = Array.from(fileMap.entries());
    await putToStore(STORE_LIVE2D, key, arr);
    console.log('[ModelCache] Stored (live2d):', key, `${arr.length} files`);
}

/** Clear entire cache (for debugging / settings) */
export async function clearCache(): Promise<void> {
    try {
        const db = await openDB();
        const stores = [STORE_FILES, STORE_LANDMARKS, STORE_LIVE2D];
        for (const storeName of stores) {
            await new Promise<void>((resolve, reject) => {
                const tx = db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const req = store.clear();
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        }
        console.log('[ModelCache] Cache cleared.');
    } catch (e) {
        console.error('[ModelCache] Clear failed:', e);
    }
}
