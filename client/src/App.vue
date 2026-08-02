<template>
  <el-config-provider size="small">
    <div id="app" :class="{ 'agent-open': showAgent && isOpen }">
      <component :is="layout">
        <router-view />
      </component>
      <Toaster position="top-right" theme="dark" richColors />
      <!-- AI Agent floating button + sidebar (hidden on fullscreen studio/live pages) -->
      <template v-if="showAgent">
        <AgentFloatingBtn />
        <AgentSidebar />
      </template>
    </div>
  </el-config-provider>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, watchEffect, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Toaster } from 'vue-sonner';
import 'vue-sonner/style.css';
import { useUIStore } from '@/stores/ui';
import { useI18n } from 'vue-i18n';
import AgentFloatingBtn from '@/components/agent/AgentFloatingBtn.vue';
import AgentSidebar from '@/components/agent/AgentSidebar.vue';
import { useAntStudioAgent } from '@/composables/useAntStudioAgent';

const { isOpen } = useAntStudioAgent();

const route = useRoute()
const { locale } = useI18n()

// Persist locale changes
watch(locale, (newLocale) => {
  localStorage.setItem('preferred-language', newLocale);
});

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
    || route.path === '/reset-password'
    || route.path === '/live/join'
    || route.path === '/live/studio'
    || route.path === '/remote-camera'
  ) return layouts.none

  const layoutName = (route.meta.layout as string) || 'default'
  return layouts[layoutName as keyof typeof layouts] || layouts.default
})

// Hide agent on fullscreen pages
const showAgent = computed(() => {
  const hidden = ['/login', '/register', '/reset-password', '/live/join', '/live/studio', '/remote-camera', '/', '/home']
  return !hidden.some(p => route.path === p || route.path.startsWith(p))
})

// Initialize user
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const uiStore = useUIStore()
const { t } = useI18n()

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
  
  // Pre-initialize AI engines to shift CPU load to startup instead of active usage
  import('@/utils/ai/LiveAIEngine').then(({ liveAIEngine }) => {
    liveAIEngine.initialize();
  });

  // console.log("handleOAuttCallback");

  // Handle OAuth Success callback in main window
  const handleOAuthCallback = (targetUrl?: string, status: boolean = true, message?: string) => {
    console.log(`[App] OAuth ${status ? 'Success' : 'Failed'} received:`, targetUrl, message);

    // Close active popup window from main window (always permitted by browser)
    const popup = (window as any).activeOAuthPopup;
    if (popup && !popup.closed) {
      try {
        popup.close();
        (window as any).activeOAuthPopup = null;
      } catch (e) { }
    }

    if(!status){
      toast.error(message || t('admin.aiAccounts.toast.oauthFailed'));
    }

    if (targetUrl && status) {
      if (window.location.pathname === targetUrl || targetUrl.includes('/platforms')) {
        window.location.reload();
      } else {
        window.location.href = targetUrl;
      }
    }
  };

  // 1. BroadcastChannel listener
  if (typeof BroadcastChannel !== 'undefined') {
    const oauthChannel = new BroadcastChannel('oauth_channel');
    oauthChannel.onmessage = (event) => {
      if (event.data?.type === 'OAUTH_SUCCESS' || event.data?.type === 'OAUTH_ERROR') {
        handleOAuthCallback(event.data.payload?.url, event.data?.type === 'OAUTH_SUCCESS', event.data.payload?.message);
      }
    };
  }
  else {
    // 2. Storage event listener (fallback)
    window.addEventListener('storage', (event) => {
      if (event.key === 'oauth_result' && event.newValue) {
        try {
          const data = JSON.parse(event.newValue);
          if (data.type === 'OAUTH_SUCCESS' || data.type === 'OAUTH_ERROR') {
            handleOAuthCallback(data.url, data.type === 'OAUTH_SUCCESS', data.message);
          }
        } catch (e) { }
      }
    });
  };
})
</script>

<style>
#app {
  width: 100%;
  box-sizing: border-box;
  transition: padding-right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

#app.agent-open {
  padding-right: 400px;
}

#app.agent-open :deep(.el-modal-dialog) {
  margin-right: 400px !important;
}

@media (max-width: 480px) {
  #app.agent-open {
    padding-right: 0;
  }
}
</style>
