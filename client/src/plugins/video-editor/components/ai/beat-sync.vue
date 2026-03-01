<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { MusicOne, Magic } from '@icon-park/vue-next';
import { clientAiService } from 'video-editor/services/ClientAiService';

const editor = useEditorStore();

const isAnalyzingBeats = ref(false);
const progress = ref(0);
const selectedAudioId = ref('');
const detectedBeats = ref<number[]>([]);

const activeTimelineMedia = computed(() => {
  const _ = editor.tick;
  const userMediaStore = useUserMediaStore();
  const mediaMap = new Map<string, any>();

  editor.pages.forEach((page: any) => {
    if (page.elements) {
      page.elements.forEach((el: any) => {
        if (el.type === 'audio' || el.type === 'audio-visual') {
          const url = el.originalSrc || el.src || el.url;
          if (!url || url.startsWith('blob:')) return;
          
          if (!mediaMap.has(url)) {
            const match = userMediaStore.audios.items.find(m => m.url === url || m.key === url || url.endsWith(m.key));
            mediaMap.set(url, { 
              url, 
              fileName: match?.fileName || (url.split('/').pop()?.split('?')[0] || 'Untitled'), 
              type: 'audio'
            });
          }
        }
      });
    }
    if (page.audio && page.audio.elements) {
      page.audio.elements.forEach((audio: any) => {
        if (!audio.url || audio.url.startsWith('blob:')) return;
        if (!mediaMap.has(audio.url)) {
           mediaMap.set(audio.url, { url: audio.url, fileName: audio.name, type: 'audio' });
        }
      });
    }
  });

  return Array.from(mediaMap.values());
});

const onDetectBeats = async () => {
    if (!selectedAudioId.value) {
        toast.error("Please select an audio track for analysis");
        return;
    }

    isAnalyzingBeats.value = true;
    progress.value = 0;
    try {
        const beats = await clientAiService.runTool('beat-sync', { videoUrl: selectedAudioId.value }, (p) => progress.value = p);
        if (beats) {
            detectedBeats.value = beats;
            toast.success(`Detected ${beats.length} rhythmic peaks!`);
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Analysis failed: ${err.message}`);
    } finally {
        isAnalyzingBeats.value = false;
        progress.value = 0;
    }
};

const applyBeatsToTimeline = () => {
    if (detectedBeats.value.length === 0) return;

    const pages = editor.pages;
    if (pages.length === 0) {
        toast.error("Add some scenes to your timeline first!");
        return;
    }

    detectedBeats.value.forEach((beat, index) => {
        if (index < pages.length) {
            const nextBeat = detectedBeats.value[index + 1] || beat + 2;
            const duration = (nextBeat - beat) * 1000;
            pages[index].timeline.duration = Math.max(500, duration);
        }
    });

    toast.success("Timeline synchronized to beat!");
    editor.setActiveSidebarLeft('scene');
};
</script>

<template>
    <div class="flex flex-col gap-6 p-4">
        <div class="p-4 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[11px] leading-relaxed shadow-lg">
            <div class="flex items-center gap-2 mb-2">
                <MusicOne :size="14" />
                <span class="font-bold uppercase tracking-widest">Rhythmic Sync</span>
            </div>
            <p class="text-white/60">AI will analyze your background music to find the perfect beat for every cut. Add scenes to your timeline first, then sync them here.</p>
        </div>

        <div class="flex flex-col gap-3 px-1">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Select Background Music</label>
            <el-select v-model="selectedAudioId" class="cinematic-select" placeholder="Choose audio from timeline">
                <el-option v-for="a in activeTimelineMedia" :key="a.url" :label="a.fileName" :value="a.url" />
            </el-select>
        </div>

        <div v-if="isAnalyzingBeats" class="flex flex-col gap-2 px-1">
            <div class="flex justify-between items-center px-1">
                <span class="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Tracking Tempo...</span>
                <span class="text-[9px] font-black text-emerald-400">{{ Math.round(progress) }}%</span>
            </div>
            <div class="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                <div class="h-full bg-emerald-400 transition-all duration-300" :style="{ width: `${progress}%` }"></div>
            </div>
        </div>

        <el-button v-if="detectedBeats.length === 0"
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-2 shadow-lg shadow-emerald-500/10" 
            :loading="isAnalyzingBeats"
            @click="onDetectBeats"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Analyze Rhythm</span>
        </el-button>

        <template v-else>
            <div class="flex flex-col gap-2">
                <div class="p-6 rounded-xl bg-white/5 border border-white/10 flex flex-col items-center justify-center gap-2 mb-4">
                    <span class="text-3xl font-black text-white tracking-widest">{{ detectedBeats.length }}</span>
                    <span class="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">Beats Identified</span>
                </div>

                <el-button class="cinematic-button is-primary !h-12 !rounded-2xl !border-none shadow-lg shadow-brand-primary/20" @click="applyBeatsToTimeline">
                    <span class="text-xs font-black uppercase tracking-widest">Sync Timeline to Beat</span>
                </el-button>

                <button
                    class="text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/60 transition-colors mt-2"
                    @click="detectedBeats = []">
                    Reset Analysis
                </button>
            </div>
        </template>
    </div>
</template>
