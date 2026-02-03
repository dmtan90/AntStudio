<template>
    <div class="scene-card" :class="{ active: active, collapsed: !showTiming }" :style="{ width: cardWidth + 'px' }"
        @click="$emit('select')">

        <!-- Scene Thumbnail with Live Preview (Repeat Background) -->
        <div class="scene-thumbnail" :style="thumbnailStyle">
            <span class="scene-number">{{ index + 1 }}</span>
        </div>

        <!-- Elements Stacked Vertically (conditional) -->
        <div v-if="showTiming" class="scene-elements">
            <!-- Scene Waveform Overlay (only if audio exists) -->
            <div v-if="hasAudio" class="scene-waveform-overlay">
                <div v-for="(val, i) in sceneWaveform" :key="i" class="waveform-bar"
                    :style="{ height: Math.max(2, val * 100) + '%', opacity: 0.3 + (val * 0.7) }">
                </div>
            </div>

            <div v-for="(element, elementIndex) in sceneElements" :key="element.name" class="element-chip group/chip"
                :class="[getElementClass(element), { 'opacity-50': element.meta?.hidden }]" draggable="true"
                @dragstart="onChipDragStart($event, elementIndex)" @dragover.prevent
                @drop="onChipDrop($event, elementIndex)" @click.stop="$emit('select-element', element)">
                <component :is="getElementIcon(element.type)" :size="12" theme="outline" class="shrink-0" />
                <span class="element-name">{{ element.name }}</span>

                <!-- Visibility/Lock Toggles -->
                <div
                    class="chip-actions flex items-center gap-1 ml-1 opacity-0 group-hover/chip:opacity-100 transition-opacity">
                    <button class="p-0.5 hover:bg-white/10 rounded" @click.stop="toggleElementVisibility(element)">
                        <PreviewClose v-if="element.meta?.hidden" :size="10" />
                        <PreviewOpen v-else :size="10" />
                    </button>
                    <button class="p-0.5 hover:bg-white/10 rounded" @click.stop="toggleElementLock(element)">
                        <Lock v-if="element.meta?.locked" :size="10" />
                        <Unlock v-else :size="10" />
                    </button>
                </div>

                <span class="element-duration ml-auto">{{ formatDuration(element.meta?.duration || 5000) }}</span>
            </div>
        </div>

        <!-- Scene Actions -->
        <div class="scene-actions absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
            <el-dropdown trigger="click" @command="handleCommand">
                <button class="action-btn p-1 bg-black/60 rounded-md hover:bg-black/80 border border-white/10"
                    @click.stop>
                    <MoreOne :size="16" class="text-white" />
                </button>
                <template #dropdown>
                    <el-dropdown-menu>
                        <el-dropdown-item command="duplicate">
                            <Copy :size="14" class="mr-2" /> Duplicate Scene
                        </el-dropdown-item>
                        <el-dropdown-item command="delete" v-if="editor.pages.length > 1">
                            <Delete :size="14" class="mr-2" /> Delete Scene
                        </el-dropdown-item>
                        <div class="border-t border-white/5 my-1"></div>
                        <el-dropdown-item command="split" :disabled="!active">
                            <SplitBranch :size="14" class="mr-2" /> Split at Playhead
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </div>

        <!-- Scene Duration & Volume -->
        <div
            class="scene-footer absolute bottom-1 right-1 flex items-center gap-2 px-1.5 py-0.5 bg-black/40 backdrop-blur-sm rounded-md border border-white/5 z-20">
            <el-popover v-if="hasAudio" placement="top" :width="40" trigger="click" popper-class="volume-popover-mini">
                <template #reference>
                    <button class="volume-btn text-white/60 hover:text-white transition-colors" @click.stop>
                        <VolumeMute v-if="sceneVolume === 0" :size="12" />
                        <VolumeSmall v-else-if="sceneVolume < 50" :size="12" />
                        <VolumeNotice v-else :size="12" />
                    </button>
                </template>
                <div class="h-24 py-2 flex justify-center" @click.stop>
                    <el-slider v-model="sceneVolume" vertical :min="0" :max="100" :show-tooltip="false" height="80px" />
                </div>
            </el-popover>
            <div class="scene-duration text-[10px] font-mono text-white/80 select-none">{{ formatDuration(sceneDuration)
                }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
    Text,
    ImageFiles as ImageIcon,
    Video as VideoIcon,
    GraphicDesign as Graphic,
    Music,
    MoreOne,
    Copy,
    Delete,
    SplitBranch,
    VolumeMute,
    VolumeSmall,
    VolumeNotice,
    PreviewOpen,
    PreviewClose,
    Lock,
    Unlock
} from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { formatMediaDuration } from 'video-editor/lib/time';
import { storeToRefs } from 'pinia';

const props = defineProps<{
    scene: any;
    index: number;
    active: boolean;
    showTiming: boolean;
    zoom: number; // pxPerSec value
}>();

const emit = defineEmits(['select', 'select-element']);

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const { timeline } = storeToRefs(canvasStore);
const canvasPreviewUrl = ref('');
const sceneWaveform = ref<number[]>([]);
const sceneVolume = ref(100);
import { WaveformGenerator } from 'video-editor/utils/WaveformGenerator';

// Watch for scene volume changes and apply to all audio elements in this scene
watch(sceneVolume, (val) => {
    const page = editor.pages[props.index];
    if (page?.audio) {
        page.audio.elements.forEach(audio => {
            page.audio.update(audio.id, { volume: val / 100 });
        });
    }
});

const handleCommand = (command: string) => {
    switch (command) {
        case 'duplicate':
            editor.copyPage(props.index);
            break;
        case 'delete':
            editor.deletePage(props.index);
            break;
        case 'split':
            if (props.active && timeline.value) {
                editor.splitPage(props.index, (timeline.value as any).seek);
            }
            break;
    }
};

const onChipDragStart = (e: DragEvent, index: number) => {
    e.dataTransfer?.setData('elementIndex', index.toString());
    e.dataTransfer!.effectAllowed = 'move';
};

const onChipDrop = (e: DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer?.getData('elementIndex') || '-1');
    if (sourceIndex !== -1 && sourceIndex !== targetIndex) {
        const page = editor.pages[props.index];
        const elements = [...(page.elements || [])];
        const [movedElement] = elements.splice(sourceIndex, 1);
        elements.splice(targetIndex, 0, movedElement);

        // Update page elements and trigger re-render
        page.elements = elements;

        // Apply Z-index change to canvas if this is the active scene
        const canvas = editor.getCanvasInstance(props.index);
        if (canvas) {
            const object = canvas.getItemByName(movedElement.name);
            if (object) {
                // Fabric z-index is managed by position in _objects array
                // Move to new position (inverse of timeline index since 0 is bottom)
                // Actually, simple way is to use moveTo
                const totalVisible = sceneElements.value.length;
                object.moveTo(totalVisible - targetIndex - 1);
            }
        }
        editor.onModified();
    }
};

const toggleElementVisibility = (element: any) => {
    const isHidden = !element.meta?.hidden;
    element.meta = { ...element.meta, hidden: isHidden };

    const canvas = editor.getCanvasInstance(props.index);
    if (canvas) {
        const object = canvas.getItemByName(element.name);
        if (object) {
            object.set({ visible: !isHidden, opacity: isHidden ? 0 : (element.opacity || 1) });
            canvas.renderAll();
        }
    }
    editor.onModified();
};

const toggleElementLock = (element: any) => {
    const isLocked = !element.meta?.locked;
    element.meta = { ...element.meta, locked: isLocked };

    const canvas = editor.getCanvasInstance(props.index);
    if (canvas) {
        const object = canvas.getItemByName(element.name);
        if (object) {
            object.set({
                lockMovementX: isLocked,
                lockMovementY: isLocked,
                lockScalingX: isLocked,
                lockScalingY: isLocked,
                lockRotation: isLocked,
                hasControls: !isLocked
            });
            canvas.renderAll();
        }
    }
    editor.onModified();
};

// Card width based on zoom and scene duration
const cardWidth = computed(() => {
    const duration = (props.scene.timeline?.duration || 5000) / 1000; // seconds
    return Math.max(120, duration * props.zoom); // Min 120px
});

const sceneDuration = computed(() => props.scene.timeline?.duration || 5000);

// Scene elements (visual only, no subtitles)
const sceneElements = computed(() => {
    return (props.scene.elements || []).filter((e: any) =>
        !e.meta?.isSubtitle && (e.meta?.duration || e.duration) > 0
    );
});

const hasAudio = computed(() => {
    return props.scene.audios && props.scene.audios.length > 0;
});

// Thumbnail style with repeat background
const thumbnailStyle = computed(() => {
    const bgUrl = canvasPreviewUrl.value || props.scene.template?.page?.thumbnail;

    if (!bgUrl) {
        return {
            background: 'rgba(0, 0, 0, 0.5)'
        };
    }

    return {
        backgroundImage: `url(${bgUrl})`,
        backgroundSize: 'auto 100%',
        backgroundRepeat: 'repeat-x',
        backgroundPosition: 'left center'
    };
});

// Generate canvas preview
const generatePreview = async () => {
    // Only generate preview for the active scene to save resources
    if (!props.active) return;

    try {
        const page = editor.pages[props.index];
        if (!page?.initialized || page.template?.status !== 'completed') {
            return;
        }

        const canvas = editor.getCanvasInstance(props.index);
        if (!canvas) return;

        // Check if canvas is properly initialized
        const fabricCanvas = canvas as any;
        if (!fabricCanvas.lowerCanvasEl || !fabricCanvas.contextContainer) {
            return;
        }

        // Render canvas to dataURL
        const dataUrl = fabricCanvas.toDataURL({
            format: 'webp',
            quality: 0.5, // Lower quality for thumbnail
            multiplier: 0.2 // Smaller size
        });

        canvasPreviewUrl.value = dataUrl;
    } catch (error) {
        console.error('Failed to generate canvas preview:', error);
    }
};

const generateWaveform = async () => {
    if (!hasAudio.value) {
        sceneWaveform.value = [];
        return;
    }

    const audio = props.scene.audios[0];
    if (audio.buffer) {
        sceneWaveform.value = await WaveformGenerator.generate(audio.buffer, 60);
    } else if (audio.url) {
        sceneWaveform.value = await WaveformGenerator.generateFromUrl(audio.url, 60);
    }
};

// Get element icon component
const getElementIcon = (type: string) => {
    switch (type) {
        case 'text':
        case 'textbox':
            return Text;
        case 'image':
            return ImageIcon;
        case 'video':
            return VideoIcon;
        case 'shape':
        case 'rect':
        case 'circle':
            return Graphic;
        case 'audio':
            return Music;
        default:
            return Graphic;
    }
};

// Get element chip class
const getElementClass = (element: any) => {
    const type = element.type?.toLowerCase() || '';
    if (type.includes('text')) return 'element-text';
    if (type.includes('image')) return 'element-image';
    if (type.includes('video')) return 'element-video';
    if (type.includes('audio')) return 'element-audio';
    return 'element-shape';
};

// Format duration
const formatDuration = (ms: number) => {
    return formatMediaDuration(ms, false);
};

// Watch for scene changes
watch(() => props.scene, () => {
    generatePreview();
    generateWaveform();
}, { deep: true });
watch(() => props.active, (isActive) => {
    if (isActive) generatePreview();
});

onMounted(() => {
    generatePreview();
    generateWaveform();
});

onUnmounted(() => {
    if (canvasPreviewUrl.value) {
        URL.revokeObjectURL(canvasPreviewUrl.value);
    }
});
</script>

<style lang="scss" scoped>
.scene-card {
    display: flex;
    flex-direction: column;
    min-width: 120px;
    max-width: 300px;
    height: 180px;
    background: rgba(26, 26, 26, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 8px;
    margin-right: 8px;
    transition: all 0.2s ease;
    cursor: pointer;
    flex-shrink: 0;

    &.collapsed {
        height: 100px;
    }

    &.active {
        border-color: var(--brand-primary);
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
    }

    &:hover {
        border-color: rgba(255, 255, 255, 0.3);
        transform: translateY(-2px);
    }
}

.scene-thumbnail {
    position: relative;
    width: 100%;
    aspect-ratio: 16/9;
    border-radius: 8px;
    overflow: hidden;
    background: rgba(0, 0, 0, 0.5);
    margin-bottom: 8px;
    flex-shrink: 0;

    .scene-number {
        position: absolute;
        top: 4px;
        left: 4px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: bold;
        z-index: 1;
    }
}

.scene-elements {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
    overflow-y: auto;
    overflow-x: hidden;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
    }
}

.scene-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 20;

    .action-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
            background: rgba(0, 0, 0, 0.9);
            transform: scale(1.1);
            border-color: var(--brand-primary);
        }
    }
}

.scene-waveform-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 4px;
    pointer-events: none;
    z-index: 0;
    opacity: 0.15;

    .waveform-bar {
        width: 2px;
        background: var(--brand-primary, #3b82f6);
        border-radius: 1px;
    }
}

.element-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.15s;
    border: 1px solid transparent;

    .element-name {
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .element-duration {
        font-size: 9px;
        opacity: 0.6;
        font-family: monospace;
    }

    &.element-text {
        background: rgba(255, 193, 7, 0.2);
        border-color: rgba(255, 193, 7, 0.4);
        color: rgba(255, 193, 7, 1);
    }

    &.element-image {
        background: rgba(76, 175, 80, 0.2);
        border-color: rgba(76, 175, 80, 0.4);
        color: rgba(76, 175, 80, 1);
    }

    &.element-video {
        background: rgba(156, 39, 176, 0.2);
        border-color: rgba(156, 39, 176, 0.4);
        color: rgba(156, 39, 176, 1);
    }

    &.element-audio {
        background: rgba(33, 150, 243, 0.2);
        border-color: rgba(33, 150, 243, 0.4);
        color: rgba(33, 150, 243, 1);
    }

    &.element-shape {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(255, 255, 255, 0.2);
        color: rgba(255, 255, 255, 0.8);
    }

    &:hover {
        transform: scale(1.05);
        filter: brightness(1.2);
    }
}

.scene-footer {
    opacity: 0.6;
    transition: all 0.2s;
    background: rgba(0, 0, 0, 0.4);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);

    &:hover {
        opacity: 1;
        background: rgba(0, 0, 0, 0.9);
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
    }

    .volume-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
    }
}

.scene-duration {
    text-align: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.8);
    font-family: monospace;
    flex-shrink: 0;
}
</style>

<style lang="scss">
.volume-popover-mini {
    background: #141414 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    min-width: 40px !important;
    padding: 0 !important;

    .el-popper__arrow::before {
        background: #141414 !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }

    .el-slider {
        --el-slider-main-bg-color: var(--brand-primary);
        --el-slider-runway-bg-color: rgba(255, 255, 255, 0.1);
        --el-slider-button-size: 8px;
    }
}
</style>
