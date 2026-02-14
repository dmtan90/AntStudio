<template>
    <div class="callback-page flex items-center justify-center h-screen bg-[#0a0a0a] font-sans">
        <div class="text-center animate-in fade-in zoom-in duration-300 relative z-10 glass-panel p-12">
            <div v-if="loading">
                <div
                    class="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6">
                </div>
                <h2 class="text-2xl font-black text-white mb-2 tracking-tight">Connecting to {{ platformName }}...</h2>
                <p class="text-gray-400 font-medium">Please wait while we secure your connection.</p>
            </div>
            <div v-else-if="error">
                <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                    <CloseOne theme="filled" size="32" class="text-red-500" />
                </div>
                <h2 class="text-2xl font-black text-white mb-2 tracking-tight">Connection Failed</h2>
                <p class="text-red-400 mb-8 font-medium">{{ error }}</p>
                <button class="primary-btn" @click="$router.push(returnUrl)">Return to Platforms</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlatformStore } from '@/stores/platform';
import { useAdminStore } from '@/stores/admin';
import { toast } from 'vue-sonner';
import { CloseOne } from '@icon-park/vue-next';

const route = useRoute();
const router = useRouter();
const platformStore = usePlatformStore();
const adminStore = useAdminStore();

const loading = ref(true);
const error = ref('');

const platform = computed(() => route.params.platform as string);
const type = computed(() => route.query.type as string || 'platform');
const returnUrl = ref('/platforms');

const platformName = computed(() => {
    const p = platform.value;
    if (p === 'payment') return 'Payment Gateway';
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Service';
});

onMounted(async () => {
    const code = route.query.code as string;
    const state = route.query.state as string;
    const paymentSuccess = route.query.success === 'true' || route.query.payment_intent;

    // 1. Handle Errors from Provider
    if (route.query.error) {
        error.value = route.query.error_description as string || route.query.error as string;
        loading.value = false;
        return;
    }

    try {
        // 2. Route based on Type/Platform
        if (platform.value === 'google' && type.value === 'ai-account') {
            // AI Account Auth (e.g. Google for Antigravity)
            if (!code) throw new Error('Authorization code missing');
            // Reconstruct the redirectUri that was used to get the code
            const redirectUri = `${window.location.origin}${route.path}?type=${type.value}`;
            await adminStore.handleAIAuthCallback('google', code, state, redirectUri);
            toast.success("AI Account successfully linked");
            setTimeout(() => router.push('/admin/ai-accounts'), 1500);
            returnUrl.value = '/admin/ai-accounts';
        } else if (platform.value === 'payment') {
            // Payment Gateway Callback
            if (paymentSuccess) {
                toast.success("Payment processed successfully");
                setTimeout(() => router.push('/billing'), 1500);
                returnUrl.value = '/billing';
            } else {
                error.value = "Payment was cancelled or failed.";
                loading.value = false;
            }
            returnUrl.value = '/billing';
        } else {
            // Standard Social/Streaming Platform
            if (!code) throw new Error('Authorization code missing');
            await platformStore.handleCallback(platform.value, code);
            // Redirection logic
            setTimeout(() => {
                const redirect = route.query.redirect as string || '/platforms';
                router.push(redirect);
            }, 1000);
            returnUrl.value = '/platforms';
        }
    } catch (e: any) {
        console.error('[Callback] Proccessing failed:', e);
        error.value = e.response?.data?.error || e.message || 'Failed to exchange credentials';
        loading.value = false;
    }
});
</script>

<style lang="scss" scoped>
.callback-page {
    background: #0a0a0a;
    background-image: 
        radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.05), transparent 400px);
    font-family: 'Outfit', sans-serif;
}

.glass-panel {
    background: rgba(20, 20, 25, 0.6);
    backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    min-width: 400px;
}

.primary-btn {
    background: #3b82f6;
    color: white;
    font-weight: 800;
    padding: 12px 24px;
    border-radius: 12px;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    font-size: 14px;
    letter-spacing: 0.05em;
    display: inline-block;
    
    &:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
    }
}
</style>
