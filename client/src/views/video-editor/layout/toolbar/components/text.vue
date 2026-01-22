<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { AlignTextCenter as AlignCenter, AlignTextBoth as AlignJustify, AlignTextLeft as AlignLeft, AlignTextRight as AlignRight, SortAmountDown as ArrowDownZA, TextBold as Bold, Down as ChevronDown, Up as ChevronUp, TextItalic as Italic, AddText as Ligature, TextUnderline as Underline, Word as WholeWord } from '@icon-park/vue-next';

import Toggle from 'video-editor/components/ui/toggle.vue';
import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';

import { fontSizes } from 'video-editor/constants/editor';
import { useEditorStore } from 'video-editor/store/editor';
import { cn } from 'video-editor/lib/utils';
import { useCanvasStore } from "video-editor/store/canvas";
import { storeToRefs } from "pinia";

import ToolbarFillOption from '../common/fill.vue';
import ToolbarStrokeOption from '../common/stroke.vue';
import ToolbarTimelineOption from '../common/timeline.vue';
import ToolbarOpacityOption from '../common/opacity.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: active } = storeToRefs(canvasStore);

const fontSize = computed({
  get(){
    return active.value?.fontSize * active.value?.scaleY;
  },

  set(value){
    console.log(value);
    canvas.value.onChangeActiveTextboxProperty('fontSize', Number(value) / active.value?.scaleY)
  }
});

const fontWeight = computed({
  get(){
    return (active.value?.fontWeight == 700);
  },

  set(value){
    console.log(value);
    canvas.value.onChangeActiveTextboxProperty('fontWeight', value ? 700 : 400)
  }
});

const fontStyle = computed({
  get(){
    return (active.value?.fontStyle == 'italic');
  },

  set(value){
    console.log(value);
    canvas.value.onChangeActiveTextboxProperty('fontStyle', value ? 'italic' : 'normal')
  }
});

const underline = computed({
  get(){
    return active.value?.underline;
  },

  set(value){
    canvas.value.onChangeActiveTextboxProperty('underline', value)
  }
});

const textAlign = computed({
  get(){
    return active.value?.textAlign;
  },

  set(value){
    console.log(value);
    canvas.value.onChangeActiveTextboxProperty('textAlign', value)
  }
});

const textTransform = computed({
  get(){
    return active.value?.textTransform;
  },

  set(value){
    canvas.value.onChangeActiveTextboxProperty('textTransform', value)
  }
});

const textUpper = computed({
  get(){
    return textTransform.value == 'uppercase';
  },

  set(value){
    textTransform.value = value ? 'uppercase' : '';
    // canvas.value.onChangeActiveTextboxProperty('textTransform', value)
  }
});

const textLower = computed({
  get(){
    return textTransform.value == 'lowercase';
  },

  set(value){
    textTransform.value = value ? 'lowercase' : '';
    // canvas.value.onChangeActiveTextboxProperty('textTransform', value)
  }
});

const charSpacing = computed({
  get(){
    return active.value?.charSpacing;
  },

  set(value){
    canvas.value.onChangeActiveTextboxProperty('charSpacing', value)
  }
});

const lineHeight = computed({
  get(){
    return active.value?.lineHeight;
  },

  set(value){
    canvas.value.onChangeActiveTextboxProperty('lineHeight', value)
  }
});

const textAlignOptions = [
  {
    value: 'left',
    icon: AlignLeft
  },
  {
    value: 'center',
    icon: AlignCenter
  },
  {
    value: 'right',
    icon: AlignRight
  },
  // {
  //   value: 'justify',
  //   icon: AlignJustify
  // }
];

// const textTransformOptions = [
//   {
//     value: 'uppercase',
//     icon: CaseUpper
//   },
//   {
//     value: 'lowercase',
//     icon: CaseLower
//   },
// ];

</script>

<template>
  <div class="flex items-center h-full w-full overflow-x-auto custom-scrollbar flex-nowrap gap-3.5 px-1 py-1">
    <!-- Font Family Selector -->
    <div class="flex items-center gap-2">
      <button 
        class="flex items-center gap-2.5 h-9 px-3.5 rounded-xl border border-white/5 bg-white/5 transition-all duration-300 min-w-[130px] max-w-[160px] group hover:border-white/20 hover:bg-white/10"
        :class="{ '!bg-brand-primary/10 !border-brand-primary/30': editor.sidebarRight === 'fonts' }"
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'fonts' ? null : 'fonts')"
      >
        <span class="text-[11px] font-bold uppercase tracking-wider truncate flex-1 text-start" :class="editor.sidebarRight === 'fonts' ? 'text-brand-primary' : 'text-white/80'">
            {{ active.fontFamily || 'Inter' }}
        </span>
        <ChevronDown :size="14" class="opacity-40 group-hover:opacity-100 transition-opacity" />
      </button>

      <!-- Font Size Input -->
      <div class="relative flex items-center bg-white/5 rounded-xl border border-white/5 h-9 group transition-all duration-300 hover:border-white/10 hover:bg-white/10">
        <el-input-number 
          class="!h-full !w-[75px] cinematic-input-number-ghost"
          type="number" :controls="false"
          v-model="fontSize"
        />
        <div class="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/30 pointer-events-none">PX</div>
        
        <el-dropdown class="!absolute right-0 top-1/2 -translate-y-1/2 h-full flex items-center pr-1" @command="(value) => fontSize = value" trigger="click">
          <button class="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all">
             <ChevronDown :size="12" />
          </button>
          <template #dropdown>
            <el-dropdown-menu class="min-w-[100px] max-h-64 overflow-y-auto cinematic-dropdown">
              <el-dropdown-item v-for="size in fontSizes" :key="size" class="text-[10px] font-bold py-2 !justify-center" :command="size">
                {{ size }} PX
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0" />

    <!-- Text Formatting Toggles -->
    <div class="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1">
      <Toggle v-model="fontWeight" :icon="Bold" class="cinematic-toggle" size="medium" @toggle="value => fontWeight = value" />
      <Toggle v-model="fontStyle" :icon="Italic" class="cinematic-toggle" size="medium" @toggle="value => fontStyle = value" />
      <Toggle v-model="underline" :icon="Underline" class="cinematic-toggle" size="medium" @toggle="value => underline = value" />
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0" />

    <!-- Text Alignment -->
    <div class="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1">
       <button 
         v-for="opt in textAlignOptions" 
         :key="opt.value"
         @click="textAlign = opt.value"
         class="h-8 w-8 flex items-center justify-center rounded-lg transition-all duration-300 group"
         :class="[textAlign === opt.value ? 'bg-brand-primary text-black shadow-lg shadow-brand-primary/20' : 'text-white/40 hover:text-white hover:bg-white/10']"
       >
         <component :is="opt.icon" :size="15" :stroke-width="4" />
       </button>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0" />

    <!-- Text Case -->
    <div class="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1">
      <Toggle :modelValue="textTransform == 'uppercase'" class="cinematic-toggle w-10 !h-8" size="medium" @toggle="value => textTransform = value ? 'uppercase' : ''">
        <span class="text-[10px] font-black tracking-tighter">ABC</span>
      </Toggle>
      <Toggle :modelValue="textTransform == 'lowercase'" class="cinematic-toggle w-10 !h-8" size="medium" @toggle="value => textTransform = value ? 'lowercase' : ''">
        <span class="text-[10px] font-bold tracking-tighter">abc</span>
      </Toggle>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0" />

    <!-- Spacing Popovers -->
    <div class="flex items-center gap-1.5">
      <el-popover placement="bottom" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
        <template #reference>
          <button class="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white transition-all">
            <WholeWord :size="16" />
          </button>
        </template>
        <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
            <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Character Spacing</span>
            </div>
            <div class="p-5 flex flex-col gap-4">
                <div class="flex justify-between mb-1">
                    <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Spacing</Label>
                    <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ charSpacing }}</span>
                </div>
                <SliderInput :model-value="charSpacing" :min="0" :max="500" :step="1" @update:model-value="(value) => charSpacing = value"/>
            </div>
        </div>
      </el-popover>
      
      <el-popover placement="bottom" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
        <template #reference>
           <button class="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-transparent hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white transition-all">
            <ArrowDownZA :size="16" />
          </button>
        </template>
        <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
            <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Line Height</span>
            </div>
            <div class="p-5 flex flex-col gap-4">
                <div class="flex justify-between mb-1">
                    <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Height Scale</Label>
                    <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ lineHeight?.toFixed(2) }}</span>
                </div>
                <SliderInput :model-value="lineHeight" :min="0.5" :max="3.0" :step="0.01" @update:model-value="(value) => lineHeight = value"/>
            </div>
        </div>
      </el-popover>
    </div>

    <div class="w-px h-6 bg-white/10 shrink-0 mx-1" />
    
    <!-- Option Modules -->
    <div class="flex items-center gap-1">
        <ToolbarFillOption />
        <ToolbarStrokeOption />
        <ToolbarOpacityOption />
        <ToolbarTimelineOption />
    </div>
  </div>
</template>

<style scoped>
.cinematic-input-number-ghost :deep(.el-input__wrapper) {
  background-color: transparent !important;
  box-shadow: none !important;
  padding-left: 12px;
  padding-right: 28px;
}
.cinematic-input-number-ghost :deep(.el-input__inner) {
  color: white;
  font-family: inherit;
  font-weight: 800;
  font-size: 11px;
  text-align: left;
}
</style>