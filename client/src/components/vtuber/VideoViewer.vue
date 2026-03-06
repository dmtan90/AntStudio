<template>
    <div ref="container" class="w-full h-full relative group bg-[#050505] rounded-xl overflow-hidden" 
         style="border: 1px solid rgba(255, 255, 255, 0.1);">
        
        <video ref="videoElement" crossOrigin="anonymous" playsinline muted loop class="hidden"></video>
        <video ref="videoElementB" crossOrigin="anonymous" playsinline muted loop class="hidden"></video>
        
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50">
            <div class="flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Neural Video Link...</span>
            </div>
        </div>

        <canvas ref="canvas" class="w-full h-full"></canvas>

        <!-- Mouth Interior Overlay (Upgraded for Neural Photorealism) -->
        <div v-if="showMouthInterior" class="absolute pointer-events-none overflow-hidden z-10 scale-y-110" :style="mouthInteriorStyle">
            <div class="w-full h-full relative" style="background: radial-gradient(circle at center 30%, #300a0a 0%, #0a0505 100%);">
                <!-- Neural Teeth Placeholder -->
                <div class="absolute top-[5%] left-1/2 -translate-x-1/2 w-[85%] h-[25%] bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-[1px] rounded-b-[20%]"
                     :style="{ opacity: 0.3 + (speakingVol || 0) * 0.4 }"></div>
                <!-- Neural Tongue/Shadow -->
                <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-red-900/20 blur-[2px] rounded-t-full"></div>
            </div>
        </div>

        <!-- Dynamic Lyrics Overlay -->
        <StageLyricsOverlay 
            v-if="lyricsEnabled && lyrics && lyrics.length > 0"
            :lyrics="lyrics"
            :currentTime="currentTime || 0"
            :style="lyricsStyle || 'neon'"
            :position="lyricsPosition || 'bottom'"
        />

        <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
            <div class="text-red-400 text-[10px] font-black uppercase px-4 text-center">{{ error }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, watch } from 'vue';
import * as PIXI from 'pixi.js';
import { faceLandmarkService } from '@/utils/ai/FaceLandmarkService';
import Delaunator from 'delaunator';
import { getFileUrl } from '@/utils/api';
import { isSingingAtTime } from '@/utils/lyricUtils';
import { AtmosphereManager, ParticleType } from '@/utils/ai/AtmosphereManager';
import StageLyricsOverlay from './StageLyricsOverlay.vue';

const props = defineProps<{
    modelUrl: string;
    speakingVol?: number;
    config?: any;
    lyrics?: any[];
    currentTime?: number;
    lyricsStyle?: 'neon' | 'minimal' | 'kinetic';
    lyricsPosition?: 'top' | 'bottom';
    lyricsEnabled?: boolean;
    gesture?: string | null;
    cameraTransform?: {
        x: number;
        y: number;
        zoom: number;
        rotation: number;
    };
    auraEnabled?: boolean;
    auraColor?: string;
    particleType?: string | null;
    particleDensity?: number;
    emotion?: string | null;
}>();

const emit = defineEmits(['ready', 'stream-ready', 'update:config']);

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const videoElementB = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// PIXI State
let app: PIXI.Application | null = null;
let texture: PIXI.Texture | null = null;
let textureB: PIXI.Texture | null = null;
let meshB: PIXI.Mesh | null = null;
let crossFadeAlpha = 0; // 0 = A is visible, 1 = B is visible
let isCrossFading = false;
let auraSprite: PIXI.Sprite | null = null;
let atmosphere: AtmosphereManager | null = null;
let mesh: PIXI.Mesh | null = null;
let originalVertices: Float32Array | null = null;

// Mouth Interior State
const showMouthInterior = ref(false);
const mouthInteriorStyle = reactive({
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    transform: '',
    opacity: '0',
});

// Animation State
let smoothedVolume = 0;
const VOLUME_SMOOTHING = 0.9;
let gestureX = 0;
let gestureY = 0;
let lastLandmarks: any[] | null = null;
let textureWidth = 0;
let textureHeight = 0;
let displayScale = 1.0;

// Phase 13: Blink State
let blinkProgress = 0; // 0=open, 1=fully closed
let isBlinking = false;
let nextBlinkAt = Date.now() + 3000 + Math.random() * 4000;

// Landmarks Indices (MediaPipe)
const MOUTH_CORE = [13, 312, 311, 310, 415, 308, 14, 317, 402, 318, 324, 78, 191, 80, 81, 82, 87, 178, 88, 95];
const LOWER_LIP = [146, 91, 181, 84, 17, 314, 405, 321, 375, 324, 318, 402, 317, 14, 87, 178, 88, 95];
const UPPER_LIP = [185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const CHEEK_LEFT = [212, 214, 216, 206, 203, 118, 119];
const CHEEK_RIGHT = [432, 434, 436, 426, 423, 347, 348];
const JAW_LINE = [150, 149, 176, 148, 152, 377, 400, 378, 379];
// Phase 13: Emotion landmark groups
const BROW_LEFT = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const BROW_RIGHT = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
const EYE_UPPER_LEFT = [386, 374, 373, 390, 388, 387];
const EYE_UPPER_RIGHT = [159, 145, 144, 163, 161, 160];
const MOUTH_CORNERS = [61, 291]; // Left & Right mouth corners

const init = async () => {
    if (!container.value || !canvas.value || !videoElement.value || !props.modelUrl) return;

    loading.value = true;
    error.value = null;

    try {
        const video = videoElement.value;
        video.src = getFileUrl(props.modelUrl);
        
        await new Promise((resolve, reject) => {
            video.onloadeddata = resolve;
            video.onerror = reject;
            video.load();
        });

        const width = 1280;
        const height = 720;

        if (!app) {
            app = new PIXI.Application({
                view: canvas.value,
                width,
                height,
                backgroundAlpha: 0,
                antialias: true,
            });

            if (app) {
                atmosphere = new AtmosphereManager(app);
            }
            app.ticker.add(() => update());
        }

        texture = PIXI.Texture.from(video);
        textureWidth = texture.width;
        textureHeight = texture.height;
        
        displayScale = Math.min(width / textureWidth, height / textureHeight);

        // Initial Face Detection on first frame
        const detection = await faceLandmarkService.detect(video as any);
        if (detection && detection.faceLandmarks.length > 0) {
            lastLandmarks = detection.faceLandmarks[0];
            setupMesh(lastLandmarks!);
            video.play();
        } else {
            throw new Error("No face detected in video phôi.");
        }

        loading.value = false;
        emit('ready');
        emit('stream-ready', canvas.value.captureStream(30));

        // Phase 12: Preload secondary video for seamless cross-fade
        preloadVideoB();
    } catch (err: any) {
        console.error("VideoViewer Init Error:", err);
        error.value = err.message || "Neural Video Link Failed";
        loading.value = false;
    }
};

/**
 * Phase 12: Preload video B at a random timestamp for seamless loop cross-fade.
 */
const preloadVideoB = async () => {
    const videoB = videoElementB.value;
    if (!videoB || !props.modelUrl || !app || !lastLandmarks) return;
    
    videoB.src = getFileUrl(props.modelUrl);
    await new Promise<void>(res => { videoB.onloadeddata = () => res(); videoB.load(); });

    // Seek to a random point in the middle of the video (25%-75%)
    const randomFraction = 0.25 + Math.random() * 0.5;
    videoB.currentTime = videoB.duration * randomFraction;
    videoB.play();
    
    // Build a hidden mesh for video B
    textureB = PIXI.Texture.from(videoB);
    const geometry = new PIXI.Geometry();
    
    // Reuse the same landmark vertices from video A
    if (originalVertices && mesh) {
        const geomA: any = mesh.geometry;
        geometry.addAttribute('aVertexPosition', new Float32Array(originalVertices), 2);
        const uvsA = geomA.getBuffer('aTextureCoord').data;
        geometry.addAttribute('aTextureCoord', new Float32Array(uvsA), 2);
        const indicesA = geomA.indexBuffer.data;
        geometry.addIndex(Array.from(indicesA));
        
        meshB = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(textureB));
        meshB.x = mesh.x;
        meshB.y = mesh.y;
        meshB.scale.copyFrom(mesh.scale);
        meshB.alpha = 0;
        if (app) app.stage.addChildAt(meshB, 1); // Behind aura, above bg
    }
    console.log('[VideoViewer] Cross-fade video B preloaded.');
};

const createAuraSprite = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(64, 158, 255, 0.6)');
        grad.addColorStop(0.5, 'rgba(64, 158, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
    }
    const tex = PIXI.Texture.from(canvas);
    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = PIXI.BLEND_MODES.ADD;
    sprite.alpha = 0;
    return sprite;
};

const setupMesh = (landmarks: any[]) => {
    if (!app || !texture) return;

    const points: number[] = [];
    const uvs: number[] = [];

    const addPoint = (x: number, y: number) => {
        const localX = (x - 0.5) * textureWidth * displayScale;
        const localY = (y - 0.5) * textureHeight * displayScale;
        points.push(localX, localY);
        uvs.push(x, y);
    };

    landmarks.forEach(lm => addPoint(lm.x, lm.y));
    
    // Add corners for stability
    addPoint(0, 0); addPoint(1, 0); addPoint(1, 1); addPoint(0, 1);

    const delaunay = new Delaunator(uvs);
    const indices = new Uint32Array(delaunay.triangles);

    originalVertices = new Float32Array(points);
    const geometry = new PIXI.Geometry();
    geometry.addAttribute('aVertexPosition', new Float32Array(points), 2);
    geometry.addAttribute('aTextureCoord', new Float32Array(uvs), 2);
    geometry.addIndex(Array.from(indices));

    mesh = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(texture));
    mesh.x = app.screen.width / 2;
    mesh.y = app.screen.height / 2;
    
    app.stage.removeChildren();
    
    // Add Aura behind the character
    auraSprite = createAuraSprite();
    app.stage.addChild(auraSprite);
    
    app.stage.addChild(mesh);
};

const update = () => {
    if (!mesh || !originalVertices || !app) return;

    const vol = props.speakingVol || 0;

    // Phase 12: Seamless cross-fade loop detection
    const videoA = videoElement.value;
    if (videoA && videoA.duration > 0 && meshB && textureB) {
        const remaining = videoA.duration - videoA.currentTime;
        const FADE_START = 2.0; // Start fading 2 seconds before end
        
        if (remaining < FADE_START && !isCrossFading) {
            isCrossFading = true;
        }
        
        if (isCrossFading) {
            crossFadeAlpha = Math.min(1, crossFadeAlpha + 0.016); // ~60fps: 1s transition
            mesh.alpha = 1 - crossFadeAlpha;
            meshB.alpha = crossFadeAlpha;
            
            // When fade is complete, swap A and B
            if (crossFadeAlpha >= 1) {
                mesh.alpha = 1;
                meshB.alpha = 0;
                crossFadeAlpha = 0;
                isCrossFading = false;
                
                // Restart video A from random point
                const randomFraction = 0.1 + Math.random() * 0.5;
                videoA.currentTime = videoA.duration * randomFraction;
                
                // Preload new B for next loop
                setTimeout(() => preloadVideoB(), 500);
            }
        }
    }
    
    // Unified Atmosphere
    if (atmosphere) {
        atmosphere.setEffect(props.particleType as ParticleType, props.particleDensity || 20);
        atmosphere.update(1.0, 1.0 + (vol * 1.5));
    }

    smoothedVolume = smoothedVolume * VOLUME_SMOOTHING + vol * (1 - VOLUME_SMOOTHING);
    const clampedVol = Math.min(smoothedVolume, 0.5);

    const dx = props.cameraTransform ? (props.cameraTransform.x * app.screen.width) : 0;
    const dy = props.cameraTransform ? (props.cameraTransform.y * app.screen.height) : 0;
    const dz = props.cameraTransform ? props.cameraTransform.zoom : 1.0;
    const dr = props.cameraTransform ? props.cameraTransform.rotation : 0;

    if (app && mesh) {
        let targetGX = 0;
        let targetGY = 0;
        
        if (props.gesture === 'look_around' && clampedVol < 0.05) {
            const now = Date.now() * 0.001;
            targetGX = Math.sin(now * 0.8) * 35;
            targetGY = Math.cos(now * 0.6) * 15;
        }

        if (props.gesture === 'nod_emphasis') {
            const now = Date.now() * 0.015;
            targetGY = Math.max(0, Math.sin(now)) * 25;
        }

        gestureX = gestureX * 0.9 + targetGX * 0.1;
        gestureY = gestureY * 0.9 + targetGY * 0.1;

        mesh.scale.set(displayScale * dz);
        mesh.x = app.screen.width / 2 + dx + (gestureX * 0.5);
        mesh.y = app.screen.height / 2 + dy + (gestureY * 0.5);
        mesh.rotation = dr;

        // Update Aura
        if (auraSprite) {
            if (props.auraEnabled) {
                auraSprite.alpha = auraSprite.alpha * 0.8 + 0.2;
                const pulse = 1.0 + (clampedVol * 0.8) + (Math.sin(Date.now() * 0.005) * 0.05);
                auraSprite.scale.set(mesh.scale.x * 2.0 * pulse);
                auraSprite.x = mesh.x;
                auraSprite.y = mesh.y;
                auraSprite.rotation = mesh.rotation + (Math.sin(Date.now() * 0.002) * 0.1);
                
                if (props.auraColor) {
                    auraSprite.tint = parseInt(props.auraColor.replace('#', ''), 16);
                } else {
                    auraSprite.tint = 0x409eff;
                }
            } else {
                auraSprite.alpha *= 0.8;
            }
        }
    }

    const geom: any = mesh.geometry;
    const positions = geom.getBuffer?.('aVertexPosition')?.data;
    if (!positions) return;

    for (let i = 0; i < positions.length; i += 2) {
        const ox = originalVertices[i];
        const oy = originalVertices[i + 1];
        const idx = i / 2;
        let tx = ox;
        let ty = oy;

        // Perspective Distortion
        const dx = (ox / (textureWidth * displayScale));
        const dy = (oy / (textureHeight * displayScale));
        tx += gestureX * Math.abs(dx) * 0.5;
        ty += gestureY * Math.abs(dy) * 0.3;

        // Neural Elastic Warping (Phase 11)
        if (clampedVol > 0.01) {
            const moveY = Math.sqrt(clampedVol) * 32;
            
            // 1. Mouth Opening
            if (MOUTH_CORE.includes(idx)) {
                if (LOWER_LIP.includes(idx)) ty += moveY;
                else if (UPPER_LIP.includes(idx)) ty -= moveY * 0.25;
            }
            
            // 2. Elastic Jaw & Cheek Drag
            if (JAW_LINE.includes(idx)) {
                ty += moveY * 0.6; // Jaw follows mouth open
            }
            
            if (CHEEK_LEFT.includes(idx) || CHEEK_RIGHT.includes(idx)) {
                ty += moveY * 0.25; // Cheeks stretch slightly
                const pullX = (CHEEK_LEFT.includes(idx) ? -1 : 1) * moveY * 0.15;
                tx += pullX;
            }
        }

        // Phase 13: Emotion Micro-Warps
        const em = props.emotion;
        if (em === 'happy' || em === 'excited') {
            if (BROW_LEFT.includes(idx) || BROW_RIGHT.includes(idx)) ty -= 4;
            if (EYE_UPPER_LEFT.includes(idx) || EYE_UPPER_RIGHT.includes(idx)) ty -= 2;
            if (MOUTH_CORNERS.includes(idx)) ty -= 5;
        } else if (em === 'angry' || em === 'frustrated') {
            if (BROW_LEFT.includes(idx)) { ty += 6; tx += 3; }
            if (BROW_RIGHT.includes(idx)) { ty += 6; tx -= 3; }
        } else if (em === 'sad' || em === 'disappointed') {
            if (BROW_LEFT.includes(idx)) { ty -= 2; tx -= 2; }
            if (BROW_RIGHT.includes(idx)) { ty -= 2; tx += 2; }
            if (MOUTH_CORNERS.includes(idx)) ty += 4;
        }

        // Phase 13: Neural Blink
        const now = Date.now();
        if (now >= nextBlinkAt && !isBlinking) {
            isBlinking = true;
        }
        if (isBlinking) {
            blinkProgress = Math.min(1, blinkProgress + 0.12);
            if (blinkProgress >= 1) {
                isBlinking = false;
                blinkProgress = 0;
                nextBlinkAt = now + 3000 + Math.random() * 4000;
            }
        }
        const blinkClose = Math.sin(blinkProgress * Math.PI);
        if (blinkClose > 0 && (EYE_UPPER_LEFT.includes(idx) || EYE_UPPER_RIGHT.includes(idx))) {
            ty += blinkClose * 8;
        }

        positions[i] = tx;
        positions[i+1] = ty;
    }

    mesh.geometry.getBuffer('aVertexPosition').update();

    // Update Mouth Interior Overlay
    if (clampedVol > 0.1 && lastLandmarks) {
        const scale = displayScale;
        const upperY = app.screen.height / 2 + (lastLandmarks[13].y - 0.5) * textureHeight * scale;
        const lowerY = app.screen.height / 2 + (lastLandmarks[14].y - 0.5) * textureHeight * scale;
        const worldX = app.screen.width / 2 + (lastLandmarks[13].x - 0.5) * textureWidth * scale;

        const h = Math.max(0, lowerY - upperY);
        const w = (lastLandmarks[308].x - lastLandmarks[78].x) * textureWidth * scale * 0.8;

        if (h > 1) {
            showMouthInterior.value = true;
            Object.assign(mouthInteriorStyle, {
                left: `${worldX - w/2}px`,
                top: `${upperY}px`,
                width: `${w}px`,
                height: `${h}px`,
                opacity: `${Math.min(1, (h - 1) / 10)}`,
            });
        } else {
            showMouthInterior.value = false;
        }
    } else {
        showMouthInterior.value = false;
    }
};

onMounted(() => init());
onBeforeUnmount(() => {
    if (app) app.destroy(true, { children: true, texture: true });
});

watch(() => props.modelUrl, () => init());
</script>
