<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X, Aiming } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

import GradientSlider from 'video-editor/components/slider/gradient.vue';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';

import { darkHexCodes, lightHexCodes, pastelHexCodes } from 'video-editor/constants/editor';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { defaultFill, defaultGradient } from 'video-editor/fabric/constants';
import { cn, createInstance } from '@/utils/ui';
import { useMeasure } from 'video-editor/hooks/use-measure';
import { FabricUtils } from 'video-editor/fabric/utils';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

watch(canvas, (value) => {
  console.log("canvas", value);
  forceUpdate();
});

const [containerRef, measure] = useMeasure();

const index = ref(0);

const eyeDropperStatus = window.EyeDropper ? true : false;

const computeColor = computed(() => {
  // console.log("color", selected);
  if (!selected.value?.fill) return defaultFill;
  if (typeof selected.value.fill === "string") return selected.value.fill;
  return ((selected.value.fill as any) as fabric.Gradient).colorStops![index.value].color;
});

// const mode = computed(() => {
//   console.log("mode", selected);
//   if (!selected.value?.fill || typeof selected.value.fill === "string") return "solid";
//   return "gradient";
// });

const mode = computed({
  get(){
    if (!selected.value?.fill || typeof selected.value.fill === "string") return "solid";
    return "gradient";
  },
  set(value){

  }
});

// const colors = computed(() => {
//   console.log("colors", selected);
//   if (!selected.value || !selected.value.fill || typeof selected.value.fill === "string") return [];
//   return (selected.value.fill as fabric.Gradient).colorStops!;
// });

const colors = computed({
  get(){
    if (!selected.value || !selected.value.fill || typeof selected.value.fill === "string") return [];
    return ((selected.value.fill as any) as fabric.Gradient).colorStops!;
  },
  set(value){

  }
});

// const coords = computed(() => {
//   console.log("coords", selected);
//   if (!selected.value || !selected.value.fill || typeof selected.value.fill === "string") return { x1: 0, y1: 0, x2: 0, y2: 0 };
//   return (selected.value.fill as fabric.Gradient).coords!;
// });

const coords = computed({
  get(){
    if (!selected.value || !selected.value.fill || typeof selected.value.fill === "string") return { x1: 0, y1: 0, x2: 0, y2: 0 };
    return (selected.value.fill as fabric.Gradient).coords!;
  },
  set(value){

  }
});

const forceUpdate = () => {
  computeColor; mode; colors; coords;
};

const color = ref(computeColor.value);

const onToggleFill = () => {
  if (selected.value?.fill) {
    canvas.value.onChangeActiveObjectProperty("previousFill", mode.value === "solid" ? selected.value.fill : selected.value.previousFill);
    canvas.value.onChangeActiveObjectProperty("fill", "");
  } else {
    const fill = !selected.value?.previousFill || typeof selected.value.previousFill !== "string" ? defaultFill : selected.value.previousFill;
    canvas.value.onChangeActiveObjectProperty("fill", fill);
  }
};

const onChangeColor = (result: any) => {
  // console.log("onChangeColor", result);
  const { _r, _g, _b, _a } = result;
  const color = (window as any).fabric.Color.fromRgba(`rgba(${_r},${_g},${_b},${_a || 1})`);
  const hex = color.toHexa();

  switch (mode.value) {
    case "solid": {
      canvas.value.onChangeActiveObjectProperty("fill", `#${hex}`);
      break;
    }
    case "gradient": {
      const fill = selected.value?.fill as fabric.Gradient;
      const stops = JSON.parse(JSON.stringify(fill.colorStops)); // Deep copy
      stops[index.value].color = `#${hex}`;
      canvas.value.onChangeActiveObjectFillGradient(fill.type!, stops!, fill.coords!);
      break;
    }
  }
};

const onSelectColorFromSwatch = (selectedColor: string) => {
  switch (mode.value) {
    case "solid": {
      canvas.value.onChangeActiveObjectProperty("fill", selectedColor);
      break;
    }
    case "gradient": {
      const fill = selected.value?.fill as fabric.Gradient;
      const stops = JSON.parse(JSON.stringify(fill.colorStops)); // Deep copy
      stops[index.value].color = selectedColor;
      canvas.value.onChangeActiveObjectFillGradient(fill.type!, stops!, fill.coords!);
      break;
    }
  }
};

const onChangeOffset = (idx: number, offsetValue: number) => {
  const fill = selected.value?.fill as fabric.Gradient;
  const stops = JSON.parse(JSON.stringify(fill.colorStops)); // Deep copy
  stops[idx].offset = offsetValue;
  canvas.value.onChangeActiveObjectFillGradient(fill.type!, stops, fill.coords!);
};

const onRotateGradient = (angle: number) => {
  const fill = selected.value?.fill as fabric.Gradient;
  canvas.value.onChangeActiveObjectFillGradient(fill.type!, fill.colorStops!, FabricUtils.convertGradient(angle));
};

const onChangeMode = (value: string) => {
  if (value === mode.value) return;
  switch (value) {
    case "solid": {
      const fill = !selected.value?.previousFill || typeof selected.value.previousFill !== "string" ? defaultFill : selected.value.previousFill;
      const previousFill = selected.value?.fill;
      canvas.value.onChangeActiveObjectProperty("fill", fill);
      canvas.value.onChangeActiveObjectProperty("previousFill", previousFill);
      break;
    }
    case "gradient": {
      const fill = !selected.value?.previousFill || typeof selected.value.previousFill === "string" ? defaultGradient : selected.value.previousFill;
      const previousFill = selected.value?.fill;
      canvas.value.onChangeActiveObjectFillGradient(fill.type, fill.colorStops, fill.coords);
      canvas.value.onChangeActiveObjectProperty("previousFill", previousFill);
      break;
    }
  }
};

const onOpenEyeDropper = async () => {
  if (!eyeDropperStatus) return;
  const eyeDropper = createInstance(window.EyeDropper);
  try {
    const result = await eyeDropper.open();
    onSelectColorFromSwatch(result.sRGBHex);
  } catch {
    toast.error("Failed to pick color from page");
  }
};

const disabled = computed(() => !selected.value || !selected.value.fill);

const modeOptions = [
  {
    value: 'solid',
    label: 'Solid'
  },
  {
    value: 'gradient',
    label: 'Gradient'
  }
];

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Fill</h2>
      <div class="flex items-center gap-2 relative z-10">
        <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300" @click="onToggleFill">
           <template v-if="disabled">
            <EyeOff :size="14" />
          </template>
          <template v-else>
            <Eye :size="14" />
          </template>
        </button>
        <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300" @click="editor.setActiveSidebarRight(null)">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <section :class="cn('flex-1 overflow-y-auto custom-scrollbar px-5 py-6', !disabled ? 'opacity-100 pointer-events-auto' : 'opacity-30 pointer-events-none grayscale transition-all duration-500')">
        <!-- Mode Switcher -->
        <div class="bg-white/5 p-1 rounded-2xl border border-white/10 flex mb-8">
           <button 
             v-for="opt in modeOptions" 
             :key="opt.value"
             @click="onChangeMode(opt.value)"
             class="flex-1 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300"
             :class="[mode === opt.value ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-white/40 hover:text-white hover:bg-white/10']"
           >
              {{ opt.label }}
           </button>
        </div>

      <div class="flex flex-col gap-10">
        <!-- Picker Section -->
        <div class="flex flex-col gap-6">
          <div v-if="mode === 'gradient'" ref="containerRef" class="mb-2">
            <GradientSlider :width="(measure as any).width" :colors="colors" :coords="(coords as any)" :selected="index" @select="index = $event" @change="onChangeOffset" @rotate="onRotateGradient" />
          </div>
          
          <div class="rounded-2xl overflow-hidden border border-white/10 dark-picker-override shadow-2xl bg-black/20">
             <ChromePicker v-model="color" @update:model-value="(color) => onChangeColor(tinycolor(color))" class="!w-full !shadow-none !bg-transparent" />
          </div>

          <button v-if="eyeDropperStatus" class="flex items-center justify-center gap-2.5 h-10 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-brand-primary/20 hover:text-brand-primary active:scale-95 transition-all text-white/40 shadow-sm" @click="onOpenEyeDropper">
             <Pipette :size="16" />
             <span class="text-[10px] font-bold uppercase tracking-widest">Page Eyedropper</span>
          </button>
        </div>
        
        <!-- Swatches Sections -->
        <div class="flex flex-col gap-8 divide-y divide-white/5 pb-20">
          <template v-if="editor.mode !== 'creator' && editor.adapter.brand">
             <div class="flex flex-col gap-4 py-2">
              <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Brand Kit</h4>
              <div class="grid grid-cols-8 gap-3">
                <button v-for="code in (editor.adapter.brand.primary_colors || []).concat(editor.adapter.brand.secondary_colors || [])" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10" :style="{ backgroundColor: code }" />
              </div>
            </div>
          </template>
          
          <div class="flex flex-col gap-4 pt-6">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Light Colors</h4>
            <div class="grid grid-cols-8 gap-3">
              <button v-for="code in lightHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10" :style="{ backgroundColor: code }" />
            </div>
          </div>

          <div class="flex flex-col gap-4 pt-6">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Dark Colors</h4>
            <div class="grid grid-cols-8 gap-3">
              <button v-for="code in darkHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10" :style="{ backgroundColor: code }" />
            </div>
          </div>

          <div class="flex flex-col gap-4 pt-6">
            <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Pastel Colors</h4>
            <div class="grid grid-cols-8 gap-3">
              <button v-for="code in pastelHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded-full border border-white/10 transition-all hover:scale-125 hover:shadow-lg hover:shadow-black/40 hover:z-10" :style="{ backgroundColor: code }" />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dark-picker-override :deep(.vc-chrome) {
    background: transparent !important;
    border-radius: 0 !important;
}

.dark-picker-override :deep(.vc-chrome-body) {
    background: rgba(255, 255, 255, 0.03) !important;
    padding: 16px !important;
}

.dark-picker-override :deep(.vc-chrome-fields-wrap) {
    padding-top: 16px !important;
}

.dark-picker-override :deep(.vc-chrome-fields .vc-input__input) {
    background: rgba(0, 0, 0, 0.2) !important;
    color: rgba(255, 255, 255, 0.8) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    box-shadow: none !important;
    border-radius: 6px !important;
    font-size: 11px !important;
    height: 24px !important;
    padding: 0 4px !important;
    font-weight: 600 !important;
}

.dark-picker-override :deep(.vc-chrome-fields .vc-input__label) {
    color: rgba(255, 255, 255, 0.3) !important;
    text-transform: uppercase !important;
    font-size: 9px !important;
    font-weight: 800 !important;
    letter-spacing: 0.1em !important;
}

.dark-picker-override :deep(.vc-chrome-alpha-wrap), 
.dark-picker-override :deep(.vc-chrome-hue-wrap) {
    height: 10px !important;
}

.dark-picker-override :deep(.vc-chrome-color-wrap) {
    width: 32px !important;
    height: 32px !important;
    border-radius: 50% !important;
    overflow: hidden !important;
    border: 2px solid rgba(255, 255, 255, 0.1) !important;
}

.dark-picker-override :deep(.vc-chrome-toggle-btn) {
    display: none !important;
}
</style>
