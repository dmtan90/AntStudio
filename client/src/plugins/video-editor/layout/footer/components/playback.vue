<script setup lang="ts">
import { computed, watch } from 'vue';
import { Up as ChevronUp, Down as ChevronDown, Timeline as GanttChart, Pause, Play, Timer, CuttingOne as Split, ToLeft as KeepLeft, ToRight as KeepRight, Copy, Delete as Trash2Icon, ZoomIn, ZoomOut, FullScreen, Magic } from '@icon-park/vue-next';
import Label from 'video-editor/components/ui/label.vue';
import SliderInput from 'video-editor/components/ui/SliderInput.vue';
import { useIsTablet } from 'video-editor/hooks/use-media-query';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { formatMediaDuration } from 'video-editor/lib/time';
import { presetDurations, MIN_DURATION, MAX_DURATION, formats } from 'video-editor/constants/editor';
import { cn } from 'video-editor/lib/utils';
const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, timeline, animations, selectionActive: active, trimmer, cloner, audio, instance, workspace } = storeToRefs(canvasStore);
const isTablet = useIsTablet();
const currentFormat = computed(() => {
  let format = {name: "16:9", aspectRatio: 16 / 9, ratio: "16:9", dimensions: {height: 1080, width: 1920}};
  if (!workspace.value) return format;
  for (let i = 0; i < formats.length; i++) {
    let item = formats[i]
    if (workspace.value.width == item.dimensions.width && workspace.value.height == item.dimensions.height) {
      format = item;
      break;
    }
  }
  return (format as any);
});

const isFormat = (format: any) => {
  // console.log("isFormat", format);
  if (format.aspectRatio == (currentFormat.value as any)?.aspectRatio) {
    return true;
  }
  return false;
}

const resizeArtboards = (dimensions: any) => {
  (workspace.value as any)?.resizeArtboard(dimensions);
}

const handleTimelineToggle = () => {
  if (timeline.value?.playing) timeline.value?.pause();
  else timeline.value?.play();
};

const disabled = computed(() => (timeline.value as any)?.playing || (animations.value as any)?.previewing);
const baseId = computed(() => (active?.value as any)?.id || (active?.value as any)?.name || "");
const durationMs = computed(() => (active?.value as any)?.meta?.duration || (active?.value as any)?.timeline * 1000 || 0);
const offsetMs = computed(() => (active?.value as any)?.meta?.offset || (active?.value as any)?.offset * 1000 || 0);

const duration = computed({
  get() {
    return ((timeline.value as any).duration / 1000);
  },

  set(value) {
    if (value < MIN_DURATION) {
      value = MIN_DURATION;
    }
    else if (value > MAX_DURATION) {
      value = MAX_DURATION;
    }
    (timeline.value as any)?.set('duration', value)
  }
});

type SplitOptions = "both" | "left" | "right";

const onSplitItem = async (keep?: SplitOptions) => {
  console.log("onSplitItem", active, timeline)
  const seekTimeInSeconds = (timeline.value as any)?.seek / 1000;
  const object = active.value as any;
  if (!object) {
    return;
  }

  const _object = (instance.value as any)?.getActiveObject() || (audio.value as any).get(active?.value?.id);
  const cloned = await (cloner.value as any)?.clone(_object);

  if (object.type == 'audio' || object.type == 'video') {
    const trimStartMs = cloned.trimStart || cloned.trim * 1000 || 0;
    const trimEndMs = cloned.trimEnd || cloned.timeline * 1000 || 0;
    const durationMs = cloned.meta?.duration || cloned.timeline * 1000 || 0;//in ms
    const offsetMs = cloned.meta?.offset || cloned.offset * 1000 || 0;//in ms
    const _trim = seekTimeInSeconds - offsetMs / 1000;
    const newTrimStart = trimStartMs + _trim;
    const newTrimEnd = trimEndMs + _trim;
    const newDuration = offsetMs + durationMs - seekTimeInSeconds * 1000;
    const newMeta = { duration: newDuration, offset: seekTimeInSeconds * 1000 };
    const _duration = seekTimeInSeconds * 1000 - (object.meta?.offset || object.offset * 1000 || 0);
    const _trimEnd = trimStartMs + _duration / 1000;

    if (object.type == 'video') {
      //update clone object
      (canvas.value as any).onChangeVideoProperty(cloned, "trimStart", newTrimStart);
      (canvas.value as any).onChangeVideoProperty(cloned, "trimEnd", newTrimEnd);
      (canvas.value as any).onChangeVideoProperty(cloned, "meta", newMeta);

      //update origin object
      (canvas.value as any).onChangeVideoProperty(_object, "trimEnd", newTrimEnd);
      (canvas.value as any).onChangeVideoProperty(_object, "meta", { duration: _duration, offset: offsetMs });
    }
    else {
      (audio.value as any)?.update(cloned.id, { offset: seekTimeInSeconds, trim: newTrimStart, timeline: newDuration / 1000 });
      (audio.value as any)?.update(_object.id, { timeline: _duration / 1000 });
    }

    const __object = (instance.value as any).getItemByName(_object.name);
    console.log("_object", _object);
  }
};
const onCloneItem = async () => {
  console.log("onCloneItem", active);
  const object = active.value as any;
  if (!object) {
    return null;
  }

  //clone current object
  const _object = (instance.value as any)?.getActiveObject() || (audio.value as any).get(active?.value?.id);
  const cloned = await (cloner.value as any)?.clone(_object);
  return cloned;
};

const onRemoveItem = () => {
  console.log("onRemoveItem", active);
  const object = active.value as any;
  if (!object) {
    return;
  }

  (canvas.value as any).onDeleteActiveObject();
};

const splitEnabled = computed(() => {
  const seekTimeInSeconds = (timeline.value as any)?.seek / 1000;
  const object = active.value as any;
  if (!object) {
    return false;
  }
  let isSplited = false;
  let start = 0;
  let end = 0;

  if (object.type == "video") {
    start = object.meta?.offset / 1000;
    end = object.meta?.duration / 1000 + start;
  }
  else if (object.type == "audio") {
    start = object.offset;
    end = (object as any).timeline + start;
  }

  if (start != end && start < seekTimeInSeconds && seekTimeInSeconds < end) {
    isSplited = true;
  }
  console.log("splitEnabled", isSplited);
  return isSplited;
});

</script>

<template>
  <div class="h-14 sm:h-16 px-6 flex items-center gap-6 justify-between border-b border-white/5 shrink-0 overflow-x-auto custom-scrollbar flex-nowrap bg-[#0a0a0a]/50">
    <div class="flex items-center gap-5">
      <div class="relative group">
        <div class="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
        <button 
          class="relative h-11 w-11 rounded-full flex items-center justify-center transition-all duration-500 !bg-brand-primary !text-white hover:!bg-brand-primary/90 hover:scale-105 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(var(--brand-primary-rgb),0.5)] active:scale-90 disabled:opacity-30 z-10"
          :disabled="animations?.previewing"
          @click="handleTimelineToggle"
        >
          <div class="absolute inset-0 rounded-full border border-white/20"></div>
          <Pause v-if="timeline.playing" :size="22" fill="currentColor" class="!text-black" />
          <Play v-else :size="22" fill="currentColor" class="!text-black" />
        </button>
      </div>

      <div class="flex items-center gap-2 font-mono tabular-nums select-none min-w-[140px] bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 shadow-inner">
        <span class="text-[14px] font-black text-white/90 drop-shadow-sm">{{ formatMediaDuration(timeline.seek, false) }}</span>
        <span class="text-[10px] font-bold text-white/20 mx-0.5">/</span>
        <span class="text-[11px] font-bold text-white/40">{{ formatMediaDuration(timeline.duration, false) }}</span>
      </div>

      <div class="w-px h-6 bg-white/10 shrink-0 mx-1" v-if="active"/>
      
      <div class="flex items-center gap-1.5" v-if="active">
        <template v-if="splitEnabled">
          <div class="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1">
            <el-tooltip content="Split Clip" placement="top" popper-class="cinematic-tooltip">
              <button class="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95" @click="onSplitItem()">
                <Split :size="16" />
              </button>
            </el-tooltip>
            <el-tooltip content="Split & Keep Left" placement="top" popper-class="cinematic-tooltip">
              <button class="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95" @click="onSplitItem()">
                <KeepLeft :size="16" />
              </button>
            </el-tooltip>
            <el-tooltip content="Split & Keep Right" placement="top" popper-class="cinematic-tooltip">
              <button class="h-8 px-2.5 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-all active:scale-95" @click="onSplitItem()">
                <KeepRight :size="16" />
              </button>
            </el-tooltip>
          </div>
        </template>
        
        <el-tooltip content="Duplicate Clip" placement="top" v-if="!active?.meta?.thumbnail" popper-class="cinematic-tooltip">
           <button class="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white transition-all active:scale-95 shadow-sm" @click="onCloneItem()">
            <Copy :size="16" />
          </button>
        </el-tooltip>
        
        <el-tooltip content="Delete Element" placement="top" popper-class="cinematic-tooltip">
          <button class="h-9 w-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-white/40 hover:text-red-500 transition-all active:scale-95 shadow-sm" @click="onRemoveItem()">
            <Trash2Icon :size="16" />
          </button>
        </el-tooltip>
      </div>
    </div>
    
    <div class="flex items-center gap-5">
      <div class="gap-4 hidden md:flex items-center">
        <!-- Viewport Format Picker -->
        <el-popover placement="top" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
          <template #reference>
            <button class="flex items-center gap-2.5 h-9 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-30" :disabled="disabled">
               <FullScreen :size="14" class="text-white/40 group-hover:text-white" />
               <span class="text-[10px] font-black uppercase tracking-widest">{{ currentFormat?.ratio }}</span>
               <ChevronUp :size="12" class="opacity-20 group-hover:opacity-100 transition-opacity" />
            </button>
          </template>
          <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
              <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                  <span class="text-[9px] font-bold text-white/40 uppercase tracking-[0.2em]">Viewport Canvas Format</span>
              </div>
              <div class="p-4 grid grid-cols-2 gap-3 max-h-[280px] overflow-y-auto custom-scrollbar">
                <div v-for="format in formats" :key="format.name" class="flex flex-col gap-2 group cursor-pointer" @click="resizeArtboards(format.dimensions)">
                  <el-tooltip :content="format.purpose" placement="top" popper-class="cinematic-tooltip">
                    <div 
                      :class="cn('w-full aspect-video border rounded-xl overflow-hidden transition-all p-2 flex items-center justify-center shadow-lg', isFormat(format) ? 'bg-brand-primary/10 border-brand-primary/40 ring-1 ring-brand-primary/20' : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10')" 
                    >
                      <img :src="format.preview" class="object-contain max-h-full max-w-full opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </el-tooltip>
                  <span class="text-[9px] font-bold text-white/30 text-center uppercase tracking-widest group-hover:text-white/60 transition-colors">{{ format.name }}</span>
                </div>
              </div>
          </div>
        </el-popover>

        <!-- Canvas Zoom Controls -->
        <div class="flex items-center bg-white/5 rounded-xl border border-white/5 p-1 gap-1 shadow-sm">
           <button class="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90" @click="workspace.changeZoom(workspace?.zoom - 0.05)">
              <ZoomOut :size="14" />
           </button>
           
           <el-dropdown max-height="240px" @command="(percentage) => workspace.changeZoom(percentage / 100)" trigger="click" popper-class="cinematic-dropdown">
              <button class="h-7 px-3 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/90 hover:text-white transition-all text-[11px] font-bold font-mono tracking-tighter min-w-[54px] shadow-sm">
                {{ Math.round(workspace?.zoom * 100) }}%
              </button>
              <template #dropdown>
                <el-dropdown-menu class="cinematic-dropdown-menu">
                  <div class="px-4 py-2 text-[9px] font-bold text-white/20 uppercase tracking-widest border-b border-white/5 mb-1">Canvas Scale</div>
                  <el-dropdown-item v-for="percentage in [10, 15, 20, 25, 50, 75, 100, 125, 150, 200, 300, 400]" :key="percentage" :command="percentage">
                    <span class="text-[10px] font-bold font-mono py-1">{{ percentage }}%</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
           </el-dropdown>

           <button class="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-all active:scale-90" @click="workspace.changeZoom(workspace?.zoom + 0.05)">
              <ZoomIn :size="14" />
           </button>
        </div>
      </div>

      <div class="w-px h-6 bg-white/10 hidden md:block shrink-0" />

      <!-- Project Duration -->
      <div class="flex gap-0.5 relative group/dur shadow-sm">
        <button 
          class="flex items-center gap-2.5 h-9 px-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20 text-white/50 hover:text-white transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)] disabled:opacity-30" 
          :class="[editor.sidebarRight === 'transition' ? 'bg-brand-primary/20 text-brand-primary border-brand-primary/30' : '']"
          :disabled="disabled"
          @click="editor.setActiveSidebarRight(editor.sidebarRight === 'transition' ? null : 'transition')">
            <Magic :size="14" class="text-white/40 group-hover:text-white" />
            <span class="text-[10px] font-black uppercase tracking-widest">Transitions</span>
        </button>
        <el-popover placement="top-start" trigger="click" width="280" popper-class="cinematic-popover p-0 overflow-hidden border-white/10">
          <template #reference>
            <button class="flex items-center gap-2.5 h-9 px-4 rounded-l-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 text-white/50 hover:text-white transition-all duration-300 disabled:opacity-30" :disabled="disabled">
              <Timer :size="14" class="text-white/30" />
              <span class="text-[10px] font-bold uppercase tracking-widest">Duration</span>
            </button>
          </template>
          <div class="bg-[#0d0d0d]/95 backdrop-blur-2xl">
              <div class="px-5 py-3 border-b border-white/5 bg-white/5">
                  <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">Global Project Timeline</span>
              </div>
              <div class="p-5 flex flex-col gap-4">
                 <div class="flex justify-between items-center mb-1">
                    <span class="text-[10px] font-black text-white/20 uppercase tracking-widest">Time Limit</span>
                    <span class="text-[11px] font-bold font-mono text-white/60 bg-white/5 px-2 py-0.5 rounded-md">{{ duration.toFixed(1) }}s</span>
                 </div>
                 <SliderInput :disabled="disabled" :model-value="duration" :min="MIN_DURATION" :max="MAX_DURATION" :step="1" @update:model-value="(value) => duration = value"/>
              </div>
          </div>
        </el-popover>
        
        <el-dropdown @command="d => timeline.set('duration', d)" trigger="click" popper-class="cinematic-dropdown">
          <button class="flex items-center justify-center w-7 h-9 rounded-r-xl border border-white/5 bg-white/5 hover:bg-white/10 text-white/30 hover:text-white transition-all disabled:opacity-30" :disabled="disabled">
            <ChevronUp :size="14" class="opacity-40" />
          </button>
          <template #dropdown>
            <el-dropdown-menu class="cinematic-dropdown-menu min-w-[124px]">
              <div class="px-4 py-2 text-[9px] font-bold text-white/20 uppercase tracking-widest border-b border-white/5 mb-1">Presets</div>
              <el-dropdown-item v-for="item in presetDurations" :key="item.value" :disabled="disabled || duration == item.value" :command="item.value">
                <span class="text-[10px] font-bold py-1">{{ item.label }}</span>
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>

      <!-- Timeline Panel Toggle -->
      <el-tooltip content="Toggle Timeline Panel" placement="top" popper-class="cinematic-tooltip">
        <button 
          class="flex items-center gap-2.5 h-9 px-4 rounded-xl border border-transparent hover:bg-white/5 text-white/50 hover:text-white transition-all duration-300 shadow-sm group/btn active:scale-95" 
          @click="editor.onToggleTimeline()"
          :class="{ 'bg-white/10 border-white/10 text-brand-primary !text-brand-primary shadow-lg shadow-brand-primary/5': editor.timelineOpen }"
        >
          <GanttChart :size="16" class="transition-colors group-hover/btn:text-white" :class="editor.timelineOpen ? 'text-brand-primary' : 'text-white/40'" />
          <span class="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Timeline</span>
          <ChevronUp :size="14" class="transition-transform duration-500 opacity-30 group-hover/btn:opacity-100" :class="editor.timelineOpen ? 'rotate-180' : 'rotate-0'" />
        </button>
      </el-tooltip>
    </div>
  </div>
</template>
