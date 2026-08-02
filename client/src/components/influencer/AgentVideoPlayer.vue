<template>
    <div ref="container" class="w-full h-full relative overflow-hidden bg-transparent">
        <!-- Unified agent single video buffer (hidden, feeds into PixiJS Canvas pipeline) -->
        <video ref="videoElement" crossOrigin="anonymous" playsinline muted loop class="hidden" preload="auto"></video>

        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-50">
            <div class="flex flex-col items-center gap-3">
                <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-400"></div>
                <span class="text-[10px] font-black uppercase tracking-widest text-white/60">AI Agent Link ...</span>
            </div>
        </div>

        <!-- ChromaKey Canvas Output -->
        <canvas ref="outputCanvas" class="w-full h-full object-cover bg-transparent"></canvas>

        <!-- Dynamic state overlay badge -->
        <div class="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-500/60 text-slate-200"
             style="backdrop-filter: blur(4px);">
            Agent: {{ activeState }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { getFileUrl } from '@/utils/api';
import * as PIXI from 'pixi.js';
import { ChromakeyFilter } from '@/utils/webgl/PIXIFilters';

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

const props = defineProps<{
    modelUrl?: string;
    videoClips?: AidolClipLibrary;
    activeState?: string;
    chromaKeyColor?: [number, number, number];
    chromaSimilarity?: number;
    chromaSmoothness?: number;
    backgroundUrl?: string;
    uuid?: string;
}>();

const emit = defineEmits(['ready', 'state-changed']);

const container = ref<HTMLElement | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const outputCanvas = ref<HTMLCanvasElement | null>(null);

const loading = ref(true);
const activeState = ref(props.activeState || 'idle');

let app: PIXI.Application | null = null;
let activeSprite: PIXI.Sprite | null = null;
let bgSprite: PIXI.Sprite | null = null;
const chromaFilter = new ChromakeyFilter([0, 1, 0], 0.35, 0.15);

let isDestroyed = false;

const loadVideoForState = async (state: string): Promise<HTMLVideoElement | null> => {
    const url = props.videoClips?.[state] 
        || (state !== 'idle' ? props.videoClips?.idle : undefined)
        || props.modelUrl;

    if (!url || !videoElement.value) return null;
    
    const target = videoElement.value;
    target.src = getFileUrl(url);
    target.currentTime = 0;
    
    await new Promise<void>((res, rej) => {
        target.oncanplay = () => res();
        target.onerror = () => rej(new Error(`Failed to load agent clip: ${state}`));
        target.load();
    });
    
    await target.play().catch(() => {});
    return target;
};

const transitionToState = async (newState: string) => {
    if (newState === activeState.value) return;
    activeState.value = newState;
    
    const nextVideo = await loadVideoForState(newState);
    if (!nextVideo || !app || isDestroyed) return;

    console.log(`[AgentVideoPlayer] Direct texture swap: ${newState}`);
    const texture = PIXI.Texture.from(nextVideo);

    if (activeSprite) {
        if (activeSprite.texture && activeSprite.texture !== PIXI.Texture.EMPTY) {
            activeSprite.texture.destroy(true);
        }
        activeSprite.texture = texture;
        updateSpriteScale(activeSprite, nextVideo);
    }

    emit('state-changed', newState);
};

const updateSpriteScale = (sprite: PIXI.Sprite | null, video: HTMLVideoElement | null) => {
    if (!sprite || !video || !app) return;
    
    const width = app.screen.width;
    const height = app.screen.height;
    const videoW = video.videoWidth || width;
    const videoH = video.videoHeight || height;
    
    const scaleX = width / videoW;
    const scaleY = height / videoH;
    const containScale = Math.min(scaleX, scaleY);
    
    sprite.scale.set(containScale);
};

const update = () => {
    if (!app || isDestroyed || !activeSprite) return;
    
    chromaFilter.keyColor = props.chromaKeyColor || [0, 1, 0];
    chromaFilter.similarity = props.chromaSimilarity ?? 0.35;
    chromaFilter.smoothness = props.chromaSmoothness ?? 0.15;
};

const updateBackground = async (url: string) => {
    if (!url) {
        if (bgSprite && app) {
             app.stage.removeChild(bgSprite);
             bgSprite.destroy({ children: true, texture: true });
             bgSprite = null;
        }
        return;
    }
    if (!app) return;

    try {
        const bgUrl = getFileUrl(url);
        const bgTex = await PIXI.Texture.fromURL(bgUrl, { resourceOptions: { autoLoad: true } });
        if (!bgTex) return;

        if (!bgSprite) {
            bgSprite = new PIXI.Sprite(bgTex);
            bgSprite.anchor.set(0.5);
            app.stage.addChildAt(bgSprite, 0); // Always at bottom
        } else {
            bgSprite.texture = bgTex;
        }

        const targetW = app.screen.width;
        const targetH = app.screen.height;
        
        const scaleX = targetW / bgTex.width;
        const scaleY = targetH / bgTex.height;
        const bgScale = Math.max(scaleX, scaleY);
        
        bgSprite.scale.set(bgScale);
        bgSprite.x = targetW / 2;
        bgSprite.y = targetH / 2;
        bgSprite.visible = true;
    } catch (e) {
        console.error('[AgentVideoPlayer] Failed to update background:', e);
    }
};

const init = async () => {
    if (!container.value || !outputCanvas.value) return;
    loading.value = true;
    
    // Performance: Cap internal resolution to 360x640 max
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
        app.ticker.maxFPS = 15; // Cap to 15fps for massive CPU relief
        app.ticker.add(update);
    }

    const firstState = props.activeState || 'idle';
    const initVideo = await loadVideoForState(firstState).catch(() => null);
    if (initVideo) {
        const texture = PIXI.Texture.from(initVideo);
        activeSprite = new PIXI.Sprite(texture);
        activeSprite.anchor.set(0.5);
        activeSprite.x = width / 2;
        activeSprite.y = height / 2;
        
        updateSpriteScale(activeSprite, initVideo);
        activeSprite.filters = [chromaFilter];
        app.stage.addChild(activeSprite);
    }

    if (props.backgroundUrl) {
        await updateBackground(props.backgroundUrl);
    }

    loading.value = false;
    emit('ready');
};

watch(() => props.activeState, (newState) => {
    if (newState) transitionToState(newState);
});

watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl) updateBackground(newUrl);
    else if (bgSprite) bgSprite.visible = false;
}, { immediate: true });

onMounted(() => init());
onBeforeUnmount(() => {
    isDestroyed = true;
    if (activeSprite) { activeSprite.destroy({ children: true, texture: true }); activeSprite = null; }
    if (bgSprite) { bgSprite.destroy({ children: true, texture: true }); bgSprite = null; }
    if (app) { 
        app.destroy(true, { children: true, texture: true });
        app = null;
    }
    if (videoElement.value) {
        videoElement.value.pause();
        videoElement.value.removeAttribute('src');
        videoElement.value.load();
    }
});

const captureSnapshot = async (): Promise<string | null> => {
    if (!outputCanvas.value) return null;
    return outputCanvas.value.toDataURL('image/png', 0.9);
};

defineExpose({
    captureSnapshot
});
</script>
