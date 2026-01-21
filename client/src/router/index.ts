import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'
import StudioEditor from '@/components/projects/editor/StudioEditor.vue'

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/views/general/Home.vue'),
        meta: { layout: 'default' }
    },
    {
        path: '/pricing',
        name: 'pricing',
        component: () => import('@/views/general/Pricing.vue'),
        meta: { layout: 'default' }
    },
    {
        path: '/subscription',
        name: 'subscription',
        component: () => import('@/views/user/Subscription.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/privacy',
        name: 'privacy',
        component: () => import('@/views/general/Privacy.vue'),
        meta: { layout: 'default' }
    },
    {
        path: '/terms',
        name: 'terms',
        component: () => import('@/views/general/Terms.vue'),
        meta: { layout: 'default' }
    },
    {
        path: '/flow-gallery',
        name: 'flow-gallery',
        component: () => import('@/views/general/FlowGallery.vue'),
        meta: { layout: 'default' }
    },
    {
        path: '/payment/success',
        name: 'payment-success',
        component: () => import('@/views/user/PaymentSuccess.vue'),
        meta: { requiresAuth: true, layout: 'default' }
    },
    {
        path: '/projects/new',
        name: 'project-new',
        component: () => import('@/views/project/New.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('@/views/auth/Login.vue'),
        meta: { requiresGuest: true, layout: 'none' }
    },
    {
        path: '/auth/reset-password',
        name: 'reset-password',
        component: () => import('@/views/auth/ResetPassword.vue'),
        meta: { requiresGuest: true, layout: 'none' }
    },
    {
        path: '/register',
        name: 'register',
        component: () => import('@/views/auth/Register.vue'),
        meta: { requiresGuest: true, layout: 'none' }
    },
    {
        path: '/dashboard',
        name: 'dashboard',
        component: () => import('@/views/user/Dashboard.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/studio',
        name: 'studio',
        component: StudioEditor,
        meta: { requiresAuth: true, layout: 'none' },
        props: { project: {} }
    },
    {
        path: '/projects',
        name: 'projects',
        component: () => import('@/views/project/List.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/projects/:id/editor',
        name: 'project-editor',
        component: () => import('@/views/project/Editor.vue'),
        meta: { requiresAuth: true, layout: 'none' }
    },
    {
        path: '/resources',
        name: 'resources',
        component: () => import('@/views/user/Resources.vue'),
        meta: { requiresAuth: true, layout: 'app' }
    },
    {
        path: '/gallery',
        name: 'gallery',
        component: () => import('@/views/user/Gallery.vue'),
        meta: { requiresAuth: true, layout: 'app' }
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
        path: '/license',
        name: 'license',
        component: () => import('@/views/user/License.vue'),
        meta: { requiresAuth: true, requiresSysAdmin: true, layout: 'app' }
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

    // Wait for auth to initialize if it hasn't yet
    if (!userStore.isInitialized) {
        await userStore.fetchProfile()
    }

    const isAuthenticated = userStore.isAuthenticated
    const isAdmin = userStore.user?.role === 'admin'
    const isSysAdmin = userStore.user?.role === 'sys-admin'
    console.log("isAdmin", isAdmin, userStore.user);

    // Check if route requires authentication
    if (to.meta.requiresAuth && !isAuthenticated) {
        next({ name: 'login', query: { redirect: to.fullPath } })
        return
    }

    // Check if route requires guest (not authenticated)
    if (to.meta.requiresGuest && isAuthenticated) {
        next({ name: 'dashboard' })
        return
    }

    // Check if route requires admin
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
