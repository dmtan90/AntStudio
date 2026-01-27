<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { Down as ChevronDown, Timeline as GanttChart, Layers, Send } from '@icon-park/vue-next';
import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from "pinia";
import { cn } from 'video-editor/lib/utils';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, selection, selectionActive: active, timeline, audio } = storeToRefs(canvasStore);
const offsetMs = computed(() => {
  const v = active.value as any;
  return v?.meta?.offset !== undefined ? v.meta.offset : (v?.offset * 1000 || 0);
});
const durationMs = computed(() => {
  const v = active.value as any;
  return v?.meta?.duration !== undefined ? v.meta.duration : (v?.timeline * 1000 || 0);
});
const durationInSecond = computed({
  get(){
    return durationMs.value! / 1000;
  },

  set(value){
    if(!active.value?.type){
      audio.value.update(active.value?.id, { duration: value });
    }
    else{
      canvas.value.onChangeActiveObjectTimelineProperty('duration', value * 1000);  
    }
  }
});

const offsetInSecond = computed({
  get(){
    return offsetMs.value! / 1000;
  },

  set(value){
    if(!active.value?.type){
      audio.value.update(active.value?.id, { offset: value });
    }
    else{
      canvas.value.onChangeActiveObjectTimelineProperty('offset', value * 1000);  
    }
  }
});

const activeAnim = computed(() => {
    let state = false;
    if((active.value?.anim && active.value?.anim?.in?.name != "none" || active.value?.anim?.out?.name != "none" || active.value?.anim?.scene?.name != "none")){
      state = true;
    }
    return state;
});

watch([selection,active], (value) => {
  console.log(value);
});

onMounted(() => {
  console.log(selection.value);
});
</script>

<template>
  <div class="flex items-center gap-3.5 px-1 py-1">
    <button v-if="active && active.type != 'audio'"
      class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300 shadow-sm"
      :class="[
        editor.sidebarRight === 'animation' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white',
        !activeAnim ? '' : '!text-brand-primary !border-brand-primary/20 !bg-brand-primary/10'
      ]"
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'animation' ? null : 'animation')"
    >
      <Send :size="16" :class="activeAnim ? 'text-brand-primary' : 'text-white/40 group-hover:text-white'" />
      <span class="text-[10px] font-bold uppercase tracking-widest">Animate</span>
    </button>
    
    <button
      class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 flex items-center gap-2.5 group transition-all duration-300 shadow-sm"
      :class="[
        editor.sidebarRight === 'position' ? 'bg-white/15 border-white/20 text-white shadow-lg' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
      ]"
      @click="editor.setActiveSidebarRight(editor.sidebarRight === 'position' ? null : 'position')"
    >
      <Layers :size="16" class="text-white/40 group-hover:text-white transition-colors" />
      <span class="text-[10px] font-bold uppercase tracking-widest">Position</span>
    </button>

    <el-popover placement="bottom-end" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
      <template #reference>
        <button class="cinematic-button !h-9 !px-4 !rounded-xl border-white/5 bg-white/5 flex items-center gap-2.5 group transition-all duration-300 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white shadow-sm">
          <GanttChart :size="16" class="text-white/40 group-hover:text-white transition-colors" />
          <span class="text-[10px] font-bold uppercase tracking-widest">Timeline</span>
        </button>
      </template>
      <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
          <div class="px-5 py-3 border-b border-white/5 bg-white/5">
              <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Timeline Management</span>
          </div>
          <div class="p-5 flex flex-col gap-6">
            <div class="flex flex-col gap-3">
               <div class="flex justify-between items-center mb-1">
                   <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Duration</Label>
                   <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ durationInSecond.toFixed(2) }}s</span>
               </div>
               <SliderInput :model-value="durationInSecond" :min="0.1" :max="timeline.duration / 1000" :step="0.05" @update:model-value="(value) => durationInSecond = value"/>
            </div>
            <div class="flex flex-col gap-3">
               <div class="flex justify-between items-center mb-1">
                   <Label class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Offset</Label>
                   <span class="text-[10px] font-bold font-mono text-white/60 bg-white/5 px-1.5 rounded">{{ offsetInSecond.toFixed(2) }}s</span>
               </div>
               <SliderInput :model-value="offsetInSecond" :min="0" :max="timeline.duration / 1000" :step="0.05" @update:model-value="(value) => offsetInSecond = value"/>
            </div>
          </div>
      </div>
    </el-popover>
  </div>
</template>