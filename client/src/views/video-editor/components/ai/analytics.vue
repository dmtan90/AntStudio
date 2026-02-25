<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { AutoEditorService } from '../../services/AutoEditorService';
import { Analysis as DataAnalysis, Magic, Youtube, Tips, Like, CheckSmall, SettingConfig } from '@icon-park/vue-next';
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
  v >= 80 ? 'bg-emerald-500' : v >= 60 ? 'bg-yellow-400' : 'bg-rose-500';

const handleScore = async () => {
  if (isScoring.value) return;
  isScoring.value = true;
  scorecard.value = null;
  try {
    const res = await AutoEditorService.analyzeProjectEngagement(editor.id);
    scorecard.value = res as Scorecard;
  } catch (e) {
    toast.error('Failed to analyse project.');
  } finally {
    isScoring.value = false;
  }
};

const handleOptimize = async (platform: typeof platforms[number]['id']) => {
  if (isOptimizing.value) return;
  isOptimizing.value = platform;
  try {
    await AutoEditorService.optimizeExportSettings(editor.id, platform);
  } catch (e) {
    toast.error('Failed to optimise export settings.');
  } finally {
    isOptimizing.value = null;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
        <DataAnalysis :size="16" class="text-violet-400" />
        AI Analytics
      </h3>
      <p class="text-[10px] text-white/40 italic">Score your project before publishing to maximise reach.</p>
    </div>

    <!-- Engagement Scorecard -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Engagement Score</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">Hook · Pacing · CTA</span>
        </div>
        <DataAnalysis :size="18" class="text-violet-400/60" />
      </div>

      <!-- Scorecard result -->
      <template v-if="scorecard">
        <!-- Big score ring -->
        <div class="flex items-center justify-center py-2">
          <div class="relative w-24 h-24 flex items-center justify-center rounded-full border-4 border-white/10"
               :class="scorecard.score >= 80 ? 'shadow-[0_0_30px_rgba(52,211,153,0.2)]' : scorecard.score >= 60 ? 'shadow-[0_0_30px_rgba(250,204,21,0.2)]' : 'shadow-[0_0_30px_rgba(244,63,94,0.2)]'">
            <span class="text-3xl font-black" :class="scoreColor(scorecard.score)">{{ scorecard.score }}</span>
            <span class="absolute bottom-4 text-[8px] text-white/30 uppercase font-black">/ 100</span>
          </div>
        </div>

        <!-- Sub-scores -->
        <div class="flex flex-col gap-2">
          <div v-for="(val, key) in { 'Hook': scorecard.hookScore, 'Pacing': scorecard.pacingScore, 'CTA': scorecard.ctaScore }"
               :key="key" class="flex items-center gap-3">
            <span class="text-[9px] text-white/40 uppercase font-bold w-12">{{ key }}</span>
            <div class="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :class="scoreBarColor(val)" :style="{ width: val + '%' }"></div>
            </div>
            <span class="text-[9px] font-black w-6 text-right" :class="scoreColor(val)">{{ val }}</span>
          </div>
        </div>

        <!-- Suggestions -->
        <div v-if="scorecard.suggestions?.length" class="flex flex-col gap-2 mt-2 border-t border-white/5 pt-3">
          <span class="text-[8px] text-white/30 uppercase font-black tracking-wider mb-1">Recommendations</span>
          <div v-for="(s, i) in scorecard.suggestions" :key="i"
               class="flex items-start gap-2 p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <Tips :size="12" class="text-yellow-400/70 mt-0.5 shrink-0" />
            <span class="text-[9px] text-white/60 leading-relaxed flex-1">{{ s.message }}</span>
            <button v-if="s.autoFix"
                    class="text-[8px] font-black text-violet-400 hover:text-violet-300 border border-violet-500/20 rounded-md px-1.5 py-0.5 shrink-0 transition-colors">
              Fix
            </button>
          </div>
        </div>
      </template>

      <el-button class="cinematic-button !bg-violet-600 !text-white !h-11 !rounded-xl !border-none shadow-xl shadow-violet-500/10"
                 :loading="isScoring" @click="handleScore">
        <template #icon><Magic :size="14" /></template>
        <span class="text-[10px] font-black uppercase tracking-widest ml-1">
          {{ scorecard ? 'Rescan Project' : 'Analyse Engagement' }}
        </span>
      </el-button>
    </div>

    <!-- Platform Optimizer -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Platform Optimizer</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">Canvas & Export Presets</span>
        </div>
        <SettingConfig :size="18" class="text-violet-400/60" />
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="p in platforms" :key="p.id"
          class="flex flex-col items-start gap-1 p-3 rounded-xl border transition-all hover:scale-[1.02] group"
          :class="`border-white/5 bg-white/[0.02] hover:border-${p.color}-500/30 hover:bg-${p.color}-500/5`"
          :disabled="!!isOptimizing"
          @click="handleOptimize(p.id)"
        >
          <div class="flex items-center justify-between w-full">
            <span class="text-[10px] font-black text-white/80 group-hover:text-white transition-colors">{{ p.label }}</span>
            <CheckSmall v-if="isOptimizing === p.id" :size="12" class="text-emerald-400 animate-spin" />
          </div>
          <span class="text-[8px] text-white/30 font-bold uppercase">{{ p.size }}</span>
        </button>
      </div>

      <p class="text-[8px] text-white/20 uppercase font-bold leading-normal mt-1">
        Clicking a platform resizes the canvas and applies optimal codec & bitrate settings for that destination.
      </p>
    </div>
  </div>
</template>

<style scoped lang="postcss">
/* Inherits global cinematic styles */
</style>
