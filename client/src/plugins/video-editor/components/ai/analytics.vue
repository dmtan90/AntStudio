<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { AutoEditorService } from '../../services/AutoEditorService';
import { Analysis as DataAnalysis, Magic, Youtube, Tips, Like, CheckSmall, SettingConfig, ChartProportion } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const isScoring = ref(false);
const isOptimizing = ref<string | null>(null);

interface Suggestion { type: string; message: string; autoFix?: string; }
interface Scorecard {
  score: number; hookScore: number; pacingScore: number; ctaScore: number;
  suggestions: Suggestion[];
}

const scorecard = ref<Scorecard | null>(null);

const platforms = [
  { id: 'youtube',   label: 'YouTube',   size: '1920×1080', color: 'red' },
  { id: 'tiktok',    label: 'TikTok',    size: '1080×1920', color: 'pink' },
  { id: 'instagram', label: 'Instagram', size: '1080×1080', color: 'purple' },
  { id: 'linkedin',  label: 'LinkedIn',  size: '1920×1080', color: 'blue' },
] as const;

const scoreColor = (v: number) =>
  v >= 80 ? 'text-emerald-400' : v >= 60 ? 'text-yellow-400' : 'text-rose-400';

const scoreBarColor = (v: number) =>
  v >= 80 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 
  v >= 60 ? 'bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.3)]' : 
  'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]';

const handleScore = async () => {
  if (isScoring.value) return;
  isScoring.value = true;
  scorecard.value = null;
  try {
    const res = await AutoEditorService.analyzeProjectEngagement(editor.id);
    scorecard.value = res as Scorecard;
    toast.success('Project analysis complete!');
  } catch (e: any) {
    toast.error('Failed to analyse project: ' + (e.message || 'Unknown error'));
  } finally {
    isScoring.value = false;
  }
};

const handleOptimize = async (platform: typeof platforms[number]['id']) => {
  if (isOptimizing.value) return;
  isOptimizing.value = platform;
  try {
    await AutoEditorService.optimizeExportSettings(editor.id, platform);
    toast.success(`Project optimized for ${platform}!`);
  } catch (e: any) {
    toast.error('Failed to optimise: ' + (e.message || 'Unknown error'));
  } finally {
    isOptimizing.value = null;
  }
};
</script>

<template>
  <div class="flex flex-col gap-8 p-4">
    <!-- Header -->
    <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
        <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
        <div class="flex items-center gap-2 mb-3">
            <ChartProportion :size="14" class="text-brand-primary" />
            <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">AI Performance Analytics</span>
        </div>
        <p class="text-[10px] text-white/40 leading-relaxed italic pr-4">
            Predict audience engagement using data-trained AI models. Score your project before publishing.
        </p>
    </div>

    <!-- Engagement Scorecard -->
    <div class="flex flex-col gap-6 p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-xl relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div class="flex items-center justify-between relative z-10">
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-black text-white/90 uppercase tracking-widest">Global Retention Score</span>
          <span class="text-[8px] text-white/30 tracking-[0.2em] uppercase font-black">Composite Performance Index</span>
        </div>
        <div class="w-8 h-8 rounded-lg bg-brand-primary/10 flex items-center justify-center">
            <DataAnalysis :size="14" class="text-brand-primary" />
        </div>
      </div>

      <!-- Scorecard result -->
      <template v-if="scorecard">
        <div class="flex items-center justify-center py-4 relative z-10">
          <div class="relative w-32 h-32 flex items-center justify-center rounded-full border border-white/5 bg-black/20 shadow-inner"
               :class="scorecard.score >= 80 ? 'shadow-[0_0_40px_rgba(52,211,153,0.1)]' : scorecard.score >= 60 ? 'shadow-[0_0_40px_rgba(250,204,21,0.1)]' : 'shadow-[0_0_40px_rgba(244,63,94,0.1)]'">
            <svg class="absolute inset-0 w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="60" class="stroke-white/5 fill-none" stroke-width="4" />
                <circle cx="64" cy="64" r="60" class="fill-none transition-all duration-1000" 
                    stroke-width="4" 
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 60"
                    :stroke-dashoffset="2 * Math.PI * 60 * (1 - scorecard.score / 100)"
                    :class="scorecard.score >= 80 ? 'stroke-emerald-500' : scorecard.score >= 60 ? 'stroke-yellow-400' : 'stroke-rose-500'" />
            </svg>
            <div class="flex flex-col items-center">
                <span class="text-4xl font-black tracking-tighter" :class="scoreColor(scorecard.score)">{{ scorecard.score }}</span>
                <span class="text-[8px] text-white/20 uppercase font-black tracking-widest">Rating</span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-4 relative z-10">
          <div v-for="(val, key) in { 'Hook': scorecard.hookScore, 'Pacing': scorecard.pacingScore, 'CTA': scorecard.ctaScore }"
               :key="key" class="flex flex-col gap-1.5">
            <div class="flex justify-between items-center px-0.5">
                <span class="text-[9px] text-white/50 uppercase font-black tracking-widest">{{ key }}</span>
                <span class="text-[10px] font-black" :class="scoreColor(val)">{{ val }}%</span>
            </div>
            <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :class="scoreBarColor(val)" :style="{ width: val + '%' }"></div>
            </div>
          </div>
        </div>

        <!-- Suggestions -->
        <div v-if="scorecard.suggestions?.length" class="flex flex-col gap-3 mt-4 border-t border-white/5 pt-5 relative z-10">
          <span class="text-[9px] text-white/30 uppercase font-black tracking-widest flex items-center gap-2 px-1">
              <Tips size="12" /> AI Optimization Plan
          </span>
          <div class="flex flex-col gap-2">
              <div v-for="(s, i) in scorecard.suggestions" :key="i"
                   class="flex items-start gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:bg-white/5 transition-colors group/item">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-primary mt-1.5 shrink-0 opacity-40 group-hover/item:opacity-100 transition-opacity"></div>
                <span class="text-[10px] text-white/60 leading-relaxed flex-1 italic group-hover/item:text-white/80 transition-colors">{{ s.message }}</span>
              </div>
          </div>
        </div>
      </template>

      <el-button 
        type="primary" 
        class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/10 mt-2 relative z-10" 
        :loading="isScoring" 
        @click="handleScore"
      >
        <template #icon><Magic :size="16" /></template>
        <span class="text-xs font-black uppercase tracking-widest">
          {{ scorecard ? 'Rescan Project' : 'Initiate Audit' }}
        </span>
      </el-button>
    </div>

    <!-- Platform Optimizer -->
    <div class="flex flex-col gap-5 p-5 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[11px] font-black text-white/90 uppercase tracking-widest">Destination Presets</span>
          <span class="text-[8px] text-white/30 tracking-[0.2em] uppercase font-black">Canvas & Meta-Data Sync</span>
        </div>
        <SettingConfig :size="18" class="text-white/20" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="p in platforms" :key="p.id"
          class="flex flex-col items-start gap-1 p-4 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all hover:-translate-y-1 group relative overflow-hidden"
          :disabled="!!isOptimizing"
          @click="handleOptimize(p.id)"
        >
          <div v-if="isOptimizing === p.id" class="absolute inset-0 bg-brand-primary/10 flex items-center justify-center animate-pulse">
              <CheckSmall :size="24" class="text-brand-primary animate-spin" />
          </div>
          <div class="flex items-center justify-between w-full mb-1">
            <span class="text-[10px] font-black text-white/80 group-hover:text-brand-primary transition-colors uppercase tracking-widest">{{ p.label }}</span>
            <Youtube v-if="p.id === 'youtube'" size="14" class="text-white/10" />
            <Magic v-else size="14" class="text-white/10" />
          </div>
          <span class="text-[9px] text-white/30 font-black uppercase tracking-tighter">{{ p.size }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
  @apply opacity-80;
}
</style>

<style scoped lang="postcss">
/* Inherits global cinematic styles */
</style>
