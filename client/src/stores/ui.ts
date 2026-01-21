import { defineStore } from 'pinia'

export const useUIStore = defineStore('ui', {
    state: () => ({
        sidebarCollapsed: false,
        appName: 'AntFlow',
        logo: '',
        favicon: ''
    }),
    actions: {
        toggleSidebar() {
            this.sidebarCollapsed = !this.sidebarCollapsed
        },
        setSidebarCollapsed(value: boolean) {
            this.sidebarCollapsed = value
        },
        setAppConfig(config: { appName?: string; logo?: string; favicon?: string }) {
            if (config.appName) this.appName = config.appName
            if (config.logo) this.logo = config.logo
            if (config.favicon) this.favicon = config.favicon

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
        }
    }
})
