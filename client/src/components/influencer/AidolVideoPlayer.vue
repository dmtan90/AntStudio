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
        <canvas ref="outputCanvas" class="w-full h-full object-cover bg-transparent"></canvas>

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
import { getFileUrl } from '@/utils/api';
import { faceLandmarkService } from '@/utils/ai/FaceLandmarkService';
import * as PIXI from 'pixi.js';
import { ChromakeyFilter } from '@/utils/webgl/PIXIFilters';

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
    modelUrl?: string;         // Fallback single video for all states
    videoClips?: AidolClipLibrary;
    activeState?: AidolState;
    hypeLevel?: number;
    chromaKeyColor?: [number, number, number]; // [R,G,B] 0-1
    chromaSimilarity?: number;
    chromaSmoothness?: number;
    chromaSpill?: number;
    isPortrait?: boolean;
    backgroundUrl?: string;
    uuid?: string;
    rawMode?: boolean; // If true, bypass PIXI and use native canvas 2D for optimization
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
const autoChromaMetadata = ref({
    isChromaKey: false,
    color: [0, 1, 0] as [number, number, number],
    similarity: 0.08,
    smoothness: 0.2
});


// ─── Internal state ─────────────────────────────────────────────────────────

let app: PIXI.Application | null = null;
let textureA: PIXI.Texture | null = null;
let textureB: PIXI.Texture | null = null;
let spriteA: PIXI.Sprite | null = null;
let spriteB: PIXI.Sprite | null = null;
let bgSprite: PIXI.Sprite | null = null;

const filterA = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);
const filterB = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);

let activeVideo: HTMLVideoElement | null = null;
let pendingVideo: HTMLVideoElement | null = null;
let crossFadeProgress = 0;
let isFading = false;
const FADE_SPEED = 0.04;

let isTrackingFace = false;
let lastDispatchTime = 0;
let isDestroyed = false;

// ─── Computed ────────────────────────────────────────────────────────────────

const hypeLevel = computed(() => props.hypeLevel ?? 0);

// ─── Utils ───────────────────────────────────────────────────────────────────

const updateSpriteScale = (sprite: PIXI.Sprite | null, video: HTMLVideoElement | null) => {
    if (!sprite || !video || !app) return;
    
    const width = app.screen.width;
    const height = app.screen.height;
    const videoW = video.videoWidth || width;
    const videoH = video.videoHeight || height;
    
    const scaleX = width / videoW;
    const scaleY = height / videoH;
    // Use Math.min (contain) to ensure the whole 9:16 portrait video 
    // is visible inside the container without heavily cropping it
    const containScale = Math.min(scaleX, scaleY);
    
    sprite.scale.set(containScale);
};

// ─── Video loader ────────────────────────────────────────────────────────────

const loadVideoForState = async (state: AidolState): Promise<HTMLVideoElement | null> => {
    const url = props.videoClips?.[state]
        // Fallback chain: idle clip → universal modelUrl
        || (state !== 'idle' ? props.videoClips?.idle : undefined)
        || props.modelUrl;
    if (!url) {
        if (!missingClips.value.includes(state)) {
            missingClips.value.push(state);
        }
        emit('clip-missing', state);
        return null;
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
    
    // Setup new texture for pending video
    if (activeVideo === videoA.value) {
        textureB = PIXI.Texture.from(pendingVideo);
        if (spriteB) {
            spriteB.texture = textureB;
            spriteB.alpha = 0;
            updateSpriteScale(spriteB, pendingVideo);
        }
    } else {
        textureA = PIXI.Texture.from(pendingVideo);
        if (spriteA) {
            spriteA.texture = textureA;
            spriteA.alpha = 0;
            updateSpriteScale(spriteA, pendingVideo);
        }
    }

    crossFadeProgress = 0;
    isFading = true;
    emit('state-changed', newState);
};

// ─── Update loop ─────────────────────────────────────────────────────────────

const update = () => {
    if (!app || isDestroyed) return;

    const now = performance.now();
    const keyColor = props.chromaKeyColor || autoChromaMetadata.value.color || [0,1,0];
    filterA.keyColor = keyColor;
    filterB.keyColor = keyColor;

    if (props.chromaSimilarity !== undefined) {
        filterA.similarity = props.chromaSimilarity;
        filterB.similarity = props.chromaSimilarity;
    } else {
        filterA.similarity = autoChromaMetadata.value.similarity;
        filterB.similarity = autoChromaMetadata.value.similarity;
    }

    if (props.chromaSmoothness !== undefined) {
        filterA.smoothness = props.chromaSmoothness;
        filterB.smoothness = props.chromaSmoothness;
    } else {
        filterA.smoothness = autoChromaMetadata.value.smoothness;
        filterB.smoothness = autoChromaMetadata.value.smoothness;
    }

    if (isFading && spriteA && spriteB) {
        crossFadeProgress = Math.min(1, crossFadeProgress + FADE_SPEED);
        
        if (activeVideo === videoA.value) {
            spriteA.alpha = 1 - crossFadeProgress;
            spriteB.alpha = crossFadeProgress;
        } else {
            spriteB.alpha = 1 - crossFadeProgress;
            spriteA.alpha = crossFadeProgress;
        }
        
        if (crossFadeProgress >= 1) {
            activeVideo?.pause();
            activeVideo = pendingVideo;
            pendingVideo = null;
            isFading = false;
        }
    }
    
    // Background Face Tracking (REMOVED: CPU Optimization - AIDOL does not need active tracking)
    // If needed in the future for specific effects, ensure it respects modelType restrictions.
};

const updateBackground = async (url: string) => {
    if (!url) {
        if (bgSprite) {
             app.stage.removeChild(bgSprite as any);
             bgSprite.destroy({ children: true, texture: true });
             bgSprite = null;
        }
        return;
    }
    if (!app) return;

    try {
        const bgUrl = getFileUrl(url);
        
        // Use Texture.from for better compatibility with proxy URLs
        // Assets.load has issues parsing proxy URLs
        const bgTex = await PIXI.Texture.fromURL(bgUrl, { resourceOptions: { autoLoad: true } });
        if (!bgTex) return;

        if (!bgSprite) {
            bgSprite = new PIXI.Sprite(bgTex);
            bgSprite.anchor.set(0.5);
            app.stage.addChildAt(bgSprite as any, 0); // Always at bottom
        } else {
            bgSprite.texture = bgTex;
        }

        // Cover logic
        const targetW = app.screen.width || 400;
        const targetH = app.screen.height || 400;
        
        const scaleX = targetW / bgTex.width;
        const scaleY = targetH / bgTex.height;
        const bgScale = Math.max(scaleX, scaleY);
        
        if (bgScale > 0) {
            bgSprite.scale.set(bgScale);
            bgSprite.visible = true;
        }
        
        bgSprite.x = targetW / 2;
        bgSprite.y = targetH / 2;
    } catch (e) {
        console.error('[AidolVideoPlayer] Failed to update background:', e);
    }
};

// ─── Initialization ───────────────────────────────────────────────────────────

const init = async () => {
    if (!container.value || !outputCanvas.value) return;
    loading.value = true;
    
    // Use container dimensions for dynamic resolution
    // const width = container.value.clientWidth || 400;
    // const height = container.value.clientHeight || 700;
    // Performance: Cap internal render resolution to 360x640 max.
    // This reduces GPU workload by ~75% compared to full container size.
    // The canvas CSS will still fill the container via object-fit: cover.
    const MAX_W = 360, MAX_H = 640;
    const rawW = container.value.clientWidth || 400;
    const rawH = container.value.clientHeight || 700;
    const scale = Math.min(1, MAX_W / rawW, MAX_H / rawH);
    const width = Math.max(1, Math.round(rawW * scale));
    const height = Math.max(1, Math.round(rawH * scale));
    if (!app) {
        app = new PIXI.Application({
            view: outputCanvas.value,
            width: width,
            height: height,
            backgroundAlpha: 0,
            antialias: true,
            preserveDrawingBuffer: true
        });
        // Cap render loop to 15fps — drastically reduces main thread GPU pressure while still passing enough frames 
        // to the worker canvas capture stream.
        app.ticker.maxFPS = 15;
        app.ticker.add(update);
    }

    activeVideo = videoA.value!;
    const firstState = props.activeState || 'idle';
    const initVideo = await loadVideoForState(firstState).catch(() => null);
    if (initVideo) activeVideo = initVideo;

    let hasChromaKey = false;
    let bgMetadata = { isChromaKey: false, color: [0, 1, 0], similarity: 0.08, smoothness: 0.2 };

    // Optimization: Skip analysis if we already have stable metadata
    if (autoChromaMetadata.value.isChromaKey && autoChromaMetadata.value.similarity > 0) {
        console.log('[AidolVideoPlayer] Re-using existing chroma metadata');
        hasChromaKey = true;
        bgMetadata = autoChromaMetadata.value as any;
    } else {
        try {
            activeVideo.currentTime = Math.min(0.5, (activeVideo.duration || 1) * 0.05);
            await new Promise(r => { 
                const handler = () => { activeVideo!.removeEventListener('seeked', handler); r(null); };
                activeVideo!.addEventListener('seeked', handler);
                setTimeout(handler, 1000); 
            });
            bgMetadata = ChromakeyFilter.analyzeBackground(activeVideo);
            autoChromaMetadata.value = bgMetadata as any;
            hasChromaKey = bgMetadata.isChromaKey;
            console.log('[AidolVideoPlayer] Background analysis:', bgMetadata);
        } catch(e) {
            console.error('[AidolVideoPlayer] Failed to analyze background:', e);
        }
    }

    if (hasChromaKey) {
        filterA.keyColor = bgMetadata.color;
        filterB.keyColor = bgMetadata.color;
        filterA.similarity = bgMetadata.similarity;
        filterB.similarity = bgMetadata.similarity;
        filterA.smoothness = bgMetadata.smoothness;
        filterB.smoothness = bgMetadata.smoothness;
    }

    textureA = PIXI.Texture.from(activeVideo);
    spriteA = new PIXI.Sprite(textureA);
    spriteA.anchor.set(0.5);
    spriteA.x = width / 2;
    spriteA.y = height / 2;
    // Cover: scale to fill the entire canvas (no letterboxing)
    const videoW = activeVideo.videoWidth || width;
    const videoH = activeVideo.videoHeight || height;
    const scaleX = width / videoW;
    const scaleY = height / videoH;
    const coverScale = Math.max(scaleX, scaleY);
    spriteA.scale.set(coverScale);
    spriteA.filters = hasChromaKey ? [filterA] : []; // only apply chromakey for solid-bg videos

    spriteB = new PIXI.Sprite();
    spriteB.anchor.set(0.5);
    spriteB.x = width / 2;
    spriteB.y = height / 2;
    spriteB.scale.copyFrom(spriteA.scale);
    spriteB.filters = hasChromaKey ? [filterB] : [];
    spriteB.alpha = 0;

    app.stage.addChild(spriteA, spriteB);

    if (props.backgroundUrl) {
        await updateBackground(props.backgroundUrl);
    }

    loading.value = false;
    emit('ready');

    // Final check for dimensions - container might have expanded after loading ends
    setTimeout(() => {
        if (container.value && app) {
            const currentW = container.value.clientWidth;
            const currentH = container.value.clientHeight;
            if (currentW > 0 && (currentW !== app.screen.width || currentH !== app.screen.height)) {
                app.renderer.resize(currentW, currentH);
                if (spriteA) {
                    spriteA.x = currentW / 2;
                    spriteA.y = currentH / 2;
                    updateSpriteScale(spriteA, activeVideo);
                }
                if (spriteB) {
                    spriteB.x = currentW / 2;
                    spriteB.y = currentH / 2;
                    updateSpriteScale(spriteB, pendingVideo || activeVideo);
                }
            }
        }
    }, 100);
};

// ─── Watchers ─────────────────────────────────────────────────────────────────

watch(() => props.activeState, (newState) => {
    if (newState) transitionToState(newState);
});

watch(() => [props.chromaSimilarity, props.chromaSmoothness, props.chromaSpill], () => {
    // Filters are updated in the `update` loop
});

watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl) updateBackground(newUrl);
    else if (bgSprite) bgSprite.visible = false;
}, { immediate: true });

watch(() => props.videoClips, () => {
    // When video model changes entirely, re-init
    if (app && !isDestroyed) {
        // Quick cleanup before re-init
        if (textureA) { textureA.destroy(true); textureA = null; }
        if (textureB) { textureB.destroy(true); textureB = null; }
        if (spriteA) { spriteA.destroy({ children: true, texture: true }); spriteA = null; }
        if (spriteB) { spriteB.destroy({ children: true, texture: true }); spriteB = null; }
        init();
    }
}, { deep: true });

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(() => init());
onBeforeUnmount(() => {
    isDestroyed = true;

    if (textureA) { textureA.destroy(true); textureA = null; }
    if (textureB) { textureB.destroy(true); textureB = null; }
    
    if (spriteA) { spriteA.destroy({ children: true, texture: true }); spriteA = null; }
    if (spriteB) { spriteB.destroy({ children: true, texture: true }); spriteB = null; }
    if (bgSprite) { bgSprite.destroy({ children: true, texture: true }); bgSprite = null; }

    if (app) { 
        app.destroy(true, { children: true, texture: true });
        app = null;
    }

    if (videoA.value) {
        videoA.value.pause();
        videoA.value.removeAttribute('src');
        videoA.value.load();
    }
    if (videoB.value) {
        videoB.value.pause();
        videoB.value.removeAttribute('src');
        videoB.value.load();
    }
});

watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl) updateBackground(newUrl);
    else if (bgSprite) {
        bgSprite.visible = false;
    }
}, { immediate: true });
// ─── Capture Methods ──────────────────────────────────────────────────────────

const captureSnapshot = async (): Promise<string | null> => {
    if (!outputCanvas.value) return null;
    return outputCanvas.value.toDataURL('image/png', 0.9);
};

const captureVideo = async (durationMs: number, audioTrack?: MediaStreamTrack): Promise<Blob | null> => {
    if (!outputCanvas.value || !app) return null;
    
    return new Promise((resolve) => {
        try {
            // Force WebGL to preserve drawing buffer to allow captureStream
            // We need to continuously render the app to push frames to the stream.
            const stream = outputCanvas.value.captureStream(30);
            if (audioTrack) stream.addTrack(audioTrack);
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            // Temporary ticker to force render during capture
            const captureTicker = () => {
                if (app && app.renderer) {
                    app.renderer.render(app.stage);
                }
            };
            app.ticker.add(captureTicker);

            mediaRecorder.onstop = () => {
                if (app) app.ticker.remove(captureTicker);
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };
            
            mediaRecorder.start();
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                }
            }, durationMs);
        } catch (e) {
            console.error('[AidolVideoPlayer] Failed to capture video:', e);
            resolve(null);
        }
    });
};

defineExpose({
    captureSnapshot,
    captureVideo
});

</script>
