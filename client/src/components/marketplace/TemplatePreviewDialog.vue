<template>
    <div
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
        <div
            class="w-full max-w-6xl h-[85vh] bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-2xl flex overflow-hidden relative">
            <button @click="$emit('close')"
                class="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm">
                <Close class="text-2xl text-white" />
            </button>

            <!-- Left: Preview -->
            <div class="flex-1 bg-black relative flex items-center justify-center bg-[url('/grid.svg')] bg-center p-8">
                <div class="relative w-full h-full flex items-center justify-center">

                    <video v-if="activePreviewUrl" :src="getFileUrl(activePreviewUrl)" autoplay loop controls
                        class="max-w-full max-h-full rounded-lg shadow-2xl"
                        :style="{ aspectRatio: getRatioStyle(selectedPage) }">
                    </video>
                    <el-image v-else :src="getFileUrl(activeThumbnailUrl)"
                        class="max-w-full max-h-full rounded-lg shadow-2xl" fit="contain" />

                    <!-- Loading Overlay -->
                    <div v-if="loading"
                        class="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div class="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Right: Info -->
            <div class="w-[400px] bg-[#111] border-l border-white/5 flex flex-col">
                <div class="p-8 flex-1 overflow-y-auto">
                    <!-- Title & Author -->
                    <h2 class="text-3xl font-black text-white mb-2 leading-tight">{{ template.name }}</h2>
                    <div class="flex items-center gap-3 mb-6">
                        <div
                            class="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white uppercase shadow-lg">
                            {{ template.authorName?.charAt(0) || 'A' }}
                        </div>
                        <p class="text-gray-400 text-sm font-medium">{{ template.authorName || $t('marketplace.previewDialog.defaultAuthor') }}</p>
                    </div>

                    <div class="h-px bg-white/5 w-full mb-6"></div>

                    <!-- Metadata Grid -->
                    <div class="grid grid-cols-2 gap-4 mb-8">
                        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Movie class="text-blue-400 text-xl" />
                            <div>
                                <div class="text-lg font-bold text-white leading-none">{{ stats.clips }}</div>
                                <div class="text-[10px] text-gray-500 uppercase font-bold mt-1">{{ $t('marketplace.previewDialog.clips') }}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Time class="text-purple-400 text-xl" />
                            <div>
                                <div class="text-lg font-bold text-white leading-none">{{ formatDuration(stats.duration)
                                    }}</div>
                                <div class="text-[10px] text-gray-500 uppercase font-bold mt-1">{{ $t('marketplace.previewDialog.duration') }}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Text class="text-green-400 text-xl" />
                            <div>
                                <div class="text-lg font-bold text-white leading-none">{{ stats.texts }} {{ $t('marketplace.previewDialog.texts') }}</div>
                                <div class="text-[10px] text-gray-500 uppercase font-bold mt-1">{{ $t('marketplace.previewDialog.editable') }}</div>
                            </div>
                        </div>
                        <div class="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                            <Fire class="text-orange-400 text-xl" />
                            <div>
                                <div class="text-lg font-bold text-white leading-none">{{ template.downloads || 0 }}
                                </div>
                                <div class="text-[10px] text-gray-500 uppercase font-bold mt-1">{{ $t('marketplace.previewDialog.uses') }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Ratio Selector -->
                    <div v-if="pagesWithDifferentRatios.length > 0" class="mb-8">
                        <label class="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-3 block">
                            {{ $t('marketplace.previewDialog.selectRatio') }}
                        </label>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="page in pagesWithDifferentRatios" :key="page.id" @click="selectedPage = page"
                                :class="['px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 border',
                                    selectedPage?.id === page.id ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-white/5 border-white/5 hover:bg-white/10 text-gray-400']">

                                {{ getRatioLabel(page) }}
                            </button>
                        </div>
                    </div>

                    <!-- Description -->
                    <div class="mb-8">
                        <label
                            class="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-2 block">{{ $t('marketplace.previewDialog.description') }}</label>
                        <p class="text-gray-400 leading-relaxed text-sm">
                            {{
                                template.description || $t('marketplace.previewDialog.defaultDesc')
                            }}
                        </p>
                    </div>

                    <!-- Tags -->
                    <div v-if="template.tags?.length" class="flex flex-wrap gap-2">
                        <span v-for="tag in template.tags" :key="tag"
                            class="px-2.5 py-1 bg-white/5 rounded-lg text-[10px] text-gray-500 font-bold border border-white/5 uppercase tracking-wide">
                            #{{ tag }}
                        </span>
                    </div>
                </div>

                <!-- Sticky Bottom Action -->
                <div class="p-8 border-t border-white/5 bg-[#0a0a0c]">
                    <button @click="handleUse"
                        class="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black rounded-2xl transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 text-lg group">
                        <span>{{ $t('marketplace.previewDialog.useTemplate') }}</span>
                        <span v-if="selectedPage" class="px-2 py-0.5 bg-black/20 rounded text-sm font-medium">
                            ({{ getRatioLabel(selectedPage) }})
                        </span>
                        <ArrowRight />
                    </button>
                    <p class="text-center text-[10px] text-gray-600 mt-4 uppercase tracking-widest font-bold">
                        {{ $t('marketplace.previewDialog.customizable') }}
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Close, Movie, Time, Text, Fire, ArrowRight } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';

const { t } = useI18n()

const props = defineProps<{
    template: any
    show: boolean
}>()

const emit = defineEmits(['close', 'use'])

const loading = ref(false)
const selectedPage = ref<any>(null)

// Computed stats based on selected page
const stats = computed(() => {
    const page = selectedPage.value || props.template.pages?.[0];
    if (!page) return { clips: 0, texts: 0, duration: 15, audios: 0 };

    let clips = 0;
    let texts = 0;

    // Parse scene to count objects
    try {
        const sceneData = typeof page.data?.scene === 'string' ? JSON.parse(page.data.scene) : page.data?.scene;
        if (sceneData?.objects) {
            sceneData.objects.forEach((obj: any) => {
                if (obj.type === 'image' || obj.type === 'video') clips++;
                if (obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') texts++;
            });
        }
    } catch (e) {
        console.warn('Failed to parse scene stats', e);
    }

    // Audio count
    const audios = page.data?.audios?.length || 0;

    // Duration
    const duration = page.data?.duration ? page.data.duration / 1000 : (props.template.duration || 15);

    return { clips, texts, duration, audios };
})

// Helper to determine aspect ratio label
const getRatioLabel = (page: any) => {
    if (!page?.data) return t('marketplace.previewDialog.defaultRatio');
    const { width, height } = page.data;
    const ratio = width / height;

    // Tolerance for floating point
    if (Math.abs(ratio - 16 / 9) < 0.1) return '16:9';
    if (Math.abs(ratio - 9 / 16) < 0.1) return '9:16';
    if (Math.abs(ratio - 1) < 0.1) return '1:1';
    if (Math.abs(ratio - 4 / 3) < 0.1) return '4:3';
    if (Math.abs(ratio - 3 / 4) < 0.1) return '3:4';

    return `${width}x${height}`;
}

const getRatioStyle = (page: any) => {
    if (!page?.data) return '16/9';
    return `${page.data.width}/${page.data.height}`;
}

const pagesWithDifferentRatios = computed(() => {
    if (!props.template?.pages) return [];
    console.log(props.template.pages);
    return props.template.pages;
})

const activePreviewUrl = computed(() => {
    if (selectedPage.value?.preview) return selectedPage.value.preview;
    return props.template.preview || props.template.videoPreview || '';
})

const activeThumbnailUrl = computed(() => {
    return selectedPage.value?.thumbnail || props.template.thumbnail || '';
})

const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:15';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}

const handleUse = () => {
    emit('use', { ...props.template, selectedPageId: selectedPage.value?.id });
}

// Init
onMounted(() => {
    if (props.template?.pages?.length > 0) {
        selectedPage.value = props.template.pages[0];
    }
})

watch(() => props.template, (newVal) => {
    if (newVal?.pages?.length > 0) {
        selectedPage.value = newVal.pages[0];
    }
}, { immediate: true })

</script>
