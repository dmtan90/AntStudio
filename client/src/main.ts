import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'element-plus/dist/index.css'
import { Toaster } from 'vue-sonner'
import VueFlags from '@singleway/vueflags'

import App from './App.vue'
import router from './router'
import api from './utils/api.js'
import { ErrorTracker, setupAxiosTracking } from './utils/ErrorTracker'

// Import global styles
import './assets/scss/main.scss'
import './assets/css/tailwind.css'

// vidmate dependencies
import { VueQueryPlugin } from '@tanstack/vue-query'
import { DraggablePlugin } from '@braks/revue-draggable'
import 'vue-color/style.css'
import 'vue-sonner/style.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'video-editor/styles/global.css'
import 'video-editor/styles/element-plus.css'
import { queryClient } from 'video-editor/config/queryClient'
// Heavy editor runtime (fabric, ffmpeg.wasm, PIXI) is loaded by the routes that need it:
// fabric classes via video-editor/store/editor, ffmpeg in the Editor constructor,
// window.PIXI via utils/pixiGlobal (Live2D).

const app = createApp(App)

// Pinia store
app.use(createPinia())

// Vue Router
app.use(router)

// Element Plus components and directives (v-loading) are imported on demand by
// unplugin-vue-components' ElementPlusResolver; icons are imported where used.

import i18n, { i18nReady } from './i18n'
app.use(i18n)

// Vue Flags
app.use(VueFlags, { iconPath: '/flags/' })

// Toast component
app.component('Toaster', Toaster)

// vidmate plugins
app.use(VueQueryPlugin, { queryClient })
app.use(DraggablePlugin)

// Monitoring
ErrorTracker.init()
setupAxiosTracking(api)

// Register Service Worker for PWA Autonomy
// useRegisterSW({
//     onRegistered(r) {
//         console.log('[PWA] Service Worker registered:', r);
//     },
//     onRegisterError(e) {
//         console.error('[PWA] Service Worker registration failed:', e);
//     }
// });

// Mount once the saved locale's messages are loaded (avoids an English flash)
i18nReady.finally(() => app.mount('#app'))
