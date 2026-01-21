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
import { cn, createInstance } from 'video-editor/lib/utils';
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
  return (selected.value.fill as fabric.Gradient).colorStops![index.value].color;
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
    return (selected.value.fill as fabric.Gradient).colorStops!;
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

const onChangeColor = (result: tinycolor) => {
  // console.log("onChangeColor", result);
  const { _r, _g, _b, _a } = result;
  const color = fabric.Color.fromRgba(`rgba(${_r},${_g},${_b},${_a || 1})`);
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
  <div class="flex flex-col h-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Fill</h2>
      <el-button circle text class="ml-auto h-7 w-7" @click="onToggleFill">
        <template v-if="disabled">
          <EyeOff :size="15" :stroke-width="2" />
        </template>
        <template v-else>
          <Eye :size="15" :stroke-width="2" />
        </template>
      </el-button>
      <el-button circle :icon="X" class="bg-card" @click="editor.setActiveSidebarRight(null)" />
    </div>
    <section :class="cn('sidebar-container overflow-x-scroll scrollbar-hidden px-4 py-4', !disabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none')">
      <el-segmented v-model="mode" :options="modeOptions" block style="--el-border-radius-base: 20px;" @change="(value) => onChangeMode(value)">
        <template #default="scope">
          <div class="flex flex-col items-center gap-2">
            <template v-if="scope.item.value == 'solid'">
              <span class="text-xs h-full gap-1 flex items-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="4" fill="currentColor" fill-opacity="0.9" />
                  <circle opacity="0.75" cx="8" cy="8" r="5.5" stroke="currentColor" stroke-opacity="0.9" />
                </svg>
                <span>Solid</span>
              </span>
            </template>
            <template v-else>
              <span class="text-xs h-full gap-1 flex items-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="4" fill="url(#fill-gradient)" fill-opacity="0.9" />
                  <circle opacity="0.75" cx="8" cy="8" r="5.5" stroke="currentColor" stroke-opacity="0.9" />
                  <defs>
                    <linearGradient id="fill-gradient" x1="8" y1="4" x2="8" y2="12" gradientUnits="userSpaceOnUse">
                      <stop stop-color="currentColor" />
                      <stop offset="1" stop-color="currentColor" stop-opacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
                <span>Gradient</span>
              </span>
            </template>
          </div>
        </template>
      </el-segmented>
      <div class="flex flex-col divide-y">
        <div class="pb-4 pt-4 flex flex-col gap-4">
          <div v-if="mode === 'gradient'" ref="containerRef">
            <GradientSlider :width="measure.width" :colors="colors" :coords="coords" :selected="index" @select="index = $event" @change="onChangeOffset" @rotate="onRotateGradient" />
          </div>
          <ChromePicker v-model="color" @update:model-value="(color) => onChangeColor(tinycolor(color))" class="shadow-none w-full" />
          <el-button v-if="eyeDropperStatus" text bg round :icon="Aiming" class="w-full" @click="onOpenEyeDropper">
            <span>Pickup color</span>
          </el-button>
        </div>
        <template v-if="editor.mode === 'creator' || !editor.adapter.brand">
          <!-- Render nothing -->
        </template>
        <template v-else>
          <div class="flex flex-col gap-4 py-5">
            <h4 class="text-xs font-semibold line-clamp-1">Brand Kit</h4>
            <div class="grid grid-cols-8 gap-2.5">
              <button v-for="code in editor.adapter.brand.primary_colors.concat(editor.adapter.brand.secondary_colors)" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110" :style="{ backgroundColor: code }" />
            </div>
          </div>
        </template>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Light Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button v-for="code in lightHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110" :style="{ backgroundColor: code }" />
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Dark Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button v-for="code in darkHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110" :style="{ backgroundColor: code }" />
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Pastel Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button v-for="code in pastelHexCodes" :key="code" @click="onSelectColorFromSwatch(code)" class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110" :style="{ backgroundColor: code }" />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
