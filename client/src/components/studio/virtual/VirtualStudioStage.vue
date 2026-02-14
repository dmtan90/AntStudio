<template>
    <div ref="container" class="virtual-studio-stage w-full h-full relative overflow-hidden rounded-[2.5rem]">
        <canvas ref="canvas" class="w-full h-full"></canvas>
        
        <!-- Environment Overlay (Post-processing feel) -->
        <div class="absolute inset-0 pointer-events-none" :style="environmentStyle"></div>

        <!-- Dynamic Lyrics Overlay -->
        <StageLyricsOverlay 
            v-if="lyricsEnabled && lyrics && lyrics.length > 0"
            :lyrics="lyrics"
            :currentTime="currentTime || 0"
            :style="lyricsStyle || 'neon'"
        />
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
import StageLyricsOverlay from '@/components/vtuber/StageLyricsOverlay.vue';

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
    guests: any[]; // Array of Guest objects with persona and audio information
    environmentId: string;
    debug?: boolean;
    lyrics?: any[];
    currentTime?: number;
    lyricsEnabled?: boolean;
    lyricsStyle?: 'neon' | 'minimal' | 'kinetic';
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);

let app: PIXI.Application | null = null;
let backgroundSprite: PIXI.Sprite | null = null;
let particleContainer: PIXI.Container | null = null;
const models = new Map<string, Live2DModel>();
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
    return {
        filter: env.vfx.colorGrading || 'none',
        backdropFilter: env.vfx.bloom ? 'blur(1px) brightness(1.1)' : 'none',
        boxShadow: env.vfx.bloom ? 'inset 0 0 100px rgba(255,255,255,0.05)' : 'none'
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

    // Create particle container (below models)
    particleContainer = new PIXI.Container();
    app.stage.addChild(particleContainer);

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

    // Particles reset
    if (particleContainer) {
        particleContainer.removeChildren();
        particles.length = 0;
        if (env.vfx.particles && env.vfx.particles !== 'none') {
            initParticles(env.vfx.particles);
        }
    }
};

const initParticles = (type: string) => {
    if (!particleContainer || !app) return;

    const count = type === 'fireflies' ? 30 : 50;
    for (let i = 0; i < count; i++) {
        const p = new PIXI.Graphics();
        
        if (type === 'fireflies') {
            p.beginFill(0xffffaa, 0.4);
            p.drawCircle(0, 0, Math.random() * 2 + 1);
            p.endFill();
        } else if (type === 'petals') {
            p.beginFill(0xffcccc, 0.6);
            p.drawEllipse(0, 0, 4, 6);
            p.endFill();
            p.rotation = Math.random() * Math.PI;
        }

        p.x = Math.random() * app.screen.width;
        p.y = Math.random() * app.screen.height;
        
        const data = {
            sprite: p,
            vx: (Math.random() - 0.5) * 0.5,
            vy: type === 'petals' ? Math.random() * 0.5 + 0.2 : (Math.random() - 0.5) * 0.5,
            va: (Math.random() - 0.5) * 0.02
        };

        particles.push(data);
        particleContainer.addChild(p);
    }
};

const syncGuests = async () => {
    if (!app) return;

    const activeIds = new Set(props.guests.map(g => g.id));

    // Remove old guests
    for (const [id, model] of models.entries()) {
        if (!activeIds.has(id)) {
            app.stage.removeChild(model as any);
            model.destroy({ children: true });
            models.delete(id);
        }
    }

    // Add/Update current guests
    for (let i = 0; i < props.guests.length; i++) {
        const guest = props.guests[i];
        if (!models.has(guest.id)) {
            await loadGuestModel(guest, i);
        } else {
            // Update positioning if slot changed
            updateGuestPosition(guest.id, i);
        }
    }
};

const loadGuestModel = async (guest: any, index: number) => {
    if (!app || !guest.persona?.visualIdentity?.live2dModelUrl) return;

    try {
        const url = getFileUrl(guest.persona.visualIdentity.live2dModelUrl);
        const model = await Live2DModel.from(url, { autoHitTest: true, autoFocus: false });
        
        // Basic Setup
        setupModelNaturalBehavior(model);
        
        models.set(guest.id, model);
        app.stage.addChild(model as any);
        
        updateGuestPosition(guest.id, index);
    } catch (e) {
        console.error(`[VirtualStudioStage] Failed to load model for ${guest.name}:`, e);
    }
};

const updateGuestPosition = (guestId: string, index: number) => {
    const model = models.get(guestId);
    if (!model || !app) return;

    const width = app.screen.width;
    const height = app.screen.height;

    // Slot points (Percentage of width)
    const slotPoints = [0.2, 0.4, 0.6, 0.8];
    const x = slotPoints[index % 4] * width;

    // Relative Scaling
    const bounds = model.getBounds();
    const padding = 0.8;
    const scale = (height / bounds.height) * padding;
    
    model.scale.set(scale);
    model.anchor.set(0.5, 1); // Anchor at bottom center
    model.x = x;
    model.y = height + 20; // Slight overlap with bottom
};

const setupModelNaturalBehavior = (model: Live2DModel) => {
    // Disable auto-tracking to allow us to control eyes spatially
    (model as any).autoInteract = false;
    
    // Add custom ticker for natural idle/blink
    let blinkTimer = Math.random() * 100;
    let blinkState = 1.0;
    let swayX = Math.random() * 100;

    const ticker = () => {
        const core = (model.internalModel as any).coreModel;
        
        // Blink
        blinkTimer--;
        if (blinkTimer <= 0) {
            blinkState = blinkState === 1.0 ? 0.0 : 1.0;
            blinkTimer = blinkState === 0.0 ? 5 : 120 + Math.random() * 200;
        }
        
        const eyeL = core.getParameterIndex('ParamEyeOpenL');
        const eyeR = core.getParameterIndex('ParamEyeOpenR');
        if (eyeL >= 0) core.setParameterValueById(eyeL, blinkState);
        if (eyeR >= 0) core.setParameterValueById(eyeR, blinkState);

        // Subtle Sway
        swayX += 0.02;
        const angleX = core.getParameterIndex('ParamAngleX');
        if (angleX >= 0) {
            const current = core.getParameterValueById(angleX);
            core.setParameterValueById(angleX, current + Math.sin(swayX) * 0.1);
        }
    };

    (model as any)._customTicker = ticker;
    app?.ticker.add(ticker);
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

const updateModelSpatialGaze = (model: Live2DModel, delta: number) => {
    const internal = model.internalModel as any;
    const core = internal.coreModel;
    
    // We target the current Look X
    // Note: Some models use -30 to 30, others -1 to 1. 
    // Live2DModel usually normalizes or we use Parameter IDs
    
    const target = targetLookX.value;
    const lerpSpeed = 0.05 * delta;

    const params = [
        { id: 'ParamAngleX', scale: 30 },
        { id: 'ParamEyeBallX', scale: 1.0 },
        { id: 'ParamBodyAngleX', scale: 10 }
    ];

    params.forEach(p => {
        const idx = core.getParameterIndex(p.id);
        if (idx >= 0) {
            const current = core.getParameterValueById(idx);
            const goal = target * p.scale;
            const next = current + (goal - current) * lerpSpeed;
            core.setParameterValueById(idx, next);
        }
    });
};

const updateLoop = (delta: number) => {
    // Update Camera (Phase 64)
    updateCamera(delta);

    // Update Particles
    particles.forEach(p => {
        p.sprite.x += p.vx * delta;
        p.sprite.y += p.vy * delta;
        p.sprite.rotation += p.va * delta;

        // Wrap around
        if (p.sprite.x < -20) p.sprite.x = (app?.screen.width || 0) + 20;
        if (p.sprite.x > (app?.screen.width || 0) + 20) p.sprite.x = -20;
        if (p.sprite.y < -20) p.sprite.y = (app?.screen.height || 0) + 20;
        if (p.sprite.y > (app?.screen.height || 0) + 20) p.sprite.y = -20;
    });

    // Update Lip Sync & Spatial Gaze from props
    props.guests.forEach(guest => {
        const model = models.get(guest.id);
        if (model) {
            if (guest.audioLevel !== undefined) {
                updateModelLipSync(model, guest.audioLevel);
            }
            
            // Don't make the speaker look at themselves too much, or keep them slightly front
            if (guest.id === studioStore.currentSpeakerId) {
                // Speaker looks more front
                const mockModel = { ...model }; // just for the logic flow
                // Actually we can just apply a reduced target
                updateModelSpatialGaze(model, delta * 0.5); 
            } else {
                updateModelSpatialGaze(model, delta);
            }
        }
    });
};

const updateModelLipSync = (model: Live2DModel, vol: number) => {
    const internal = model.internalModel as any;
    const core = internal.coreModel;
    const mouthValue = Math.min(1.0, vol * 4.0);
    
    const mouthParams = ['ParamMouthOpenY', 'ParamMouthOpen', 'ParamMouthY'];
    mouthParams.forEach(p => {
        const idx = core.getParameterIndex(p);
        if (idx >= 0) core.setParameterValueById(idx, mouthValue);
    });
};

watch(() => props.guests, syncGuests, { deep: true });
watch(() => props.environmentId, updateEnvironment);

// Expose methods for spatial tracking and emotions
const triggerEmotion = (guestId: string, emotion: string) => {
    const model = models.get(guestId);
    if (!model) return;
    
    // Simple motion trigger
    (model as any).motion(emotion, 0, PIXI.UPDATE_PRIORITY.HIGH);
};

defineExpose({
    triggerEmotion
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
