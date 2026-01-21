<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, ColorFilter as Pipette, Close as X } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { ChromePicker, ColorResult, tinycolor } from 'vue-color';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { cn, createInstance } from 'video-editor/lib/utils';
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
  get(){
    return selected.value?.visualType;
  },

  set(value){
    canvas.value.onChangeActiveObjectProperty("visualType", value);
    // selected.value?.visualType = value;
  }
})

const visualProps = computed({
  get(){
    return selected.value?.visualProps;
  },

  set(value){
    // selected.value?.visualProps = value;
    canvas.value.onChangeActiveObjectProperty("visualProps", value);
  }
})

// const playtimeFont = computed({
//   get(){
//     let font = (visualProps.value?.playtimeFont ?? "18px Monaco").split(" ");
//     return {
//       size: parseInt(font[0]),
//       family: font[1]
//     }
//   },

//   set({size: number, family: string}){
//     visualProps.value.playtimeFont = size + "px " + family;
//     canvas.value.onChangeActiveObjectProperty("visualProps", visualProps.value);
//   }
// });

watch(visualProps, (value) => {
  // console.log("visualProps", value);
  // const object = canvas.value.instance.getItemByName(selected.value.name);
  // object?.set("visualProps", value);
  // selected.value?.update();
  // canvas.value.re
  canvas.value.onChangeActiveObjectProperty("visualProps", value);
}, { deep: true });

const predefineColors = ref(['#E63415', '#FF6600', '#FFDE0A', '#1EC79D', '#14CCCC', '#4167F0', '#6222C9']);

</script>

<template>
  <div class="h-full w-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Visual</h2>
      <el-button circle text class="ml-auto h-7 w-7" @click="canvas.onChangeActiveObjectProperty('visible', disabled)">
        <template v-if="disabled">
          <EyeOff :size="15" :stroke-width="2" />
        </template>
        <template v-else>
          <Eye :size="15" :stroke-width="2" />
        </template>
      </el-button>
      <el-button plain circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarRight(null)">
        <X :size="15" />
      </el-button>
    </div>
    <section class="sidebar-container">
      <div :class="cn('px-4 py-4 flex flex-col', !disabled ? 'opacity-100 pointer-events-auto' : 'opacity-50 pointer-events-none')">
        <div class="pb-4 grid grid-cols-2 gap-2 items-center">
          <h4 class="text-xs font-semibold line-clamp-1">Wave Type</h4>
          <el-select v-model="visualType" class="w-full">
            <el-option value="bars" label="Bars" />
            <el-option value="circle" label="Circle" />
            <el-option value="line" label="Line" />
            <el-option value="waveform" label="Waveform" />
          </el-select>
        </div>
        <template v-if="visualType == 'bars'">
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Bar Width</h4>
            <el-input-number v-model="visualProps.barWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Bar Space</h4>
            <el-input-number v-model="visualProps.barSpace" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Bar Color</h4>
            <el-color-picker v-model="visualProps.barColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Caps Height</h4>
            <el-input-number v-model="visualProps.capsHeight" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Caps Drop Speed</h4>
            <el-input-number v-model="visualProps.capsDropSpeed" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Caps Color</h4>
            <el-color-picker v-model="visualProps.capsColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Brick Height</h4>
            <el-input-number v-model="visualProps.brickHeight" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Brick Space</h4>
            <el-input-number v-model="visualProps.brickSpace" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Symmetric</h4>
            <el-switch v-model="visualProps.symmetric" />
          </div>
        </template>
        <template v-if="visualType == 'circle'">
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Width</h4>
            <el-input-number v-model="visualProps.lineWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Space</h4>
            <el-input-number v-model="visualProps.lineSpace" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Outline Color</h4>
            <el-color-picker v-model="visualProps.outlineColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Outline Width</h4>
            <el-input-number v-model="visualProps.outlineWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Bar Width</h4>
            <el-input-number v-model="visualProps.barWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Bar Color</h4>
            <el-color-picker v-model="visualProps.barColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Progress</h4>
            <el-switch v-model="visualProps.progress" />
          </div>
          <template v-if="visualProps.progress">
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Progress Width</h4>
              <el-input-number v-model="visualProps.progressWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Progress Color</h4>
              <el-color-picker v-model="visualProps.progressColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Progress Clockwise</h4>
              <el-switch v-model="visualProps.progressClockwise" />
            </div>
          </template>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Outline Meter Space</h4>
            <el-input-number v-model="visualProps.outlineMeterSpace" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Playtime</h4>
            <el-switch v-model="visualProps.playtime" />
          </div>
          <template v-if="visualProps.playtime">
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Font Size</h4>
              <el-input-number v-model="visualProps.playtimeFontSize" class="w-full" :min="1" :max="100" :step="1" controls-position="right"/>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Font Family</h4>
              <el-select v-model="visualProps.playtimeFontFamily" class="w-full">
                <el-option v-for="font in fonts" :key="font.family" :value="font.family" :label="font.family" class="capitalize" :style="{ fontFamily: font.family }"></el-option>
              </el-select>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Color</h4>
              <el-color-picker v-model="visualProps.playtimeColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
            </div>
          </template>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Rotate Graph</h4>
            <el-switch v-model="visualProps.rotateGraph" />
          </div>
          <!--<div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Rotate Speed</h4>
            <el-input-number v-model="visualProps.rotateSpeed" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>-->
        </template>
        <template v-if="visualType == 'line'">
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Width</h4>
            <el-input-number v-model="visualProps.lineWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Color</h4>
            <el-color-picker v-model="visualProps.lineColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
        </template>
        <template v-if="visualType == 'waveform'">
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Width</h4>
            <el-input-number v-model="visualProps.noplayedLineWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Line Color</h4>
            <el-color-picker v-model="visualProps.noplayedLineColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Played Line Width</h4>
            <el-input-number v-model="visualProps.playedLineWidth" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Played Line Color</h4>
            <el-color-picker v-model="visualProps.playedLineColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
          </div>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Playtime</h4>
            <el-switch v-model="visualProps.playtime" />
          </div>
          <template v-if="visualProps.playtime">
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime With Ms</h4>
              <el-switch v-model="visualProps.playtimeWithMs" />
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Font Size</h4>
              <el-input-number v-model="visualProps.playtimeFontSize" class="w-full" :min="1" :max="100" :step="1" controls-position="right"/>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Font Family</h4>
              <el-select v-model="visualProps.playtimeFontFamily" class="w-full">
                <el-option v-for="font in fonts" :key="font.family" :value="font.family" :label="font.family" class="capitalize" :style="{ fontFamily: font.family }"></el-option>
              </el-select>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Color</h4>
              <el-color-picker v-model="visualProps.playtimeFontColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Text Bottom</h4>
              <el-switch v-model="visualProps.playtimeTextBottom" />
            </div>
          </template>
          <div class="pb-4 grid grid-cols-2 gap-2 items-center">
            <h4 class="text-xs font-semibold line-clamp-1">Playtime Slider</h4>
            <el-switch v-model="visualProps.playtimeSlider" />
          </div>
          <template v-if="visualProps.playtimeSlider">
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Slider Width</h4>
              <el-input-number v-model="visualProps.playtimeSliderWitdh" class="w-full" :min="1" :max="20" :step="1" controls-position="right"/>
            </div>
            <div class="pb-4 grid grid-cols-2 gap-2 items-center">
              <h4 class="text-xs font-semibold line-clamp-1">Playtime Slider Color</h4>
              <el-color-picker v-model="visualProps.playtimeSliderColor" class="justify-self-start" show-alpha :predefine="predefineColors" />
            </div>
          </template>
        </template>
      </div>
    </section>
  </div>
</template>
