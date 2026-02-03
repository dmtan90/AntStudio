import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
    state: () => ({
        sidebarCollapsed: false,
        appName: 'AntStudio',
        logo: '',
        favicon: '',
        domain: window?.location?.origin || 'https://studio.agrhub.com',
    }),
    actions: {
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed
        },
        setSidebarCollapsed(value: boolean) {
            this.sidebarCollapsed = value
        },
        setAppConfig(config: { appName?: string; logo?: string; favicon?: string, domain?: string }) {
            if (config.appName) this.appName = config.appName
            if (config.logo) this.logo = config.logo
            if (config.favicon) this.favicon = config.favicon
            if (config.domain) this.domain = config.domain ?? this.domain;

            // Update document title and favicon
            if (config.appName) document.title = config.appName
            if (config.favicon) {
                const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement
                if (link) link.href = config.favicon
            }
        },
        async fetchAppConfig() {
            try {
                const response = await fetch('/api/configs/public')
                const data = await response.json()
                if (data.success) {
                    this.setAppConfig(data.data)
                }
            } catch (error) {
                console.error('Failed to fetch app config', error)
            }
        },
        async checkForUpdates() {
            try {
                // Only check if we are in Edge mode (logic moved from component)
                // We might need access to userStore here, but for now we'll return data and let component decide
                // or we can just fetch and let component handle logic.
                // Better: keep it simple fetch here.
                const response = await fetch('/api/releases/latest')
                const data = await response.json()
                return data
            } catch (error) {
                // Silent fail for updates
                return null
            }
        }
    },
    getters: {
        /**
         * Generate invite link for a studio session
         * @param sessionId - The studio session ID
         * @returns Full invite URL
         */
        getInviteLink: (state) => (sessionId: string) => {
            return `${state.domain}/studio/join/${sessionId}`
        },

        /**
         * Generate co-host link for a studio session
         * @param sessionId - The studio session ID
         * @param token - Optional co-host token
         * @returns Full co-host URL
         */
        getCoHostLink: (state) => (sessionId: string, token?: string) => {
            const baseUrl = `${state.domain}/studio/cohost/${sessionId}`
            return token ? `${baseUrl}?token=${token}` : baseUrl
        },

        /**
         * Generate add camera link for a studio session
         * @param sessionId - The studio session ID
         * @returns Full add camera URL
         */
        getAddCameraLink: (state) => (sessionId: string) => {
            return `${state.domain}/studio/camera/${sessionId}`
        },

        /**
         * Generate OAuth callback URL for authentication providers
         * @param provider - OAuth provider name (e.g., 'google', 'facebook')
         * @returns Full OAuth callback URL
         */
        getOAuthCallbackUrl: (state) => (provider: string) => {
            return `${state.domain}/auth/callback/${provider}`
        },

        /**
         * Get the full logo URL
         * @returns Full logo URL or empty string if not set
         */
        getLogoUrl: (state) => {
            if (!state.logo) return ''
            // If logo is already a full URL, return as-is
            if (state.logo.startsWith('http://') || state.logo.startsWith('https://')) {
                return state.logo
            }
            // Otherwise, prepend domain if it's a relative path starting with /
            if (state.logo.startsWith('/')) {
                return `${state.domain}${state.logo}`
            }
            // Return as-is if it's just a filename (might be handled by api.ts getFileUrl)
            return state.logo
        },

        /**
         * Get the full favicon URL
         * @returns Full favicon URL or empty string if not set
         */
        getFaviconUrl: (state) => {
            if (!state.favicon) return ''
            // If favicon is already a full URL, return as-is
            if (state.favicon.startsWith('http://') || state.favicon.startsWith('https://')) {
                return state.favicon
            }
            // Otherwise, prepend domain
            if (state.favicon.startsWith('/')) {
                return `${state.domain}${state.favicon}`
            }
            return state.favicon
        }
    }
})
