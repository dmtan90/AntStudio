<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { extractHighlights } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Lightning, Loading, CheckOne, Play, More } from '@icon-park/vue-next';

interface Highlight {
  start: number;
  end: number;
  title: string;
  description: string;
  viralScore: number;
}

const editor = useEditorStore();
const loading = ref(false);
const highlights = ref<Highlight[]>([]);

const onExtractHighlights = async () => {
  loading.value = true;
  try {
    // In a real app, we'd pass the actual project context
    const result = await extractHighlights({ 
      projectId: editor.id || 'temp'
    });
    highlights.value = (result as any).highlights || [];
    toast.success(`Extracted ${highlights.value.length} highlights!`);
  } catch (err: any) {
    console.error(err);
    toast.error("Failed to extract highlights");
  } finally {
    loading.value = false;
  }
};

const seekToHighlight = (time: number) => {
  editor.seekToGlobalTime(time);
};
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 to-transparent border border-amber-500/20 relative overflow-hidden group">
      <div class="absolute -right-4 -top-4 w-24 h-24 bg-amber-500/10 rounded-full blur-3xl group-hover:bg-amber-500/20 transition-colors duration-500"></div>
      <div class="flex items-center gap-3 mb-3">
        <Lightning :size="18" class="text-amber-500" />
        <span class="text-xs font-black text-white uppercase tracking-[0.2em]">Viral Highlights</span>
      </div>
      <p class="text-[11px] text-white/50 leading-relaxed italic pr-4">
        AI will analyze your timeline to find the most engaging segments for TikTok, Shorts, or Reels.
      </p>
    </div>

    <div v-if="highlights.length > 0" class="flex flex-col gap-3">
      <div v-for="(h, idx) in highlights" :key="idx" 
           class="p-4 rounded-xl bg-white/[0.03] border border-white/5 hover:border-brand-primary/30 transition-all group">
        <div class="flex justify-between items-start mb-2">
          <span class="text-[10px] font-bold text-white/90 uppercase tracking-widest">{{ h.title }}</span>
          <span class="text-[9px] font-black text-amber-500">{{ Math.round(h.viralScore * 100) }}% Viral</span>
        </div>
        <p class="text-[10px] text-white/40 mb-3 line-clamp-2 leading-relaxed">
          {{ h.description }}
        </p>
        <div class="flex items-center justify-between">
          <span class="text-[9px] font-mono text-white/20">{{ h.start.toFixed(1) }}s - {{ h.end.toFixed(1) }}s</span>
          <button @click="seekToHighlight(h.start)" class="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:bg-brand-primary hover:text-white transition-all">
            <Play :size="12" />
          </button>
        </div>
      </div>
    </div>

    <div v-else class="flex flex-col gap-4">
      <el-button 
        type="primary" 
        class="cinematic-button is-primary !h-14 !rounded-2xl !border-none w-full shadow-xl shadow-amber-500/20 group overflow-hidden" 
        :loading="loading"
        @click="onExtractHighlights"
      >
        <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
        <template #icon><Lightning :size="16" /></template>
        <span class="text-xs font-black uppercase tracking-[0.2em]">Find Viral Moments</span>
      </el-button>
    </div>
  </div>
</template>
