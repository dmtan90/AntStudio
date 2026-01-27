import axios from 'axios'

const api = axios.create({
    baseURL: '/api',
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// Request interceptor: attach auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth-token')
        if (token) {
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error)
)

// Response interceptor: handle standardized structure and global errors
api.interceptors.response.use(
    (response) => {
        // If the response follows our standardized structure, unwrap the 'data' property
        if (response.data && typeof response.data === 'object' && 'success' in response.data) {
            if (response.data.success) {
                // Only unwrap if 'data' property exists, otherwise keep the whole object (success, message etc)
                if (response.data.data !== undefined) {
                    response.data = response.data.data
                }
                return response
            } else {
                // If success is false, reject with the error message
                return Promise.reject({
                    response: {
                        data: response.data,
                        status: response.status
                    }
                })
            }
        }
        return response
    },
    (error) => {
        if (error.response?.status === 401) {
            // Only clear auth if we're not already on the login page
            if (window.location.pathname !== '/login') {
                localStorage.removeItem('auth-token')
                window.location.href = '/login'
            }
        }
        return Promise.reject(error)
    }
)

import { blobCache } from '@/utils/blobCache'

export function getFileUrl(path: string | undefined | null, options: { cached: true, refresh?: boolean }): Promise<string>
export function getFileUrl(path: string | undefined | null, options?: { cached?: false, refresh?: boolean }): string
export function getFileUrl(path: string | undefined | null, options?: { cached?: boolean, refresh?: boolean }): string | Promise<string> {
    if (!path) return options?.cached ? Promise.resolve('') : ''

    let url = path
    // If it doesn't start with http or /, assume it's an S3 path
    if (!path.startsWith('http') && !path.startsWith('/')) {
        url = `/api/s3/${path}`
    }

    //fix issue with external url
    if (!options?.cached && (path.startsWith('http://') || path.startsWith('https://'))) {
        const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(url)}`
        return proxyUrl;
    }

    if (options?.refresh) {
        const separator = url.includes('?') ? '&' : '?'
        url = `${url}${separator}t=${Date.now()}`
    }

    if (options?.cached) {
        const token = localStorage.getItem('auth-token')
        const fetchOptions: RequestInit = {}

        // Only attach Authorization header if it's our own API (S3 proxy)
        // Only attach Authorization header if it's our own API (S3 proxy)
        const isInternal = url.startsWith('/') || url.startsWith(window.location.origin)
        if (token && isInternal) {
            fetchOptions.headers = { 'Authorization': `Bearer ${token}` }
        }

        // Fix for CORS/CORP issues with external URLs (CloudFront, Pexels, etc.)
        // If it's external and we want to cache/process it (likely for ffmpeg/canvas), verify CORS.
        // If we suspect it might fail (or just to be safe), use our proxy.
        if (!isInternal && options?.cached) {
            // Route through our proxy which adds the correct Cross-Origin-Resource-Policy header
            // This solves "net::ERR_BLOCKED_BY_RESPONSE.NotSameOriginAfterDefaultedToSameOriginByCoep"
            const proxyUrl = `/api/media/proxy?url=${encodeURIComponent(url)}`
            // Use proxy URL for fetching the blob
            return blobCache.getBlobUrl(proxyUrl, true, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            }).then(blobUrl => blobUrl || url)
        }

        // Return the promise from blobCache
        // We set fetchIfMissing=true to ensure we get a blob
        return blobCache.getBlobUrl(url, true, fetchOptions).then(blobUrl => blobUrl || url)
    }

    return url
}

export default api
