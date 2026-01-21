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
  <div class="flex items-center h-full w-full overflow-x-scroll scrollbar-hidden text-toolbar">
    <div class="flex items-center gap-2">
      <el-button :icon="Ligature"
        text bg round
        :class="cn('px-2.5', editor.sidebarRight === 'fonts' ? 'bg-card' : '')"
        @click="editor.setActiveSidebarRight(editor.sidebarRight === 'fonts' ? null : 'fonts')"
      >
        <span class="text-start text-ellipsis whitespace-nowrap overflow-hidden w-20">{{ active.fontFamily || 'Inter' }}</span>
        <ChevronDown :size="15" class="ml-auto shrink-0" />
      </el-button>
      <div class="relative" style="background-color: var(--el-fill-color-light); border-radius: 20px; --el-border-color: transparent; --el-border-radius-base: 20px;">
        <el-input-number 
          class="!h-8 !w-25 text-xs stepper-hidden"
          type="number" :controls="false" style="--el-input-bg-color: transparent"
          v-model="fontSize">
          <template #suffix>
            <span class="mr-5 text-xs">px</span>
          </template>
        </el-input-number>
        <el-dropdown class="!absolute right-1.5 top-1/2 -translate-y-1/2" @command="(value) => fontSize = value">
          <el-button size="small" :icon="ChevronDown" plain circle style="--el-button-bg-color: transparent" />
          <template #dropdown>
            <el-dropdown-menu class="min-w-24 max-h-64 overflow-y-auto">
              <el-dropdown-item v-for="size in fontSizes" :key="size" class="text-xs pl-2.5" :command="size">
                {{ size }} px
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <el-button-group class="flex">
      <Toggle v-model="fontWeight" :icon="Bold" text bg round class="!h-8 !w-8" size="small" @toggle="value => fontWeight = value">
      </Toggle>
      <Toggle v-model="fontStyle" :icon="Italic" text bg round class="!h-8 !w-8" size="small" @toggle="value => fontStyle = value">
      </Toggle>
      <Toggle v-model="underline" :icon="Underline" text bg round class="!h-8 !w-8" size="small" @toggle="value => underline = value">
      </Toggle>
    </el-button-group>
    <el-divider direction="vertical" class="h-8" />
    <el-segmented v-model="textAlign" :options="textAlignOptions" size="small" class="items-center flex-nowrap h-8">
      <template #default="scope">
        <div class="flex flex-col items-center gap-2 p-2">
          <component :is="scope.item.icon" :size="15" class="px-0 py-0"/>
        </div>
      </template>
    </el-segmented>
    <el-divider direction="vertical" class="h-8" />
    <el-button-group class="flex">
      <Toggle :modelValue="textTransform == 'uppercase'" text bg round class="!h-8 !w-10" size="small" @toggle="value => textTransform = value ? 'uppercase' : ''">
        <span>ABC</span>
      </Toggle>
      <Toggle :modelValue="textTransform == 'lowercase'" text bg round class="!h-8 !w-10" size="small" @toggle="value => textTransform = value ? 'lowercase' : ''">
        <span>abc</span>
      </Toggle>
    </el-button-group>
    <el-divider direction="vertical" class="h-8" />
    <div class="flex items-center">
      <el-popover placement="bottom" trigger="click" width="200px">
        <template #reference>
          <el-button :icon="WholeWord" text bg round aria-label="letter-spacing" class="px-2.5" />
        </template>
        <Label class="text-xs font-medium">Letter Spacing</Label>
        <div class="flex items-center justify-between gap-4">
          <SliderInput :model-value="charSpacing" :min="0" :max="100" :step="1" @update:model-value="(value) => charSpacing = value"/>
        </div>
      </el-popover>
      <el-popover placement="bottom" trigger="click" width="200px">
        <template #reference>
          <el-button :icon="ArrowDownZA" text bg round aria-label="line-height" class="px-2.5" />
        </template>
        <Label class="text-xs font-medium">Line Height</Label>
        <div class="flex items-center justify-between gap-4">
          <SliderInput :model-value="lineHeight" :min="0.5" :max="2.5" :step="0.02" @update:model-value="(value) => lineHeight = value"/>
        </div>
      </el-popover>
    </div>
    <el-divider direction="vertical" class="h-8" />
    <ToolbarFillOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarStrokeOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarOpacityOption />
    <el-divider direction="vertical" class="h-8" />
    <ToolbarTimelineOption />
  </div>
</template>

<style>
.text-toolbar {
  .el-segmented {
    --el-segmented-item-selected-color: var(--el-color-primary) !important;
    --el-segmented-item-selected-bg-color: var(--el-fill-color-light) !important;
    --el-border-radius-base: 16px !important;
    .el-segmented__item {
      padding: 1px !important;
    }
  }
}
</style>