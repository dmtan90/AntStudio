<template>
    <div class="preview-container relative flex-1 overflow-hidden flex items-center justify-center">
        <!-- Canvas Elements passed as refs from parent -->
        <!-- Since we want to keep logic in parent/composable, we'll use refs here -->
        <canvas ref="processingCanvas" class="hidden-canvas"></canvas>
        <canvas ref="displayCanvas" v-show="mode !== 'audio'" class="preview-video"
            :class="{ 'asl-frame': enableAslAssist }"></canvas>

        <!-- ASL Assist Overlay -->
        <div v-if="enableAslAssist && mode !== 'audio'"
            class="asl-assist-overlay absolute inset-0 pointer-events-none flex items-center justify-center">
            <div
                class="asl-target-frame w-[80%] h-[80%] border-2 border-dashed border-orange-500/50 rounded-[3rem] flex items-center justify-center">
                <p
                    class="text-[10px] font-black text-orange-400 bg-black/60 px-4 py-2 rounded-full uppercase tracking-widest">
                    ASL TARGET ZONE</p>
            </div>
        </div>

        <!-- AI Status Overlay -->
        <div class="ai-status-overlay absolute top-24 right-8 flex flex-col gap-2 items-end">
            <div v-if="isStreaming" class="status-badge live">
                <div class="dot"></div>
                <span>LIVE: {{ streamStats.bitrate }}kbps</span>
            </div>
            <div v-if="activeCaptions" class="status-badge ai">
                <cpu theme="outline" size="12" />
                <span>AI CAPTIONS: EN</span>
            </div>
        </div>

        <!-- Live Captions Display -->
        <div v-if="activeCaptions && currentCaption"
            class="caption-overlay absolute bottom-32 left-1/2 -translate-x-1/2 text-center pointer-events-none w-full max-w-2xl px-4 z-30">
            <div
                class="caption-bubble bg-black/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-2xl shadow-2xl">
                <p class="text-white text-lg font-bold">{{ currentCaption }}</p>
                <p v-if="translatedCaption" class="text-orange-400 text-sm font-medium mt-1">{{ translatedCaption }}
                </p>
            </div>
        </div>

        <!-- Audio Visualizer (Background style) -->
        <div v-if="mode === 'audio'"
            class="audio-visualizer-container absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-3xl">
            <div class="audio-bars flex items-end justify-center gap-1 h-32 w-full max-w-2xl">
                <div v-for="(level, idx) in audioLevels" :key="idx"
                    class="bar w-1 bg-gradient-to-t from-orange-500 to-amber-200 rounded-full transition-all duration-75"
                    :style="{ height: level }"></div>
            </div>
        </div>

        <!-- DB Meter -->
        <div v-if="micEnabled"
            class="db-meter absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-1 items-center z-40">
            <div v-for="i in 15" :key="i" class="w-1.5 h-4 rounded-full transition-all duration-75" :style="{
                backgroundColor: i > 12 ? '#ef4444' : (i > 8 ? '#f59e0b' : '#f97316'),
                opacity: (16 - i) <= (currentDb * 15) ? 1 : 0.1,
                boxShadow: (16 - i) <= (currentDb * 15) ? '0 0 10px currentColor' : 'none'
            }">
            </div>
        </div>

        <!-- Recording Timer -->
        <div v-if="isRecording"
            class="recording-timer absolute top-24 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-widest shadow-lg flex items-center gap-2 z-50">
            <div class="w-2 h-2 rounded-full bg-white animate-pulse"></div>
            {{ formatTime(recordingTime) }} / {{ formatTime(maxDuration) }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Cpu } from '@icon-park/vue-next'
import type { RecordingMode } from '@/composables/useRecorder'

const props = defineProps<{
    mode: RecordingMode
    isRecording: boolean
    recordingTime: number
    maxDuration: number
    micEnabled: boolean
    enableAslAssist: boolean
    isStreaming: boolean
    streamStats: { bitrate: number; fps: number }
    activeCaptions: boolean
    currentCaption: string
    translatedCaption: string
    audioLevels: string[]
    currentDb: number
}>()

const emit = defineEmits<{
    (e: 'update:processingCanvas', canvas: HTMLCanvasElement | null): void
    (e: 'update:displayCanvas', canvas: HTMLCanvasElement | null): void
}>()

const processingCanvas = ref<HTMLCanvasElement | null>(null)
const displayCanvas = ref<HTMLCanvasElement | null>(null)

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

onMounted(() => {
    emit('update:processingCanvas', processingCanvas.value)
    emit('update:displayCanvas', displayCanvas.value)
})
</script>

<style lang="scss" scoped>
.preview-video {
    width: 100%;
    height: 100%;
    object-fit: contain;
    border-radius: 2rem;
    background: #000;
    box-shadow: 0 50px 100px -20px rgba(0, 0, 0, 0.5);
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

    &.asl-frame {
        border: 4px solid rgba(249, 115, 22, 0.3);
        box-shadow: 0 0 100px rgba(249, 115, 22, 0.1);
    }
}

.hidden-canvas {
    display: none;
}

.status-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 100px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.1em;

    &.live {
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
    }

    &.ai {
        color: #f97316;
        border-color: rgba(249, 115, 22, 0.3);
    }

    .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 1.5s infinite;
    }
}

@keyframes pulse {
    0% {
        opacity: 1;
        transform: scale(1);
    }

    50% {
        opacity: 0.5;
        transform: scale(1.2);
    }

    100% {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
