<template>
    <div class="google-vids-timeline flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
        <!-- Top Controls Bar -->
        <div
            class="timeline-controls h-12 border-b border-white/5 bg-[#111] flex items-center justify-between px-4 shrink-0">
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

        <!-- Unified Timeline Body -->
        <div class="timeline-main-area flex-1 flex overflow-hidden relative">

            <!-- Left Fixed Labels (Ultra Minimalist) -->
            <div
                class="timeline-labels w-4 flex flex-col border-r border-white/5 bg-[#0a0a0a] z-30 shrink-0 select-none">
                <!-- Scenes Space -->
                <div class="h-[64px] border-b border-white/5"></div>
                <!-- Narration Space -->
                <div class="h-[28px] mb-[5px] border-b border-white/5 relative">
                    <button
                        class="record-btn-mini absolute -right-2 top-1/2 -translate-y-1/2 p-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 rounded-full transition-all z-40"
                        :class="{ 'recording pulse': isRecording }" @click.stop="toggleRecording">
                        <Record :size="8" />
                    </button>
                </div>
                <!-- Music Space -->
                <div class="h-[28px]"></div>
            </div>

            <!-- Scrollable Tracks Content -->
            <div ref="timelineContainer"
                class="timeline-tracks flex-1 overflow-x-auto overflow-y-auto custom-scrollbar bg-[#111] relative"
                @click="handleTimelineClick" @mousedown.stop>

                <div class="tracks-content relative pt-8" :style="{ minWidth: totalWidth + 'px' }"
                    @mousemove="handleMouseMove" @mouseenter="showIndicator = true" @mouseleave="showIndicator = false">

                    <!-- Hover Time Indicator -->
                    <div v-if="showIndicator"
                        class="hover-indicator absolute top-0 bottom-0 w-px bg-white/20 z-50 pointer-events-none"
                        :style="{ left: hoverX + 'px' }">
                        <div
                            class="hover-bubble absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-white text-black text-[11px] font-bold rounded shadow-xl whitespace-nowrap z-[60]">
                            {{ formatTimeValue(hoverTime) }}
                        </div>
                    </div>

                    <!-- Playhead (Global) -->
                    <div class="playhead absolute top-0 bottom-0 w-px bg-brand-primary z-50 pointer-events-none"
                        :style="{ left: playheadPosition + 'px' }">
                        <!-- Playhead Handle -->
                        <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-primary rotate-45 pointer-events-auto cursor-ew-resize hover:scale-125 transition-transform"
                            @mousedown.stop="startScrub"></div>
                    </div>

                    <!-- Markers -->
                    <div v-for="marker in markers" :key="marker.id"
                        class="absolute top-0 bottom-0 z-40 w-px bg-yellow-500/50 pointer-events-none"
                        :style="{ left: ((marker.time / 1000 * pxPerSec)) + 'px' }">
                        <div class="absolute -top-1 left-0 -translate-x-1/2 w-2 h-2 bg-yellow-500 rotate-45"></div>
                    </div>

                    <!-- Scenes Track -->
                    <div
                        class="track-row scenes-track h-[64px] flex items-center gap-0 py-0 pl-0 relative border-b border-white/5">
                        <template v-for="(page, index) in pages" :key="page.id">
                            <SceneCard :scene="page" :index="index" :active="activePage === index"
                                :show-timing="showTiming" :zoom="pxPerSec" draggable="true"
                                :class="{ 'dragging': draggingIndex === index }" @dragstart="onDragStart($event, index)"
                                @dragend="onDragEnd" @dragover.prevent @drop="onDrop($event, index)"
                                @select="selectScene(index)" @select-element="(el) => selectElement(el, index)" />

                            <!-- Transition Button (Overlay at the seam) -->
                            <div v-if="index < pages.length - 1"
                                class="transition-trigger-area w-0 h-full relative z-30 overflow-visible">
                                <div
                                    class="absolute inset-y-0 left-0 -translate-x-1/2 flex items-center pointer-events-auto">
                                    <TransitionTrigger :model-value="pages[index + 1].transition || 'none'"
                                        :duration-value="pages[index + 1].transitionDuration"
                                        @update:model-value="(val) => updateTransition(index + 1, 'transition', val)"
                                        @update:duration-value="(val) => updateTransition(index + 1, 'transitionDuration', val)" />
                                </div>
                            </div>
                        </template>

                        <!-- Add Scene Button -->
                        <button
                            class="add-scene-btn flex items-center justify-center min-w-[120px] h-[48px] border-2 border-dashed border-white/20 rounded-12px hover:border-white/40 hover:bg-white/5 transition-all ml-4"
                            @click="addScene">
                            <Plus :size="24" class="text-white/40" />
                        </button>
                    </div>

                    <!-- Narration Track (Merged Subtitles & Voiceover) -->
                    <div
                        class="track-row h-[28px] mb-[5px] border-b border-white/5 flex items-center px-0 pl-0 relative">
                        <div
                            class="track-items-container flex-1 h-[22px] bg-white/5 rounded-md relative overflow-hidden">
                            <!-- Subtitles -->
                            <div v-for="sub in allSubtitles" :key="sub.id"
                                class="subtitle-item absolute top-0.5 h-3 bg-yellow-500/30 border border-yellow-500/40 rounded flex items-center px-1 text-[7px] text-yellow-200/90 whitespace-nowrap overflow-hidden z-10"
                                :style="{
                                    left: (sub.globalOffset / 1000 * pxPerSec) + 'px',
                                    width: ((sub.meta?.duration || 3000) / 1000 * pxPerSec) + 'px'
                                }" @click.stop="selectElement(sub, sub.pageIndex)" @dblclick.stop="startEditing(sub)">
                                <span class="truncate">{{ sub.text || 'Subtitle' }}</span>
                            </div>

                            <!-- Voiceovers -->
                            <div v-for="vo in voiceoverElements" :key="vo.id"
                                class="audio-item voiceover absolute bottom-0.5 h-4 bg-red-500/20 border border-red-500/40 rounded flex items-center px-1 text-[8px] text-red-200/80 whitespace-nowrap overflow-hidden"
                                :style="{
                                    left: (vo.globalOffset / 1000 * pxPerSec) + 'px',
                                    width: Math.max(0, Math.min(vo.timeline || 3, (vo.sceneDuration / 1000) - vo.offset) * pxPerSec) + 'px'
                                }" @click.stop="selectElement(vo, vo.pageIndex)">
                                <Music :size="8" class="mr-1" /> {{ vo.name || 'Voiceover' }}
                            </div>
                        </div>
                    </div>

                    <!-- Music Track -->
                    <div class="track-row h-[28px] flex items-center px-0 pl-0 relative">
                        <div
                            class="track-items-container flex-1 h-[22px] bg-white/5 rounded-md relative overflow-hidden">
                            <!-- Global Waveform background -->
                            <div v-if="audioWaveform.length > 0"
                                class="absolute inset-0 flex items-center gap-[1px] px-2 opacity-10 pointer-events-none">
                                <div v-for="(val, i) in audioWaveform" :key="i" class="w-1 bg-blue-500 rounded-full"
                                    :style="{ height: Math.max(10, val * 80) + '%' }">
                                </div>
                            </div>
                            <div v-for="audio in musicElements" :key="audio.id"
                                class="audio-item absolute inset-y-0.5 h-[18px] bg-brand-primary/20 border border-brand-primary/40 rounded flex items-center px-1 text-[8px] text-brand-primary/90 whitespace-nowrap overflow-hidden z-20"
                                :style="{
                                    left: (audio.globalOffset / 1000 * pxPerSec) + 'px',
                                    width: Math.max(0, Math.min(audio.timeline || 5, (audio.sceneDuration / 1000) - audio.offset) * pxPerSec) + 'px'
                                }" @click.stop="selectElement(audio, audio.pageIndex)">
                                <Music :size="8" class="mr-1" /> {{ audio.name || 'Audio' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Export Progress Overlay -->
            <div v-if="exporting !== 0 && exporting !== 2"
                class="export-progress-bar absolute top-0 left-0 right-0 h-1 z-[60] bg-white/5 overflow-hidden">
                <div class="h-full bg-primary transition-all duration-300"
                    :style="{ width: (((editor as any).progress?.capture || 0) + ((editor as any).progress?.compile || 0)) / 2 + '%' }">
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { debounce } from 'lodash';
import SceneCard from './components2/SceneCard.vue';
import TransitionTrigger from './components2/TransitionTrigger.vue';
import { useCanvasStore } from 'video-editor/store/canvas';
import {
    Play,
    Pause,
    ZoomIn,
    ZoomOut,
    Plus,
    Music,
    ViewList,
    Down as ChevronDown,
    Up as ChevronUp,
    VolumeMute,
    VolumeSmall,
    VolumeNotice,
    Quote,
    Record
} from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from 'pinia';
import { useTimelinePlayer } from '@/composables/useTimelinePlayer'; // Assume we might migrate to this eventually, but for now stick to store
import { WaveformGenerator } from 'video-editor/utils/WaveformGenerator';
import { uploadFile } from '@/utils/api';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { timeline } = storeToRefs(canvasStore);
const { currentTime, totalDuration, markers } = storeToRefs(editor);

// State
const pxPerSec = computed({
    get: () => (editor.timelineZoom || 1) * 20,
    set: (val) => editor.setTimelineZoom(val / 20)
});

const showTiming = ref(false); // Show timing toggle
const timelineContainer = ref<HTMLElement | null>(null);
const isScrubbing = ref(false);
const audioWaveform = ref<number[]>([]);
const draggingIndex = ref<number | null>(null);
const globalVolume = ref(100);
const TRACK_PADDING = 0;
const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);

// Hover Indicator State
const hoverX = ref(0);
const hoverTime = ref(0);
const showIndicator = ref(false);

const handleMouseMove = (e: MouseEvent) => {
    if (!timelineContainer.value) return;
    const rect = timelineContainer.value.getBoundingClientRect();
    const scrollLeft = timelineContainer.value.scrollLeft;

    // Calculate hover position relative to scrollable content
    const x = (e.clientX - rect.left) + scrollLeft;
    hoverX.value = x;

    // Calculate time based on pxPerSec
    const timeInSeconds = x / pxPerSec.value;
    hoverTime.value = Math.max(0, timeInSeconds);
};

const formatTimeValue = (seconds: number) => {
    if (isNaN(seconds)) return '0:00.0';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const millis = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${millis}`;
};

// Subtitle Editing State
const editingId = ref<string | null>(null);
const editingText = ref('');
const subtitleInputRef = ref<HTMLInputElement | null>(null);

const startEditing = (sub: any) => {
    editingId.value = sub.id;
    editingText.value = sub.text || 'Subtitle';

    // Auto focus next tick
    setTimeout(() => {
        if (subtitleInputRef.value) {
            // If it's an array (v-for ref), take the first one or find the one matching
            const inputs = (subtitleInputRef.value as any);
            if (Array.isArray(inputs)) {
                inputs.find(i => i.offsetParent !== null)?.focus();
            } else {
                (subtitleInputRef.value as any)?.focus();
            }
        }
    }, 10);
};

const cancelEditing = () => {
    editingId.value = null;
    editingText.value = '';
};

const saveSubtitle = (sub: any) => {
    if (editingText.value !== sub.text) {
        // Find and update the element
        const page = editor.pages[sub.pageIndex];
        const canvas = editor.getCanvasInstance(sub.pageIndex);

        if (canvas) {
            const object = canvas.getItemByName(sub.name);
            if (object) {
                // Determine property to update based on type
                // Usually 'text' for Textbox/IText
                object.set('text', editingText.value);
                canvas.renderAll();
                editor.onModified();
                toast.success('Subtitle updated');
            }
        }
    }
    cancelEditing();
};

const toggleRecording = async () => {
    if (isRecording.value) {
        stopRecording();
    } else {
        await startRecording();
    }
};

const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder.value = new MediaRecorder(stream);
        audioChunks.value = [];

        mediaRecorder.value.ondataavailable = (e) => {
            if (e.data.size > 0) {
                audioChunks.value.push(e.data);
            }
        };

        mediaRecorder.value.onstop = async () => {
            const audioBlob = new Blob(audioChunks.value, { type: 'audio/webm' });

            // Upload to S3
            let audioUrl = '';
            const loadingToast = toast.loading('Uploading voiceover...');
            try {
                audioUrl = await uploadFile(audioBlob, 'audio');
                toast.success('Voiceover saved', { id: loadingToast });
            } catch (e) {
                console.error(e);
                toast.error('Failed to save voiceover', { id: loadingToast });
                return;
            }

            // Add to current scene at current playhead position
            const id = `voiceover-${Date.now()}`;
            const page = editor.pages[editor.page];
            if (page) {
                // Audio add expects (url, name, visual?, id?)
                await page.audio.add(audioUrl, 'Voiceover', false, id);

                // Now update the offset to current playhead
                const activeOffset = sceneOffsets.value[editor.page];
                const localPlayheadMs = (timeline.value as any)?.seek || 0;

                page.audio.update(id, {
                    offset: localPlayheadMs / 1000,
                    isVoiceover: true
                });

                // Trigger waveform update
                updateWaveform();
            }

            // Clean up stream
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.value.start();
        isRecording.value = true;
    } catch (err) {
        console.error('Failed to start recording:', err);
    }
};

const stopRecording = () => {
    if (mediaRecorder.value && isRecording.value) {
        mediaRecorder.value.stop();
        isRecording.value = false;
    }
};

// Watch for volume changes and apply to editor
watch(globalVolume, (val) => {
    editor.pages.forEach((page, index) => {
        const instance = editor.getCanvasInstance(index);
        if (instance?.audio) {
            page.audio.elements.forEach(audio => {
                page.audio.update(audio.id, { volume: val / 100 });
            });
        }
    });
});

// Computed
const pages = computed(() => editor.pages);
const activePage = computed(() => editor.page);
const isPlaying = computed(() => {
    const _ = editor.tick;
    return (timeline.value as any)?.playing || false;
});

// Calculate scene offsets for unified timeline
const sceneOffsets = computed(() => {
    let acc = 0;
    return editor.pages.map(page => {
        const start = acc;
        acc += ((page.timeline as any)?.duration || 5000);
        return start;
    });
});



const playheadPosition = computed(() => {
    // currentTime is in milliseconds, convert to seconds
    return (currentTime.value / 1000) * pxPerSec.value;
});

const totalWidth = computed(() => {
    // totalDuration is in milliseconds, convert to seconds
    return (totalDuration.value / 1000) * pxPerSec.value + 200; // Extra space for add button
});

const exporting = computed(() => editor.exporting);

const allSubtitles = computed(() => {
    const subtitles: any[] = [];
    editor.pages.forEach((page, index) => {
        const offset = sceneOffsets.value[index];
        (page.elements || []).forEach(el => {
            if (el.meta?.isSubtitle || el.type === 'subtitle') {
                subtitles.push({
                    ...el,
                    pageIndex: index,
                    globalOffset: offset + (el.meta?.offset || 0),
                    sceneDuration: (page.timeline as any)?.duration || 5000
                });
            }
        });
    });
    return subtitles;
});

const allAudioElements = computed(() => {
    const audios: any[] = [];
    editor.pages.forEach((page, index) => {
        const offset = sceneOffsets.value[index];
        (page.audio?.elements || []).forEach(el => {
            audios.push({
                ...el,
                pageIndex: index,
                globalOffset: offset + (el.offset * 1000),
                sceneDuration: (page.timeline as any)?.duration || 5000
            });
        });
    });
    return audios;
});

const musicElements = computed(() => allAudioElements.value.filter(a => !a.isVoiceover));
const voiceoverElements = computed(() => allAudioElements.value.filter(a => a.isVoiceover));

const formatPercent = (val: number) => {
    return Math.round(val * 100) + '%';
};

// Actions
const togglePlay = () => {
    console.log("togglePlay", isPlaying.value, timeline.value);
    if (!timeline.value) {
        toast.error("Timeline not initialized");
        return;
    }
    if (isPlaying.value) {
        (timeline.value as any).pause();
    } else {
        (timeline.value as any).play();
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

    // Also jump playhead to the start of this scene
    let offset = 0;
    for (let i = 0; i < index; i++) {
        offset += (editor.pages[i].timeline?.duration || 5000) / 1000;
    }
    seekToGlobalTime(offset);
};

const selectElement = (element: any, pageIndex: number) => {
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
    if (element.isAudio || element.type === 'audio') {
        (canvasStore.selection as any)?.selectAudio(element);
    } else {
        (canvasStore.selection as any)?.selectObjectByName(element.name);
    }
};

const addScene = () => {
    editor.addPage(undefined, editor.page + 1);
};

const updateTransition = (index: number, key: string, value: any) => {
    if (key === 'transition') {
        editor.setPageTransition(index, value);
    } else if (key === 'transitionDuration') {
        const page = editor.pages[index];
        if (page) {
            editor.setPageTransition(index, page.transition || 'none', value);
        }
    }
};

const formatTime = (ms: number) => {
    const seconds = ms / 1000;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
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

    // Position is relative to the scrollable content
    const clickX = (e.clientX - rect.left) + scrollLeft;
    const time = Math.max(0, clickX / pxPerSec.value);

    seekToGlobalTime(time);
};

const seekToGlobalTime = (seconds: number) => {
    const ms = seconds * 1000;
    const offsets = sceneOffsets.value;

    let targetPage = 0;
    let localTime = 0;

    for (let i = 0; i < pages.value.length; i++) {
        const start = offsets[i];
        const pageDuration = (pages.value[i].timeline as any)?.duration || 5000;
        const end = start + pageDuration;

        if (ms >= start && ms < end) {
            targetPage = i;
            localTime = ms - start;
            break;
        } else if (i === pages.value.length - 1 && ms >= end) {
            targetPage = i;
            localTime = pageDuration;
        }
    }

    if (targetPage !== editor.page) {
        editor.onChangeActivePage(targetPage);
        setTimeout(() => {
            (timeline.value as any)?.set("seek", localTime / 1000);
        }, 50);
    } else {
        (timeline.value as any)?.set("seek", localTime / 1000);
    }
};

// Auto Scroll logic
watch(playheadPosition, (newPos) => {
    if (!timelineContainer.value || isScrubbing.value || !isPlaying.value) return;

    const container = timelineContainer.value;
    const scrollLeft = container.scrollLeft;
    const viewportWidth = container.clientWidth;
    const padding = 100;

    if (newPos > scrollLeft + viewportWidth - padding) {
        container.scrollTo({
            left: newPos - viewportWidth + padding,
            behavior: 'smooth'
        });
    } else if (newPos < scrollLeft + padding) {
        container.scrollTo({
            left: Math.max(0, newPos - padding),
            behavior: 'smooth'
        });
    }
});

// Drag and Drop Scene Reordering
const onDragStart = (e: DragEvent, index: number) => {
    draggingIndex.value = index;
    if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index.toString());
    }
};

const onDragEnd = () => {
    draggingIndex.value = null;
};

const onDrop = (e: DragEvent, targetIndex: number) => {
    if (e.dataTransfer) {
        const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(sourceIndex) && sourceIndex !== targetIndex) {
            const pages = [...editor.pages];
            const [movedPage] = pages.splice(sourceIndex, 1);
            pages.splice(targetIndex, 0, movedPage);

            editor.reorderPages(pages);
            editor.onChangeActivePage(targetIndex);
        }
    }
};

// Audio Waveform Logic
const updateWaveform = debounce(async () => {
    const totalDurationMs = totalDuration.value;
    if (totalDurationMs === 0 || editor.pages.length === 0) {
        audioWaveform.value = [];
        return;
    }

    const totalSamples = 200;
    const mergedWaveform = new Array(totalSamples).fill(0);

    let currentSampleOffset = 0;

    for (const page of editor.pages) {
        const pageDurationMs = (page.timeline as any)?.duration || 5000;
        const pageSamples = Math.round((pageDurationMs / totalDurationMs) * totalSamples);

        if (pageSamples > 0 && page.audio?.elements?.length > 0) {
            // Priority: use the first non-muted audio with a buffer
            const audio = page.audio.elements.find(el => el.buffer && !el.muted);
            if (audio?.buffer) {
                const sceneWaveform = await WaveformGenerator.generate(audio.buffer, pageSamples);
                for (let i = 0; i < pageSamples; i++) {
                    if (currentSampleOffset + i < totalSamples) {
                        mergedWaveform[currentSampleOffset + i] = sceneWaveform[i];
                    }
                }
            }
        }
        currentSampleOffset += pageSamples;
    }

    audioWaveform.value = mergedWaveform;
}, 300);

watch(() => canvasStore.canvas?.audio?.elements, updateWaveform, { deep: true });
watch(() => editor.page, updateWaveform);

onMounted(() => {
    updateWaveform();
});

onUnmounted(() => {
    stopScrub();
});
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

.timeline-main-area {
    background-color: #0a0a0a;
}

.timeline-labels {
    z-index: 30;

    &>div {
        display: flex;
        align-items: center;
        justify-content: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.3);
        transition: all 0.2s ease;

        &:hover {
            color: white;
            background: rgba(255, 255, 255, 0.02);
        }
    }
}

.timeline-tracks {
    background-color: #111;
}

.track-row {
    transition: background-color 0.2s;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
    }
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

.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    border-style: dashed !important;
}

.custom-scrollbar::-webkit-scrollbar {
    height: 6px;
    width: 6px;
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

.audio-item {
    z-index: 10;
    cursor: pointer;
    transition: transform 0.1s, filter 0.2s;

    &:hover {
        filter: brightness(1.2);
        transform: scaleY(1.05);
    }

    &.voiceover {
        background: rgba(239, 68, 68, 0.25);
        border: 1px solid rgba(239, 68, 68, 0.4);
        color: rgba(254, 202, 202, 0.9);
    }

    &.music {
        background: rgba(59, 130, 246, 0.25);
        border: 1px solid rgba(59, 130, 246, 0.4);
        color: rgba(191, 219, 254, 0.9);
    }
}

.hover-indicator {
    pointer-events: none;
    z-index: 55;

    &::after {
        content: '';
        position: absolute;
        top: 0;
        bottom: 0;
        width: 1px;
        background: rgba(255, 255, 255, 0.4);
    }
}

.hover-bubble {
    pointer-events: none;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.transition-trigger-area {
    pointer-events: none;
}

.add-scene-btn {
    flex-shrink: 0;
    cursor: pointer;
    transition: all 0.2s;
    border-radius: 12px;
    margin: 20px 0 20px 16px;

    &:hover {
        transform: scale(1.02);
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.4);
    }
}

.volume-slider-mini {
    :deep(.el-slider__runway) {
        height: 4px;
        margin: 0;
        background-color: rgba(255, 255, 255, 0.1);
    }

    :deep(.el-slider__bar) {
        height: 4px;
        background-color: #3b82f6;
    }

    :deep(.el-slider__button) {
        width: 10px;
        height: 10px;
        border: none;
    }
}

.record-btn-mini {
    &.recording {
        &.pulse {
            animation: pulse-red-mini 2s infinite;
        }
    }
}

@keyframes pulse-red-mini {
    0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
    }

    70% {
        box-shadow: 0 0 0 6px rgba(239, 68, 68, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
}
</style>
