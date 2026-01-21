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
  <div class="flex flex-col h-full">
    <div class="flex items-center h-14 border-b px-4 gap-2.5">
      <h2 class="font-semibold">Filters</h2>
      <el-button v-if="filterEnabled" :icon="EyeOff" type="danger" text bg round class="ml-auto" @click="removeFilters()">
        <span>Reset</span>
      </el-button>
      <el-button circle :icon="X" :class="'bg-card ' + (filterEnabled ? '' : 'ml-auto')" @click="editor.setActiveSidebarRight(null)">
      </el-button>
    </div>
    <section class="flex flex-col sidebar-container px-4 py-4">
      <el-segmented v-model="activeTab" :options="options" block style="--el-border-radius-base: 20px;"/>
      <div class="relative overflow-x-scroll scrollbar-hidden">
        <template v-if="activeTab == 'effects'">
          <div class="grid grid-cols-2 gap-3 pt-3.5">
            <FilterItem v-for="filter in filters" :key="filter.name" :filter="filter" :selected="selected" @change="(intensity) => handleModifyFilter(filter, intensity)" @click="handleToggleFilter(filter)" />
          </div>
        </template>
        <template v-else>
          <div class="flex flex-col gap-3 pt-3.5">
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
    <div class="flex items-center h-14 border-b px-4 gap-2.5" v-if="filterEnabled && activeTab == 'effects'">
      <Label class="text-xs font-medium">Intensity</Label>
      <el-slider :min="1" :max="100" :step="1" v-model="intensity" />
    </div>
  </div>
</template>
