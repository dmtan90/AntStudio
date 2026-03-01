<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { AutoEditorService } from '../../services/AutoEditorService';
import { Magic, VideoOne, Effects, Camera, Connection, SettingConfig, CollectionFiles as Collection, Lightning, Diamond } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const isProcessing = ref(false);
const autoTransition = ref(true);
const matchVisualMood = ref(true);

const handleSuggestBRoll = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await AutoEditorService.suggestBRollSegments(editor.page);
  } catch (error) {
    console.error("B-Roll suggestion failed:", error);
    toast.error("Failed to suggest B-Roll.");
  } finally {
    isProcessing.value = false;
  }
};

const handleAutoTransitions = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await AutoEditorService.applyAutoTransitions(editor.id);
  } catch (error) {
    console.error("Auto transitions failed:", error);
    toast.error("Failed to apply auto-transitions.");
  } finally {
    isProcessing.value = false;
  }
};
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
        <Diamond :size="16" class="text-rose-400" />
        Project Enrichment
      </h3>
      <p class="text-[10px] text-white/40 italic">Elevate your project with AI-matched B-Roll and cinematic polish.</p>
    </div>

    <!-- B-Roll Suggester -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">AI B-Roll Suggester</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">Contextual Media Overlay</span>
        </div>
        <Camera :size="18" class="text-rose-400/60" />
      </div>

      <p class="text-[9px] text-white/40 leading-relaxed">
        Analyzes your scene's script to find and overlay relevant B-Roll footage from your library or stock sources.
      </p>

      <el-button 
        class="cinematic-button !bg-rose-600 !text-white !h-11 !rounded-xl !border-none group shadow-xl shadow-rose-500/10"
        :loading="isProcessing"
        @click="handleSuggestBRoll"
      >
        <template #icon><Collection :size="14" /></template>
        <span class="text-[10px] font-black uppercase tracking-widest ml-1">Enrich Current Scene</span>
      </el-button>
    </div>

    <!-- Smart Transitions -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
       <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Smart Transitions</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">Pacing-Aware Cuts</span>
        </div>
        <Connection :size="18" class="text-rose-400/60" />
      </div>

      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div class="flex flex-col gap-0.5">
                <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Auto-Transitions</span>
                <span class="text-[8px] text-white/30 italic">Choose types based on scene energy</span>
            </div>
            <el-switch v-model="autoTransition" active-color="#f43f5e" />
        </div>

        <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div class="flex flex-col gap-0.5">
                <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Visual Mood Match</span>
                <span class="text-[8px] text-white/30 italic">Auto-sync color grades to B-roll</span>
            </div>
            <el-switch v-model="matchVisualMood" active-color="#f43f5e" />
        </div>
      </div>

      <el-button 
        class="cinematic-button !bg-white/5 !text-white !h-11 !rounded-xl !border-white/10 group hover:!border-rose-500/30 transition-all"
        :loading="isProcessing"
        @click="handleAutoTransitions"
      >
        <template #icon><Lightning :size="14" /></template>
        <span class="text-[10px] font-black uppercase tracking-widest ml-1">Apply Project-Wide Cuts</span>
      </el-button>
    </div>

    <!-- Optimization Info -->
    <div class="flex gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/[0.03] mt-2">
        <Magic :size="14" class="text-white/20 mt-0.5" />
        <span class="text-[8px] text-white/25 leading-normal uppercase font-bold">
            Project Enrichment uses Gemini Vision to ensure that every inserted clip and transition maintains a consistent narrative flow and visual quality.
        </span>
    </div>
  </div>
</template>

<style scoped lang="postcss">
/* Inherits cinematic styles */
</style>
