<script setup lang="ts">
import { computed, watch } from 'vue';
import { Up as ChevronUp, Down as ChevronDown, Timeline as GanttChart, Pause, Play, Timer, CuttingOne as Split, ToLeft as KeepLeft, ToRight as KeepRight, Copy, Delete as Trash2Icon, ZoomIn, ZoomOut, FullScreen } from '@icon-park/vue-next';
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
  let format = null;
  if (!workspace.value) return null;
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
  <div class="h-14 sm:h-16 px-4 flex items-center gap-8 justify-between border-b shrink-0 overflow-x-scroll scrollbar-hidden">
    <div class="flex items-center gap-3.5">
      <el-button size="large" circle type="primary" text :disabled="animations.previewing" @click="handleTimelineToggle">
        <template v-if="timeline.playing">
          <Pause :size="48" />
        </template>
        <template v-else>
          <Play :size="48" />
        </template>
      </el-button>
      <div class="text-xs tabular-nums hidden sm:inline">
        <span>{{ formatMediaDuration(timeline.seek, false) }}</span>
        <span class="mx-1">/</span>
        <span>{{ formatMediaDuration(timeline.duration, false) }}</span>
      </div>
      <el-divider direction="vertical" class="h-8" v-if="active"/>
      <div class="flex items-center gap-0" v-if="active">
        <el-button-group>
          <el-tooltip content="Split" placement="top" v-if="splitEnabled">
            <el-button text round :icon="Split" @click="onSplitItem()" />
          </el-tooltip>
          <el-tooltip content="Split & Keep Left" placement="top" v-if="splitEnabled">
            <el-button text round :icon="KeepLeft" @click="onSplitItem()" />
          </el-tooltip>
          <el-tooltip content="Split & Keep Right" placement="top" v-if="splitEnabled">
            <el-button text round :icon="KeepRight" @click="onSplitItem()" />
          </el-tooltip>
          <el-tooltip content="Copy" placement="top" v-if="!active?.meta?.thumbnail">
            <el-button text round :icon="Copy" @click="onCloneItem()" />
          </el-tooltip>
          <el-tooltip content="Delete" placement="top">
            <el-button type="danger" text round :icon="Trash2Icon"  @click="onRemoveItem()" />
          </el-tooltip>
        </el-button-group>
      </div>
    </div>
    <div class="flex items-center gap-3">
      <div class="gap-px hidden md:flex">
        <el-popover placement="top" trigger="click" width="200px">
          <template #reference>
            <el-button type="primary" text bg round class="mx-3" :disabled="disabled" :icon="FullScreen">
              <span>{{ currentFormat.ratio }}</span>
            </el-button>
          </template>
          <div class="text-xs font-medium">Format</div>
          <div class="grid grid-cols-2 gap-2 relative max-h-[250px] overflow-y-scroll scrollbar-hidden">
            <div v-for="format in formats" :key="format.name" class="flex flex-col gap-2">
              <el-tooltip :content="format.purpose" placement="top">
                <button :class="cn('group shrink-0 border flex items-center justify-center overflow-hidden rounded-xl shadow-sm transition-colors hover:bg-card p-1.5', isFormat(format) ? 'bg-card' : '')" @click="resizeArtboards(format.dimensions)">
                  <img :src="format.preview" class="object-contain h-full w-full" />
                </button>
              </el-tooltip>
              <span class="text-xxs text-foreground/60 text-center">{{ format.name }}</span>
            </div>
          </div>
        </el-popover>
        <el-button-group>
          <el-button type="primary" text bg round @click="workspace.changeZoom(workspace?.zoom - 0.05)">
            <ZoomOut :size="15" />
          </el-button>
          <el-dropdown class="float-left -mr-4" max-height="200px" @command="(percentage) => workspace.changeZoom(percentage / 100)">
            <el-button type="primary" text bg>
              <span class="font-medium">{{ Math.round(workspace?.zoom * 100) }}%</span>
              <ChevronDown :size="15" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item v-for="percentage in [10, 15, 20, 25, 50, 75, 100, 125, 150, 175, 200, 250]" :key="percentage" :command="percentage">
                  {{ percentage }}%
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button type="primary" text bg round @click="workspace.changeZoom(workspace?.zoom + 0.05)">
            <ZoomIn :size="16" />
          </el-button>
        </el-button-group>
      </div>
      <div class="flex gap-0">
        <el-popover placement="top-start" trigger="click" width="200px">
          <template #reference>
            <el-button type="primary" text bg round class="gap-1.5 rounded-r-none" :disabled="disabled">
              <Timer :size="15" />
              <span>Duration</span>
            </el-button>
          </template>
          <Label class="text-xs font-medium">Duration (s)</Label>
          <div class="flex items-center justify-between gap-4">
            <SliderInput :disabled="disabled" :model-value="duration" :min="MIN_DURATION" :max="MAX_DURATION" :step="5" @update:model-value="(value) => duration = value"/>
          </div>
        </el-popover>
        <el-dropdown @command="duration => timeline.set('duration', duration)">
          <el-button type="primary" text bg round class="rounded-l-none" :disabled="disabled">
            <ChevronUp :size="15" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu class="min-w-20">
              <el-dropdown-item v-for="item in presetDurations" :key="item.value" :disabled="disabled || duration == item.value" :command="item.value" class="text-xs pl-2.5">
                {{ item.label }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <el-tooltip content="Timeline" placement="top">
        <el-button type="primary" text bg round class="gap-1.5 hover:active" @click="editor.onToggleTimeline()">
          <GanttChart :size="15" />
          <span>Timeline</span>
          <span :class="cn(editor.timelineOpen ? 'rotate-180' : 'rotate-0')">
            <ChevronUp :size="15" />
          </span>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>
