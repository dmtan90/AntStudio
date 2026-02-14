<template>
    <div class="preview-container recorder-preview relative flex-1 overflow-hidden flex items-center justify-center">
        <!-- Canvas Elements passed as refs from parent -->
        <!-- Since we want to keep logic in parent/composable, we'll use refs here -->
        <canvas ref="processingCanvas" v-show="mode !== 'audio' && mode !== 'autopilot'" class="preview-video"
            :class="{ 'asl-frame': enableAslAssist }"></canvas>

        <!-- Whiteboard Mode Content -->
        <div v-if="mode === 'whiteboard'" class="absolute inset-0 z-10">
            <!-- Launchpad (Initial View) -->
            <WhiteboardLaunchpad 
                v-if="isWhiteboardLaunchpadActive" 
                @share-screen="emit('whiteboard-screen-share')"
                @import-file="v => emit('whiteboard-file-import', v)"
            />

            <!-- VTuber Host Overlay -->
            <div v-if="isVTuberActive" class="absolute bottom-8 right-8 w-64 aspect-square z-20 overflow-hidden rounded-full border-4 border-orange-500/30 shadow-2xl">
                 <VirtualGuest 
                    v-if="currentVTuberPersona"
                    :persona="currentVTuberPersona"
                    :is-host-speaking="true" 
                    :speaking-vol="currentDb"
                    class="w-full h-full object-cover transform scale-125"
                    @stream-ready="emit('vtuber-stream-ready', $event)"
                 />
            </div>
        </div>

        <!-- Autopilot Avatar Render -->
        <div v-if="mode === 'autopilot' && currentPersona" class="absolute inset-0 flex items-center justify-center bg-black/80 rounded-[2rem] overflow-hidden pointer-events-none">
             <VirtualGuest 
                :persona="currentPersona"
                :is-host-speaking="false" 
                :speaking-vol="0"
                class="w-full h-full object-cover transform scale-110"
             />
             <!-- Overlay Script if needed, but sidepanel handles it -->
        </div> 


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
    selectedAvatar?: string
    autopilotData?: any
    isVTuberActive: boolean
    isWhiteboardLaunchpadActive: boolean
}>()

const emit = defineEmits<{
    (e: 'update:processingCanvas', canvas: HTMLCanvasElement | null): void
    (e: 'vtuber-stream-ready', stream: MediaStream): void
    (e: 'whiteboard-screen-share'): void
    (e: 'whiteboard-file-import', type: 'pdf' | 'ppt' | 'video'): void
}>()

import VirtualGuest from '@/components/studio/virtual/VirtualGuest.vue'
import WhiteboardLaunchpad from './whiteboard/WhiteboardLaunchpad.vue'
import { computed } from 'vue'

const processingCanvas = ref<HTMLCanvasElement | null>(null)

// Avatar Persona Construction
const currentPersona = computed(() => {
    // We import presets from useRecorder or define them here to match
    // Ideally we pass the full preset object prop, but we only got ID.
    // Let's quickly reconstruct/lookup.
    const presets = [
        { id: 'sarah', name: 'Sarah (AI)', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
        { id: 'james', name: 'James (AI)', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
        { id: 'eva', name: 'Eva (Digital)', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400' }
    ];
    const found = presets.find(p => p.id === props.selectedAvatar);
    if (!found) return null;
    
    return {
        id: found.id,
        avatarId: found.id,
        name: found.name,
        voiceId: 'en-US-Standard-C',
        description: 'AI Presenter',
        traits: ['professional', 'clear'],
        role: 'guest',
        visualIdentity: {
             modelType: 'static',
             imageUrl: found.image
        }
    } as any;
});

// VTuber Persona Construction (Reuse selectedAvatar for now)
const currentVTuberPersona = computed(() => {
    const presets = [
        { id: 'sarah', name: 'Sarah (AI)', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400' },
        { id: 'james', name: 'James (AI)', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400' },
        { id: 'eva', name: 'Eva (Digital)', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400' }
    ];
    const found = presets.find(p => p.id === props.selectedAvatar);
    if (!found) return null;
    
    return {
        id: found.id,
        avatarId: found.id,
        name: found.name,
        voiceId: 'en-US-Standard-C',
        visual: {
             modelType: 'static',
             modelUrl: found.image
        }
    } as any;
});

const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
}

onMounted(() => {
    emit('update:processingCanvas', processingCanvas.value)
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
