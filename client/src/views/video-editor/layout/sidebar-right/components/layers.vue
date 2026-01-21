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
});

</script>

<template>
  <section class="sidebar-container flex flex-col h-full">
    <div class="relative overflow-x-scroll scrollbar-hidden">
      <div class="flex flex-col divide-y">
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
    </div>
  </section>
</template>
