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
import { cn } from 'video-editor/lib/utils';

const MENU_OFFSET_Y = 60;

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { mode } = storeToRefs(editor as any);
const { canvas, selectionActive: active, workspace, instance, selection } = storeToRefs(canvasStore as any);
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
    if (replace) editor.setActiveSidebarLeft(`${replace.type == 'gif' ? 'element' : replace.type}s`);
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
      :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
      v-if="showControls"
      :style="style"
      class="absolute border bg-popover text-popover-foreground shadow rounded-full outline-none items-center divide-x flex -translate-x-1/2 z-20"
    >
      <div v-if="active.meta?.group" class="flex items-center p-1">
        <el-button text round class="gap-1.5 h-7 px-2" @click="selection.selectMetaGroup(active.meta.group)">
          <GroupIcon :size="14" />
          <span>Select Group</span>
        </el-button>
      </div>

      <div v-if="(active.type === 'textbox' || active.type === 'image' || active.type === 'video')" class="flex items-center p-1">
        <el-button text round class="gap-1.5 h-7 px-2" @click="editor.setActiveSidebarRight('ai')">
          <SparklesIcon :size="14" />
          <span>AI Magic</span>
        </el-button>
      </div>

      <div v-if="FabricUtils.isTextboxElement(active)" class="flex items-center p-1">
        <el-button
          v-if="active.isEditing"
          text round
          class="gap-1.5 h-7 px-2"
          @click="canvas.onExitActiveTextboxEdit()"
        >
          <Check :size="14" />
          <span>Finish</span>
        </el-button>
        <el-button
          v-else
          text round
          class="gap-1.5 h-7 px-2"
          @click="canvas.onEnterActiveTextboxEdit()"
        >
          <PencilIcon :size="14" />
          <span>Edit</span>
        </el-button>
      </div>

      <div v-else-if="active.type === 'image' || active.type === 'gif' || active.type === 'video'" class="flex items-center p-1" @click="handleReplaceObject">
        <el-button :type="canvas.replacer.active ? 'info' : ''" text round class="gap-1.5 h-7 px-2 transition-none">
          <RepeatIcon :size="14" />
          <span>Replace</span>
        </el-button>
      </div>

      <div v-if="mode === 'creator'" class="flex items-center p-1">
        <el-dropdown :hide-on-click="false" max-height="200px">
          <el-button text round :class="cn('gap-1.5 px-2 transition-none', active.meta?.label ? 'bg-violet-600 text-white hover:bg-violet-700 hover:text-white' : '')">
            <LinkIcon :size="14" />
            <span>Placeholder</span>
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

      <div class="flex items-center gap-0 p-1">
        <el-button text circle class="h-7 w-7" @click="canvas.cloner.clone()" :disabled="active.meta?.thumbnail">
          <Copy :size="14" />
        </el-button>
        <el-button type="danger" text circle class="h-7 w-7" @click="canvas.onDeleteActiveObject()">
          <Trash2Icon :size="14" />
        </el-button>
      </div>

      <div class="flex items-center gap-1 p-1">
        <el-dropdown max-height="200px">
          <el-button text circle class="h-7 w-7">
            <SendToBackIcon :size="14" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled class="text-xs">Move</el-dropdown-item>
              <el-dropdown-item
                v-for="({ label, value, icon }) in move"
                :key="value"
                @click="canvas.alignment.changeActiveObjectLayer(value)"
                class="text-xs"
                :icon="icon"
              >
                {{ label }}
              </el-dropdown-item>
              <el-divider />
              <el-dropdown-item disabled class="text-xs">Align to Page</el-dropdown-item>
              <el-dropdown-item
                v-for="({ label, value, icon }) in align"
                :key="value"
                @click="canvas.alignment.alignActiveObjecToPage(value)"
                class="text-xs"
                :icon="icon"
              >
                {{ label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-dropdown max-height="200px">
          <el-button text circle class="h-7 w-7">
            <FlipHorizontally :size="14" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item disabled class="text-xs">Flip</el-dropdown-item>
              <el-dropdown-item class="text-xs" :icon="FlipHorizontally">Horizontally</el-dropdown-item>
              <el-dropdown-item class="text-xs" :icon="FlipVertically">Vertically</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </Motion>
  </AnimatePresence>
</template>