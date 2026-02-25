<template>
  <el-config-provider size="small">
    <div id="app">
      <component :is="layout">
        <router-view />
      </component>
      <Toaster position="top-right" theme="dark" richColors />
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';
import { useUIStore } from '@/stores/ui';

const route = useRoute()

// Async components for layouts
const layouts = {
  app: defineAsyncComponent(() => import('@/layouts/app.vue')),
  admin: defineAsyncComponent(() => import('@/layouts/admin.vue')),
  none: defineAsyncComponent(() => import('@/layouts/none.vue')),
  default: defineAsyncComponent(() => import('@/layouts/default.vue'))
}

const layout = computed(() => {
  // Force none layout for sensitive/public standalone pages
  if (route.path === '/login'
    || route.path === '/register'
    || route.path === '/live/join'
    || route.path === '/live/studio'
    || route.path === '/remote-camera'
  ) return layouts.none

  const layoutName = (route.meta.layout as string) || 'default'
  return layouts[layoutName as keyof typeof layouts] || layouts.default
})

// Initialize user
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const uiStore = useUIStore()

watchEffect(() => {
  if (uiStore.appName) {
    document.title = `${uiStore.appName} - AI-Powered Video Production`
    
    // Update meta tags
    const metaTitle = document.querySelector('meta[name="title"]')
    if (metaTitle) metaTitle.setAttribute('content', `${uiStore.appName} - AI-Powered Video Production`)
    
    const ogTitle = document.querySelector('meta[property="og:title"]')
    if (ogTitle) ogTitle.setAttribute('content', `${uiStore.appName} - AI-Powered Video Production`)
    
    const twitterTitle = document.querySelector('meta[name="twitter:title"]')
    if (twitterTitle) twitterTitle.setAttribute('content', `${uiStore.appName} - AI-Powered Video Production`)
  }
  
  const faviconUrl = uiStore.getFaviconUrl
  if (faviconUrl) {
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) favicon.setAttribute('href', faviconUrl)
  }
})

onMounted(() => {
  userStore.fetchProfile()
  uiStore.fetchAppConfig()
})
</script>

<style>
#app {
  width: 100%;
}
</style>
