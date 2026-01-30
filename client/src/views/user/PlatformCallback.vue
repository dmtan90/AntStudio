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
import axios from 'axios';
import { toast } from 'vue-sonner';
import { CloseOne } from '@icon-park/vue-next';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const error = ref('');

const platform = computed(() => route.params.platform as string);
const platformName = computed(() => {
    const p = platform.value;
    return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Platform';
});

onMounted(async () => {
    const code = route.query.code as string;

    if (!code) {
        error.value = 'Authorization code missing';
        loading.value = false;
        return;
    }

    try {
        await axios.post(`/api/platforms/callback/${platform.value}`, { code });
        toast.success(`Successfully connected to ${platformName.value}`);
        // Redirect back to settings after short delay
        setTimeout(() => {
            router.push('/platforms');
        }, 1000);
    } catch (e: any) {
        console.error(e);
        error.value = e.response?.data?.error || 'Failed to exchange token';
        loading.value = false;
    }
});
</script>
