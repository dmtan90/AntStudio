import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user.js'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/views/general/Home.vue'),
        meta: { requiresAuth: false, layout: 'auth' }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/auth/Login.vue'),
        meta: { requiresAuth: false, requiresGuest: true, layout: 'auth' }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/views/auth/Register.vue'),
        meta: { requiresAuth: false, requiresGuest: true, layout: 'auth' }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/user/Dashboard.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/projects',
        name: 'projects',
        component: () => import('@/views/project/List.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/projects/new',
        name: 'projects-new',
        component: () => import('@/views/project/New.vue'),
        meta: { requiresAuth: true, layout: 'app' },
        props: true
    },
    {
        path: '/projects/editor/:id',
        name: 'project-editor',
        component: () => import('@/views/video-editor/views/Editor.vue'),
        meta: { requiresAuth: true, layout: 'none' },
        props: true
    },
    {
        path: '/marketplace',
        name: 'marketplace',
        component: () => import('@/views/marketplace/TemplateBrowser.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/gallery',
        name: 'gallery',
        component: () => import('@/views/user/Gallery.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/billing',
        name: 'billing',
        component: () => import('@/views/user/Subscription.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/affiliate',
        name: 'affiliate-portal',
        component: () => import('@/views/user/AffiliateDashboard.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/ai-hub',
        name: 'ai-hub',
        component: () => import('@/views/user/Dashboard.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/neural-archive',
        name: 'neural-archive',
        component: () => import('@/views/user/NeuralArchive.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/developer-hub',
        name: 'developer-hub',
        component: () => import('@/views/user/DeveloperHub.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/settings',
        name: 'settings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/merchant/orders',
        name: 'merchant-orders',
        component: () => import('@/views/user/MerchantOrders.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/organization',
        name: 'organization',
        component: () => import('@/views/user/Organization.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/organization/join',
        name: 'organization-join',
        component: () => import('@/views/user/JoinOrganization.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/live/studio',
        name: 'live-studio',
        component: () => import('@/views/user/LiveStudio.vue'),
        meta: { requiresAuth: true, layout: 'none' }
    },
    {
        path: '/live/join',
        name: 'live-join',
        component: () => import('@/views/user/GuestRoom.vue'),
        meta: { requiresAuth: false, layout: 'none' }
    },
    {
        path: '/remote-cam',
        name: 'remote-cam',
        component: () => import('@/views/user/RemoteCam.vue'),
        meta: { requiresAuth: false, layout: 'none' }
    },
    {
        path: '/join/:token',
        redirect: to => {
            return { path: '/live/join', query: { token: to.params.token } }
        }
    },
    {
        path: '/admin',
        name: 'admin',
        component: () => import('@/views/admin/Overview.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/users',
        name: 'admin-users',
        component: () => import('@/views/admin/Users.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/settings',
        name: 'admin-settings',
        component: () => import('@/views/admin/Settings.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/license',
        name: 'admin-license',
        component: () => import('@/views/admin/Licenses.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/activation',
        name: 'admin-activation',
        component: () => import('@/views/admin/Activation.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/ai-accounts',
        name: 'admin-ai-accounts',
        component: () => import('@/views/admin/AIAccounts.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/admin/monitoring',
        name: 'admin-monitoring',
        component: () => import('@/views/admin/Monitoring.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/ai-analytics',
        name: 'admin-ai-analytics',
        component: () => import('@/views/admin/AnalyticsDashboard.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/network',
        name: 'admin-network',
        component: () => import('@/views/admin/NetworkControl.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/infra-health',
        name: 'admin-infra-health',
        component: () => import('@/views/admin/InfraHealth.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/logs',
        name: 'admin-logs',
        component: () => import('@/views/admin/Logs.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/growth',
        name: 'admin-growth',
        component: () => import('@/views/admin/GrowthDashboard.vue'),
        meta: { requiresAuth: true, layout: 'app', isAdmin: true }
    },
    {
        path: '/admin/tenant',
        name: 'admin-tenant',
        component: () => import('@/views/admin/TenantAdmin.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    },
    {
        path: '/license',
        name: 'license',
        component: () => import('@/views/user/License.vue'),
        meta: { requiresAuth: true, requiresSysAdmin: true, layout: 'app' }
    },
    {
        path: '/recorder',
        name: 'recorder',
        component: () => import('@/views/project/Recorder.vue'),
        meta: { requiresAuth: true, layout: 'none' }
    },
    {
        path: '/platforms/callback/:platform',
        name: 'platform-callback',
        component: () => import('@/views/user/PlatformCallback.vue'),
        meta: { requiresAuth: true, layout: 'none' }
    },
    {
        path: '/platforms',
        name: 'platforms',
        component: () => import('@/views/user/Platforms.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/platforms/cms',
        name: 'platforms-cms',
        component: () => import('@/views/user/PlatformCMS.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/recordings',
        name: 'recordings',
        component: () => import('@/views/user/Recordings.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/resources',
        name: 'resources',
        component: () => import('@/views/user/Resources.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/license-portal',
        name: 'license-portal',
        component: () => import('@/views/user/LicensePortal.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/admin/fleet',
        name: 'admin-fleet',
        component: () => import('@/views/admin/FleetManager.vue'),
        meta: { requiresAuth: true, requiresAdmin: true, layout: 'app' }
    }
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
    scrollBehavior(to) {
        if (to.hash) {
            return {
                el: to.hash,
                behavior: 'smooth',
            }
        }
        return { top: 0 }
    }
})

// Navigation guards
router.beforeEach(async (to, from, next) => {
    const userStore = useUserStore()
    if (!userStore.isInitialized) {
        await userStore.fetchProfile()
    }
    const isAuthenticated = userStore.isAuthenticated
    const isAdmin = userStore.user?.role === 'admin'
    const isSysAdmin = userStore.user?.role === 'sys-admin'

    if (to.meta.requiresAuth && !isAuthenticated) {
        // console.log("token", to.query.token, "path", to.path);
        // Feature: Allow Guest Access to Studio with token
        if (to.path === '/live/studio' && to.query.token) {
            next()
            return
        }
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
    }
    if (to.meta.requiresGuest && isAuthenticated) {
        next({ name: 'dashboard' })
        return
    }
    if (to.meta.requiresAdmin && (!isAdmin && !isSysAdmin)) {
        next({ name: 'dashboard' })
        return
    }
    if (to.meta.requiresSysAdmin && !isSysAdmin) {
        next({ name: 'dashboard' })
        return
    }
    next()
})

export default router
