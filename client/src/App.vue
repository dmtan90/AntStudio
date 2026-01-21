<template>
  <div id="app">
    <component :is="layout">
      <router-view />
    </component>
    <Toaster position="top-right" theme="dark" richColors />
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useRoute } from 'vue-router'
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

const route = useRoute()

// Async components for layouts
const layouts = {
  app: defineAsyncComponent(() => import('@/layouts/app.vue')),
  admin: defineAsyncComponent(() => import('@/layouts/admin.vue')),
  none: defineAsyncComponent(() => import('@/layouts/none.vue')),
  default: defineAsyncComponent(() => import('@/layouts/default.vue'))
}

const layout = computed(() => {
  // Force none layout for login and register
  if (route.path === '/login' || route.path === '/register') return layouts.none
  
  const layoutName = (route.meta.layout as string) || 'default'
  return layouts[layoutName as keyof typeof layouts] || layouts.default
})

// Initialize user
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

onMounted(() => {
  userStore.fetchProfile()
})
</script>

<style>
#app {
  width: 100%;
}
</style>
