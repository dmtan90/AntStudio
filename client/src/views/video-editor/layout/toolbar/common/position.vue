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
  <div class="flex items-center">
    <el-dropdown trigger="click" popper-class="cinematic-dropdown">
      <button class="cinematic-button !h-9 !w-9 !p-0 !rounded-xl border-white/5 bg-white/5 flex items-center justify-center transition-all duration-300 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white shadow-sm active:scale-90">
        <BoxSelect :size="16" stroke-width="4" />
      </button>
      <template #dropdown>
        <el-dropdown-menu class="cinematic-dropdown-menu">
          <div class="px-4 py-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] border-b border-white/5 mb-1">Layer Ordering</div>
          <el-dropdown-item v-for="({ label, value }) in move" :key="value" @click="handleMoveLayer(value)">
            <span class="text-[10px] font-bold uppercase tracking-widest py-1">{{ label }}</span>
          </el-dropdown-item>
          <div class="px-4 py-2 mt-2 text-[9px] font-bold text-white/20 uppercase tracking-[0.2em] border-b border-white/5 mb-1">Alignment</div>
          <el-dropdown-item v-for="({ label, value }) in align" :key="value" @click="handleAlignToPage(value)">
             <span class="text-[10px] font-bold uppercase tracking-widest py-1">{{ label }}</span>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>