<template>
    <div v-if="visible"
        class="studio-loading-overlay fixed inset-0 z-[9999] bg-[#0a0a0a] flex items-center justify-center p-6 text-white text-center">
        <div class="content-wrapper max-w-lg w-full">
            <!-- Loading State -->
            <div v-if="!errorMode" class="loading-state animate-in fade-in zoom-in duration-700">
                <div class="logo-animation mb-8 relative">
                    <div class="outer-ring absolute inset-0 rounded-full border-2 border-blue-500/20 animate-ping">
                    </div>
                    <div
                        class="inner-loader w-20 h-20 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin mx-auto">
                    </div>
                    <div class="center-dot absolute inset-0 flex items-center justify-center">
                        <div class="w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_#3b82f6]"></div>
                    </div>
                </div>
                <h2 class="text-2xl font-black uppercase tracking-[0.3em] mb-2">{{ $t('studio.loading.initializing') }}</h2>
                <p class="text-white/40 text-xs uppercase tracking-widest">{{ loadingText }}</p>
            </div>

            <!-- Error State (WebGL Missing) -->
            <div v-else class="error-state animate-in slide-in-from-bottom duration-500">
                <div
                    class="error-icon w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-500/20">
                    <caution theme="outline" size="40" />
                </div>
                <h2 class="text-2xl font-black uppercase tracking-widest mb-4">{{ $t('studio.loading.hardwareAccelerationRequired') }}</h2>
                <p class="text-white/60 text-sm mb-8 leading-relaxed">
                    {{ $t('studio.loading.hardwareAccelerationDesc') }}
                </p>

                <div class="instructions-tabs glass-dark rounded-2xl overflow-hidden border border-white/5 text-left">
                    <div class="tabs-header flex border-b border-white/5 bg-white/5">
                        <button v-for="b in browsers" :key="b.id" @click="activeBrowser = b.id"
                            class="flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all"
                            :class="activeBrowser === b.id ? 'text-blue-400 bg-white/5' : 'opacity-40 hover:opacity-100'">
                            {{ b.name }}
                        </button>
                    </div>
                    <div class="tabs-content p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                        <div v-for="b in browsers" :key="b.id" v-show="activeBrowser === b.id"
                            class="animate-in fade-in duration-300">
                            <h4 class="text-xs font-bold text-blue-400 mb-3 uppercase tracking-tighter">{{
                                b.instructionTitle }}</h4>
                            <ol class="space-y-3">
                                <li v-for="(step, idx) in b.steps" :key="idx"
                                    class="text-[11px] flex gap-3 leading-relaxed">
                                    <span class="text-white/20 font-black">{{ idx + 1 }}</span>
                                    <span>{{ step }}</span>
                                </li>
                            </ol>
                            <div v-if="b.troubleshoot" class="mt-4 pt-4 border-t border-white/5">
                                <p class="text-[9px] font-bold uppercase tracking-widest opacity-30 mb-2">
                                    {{ $t('studio.loading.troubleshooting') }}</p>
                                <p class="text-[10px] text-white/40 italic">{{ b.troubleshoot }}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 flex gap-4">
                    <button @click="checkWebGL"
                        class="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold uppercase text-[10px] tracking-[0.2em] transition-all shadow-lg shadow-blue-500/20">
                        {{ $t('studio.loading.retry') }}
                    </button>
                    <button @click="$emit('exit')"
                        class="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold uppercase text-[10px] tracking-[0.2em] transition-all border border-white/5">
                        {{ $t('studio.loading.exit') }}
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Caution } from '@icon-park/vue-next';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps<{
    visible: boolean;
}>();

const emit = defineEmits(['ready', 'exit']);

const errorMode = ref(false);
const activeBrowser = ref('chrome');
const loadingText = ref(t('studio.loading.status.starting'));

const browsers = computed(() => [
    {
        id: 'chrome',
        name: t('studio.loading.browsers.chrome.name'),
        instructionTitle: t('studio.loading.browsers.chrome.title'),
        steps: [
            t('studio.loading.browsers.chrome.steps[0]'),
            t('studio.loading.browsers.chrome.steps[1]'),
            t('studio.loading.browsers.chrome.steps[2]'),
            t('studio.loading.browsers.chrome.steps[3]'),
            t('studio.loading.browsers.chrome.steps[4]'),
            t('studio.loading.browsers.chrome.steps[5]')
        ],
        troubleshoot: t('studio.loading.browsers.chrome.troubleshoot')
    },
    {
        id: 'firefox',
        name: t('studio.loading.browsers.firefox.name'),
        instructionTitle: t('studio.loading.browsers.firefox.title'),
        steps: [
            t('studio.loading.browsers.firefox.steps[0]'),
            t('studio.loading.browsers.firefox.steps[1]'),
            t('studio.loading.browsers.firefox.steps[2]'),
            t('studio.loading.browsers.firefox.steps[3]'),
            t('studio.loading.browsers.firefox.steps[4]')
        ],
        troubleshoot: t('studio.loading.browsers.firefox.troubleshoot')
    },
    {
        id: 'safari',
        name: t('studio.loading.browsers.safari.name'),
        instructionTitle: t('studio.loading.browsers.safari.title'),
        steps: [
            t('studio.loading.browsers.safari.steps[0]'),
            t('studio.loading.browsers.safari.steps[1]'),
            t('studio.loading.browsers.safari.steps[2]'),
            t('studio.loading.browsers.safari.steps[3]'),
            t('studio.loading.browsers.safari.steps[4]')
        ],
        troubleshoot: t('studio.loading.browsers.safari.troubleshoot')
    }
]);

const checkWebGL = () => {
    errorMode.value = false;
    loadingText.value = t('studio.loading.status.syncing');

    setTimeout(() => {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (!gl) {
                errorMode.value = true;
                return;
            }
            emit('ready');
        } catch (e) {
            errorMode.value = true;
        }
    }, 1500);
};

onMounted(() => {
    // Detect OS for initial tab
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('firefox')) activeBrowser.value = 'firefox';
    else if (ua.includes('safari') && !ua.includes('chrome')) activeBrowser.value = 'safari';

    checkWebGL();
});
</script>

<style scoped lang="scss">
.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
}
</style>
