<script setup lang="ts">
import { computed, ref } from 'vue';
import { PreviewOpen as Eye, PreviewCloseOne as EyeOff, Close as X } from '@icon-park/vue-next';

import Label from 'video-editor/components/ui/label.vue';
import Toggle from 'video-editor/components/ui/toggle.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { filters, adjustments } from 'video-editor/constants/filters';
import { cn } from 'video-editor/lib/utils';

// import FilterItem from './FilterItem.vue';
import FilterItem from './FilterItem2.vue';
import AdjustmentItem from './AdjustmentItem.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selectionActive: selected, effects, instance } = storeToRefs(canvasStore);
const filterEnabled = computed(() => selected.value?.filters?.length > 0);
const filterName = computed(() => selected.value?.effects?.name);

const removeFilters = () => {
  const image = instance.value?.getActiveObject() as fabric.Image;
  effects.value.removeImageFilters(image);
};

const handleToggleFilter = (filter: any) => {
  if (filterName.value === filter.name) {
    effects.value.removeFilterFromActiveImage(filter.name);
  } else {
    effects.value.addFilterToActiveImage(filter.filter(50), filter.name, 50);
  }
};

const handleModifyFilter = (filter: any, intensity: number) => {
  effects.value.addFilterToActiveImage(filter.filter(intensity), filter.name, intensity);
};

const handleToggleAdjustment = (adjustment: any, active: boolean) => {
  if (active) {
    // console.log("handleToggleAdjustment");
    // effects.value.applyAdjustmentToActiveImage(adjustment.filter(0), adjustment.name, 0);
    handleModifyAdjustment(adjustment, {});
  } else {
    effects.value.removeAdjustmentFromActiveImage(adjustment.name);
  }
};

const handleModifyAdjustment = (adjustment: any, options: any) => {
  console.log("handleModifyAdjustment", adjustment, options);
  const name = adjustment.name;
  const booleanFilters = ['Invert', 'Sepia', 'BlackWhite', 'Brownie', 'Vintage', 'Kodachrome', 'Technicolor', 'Polaroid'];
  if(booleanFilters.includes(name)){
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(true), name, options.intensity);
  }
  else if(name == "BlendColor"){
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(options.mode, options.color, options.intensity), name, options.intensity);
  }
  else if(name == "Duotone"){
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(options.lightMode, options.darkMode, options.lightColor, options.darkColor, options.lightAlpha, options.darkAlpha), name, options.intensity);
  }
  else if(name == "RemoveColor"){
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(options.color, options.intensity), name, options.intensity);
  }
  else if(name == "Grayscale"){
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(options.mode), name, options.intensity);
  }
  else{
    effects.value.applyAdjustmentToActiveImage(adjustment.filter(options.intensity), name, options.intensity);
  }
};

const activeTab = ref('effects');

const options = [
  {
    value: 'effects',
    label: 'Filter'
  },
  {
    value: 'adjustments',
    label: 'Adjust'
  }
];

const intensity = computed({
  get(){
    return selected.value.effects?.intensity || 50
  },

  set(value){
    let filter = null;
    if(!filterName.value){
      return;
    }
    for(let i = 0; i < filters.length; i++){
      if(filterName.value === filters[i].name){
        filter = filters[i]
        break
      }
    }

    if(filter){
      handleModifyFilter(filter, value);
    }
  }
});

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel bg-[#0a0a0a]/95 backdrop-blur-xl">
    <!-- Header -->
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 relative overflow-hidden group shrink-0">
      <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
      <h2 class="font-bold text-xs tracking-[0.2em] uppercase text-white/90 relative z-10">Filters</h2>
      <div class="flex items-center gap-2 relative z-10">
          <button v-if="filterEnabled" class="h-8 px-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 text-[10px] font-bold uppercase tracking-widest transition-all border border-red-500/20 flex items-center gap-2 active:scale-95 shadow-lg shadow-red-500/5" @click="removeFilters()">
            <EyeOff :size="12" />
            <span>RESET</span>
          </button>
        <button class="w-8 h-8 rounded-xl flex items-center justify-center bg-white/5 border border-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all duration-300" @click="editor.setActiveSidebarRight(null)">
          <X :size="14" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <section class="flex-1 overflow-y-auto custom-scrollbar relative px-5 pt-6 pb-20">
      <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-[#0a0a0a] to-transparent z-20 pointer-events-none opacity-50"></div>
      
      <!-- Mode Switcher -->
      <div class="bg-white/5 p-1 rounded-2xl border border-white/10 flex mb-8">
          <button 
            v-for="opt in options" 
            :key="opt.value"
            @click="activeTab = opt.value"
            class="flex-1 py-2 flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-300"
            :class="[activeTab === opt.value ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-white/40 hover:text-white hover:bg-white/10']"
          >
            {{ opt.label }}
          </button>
      </div>

      <div class="relative overflow-hidden">
        <template v-if="activeTab == 'effects'">
          <div class="grid grid-cols-2 gap-4">
            <FilterItem v-for="filter in filters" :key="filter.name" :filter="filter" :selected="selected" @change="(intensity) => handleModifyFilter(filter, intensity)" @click="handleToggleFilter(filter)" />
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col gap-5">
            <AdjustmentItem
              v-for="adjustment in adjustments"
              :key="adjustment.name"
              :adjustment="adjustment"
              :selected="selected"
              @change="(options) => handleModifyAdjustment(adjustment, options)"
              @toggle="(active) => handleToggleAdjustment(adjustment, active)"
            />
          </div>
        </template>
      </div>
    </section>

    <!-- Footer Slider -->
    <div class="flex items-center h-14 border-t border-white/5 px-5 gap-6 bg-white/5 backdrop-blur-md" v-if="filterEnabled && activeTab == 'effects'">
      <Label class="text-[10px] font-bold text-white/40 uppercase tracking-widest shrink-0">Intensity</Label>
      <el-slider :min="1" :max="100" :step="1" v-model="intensity" class="flex-1 cinematic-slider" />
      <span class="text-[10px] font-bold font-mono text-white/60 w-8 text-right">{{ intensity }}%</span>
    </div>
  </div>
</template>
