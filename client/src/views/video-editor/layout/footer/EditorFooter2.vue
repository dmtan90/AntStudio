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

                <!-- Markers -->
                <div v-for="marker in markers" :key="marker.id"
                    class="absolute top-0 bottom-0 z-40 w-px bg-yellow-500/50 pointer-events-none"
                    :style="{ left: (marker.time * pxPerSec) + 'px' }">
                    <div class="absolute -top-1 left-0 -translate-x-1/2 w-2 h-2 bg-yellow-500 rotate-45"></div>
                    <div class="absolute top-2 left-1.5 text-[8px] text-yellow-500 font-bold opacity-50">{{ marker.label
                        }}</div>
                </div>

                <template v-for="(page, index) in pages" :key="page.id">
                    <SceneCard :scene="page" :index="index" :active="activePage === index" :show-timing="showTiming"
                        :zoom="pxPerSec" draggable="true" :class="{ 'dragging': draggingIndex === index }"
                        @dragstart="onDragStart($event, index)" @dragend="onDragEnd" @dragover.prevent
                        @drop="onDrop($event, index)" @select="selectScene(index)"
                        @select-element="(el) => selectElement(el, index)" />

                    <!-- Transition Trigger between scenes (if not last) -->
                    <TransitionTrigger v-if="index < pages.length - 1"
                        :model-value="pages[index + 1].transition || 'none'"
                        :duration-value="pages[index + 1].transitionDuration"
                        @update:model-value="(val) => updateTransition(index + 1, 'transition', val)"
                        @update:duration-value="(val) => updateTransition(index + 1, 'transitionDuration', val)" />
                </template>

                <!-- Add Scene Button -->
                <button
                    class="add-scene-btn flex items-center justify-center min-w-[120px] h-[180px] border-2 border-dashed border-white/20 rounded-12px hover:border-white/40 hover:bg-white/5 transition-all"
                    :class="{ 'h-[100px]': !showTiming }" @click="addScene">
                    <Plus :size="32" class="text-white/40" />
                </button>
            </div>
        </div>

        <!-- Subtitle Track (Full Width) -->
        <div class="subtitle-track h-12 border-t border-white/5 bg-[#0d0d0d] flex items-center px-4 shrink-0 cursor-pointer overflow-hidden"
            @click="handleTimelineClick">
            <div class="track-label flex items-center gap-2 w-40 text-[10px] uppercase font-bold text-white/30">
                <Quote :size="12" />
                <span>Subtitles</span>
            </div>
            <div class="subtitle-container flex-1 h-8 bg-white/5 rounded-md relative overflow-x-auto no-scrollbar"
                ref="subtitleContainer">
                <div class="relative h-full" :style="{ width: totalWidth + 'px' }">
                    <div v-for="sub in allSubtitles" :key="sub.id"
                        class="subtitle-item absolute top-1 bottom-1 bg-yellow-500/20 border border-yellow-500/40 rounded flex items-center px-2 text-[9px] text-yellow-200/80 whitespace-nowrap overflow-hidden"
                        :style="{
                            left: (sub.globalOffset / 1000 * pxPerSec) + 'px',
                            width: ((sub.meta?.duration || 3000) / 1000 * pxPerSec) + 'px'
                        }" @click.stop="selectElement(sub, sub.pageIndex)" @dblclick.stop="startEditing(sub)">

                        <!-- Editing Input -->
                        <input v-if="editingId === sub.id" ref="subtitleInputRef" v-model="editingText"
                            class="w-full h-full bg-black/50 text-yellow-200 font-bold border-none outline-none p-0 m-0"
                            @blur="saveSubtitle(sub)" @keyup.enter="saveSubtitle(sub)" @keyup.esc="cancelEditing"
                            @click.stop />

                        <!-- Display Text -->
                        <span v-else class="w-full h-full truncate pointer-events-none">{{ sub.text || 'Subtitle'
                            }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Export Progress Bar (Overlay) -->
        <div v-if="exporting.active"
            class="export-progress-bar absolute top-0 left-0 right-0 h-1 z-50 bg-white/5 overflow-hidden">
            <div class="h-full bg-primary transition-all duration-300"
                :style="{ width: formatPercent(exporting.progress) }">
            </div>
            <div class="absolute top-2 right-4 text-[10px] text-primary font-bold uppercase tracking-widest">
                Exporting: {{ formatPercent(exporting.progress) }}
            </div>
        </div>

        <!-- Audio Section (Full Width) -->
        <div class="audio-section border-t border-white/5 bg-[#0d0d0d] flex-col shrink-0">
            <!-- Voiceover Track -->
            <div class="voiceover-track h-12 flex items-center px-4 border-b border-white/5 cursor-pointer overflow-hidden"
                @click="handleTimelineClick">
                <div class="track-label flex items-center gap-2 w-40 text-[10px] uppercase font-bold text-red-400/50">
                    <Record :size="12" />
                    <span>Voiceover</span>
                    <!-- Record Button -->
                    <button
                        class="record-btn-mini ml-auto p-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full transition-all"
                        :class="{ 'recording pulse': isRecording }" @click.stop="toggleRecording">
                        <Record :size="10" />
                    </button>
                </div>
                <div class="track-items flex-1 h-8 bg-white/3 rounded-md relative overflow-x-auto no-scrollbar"
                    ref="voContainer">
                    <div class="relative h-full" :style="{ width: totalWidth + 'px' }">
                        <div v-for="vo in voiceoverElements" :key="vo.id"
                            class="audio-item voiceover absolute top-1 bottom-1 bg-red-500/20 border border-red-500/40 rounded flex items-center px-2 text-[9px] text-red-200/80 whitespace-nowrap overflow-hidden"
                            :style="{
                                left: (vo.globalOffset / 1000 * pxPerSec) + 'px',
                                width: ((vo.duration || 3) * pxPerSec) + 'px'
                            }" @click.stop="selectElement(vo, vo.pageIndex)">
                            <Music :size="10" class="mr-1" /> {{ vo.name || 'Voiceover' }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Music Track -->
            <div class="music-track h-12 flex items-center px-4 cursor-pointer overflow-hidden"
                @click="handleTimelineClick">
                <div class="track-label flex items-center gap-2 w-40 text-[10px] uppercase font-bold text-blue-400/50">
                    <Music :size="12" />
                    <span>Music</span>

                    <div class="volume-control flex items-center gap-1 ml-auto mr-2" @click.stop>
                        <VolumeSmall :size="10" class="text-white/40" />
                        <el-slider v-model="globalVolume" :min="0" :max="100" :show-tooltip="false"
                            class="volume-slider-mini w-12" />
                    </div>
                </div>
                <div class="track-items flex-1 h-8 bg-white/3 rounded-md relative overflow-x-auto no-scrollbar"
                    ref="musicContainer">
                    <div class="relative h-full" :style="{ width: totalWidth + 'px' }">
                        <!-- Global Waveform background -->
                        <div v-if="audioWaveform.length > 0"
                            class="absolute inset-0 flex items-center gap-[1px] px-2 opacity-20 pointer-events-none">
                            <div v-for="(val, i) in audioWaveform" :key="i" class="w-1 bg-blue-500 rounded-full"
                                :style="{ height: Math.max(10, val * 80) + '%' }">
                            </div>
                        </div>

                        <div v-for="audio in musicElements" :key="audio.id"
                            class="audio-item music absolute top-1 bottom-1 bg-blue-500/20 border border-blue-500/40 rounded flex items-center px-2 text-[9px] text-blue-200/80 whitespace-nowrap overflow-hidden"
                            :style="{
                                left: (audio.globalOffset / 1000 * pxPerSec) + 'px',
                                width: ((audio.duration || 3) * pxPerSec) + 'px'
                            }" @click.stop="selectElement(audio, audio.pageIndex)">
                            <Music :size="10" class="mr-1" /> {{ audio.name || 'Audio' }}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import SceneCard from './components/SceneCard.vue';
import TransitionTrigger from './components/TransitionTrigger.vue';
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
const isRecording = ref(false);
const mediaRecorder = ref<MediaRecorder | null>(null);
const audioChunks = ref<Blob[]>([]);

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
            // Actually in Vue 3 v-for ref gives an array of elements
            const inputs = (subtitleInputRef.value as any);
            // It will be a list, find the active one
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
            const activeOffset = sceneOffsets.value[editor.page];
            const localPlayheadMs = (timeline.value as any)?.seek || 0;

            // Note: We'll add it to the active scene
            const page = editor.pages[editor.page];
            if (page?.audio) {
                // Assign a unique ID and generic name
                const id = `voiceover-${Date.now()}`;
                page.audio.add({
                    id,
                    name: 'Voiceover',
                    url: audioUrl,
                    offset: localPlayheadMs / 1000,
                    volume: 1,
                    isVoiceover: true // Helper flag
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
    // Apply to all scenes or master volume if available
    editor.pages.forEach((page, index) => {
        const instance = editor.getCanvasInstance(index);
        if (instance?.audio) {
            // Logic to set volume on all audio elements in that scene
            page.audio.elements.forEach(audio => {
                page.audio.update(audio.id, { volume: val / 100 });
            });
        }
    });
});

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

// Calculate scene offsets for unified timeline
const sceneOffsets = computed(() => {
    let acc = 0;
    return editor.pages.map((page) => {
        const start = acc;
        acc += ((page.timeline as any)?.duration || 5000);
        return start;
    });
});

const playheadPosition = computed(() => {
    return currentTime.value * pxPerSec.value;
});

const totalWidth = computed(() => {
    return totalDuration.value * pxPerSec.value + 200; // Extra space for add button
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
                globalOffset: offset + (el.offset * 1000)
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

    // Also jump playhead to the start of this scene
    let offset = 0;
    for (let i = 0; i < index; i++) {
        offset += (editor.pages[i].timeline?.duration || 5000) / 1000;
    }
    seekToGlobalTime(offset);
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
    // Insert after current page for better UX
    editor.addPage(undefined, editor.page + 1);
};

const updateTransition = (index: number, key: string, value: any) => {
    if (key === 'transition') {
        editor.setPageTransition(index, value);
    } else if (key === 'transitionDuration') {
        // We need to pass the current transition value because the store action expects both or we can update the store action
        // Actually the store action I wrote allows implicit updates if I am careful, but I see I wrote:
        // setPageTransition(index, transition, duration?)
        // So safe way is:
        const page = editor.pages[index];
        if (page) {
            editor.setPageTransition(index, page.transition || 'none', value);
        }
    }
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

// Auto Scroll logic
watch(playheadPosition, (newPos) => {
    if (!timelineContainer.value || isScrubbing.value || !isPlaying.value) return;

    const container = timelineContainer.value;
    const scrollLeft = container.scrollLeft;
    const viewportWidth = container.clientWidth;
    const padding = 100; // Keep playhead 100px from edges

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
const updateWaveform = async () => {
    const totalDurationMs = totalDuration.value * 1000;
    if (totalDurationMs === 0 || editor.pages.length === 0) {
        audioWaveform.value = [];
        return;
    }

    const totalSamples = 200; // Increased resolution
    const mergedWaveform = new Array(totalSamples).fill(0);

    // Process each page
    let currentSampleOffset = 0;

    for (const page of editor.pages) {
        const pageDurationMs = (page.timeline as any)?.duration || 5000;
        const pageSamples = Math.round((pageDurationMs / totalDurationMs) * totalSamples);

        if (pageSamples > 0 && page.audio?.elements?.length > 0) {
            // Get the primary audio (highest volume or first)
            const audio = page.audio.elements[0];
            if (audio.buffer) {
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
}

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

.dragging {
    opacity: 0.5;
    transform: scale(0.95);
    border-style: dashed !important;
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

.volume-slider {
    :deep(.el-slider__runway) {
        background-color: rgba(255, 255, 255, 0.05);
        height: 2px;
    }

    :deep(.el-slider__bar) {
        background-color: var(--brand-primary);
        height: 2px;
    }

    :deep(.el-slider__button) {
        width: 8px;
        height: 8px;
        border: none;
        background-color: #fff;
    }
}

.audio-section {
    display: flex;
    flex-direction: column;
}

.voiceover-track,
.music-track {
    transition: background-color 0.2s;

    &:hover {
        background-color: rgba(255, 255, 255, 0.02);
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
        background: rgba(239, 68, 68, 0.2);
        border-color: rgba(239, 68, 68, 0.4);
        color: rgba(254, 202, 202, 0.8);
    }

    &.music {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: rgba(191, 219, 254, 0.8);
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

.export-progress-bar {
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.5);
}

.record-btn {
    &.recording {
        color: white;
        background: rgba(239, 68, 68, 0.4);
        border-color: rgba(239, 68, 68, 0.6);

        &.pulse {
            animation: pulse-red 2s infinite;
        }

        span {
            color: white;
        }

        .i-icon {
            color: white;
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

@keyframes pulse-red {
    0% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
    }

    70% {
        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
    }

    100% {
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
    }
}
</style>
