<template>
    <div ref="container" class="w-full h-full relative group bg-transparent rounded-xl overflow-hidden" 
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

        <canvas ref="canvas" class="w-full h-full object-contain bg-transparent"></canvas>

        <!-- Mouth Interior Overlay (Upgraded for Neural Photorealism v2) -->
        <div v-if="showMouthInterior" class="absolute pointer-events-none overflow-hidden z-10 scale-y-110" :style="mouthInteriorStyle">
            <div class="w-full h-full relative" 
                 style="background: radial-gradient(circle at center 20%, #4a1515 0%, #120505 100%);box-shadow: inset 0 8px 12px rgba(0,0,0,0.8);">
                <!-- Individual Upper Teeth (Procedural CSS) -->
                <div class="absolute top-[2%] left-1/2 -translate-x-1/2 w-[90%] h-[32%] flex justify-around items-start px-[2%]"
                     :style="{ opacity: 0.4 + (speakingVol || 0) * 0.6 }">
                     <div v-for="i in 8" :key="i" 
                          class="w-[11%] h-full bg-gradient-to-b from-[#fffd] via-[#eee9] to-[#aaa4] rounded-b-[4px] blur-[0.4px] shadow-[0_1px_3px_rgba(0,0,0,0.4)]"></div>
                </div>
                <!-- Tongue & Depth (Enhanced Depth) -->
                <div class="absolute bottom-[5%] left-1/2 -translate-x-1/2 w-[65%] h-[45%] bg-gradient-to-t from-[#803030]/50 via-[#401515]/30 to-transparent blur-[4px] rounded-t-full"></div>
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
import { ChromakeyFilter } from '@/utils/webgl/PIXIFilters';
import { analyzeVisemeShape, computeLipDeform } from '@/utils/ai/LipSyncProcessor';

const props = defineProps<{
    modelUrl: string;
    backgroundUrl?: string;
    speakingVol?: number;
    pitchFactor?: number;
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
    isPortrait?: boolean;
    influencer?: any;
    uuid?: string;
}>();

const emit = defineEmits(['ready', 'stream-ready', 'update:config']);

let isDestroyed = false;

// Reactive Refs
const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const videoElement = ref<HTMLVideoElement | null>(null);
const videoElementB = ref<HTMLVideoElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const showMouthInterior = ref(false);
const mouthInteriorStyle = reactive({
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    transform: '',
    opacity: '0',
});

// Constants
const MOUTH_CORE = [13, 312, 311, 310, 415, 308, 14, 317, 402, 318, 324, 78, 191, 80, 81, 82, 87, 178, 88, 95];
const MOUTH_SOFT = [0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61, 185, 40, 39, 37];
const MOUTH_SHORE = [204, 202, 194, 201, 208, 171, 10, 164, 322, 410, 418, 431, 411, 424];
const LOWER_LIP = [146, 91, 181, 84, 17, 314, 405, 321, 375, 324, 318, 402, 317, 14, 87, 178, 88, 95];
const UPPER_LIP = [185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const CHEEK_LEFT = [212, 214, 216, 206, 203, 118, 119];
const CHEEK_RIGHT = [432, 434, 436, 426, 423, 347, 348];
const JAW_LINE = [150, 149, 176, 148, 152, 377, 400, 378, 379];
const BROW_LEFT = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
const BROW_RIGHT = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
const EYE_UPPER_LEFT = [386, 374, 373, 390, 388, 387];
const EYE_UPPER_RIGHT = [159, 145, 144, 163, 161, 160];
const MOUTH_CORNERS = [61, 291];

const MOUTH_CORE_SET = new Set(MOUTH_CORE);
const MOUTH_SOFT_SET = new Set(MOUTH_SOFT);
const MOUTH_SHORE_SET = new Set(MOUTH_SHORE);
const LOWER_LIP_SET = new Set(LOWER_LIP);
const UPPER_LIP_SET = new Set(UPPER_LIP);
const CHEEK_LEFT_SET = new Set(CHEEK_LEFT);
const CHEEK_RIGHT_SET = new Set(CHEEK_RIGHT);
const JAW_LINE_SET = new Set(JAW_LINE);
const BROW_LEFT_SET = new Set(BROW_LEFT);
const BROW_RIGHT_SET = new Set(BROW_RIGHT);
const EYE_UPPER_LEFT_SET = new Set(EYE_UPPER_LEFT);
const EYE_UPPER_RIGHT_SET = new Set(EYE_UPPER_RIGHT);
const MOUTH_CORNERS_SET = new Set(MOUTH_CORNERS);

const VOLUME_SMOOTHING = 0.9;

// Instance-local state
const state = reactive({
    app: null as PIXI.Application | null,
    texture: null as PIXI.Texture | null,
    textureB: null as PIXI.Texture | null,
    bgSprite: null as PIXI.Sprite | null,
    mesh: null as PIXI.Mesh | null,
    meshB: null as PIXI.Mesh | null,
    filterA: new ChromakeyFilter([0,1,0], 0.08, 0.2),
    filterB: new ChromakeyFilter([0,1,0], 0.08, 0.2),
    auraSprite: null as PIXI.Sprite | null,
    atmosphere: null as AtmosphereManager | null,
    mouthPatchTexture: null as PIXI.Texture | null,
    visemeTextures: {} as Record<string, PIXI.Texture>,
    mouthPatchSprite: null as PIXI.Sprite | null,
    originalVertices: null as Float32Array | null,
    lastLandmarks: null as any[] | null,
    textureWidth: 0,
    textureHeight: 0,
    displayScale: 1.0,
    isCrossFading: false,
    crossFadeAlpha: 0,
    blinkProgress: 0,
    isBlinking: false,
    nextBlinkAt: Date.now() + 3000 + Math.random() * 4000,
    smoothedVolume: 0,
    gestureX: 0,
    gestureY: 0,
    lastUpdateAt: 0,
    lastDispatchTime: 0,
    mouthStabilizationStart: 0,
    mouthStabilizationEnd: 0
});

const preloadVideoB = async () => {
    const videoB = videoElementB.value;
    if (!videoB || !props.modelUrl || !state.app || !state.lastLandmarks) return;
    
    videoB.src = getFileUrl(props.modelUrl);
    await new Promise<void>(res => { videoB.onloadeddata = () => res(); videoB.load(); });
    const randomFraction = 0.25 + Math.random() * 0.5;
    videoB.currentTime = videoB.duration * randomFraction;
    videoB.play();
    
    state.textureB = PIXI.Texture.from(videoB);
    const geometry = new PIXI.Geometry();
    if (state.originalVertices && state.mesh) {
        const geomA: any = state.mesh.geometry;
        geometry.addAttribute('aVertexPosition', new Float32Array(state.originalVertices), 2);
        const uvsA = geomA.getBuffer('aTextureCoord').data;
        geometry.addAttribute('aTextureCoord', new Float32Array(uvsA), 2);
        const indicesA = geomA.indexBuffer.data;
        geometry.addIndex(Array.from(indicesA));
        
        state.meshB = new PIXI.Mesh(geometry, new PIXI.MeshMaterial(state.textureB as any));
        state.meshB.filters = [state.filterB as any];
        state.meshB.x = state.mesh.x;
        state.meshB.y = state.mesh.y;
        state.meshB.scale.copyFrom(state.mesh.scale);
        state.meshB.alpha = 0;
        state.app.stage.addChild(state.meshB as any); // Add to top for cross-fade overlay
    }
};

const setupMesh = (landmarks: any[]) => {
    if (!state.app || !state.texture) return;
    const points: number[] = [];
    const uvs: number[] = [];
    const addPoint = (x: number, y: number) => {
        const localX = (x - 0.5) * state.textureWidth;
        const localY = (y - 0.5) * state.textureHeight;
        points.push(localX, localY);
        uvs.push(x, y);
    };
    landmarks.forEach(lm => addPoint(lm.x, lm.y));

    // 2. Add Stabilization Points (Indices 468+)
    state.mouthStabilizationStart = points.length / 2;
    landmarks.forEach((lm, idx) => {
        if (MOUTH_CORE_SET.has(idx) || MOUTH_SOFT_SET.has(idx)) {
            const dx = lm.x - 0.5;
            const dy = lm.y - 0.7; 
            addPoint(lm.x + dx * 0.1, lm.y + dy * 0.05); 
        }
    });
    state.mouthStabilizationEnd = points.length / 2;

    addPoint(0, 0); addPoint(1, 0); addPoint(1, 1); addPoint(0, 1);
    const delaunay = new Delaunator(uvs);
    const indices = new Uint32Array(delaunay.triangles);
    state.originalVertices = new Float32Array(points);
    const geometry = new PIXI.Geometry();
    geometry.addAttribute('aVertexPosition', new Float32Array(points), 2);
    geometry.addAttribute('aTextureCoord', new Float32Array(uvs), 2);
    geometry.addIndex(Array.from(indices));
    state.mesh = new PIXI.Mesh(geometry, new PIXI.Shader(
        PIXI.Program.from(`
            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            uniform mat3 projectionMatrix;
            uniform mat3 translationMatrix;
            varying vec2 vTextureCoord;
            void main(void) {
                gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
            }
        `, `
            varying vec2 vTextureCoord;
            uniform sampler2D uSampler;

            void main(void) {
                gl_FragColor = texture2D(uSampler, vTextureCoord);
            }
        `),
        { uSampler: state.texture }
    ) as any);
    state.mesh.filters = [state.filterA as any];
    state.mesh.y = state.app.screen.height / 2;

    // 4. Create Mouth Patch Sprite (As independent sprite on stage)
    if (state.mouthPatchTexture) {
        state.mouthPatchSprite = new PIXI.Sprite(state.mouthPatchTexture as any);
        state.mouthPatchSprite.anchor.set(0.5);
        state.mouthPatchSprite.zIndex = 3; // Above mesh
        state.app.stage.addChild(state.mouthPatchSprite as any);
    }

    // Remove old meshes/auras surgically instead of clearing the whole stage (which would kill background)
    if (state.meshB) { state.app.stage.removeChild(state.meshB as any); state.meshB.destroy(); state.meshB = null; }
    if (state.auraSprite) { state.app.stage.removeChild(state.auraSprite as any); state.auraSprite.destroy(); state.auraSprite = null; }
    
    // Note: old state.mesh is replaced by new assignment above, but we should remove the old instance from stage if it exists
    const children = state.app.stage.children;
    for (let i = children.length - 1; i >= 0; i--) {
        const child = children[i];
        if (child instanceof PIXI.Mesh || child === state.auraSprite) {
            state.app.stage.removeChild(child as any);
        }
    }

    state.auraSprite = createAuraSprite();
    state.auraSprite.zIndex = 1; // At bottom
    state.app.stage.addChild(state.auraSprite as any);
    state.mesh.zIndex = 2; // Behind mouth patch (3)
    state.app.stage.addChild(state.mesh as any);
};

const createAuraSprite = () => {
    const cvs = document.createElement('canvas');
    cvs.width = 256; cvs.height = 256;
    const ctx = cvs.getContext('2d');
    if (ctx) {
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(64, 158, 255, 0.6)');
        grad.addColorStop(0.5, 'rgba(64, 158, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad; ctx.fillRect(0, 0, 256, 256);
    }
    const sprite = new PIXI.Sprite(PIXI.Texture.from(cvs));
    sprite.anchor.set(0.5); 
    sprite.blendMode = PIXI.BLEND_MODES.ADD; 
    sprite.alpha = 0;
    return sprite;
};

const update = () => {
    if (!state.app || !state.mesh || isDestroyed) return;
    const now = performance.now();
    if (now - state.lastUpdateAt < 33) return; // 30fps throttle
    state.lastUpdateAt = now;
    const vol = props.speakingVol || 0;
    
    if (state.atmosphere) {
        state.atmosphere.setEffect(props.particleType as ParticleType, props.particleDensity || 20);
        state.atmosphere.update(1.0, 1.0 + (vol * 1.5));
    }
    
    const videoA = videoElement.value;
    if (videoA && !videoA.paused && state.texture) {
        if (state.texture.baseTexture.width !== videoA.videoWidth) {
            state.texture.baseTexture.setSize(videoA.videoWidth, videoA.videoHeight);
            state.textureWidth = videoA.videoWidth; 
            state.textureHeight = videoA.videoHeight;
        }
    }
    
    if (state.isCrossFading && videoElementB.value && !videoElementB.value.paused && state.textureB) {
        if (state.textureB.baseTexture.width !== videoElementB.value.videoWidth) {
            state.textureB.baseTexture.setSize(videoElementB.value.videoWidth, videoElementB.value.videoHeight);
        }
    }
    
    if (videoA && videoA.duration > 0 && state.meshB && state.textureB) {
        const remaining = videoA.duration - videoA.currentTime;
        if (remaining < 2.0 && !state.isCrossFading) state.isCrossFading = true;
        if (state.isCrossFading) {
            state.crossFadeAlpha = Math.min(1, state.crossFadeAlpha + 0.05);
            state.mesh.alpha = 1.0; 
            state.meshB.alpha = state.crossFadeAlpha;

            const posA = (state.mesh.geometry as any).getBuffer('aVertexPosition').data;
            const posB = (state.meshB.geometry as any).getBuffer('aVertexPosition').data;
            if (posA && posB && posA.length === posB.length) {
                posB.set(posA);
                state.meshB.geometry.getBuffer('aVertexPosition').update();
            }

            if (state.crossFadeAlpha >= 1) {
                state.mesh.alpha = 1; 
                state.meshB.alpha = 0; 
                state.crossFadeAlpha = 0; 
                state.isCrossFading = false;
                const randomFraction = 0.1 + Math.random() * 0.5;
                videoA.currentTime = videoA.duration * randomFraction;
                setTimeout(() => preloadVideoB(), 500);
            }
        }
    }
    
    state.smoothedVolume = state.smoothedVolume * VOLUME_SMOOTHING + vol * (1 - VOLUME_SMOOTHING);
    const clampedVol = Math.min(state.smoothedVolume, 0.5);
    const dx = props.cameraTransform ? (props.cameraTransform.x * state.app.screen.width) : 0;
    const dy = props.cameraTransform ? (props.cameraTransform.y * state.app.screen.height) : 0;
    const dz = props.cameraTransform ? props.cameraTransform.zoom : 1.0;
    const dr = props.cameraTransform ? props.cameraTransform.rotation : 0;

    let targetGX = 0, targetGY = 0;
    if (props.gesture === 'look_around' && clampedVol < 0.05) {
        const time = Date.now() * 0.001; targetGX = Math.sin(time * 0.8) * 35; targetGY = Math.cos(time * 0.6) * 15;
    } else if (props.gesture === 'nod_emphasis') {
        const time = Date.now() * 0.015; targetGY = Math.max(0, Math.sin(time)) * 25;
    }
    state.gestureX = state.gestureX * 0.9 + targetGX * 0.1;
    state.gestureY = state.gestureY * 0.9 + targetGY * 0.1;
    
    state.mesh.scale.set(state.displayScale * dz);
    state.mesh.x = state.app.screen.width / 2 + dx + (state.gestureX * 0.5);
    state.mesh.y = state.app.screen.height / 2 + dy + (state.gestureY * 0.5);
    state.mesh.rotation = dr;
    
    if (state.meshB) {
        state.meshB.scale.copyFrom(state.mesh.scale); 
        state.meshB.x = state.mesh.x; state.meshB.y = state.mesh.y; state.meshB.rotation = state.mesh.rotation;
    }

    const positions = (state.mesh.geometry as any).getBuffer('aVertexPosition').data;
    if (clampedVol > 0.01) {
        const moveY = Math.sqrt(clampedVol) * 32;
        if (now >= state.nextBlinkAt && !state.isBlinking) state.isBlinking = true;
        if (state.isBlinking) {
            state.blinkProgress = Math.min(1, state.blinkProgress + 0.12);
            if (state.blinkProgress >= 1) { state.isBlinking = false; state.blinkProgress = 0; state.nextBlinkAt = now + 3000 + Math.random() * 4000; }
        }
        const blinkClose = Math.sin(state.blinkProgress * Math.PI);
        for (let i = 0; i < positions.length; i += 2) {
            const idx = i / 2;
            const ox = state.originalVertices![i], oy = state.originalVertices![i+1];
            const distX = (ox / (state.textureWidth * state.displayScale));
            const distY = (oy / (state.textureHeight * state.displayScale));
            let tx = ox + state.gestureX * Math.abs(distX) * 0.5;
            let ty = oy + state.gestureY * Math.abs(distY) * 0.3;

            // Only warp mouth if we DON'T have a visual mouth patch (Legacy disabled)
            if (false) {
                if (MOUTH_CORE_SET.has(idx)) { 
                    if (LOWER_LIP_SET.has(idx) || idx > 468) ty += moveY; 
                    else if (UPPER_LIP_SET.has(idx)) ty -= moveY * 0.35; 
                    const puckerFactor = Math.abs(ox) / (state.textureWidth * 0.1);
                    const squeezeX = moveY * 0.5 * Math.exp(-puckerFactor * puckerFactor);
                    if (ox < 0) tx += squeezeX; else tx -= squeezeX;
                }
                if (JAW_LINE_SET.has(idx)) {
                    ty += moveY * 0.6;
                    if (ox < 0) tx += moveY * 0.1; else tx -= moveY * 0.1;
                }
                if (CHEEK_LEFT_SET.has(idx) || CHEEK_RIGHT_SET.has(idx)) { ty += moveY * 0.25; tx += (CHEEK_LEFT_SET.has(idx) ? -1 : 1) * moveY * 0.15; }
            }

            const em = props.emotion;
            if (em === 'happy' || em === 'excited') { 
                if (BROW_LEFT_SET.has(idx) || BROW_RIGHT_SET.has(idx)) ty -= 4; 
                if (EYE_UPPER_LEFT_SET.has(idx) || EYE_UPPER_RIGHT_SET.has(idx)) ty -= 2; 
                if (false && MOUTH_CORNERS_SET.has(idx)) ty -= 5; 
            }
            if (blinkClose > 0 && (EYE_UPPER_LEFT_SET.has(idx) || EYE_UPPER_RIGHT_SET.has(idx))) ty += blinkClose * 8;
            positions[i] = tx; positions[i+1] = ty;
        }
    } else {
        for (let i = 0; i < positions.length; i += 2) {
            const ox = state.originalVertices![i], oy = state.originalVertices![i+1];
            const distY = (oy / (state.textureHeight * state.displayScale));
            positions[i] = ox + state.gestureX * Math.abs(ox / (state.textureWidth * state.displayScale)) * 0.5;
            positions[i+1] = oy + state.gestureY * Math.abs(distY) * 0.3;
        }
    }
    
    state.mesh.geometry.getBuffer('aVertexPosition').update();

    // === SHAPE-BASED REVERSE MESH LIP SYNC (V2 - Smooth Padding) ===
    {
        const animatedVol = Math.sqrt(clampedVol);
        const shape = analyzeVisemeShape(animatedVol);
        
        // Derive dimensions
        const mouthHeightLocal = state.lastLandmarks
            ? Math.abs(state.lastLandmarks[17].y - state.lastLandmarks[0].y) * state.textureHeight * state.displayScale
            : 20;
        const mouthWidthLocal = state.lastLandmarks
            ? Math.abs(state.lastLandmarks[MOUTH_CORNERS[1]].x - state.lastLandmarks[MOUTH_CORNERS[0]].x) * state.textureWidth * state.displayScale
            : 80;

        const deform = computeLipDeform(shape, mouthHeightLocal, mouthWidthLocal);
        
        // Find current vertical/horizontal center
        const mouthCenterY = (positions[13 * 2 + 1] + positions[14 * 2 + 1]) / 2;
        const mouthCenterX = (positions[MOUTH_CORNERS[0] * 2] + positions[MOUTH_CORNERS[1] * 2]) / 2;

        for (let i = 0; i < positions.length - 1; i += 2) {
            const idx = i / 2;
            let weight = 0;
            if (MOUTH_CORE_SET.has(idx)) weight = 1.0;
            else if (MOUTH_SOFT_SET.has(idx)) weight = 1.0;
            else if (MOUTH_SHORE_SET.has(idx)) weight = 0.3;
            else if (idx >= state.mouthStabilizationStart && idx < state.mouthStabilizationEnd) weight = 0.6; // stabilization points padding

            if (weight > 0) {
                // 1. Vertical Movement
                const isUpper = positions[i + 1] < mouthCenterY;
                if (isUpper) {
                    positions[i + 1] += deform.upperLipDown * weight;
                } else {
                    positions[i + 1] -= deform.lowerLipUp * weight;
                }

                // 2. Horizontal Movement
                const relX = (positions[i] - mouthCenterX) / (mouthWidthLocal / 2);
                const horizMove = (deform.cornerStretch + deform.cornerPucker) * relX * weight;
                positions[i] += horizMove;
            }
        }
        
        // Hide SVG patch sprite — using mesh deformation now
        if (state.mouthPatchSprite) {
            state.mouthPatchSprite.alpha = 0;
        }
    }

    if (state.auraSprite && props.auraEnabled) {
        state.auraSprite.alpha = state.auraSprite.alpha * 0.8 + 0.2;
        state.auraSprite.scale.set(state.mesh.scale.x * 2.1);
        state.auraSprite.x = state.mesh.x; state.auraSprite.y = state.mesh.y;
        state.auraSprite.tint = props.auraColor ? parseInt(props.auraColor.replace('#', ''), 16) : 0x409eff;
    } else if (state.auraSprite) { state.auraSprite.alpha *= 0.8; }

    showMouthInterior.value = false;
};

const updateBackground = async (url: string) => {
    if (!url) {
        if (state.bgSprite && state.app) {
             state.app.stage.removeChild(state.bgSprite as any);
             state.bgSprite.destroy({ children: true, texture: true });
             state.bgSprite = null;
        }
        return;
    }
    if (!state.app) return;

    try {
        const bgUrl = getFileUrl(url);
        console.log('[VideoViewer] Loading background from:', bgUrl);
        
        // Use Texture.from for better compatibility with proxy URLs
        // Assets.load has issues parsing proxy URLs
        const bgTex = await PIXI.Texture.fromURL(bgUrl, { resourceOptions: { autoLoad: true } });
        if (!bgTex) {
            console.warn('[VideoViewer] Failed to load background texture');
            return;
        }

        if (!state.bgSprite) {
            state.bgSprite = new PIXI.Sprite(bgTex);
            state.bgSprite.anchor.set(0.5);
            state.app.stage.addChildAt(state.bgSprite as any, 0); // Always at bottom
        } else {
            state.bgSprite.texture = bgTex;
        }

        // Cover logic
        const targetW = state.app.screen.width || 400;
        const targetH = state.app.screen.height || 400;
        
        const scaleX = targetW / bgTex.width;
        const scaleY = targetH / bgTex.height;
        const bgScale = Math.max(scaleX, scaleY);
        
        if (bgScale > 0) {
            state.bgSprite.scale.set(bgScale);
            state.bgSprite.visible = true;
        }
        
        state.bgSprite.x = targetW / 2;
        state.bgSprite.y = targetH / 2;
        
        console.log('[VideoViewer] Background updated successfully');
    } catch (e) {
        console.error('[VideoViewer] Failed to update background:', e);
    }
};

const loadVisemes = async () => {
    // Determine the base path for visemes. If a custom spritesheet path was provided, use its directory.
    const visemeSpritesheet = props.influencer?.visual?.visemeSpritesheet;
    const spritesheetPath = visemeSpritesheet || '/ai/mouth-patches/visemes_spritesheet.svg';
    console.log(`[VideoViewer] Loading Visemes based on: ${spritesheetPath}`);
    
    try {
        const map = ['A', 'O', 'U', 'I', 'S'];
        let basePath = '/ai/mouth-patches/visemes';
        
        if (visemeSpritesheet && visemeSpritesheet.includes('/')) {
             const parts = visemeSpritesheet.split('/');
             const lastPart = parts.pop() || '';
             if (lastPart.includes('.')) {
                 basePath = parts.join('/') + '/visemes';
             } else {
                 basePath = visemeSpritesheet;
             }
        }

        const fetchViseme = async (v: string) => {
            const url = getFileUrl(`${basePath}/${v}.svg`);
            try {
                const response = await fetch(url);
                if (response.ok) {
                    let svgText = await response.text();
                    if (!svgText.includes('width=')) {
                        svgText = svgText.replace('<svg', '<svg width="250" height="250"');
                    }
                    const blob = new Blob([svgText], { type: 'image/svg+xml' });
                    const blobUrl = URL.createObjectURL(blob);
                    state.visemeTextures[v] = await PIXI.Texture.fromURL(blobUrl);
                    console.log(`[VideoViewer] Loaded Viseme: ${v}.svg`);
                }
            } catch (err) {
                console.error(`[VideoViewer] Failed to load ${v}.svg from ${url}`, err);
            }
        };
        
        await Promise.all(map.map(v => fetchViseme(v)));
        
        if (state.visemeTextures['S']) {
            state.mouthPatchTexture = state.visemeTextures['S'];
            if (state.mouthPatchSprite) state.mouthPatchSprite.texture = state.mouthPatchTexture;
        }
    } catch (err) {
        console.error(`[VideoViewer] Viseme loading error:`, err);
    }
};

const init = async () => {
    if (!container.value || !canvas.value || !videoElement.value || !props.modelUrl) return;
    loading.value = true; error.value = null;
    try {
        const video = videoElement.value; video.src = getFileUrl(props.modelUrl);
        await new Promise((res, rej) => { video.onloadeddata = res; video.onerror = rej; video.load(); });
        // Use container dimensions for dynamic resolution
        const width = container.value.clientWidth || 400;
        const height = container.value.clientHeight || 700;

        if (!state.app) {
            state.app = new PIXI.Application({ 
                view: canvas.value as any, 
                width: width, 
                height: height, 
                backgroundAlpha: 0, 
                antialias: true,
                preserveDrawingBuffer: true
            }) as any;
            state.app.stage.sortableChildren = true;
            state.atmosphere = new AtmosphereManager(state.app as any);
            state.app.ticker.maxFPS = 30; 
            state.app.ticker.add(() => update());
        }
        state.app.renderer.resize(width, height);
        state.texture = PIXI.Texture.from(video);

        await loadVisemes();

        state.textureWidth = video.videoWidth; 
        state.textureHeight = video.videoHeight;
        state.displayScale = (state.textureHeight > 0) ? state.app.screen.height / state.textureHeight : 1.0;
        
        // Auto-detect uniform background (any solid color: green, blue, dark green, etc.)
        let bgMetadata = { isChromaKey: false, color: [0, 1, 0], similarity: 0.08, smoothness: 0.2 };
        try {
            video.currentTime = Math.min(0.5, (video.duration || 1) * 0.05);
            video.play();
            await new Promise(r => { video.onseeked = r; setTimeout(r, 1000); });
            bgMetadata = ChromakeyFilter.analyzeBackground(video);
            if (bgMetadata.isChromaKey) {
                state.filterA.keyColor = bgMetadata.color;
                state.filterB.keyColor = bgMetadata.color;
                state.filterA.similarity = bgMetadata.similarity;
                state.filterB.similarity = bgMetadata.similarity;
                state.filterA.smoothness = bgMetadata.smoothness;
                state.filterB.smoothness = bgMetadata.smoothness;
            }

            console.log("Analyze Background Result:", bgMetadata);
        } catch(e) {
            // leave default filter settings
            console.error("Failed to analyze background", e);
        }

        const detection = await faceLandmarkService.detect(video as any);

        if (detection && detection.faceLandmarks.length > 0) {
            state.lastLandmarks = detection.faceLandmarks[0]; 
			setupMesh(state.lastLandmarks);
        }
        if (props.backgroundUrl) {
            await updateBackground(props.backgroundUrl);
        }
        loading.value = false; emit('ready'); emit('stream-ready', canvas.value.captureStream(30)); preloadVideoB();
    } catch (err: any) { error.value = err.message || "Link Failed"; loading.value = false; }
};

onMounted(() => init());
onBeforeUnmount(() => { 
    isDestroyed = true; 
    
    // Destroy loose texture references bound to Video elements
    if (state.texture) { state.texture.destroy(true); state.texture = null; }
    if (state.textureB) { state.textureB.destroy(true); state.textureB = null; }
    
    // Destroy floating sprites and meshes
    if (state.bgSprite) { state.bgSprite.destroy({ children: true, texture: true }); state.bgSprite = null; }
    if (state.auraSprite) { state.auraSprite.destroy({ children: true, texture: true }); state.auraSprite = null; }
    if (state.mesh) { state.mesh.destroy(); state.mesh = null; }
    if (state.meshB) { state.meshB.destroy(); state.meshB = null; }
    
    // Destroy main application and its registered children
    if (state.app) { 
        state.app.destroy(true, { children: true, texture: true }); 
        state.app = null; 
    } 

    if (videoElement.value) {
        videoElement.value.pause();
        videoElement.value.removeAttribute('src');
        videoElement.value.load();
    }
    if (videoElementB.value) {
        videoElementB.value.pause();
        videoElementB.value.removeAttribute('src');
        videoElementB.value.load();
    }
});
watch(() => props.modelUrl, () => init());
watch(() => props.influencer?.visual?.visemeSpritesheet, () => loadVisemes());
watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl) updateBackground(newUrl);
    else if (state.bgSprite) {
        state.bgSprite.visible = false;
    }
}, { immediate: true });

// ─── Capture Methods ──────────────────────────────────────────────────────────

const captureSnapshot = async (): Promise<string | null> => {
    if (!canvas.value) return null;
    return canvas.value.toDataURL('image/png', 0.9);
};

const captureVideo = async (durationMs: number, audioTrack?: MediaStreamTrack): Promise<Blob | null> => {
    if (!canvas.value || !state.app) return null;
    
    return new Promise((resolve) => {
        try {
            const stream = canvas.value.captureStream(30);
            if (audioTrack) stream.addTrack(audioTrack);
            
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
            const chunks: Blob[] = [];
            
            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            // Temporary ticker to force render during capture
            const captureTicker = () => {
                if (state.app && state.app.renderer) {
                    state.app.renderer.render(state.app.stage as any);
                }
            };
            state.app.ticker.add(captureTicker);

            mediaRecorder.onstop = () => {
                if (state.app) state.app.ticker.remove(captureTicker);
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
            console.error('[VideoViewer] Failed to capture video:', e);
            resolve(null);
        }
    });
};

defineExpose({
    captureSnapshot,
    captureVideo
});

</script>
