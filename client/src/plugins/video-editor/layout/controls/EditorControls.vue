<script setup lang="ts">
import { computed, ref, watch, reactive } from 'vue';
import { clamp } from 'lodash';
import { Motion, AnimatePresence } from 'motion-v'
import { Check, Copy, Peoples as GroupIcon, LinkOne as LinkIcon, 
  Write as PencilIcon, Transform as RepeatIcon, SendToBack as SendToBackIcon, 
  MagicWand as SparklesIcon, Delete as Trash2Icon, FlipHorizontally, FlipVertically } from '@icon-park/vue-next';

import { useEditorStore } from 'video-editor/store/editor';
import { FabricUtils } from 'video-editor/fabric/utils';
import { storeToRefs } from "pinia"
import { useCanvasStore } from "video-editor/store/canvas";

import { align, move, placeholders } from 'video-editor/constants/editor';
import { cn } from '@/utils/ui';

const MENU_OFFSET_Y = 60;

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { mode } = storeToRefs(editor);
const { canvas, selectionActive: active, workspace, instance, selection } = storeToRefs(canvasStore);
const style = reactive({
  top: '0px',
  left: '0px'
});

watch([canvas, active, workspace, instance], () => {
  computeStyle();
})

// canvasStore.$subscribe((mutation, state) => {
//   computeStyle();
// });

// const active = computed(() => selection?.value?.active);

const computeStyle = () => {
  const selected = instance.value?.getActiveObject();
  if (!selected || !workspace.value || !instance.value) return;

  const viewport = workspace.value?.viewportTransform;

  if (!viewport) return {};

  const offsetX = viewport[4];
  const offsetY = viewport[5];

  const top = offsetY + selected.getBoundingRect(true).top * workspace.value.zoom - MENU_OFFSET_Y;
  const left = offsetX + selected.getBoundingRect(true).left * workspace.value.zoom + ((selected.width * selected.scaleX) / 2) * workspace.value.zoom;
  if(active.value?.type == "line"){
    style.top = `${clamp(top, MENU_OFFSET_Y / 4, instance.value.height - MENU_OFFSET_Y - 40)}px`
  }
  else{
    style.top = `${clamp(top, MENU_OFFSET_Y / 4, instance.value.height - MENU_OFFSET_Y)}px`
  }
  
  style.left = `${clamp(left, MENU_OFFSET_Y * 2.5, instance.value.width - MENU_OFFSET_Y * 2.5)}px`
};

const handleReplaceObject = () => {
  if (canvas.value.replacer.active) {
    canvas.value.replacer.mark(null);
  } else {
    const replace = canvas.value.replacer.mark(instance.value.getActiveObject());
    if (replace) editor.setActiveSidebarLeft(`${replace.type == 'gif' ? 'element' : replace.type}`);
  }
};

const showControls = computed(() => {
  return (
    active.value &&
    workspace.value &&
    canvas.value.controls &&
    !canvas.value?.cropper.active &&
    active.value.type !== "audio" && active.value.type !== "chart"
  );
});

</script>

<template>
  <AnimatePresence>
    <Motion
      :initial="{ opacity: 0, scale: 0.9, y: 10 }" :animate="{ opacity: 1, scale: 1, y: 0 }" :exit="{ opacity: 0, scale: 0.9, y: 10 }"
      v-if="showControls"
      :style="style"
      class="absolute bg-[#0a0a0a]/90 backdrop-blur-2xl border border-white/5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-full outline-none items-center flex -translate-x-1/2 z-[100] p-1.5 gap-1.5 ring-1 ring-white/5"
    >
      <!-- AI Magic Quick Action -->
      <div v-if="(active.type === 'textbox' || active.type === 'image' || active.type === 'video')" class="flex items-center pl-1">
        <el-button @click="editor.setActiveSidebarRight('ai')" class="cinematic-button !h-8 !px-4 !rounded-full !bg-brand-primary/20 !border-brand-primary/30 !text-brand-primary hover:!bg-brand-primary/40 hover:!text-white hover:!border-brand-primary/50 gap-2 !transition-all duration-300 group shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:shadow-[0_0_20px_rgba(59,130,246,0.5)]">
          <SparklesIcon :size="14" class="group-hover:rotate-12 transition-transform" :stroke-width="4" />
          <span class="text-[10px] font-black uppercase tracking-widest">AI Magic</span>
        </el-button>
        <div class="w-px h-5 bg-white/10 mx-1.5" />
      </div>

      <!-- Context Specific Actions -->
      <div class="flex items-center gap-1">
        <div v-if="active.meta?.group" class="flex items-center">
          <el-button text class="cinematic-button !h-8 !px-3 !rounded-full gap-2" @click="selection.selectMetaGroup(active.meta.group)">
            <GroupIcon :size="14" :stroke-width="4" />
            <span class="text-[10px] font-black uppercase tracking-widest">Group</span>
          </el-button>
        </div>

        <div v-if="FabricUtils.isTextboxElement(active)" class="flex items-center">
          <el-button
            v-if="active.isEditing"
            text
            class="cinematic-button !h-8 !px-3 !rounded-full gap-2 !bg-brand-primary/20 !text-brand-primary !border-brand-primary/20"
            @click="canvas.onExitActiveTextboxEdit()"
          >
            <Check :size="14" :stroke-width="5" />
            <span class="text-[10px] font-black uppercase tracking-widest">Done</span>
          </el-button>
          <el-button
            v-else
            text
            class="cinematic-button !h-8 !px-3 !rounded-full gap-2"
            @click="canvas.onEnterActiveTextboxEdit()"
          >
            <PencilIcon :size="14" :stroke-width="4" />
            <span class="text-[10px] font-black uppercase tracking-widest">Edit</span>
          </el-button>
        </div>

        <div v-else-if="active.type === 'image' || active.type === 'gif' || active.type === 'video'" class="flex items-center" @click="handleReplaceObject">
          <el-button :class="cn('cinematic-button !h-8 !px-3 !rounded-full gap-2', canvas.replacer.active ? '!bg-brand-primary/20 !text-brand-primary !border-brand-primary/30' : '')" text>
            <RepeatIcon :size="14" :stroke-width="4" />
            <span class="text-[10px] font-black uppercase tracking-widest">Replace</span>
          </el-button>
        </div>

        <div v-if="mode === 'creator'" class="flex items-center">
          <el-dropdown :hide-on-click="false" max-height="250px" popper-class="cinematic-dropdown">
            <el-button :class="cn('cinematic-button !h-8 !px-3 !rounded-full gap-2 transition-all', active.meta?.label ? '!bg-violet-600/20 !text-violet-400 !border-violet-500/30' : '')" text>
              <LinkIcon :size="14" :stroke-width="4" />
              <span class="text-[10px] font-black uppercase tracking-widest">Tag</span>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="placeholder in placeholders" :key="placeholder.value">
                  <el-checkbox
                    :model-value="active.meta?.label === placeholder.value"
                    @change="(value) => canvas.onMarkActiveObjectAsPlaceholder(!value ? false : placeholder.value)"
                  >
                    {{ placeholder.label }}
                  </el-checkbox>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <div class="w-px h-5 bg-white/10 mx-0.5" />

      <!-- Layer & Position Tools -->
      <div class="flex items-center gap-1 px-0.5">
        <el-dropdown max-height="300px" popper-class="cinematic-dropdown overflow-hidden">
          <el-button class="cinematic-button !h-8 !w-8 !p-0 !rounded-full">
            <SendToBackIcon :size="14" :stroke-width="4" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <div class="px-3 py-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Arrangement</div>
              <el-dropdown-item
                v-for="({ label, value, icon }) in move"
                :key="value"
                @click="canvas.alignment.changeActiveObjectLayer(value)"
                class="gap-3 py-2"
              >
                <component :is="icon" :size="14" class="opacity-70" />
                <span class="text-[11px] font-bold">{{ label }}</span>
              </el-dropdown-item>
              <el-divider class="!my-1 !border-white/5" />
              <div class="px-3 py-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Alignment</div>
              <el-dropdown-item
                v-for="({ label, value, icon }) in align"
                :key="value"
                @click="canvas.alignment.alignActiveObjecToPage(value)"
                class="gap-3 py-2"
              >
                <component :is="icon" :size="14" class="opacity-70" />
                <span class="text-[11px] font-bold">{{ label }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <el-dropdown max-height="300px" popper-class="cinematic-dropdown overflow-hidden">
          <el-button class="cinematic-button !h-8 !w-8 !p-0 !rounded-full">
            <FlipHorizontally :size="14" :stroke-width="4" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <div class="px-3 py-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em]">Transform</div>
              <el-dropdown-item class="gap-3 py-2" :icon="FlipHorizontally" @click="canvas.instance.getActiveObject()?.set('flipX', !canvas.instance.getActiveObject()?.flipX).canvas?.requestRenderAll()">
                <span class="text-[11px] font-bold">Flip Horizontal</span>
              </el-dropdown-item>
              <el-dropdown-item class="gap-3 py-2" :icon="FlipVertically" @click="canvas.instance.getActiveObject()?.set('flipY', !canvas.instance.getActiveObject()?.flipY).canvas?.requestRenderAll()">
                <span class="text-[11px] font-bold">Flip Vertical</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <div class="w-px h-5 bg-white/10 mx-0.5" />

      <!-- Core Actions (Clone, Delete) -->
      <div class="flex items-center gap-1 pr-1">
        <el-button @click="canvas.cloner.clone()" :disabled="active.meta?.thumbnail" class="cinematic-button !h-8 !w-8 !p-0 !rounded-full group/clone">
          <Copy :size="14" :stroke-width="4" class="group-hover:scale-110 transition-transform" />
        </el-button>
        <el-button @click="canvas.onDeleteActiveObject()" class="cinematic-button !h-8 !w-8 !p-0 !rounded-full !border-red-500/20 !text-red-400 hover:!bg-red-500/20 hover:!text-red-200 hover:!border-red-500/40 group/trash">
          <Trash2Icon :size="14" :stroke-width="4" class="group-hover:scale-110 group-hover:rotate-6 transition-transform" />
        </el-button>
      </div>
    </Motion>
  </AnimatePresence>
</template>