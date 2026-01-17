import type { UseFetchOptions } from 'nuxt/app'

export const useApi = () => {
    const config = useRuntimeConfig()
    const apiBase = config.public.apiBase as string

    // Helper to make authenticated API calls
    const apiFetch = async <T>(
        endpoint: string,
        options: UseFetchOptions<T> = {}
    ) => {
        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers
        }

        return $fetch<T>(`${apiBase}${endpoint}`, {
            ...options,
            headers,
            credentials: 'include' // Important for cookies
        })
    }

    // Auth API
    const auth = {
        login: (email: string, password: string) =>
            apiFetch('/api/auth/login', {
                method: 'POST',
                body: { email, password }
            }),

        register: (email: string, password: string, name: string) =>
            apiFetch('/api/auth/register', {
                method: 'POST',
                body: { email, password, name }
            }),

        logout: () =>
            apiFetch('/api/auth/logout', {
                method: 'POST'
            }),

        me: () => apiFetch('/api/auth/me'),

        changePassword: (currentPassword: string, newPassword: string) =>
            apiFetch('/api/auth/change-password', {
                method: 'POST',
                body: { currentPassword, newPassword }
            })
    }

    // Projects API
    const projects = {
        list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
            apiFetch('/api/projects', {
                method: 'GET',
                params
            }),

        create: (data: { title: string; description?: string; language?: string; style?: any }) =>
            apiFetch('/api/projects', {
                method: 'POST',
                body: data
            }),

        get: (id: string) => apiFetch(`/api/projects/${id}`),

        update: (id: string, data: any) =>
            apiFetch(`/api/projects/${id}`, {
                method: 'PUT',
                body: data
            }),

        delete: (id: string) =>
            apiFetch(`/api/projects/${id}`, {
                method: 'DELETE'
            })
    }

    // Media API
    const media = {
        upload: async (file: File, purpose: string = 'general') => {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('purpose', purpose)

            return $fetch(`${apiBase}/api/media/upload`, {
                method: 'POST',
                body: formData,
                credentials: 'include'
            })
        },

        list: (params?: { page?: number; limit?: number; purpose?: string }) =>
            apiFetch('/api/media/list', {
                method: 'GET',
                params
            }),

        delete: (id: string) =>
            apiFetch(`/api/media/${id}`, {
                method: 'DELETE'
            })
    }

    // Admin API
    const admin = {
        users: {
            list: (params?: { page?: number; search?: string }) =>
                apiFetch('/api/admin/users', {
                    method: 'GET',
                    params
                }),

            get: (id: string) => apiFetch(`/api/admin/users/${id}`),

            update: (id: string, data: any) =>
                apiFetch(`/api/admin/users/${id}`, {
                    method: 'PUT',
                    body: data
                }),

            delete: (id: string) =>
                apiFetch(`/api/admin/users/${id}`, {
                    method: 'DELETE'
                })
        },

        stats: () => apiFetch('/api/admin/stats')
    }

    // S3 Proxy
    const s3 = {
        getUrl: (key: string) => `${apiBase}/api/s3/${encodeURIComponent(key)}`
    }

    return {
        apiFetch,
        auth,
        projects,
        media,
        admin,
        s3
    }
}
