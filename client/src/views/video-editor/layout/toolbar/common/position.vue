<script setup lang="ts">
import { BoundingBox as BoxSelect } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { align, move } from 'video-editor/constants/editor';

const editor = useEditorStore();

const handleMoveLayer = (type: "up" | "down" | "bottom" | "top") => {
  editor.canvas.alignment.changeActiveObjectLayer(type);
};

const handleAlignToPage = (type: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
  editor.canvas.alignment.alignActiveObjecToPage(type);
};

</script>

<template>
  <div class="flex items-center gap-2.5">
    <el-dropdown>
      <el-button plain class="px-2.5">
        <BoxSelect :size="15" :stroke-width="1.5" />
      </el-button>
      <template #dropdown>
        <el-dropdown-menu class="min-w-48">
          <el-dropdown-item disabled class="text-xs">Move</el-dropdown-item>
          <el-dropdown-item v-for="({ label, value }) in move" :key="value" @click="handleMoveLayer(value)" class="text-xs">
            {{ label }}
          </el-dropdown-item>
          <el-divider />
          <el-dropdown-item disabled class="text-xs">Align to Page</el-dropdown-item>
          <el-dropdown-item v-for="({ label, value }) in align" :key="value" @click="handleAlignToPage(value)" class="text-xs">
            {{ label }}
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>