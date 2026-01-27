<template>
    <div class="google-vids-timeline flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
        <!-- Top Controls Bar -->
        <div
            class="timeline-controls h-12 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-4 shrink-0">
            <!-- Left: Playback Controls -->
            <div class="playback-controls flex items-center gap-4">
                <button class="ctrl-btn-large bg-brand-primary text-black hover:scale-110 transition-transform"
                    @click="togglePlay">
                    <Play v-if="!isPlaying" theme="filled" :size="20" />
                    <Pause v-else theme="filled" :size="20" />
                </button>

                <div class="font-mono text-xs tracking-wider min-w-[120px] text-center">
                    <span class="text-white">{{ formatTime(currentTime) }}</span>
                    <span class="mx-1 text-white/20">/</span>
                    <span class="text-white/40">{{ formatTime(totalDuration) }}</span>
                </div>
            </div>

            <!-- Center: Show Timing Toggle -->
            <button
                class="toggle-timing-btn flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                :class="{ 'bg-white/10': showTiming }" @click="showTiming = !showTiming">
                <ViewList :size="16" />
                <span class="text-sm">Show timing</span>
                <ChevronDown v-if="!showTiming" :size="12" />
                <ChevronUp v-else :size="12" />
            </button>

            <!-- Right: Zoom Controls -->
            <div class="zoom-controls flex items-center gap-3">
                <button class="text-white/40 hover:text-white transition-colors p-2" @click="zoomOut">
                    <ZoomOut theme="outline" :size="16" />
                </button>
                <div class="w-24">
                    <el-slider v-model="pxPerSec" :min="5" :max="50" :step="1" :show-tooltip="false"
                        class="zoom-slider" />
                </div>
                <button class="text-white/40 hover:text-white transition-colors p-2" @click="zoomIn">
                    <ZoomIn theme="outline" :size="16" />
                </button>
                <span class="text-xs text-white/40 min-w-[40px]">{{ Math.round((pxPerSec / 20) * 100) }}%</span>
            </div>
        </div>

        <!-- Scene Cards Row -->
        <div ref="timelineContainer"
            class="scenes-row flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar bg-[#111] p-4 relative"
            @click="handleTimelineClick" @mousedown.stop>
            <div class="scenes-container flex items-start gap-2 h-full relative"
                :style="{ minWidth: totalWidth + 'px' }">

                <!-- Playhead -->
                <div class="playhead absolute top-0 bottom-0 w-0.5 bg-brand-primary z-50 pointer-events-none"
                    :style="{ left: playheadPosition + 'px' }">
                    <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-primary rotate-45 pointer-events-auto cursor-ew-resize hover:scale-125 transition-transform"
                        @mousedown.stop="startScrub"></div>
                </div>

                <SceneCard v-for="(page, index) in pages" :key="page.id" :scene="page" :index="index"
                    :active="activePage === index" :show-timing="showTiming" :zoom="pxPerSec" draggable="true"
                    @dragstart="onDragStart($event, index)" @dragover.prevent @drop="onDrop($event, index)"
                    @select="selectScene(index)" @select-element="(el) => selectElement(el, index)" />

                <!-- Add Scene Button -->
                <button
                    class="add-scene-btn flex items-center justify-center min-w-[120px] h-[180px] border-2 border-dashed border-white/20 rounded-12px hover:border-white/40 hover:bg-white/5 transition-all"
                    :class="{ 'h-[100px]': !showTiming }" @click="addScene">
                    <Plus :size="32" class="text-white/40" />
                </button>
            </div>
        </div>

        <!-- Audio Track (Full Width) -->
        <div class="audio-track h-16 border-t border-white/5 bg-[#0d0d0d] flex items-center px-4 shrink-0">
            <div class="track-label flex items-center gap-2 w-40 text-xs uppercase font-bold text-white/40">
                <Music :size="14" />
                <span>Audio</span>
            </div>
            <div class="audio-waveform flex-1 h-10 bg-white/5 rounded-lg relative overflow-hidden">
                <!-- Audio waveform visualization would go here -->
                <div class="flex items-center gap-0.5 h-full px-2">
                    <div v-for="i in 200" :key="i" class="w-0.5 bg-blue-400/40 rounded-full transition-all"
                        :style="{ height: (20 + (i * 13) % 60) + '%' }">
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
    Play,
    Pause,
    ZoomIn,
    ZoomOut,
    Plus,
    Music,
    ViewList,
    Down as ChevronDown,
    Up as ChevronUp
} from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import SceneCard from './components/SceneCard.vue';
import { useTimelinePlayer } from '@/composables/useTimelinePlayer'; // Assume we might migrate to this eventually, but for now stick to store

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { timeline } = storeToRefs(canvasStore);

// State
const pxPerSec = ref(20); // Zoom level (pixels per second)
const showTiming = ref(false); // Show timing toggle
const timelineContainer = ref<HTMLElement | null>(null);
const isScrubbing = ref(false);

// Computed
const pages = computed(() => editor.pages);
const activePage = computed(() => editor.page);
const isPlaying = computed(() => (timeline.value as any)?.playing || false);

// Calculate scene offsets for unified timeline
const sceneOffsets = computed(() => {
    let acc = 0;
    return editor.pages.map(page => {
        const start = acc;
        acc += ((page.timeline as any)?.duration || 5000);
        return start;
    });
});

const totalDuration = computed(() => {
    return editor.pages.reduce((acc, page) => acc + ((page.timeline as any)?.duration || 5000), 0) / 1000;
});

const currentTime = computed(() => {
    const activeOffset = sceneOffsets.value[editor.page] || 0;
    // Fallback safely if timeline isn't ready
    const localSeek = (timeline.value?.seek ?? 0);
    return (activeOffset + localSeek) / 1000;
});

const playheadPosition = computed(() => {
    return currentTime.value * pxPerSec.value;
});

const totalWidth = computed(() => {
    return totalDuration.value * pxPerSec.value + 200; // Extra space for add button
});

// Actions
const togglePlay = () => {
    if (isPlaying.value) {
        (timeline.value as any)?.pause();
    } else {
        (timeline.value as any)?.play();
    }
};

const zoomIn = () => {
    pxPerSec.value = Math.min(50, pxPerSec.value + 5);
};

const zoomOut = () => {
    pxPerSec.value = Math.max(5, pxPerSec.value - 5);
};

const selectScene = (index: number) => {
    editor.onChangeActivePage(index);
};

const selectElement = (element: any, pageIndex: number) => {
    // If element is in a different page, switch first
    if (editor.page !== pageIndex) {
        editor.onChangeActivePage(pageIndex);
        setTimeout(() => {
            performSelectElement(element);
        }, 50);
    } else {
        performSelectElement(element);
    }
};

const performSelectElement = (element: any) => {
    // Select element in canvas
    if (element.isAudio || element.type === 'audio') {
        (canvasStore.selection as any)?.selectAudio(element);
    } else {
        (canvasStore.selection as any)?.selectObjectByName(element.name);
    }
};

const addScene = () => {
    editor.addPage();
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// Seek & Scrub
const handleTimelineClick = (e: MouseEvent) => {
    if (isScrubbing.value) return;
    seekToEvent(e);
};

const startScrub = () => {
    isScrubbing.value = true;
    document.body.style.cursor = 'col-resize';
    window.addEventListener('mousemove', onScrub);
    window.addEventListener('mouseup', stopScrub);
};

const onScrub = (e: MouseEvent) => {
    seekToEvent(e);
};

const stopScrub = () => {
    isScrubbing.value = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onScrub);
    window.removeEventListener('mouseup', stopScrub);
};

const seekToEvent = (e: MouseEvent) => {
    if (!timelineContainer.value) return;
    const rect = timelineContainer.value.getBoundingClientRect();
    const scrollLeft = timelineContainer.value.scrollLeft;
    // Calculate click position relative to the SCROLLABLE content container
    // offsetX inside the container = (e.clientX - rect.left) + scrollLeft
    // But we need to handle padding if any. 
    // Simplified: left inside row = clientX - rect.left + scrollLeft - paddingLeft(16)

    // Easier way: The playhead and scenes are inside .scenes-container.
    // We should ideally calculate relative to .scenes-container if strictly matched, but getting click on wrapper.

    const clickX = (e.clientX - rect.left) + scrollLeft - 16; // 16px padding
    const time = Math.max(0, clickX / pxPerSec.value);

    seekToGlobalTime(time);
};

const seekToGlobalTime = (seconds: number) => {
    const ms = seconds * 1000;

    // Find which scene contains this time
    let targetPage = 0;
    let localTime = 0;

    // Find the scene index based on accumulation
    // We can reuse sceneOffsets logic
    const offsets = sceneOffsets.value;

    for (let i = 0; i < pages.value.length; i++) {
        const start = offsets[i];
        const pageDuration = (pages.value[i].timeline as any)?.duration || 5000;
        const end = start + pageDuration;

        if (ms >= start && ms < end) {
            targetPage = i;
            localTime = ms - start;
            break;
        } else if (i === pages.value.length - 1 && ms >= end) {
            // Clamped to end of last scene
            targetPage = i;
            localTime = pageDuration;
        }
    }

    if (targetPage !== editor.page) {
        editor.onChangeActivePage(targetPage);
        // Wait a tick for scene switch
        setTimeout(() => {
            (timeline.value as any)?.set("seek", localTime);
        }, 50);
    } else {
        (timeline.value as any)?.set("seek", localTime);
    }
};

// Auto Scroll logic (optional)
watch(playheadPosition, (newPos) => {
    if (!timelineContainer.value || isScrubbing.value) return;
    // Only scroll if playing and playhead is getting close to edge or out of view
    // ... basic implementation can be added later if requested
});

// Drag and Drop Scene Reordering
const onDragStart = (e: DragEvent, index: number) => {
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    }
};

const onDrop = (e: DragEvent, targetIndex: number) => {
    if (e.dataTransfer) {
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
            editor.swapPage(sourceIndex, targetIndex);

            // Sync active page if needed
            if (activePage.value === sourceIndex) {
                editor.onChangeActivePage(targetIndex);
            } else if (activePage.value === targetIndex) {
                editor.onChangeActivePage(sourceIndex);
            }
        }
    }
};

</script>

<style lang="scss" scoped>
.google-vids-timeline {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: #0a0a0a;
}

.timeline-controls {
    flex-shrink: 0;
}

.ctrl-btn-large {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
}

.toggle-timing-btn {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.scenes-row {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
}

.scenes-container {
    min-height: 100%;
    padding-right: 100px;
    /* Space for add button */
    position: relative;
    /* Ensure scenes flow horizontally */
    display: flex;
}

.add-scene-btn {
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 12px;

    &:hover {
        transform: scale(1.02);
    }
}

.audio-track {
    flex-shrink: 0;
}

.custom-scrollbar::-webkit-scrollbar {
    height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 3px;
}

.zoom-slider {
    :deep(.el-slider__runway) {
        background-color: rgba(255, 255, 255, 0.1);
        height: 4px;
    }

    :deep(.el-slider__bar) {
        background-color: #ffffff;
        height: 4px;
    }

    :deep(.el-slider__button) {
        width: 12px;
        height: 12px;
        border: 2px solid #ffffff;
        background-color: #000;
    }
}
</style>
