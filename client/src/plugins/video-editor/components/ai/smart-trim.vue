<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { Magic, Transform, CheckOne } from '@icon-park/vue-next';
import { clientAiService } from 'video-editor/services/ClientAiService';

const editor = useEditorStore();

const loading = ref(false);
const progress = ref(0);
const selectedTrimVideoId = ref('');
const detectedRegions = ref<{ start: number, end: number, isSilent: boolean }[]>([]);
const noiseThreshold = ref(-35); // dB
const minSilenceLen = ref(0.5);

const activeTimelineMedia = computed(() => {
  const _ = editor.tick;
  const userMediaStore = useUserMediaStore();
  const mediaMap = new Map<string, any>();

  editor.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((el: any) => {
        if (el.type === 'video') {
          const url = el.originalSrc || el.src || el.url;
          if (!url || url.startsWith('blob:')) return;
          
          if (!mediaMap.has(url)) {
            const match = userMediaStore.videos.items.find(m => m.url === url || m.key === url || url.endsWith(m.key));
            mediaMap.set(url, { 
              url, 
              fileName: match?.fileName || (url.split('/').pop()?.split('?')[0] || 'Untitled'), 
              type: 'video',
              key: match?.key || url
            });
          }
        }
      });
    }
  });

  return Array.from(mediaMap.values());
});

const onSmartTrim = async () => {
    if (!selectedTrimVideoId.value) {
        toast.error("Please select a video for trimming");
        return;
    }

    loading.value = true;
    progress.value = 0;
    try {
        // Convert dB to linear RMS threshold
        const threshold = Math.pow(10, noiseThreshold.value / 20);
        
        const regions = await clientAiService.runTool('silence-detection', { 
            videoUrl: selectedTrimVideoId.value,
            threshold,
            minSilenceDuration: minSilenceLen.value
        }, (p) => progress.value = p);

        if (regions && regions.length > 0) {
            detectedRegions.value = regions;
            const nonSilentCount = regions.filter(r => !r.isSilent).length;
            toast.success(`Identified ${nonSilentCount} active segments!`);
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Trimming failed: ${err.message}`);
    } finally {
        loading.value = false;
        progress.value = 0;
    }
};

const applyTrimToTimeline = () => {
    if (detectedRegions.value.length === 0) return;

    const userMediaStore = useUserMediaStore();
    const video = [...userMediaStore.videos.items, ...activeTimelineMedia.value].find(v => v._id === selectedTrimVideoId.value || v.url === selectedTrimVideoId.value || v.key === selectedTrimVideoId.value);
    if (!video) return;

    detectedRegions.value.forEach((region, index) => {
        editor.addPage();
        const lastPage = editor.pages[editor.pages.length - 1];
        lastPage.timeline.duration = (region.end - region.start) * 1000;

        if (typeof lastPage.onAddVideoFromSource === 'function') {
            lastPage.onAddVideoFromSource(video.key, {
                trimStart: region.start * 1000,
                meta: {
                    name: `Segment ${index + 1} (Non-silent)`
                }
            });
        }
    });

    toast.success(`Successfully added ${detectedRegions.value.length} non-silent segments to timeline.`);
    editor.setActiveSidebarLeft('scene');
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] leading-relaxed shadow-lg">
            <div class="flex items-center gap-2 mb-2">
                <Magic :size="14" />
                <span class="font-bold uppercase tracking-widest">Smart Trim</span>
            </div>
            <p class="text-white/60">AI will automatically identify and extract segments where activity or speech is present, removing dead silence from your project.</p>
        </div>

        <div class="flex flex-col gap-4 px-1">
            <div class="flex flex-col gap-2">
                <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Select Source Video</label>
                <el-select v-model="selectedTrimVideoId" class="cinematic-select" placeholder="Choose a video from timeline">
                    <el-option v-for="v in activeTimelineMedia" :key="v.url" :label="v.fileName" :value="v.url" />
                </el-select>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Threshold (dB)</label>
                    <el-input-number v-model="noiseThreshold" :min="-60" :max="-10" :step="5" class="cinematic-number-input !w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Min Silence (s)</label>
                    <el-input-number v-model="minSilenceLen" :min="0.1" :max="2.0" :step="0.1" class="cinematic-number-input !w-full" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col gap-2 px-1">
                <div class="flex justify-between items-center px-1">
                    <span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Analyzing Audio...</span>
                    <span class="text-[9px] font-black text-emerald-400">{{ Math.round(progress) }}%</span>
                </div>
                <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-400 transition-all duration-300" :style="{ width: `${progress}%` }"></div>
                </div>
            </div>

            <el-button v-if="detectedRegions.length === 0"
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-emerald-500/10 mt-2" 
                :loading="loading"
                @click="onSmartTrim"
            >
                <template #icon><Magic :size="16" /></template>
                <span class="text-xs font-black uppercase tracking-widest">Analyze Silence</span>
            </el-button>

            <template v-else>
                <div class="flex flex-col gap-2 mt-2">
                    <div class="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
                        <span class="text-3xl font-black text-white tracking-widest">{{ detectedRegions.length }}</span>
                        <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Active Segments</span>
                    </div>

                    <el-button class="cinematic-button is-primary !h-12 !rounded-2xl !border-none shadow-lg shadow-brand-primary/20" @click="applyTrimToTimeline">
                        <span class="text-xs font-black uppercase tracking-widest">Apply to Timeline</span>
                    </el-button>

                    <button
                        class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
                        @click="detectedRegions = []">
                        Reset Analysis
                    </button>
                </div>
            </template>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
:deep(.cinematic-number-input .el-input-number__increase),
:deep(.cinematic-number-input .el-input-number__decrease) {
    @apply bg-white/5 border-white/10 text-white hover:text-brand-primary transition-colors;
}
:deep(.cinematic-number-input .el-input__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs font-mono;
}
</style>
