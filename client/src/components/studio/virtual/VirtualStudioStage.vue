<template>
    <div ref="container" class="virtual-studio-stage w-full h-full relative overflow-hidden rounded-[2.5rem]">
        <canvas ref="canvas" class="w-full h-full"></canvas>
        
        <!-- Environment Overlay (Post-processing feel) -->
        <div class="absolute inset-0 pointer-events-none" :style="environmentStyle"></div>

        <!-- Dynamic Lyrics Overlay removed (Moved to Global Stage) -->
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed } from 'vue';
import * as PIXI from 'pixi.js';
import { useStudioStore } from '@/stores/studio';
import { Live2DModel, ZipLoader } from 'pixi-live2d-display-advanced';
import JSZip from 'jszip';
import { getFileUrl } from '@/utils/api';
import { STUDIO_ENVIRONMENTS, StudioEnvironment } from '@/constants/StudioEnvironments';
import { AtmosphereManager, ParticleType } from '@/utils/ai/AtmosphereManager';

// Configure ZipLoader
if (typeof window !== 'undefined') {
    (ZipLoader as any).zipReader = (data: Blob) => JSZip.loadAsync(data);
    (ZipLoader as any).getFilePaths = (jszip: JSZip) => Promise.resolve(Object.keys(jszip.files));
    (ZipLoader as any).getFiles = (jszip: JSZip, paths: string[]) => {
        return Promise.all(paths.map(async path => {
            const file = jszip.file(path);
            if (!file) throw new Error('File not found in zip: ' + path);
            const blob = await file.async('blob');
            return new File([blob], path.split('/').pop() || 'file');
        }));
    };
    (ZipLoader as any).readText = (jszip: JSZip, path: string) => {
        const file = jszip.file(path);
        if (!file) return Promise.reject(new Error('File not found in zip: ' + path));
        return file.async('text');
    };
    (window as any).PIXI = PIXI;
}

const props = defineProps<{
    guests: any[]; 
    guestVideos: Record<string, HTMLVideoElement>;
    environmentId: string;
    speakingVol?: number;
    hypeLevel?: number;
    globalParticleOverride?: string | null;
    debug?: boolean;
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

let app: PIXI.Application | null = null;
let backgroundSprite: PIXI.Sprite | null = null;
let atmosphere: AtmosphereManager | null = null;
const videoSprites = new Map<string, PIXI.Sprite>();
const models = new Map<string, any>(); // Retain map for potential future native needs, currently unused
const particles: any[] = [];
const studioStore = useStudioStore();
const targetLookX = ref(0); // Normalized -1.0 to 1.0 (left to right)

// Phase 64: Camera State
const cameraState = ref({
    zoom: 1.0,
    x: 0,
    y: 0,
    targetZoom: 1.0,
    targetX: 0,
    targetY: 0
});

const currentEnv = computed(() => STUDIO_ENVIRONMENTS[props.environmentId] || STUDIO_ENVIRONMENTS.standard);

const environmentStyle = computed(() => {
    const env = currentEnv.value;
    const vol = props.speakingVol || 0;
    const hype = props.hypeLevel || 0;
    
    // Scale intensity and bloom based on both volume and hype
    const intensity = 1.0 + (vol * 0.3) + (hype * 0.4);
    const bloom = 1.0 + (vol * 0.2) + (hype * 0.3);
    const saturate = 100 + (hype * 50);

    return {
        filter: `${env.vfx.colorGrading || 'none'} saturate(${saturate}%)`,
        backdropFilter: env.vfx.bloom ? `blur(${1 * bloom}px) brightness(${1.1 * intensity})` : 'none',
        boxShadow: env.vfx.bloom ? `inset 0 0 ${100 * intensity}px rgba(255,255,255,${0.05 * intensity})` : 'none',
        transition: 'all 0.1s linear'
    };
});

onMounted(() => {
    initApp();
});

onBeforeUnmount(() => {
    if (app) {
        app.destroy(true, { children: true });
    }
});

const initApp = async () => {
    if (!container.value || !canvas.value) return;

    const width = container.value.clientWidth;
    const height = container.value.clientHeight;

    app = new PIXI.Application({
        view: canvas.value,
        width,
        height,
        backgroundAlpha: 0,
        antialias: true
    });

    // Create Atmosphere Manager
    atmosphere = new AtmosphereManager(app);

    await updateEnvironment();
    await syncGuests();

    app.ticker.add(updateLoop);
};

const updateEnvironment = async () => {
    if (!app) return;
    const env = currentEnv.value;

    // Background
    if (backgroundSprite) {
        app.stage.removeChild(backgroundSprite);
    }

    try {
        const texture = await PIXI.Texture.fromURL(getFileUrl(env.backgroundUrl));
        backgroundSprite = new PIXI.Sprite(texture);
        
        // Scale and center
        const scale = Math.max(app.screen.width / texture.width, app.screen.height / texture.height);
        backgroundSprite.scale.set(scale);
        backgroundSprite.anchor.set(0.5);
        backgroundSprite.x = app.screen.width / 2;
        backgroundSprite.y = app.screen.height / 2;
        
        app.stage.addChildAt(backgroundSprite, 0);
    } catch (e) {
        console.warn('[VirtualStudioStage] Failed to load background:', e);
    }

    // Atmosphere reset
    if (atmosphere) {
        const rawType = props.globalParticleOverride || env.vfx.particles;
        const pType = rawType === 'petals' ? 'sakura' : (rawType as any);
        atmosphere.setEffect(pType === 'none' ? null : pType, 30);
    }
};


const syncGuests = async () => {
    if (!app) return;

    const activeIds = new Set(props.guests.map(g => g.uuid));

    // 1. Remove orphaned video sprites
    for (const [id, sprite] of videoSprites.entries()) {
        if (!activeIds.has(id)) {
            app.stage.removeChild(sprite);
            sprite.destroy();
            videoSprites.delete(id);
        }
    }

    // 2. Add/Update video sprites for all VTubers
    for (let i = 0; i < props.guests.length; i++) {
        const guest = props.guests[i];
        const guestId = guest.uuid || guest.id; // Fallback to id if uuid is missing
        const video = props.guestVideos[guestId];
        
        if (!video) {
            console.log(`[VirtualStudioStage] No video found for guest: ${guestId}`);
            continue;
        }

        let sprite = videoSprites.get(guestId);
        if (!sprite) {
            console.log(`[VirtualStudioStage] Creating sprite for guest: ${guestId}`, {
                src: video.srcObject instanceof MediaStream ? video.srcObject.id : 'none',
                readyState: video.readyState,
                videoWidth: video.videoWidth
            });

            // Create new video sprite
            // We use PIXI.BaseTexture to have more control if needed
            const texture = PIXI.Texture.from(video);
            sprite = new PIXI.Sprite(texture);
            sprite.anchor.set(0.5, 1); // Anchor at bottom center
            
            videoSprites.set(guestId, sprite);
            app.stage.addChild(sprite);
        } else if ((sprite.texture.baseTexture.resource as any).source !== video) {
            console.log(`[VirtualStudioStage] Updating video source for guest: ${guestId}`);
            const texture = PIXI.Texture.from(video);
            sprite.texture = texture;
        }

        sprite.visible = guest.videoEnabled !== false;
        updateVideoPosition(guestId, i);
    }
};

const updateVideoPosition = (guestId: string, index: number) => {
    const sprite = videoSprites.get(guestId);
    if (!sprite || !app) return;

    const width = app.screen.width;
    const height = app.screen.height;

    // Slot points (Percentage of width)
    const slotPoints = [0.2, 0.4, 0.6, 0.8];
    const x = slotPoints[index % 4] * width;

    // Scale to fit height with some padding
    const padding = 0.8;
    const spriteHeight = sprite.texture.height || 1080; // Fallback to 1080 if not loaded
    const scale = (height / spriteHeight) * padding;
    
    sprite.scale.set(scale);
    sprite.x = x;
    sprite.y = height + 20; // Slight overlap with bottom
};


// Video Positioning & Spatial Interaction
const updateLoop = (delta: number) => {
    // Update Camera (Phase 64)
    updateCamera(delta);

    // Update Atmosphere
    if (atmosphere) {
        const volumeFactor = 1.0 + (props.speakingVol || 0) * 2;
        const hypeFactor = 1.0 + (props.hypeLevel || 0) * 1.5;
        atmosphere.update(delta, volumeFactor * hypeFactor);
    }
    // Update all video sprites for smooth movements or interactions if needed
    // (Most logic is handled inside VirtualGuest streams now)
};

// Phase 64: Auto-Camera Logic
watch(() => [studioStore.currentSpeakerId, studioStore.autoCameraEnabled], ([speakerId, autoEnabled]) => {
    if (!autoEnabled || !app) {
        cameraState.value.targetZoom = 1.0;
        cameraState.value.targetX = 0;
        cameraState.value.targetY = 0;
        return;
    }

    if (!speakerId) {
        // Wide shot
        cameraState.value.targetZoom = 1.0;
        cameraState.value.targetX = 0;
        cameraState.value.targetY = 0;
    } else {
        // Close-up on speaker
        const index = props.guests.findIndex(g => g.id === speakerId);
        if (index !== -1) {
            const width = app.screen.width;
            const slotPoints = [0.2, 0.4, 0.6, 0.8];
            const speakerX = slotPoints[index % 4] * width;
            
            cameraState.value.targetZoom = 1.5;
            cameraState.value.targetX = (width / 2 - speakerX) * 1.5;
            cameraState.value.targetY = app.screen.height * 0.1; // Slight downward offset for close-up
        }
    }
}, { immediate: true });

const updateCamera = (delta: number) => {
    if (!app) return;
    
    const lerpSpeed = 0.05 * delta;
    const s = cameraState.value;
    
    s.zoom += (s.targetZoom - s.zoom) * lerpSpeed;
    s.x += (s.targetX - s.x) * lerpSpeed;
    s.y += (s.targetY - s.y) * lerpSpeed;
    
    app.stage.scale.set(s.zoom);
    app.stage.x = app.screen.width / 2 + s.x - (app.screen.width / 2 * s.zoom);
    app.stage.y = app.screen.height + s.y - (app.screen.height * s.zoom);
};

// Phase 62: Spatial Awareness Watcher
watch(() => studioStore.currentSpeakerId, (speakerId) => {
    if (!speakerId) {
        targetLookX.value = 0; // Look at audience
        return;
    }

    // Find if speaker is one of our stage guests
    const index = props.guests.findIndex(g => g.id === speakerId);
    if (index !== -1) {
        const slotPoints = [-0.6, -0.2, 0.2, 0.6]; // Map [0.2, 0.4, 0.6, 0.8] to [-1, 1] range roughly
        targetLookX.value = slotPoints[index % 4];
    } else {
        // Human Host or external speaker
        targetLookX.value = 0;
    }
});

// Interaction handlers removed (Handled by streaming)

watch(() => props.guests, syncGuests, { deep: true });
watch(() => props.guestVideos, () => {
    console.log('[VirtualStudioStage] guestVideos updated', Object.keys(props.guestVideos));
    syncGuests();
}, { deep: true });
watch(() => props.environmentId, updateEnvironment);
watch(() => props.globalParticleOverride, updateEnvironment);

// Expose methods for spatial tracking and emotions
defineExpose({
    canvas
});
</script>

<style scoped>
.virtual-studio-stage {
    background: #050505;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.canvas-container {
    mask-image: radial-gradient(circle at center, black 60%, transparent 100%);
}
</style>
