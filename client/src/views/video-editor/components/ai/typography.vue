<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { AutoEditorService } from '../../services/AutoEditorService';
import { TypeDrive, Music, WavesLeft, Effects, Magic, Focus, SettingConfig, PlayCycle } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const isProcessing = ref(false);
const selectedStyle = ref('pop');
const intensity = ref(0.7);

const kineticStyles = [
  { id: 'pop', label: 'Pop & Bounce', description: 'Energetic scale-up on syllables' },
  { id: 'glitch', label: 'Tech & Glitch', description: 'Chromatic aberration for tech vibes' },
  { id: 'cinematic', label: 'Smooth Fade', description: 'Elegant cinematic letter-by-letter fade' },
  { id: 'typewriter', label: 'Typewriter', description: 'Classic tick-by-tick reveals' }
];

const handleApplyKinetic = async () => {
  if (isProcessing.value) return;
  isProcessing.value = true;
  try {
    await AutoEditorService.applyKineticStyle(editor.page, selectedStyle.value);
  } catch (error) {
    console.error("Kinetic style failed:", error);
    toast.error("Failed to apply kinetic typography.");
  } finally {
    isProcessing.value = false;
  }
};

const handleSuggestMusic = async () => {
  // Logic from AutoEditorService later or direct API here
  toast.info("Analyzing project mood for music matching...");
};
</script>

<template>
  <div class="flex flex-col gap-6 p-4">
    <div class="flex flex-col gap-1">
      <h3 class="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
        <TypeDrive :size="16" class="text-blue-400" />
        Kinetic Typography
      </h3>
      <p class="text-[10px] text-white/40 italic">Sync professional text animations to the beat of your voice.</p>
    </div>

    <!-- Style Selection Section -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
      <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Style Presets</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">AI Orchestrated Motion</span>
        </div>
        <Effects :size="18" class="text-blue-400/60" />
      </div>

      <div class="grid grid-cols-1 gap-2">
        <div 
          v-for="style in kineticStyles" 
          :key="style.id"
          class="p-3 rounded-xl border transition-all cursor-pointer group"
          :class="selectedStyle === style.id ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/[0.02] border-white/5 hover:border-white/10'"
          @click="selectedStyle = style.id"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] font-bold text-white group-hover:text-blue-400 transition-colors">{{ style.label }}</span>
            <div 
               v-if="selectedStyle === style.id"
               class="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
            ></div>
          </div>
          <p class="text-[8px] text-white/30 mt-1 uppercase font-black tracking-tight">{{ style.description }}</p>
        </div>
      </div>

      <div class="flex flex-col gap-2 mt-2">
        <div class="flex justify-between items-center px-1">
          <span class="text-[9px] text-white/40 uppercase font-bold">Animation Intensity</span>
          <span class="text-[9px] text-blue-400 font-black">{{ (intensity * 100).toFixed(0) }}%</span>
        </div>
        <el-slider 
          v-model="intensity" 
          :min="0.1" 
          :max="1.5" 
          :step="0.1"
          class="cinematic-slider-blue"
          :show-tooltip="false"
        />
      </div>

      <el-button 
        class="cinematic-button !bg-blue-600 !text-white !h-11 !rounded-xl !border-none group shadow-xl shadow-blue-500/10"
        :loading="isProcessing"
        @click="handleApplyKinetic"
      >
        <template #icon><PlayCycle :size="14" /></template>
        <span class="text-[10px] font-black uppercase tracking-widest ml-1">Animate Subtitles</span>
      </el-button>
    </div>

    <!-- Music Match Utility -->
    <div class="flex flex-col gap-4 p-4 rounded-2xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
       <div class="flex items-center justify-between">
        <div class="flex flex-col gap-0.5">
          <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Music Match</span>
          <span class="text-[8px] text-white/30 tracking-wide uppercase font-black">AI Background Tracks</span>
        </div>
        <Music :size="18" class="text-emerald-400/60" />
      </div>

      <p class="text-[9px] text-white/40 leading-relaxed italic">
        Gemini will analyze the mood and tempo of your visual cuts to suggest perfectly matched background music.
      </p>

      <el-button 
        class="cinematic-button !bg-emerald-500/10 !text-emerald-400 !h-11 !rounded-xl !border-emerald-500/20 group hover:!border-emerald-500/40 transition-all"
        :loading="isProcessing"
        @click="handleSuggestMusic"
      >
        <template #icon><Magic :size="14" /></template>
        <span class="text-[10px] font-black uppercase tracking-widest ml-1">Suggest Tracks</span>
      </el-button>
    </div>

    <!-- Motion Tracking Placeholder -->
    <div class="flex flex-col gap-3 mt-2 border-t border-white/5 pt-4">
       <div class="flex items-center gap-2">
         <Focus :size="14" class="text-white/40" />
         <span class="text-[9px] font-bold text-white/40 uppercase tracking-wider">Motion Tracking Info</span>
       </div>
       <p class="text-[8px] text-white/20 uppercase font-bold leading-normal">
         Select any text element and use "Track to Object" in the property panel to pin typography to identified subjects.
       </p>
    </div>
  </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-slider-blue .el-slider__runway) {
  @apply bg-white/5 h-[4px] rounded-full;
}
:deep(.cinematic-slider-blue .el-slider__bar) {
  @apply bg-blue-500 h-[4px] rounded-full;
}
:deep(.cinematic-slider-blue .el-slider__button) {
  @apply border-2 border-blue-500 bg-black w-[12px] h-[12px] shadow-[0_0_10px_rgba(59,130,246,0.4)];
}
</style>
