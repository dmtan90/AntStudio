<template>
    <div class="scene-card" :class="{ active: active, collapsed: !showTiming }" :style="{ width: cardWidth + 'px' }"
        @click="$emit('select')">

        <!-- Scene Thumbnail with Live Preview (Repeat Background) -->
        <div class="scene-thumbnail" :style="thumbnailStyle">
            <span class="scene-number">{{ index + 1 }}</span>
        </div>

        <!-- Elements Stacked Vertically (conditional) -->
        <div v-if="showTiming" class="scene-elements">
            <div v-for="element in sceneElements" :key="element.name" class="element-chip"
                :class="getElementClass(element)" @click.stop="$emit('select-element', element)">
                <component :is="getElementIcon(element.type)" :size="12" theme="outline" />
                <span class="element-name">{{ element.name }}</span>
                <span class="element-duration">{{ formatDuration(element.meta?.duration || 5000) }}</span>
            </div>
        </div>

        <!-- Scene Duration -->
        <div class="scene-duration">{{ formatDuration(sceneDuration) }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import {
    Text,
    ImageFiles as ImageIcon,
    Video as VideoIcon,
    GraphicDesign as Graphic,
    Music
} from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { formatMediaDuration } from 'video-editor/lib/time';

const props = defineProps<{
    scene: any;
    index: number;
    active: boolean;
    showTiming: boolean;
    zoom: number; // pxPerSec value
}>();

const emit = defineEmits(['select', 'select-element']);

const editor = useEditorStore();
const canvasPreviewUrl = ref('');

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
watch(() => props.scene, generatePreview, { deep: true });
watch(() => props.active, (isActive) => {
    if (isActive) generatePreview();
});

onMounted(() => {
    generatePreview();
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

.scene-duration {
    margin-top: 8px;
    text-align: center;
    font-size: 10px;
    color: rgba(255, 255, 255, 0.5);
    font-family: monospace;
    flex-shrink: 0;
}
</style>
