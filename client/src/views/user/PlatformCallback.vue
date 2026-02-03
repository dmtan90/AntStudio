<template>
    <div class="callback-page flex items-center justify-center h-screen bg-[#080808]">
        <div class="text-center animate-in fade-in zoom-in duration-300">
            <div v-if="loading">
                <div
                    class="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-6">
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">Connecting to {{ platformName }}...</h2>
                <p class="text-gray-400">Please wait while we secure your connection.</p>
            </div>
            <div v-else-if="error">
                <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CloseOne theme="filled" size="32" class="text-red-500" />
                </div>
                <h2 class="text-2xl font-bold text-white mb-2">Connection Failed</h2>
                <p class="text-red-400 mb-6">{{ error }}</p>
                <button class="primary-btn" @click="$router.push('/platforms')">Return to Platforms</button>
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
            await adminStore.handleAIAuthCallback('google', code, state);
            toast.success("AI Account successfully linked");
            setTimeout(() => router.push('/admin/ai-accounts'), 1500);

        } else if (platform.value === 'payment') {
            // Payment Gateway Callback
            if (paymentSuccess) {
                toast.success("Payment processed successfully");
                setTimeout(() => router.push('/billing'), 1500);
            } else {
                error.value = "Payment was cancelled or failed.";
                loading.value = false;
            }

        } else {
            // Standard Social/Streaming Platform
            if (!code) throw new Error('Authorization code missing');
            await platformStore.handleCallback(platform.value, code);
            // Redirection logic
            setTimeout(() => {
                const redirect = route.query.redirect as string || '/platforms';
                router.push(redirect);
            }, 1000);
        }
    } catch (e: any) {
        console.error('[Callback] Proccessing failed:', e);
        error.value = e.response?.data?.error || e.message || 'Failed to exchange credentials';
        loading.value = false;
    }
});
</script>
