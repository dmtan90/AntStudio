<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { Magic, CheckOne } from '@icon-park/vue-next';
import { clientAiService } from 'video-editor/services/ClientAiService';

const editor = useEditorStore();

const isAnalyzing = ref(false);
const progress = ref(0);
const selectedVideoId = ref('');
const detectedScenes = ref<any[]>([]);

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
              type: 'video'
            });
          }
        }
      });
    }
  });

  return Array.from(mediaMap.values());
});

const onDetectScenes = async () => {
    if (!selectedVideoId.value) {
        toast.error("Please select a video for analysis");
        return;
    }

    isAnalyzing.value = true;
    progress.value = 0;
    try {
        const scenes = await clientAiService.runTool<any[]>('scene-detection', { 
            videoUrl: selectedVideoId.value,
            ffmpeg: editor.ffmpeg
        }, (p) => progress.value = p);
        
        detectedScenes.value = scenes;
        toast.success(`Detected ${scenes.length} shots!`);
    } catch (err: any) {
        console.error(err);
        toast.error(`Analysis failed: ${err.message || 'Unknown error'}`);
    } finally {
        isAnalyzing.value = false;
        progress.value = 0;
    }
};

const applyScenesToTimeline = () => {
    if (detectedScenes.value.length === 0) return;

    const userMediaStore = useUserMediaStore();
    const video = [...userMediaStore.videos.items, ...activeTimelineMedia.value].find(v => v._id === selectedVideoId.value || v.url === selectedVideoId.value || v.key === selectedVideoId.value);
    if (!video) return;

    detectedScenes.value.forEach((scene, index) => {
        editor.addPage();
        const lastPage = editor.pages[editor.pages.length - 1];
        lastPage.timeline.duration = (scene.end - scene.start) * 1000;

        if (typeof lastPage.onAddVideoFromSource === 'function') {
            lastPage.onAddVideoFromSource(video.key, {
                trimStart: scene.start * 1000,
                meta: {
                    name: scene.label || `Shot ${index + 1}`,
                    description: scene.description
                }
            });
        }
    });

    toast.success(`Successfully added ${detectedScenes.value.length} scenes to timeline.`);
    editor.setActiveSidebarLeft('scene');
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-[11px] leading-relaxed shadow-lg">
            <div class="flex items-center gap-2 mb-2">
                <Magic :size="14" />
                <span class="font-bold uppercase tracking-widest">Auto-Split</span>
            </div>
            <p class="text-white/60">AI will analyze your video to find logical shot changes and automatically split them into editable segments.</p>
        </div>

        <div class="flex flex-col gap-3 px-1">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Select Source Video</label>
            <el-select v-model="selectedVideoId" class="cinematic-select" placeholder="Choose a video from timeline">
                <el-option v-for="v in activeTimelineMedia" :key="v.url" :label="v.fileName" :value="v.url" />
            </el-select>
        </div>

        <div v-if="isAnalyzing" class="flex flex-col gap-2 px-1">
            <div class="flex justify-between items-center px-1">
                <span class="text-[9px] font-black text-brand-primary uppercase tracking-widest">Analyzing Scenes...</span>
                <span class="text-[9px] font-black text-brand-primary">{{ Math.round(progress) }}%</span>
            </div>
            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-brand-primary transition-all duration-300" :style="{ width: `${progress}%` }"></div>
            </div>
        </div>

        <el-button v-if="detectedScenes.length === 0"
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-2 shadow-lg shadow-brand-primary/20" 
            :loading="isAnalyzing"
            @click="onDetectScenes"
        >
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Identify Shots</span>
        </el-button>

        <template v-else>
            <div class="flex flex-col gap-2">
                <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Detected Shots ({{ detectedScenes.length }})</label>
                <div class="max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-2 p-1">
                    <div v-for="(scene, idx) in detectedScenes" :key="idx"
                        class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                        <div class="flex flex-col gap-1">
                            <span class="text-[11px] font-bold text-white/80 group-hover:text-brand-primary transition-colors">{{ scene.label || `Shot ${idx + 1}` }}</span>
                            <span class="text-[9px] font-mono text-white/40">{{ scene.start.toFixed(2) }}s - {{ scene.end.toFixed(2) }}s</span>
                        </div>
                        <CheckOne theme="filled" size="16" class="text-emerald-400" />
                    </div>
                </div>

                <el-button class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-6 shadow-lg shadow-brand-primary/20"
                    @click="applyScenesToTimeline">
                    <span class="text-xs font-black uppercase tracking-widest">Apply to Timeline</span>
                </el-button>

                <button
                    class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
                    @click="detectedScenes = []">
                    Reset Analysis
                </button>
            </div>
        </template>
    </div>
</template>

<style scoped lang="postcss">
.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-white/10 rounded-full;
}
</style>
