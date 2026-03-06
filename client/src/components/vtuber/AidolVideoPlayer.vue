<template>
    <div ref="container" class="w-full h-full relative overflow-hidden bg-transparent">
        <!-- Primary video (hidden, feeds into ChromaKey WebGL pipeline) -->
        <video ref="videoA" crossOrigin="anonymous" playsinline muted loop class="hidden" preload="auto"></video>
        <!-- Secondary video for cross-fade -->
        <video ref="videoB" crossOrigin="anonymous" playsinline muted loop class="hidden" preload="auto"></video>

        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400"></div>
                <span class="text-[10px] font-black uppercase tracking-widest text-white/60">AIDOL Neural Link...</span>
            </div>
        </div>

        <!-- ChromaKey Canvas Output -->
        <canvas ref="outputCanvas" class="w-full h-full object-contain"></canvas>

        <!-- Aura effect overlay (synced with hypeLevel) -->
        <div v-if="hypeLevel > 0.8" class="absolute inset-0 pointer-events-none z-10 rounded-xl"
             :style="{
                 boxShadow: `inset 0 0 ${40 + hypeLevel * 40}px ${hypeLevel > 1.5 ? '#ff005544' : '#6600ff33'}`,
                 transition: 'box-shadow 0.5s ease'
             }"></div>

        <!-- State Badge (dev/debug) -->
        <div class="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest"
             :class="STATE_COLORS[activeState] || 'bg-white/10 text-white/50'"
             style="backdrop-filter: blur(4px);">
            {{ activeState }}
        </div>

        <!-- No clips warning -->
        <div v-if="!loading && missingClips.length > 0" 
             class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center p-4 z-30 bg-black/70 backdrop-blur-sm">
            <div class="text-yellow-400 text-xl">⚠️</div>
            <p class="text-white/80 text-[11px] font-bold">Missing clips for states:</p>
            <p class="text-yellow-300 text-[10px]">{{ missingClips.join(', ') }}</p>
            <p class="text-white/40 text-[9px] mt-1">Add videos in the persona clip library or use Veo to generate them.</p>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { ChromakeyProcessor } from '@/utils/ai/ChromakeyProcessor';
import { getFileUrl } from '@/utils/api';
import { faceLandmarkService } from '@/utils/ai/FaceLandmarkService';

// ─── Types ─────────────────────────────────────────────────────────────────

type AidolState = 'idle' | 'speaking' | 'hype' | 'gift_react' | 'product' | 'checkout' | 'dance' | 'wave' | string;

interface AidolClipLibrary {
    idle?: string;
    speaking?: string;
    hype?: string;
    gift_react?: string;
    product?: string;
    checkout?: string;
    dance?: string;
    wave?: string;
    [customEvent: string]: string | undefined;
}

interface AidolPromptLibrary {
    idle?: string;
    speaking?: string;
    hype?: string;
    gift_react?: string;
    product?: string;
    checkout?: string;
    dance?: string;
    wave?: string;
    [customEvent: string]: string | undefined;
}

// ─── State-to-Color map (for badge) ────────────────────────────────────────

const STATE_COLORS: Record<string, string> = {
    idle:       'bg-slate-500/60 text-slate-200',
    speaking:   'bg-blue-500/60 text-blue-100',
    hype:       'bg-orange-500/60 text-orange-100',
    gift_react: 'bg-pink-500/60 text-pink-100',
    product:    'bg-emerald-500/60 text-emerald-100',
    checkout:   'bg-yellow-500/60 text-yellow-100',
    dance:      'bg-purple-500/60 text-purple-100',
    wave:       'bg-cyan-500/60 text-cyan-100',
};

// ─── Default Veo/AI Prompt Library ─────────────────────────────────────────
// Users can use these prompts with Veo, Kling, Pika, etc.

const DEFAULT_AIDOL_PROMPTS: AidolPromptLibrary = {
    idle: "A charming young woman standing naturally against a pure bright green screen background. \nShe makes occasional subtle movements: blinking, gentle head tilts, slight body sway. \nNatural soft studio lighting. Front-facing. Full torso visible. 1080p, 10 seconds, seamlessly loopable.",
    speaking: "A charming young woman against a pure bright green screen background, \nspeaking clearly and enthusiastically directly to the camera. \nNatural facial expressions, hand gestures. She says: \"Chào mừng mọi người đến với stream của mình! \nHôm nay mình có rất nhiều điều thú vị muốn chia sẻ với các bạn!\" \nNatural studio lighting. Front-facing. 1080p, 15 seconds.",
    product: "A charming young woman against a pure bright green screen background, \nholding up a product with both hands, looking at the camera excitedly. \nShe says: \"Sản phẩm này thực sự tuyệt vời! Mình đã dùng và thấy kết quả rõ ràng sau 2 tuần!\" \nWarm studio lighting. Front-facing. 1080p, 15 seconds.",
    checkout: "A charming young woman against a pure bright green screen background, \npointing to the camera with excitement and urgency. \nShe says: \"Nhanh tay đặt hàng nhé! Chỉ còn [X] suất với giá ưu đãi thôi! \nBình luận 'MUA' để được tư vấn ngay!\" \nDynamic lighting. Front-facing. 1080p, 12 seconds.",
    hype: "A charming young woman against a pure bright green screen background, \ndancing energetically and cheerfully. Upbeat movement, arms waving, big smile. \nNo speech. Dynamic studio lighting. Front-facing. 1080p, 10 seconds, seamlessly loopable.",
    gift_react: "A charming young woman against a pure bright green screen background, \nreacting with extreme joy and surprise to a virtual gift. \nShe claps her hands, jumps slightly, and says: \"Ôi trời ơi! Cảm ơn [tên] rất nhiều! \nBạn thật là tuyệt vời! Mình yêu các bạn!\" \nHigh energy. Front-facing. 1080p, 8 seconds.",
    dance: "A charming young woman against a pure bright green screen background, \nperforming a fun, energetic dance routine. Smooth choreography, full body movement. \nNo speech. Professional studio lighting. Full body visible. 1080p, 15 seconds, seamlessly loopable.",
    wave: "A charming young woman against a pure bright green screen background, \nwaving enthusiastically at the camera with a big warm smile. \nShe says: \"Tạm biệt mọi người! Nhớ follow và bật thông báo để không bỏ lỡ stream nhé! Bye bye!\" \nWarm lighting. Front-facing. 1080p, 8 seconds.",
};

// ─── Props ──────────────────────────────────────────────────────────────────

const props = defineProps<{
    videoClips?: AidolClipLibrary;
    activeState?: AidolState;
    hypeLevel?: number;
    chromaKeyColor?: [number, number, number]; // [R,G,B] 0-1
    chromaSimilarity?: number;
    chromaSmoothness?: number;
    chromaSpill?: number;
}>();

const emit = defineEmits(['ready', 'state-changed', 'clip-missing']);

// ─── Refs ───────────────────────────────────────────────────────────────────

const container = ref<HTMLElement | null>(null);
const videoA = ref<HTMLVideoElement | null>(null);
const videoB = ref<HTMLVideoElement | null>(null);
const outputCanvas = ref<HTMLCanvasElement | null>(null);

const loading = ref(true);
const activeState = ref<AidolState>(props.activeState || 'idle');
const missingClips = ref<string[]>([]);

// ─── Internal state ─────────────────────────────────────────────────────────

let chromaKey: ChromakeyProcessor | null = null;
let rafId: number | null = null;
let activeVideo: HTMLVideoElement | null = null; // Which video (A/B) is currently main
let pendingVideo: HTMLVideoElement | null = null; // Which video is being faded in
let crossFadeProgress = 0;
let isFading = false;
const FADE_SPEED = 0.04; // ~25 frames = ~0.4s at 60fps

// Phase 29: AR VTuber
let isTrackingFace = false;
let lastLandmarks: any[] | null = null;

// ─── Computed ────────────────────────────────────────────────────────────────

const hypeLevel = computed(() => props.hypeLevel ?? 0);

// ─── Video loader ────────────────────────────────────────────────────────────

const loadVideoForState = async (state: AidolState): Promise<HTMLVideoElement | null> => {
    const url = props.videoClips?.[state];
    if (!url) {
        if (!missingClips.value.includes(state)) {
            missingClips.value.push(state);
        }
        emit('clip-missing', state);
        // Fallback: try 'idle'
        const idleUrl = props.videoClips?.idle;
        if (!idleUrl || state === 'idle') return null;
        return loadVideoForState('idle');
    }
    // Remove from missing list if found
    missingClips.value = missingClips.value.filter(s => s !== state);
    
    const target = activeVideo === videoA.value ? videoB.value! : videoA.value!;
    target.src = getFileUrl(url);
    target.currentTime = 0;
    
    await new Promise<void>((res, rej) => {
        target.oncanplay = () => res();
        target.onerror = () => rej(new Error(`Failed to load clip: ${state}`));
        target.load();
    });
    
    await target.play().catch(() => {});
    return target;
};

// ─── State transition with cross-fade ────────────────────────────────────────

const transitionToState = async (newState: AidolState) => {
    if (newState === activeState.value && !isFading) return;
    activeState.value = newState;
    
    const nextVideo = await loadVideoForState(newState);
    if (!nextVideo) return;

    pendingVideo = nextVideo;
    crossFadeProgress = 0;
    isFading = true;
    emit('state-changed', newState);
};

// ─── Render loop ─────────────────────────────────────────────────────────────

const renderLoop = () => {
    if (!outputCanvas.value || !chromaKey) {
        rafId = requestAnimationFrame(renderLoop);
        return;
    }

    const ctx = outputCanvas.value.getContext('2d')!;
    const w = outputCanvas.value.width;
    const h = outputCanvas.value.height;
    ctx.clearRect(0, 0, w, h);

    const keyColor = props.chromaKeyColor || [0.0, 1.0, 0.0];

    // Cross-fade logic
    if (isFading && pendingVideo && activeVideo) {
        crossFadeProgress = Math.min(1, crossFadeProgress + FADE_SPEED);
        
        // Draw active video (fading out)
        const processedA = chromaKey.processFrame(activeVideo, keyColor);
        ctx.globalAlpha = 1 - crossFadeProgress;
        ctx.drawImage(processedA, 0, 0, w, h);
        
        // Draw pending video (fading in)
        const processedB = chromaKey.processFrame(pendingVideo, keyColor);
        ctx.globalAlpha = crossFadeProgress;
        ctx.drawImage(processedB, 0, 0, w, h);
        
        ctx.globalAlpha = 1;
        
        if (crossFadeProgress >= 1) {
            activeVideo.pause();
            activeVideo = pendingVideo;
            pendingVideo = null;
            isFading = false;
        }
    } else if (activeVideo && !activeVideo.paused) {
        // Normal render
        const processed = chromaKey.processFrame(activeVideo, keyColor);
        ctx.drawImage(processed, 0, 0, w, h);
    }
    
    // Phase 29: Run face tracking on VTuber
    if (activeVideo && !isTrackingFace && activeVideo.currentTime > 0) {
        isTrackingFace = true;
        faceLandmarkService.detect(outputCanvas.value).then(result => {
            if (result && result.faceLandmarks.length > 0) {
                lastLandmarks = result.faceLandmarks[0];
                // Dispatch to synthetic guest manager/render worker to use for morphing
                window.dispatchEvent(new CustomEvent('studio-worker-command', {
                    detail: { type: 'update-face-full', payload: { landmarks: lastLandmarks } }
                }));
            }
            setTimeout(() => { isTrackingFace = false; }, 33); // max 30 FPS tracking
        }).catch(() => {
            isTrackingFace = false;
        });
    }

    rafId = requestAnimationFrame(renderLoop);
};

// ─── Initialization ───────────────────────────────────────────────────────────

const init = async () => {
    loading.value = true;
    chromaKey = new ChromakeyProcessor();
    
    if (outputCanvas.value && container.value) {
        outputCanvas.value.width = container.value.clientWidth || 720;
        outputCanvas.value.height = container.value.clientHeight || 1280;
    }

    activeVideo = videoA.value;
    
    // Load initial state
    const firstState = props.activeState || 'idle';
    const initVideo = await loadVideoForState(firstState).catch(() => null);
    if (initVideo) {
        activeVideo = initVideo;
    }

    loading.value = false;
    emit('ready');
    renderLoop();
};

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(() => props.activeState, (newState) => {
    if (newState) transitionToState(newState);
});

watch(() => [props.chromaSimilarity, props.chromaSmoothness, props.chromaSpill], () => {
    if (chromaKey && typeof (chromaKey as any).updateSettings === 'function') {
        (chromaKey as any).updateSettings(
            props.chromaSimilarity ?? 0.4,
            props.chromaSmoothness ?? 0.08,
            props.chromaSpill ?? 0.1
        );
    }
});

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => init());
onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);
    videoA.value?.pause();
    videoB.value?.pause();
});
</script>
