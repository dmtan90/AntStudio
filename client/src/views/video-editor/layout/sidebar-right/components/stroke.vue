<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X, Aiming } from '@icon-park/vue-next';
import { ElButton, ElColorPicker } from 'element-plus';
import { toast } from 'vue-sonner';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn, createInstance } from '@/utils/ui';
import { darkHexCodes, lightHexCodes, pastelHexCodes } from 'video-editor/constants/editor';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

const eyeDropperStatus = window.EyeDropper ? true : false;
const disabled = ref(!selected.value || !selected.value.stroke);
const color = ref(disabled.value ? "#ffffff" : selected.value?.stroke);

watch(selected, () => {
  disabled.value = !selected.value || !selected.value.stroke;
  color.value = disabled.value ? "#ffffff" : selected.value?.stroke;
});

const onChangeColor = (result: any) => {
  // console.log("onChangeColor", result);
  const { _r, _g, _b, _a } = result;
  const color = (window as any).fabric.Color.fromRgba(`rgba(${_r},${_g},${_b},${_a || 1})`);
  const hex = color.toHexa();
  canvas.value.onChangeActiveObjectProperty("stroke", `#${hex}`);
};

const onOpenEyeDropper = async () => {
  if (!eyeDropperStatus) return;
  const eyeDropper = createInstance(window.EyeDropper);
  try {
    const result = await eyeDropper.open();
    canvas.value.onChangeActiveObjectProperty("stroke", result.sRGBHex);
  } catch {
    toast.error("Failed to pick color from page");
  }
};

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Stroke</h2>
      <div class="flex items-center gap-2 relative z-10">
        <button 
            @click="canvas.onChangeActiveObjectProperty('stroke', disabled ? '#000000' : '')"
            class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300"
        >
          <template v-if="disabled">
            <EyeOff :size="14" />
          </template>
          <template v-else>
            <Eye :size="14" />
          </template>
        </button>
        <button 
            @click="editor.setActiveSidebarRight(null)"
            class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300" 
        >
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <section :class="cn('flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20 transition-all duration-500', disabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto')">
      <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
      
      <!-- Color Picker -->
      <div class="flex flex-col gap-6 mb-10">
        <div class="rounded-2xl overflow-hidden border border-white/10 dark-picker-override shadow-2xl bg-black/20">
            <ChromePicker v-model="color" @update:model-value="(color) => onChangeColor(tinycolor(color))" class="!w-full !shadow-none !bg-transparent" />
        </div>
        
        <button v-if="eyeDropperStatus" class="flex items-center justify-center gap-2.5 h-10 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/20 hover:text-brand-primary active:scale-95 transition-all text-white/40 shadow-sm w-full group" @click="onOpenEyeDropper">
            <Aiming :size="15" class="group-hover:scale-110 transition-transform" />
            <span class="text-[10px] font-bold uppercase tracking-widest">Pick From Page</span>
        </button>
      </div>
      
      <!-- Color Swatches -->
      <div class="flex flex-col gap-10">
          <!-- Light Colors -->
          <div class="flex flex-col gap-5">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Light Palette</h4>
            <div class="grid grid-cols-8 gap-3">
              <button
                v-for="code in lightHexCodes"
                :key="code"
                @click="canvas.onChangeActiveObjectProperty('stroke', code)"
                class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                :style="{ backgroundColor: code }"
              />
            </div>
          </div>

          <!-- Dark Colors -->
          <div class="flex flex-col gap-5">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Dark Palette</h4>
            <div class="grid grid-cols-8 gap-3">
              <button
                v-for="code in darkHexCodes"
                :key="code"
                @click="canvas.onChangeActiveObjectProperty('stroke', code)"
                class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                :style="{ backgroundColor: code }"
              />
            </div>
          </div>

          <!-- Pastel Colors -->
          <div class="flex flex-col gap-5">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Pastel Palette</h4>
            <div class="grid grid-cols-8 gap-3">
              <button
                v-for="code in pastelHexCodes"
                :key="code"
                @click="canvas.onChangeActiveObjectProperty('stroke', code)"
                class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10 focus:outline-none focus:ring-2 focus:ring-brand-primary/50"
                :style="{ backgroundColor: code }"
              />
            </div>
          </div>
      </div>

       <!-- Bottom Fade -->
       <div class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-80"></div>
    </section>
  </div>
</template>

<style scoped>
.dark-picker-override :deep(.vc-chrome) {
  background: transparent !important;
  box-shadow: none !important;
}

.dark-picker-override :deep(.vc-chrome-body) {
  background: transparent !important;
  padding: 16px !important;
}

.dark-picker-override :deep(.vc-chrome-fields-wrap) {
  padding-top: 12px !important;
}

.dark-picker-override :deep(.vc-input__input) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 6px !important;
  color: white !important;
  box-shadow: none !important;
  height: 24px !important;
  font-family: monospace !important;
  font-size: 10px !important;
}

.dark-picker-override :deep(.vc-input__label) {
  color: rgba(255, 255, 255, 0.3) !important;
  font-size: 9px !important;
  font-weight: bold !important;
  text-transform: uppercase !important;
  margin-top: 4px !important;
}

.dark-picker-override :deep(.vc-chrome-alpha-wrap),
.dark-picker-override :deep(.vc-chrome-hue-wrap) {
  height: 10px !important;
  border-radius: 5px !important;
  overflow: hidden !important;
}

.dark-picker-override :deep(.vc-chrome-color-wrap) {
  width: 32px !important;
  height: 32px !important;
}

.dark-picker-override :deep(.vc-chrome-active-color) {
  border-radius: 8px !important;
  border: 2px solid rgba(255, 255, 255, 0.1) !important;
}
</style>
