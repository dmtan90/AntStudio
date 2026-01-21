<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X, Aiming } from '@icon-park/vue-next';
import { ElButton, ElColorPicker } from 'element-plus';
import { toast } from 'vue-sonner';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn, createInstance } from 'video-editor/lib/utils';
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

const onChangeColor = (result: tinycolor) => {
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
  <div class="flex flex-col h-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Stroke</h2>
      <el-button circle text class="ml-auto" @click="canvas.onChangeActiveObjectProperty('stroke', disabled ? '#000000' : '')">
        <template v-if="disabled">
          <EyeOff :size="15" :stroke-width="2" />
        </template>
        <template v-else>
          <Eye :size="15" :stroke-width="2" />
        </template>
      </el-button>
      <el-button circle :icon="X" class="bg-card" @click="editor.setActiveSidebarRight(null)" />
    </div>
    <section class="sidebar-container overflow-x-scroll scrollbar-hidden">
      <div :class="cn('px-4 py-4 flex flex-col divide-y', !disabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none')">
        <div class="pb-4 flex flex-col gap-4">
          <ChromePicker v-model="color" @update:model-value="(color) => onChangeColor(tinycolor(color))" class="shadow-none w-full" />
          <el-button v-if="eyeDropperStatus" text bg round :icon="Aiming" class="w-full" @click="onOpenEyeDropper">
            <span>Pickup color</span>
          </el-button>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Light Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button
              v-for="code in lightHexCodes"
              :key="code"
              @click="canvas.onChangeActiveObjectProperty('stroke', code)"
              class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110"
              :style="{ backgroundColor: code }"
            />
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Dark Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button
              v-for="code in darkHexCodes"
              :key="code"
              @click="canvas.onChangeActiveObjectProperty('stroke', code)"
              class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110"
              :style="{ backgroundColor: code }"
            />
          </div>
        </div>
        <div class="flex flex-col gap-4 py-5">
          <h4 class="text-xs font-semibold line-clamp-1">Pastel Colors</h4>
          <div class="grid grid-cols-8 gap-2.5">
            <button
              v-for="code in pastelHexCodes"
              :key="code"
              @click="canvas.onChangeActiveObjectProperty('stroke', code)"
              class="w-full aspect-square rounded border border-gray-400 transition-transform hover:scale-110"
              :style="{ backgroundColor: code }"
            />
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
