<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import { debounce } from 'lodash';
import VueDraggable from 'vue-draggable-resizable';
import { VueDraggable as SortableList } from 'vue-draggable-plus';
import { Motion, MotionConfig, useDragControls } from "motion-v"

import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { formatMediaDuration } from 'video-editor/lib/time';
import { cn } from '@/utils/ui';

import { useMeasure } from 'video-editor/hooks/use-measure';
import { ElPopover, ElSlider, ElRadioGroup, ElRadioButton } from 'element-plus';
import { Effects, MagicWand, Close, Copy, Delete, Plus, Application, PreviewOpen, PreviewCloseOne, Lock, Unlock, MoveOne, ZoomIn, ZoomOut, FullSelection, Music, Play, Pause, VolumeNotice, VolumeMute } from '@icon-park/vue-next';
import { RecycleScroller } from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';

import TimelineItem from './TimelineItem.vue';
import SceneThumbnail from 'video-editor/components/thumbnail/SceneThumbnail.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { canvas, timeline, animations, elements, selection, audioElements } = storeToRefs(canvasStore);

// --- Navigation Watcher ---
// --- Navigation Watcher ---
watch(() => editor.page, (newPage) => {
  if (newPage === undefined || newPage < 0) return;

  // In Active Scene mode, always reset seek to 0 when switching scenes
  // unless we are "flowing" from previous scene? For now, standard behavior is reset.
  if (timeline.value) {
    (timeline.value as any).set("seek", 0);
  }
});




// --- Zoom & Layout State ---
const zoomLevel = computed({
  get: () => editor.timelineZoom || 1,
  set: (val) => editor.setTimelineZoom(val)
});
const BASE_SEEK_WIDTH = 42;
const isCompact = ref(true); // Toggle for compact row height

const COMPACT_HEIGHT = 28;
const STANDARD_HEIGHT = 28; // Enforce 28px as standard
const rowHeight = computed(() => isCompact.value ? COMPACT_HEIGHT : STANDARD_HEIGHT);
const SEEK_TIME_WIDTH = computed(() => BASE_SEEK_WIDTH * zoomLevel.value);

const [containerRef, dimensions] = useMeasure();

// --- Global Time Helpers ---
const sceneOffsets = computed(() => {
  let acc = 0;
  return editor.pages.map(page => {
    const start = acc;
    acc += ((page.timeline as any)?.duration || 5000);
    return start;
  });
});

const totalDuration = computed(() => {
  return editor.pages.reduce((acc, page) => acc + ((page.timeline as any)?.duration || 5000), 0);
});

const durationInSeconds = computed(() => totalDuration.value / 1000);

// Global Seek (Seconds)
const isDragging = ref(false);
const tempSeek = ref(0);

const updateCanvasSeek = (ms: number, targetPage: number) => {
  const localTime = ms - (sceneOffsets.value[targetPage] || 0);

  if (targetPage !== editor.page) {
    editor.onChangeActivePage(targetPage);
    setTimeout(() => {
      (timeline.value as any)?.set("seek", localTime);
    }, 50);
  } else {
    (timeline.value as any)?.set("seek", localTime);
  }
};

const debouncedUpdateCanvasSeek = debounce(updateCanvasSeek, 100);

const globalSeek = computed({
  get: () => {
    if (isDragging.value) return tempSeek.value;
    const activeOffset = sceneOffsets.value[editor.page] || 0;
    const localSeek = (timeline.value?.seek ?? 0);
    return (activeOffset + localSeek) / 1000;
  },
  set: (valSeconds) => {
    const ms = valSeconds * 1000;
    tempSeek.value = valSeconds; // Always update local immediately for UI

    // Find target scene
    let targetPage = 0;
    for (let i = 0; i < editor.pages.length; i++) {
      const dur = (editor.pages[i].timeline as any)?.duration || 5000;
      const start = sceneOffsets.value[i];
      if (ms < start + dur) {
        targetPage = i;
        break;
      }
      if (i === editor.pages.length - 1) {
        targetPage = i;
      }
    }

    if (isDragging.value) {
      // Debounce during drag
      debouncedUpdateCanvasSeek(ms, targetPage);
    } else {
      // Immediate update for clicks
      updateCanvasSeek(ms, targetPage);
    }
  }
});

const onDragStart = () => {
  isDragging.value = true;
  tempSeek.value = globalSeek.value;
};

const onDragEnd = () => {
  // Ensure final position is synced
  const ms = tempSeek.value * 1000;
  // Re-calculate target page for final commit since logic is inside setter
  // But we can just rely on the last debounced call? 
  // Better to force flush or direct call.
  debouncedUpdateCanvasSeek.flush();
  isDragging.value = false;
};

// Use global seek for the UI
const seekTimeInSeconds = computed(() => globalSeek.value);

// Auto-Switch Scene on Playback Completion
// Watch local seek to detect end of scene
watch(() => timeline.value?.seek, (val) => {
  if (!timeline.value?.playing) return;

  const localDuration = (timeline.value?.duration || 0);
  // If we are near the end of the scene (within 50ms or so)
  if (val !== undefined && val >= localDuration && editor.page < editor.pages.length - 1) {
    // Automatically flow to next scene
    const nextPage = editor.page + 1;
    editor.onChangeActivePage(nextPage);
    setTimeout(() => {
      (timeline.value as any)?.play();
    }, 100);
  }
});


const disabled = computed(() => (timeline.value as any)?.playing || (animations.value as any)?.previewing);

// Dynamic Widths based on Zoom
const trackWidth = computed(() => durationInSeconds.value * SEEK_TIME_WIDTH.value);
const trackBackgroundWidth = computed(() => Math.max((dimensions.value as any)?.width || 0, (durationInSeconds.value + 6) * SEEK_TIME_WIDTH.value));
const timelineAmount = computed(() => {
  const val = Math.floor(trackBackgroundWidth.value / (SEEK_TIME_WIDTH.value || 1));
  return Number.isFinite(val) && val >= 0 ? val : 0;
});

// --- Packing Algorithm ---
const packRows = (items: any[]) => {
  if (!items.length) return [];

  // Sort by start time, then duration
  const sorted = [...items].sort((a, b) => {
    const startA = a.globalStart || a.offset * 1000 || 0;
    const startB = b.globalStart || b.offset * 1000 || 0;
    if (startA !== startB) return startA - startB;
    return (a.meta?.duration || a.duration || 0) - (b.meta?.duration || b.duration || 0);
  });

  const rows: any[][] = [];

  sorted.forEach(item => {
    let placed = false;
    const start = item.globalStart || item.offset * 1000 || 0;
    const duration = item.meta?.duration || item.duration * 1000 || 0;

    // Try to fit into existing rows
    for (const row of rows) {
      const lastElement = row[row.length - 1];
      const lastEnd = (lastElement.globalStart || lastElement.offset * 1000 || 0) +
        (lastElement.meta?.duration || lastElement.duration * 1000 || 0);

      if (start >= lastEnd) {
        row.push(item);
        placed = true;
        break;
      }
    }

    if (!placed) {
      rows.push([item]);
    }
  });

  return rows.map((row, index) => ({ row, index }));
};

// --- Grouping Logic ---

// --- Unified Visual Elements ---
const visualGroups = computed(() => {
  const groups: any[] = [];

  // Iterate all pages for unified view
  editor.pages.forEach((page, index) => {
    const pageElements = page.elements || [];
    const visuals = pageElements.filter((e: any) => !e.meta?.isSubtitle && e.id == canvas.value?.id && (e.meta?.duration || e.duration) > 0);
    const sceneStart = sceneOffsets.value[index];
    const durationCount = (page.timeline as any)?.duration || 5000;

    visuals.forEach((el: any) => {
      // We place each visual on its own row per the design preference or previous logic?
      // Previous logic was: groups.push({ row: [...], index: ... }) for each element.
      // This implies a "Stack" layout where every element gets a track.
      // We'll maintain that pattern.
      groups.push({
        row: [{
          ...el,
          _originalElement: el,
          pageIndex: index,
          sceneOffset: sceneStart,
          sceneDuration: durationCount,
          sceneId: page.id,
          globalStart: sceneStart + (el.meta?.offset || el.offset * 1000 || 0)
        }],
        index: groups.length
      });
    });
  });

  return groups;
});


const audioGroups = computed(() => {
  const allAudios: any[] = [];

  editor.pages.forEach((page, index) => {
    const audios = (page.audio?.elements || []);//.filter((e: any) => e.type === 'audio' || e.isAudio);
    const sceneStart = sceneOffsets.value[index];
    const durationCount = (page.timeline as any)?.duration || 5000;
    console.log("sceneStart", sceneStart);
    audios.forEach((el: any) => {
      allAudios.push({
        ...el,
        isAudio: true,
        name: el.id,
        pageIndex: index,
        sceneOffset: sceneStart,
        sceneDuration: durationCount,
        sceneId: page.id,
        globalStart: sceneStart + (el.meta?.offset || el.offset * 1000 || 0)
      });
    });
  });

  // Pack rows using global start times
  const packingItems = allAudios.map(a => ({
    ...a,
    offset: a.globalStart / 1000,
    meta: { ...a.meta, offset: a.globalStart }
  }));

  return packRows(packingItems);
});

const subtitleElements = computed(() => {
  const subs: any[] = [];
  // Also unify subtitles
  editor.pages.forEach((page, index) => {
    const pageSubs = (page.elements || []).filter((e: any) => e.meta?.isSubtitle);
    const sceneStart = sceneOffsets.value[index];
    pageSubs.forEach(s => {
      subs.push({
        ...s,
        sceneOffset: sceneStart,
        pageIndex: index,
        globalStart: sceneStart + (s.meta?.offset || 0)
      });
    });
  });
  return subs;
});

// --- Actions ---

const onSeek = (x: number) => {
  if (disabled.value) return;
  let seek = x / SEEK_TIME_WIDTH.value;
  if (seek > durationInSeconds.value) seek = durationInSeconds.value;
  if (seek < 0) seek = 0;
  globalSeek.value = seek;
};

const onClickSeekTime = (event: MouseEvent) => {
  if (disabled.value) return;
  const x = event.clientX - (event.currentTarget as HTMLElement).getBoundingClientRect().left;
  onSeek(x);
};

const onDragPlayhead = (x: number) => {
  if (disabled.value) return;
  // Ensure playhead stays within bounds respecting Zoom
  onSeek(x);
};

// Selection
const onSelectTrack = (event: any, item: any) => {
  if (disabled.value) return;

  // Switch page if needed
  if (item.pageIndex !== undefined && item.pageIndex !== editor.page) {
    editor.onChangeActivePage(item.pageIndex);
    // Add a small delay to allow canvas to initialize before selecting
    setTimeout(() => {
      if (item.isAudio || item.type === 'audio') {
        (selection.value as any)?.selectAudio(item);
      } else {
        (selection.value as any)?.selectObjectByName(item.name, event.shiftKey);
      }
    }, 100);
    return;
  }

  if (item.isAudio || item.type === 'audio') {
    (selection.value as any)?.selectAudio(item);
  } else {
    (selection.value as any)?.selectObjectByName(item.name, event.shiftKey);
  }
};

const snapLine = ref<number | null>(null);
const onSnap = (x: number | null) => {
  snapLine.value = x;
};

// Row Visibility/Lock Helpers
const isRowVisible = (row: any[]) => row.some(item => {
  const obj = (editor.canvas as any).instance.getItemByName(item.name);
  return obj?.visible !== false;
});
const onToggleRowVisibility = (row: any[]) => {
  const anyVisible = isRowVisible(row);
  row.forEach(item => {
    const obj = (editor.canvas as any).instance.getItemByName(item.name);
    if (obj) (editor.canvas as any).onToggleVisibility(obj, !anyVisible);
  });
};
const isRowLocked = (row: any[]) => row.every(item => {
  const obj = (editor.canvas as any).instance.getItemByName(item.name);
  return obj?.meta?.locked;
});
const onToggleRowLock = (row: any[]) => {
  const anyLocked = isRowLocked(row);
  row.forEach(item => {
    const obj = (editor.canvas as any).instance.getItemByName(item.name);
    if (obj) (editor.canvas as any).onToggleLock(obj, !anyLocked);
  });
};

// Hover Time
const hoverTime = ref<number | null>(null);
const hoverX = ref(0);

const onMouseMove = (e: MouseEvent) => {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = e.clientX - rect.left;
  // Account for scrolling if the listener is on the container
  // Wait, if listener is on Ruler, it's sticky.
  // Ideally we want to know the time at X.
  // time = x / SEEK_TIME_WIDTH
  // But x is relative to the SCROLLABLE content or the VIEWPORT?
  // If I put @mousemove on the main container 'containerRef', x is clientX.
  // I need x relative to the START of the track area.
  // The container has overflow-x-auto.
  // So e.clientX - rect.left + scrollLeft?

  // Let's use simple logic:
  // If I hover on ruler, it is sticky. 
  // If I hover on tracks, they scroll.

  // Let's attach to the relative wrapper of tracks.
  // Actually, simpler: Use bounding rect of the 'ruler' or 'internal wrapper'.

  // For now, let's implement a ref for the ruler container and use useMeasure/boundingrect

  // Just store the relative X
  hoverX.value = x;
  const time = x / SEEK_TIME_WIDTH.value;
  hoverTime.value = Math.max(0, Math.min(time, durationInSeconds.value));
};

const onMouseLeave = () => {
  hoverTime.value = null;
};

const pagesList = computed({
  get: () => editor.pages,
  set: (val) => editor.reorderPages(val)
});

// --- Collapsible Groups ---
const showVisuals = ref(true);
const showAudio = ref(true);

const onWheel = (e: WheelEvent) => {
  // If Ctrl key is pressed, handle Zoom
  if (e.ctrlKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    editor.setTimelineZoom(editor.timelineZoom + delta);
  }
};
</script>

<template>
  <div
    :class="cn('flex flex-1 shrink select-none relative', editor.timelineOpen ? 'h-auto' : 'h-0 overflow-hidden appearance-none')">

    <!-- Left Sidebar Area (Controls) -->
    <div class="bg-[#050505] shrink-0 w-12 border-t border-r border-white/5 flex flex-col items-center py-2 gap-4 z-40">
      <div class="h-4 w-full flex justify-center items-center"></div>

      <!-- Compact Mode Toggle -->
      <el-tooltip :content="isCompact ? 'Standard Height' : 'Compact Height'" placement="right">
        <el-button circle size="small" aria-label="Toggle compact mode"
          :class="isCompact ? '!bg-brand-primary !text-black' : '!bg-white/5 !text-white/40 border-white/10'"
          @click="isCompact = !isCompact">
          <Application size="12" />
        </el-button>
      </el-tooltip>

      <div class="w-8 h-px bg-white/10 my-1"></div>

      <!-- Zoom Controls -->
      <el-tooltip content="Zoom In" placement="right">
        <el-button circle size="small" aria-label="Zoom in" class="!bg-white/5 !text-white/60 border-white/10"
          @click="zoomLevel = Math.min(zoomLevel + 0.25, 5)">
          <ZoomIn size="14" />
        </el-button>
      </el-tooltip>

      <el-tooltip content="Zoom Out" placement="right">
        <el-button circle size="small" aria-label="Zoom out" class="!bg-white/5 !text-white/60 border-white/10"
          @click="zoomLevel = Math.max(zoomLevel - 0.25, 0.1)">
          <ZoomOut size="14" />
        </el-button>
      </el-tooltip>
    </div>

    <!-- Main Timeline Container -->
    <div
      class="flex-1 flex flex-col bg-[#080808] border-t border-white/5 shrink-0 overflow-x-auto custom-scrollbar relative"
      ref="containerRef">
      <!-- Ruler Area (Fixed Top) -->
      <div class="sticky top-0 z-50 h-8 shrink-0 bg-[#0a0a0a] border-b border-white/5"
        :style="{ width: `${trackBackgroundWidth}px` }">
        <!-- Ruler Logic -->
        <div class="absolute inset-0 flex items-center pointer-events-none">
          <template v-for="(_, index) in timelineAmount" :key="index">
            <div v-if="index % 5 == 0"
              class="flex flex-col items-start justify-end h-full px-1 border-l border-white/20 select-none group/tick"
              :style="{ width: `${SEEK_TIME_WIDTH}px` }">
              <span class="text-[9px] font-mono font-black text-white/30">{{ index }}s</span>
              <div class="h-1.5 w-px bg-white/20" />
            </div>
            <!-- Only show sub-ticks if zoom is high enough to avoid clutter -->
            <div v-else-if="zoomLevel > 0.6" class="flex flex-col justify-end h-full px-0.5 border-l border-white/5"
              :style="{ width: `${SEEK_TIME_WIDTH}px` }">
              <div class="h-1 w-px bg-white/5" />
            </div>
          </template>
        </div>

        <!-- Interactive Seek Layer & Hover -->
        <div class="absolute inset-0 z-30 cursor-pointer hover:bg-white/5 transition-colors" @click="onClickSeekTime"
          @mousemove="onMouseMove" @mouseleave="onMouseLeave" />

        <!-- Hover Indicator -->
        <div v-if="hoverTime !== null"
          class="absolute top-0 bottom-0 pointer-events-none z-30 flex flex-col items-center"
          :style="{ left: `${hoverX}px` }">
          <div class="h-full w-px bg-white/30"></div>
          <div
            class="absolute -top-6 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/10 font-mono">
            {{ hoverTime.toFixed(1) }}s
          </div>
        </div>

        <!-- Playhead -->
        <VueDraggable axis="x" :x="seekTimeInSeconds * SEEK_TIME_WIDTH" :w="1" :z="999" :resizable="false"
          :onDrag="(x) => onDragPlayhead(x)" @dragging="onDragStart" @dragstop="onDragEnd"
          class="!h-[5000px] !w-0 absolute top-0 left-0 pointer-events-none">
          <!-- Ensure playhead is visible above everything but pass events through handle if mostly hidden -->
          <div class="h-full w-px bg-brand-primary shadow-[0_0_10px_rgba(59,130,246,0.8)] relative z-[60]">
            <div
              class="absolute -top-1 -left-[5px] w-[11px] h-[11px] bg-brand-primary rounded-full border border-black shadow pointer-events-auto cursor-ew-resize">
            </div>
          </div>
        </VueDraggable>
      </div>

      <!-- Tracks Container with Sticky Groups -->
      <div class="flex flex-col pb-20 relative min-h-0" :style="{ width: `${trackBackgroundWidth}px` }">

        <!-- SCENE TRACK (Always on top) -->
        <div class="sticky top-8 z-40 bg-[#080808] border-b border-white/10">
          <SortableList v-model="pagesList" group="scenes" :animation="200"
            class="h-14 flex items-center relative overflow-hidden">
            <!-- ... Scene Items from original ... -->
            <template v-for="(page, index) in pagesList" :key="page.id">
              <div
                class="h-full border-r border-white/10 relative group cursor-pointer bg-white/5 hover:bg-white/5 transition-colors shrink-0"
                :style="{ width: `${(page.timeline.duration / 1000) * SEEK_TIME_WIDTH}px` }"
                @click="editor.onChangeActivePage(index)">

                <div
                  :class="cn('absolute inset-0 flex items-center overflow-hidden pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity', editor.page === index ? 'opacity-100' : '')">
                  <div class="flex h-full w-full">
                    <SceneThumbnail
                      v-for="n in Math.max(1, Math.ceil(((page.timeline.duration / 1000) * SEEK_TIME_WIDTH) / 100))"
                      :key="n" :page="index" :style="{ maxWidth: `${SEEK_TIME_WIDTH * 2}px` }"
                      :class="`h-full aspect-video object-cover shrink-0 border-r border-white/5`"
                      :loading="!page.elements" />
                  </div>
                  <span class="absolute left-2 text-[10px] font-bold text-white/40 truncate drop-shadow-md z-10">Scene
                    {{ index + 1
                    }}</span>
                </div>
                <!-- Active Bar -->
                <div v-if="editor.page === index" class="absolute bottom-0 inset-x-0 h-0.5 bg-brand-primary"></div>

                <!-- Include Transitions/Actions (Simplified for brevity, can re-add full logic) -->
                <div class="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <el-button circle size="small" class="!bg-black/50 !border-none !text-white/60"
                    @click.stop="editor.deletePage(index)" v-if="editor.pages.length > 1">
                    <Delete size="10" />
                  </el-button>
                </div>
              </div>
            </template>
            <div class="h-full flex items-center px-4 shrink-0">
              <el-button circle size="small" class="!bg-white/5 !border-white/10" @click="editor.addPage()">
                <Plus size="12" />
              </el-button>
            </div>
          </SortableList>
        </div>

        <!-- VISUALS GROUP -->
        <div class="mt-2" style="max-height: 100px !important; overflow-y: auto;"
          v-if="visualGroups.length > 0 && !isCompact">
          <div class="flex flex-col gap-[2px] mt-1 relative">
            <!-- Subtitles (Pinned) -->
            <!-- <div v-if="subtitleElements.length > 0"
              class="relative group bg-brand-primary/5 border-b border-brand-primary/10"
              :style="{ height: `${rowHeight}px` }">
              <TimelineItem v-for="item in subtitleElements" :key="item.name" :item="item" :element="item"
                :track-width="trackWidth" :type="'text'" :height="rowHeight" :zoom="zoomLevel"
                class="!bg-brand-primary/20 !border-brand-primary/30" @snap="onSnap" :scene-offset="item.sceneOffset"
                @click="(e) => onSelectTrack(e, item)" />
            </div> -->

            <!-- Visual Tracks -->
            <div v-for="(item, idx) in visualGroups" :key="idx"
              class="relative w-full group transition-colors hover:bg-white/5" :style="{ height: `${rowHeight}px` }">

              <!-- Track Controls (Hover) -->
              <div
                class="absolute left-2 top-0 bottom-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 z-20 pointer-events-none sticky-track-controls">
                <div
                  class="flex items-center gap-0.5 p-1 rounded-md bg-[#000]/80 backdrop-blur pointer-events-auto border border-white/10 shadow-lg">
                  <button @click="onToggleRowVisibility(item.row)" class="p-1 hover:text-white text-white/50">
                    <PreviewOpen size="12" />
                  </button>
                  <button @click="onToggleRowLock(item.row)" class="p-1 hover:text-white text-white/50">
                    <Lock size="12" />
                  </button>
                </div>
              </div>

              <template v-for="element in item.row" :key="element.id || element.name">
                <TimelineItem class="absolute top-0 h-full" :element="element" :track-width="trackWidth"
                  :type="element.type" :height="rowHeight" :zoom="zoomLevel" @click="(e) => onSelectTrack(e, element)"
                  @snap="onSnap" :scene-duration="element.sceneDuration" :scene-id="element.sceneId"
                  :scene-offset="element.sceneOffset" :style="{
                    width: `${((element.sceneDuration || 5000) / 1000) * SEEK_TIME_WIDTH}px`
                  }" />
              </template>
            </div>
          </div>
        </div>

        <!-- AUDIO GROUP -->
        <div class="mt-4" v-if="audioGroups.length > 0">
          <div class="flex flex-col gap-[2px] mt-1 relative">
            <div v-for="(item, idx) in audioGroups" :key="`audio-${idx}`" class="relative w-full group hover:bg-white/5"
              :style="{ height: `${rowHeight}px` }">
              <template v-for="element in item.row" :key="element.id">
                <TimelineItem class="absolute top-0 h-full" :element="element" :track-width="trackWidth" type="audio"
                  :height="rowHeight" :zoom="zoomLevel" @click="(e) => onSelectTrack(e, element)" @snap="onSnap"
                  :scene-duration="element.sceneDuration" :scene-id="element.sceneId"
                  :scene-offset="element.sceneOffset" :style="{
                    width: `${((element.sceneDuration || 5000) / 1000) * SEEK_TIME_WIDTH}px`
                  }" />
              </template>
            </div>
          </div>
        </div>

        <!-- SUBTITLE GROUP -->
        <div class="mt-4" v-if="subtitleElements.length > 0">
          <div class="flex flex-col gap-[2px] mt-1 relative">
            <div v-for="(item, idx) in subtitleElements" :key="`subtitle-${idx}`"
              class="relative w-full group hover:bg-white/5" :style="{ height: `${rowHeight}px` }">
              <template v-for="element in item.row" :key="element.id">
                <TimelineItem class="absolute top-0 h-full" :element="element" :track-width="trackWidth" type="text"
                  :height="rowHeight" :zoom="zoomLevel" @click="(e) => onSelectTrack(e, element)" @snap="onSnap"
                  :scene-duration="element.sceneDuration" :scene-id="element.sceneId"
                  :scene-offset="element.sceneOffset" :style="{
                    width: `${((element.sceneDuration || 5000) / 1000) * SEEK_TIME_WIDTH}px`
                  }" />
              </template>
            </div>
          </div>
        </div>

      </div>

      <!-- Snap Line Overlay -->
      <div v-if="snapLine !== null"
        class="absolute inset-y-0 w-px bg-yellow-400/50 shadow-[0_0_10px_rgba(250,204,21,0.5)] z-[60] pointer-events-none"
        :style="{ left: `${snapLine}px` }" />

      <!-- Hover Time Indicator (Full Height) -->
      <div v-if="hoverTime !== null" class="absolute inset-y-0 w-px bg-white/30 z-[55] pointer-events-none"
        :style="{ left: `${hoverX}px` }">
        <div
          class="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded border border-white/10 font-mono whitespace-nowrap">
          {{ hoverTime.toFixed(1) }}s
        </div>
      </div>

      <!-- Scene End Marker -->
      <div class="absolute inset-y-0 w-px border-r-2 border-dashed border-red-500/30 z-[35] pointer-events-none"
        :style="{ left: `${durationInSeconds * SEEK_TIME_WIDTH}px` }">
        <span
          class="absolute top-9 -right-1 translate-x-full text-[9px] font-black text-red-500/50 uppercase tracking-widest rotate-90 origin-top-left whitespace-nowrap">End
          of Timeline</span>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* Scoped styles mainly for sticky behavior if needed */
.sticky-track-controls {
  /* Ensure controls stay visible when scrolling horizontally */
  position: sticky;
  left: 10px;
}
</style>