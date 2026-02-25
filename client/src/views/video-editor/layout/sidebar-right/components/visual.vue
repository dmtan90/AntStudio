<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn, createInstance } from '@/utils/ui';
import { darkHexCodes, lightHexCodes, pastelHexCodes } from 'video-editor/constants/editor';
import { fonts } from 'video-editor/constants/fonts';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected } = storeToRefs(canvasStore);

// const eyeDropperStatus = window.EyeDropper ? true : false;
const disabled = ref(!selected.value || !selected.value.visible);
// const color = ref(disabled.value ? "#ffffff00" : selected.value?.backgroundColor);

watch(selected, () => {
  console.log("visual", selected);
  disabled.value = !selected.value || !selected.value.visible;
  // color.value = disabled.value ? "#ffffff" : selected.value?.backgroundColor;
});

onMounted(() => {
  console.log("visual", selected.value);
});

// const onChangeColor = (result: tinycolor) => {
//   // console.log("onChangeColor", result);
//   const { _r, _g, _b, _a } = result;
//   const color = (window as any).fabric.Color.fromRgba(`rgba(${_r},${_g},${_b},${_a || 1})`);
//   const hex = color.toHexa();
//   canvas.value.onChangeActiveObjectProperty("backgroundColor", `#${hex}`);
// };

// const onOpenEyeDropper = async () => {
//   if (!eyeDropperStatus) return;
//   const eyeDropper = createInstance(window.EyeDropper);
//   try {
//     const result = await eyeDropper.open();
//     canvas.value.onChangeActiveObjectProperty("backgroundColor", result.sRGBHex);
//   } catch {
//     toast.error("Failed to pick color from page");
//   }
// };

const visualType = computed({
  get() {
    return selected.value?.visualType;
  },

  set(value) {
    canvas.value.onChangeActiveObjectProperty("visualType", value);
    // selected.value?.visualType = value;
  }
})

const visualProps = computed({
  get() {
    return selected.value?.visualProps;
  },

  set(value) {
    // selected.value?.visualProps = value;
    canvas.value.onChangeActiveObjectProperty("visualProps", value);
  }
})

watch(visualProps, (value) => {
  canvas.value.onChangeActiveObjectProperty("visualProps", value);
}, { deep: true });

const predefineColors = ref(['#E63415', '#FF6600', '#FFDE0A', '#1EC79D', '#14CCCC', '#4167F0', '#6222C9']);

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div
      class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group/header shrink-0">
      <div
        class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover/header:opacity-100 transition-opacity duration-700">
      </div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Visual</h2>
      <div class="flex items-center gap-2 relative z-10">
        <button @click="canvas.onChangeActiveObjectProperty('visible', disabled)"
          :title="disabled ? 'Show Layer' : 'Hide Layer'"
          class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300">
          <template v-if="disabled">
            <EyeOff :size="14" />
          </template>
          <template v-else>
            <Eye :size="14" />
          </template>
        </button>
        <button @click="editor.setActiveSidebarRight(null)"
          class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <section
      :class="cn('flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20 transition-all duration-500', disabled ? 'opacity-30 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto')">
      <div
        class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50">
      </div>

      <div class="flex flex-col gap-8">
        <!-- Wave Type Selection -->
        <div class="flex flex-col gap-3">
          <h4 class="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">Visualizer Mode</h4>
          <el-select v-model="visualType" class="w-full cinematic-select" popper-class="cinematic-popover">
            <el-option value="bars" label="BARS" />
            <el-option value="circle" label="CIRCLE" />
            <el-option value="line" label="LINE" />
            <el-option value="waveform" label="WAVEFORM" />
          </el-select>
        </div>

        <div class="border-t border-white/5 pt-8">
          <!-- Bars Properties -->
          <template v-if="visualType == 'bars'">
            <div class="grid grid-cols-2 gap-x-5 gap-y-8">
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bar Width</h4>
                <el-input-number v-model="visualProps.barWidth" class="w-full cinematic-input-number" :min="1" :max="20"
                  :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bar Space</h4>
                <el-input-number v-model="visualProps.barSpace" class="w-full cinematic-input-number" :min="1" :max="20"
                  :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bar Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.barColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Symmetric</h4>
                <div class="h-10 flex items-center">
                  <el-switch v-model="visualProps.symmetric" />
                </div>
              </div>

              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Caps Height</h4>
                <el-input-number v-model="visualProps.capsHeight" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Drop Speed</h4>
                <el-input-number v-model="visualProps.capsDropSpeed" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Caps Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.capsColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>

              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Brick Height</h4>
                <el-input-number v-model="visualProps.brickHeight" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Brick Space</h4>
                <el-input-number v-model="visualProps.brickSpace" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
            </div>
          </template>

          <!-- Circle Properties -->
          <template v-if="visualType == 'circle'">
            <div class="grid grid-cols-2 gap-x-5 gap-y-8">
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Width</h4>
                <el-input-number v-model="visualProps.lineWidth" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Space</h4>
                <el-input-number v-model="visualProps.lineSpace" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Outline</h4>
                <el-input-number v-model="visualProps.outlineWidth" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.outlineColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bar Width</h4>
                <el-input-number v-model="visualProps.barWidth" class="w-full cinematic-input-number" :min="1" :max="20"
                  :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Bar Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.barColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>

              <div class="flex flex-col gap-5 col-span-2 border-t border-white/5 pt-8">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold text-white/80 uppercase tracking-widest">Progress Bar</h4>
                  <el-switch v-model="visualProps.progress" />
                </div>
                <template v-if="visualProps.progress">
                  <div class="grid grid-cols-2 gap-x-5 gap-y-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Width</h4>
                      <el-input-number v-model="visualProps.progressWidth" class="w-full cinematic-input-number"
                        :min="1" :max="20" :step="1" controls-position="right" />
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</h4>
                      <div
                        class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                        <el-color-picker v-model="visualProps.progressColor" show-alpha :predefine="predefineColors" />
                      </div>
                    </div>
                    <div class="flex items-center justify-between col-span-2 py-2">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Clockwise</h4>
                      <el-switch v-model="visualProps.progressClockwise" />
                    </div>
                  </div>
                </template>
              </div>

              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Meter Space</h4>
                <el-input-number v-model="visualProps.outlineMeterSpace" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex items-center justify-between pt-6">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Rotate Graph</h4>
                <el-switch v-model="visualProps.rotateGraph" />
              </div>

              <div class="flex flex-col gap-5 col-span-2 border-t border-white/5 pt-8">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold text-white/80 uppercase tracking-widest">Playtime Display</h4>
                  <el-switch v-model="visualProps.playtime" />
                </div>
                <template v-if="visualProps.playtime">
                  <div class="grid grid-cols-2 gap-x-5 gap-y-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Font Size</h4>
                      <el-input-number v-model="visualProps.playtimeFontSize" class="w-full cinematic-input-number"
                        :min="1" :max="100" :step="1" controls-position="right" />
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Family</h4>
                      <el-select v-model="visualProps.playtimeFontFamily" class="w-full cinematic-select"
                        popper-class="cinematic-popover">
                        <el-option v-for="font in fonts" :key="font.family" :value="font.family" :label="font.family"
                          class="capitalize" :style="{ fontFamily: font.family }"></el-option>
                      </el-select>
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</h4>
                      <div
                        class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                        <el-color-picker v-model="visualProps.playtimeColor" show-alpha :predefine="predefineColors" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>

          <!-- Line Properties -->
          <template v-if="visualType == 'line'">
            <div class="grid grid-cols-2 gap-x-5 gap-y-8">
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Width</h4>
                <el-input-number v-model="visualProps.lineWidth" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.lineColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>
            </div>
          </template>

          <!-- Waveform Properties -->
          <template v-if="visualType == 'waveform'">
            <div class="grid grid-cols-2 gap-x-5 gap-y-8">
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Width</h4>
                <el-input-number v-model="visualProps.noplayedLineWidth" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Line Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.noplayedLineColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Played Width</h4>
                <el-input-number v-model="visualProps.playedLineWidth" class="w-full cinematic-input-number" :min="1"
                  :max="20" :step="1" controls-position="right" />
              </div>
              <div class="flex flex-col gap-3">
                <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Played Color</h4>
                <div
                  class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                  <el-color-picker v-model="visualProps.playedLineColor" show-alpha :predefine="predefineColors" />
                </div>
              </div>

              <div class="flex flex-col gap-5 col-span-2 border-t border-white/5 pt-8">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold text-white/80 uppercase tracking-widest">Playtime Display</h4>
                  <el-switch v-model="visualProps.playtime" />
                </div>
                <template v-if="visualProps.playtime">
                  <div class="grid grid-cols-2 gap-x-5 gap-y-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                    <div class="flex items-center justify-between col-span-2 py-2">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Include Milliseconds
                      </h4>
                      <el-switch v-model="visualProps.playtimeWithMs" />
                    </div>
                    <div class="flex items-center justify-between col-span-2 py-2">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Position Bottom</h4>
                      <el-switch v-model="visualProps.playtimeTextBottom" />
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Font Size</h4>
                      <el-input-number v-model="visualProps.playtimeFontSize" class="w-full cinematic-input-number"
                        :min="1" :max="100" :step="1" controls-position="right" />
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Family</h4>
                      <el-select v-model="visualProps.playtimeFontFamily" class="w-full cinematic-select"
                        popper-class="cinematic-popover">
                        <el-option v-for="font in fonts" :key="font.family" :value="font.family" :label="font.family"
                          class="capitalize" :style="{ fontFamily: font.family }"></el-option>
                      </el-select>
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Color</h4>
                      <div
                        class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                        <el-color-picker v-model="visualProps.playtimeFontColor" show-alpha
                          :predefine="predefineColors" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <div class="flex flex-col gap-5 col-span-2 border-t border-white/5 pt-8">
                <div class="flex items-center justify-between">
                  <h4 class="text-[11px] font-bold text-white/80 uppercase tracking-widest">Playtime Slider</h4>
                  <el-switch v-model="visualProps.playtimeSlider" />
                </div>
                <template v-if="visualProps.playtimeSlider">
                  <div class="grid grid-cols-2 gap-x-5 gap-y-6 bg-white/2 p-4 rounded-2xl border border-white/5">
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Slider Width</h4>
                      <el-input-number v-model="visualProps.playtimeSliderWitdh" class="w-full cinematic-input-number"
                        :min="1" :max="20" :step="1" controls-position="right" />
                    </div>
                    <div class="flex flex-col gap-3">
                      <h4 class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Slider Color</h4>
                      <div
                        class="border border-white/10 rounded-xl p-1.5 bg-white/5 w-fit hover:border-white/20 transition-colors">
                        <el-color-picker v-model="visualProps.playtimeSliderColor" show-alpha
                          :predefine="predefineColors" />
                      </div>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Bottom Fade -->
      <div
        class="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-80">
      </div>
    </section>
  </div>
</template>
