<template>
    <div class="w-full h-full relative group overflow-hidden">
        <div v-if="modelUrl" class="w-full h-full">
            <keep-alive :max="3">
                <component
                    :is="activeComponent"
                    v-if="activeComponent"
                    :key="activeComponentKey"
                    ref="viewerRef"
                    :modelUrl="modelUrl"
                    v-bind="$attrs"
                    @update:config="$emit('update:config', $event)"
                />
            </keep-alive>
        </div>
        
        <!-- Empty State -->
        <div v-else class="w-full h-full flex flex-col items-center justify-center text-white/30 bg-[#050505]">
            <box theme="outline" size="48" class="mb-2 opacity-50" />
            <span class="text-xs font-mono uppercase tracking-widest">{{ $t('vtubers.viewer.noModel') }}</span>
        </div>

        <!-- Unified Controls Overlay -->
        <div v-if="modelUrl" class="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button 
                @click="resetView" 
                class="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-md transition-colors border border-white/10 shadow-lg flex items-center gap-2"
                :title="$t('vtubers.viewer.resetViewTooltip')"
            >
                <full-screen theme="outline" size="16" />
                <span class="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">{{ $t('vtubers.viewer.reset') }}</span>
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Box, FullScreen } from '@icon-park/vue-next';
import VRMViewer from './VRMViewer.vue';
import Live2DViewer from './Live2DViewer.vue';
import StaticPhotoViewer from './StaticPhotoViewer.vue';
import VideoViewer from './VideoViewer.vue';

const { t } = useI18n();

defineOptions({
    inheritAttrs: false
});

const props = defineProps<{
    modelType: 'vrm' | 'live2d' | 'static' | 'video';
    modelUrl?: string;
    // Explicitly listing config to ensure type safety if needed, 
    // but relying on $attrs for mostly transparent pass-through is cleaner for maintainability.
}>();

const emit = defineEmits<{
    'update:config': [config: any];
}>();

const viewerRef = ref<any>(null);

const activeComponent = computed(() => {
    switch (props.modelType) {
        case 'vrm': return VRMViewer;
        case 'live2d': return Live2DViewer;
        case 'static': return StaticPhotoViewer;
        case 'video': return VideoViewer;
        default: return null;
    }
});

const activeComponentKey = computed(() => props.modelType);

const resetView = () => {
    if (viewerRef.value?.resetView) {
        viewerRef.value.resetView();
    } else {
        console.warn('[VTuberViewer] resetView not implemented on active viewer');
    }
};

const captureSnapshot = async () => {
    if (viewerRef.value?.captureSnapshot) {
        return await viewerRef.value.captureSnapshot();
    }
    return null;
};

const captureVideo = async (durationMs: number, audioTrack?: MediaStreamTrack) => {
    if (viewerRef.value?.captureVideo) {
        return await viewerRef.value.captureVideo(durationMs, audioTrack);
    }
    console.warn('[VTuberViewer] captureVideo not implemented on active viewer');
    return null;
};

defineExpose({
    resetView,
    captureSnapshot,
    captureVideo
});
</script>
