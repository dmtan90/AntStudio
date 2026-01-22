<script setup lang="ts">
import { computed, ref } from 'vue';
import { Search, Close as X } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import bar from 'video-editor/assets/editor/charts/bar.svg';

const editor = useEditorStore();

const addChart = (type: string) => {
  (editor.canvas as any).chart.add(type);
};
</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Charts</h2>
      <button
        class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>
    <section class="flex-1 overflow-y-auto custom-scrollbar">
      <div class="px-5 pt-4 pb-4">
        <el-input placeholder="Search charts..." class="cinematic-input">
          <template #prefix>
            <Search :size="15" class="text-white/40" />
          </template>
        </el-input>
      </div>
      <div class="px-5 flex flex-col gap-6">
        <div class="flex flex-col gap-4">
          <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Basic Charts</h4>
          <div class="grid grid-cols-3 gap-3">
            <!-- Bar Chart -->
            <div class="flex flex-col gap-2 items-center group/item">
              <button @click="addChart('bar')"
                class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 transition-all duration-300 shadow-sm hover:bg-white/10 hover:border-white/20 hover:scale-105">
                <img :src="bar" alt="bar-chart"
                  class="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
              <span
                class="text-[9px] text-center font-bold text-white/40 uppercase tracking-wider w-full px-1 mx-auto whitespace-nowrap overflow-hidden text-ellipsis group-hover/item:text-white/90 transition-colors">Bar</span>
            </div>

            <!-- Line Chart -->
            <div class="flex flex-col gap-2 items-center group/item">
              <button @click="addChart('line')"
                class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 transition-all duration-300 shadow-sm hover:bg-white/10 hover:border-white/20 hover:scale-105">
                <img :src="bar" alt="line-chart"
                  class="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
              <span
                class="text-[9px] text-center font-bold text-white/40 uppercase tracking-wider w-full px-1 mx-auto whitespace-nowrap overflow-hidden text-ellipsis group-hover/item:text-white/90 transition-colors">Line</span>
            </div>

            <!-- Pie Chart -->
            <div class="flex flex-col gap-2 items-center group/item">
              <button @click="addChart('pie')"
                class="group shrink-0 w-full aspect-square border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 transition-all duration-300 shadow-sm hover:bg-white/10 hover:border-white/20 hover:scale-105">
                <img :src="bar" alt="pie-chart"
                  class="w-full h-full object-contain opacity-60 group-hover:opacity-100 transition-opacity" />
              </button>
              <span
                class="text-[9px] text-center font-bold text-white/40 uppercase tracking-wider w-full px-1 mx-auto whitespace-nowrap overflow-hidden text-ellipsis group-hover/item:text-white/90 transition-colors">Pie</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
