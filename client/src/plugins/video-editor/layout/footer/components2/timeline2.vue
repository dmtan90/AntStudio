<template>
    <div class="timeline-view flex flex-col h-full bg-[#0a0a0a] overflow-hidden select-none">
        <!-- Resize Handle -->
        <div class="resize-handle h-1 bg-white/5 hover:bg-brand-primary active:bg-brand-primary cursor-row-resize z-[60] transition-colors"
            @mousedown.prevent="startResize"></div>

        <!-- Timeline Section -->
        <div class="timeline-section flex-1 border-t border-white/5 bg-[#111] flex overflow-hidden">
            <!-- Fixed Left: Track Labels -->
            <div
                class="timeline-sidebar w-40 border-r border-white/5 flex flex-col text-[10px] uppercase font-bold text-white/40 bg-[#111] z-50">
                <div class="h-8 border-b border-white/5 flex items-center px-4 bg-black/20">{{ t('videoEditor.footer.tracks') }}</div>
                <div class="flex-1 py-4 flex flex-col">
                    <div class="h-14 mb-1 px-4 flex items-center gap-2">
                        <video-two theme="outline" size="14" /> {{ t('videoEditor.footer.scenes') }}
                    </div>
                    <div class="h-[64px] mb-1 px-4 flex items-center gap-2">
                        <pic theme="outline" size="14" /> {{ t('videoEditor.footer.visuals') }}
                    </div>
                    <div class="h-14 mb-1 px-4 flex items-center gap-2">
                        <voice theme="outline" size="14" /> {{ t('videoEditor.footer.audio') }}
                    </div>
                    <div class="h-14 px-4 flex items-center gap-2">
                        <text theme="outline" size="14" /> {{ t('videoEditor.footer.subtitles') }}
                    </div>
                </div>
            </div>

            <!-- Scrollable Right: Ruler and Tracks -->
            <div ref="timelineViewportRef"
                class="timeline-viewport flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#0d0d0d]"
                @scroll="onScroll" @click="onTimelineClick">
                <div class="timeline-content relative h-full" :style="{ width: totalTimelineWidth + 'px' }">

                    <!-- Ruler Area -->
                    <div class="timeline-ruler h-8 border-b border-white/5 sticky top-0 bg-[#0d0d0d] z-30">
                        <div v-for="s in visibleMarkers" :key="s"
                            class="absolute inset-y-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
                            :style="{ left: s * pxPerSec + 'px', width: pxPerSec + 'px' }"
                            @click.stop="onTimelineClick($event, s)">
                            <div class="text-[9px] text-white/20 font-mono mb-0.5 pointer-events-none select-none">{{
                                formatTime(s) }}</div>
                            <div class="w-px bg-white/10 h-2 pointer-events-none"></div>
                        </div>
                        <!-- Sub-ticks (only if zoomed in) -->
                        <template v-if="pxPerSec > 30">
                            <div v-for="s in secondaryMarkers" :key="'sub_' + s"
                                class="absolute bottom-0 w-px bg-white/5 h-1" :style="{ left: s * pxPerSec + 'px' }">
                            </div>
                        </template>
                    </div>

                    <div class="tracks-area pt-4">
                        <!-- Playhead Line -->
                        <div ref="playheadRef"
                            class="playhead-line absolute top-0 bottom-0 w-0.5 bg-brand-primary z-50 cursor-ew-resize hover:shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-shadow"
                            @mousedown.stop="startDrag">
                            <div
                                class="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-primary rotate-45 -mt-2 shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center justify-center group">
                                <div
                                    class="w-1.5 h-1.5 bg-white rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
                                </div>
                            </div>
                        </div>

                        <!-- Scene Track Area -->
                        <div class="track-row h-14 mb-1 flex items-center relative">
                            <div v-for="(page, idx) in pages" :key="page.id"
                                class="timeline-scene relative rounded-lg border transition-all cursor-pointer group"
                                :class="activePage === idx ? 'border-brand-primary bg-brand-primary/10' : 'border-white/10 bg-[#1a1a1a] hover:border-white/30'"
                                :style="{ width: (page.timeline.duration / 1000) * pxPerSec + 'px', height: '56px' }"
                                @click="selectScene(idx)">
                                <div
                                    class="absolute inset-0 flex items-center justify-center overflow-hidden rounded-lg">
                                    <span class="text-[10px] font-bold text-white/60 truncate px-2">{{ t('videoEditor.footer.scene') }} {{ idx + 1
                                        }}</span>
                                </div>
                                <div v-if="activePage === idx"
                                    class="absolute bottom-0 inset-x-0 h-0.5 bg-brand-primary"></div>
                            </div>
                        </div>

                        <!-- Visual Elements Track Area -->
                        <div class="track-row h-[64px] mb-1 flex items-center relative">
                            <template v-for="(element, idx) in visualElements" :key="element.name">
                                <div class="timeline-clip relative rounded-lg border border-white/10 bg-[#1a1a1a] transition-all cursor-move group"
                                    :class="[
                                        selectedIds.has(element.name) ? 'border-brand-primary shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:border-white/30',
                                        isItemSelected(element) ? 'bg-brand-primary/20' : 'bg-[#1a1a1a]'
                                    ]" :style="{
                                        width: ((element.meta?.duration || 5000) / 1000) * pxPerSec + 'px',
                                        height: '64px',
                                        marginLeft: ((element.sceneOffset + (element.meta?.offset || 0)) / 1000) * pxPerSec + 'px'
                                    }" @click="selectElement($event, element)"
                                    @contextmenu.prevent="openContextMenu($event, element)">

                                    <!-- Transition Button (between clips) -->
                                    <div v-if="idx < visualElements.length - 1 && isConsecutive(element, visualElements[idx + 1])"
                                        class="absolute -right-3 top-1/2 -translate-y-1/2 z-[60] opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            class="w-6 h-6 rounded-full bg-white border border-black flex items-center justify-center text-black hover:scale-110 transition-transform shadow-lg"
                                            @click.stop="openTransitionDialog(element)">
                                            <magic theme="outline" size="12" />
                                        </button>
                                    </div>

                                    <div class="absolute inset-0 flex overflow-hidden rounded-lg">
                                        <div class="h-full w-full bg-white/5 flex items-center justify-center relative">
                                            <img v-if="element.type === 'image' || element.type === 'video'"
                                                :src="element.meta?.thumbnail || element.src"
                                                class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-60 transition-opacity" />
                                            <component v-else :is="getElementIcon(element.type)" theme="outline"
                                                size="24" class="text-white/20 relative z-10" />
                                        </div>
                                    </div>

                                    <!-- Trim Handles (only for selected) -->
                                    <div v-if="selectedElement?.name === element.name"
                                        class="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-brand-primary opacity-80 hover:opacity-100 transition-opacity z-20 flex items-center justify-center"
                                        @mousedown.stop="startTrim($event, 'start', element)">
                                        <div class="w-1 h-4 bg-black rounded-full"></div>
                                    </div>
                                    <div v-if="selectedElement?.name === element.name"
                                        class="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-brand-primary opacity-80 hover:opacity-100 transition-opacity z-20 flex items-center justify-center"
                                        @mousedown.stop="startTrim($event, 'end', element)">
                                        <div class="w-1 h-4 bg-black rounded-full"></div>
                                    </div>

                                    <div
                                        class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-2 flex flex-col justify-end pointer-events-none">
                                        <span class="text-[9px] font-bold truncate">{{ element.name }}</span>
                                        <span class="text-[8px] text-white/40">{{ ((element.meta?.duration || 5000) /
                                            1000).toFixed(1) }}s</span>
                                    </div>
                                </div>
                            </template>
                        </div>

                        <!-- Audio Track Area -->
                        <div class="track-row h-14 mb-2 flex items-center relative">
                            <template v-for="audio in audioElements" :key="audio.id">
                                <div class="timeline-clip-audio relative h-10 rounded-md border border-blue-500/20 bg-blue-900/10 flex items-center px-0 overflow-hidden group/audio"
                                    :data-audio-id="audio.id" :style="{
                                        width: ((audio.meta?.duration || audio.duration * 1000 || 5000) / 1000) * pxPerSec + 'px',
                                        marginLeft: ((audio.sceneOffset + (audio.meta?.offset || audio.offset * 1000 || 0)) / 1000) * pxPerSec + 'px'
                                    }" :class="[selectedIds.has(audio.id) ? 'border-blue-400 bg-blue-500/20' : '']"
                                    @click="selectElement($event, audio)">

                                    <!-- Automation Envelope (SVG) -->
                                    <div class="automation-envelope absolute inset-0 z-10">
                                        <svg width="100%" height="100%" preserveAspectRatio="none"
                                            class="overflow-visible">
                                            <path :d="getAutomationPath(audio)" fill="none"
                                                stroke="rgba(251, 146, 60, 0.8)" stroke-width="1.5"
                                                stroke-dasharray="4 2" />
                                            <circle v-for="pt in audio.automation" :key="pt.id"
                                                :cx="getPointX(pt, audio)" :cy="getPointY(pt)" r="3" fill="#fb923c"
                                                stroke="white" stroke-width="1"
                                                class="cursor-ns-resize pointer-events-auto hover:r-4 transition-all"
                                                @mousedown.stop="startKeyframeDrag($event, audio, pt)" />
                                        </svg>
                                    </div>

                                    <!-- Real Waveform -->
                                    <div class="flex-1 h-full opacity-60 pointer-events-none">
                                        <WaveformDisplay :audio-url="audio.url"
                                            :width="((audio.meta?.duration || audio.duration * 1000 || 5000) / 1000) * pxPerSec"
                                            :height="40" color="rgba(96, 165, 250, 0.5)" />
                                    </div>

                                    <span
                                        class="absolute left-2 top-1 text-[8px] text-blue-400/60 font-black uppercase tracking-tighter truncate z-20">
                                        {{ audio.name || audio.id }}
                                    </span>
                                </div>
                            </template>
                        </div>

                        <!-- Subtitle Track Area -->
                        <div class="track-row h-14 flex items-center relative">
                            <template v-for="subtitle in subtitleElements" :key="subtitle.name">
                                <div class="timeline-clip-subtitle relative h-10 rounded-md border border-brand-primary/20 bg-brand-primary/5 flex items-center px-4"
                                    :style="{
                                        width: ((subtitle.meta?.duration || 5000) / 1000) * pxPerSec + 'px',
                                        marginLeft: ((subtitle.sceneOffset + (subtitle.meta?.offset || 0)) / 1000) * pxPerSec + 'px'
                                    }" @click="selectElement($event, subtitle)">
                                    <span class="text-[9px] text-brand-primary font-bold uppercase truncate">{{
                                        subtitle.name }}</span>
                                </div>
                            </template>
                        </div>

                        <!-- Lasso Selection Overlay -->
                        <div v-if="lassoActive"
                            class="absolute border border-brand-primary bg-brand-primary/10 z-[100] pointer-events-none"
                            :style="{
                                left: Math.min(lassoStart.x, lassoEnd.x) + 'px',
                                top: Math.min(lassoStart.y, lassoEnd.y) + 'px',
                                width: Math.abs(lassoStart.x - lassoEnd.x) + 'px',
                                height: Math.abs(lassoStart.y - lassoEnd.y) + 'px'
                            }">
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Bottom Controls -->
        <div class="h-12 border-t border-white/5 bg-[#0a0a0a] flex items-center justify-between px-4">
            <div class="flex items-center gap-4">
                <button class="ctrl-btn-small hover:text-brand-primary" @click="handleSeek(-5)">
                    <back theme="outline" size="18" />
                </button>
                <button class="ctrl-btn-large bg-brand-primary text-black" @click="togglePlay">
                    <PlayIcon v-if="!isPlaying" theme="filled" size="20" />
                    <PauseIcon v-else theme="filled" size="20" />
                </button>
                <button class="ctrl-btn-small hover:text-brand-primary" @click="handleSeek(5)">
                    <next theme="outline" size="18" />
                </button>

                <div class="font-mono text-xs tracking-wider min-w-[100px] text-center">
                    <span class="text-white">{{ formatTime(currentTime) }}</span>
                    <span class="mx-1 text-white/20">/</span>
                    <span class="text-white/40">{{ formatTime(totalDuration) }}</span>
                </div>
            </div>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-3">
                <button class="text-white/40 hover:text-white transition-colors"
                    @click="pxPerSec = Math.max(5, pxPerSec - 5)">
                    <zoom-out theme="outline" size="16" />
                </button>
                <div class="w-24">
                    <el-slider :model-value="pxPerSec" :min="5" :max="100" :step="1" :show-tooltip="false"
                        class="zoom-slider" @input="(val: any) => { pxPerSec = Array.isArray(val) ? val[0] : val }" />
                </div>
                <button class="text-white/40 hover:text-white transition-colors"
                    @click="pxPerSec = Math.min(100, pxPerSec + 5)">
                    <zoom-in theme="outline" size="16" />
                </button>
            </div>
        </div>

        <!-- Transition Dialog -->
        <el-dialog v-model="transitionDialogVisible" :title="t('videoEditor.footer.selectTransition')" :width="300" align-center
            class="cinematic-dialog">
            <div class="flex flex-col gap-2">
                <button v-for="trans in availableTransitions" :key="trans.value || 'none'"
                    class="w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-white/10 transition-colors flex justify-between items-center bg-[#1a1a1a] border border-white/5"
                    :class="{ '!border-brand-primary !bg-brand-primary/10 text-brand-primary': activeTransitionElement?.meta?.transition === trans.value }"
                    @click="applyTransition(trans.value)">
                    <span class="capitalize">{{ trans.label }}</span>
                    <check v-if="activeTransitionElement?.meta?.transition === trans.value" theme="outline" size="16" />
                </button>
            </div>
        </el-dialog>

        <!-- Context Menu -->
        <teleport to="body">
            <div v-if="contextMenuVisible"
                class="fixed z-[9999] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 min-w-[180px]"
                :style="{ left: contextMenuPosition.x + 'px', top: contextMenuPosition.y + 'px' }" @click.stop
                @contextmenu.prevent>
                <button
                    class="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3"
                    @click="duplicateElement">
                    <copy theme="outline" size="14" />
                    <span>{{ t('videoEditor.footer.duplicate') }}</span>
                </button>
                <button
                    class="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3"
                    @click="copyElement">
                    <copy theme="outline" size="14" />
                    <span>{{ t('videoEditor.footer.copy') }}</span>
                </button>
                <div class="h-px bg-white/5 my-1"></div>
                <button
                    class="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors flex items-center gap-3"
                    @click="deleteElement">
                    <delete theme="outline" size="14" class="text-red-400" />
                    <span class="text-red-400">{{ t('videoEditor.footer.delete') }}</span>
                </button>
            </div>
        </teleport>

        <!-- Click outside to close context menu -->
        <div v-if="contextMenuVisible" class="fixed inset-0 z-[9998]" @click="closeContextMenu"
            @contextmenu.prevent="closeContextMenu">
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
    Play as PlayIcon, Pause as PauseIcon, Back, Next,
    VideoTwo, Pic, Voice, Text, ZoomIn, ZoomOut,
    ImageFiles as ImageIcon, Video as VideoIcon, GraphicDesign as Graphic,
    Magic, Delete, Copy, Lock, Unlock, More, Check
} from '@icon-park/vue-next';
import WaveformDisplay from '@/components/ui/WaveformDisplay.vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { storeToRefs } from 'pinia';
import { debounce, rafThrottle } from 'video-editor/utils/performance';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { t } = useI18n();
const { timeline, elements, audioElements: storeAudioElements } = storeToRefs(canvasStore);

const pxPerSec = ref(20); // Zoom level
const timelineHeight = ref(250);

// Refs
const playheadRef = ref<HTMLElement | null>(null);
const timelineViewportRef = ref<HTMLElement | null>(null);

// Computed
const pages = computed(() => editor.pages);
const activePage = computed(() => editor.page);

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

// Waveform cache to prevent re-rendering
const waveformCache = new Map<string, boolean>();
const shouldRenderWaveform = (audioId: string, width: number) => {
    const key = `${audioId}-${Math.floor(width / 10)}`; // Round to reduce cache misses
    if (!waveformCache.has(key)) {
        waveformCache.set(key, true);
    }
    return true;
};

// Clear waveform cache when zoom changes significantly
watch(() => pxPerSec.value, debounce(() => {
    waveformCache.clear();
}, 300));

// Unified elements across all scenes
const visualElements = computed(() => {
    const visuals: any[] = [];
    editor.pages.forEach((page, index) => {
        const pageElements = page.elements || [];
        const sceneVisuals = pageElements.filter((e: any) => !e.meta?.isSubtitle && (e.meta?.duration || e.duration) > 0);
        sceneVisuals.forEach((el: any) => {
            visuals.push({
                ...el,
                sceneOffset: sceneOffsets.value[index],
                pageIndex: index
            });
        });
    });
    return visuals;
});

const audioElements = computed(() => {
    const audios: any[] = [];
    editor.pages.forEach((page, index) => {
        const pageAudios = (page.audio?.elements || []);
        pageAudios.forEach((el: any) => {
            audios.push({
                ...el,
                sceneOffset: sceneOffsets.value[index],
                pageIndex: index
            });
        });
    });
    return audios;
});

const subtitleElements = computed(() => {
    const subs: any[] = [];
    editor.pages.forEach((page, index) => {
        const pageSubs = (page.elements || []).filter((e: any) => e.meta?.isSubtitle);
        pageSubs.forEach((s: any) => {
            subs.push({
                ...s,
                sceneOffset: sceneOffsets.value[index],
                pageIndex: index
            });
        });
    });
    return subs;
});

const visibleMarkers = computed(() => {
    const duration = totalDuration.value || 60;
    const max = Math.ceil(duration * 2);
    let step = 10;
    if (pxPerSec.value > 50) step = 1;
    else if (pxPerSec.value > 30) step = 2;
    else if (pxPerSec.value > 15) step = 5;

    const markers = [];
    for (let i = 0; i <= max; i += step) markers.push(i);
    return markers;
});

const secondaryMarkers = computed(() => {
    if (pxPerSec.value <= 30) return [];
    const duration = totalDuration.value || 60;
    const max = Math.ceil(duration * 2);
    const markers = [];
    for (let i = 0; i <= max; i += 1) {
        if (i % (pxPerSec.value > 50 ? 0.5 : 1) === 0) markers.push(i);
    }
    return markers;
});

const totalTimelineWidth = computed(() => {
    const dur = totalDuration.value || 0;
    return Math.max(dur * 2, 60) * pxPerSec.value;
});

// Playback state
const isPlaying = computed(() => (timeline.value as any)?.playing || false);
const currentTime = computed(() => {
    const activeOffset = sceneOffsets.value[editor.page] || 0;
    const localSeek = (timeline.value?.seek ?? 0);
    return (activeOffset + localSeek) / 1000;
});

// Selected state
const selectedIds = ref<Set<string>>(new Set());
const selectedElement = computed(() => {
    const primaryId = Array.from(selectedIds.value)[0];
    if (!primaryId) return null;
    return [...visualElements.value, ...audioElements.value, ...subtitleElements.value].find(e => (e.id === primaryId || e.name === primaryId));
});

const isItemSelected = (item: any) => selectedIds.value.has(item.id || item.name);

// Lasso Selection State
const lassoActive = ref(false);
const lassoStart = ref({ x: 0, y: 0 });
const lassoEnd = ref({ x: 0, y: 0 });

// Trim state
const isTrimming = ref(false);
const trimType = ref<'start' | 'end' | null>(null);
const trimElement = ref<any>(null);
const trimStartX = ref(0);
const trimOriginalDuration = ref(0);
const trimOriginalOffset = ref(0);

// Transition state
const transitionDialogVisible = ref(false);
const activeTransitionElement = ref<any>(null);
const availableTransitions = [
    { label: 'None', value: null },
    { label: 'Fade', value: 'fade' },
    { label: 'Dissolve', value: 'dissolve' },
    { label: 'Wipe', value: 'wipe' },
    { label: 'Slide', value: 'slide' }
];

// Context menu state
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const contextMenuElement = ref<any>(null);

// Actions
const togglePlay = () => {
    if (isPlaying.value) {
        (timeline.value as any)?.pause();
    } else {
        (timeline.value as any)?.play();
    }
};

const handleSeek = (seconds: number) => {
    const newTime = Math.max(0, Math.min(currentTime.value + seconds, totalDuration.value));
    seekToGlobalTime(newTime);
};

const seekToGlobalTime = (seconds: number) => {
    const ms = seconds * 1000;

    // Find target scene
    let targetPage = 0;
    let localTime = 0;

    for (let i = 0; i < editor.pages.length; i++) {
        const dur = (editor.pages[i].timeline as any)?.duration || 5000;
        const start = sceneOffsets.value[i];
        if (ms < start + dur) {
            targetPage = i;
            localTime = ms - start;
            break;
        }
        if (i === editor.pages.length - 1) {
            targetPage = i;
            localTime = Math.min(ms - start, dur);
        }
    }

    if (targetPage !== editor.page) {
        editor.onChangeActivePage(targetPage);
        setTimeout(() => {
            (timeline.value as any)?.set("seek", localTime);
        }, 50);
    } else {
        (timeline.value as any)?.set("seek", localTime);
    }
};

const selectScene = (idx: number) => {
    editor.onChangeActivePage(idx);
};

const selectElement = (e: MouseEvent, element: any) => {
    const id = element.id || element.name;
    const isMulti = e.shiftKey || e.metaKey || e.ctrlKey;

    if (!isMulti) {
        selectedIds.value.clear();
        selectedIds.value.add(id);
    } else {
        if (selectedIds.value.has(id)) {
            selectedIds.value.delete(id);
        } else {
            selectedIds.value.add(id);
        }
    }

    // Update global selection
    if (element.pageIndex !== undefined && element.pageIndex !== editor.page) {
        editor.onChangeActivePage(element.pageIndex);
        setTimeout(() => {
            syncGlobalSelection(element, isMulti);
        }, 100);
    } else {
        syncGlobalSelection(element, isMulti);
    }
};

const syncGlobalSelection = (element: any, multiple: boolean) => {
    if (element.isAudio || element.type === 'audio') {
        (canvasStore.selection as any)?.selectAudio(element);
    } else {
        (canvasStore.selection as any)?.selectObjectByName(element.name, multiple);
    }
};

const getElementIcon = (type: string) => {
    switch (type) {
        case 'image': return ImageIcon;
        case 'video': return VideoIcon;
        case 'shape': return Graphic;
        default: return Pic;
    }
};

const onScroll = (e: Event) => {
    // Unused for now
};

const onTimelineClick = (e: MouseEvent, time?: number) => {
    if (time !== undefined) {
        seekToGlobalTime(time);
    } else if (timelineViewportRef.value) {
        const rect = timelineViewportRef.value.getBoundingClientRect();
        const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft;

        // If not clicking an item, handle seek and start lasso
        const target = e.target as HTMLElement;
        if (target.classList.contains('timeline-content') || target.classList.contains('tracks-area') || target.classList.contains('track-row')) {
            const newTime = offsetX / pxPerSec.value;
            seekToGlobalTime(newTime);
            startLasso(e);
        }
    }
};

// Lasso Logic
const startLasso = (e: MouseEvent) => {
    lassoActive.value = true;
    const rect = timelineViewportRef.value!.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineViewportRef.value!.scrollLeft;
    const y = e.clientY - rect.top;
    lassoStart.value = { x, y };
    lassoEnd.value = { x, y };

    window.addEventListener('mousemove', onLassoMove);
    window.addEventListener('mouseup', stopLasso);
};

const onLassoMove = (e: MouseEvent) => {
    if (!lassoActive.value) return;
    const rect = timelineViewportRef.value!.getBoundingClientRect();
    lassoEnd.value = {
        x: e.clientX - rect.left + timelineViewportRef.value!.scrollLeft,
        y: e.clientY - rect.top
    };
};

const stopLasso = () => {
    if (!lassoActive.value) return;
    lassoActive.value = false;

    // Calculate final selection
    const lLeft = Math.min(lassoStart.value.x, lassoEnd.value.x);
    const lRight = Math.max(lassoStart.value.x, lassoEnd.value.x);
    const lTop = Math.min(lassoStart.value.y, lassoEnd.value.y);
    const lBottom = Math.max(lassoStart.value.y, lassoEnd.value.y);

    const allClips = [...visualElements.value, ...audioElements.value, ...subtitleElements.value];

    allClips.forEach(clip => {
        const left = ((clip.sceneOffset + (clip.meta?.offset || 0)) / 1000) * pxPerSec.value;
        const right = left + ((clip.meta?.duration || clip.duration * 1000 || 5000) / 1000) * pxPerSec.value;
        const id = clip.id || clip.name;

        // Simple horizontal intersection check for now (refine later if needed with vertical)
        if (lRight >= left && lLeft <= right) {
            selectedIds.value.add(id);
        }
    });

    window.removeEventListener('mousemove', onLassoMove);
    window.removeEventListener('mouseup', stopLasso);
};

// Dragging Logic
const isDragging = ref(false);

const startDrag = (e: MouseEvent) => {
    isDragging.value = true;
    document.body.style.cursor = 'ew-resize';
};

const onDrag = (e: MouseEvent) => {
    if (!isDragging.value || !timelineViewportRef.value) return;
    const rect = timelineViewportRef.value.getBoundingClientRect();
    const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft;
    const newTime = Math.max(0, offsetX / pxPerSec.value);
    seekToGlobalTime(newTime);
};

const stopDrag = () => {
    if (isDragging.value) {
        isDragging.value = false;
        document.body.style.cursor = '';
    }
};

// Resize Logic
const isResizing = ref(false);
const startY = ref(0);
const startHeight = ref(0);

const startResize = (e: MouseEvent) => {
    isResizing.value = true;
    startY.value = e.clientY;
    startHeight.value = timelineHeight.value;
    document.body.style.cursor = 'row-resize';
    window.addEventListener('mousemove', onResize);
    window.addEventListener('mouseup', stopResize);
};

const onResize = (e: MouseEvent) => {
    if (!isResizing.value) return;
    const deltaY = startY.value - e.clientY;
    const newHeight = startHeight.value + deltaY;
    timelineHeight.value = Math.max(100, Math.min(window.innerHeight * 0.8, newHeight));
};

const stopResize = () => {
    isResizing.value = false;
    document.body.style.cursor = '';
    window.removeEventListener('mousemove', onResize);
    window.removeEventListener('mouseup', stopResize);
};

const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
};

// Trim Handles Logic
const startTrim = (e: MouseEvent, type: 'start' | 'end', element: any) => {
    isTrimming.value = true;
    trimType.value = type;
    trimElement.value = element;
    trimStartX.value = e.clientX;
    trimOriginalDuration.value = (element.meta?.duration || 5000) / 1000;
    trimOriginalOffset.value = (element.meta?.offset || 0) / 1000;

    document.body.style.cursor = 'ew-resize';
    window.addEventListener('mousemove', onTrim);
    window.addEventListener('mouseup', stopTrim);
};

const onTrim = (e: MouseEvent) => {
    if (!isTrimming.value || !trimElement.value) return;

    const deltaX = e.clientX - trimStartX.value;
    const deltaSeconds = deltaX / pxPerSec.value;

    if (trimType.value === 'end') {
        // Adjust duration from end
        let newDuration = trimOriginalDuration.value + deltaSeconds;
        newDuration = Math.max(0.5, newDuration); // Min 0.5s

        // Update element duration visually
        if (trimElement.value.meta) {
            trimElement.value.meta.duration = newDuration * 1000;
        }
    } else if (trimType.value === 'start') {
        // Adjust offset and duration from start
        let newOffset = trimOriginalOffset.value + deltaSeconds;
        let newDuration = trimOriginalDuration.value - deltaSeconds;

        // Constraints
        if (newOffset < 0) {
            newDuration += newOffset;
            newOffset = 0;
        }
        newDuration = Math.max(0.5, newDuration);

        // Update element
        if (trimElement.value.meta) {
            trimElement.value.meta.offset = newOffset * 1000;
            trimElement.value.meta.duration = newDuration * 1000;
        }
    }
};

const stopTrim = async () => {
    if (isTrimming.value && trimElement.value) {
        isTrimming.value = false;
        trimType.value = null;
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', onTrim);
        window.removeEventListener('mouseup', stopTrim);

        // Persist changes would go here
        // await canvasStore.updateElement(trimElement.value);
        trimElement.value = null;
    }
};

// Transition Logic
const isConsecutive = (el1: any, el2: any) => {
    // Check if elements are in same scene and consecutive
    if (el1.pageIndex !== el2.pageIndex) return false;
    const el1End = (el1.meta?.offset || 0) + (el1.meta?.duration || 5000);
    const el2Start = (el2.meta?.offset || 0);
    return Math.abs(el1End - el2Start) < 100; // Within 100ms
};

const openTransitionDialog = (element: any) => {
    activeTransitionElement.value = element;
    transitionDialogVisible.value = true;
};

const applyTransition = async (type: string | null) => {
    if (!activeTransitionElement.value) return;

    // Store transition in element metadata
    if (!activeTransitionElement.value.meta) {
        activeTransitionElement.value.meta = {};
    }
    activeTransitionElement.value.meta.transition = type;

    transitionDialogVisible.value = false;
    // Persist changes
    // await canvasStore.updateElement(activeTransitionElement.value);
};

// Context Menu Logic
const openContextMenu = (e: MouseEvent, element: any) => {
    contextMenuElement.value = element;
    contextMenuPosition.value = { x: e.clientX, y: e.clientY };
    contextMenuVisible.value = true;
};

const closeContextMenu = () => {
    contextMenuVisible.value = false;
    contextMenuElement.value = null;
};

const deleteElement = async () => {
    if (!contextMenuElement.value) return;
    // await canvasStore.deleteElement(contextMenuElement.value);
    closeContextMenu();
};

const duplicateElement = async () => {
    if (!contextMenuElement.value) return;
    // await canvasStore.duplicateElement(contextMenuElement.value);
    closeContextMenu();
};

const copyElement = () => {
    if (!contextMenuElement.value) return;
    // Copy to clipboard
    closeContextMenu();
};

// Update playhead position
watch(currentTime, (time) => {
    if (playheadRef.value) {
        playheadRef.value.style.left = `${time * pxPerSec.value}px`;
    }
});

onMounted(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
});

onUnmounted(() => {
    window.removeEventListener('mousemove', onDrag);
    window.removeEventListener('mouseup', stopDrag);
});

// --- Audio Automation Logic ---
const getAutomationPath = (audio: any) => {
    const duration = (audio.meta?.duration || audio.duration * 1000 || 5000);
    const width = (duration / 1000) * pxPerSec.value;
    const height = 40;

    if (!audio.automation || audio.automation.length === 0) {
        const vol = audio.volume !== undefined ? audio.volume : 1;
        const y = height * (1 - vol);
        return `M 0 ${y} L ${width} ${y}`;
    }

    const sorted = [...audio.automation].sort((a, b) => a.time - b.time);
    let path = `M 0 ${height * (1 - (audio.volume || 1))}`;

    sorted.forEach((pt, idx) => {
        const x = (pt.time / duration) * width;
        const y = height * (1 - pt.value);
        if (pt.easing === 'step' && idx > 0) {
            const prevPt = sorted[idx - 1];
            path += ` L ${x} ${height * (1 - prevPt.value)}`;
        }
        path += ` L ${x} ${y}`;
    });

    path += ` L ${width} ${height * (1 - sorted[sorted.length - 1].value)}`;
    return path;
};

const getPointX = (pt: any, audio: any) => {
    const duration = (audio.meta?.duration || audio.duration * 1000 || 5000);
    const width = (duration / 1000) * pxPerSec.value;
    return (pt.time / duration) * width;
};

const getPointY = (pt: any) => {
    return 40 * (1 - pt.value);
};

const isDraggingKeyframe = ref(false);
const activeDraggingPoint = ref<any>(null);
const activeDraggingAudio = ref<any>(null);

const startKeyframeDrag = (e: MouseEvent, audio: any, pt: any) => {
    isDraggingKeyframe.value = true;
    activeDraggingPoint.value = pt;
    activeDraggingAudio.value = audio;

    window.addEventListener('mousemove', onKeyframeDrag);
    window.addEventListener('mouseup', stopKeyframeDrag);
    document.body.style.cursor = 'ns-resize';
};

const onKeyframeDrag = (e: MouseEvent) => {
    if (!isDraggingKeyframe.value || !activeDraggingPoint.value || !activeDraggingAudio.value) return;

    const clipEl = document.querySelector(`[data-audio-id="${activeDraggingAudio.value.id}"]`);
    if (!clipEl) return;

    const rect = clipEl.getBoundingClientRect();
    const offsetY = e.clientY - rect.top;

    let newValue = 1 - (offsetY / 40);
    newValue = Math.max(0, Math.min(1, newValue));

    activeDraggingPoint.value.value = newValue;

    canvasStore.canvas?.audio.update(activeDraggingAudio.value.id, {
        automation: [...activeDraggingAudio.value.automation]
    });
};

const stopKeyframeDrag = () => {
    isDraggingKeyframe.value = false;
    activeDraggingPoint.value = null;
    activeDraggingAudio.value = null;

    window.removeEventListener('mousemove', onKeyframeDrag);
    window.removeEventListener('mouseup', stopKeyframeDrag);
    document.body.style.cursor = '';
};
</script>

<style lang="scss" scoped>
.timeline-view {
    display: flex;
    flex-direction: column;
    height: 100%;
    width: 100%;
    background-color: #0a0a0a;
    overflow: hidden;
}

.timeline-section {
    flex: 1;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    background-color: #111;
    display: flex;
    overflow: hidden;
}

.timeline-sidebar {
    width: 160px;
    flex-shrink: 0;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    flex-direction: column;
    background-color: #111;
    z-index: 50;
}

.timeline-viewport {
    flex: 1;
    overflow-x: auto;
    overflow-y: hidden;
    position: relative;
    background-color: #0d0d0d;
}

.track-row {
    display: flex;
    align-items: center;
    position: relative;

    &::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        height: 1px;
        background: rgba(255, 255, 255, 0.03);
        top: 0;
    }
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

    &:hover {
        transform: scale(1.1);
    }
}

.ctrl-btn-small {
    background: none;
    border: none;
    color: #fff;
    cursor: pointer;
    opacity: 0.5;
    transition: all 0.2s;

    &:hover {
        opacity: 1;
    }
}

.timeline-clip,
.timeline-scene {
    flex-shrink: 0;
    margin-right: 2px;
}

.timeline-clip-audio {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: inset 0 0 10px rgba(0, 0, 0, 0.2);

    &:hover {
        background-color: rgba(30, 58, 138, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
    }

    .automation-envelope {
        background: linear-gradient(180deg, rgba(251, 146, 60, 0.03) 0%, transparent 100%);
    }
}

.custom-scrollbar::-webkit-scrollbar {
    height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.05);
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
