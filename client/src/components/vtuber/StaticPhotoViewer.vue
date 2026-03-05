<template>
    <div ref="container" class="w-full h-full relative group bg-[#050505] rounded-xl overflow-hidden" 
         style="border: 1px solid rgba(255, 255, 255, 0.1);">
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50">
            <div class="flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{{ $t('vtubers.neuralLinkEstablishing') }}</span>
            </div>
        </div>

        <canvas ref="canvas" class="w-full h-full"></canvas>

        <!-- Mouth Interior Overlay (Simulating teeth/depth for static photo) -->
        <div v-if="showMouthInterior" class="absolute pointer-events-none overflow-hidden z-10" :style="mouthInteriorStyle">
            <div class="w-full h-full bg-[#1a0505] relative">
                <!-- Faint Teeth Highlight -->
                <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[70%] h-[25%] bg-white/10 blur-[2px] rounded-b-full"></div>
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
import { ref, reactive, onMounted, onBeforeUnmount, watch, onActivated, onDeactivated } from 'vue';
import * as PIXI from 'pixi.js';
import { faceLandmarkService } from '@/utils/ai/FaceLandmarkService';
// @ts-ignore
import Delaunator from 'delaunator';
import { getFileUrl } from '@/utils/api';
import { isSingingAtTime } from '@/utils/lyricUtils';

const props = defineProps<{
    modelUrl: string;
    backgroundUrl?: string;
    speakingVol?: number;
    pitchFactor?: number;
    emphasis?: number;
    intensity?: {
        gestureIntensity: number;
        headTiltRange: number;
        nodIntensity: number;
    };
    config?: {
        zoom?: number;
        offset?: { x: number; y: number };
        rotation?: number;
        scale?: number;
        position?: { x: number; y: number };
    };
    isHostSpeaking?: boolean;
    emotion?: string;
    cinematicMode?: boolean;
    lyrics?: any[];
    currentTime?: number;
    lyricsStyle?: 'neon' | 'minimal' | 'kinetic';
    lyricsPosition?: 'top' | 'bottom';
    lyricsEnabled?: boolean;
}>();

const emit = defineEmits<{
    'stream-ready': [stream: MediaStream];
    'update:config': [config: any];
    'ready': [];
}>();

import StageLyricsOverlay from './StageLyricsOverlay.vue';

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

// State
let app: PIXI.Application | null = null;
let mesh: any = null; // Using any to bypass PIXI v8 type incompatibilities
let originalVertices: Float32Array | null = null;
let texture: PIXI.Texture | null = null;
let bgSprite: PIXI.Sprite | null = null;

// Landmarks Indices (MediaPipe 468/478 Model)
// Lips - Categorized for smooth deformation (weighted move)
const MOUTH_CORE = [13, 312, 311, 310, 415, 308, 14, 317, 402, 318, 324, 78, 191, 80, 81, 82, 87, 178, 88, 95]; // Inner lips (100% move)
const MOUTH_SOFT = [0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61, 185, 40, 39, 37]; // Outer lips (50% move)
const MOUTH_SHORE = [204, 202, 194, 201, 208, 171, 10, 164, 322, 410, 418, 431, 411, 424]; // Surrounding skin (20% move)

const UPPER_LIP = [185, 40, 39, 37, 0, 267, 269, 270, 409, 78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308];
const LOWER_LIP = [146, 91, 181, 84, 17, 314, 405, 321, 375, 324, 318, 402, 317, 14, 87, 178, 88, 95];
// Eyes (Detailed for full blink)
const LEFT_EYE_TOP = [161, 160, 159, 158, 157, 173];
const LEFT_EYE_BOTTOM = [154, 153, 145, 144, 163, 7];
const RIGHT_EYE_TOP = [388, 387, 386, 385, 384, 398];
const RIGHT_EYE_BOTTOM = [381, 380, 374, 373, 390, 249];
// Eyebrows
const LEFT_EYEBROW = [70, 63, 105, 66, 107];
const RIGHT_EYEBROW = [336, 296, 334, 293, 300];
// Mouth Corners
const L_CORNER = 61;
const R_CORNER = 291;

// Animation State
let blinkProgress = 0;
let isBlinking = false;
let nextBlinkTime = Date.now() + 4000;
let breathOffset = 0;

// Smooth lip sync state
let smoothedVolume = 0;
const VOLUME_SMOOTHING = 0.92; // High viscosity for silky-smooth movement

// Face metrics for adaptive animations
let faceScale = 1.0;
let eyeHeight = 10; // Default
let mouthHeight = 20; // Default

// Texture and offset info for full-body animation
let textureWidth = 0;
let textureHeight = 0;
let displayScale = 1.0;

// Module-level state for procedural animation damping
let headTilt = 0;
let bodyLean = 0;
let shoulderShrug = 0;

// Emotion Blending
const currentEmotions = reactive({
    happy: 0,
    surprised: 0,
    thinking: 0,
    sad: 0
});

// Mouth Interior State (Streamer-Sales Inspired Reality Trick)
const showMouthInterior = ref(false);
const mouthInteriorStyle = reactive({
    left: '0px',
    top: '0px',
    width: '0px',
    height: '0px',
    transform: '',
    opacity: '0',
    borderRadius: '40% 40% 50% 50%'
});

// Camera State (Cinematic)
let camZoom = 1.0;
let camX = 0;
let camY = 0;
let shakeIntensity = 0;

// Interaction State
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };
let dragData: any = null;

// Persistent User Transformation (Decoupled from cinematic offsets)
let userX = 0;
let userY = 0;
let userZoom = 1.0;

// Reliability cache
let lastLandmarks: any[] | null = null;
let lastDimensions = { w: 0, h: 0 };
let lastTexture: PIXI.Texture | null = null;
let lastBaseScale = 1.0;

// NEW: Concurrency guard to prevent double-init
let initCounter = 0;

// Initialize


const handleWheel = (e: WheelEvent) => {
    if (!mesh) return;
    e.preventDefault();

    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const factor = 1 + delta * zoomSpeed;
    
    const newScale = userZoom * factor;
    // Limit scale range
    if (newScale > 0.05 && newScale < 5) {
        userZoom = newScale;
        emitConfigUpdate();
    }
};

const emitConfigUpdate = () => {
    // Calculate Relative Offset from Screen Center (userX/userY are relative to center)
    const relOffsetX = userX / app.screen.width;
    const relOffsetY = userY / app.screen.height;

    const config = {
        zoom: userZoom, 
        offset: { x: relOffsetX, y: relOffsetY },
        rotation: 0,
        scale: userZoom, // Absolute scale
        position: { x: userX, y: userY }
    };
    
    emit('update:config', config);
};


// Simple quad mesh for full image (no face landmark deformation)
const setupSimpleQuadMesh = (tex: PIXI.Texture, scale: number) => {
    if (!app) return;

    // Store for re-use
    lastTexture = tex;
    lastBaseScale = scale;

    // Create a simple quad: 4 vertices, 2 triangles
    const halfW = tex.width / 2;
    const halfH = tex.height / 2;

    // Apply scale to vertices
    const w = halfW * scale;
    const h = halfH * scale;

    // Vertices (centered at 0,0)
    const vertices = new Float32Array([
        -w, -h,  // Top-left
         w, -h,  // Top-right
         w,  h,  // Bottom-right
        -w,  h   // Bottom-left
    ]);

    // UVs (texture coordinates)
    const uvs = new Float32Array([
        0, 0,  // Top-left
        1, 0,  // Top-right
        1, 1,  // Bottom-right
        0, 1   // Bottom-left
    ]);

    // Indices (2 triangles)
    const indices = new Uint16Array([
        0, 1, 2,  // First triangle
        0, 2, 3   // Second triangle
    ]);

    // Create geometry
    const geometry = new PIXI.Geometry()
        .addAttribute('aVertexPosition', vertices, 2)
        .addAttribute('aTextureCoord', uvs, 2)
        .addIndex(Array.from(indices));

    const material = new PIXI.MeshMaterial(tex);
    
    // Remove old mesh if exists
    if (mesh) {
        if (mesh.parent) mesh.parent.removeChild(mesh);
        mesh.destroy({ children: true, texture: false, baseTexture: false });
    }
    
    mesh = new PIXI.Mesh(geometry, material);

    // Position and apply user zoom
    const width = app.screen.width;
    const height = app.screen.height;

    // Apply User Config
    let userZoom = 1.0;
    let offsetX = 0;
    let offsetY = 0;

    if (props.config) {
        if (props.config.scale) {
             userZoom = props.config.scale; 
        } else if (props.config.zoom) {
            userZoom = props.config.zoom;
        }

        if (props.config.offset) {
            // Update global state AND local offset
            offsetX = props.config.offset.x * width;
            offsetY = props.config.offset.y * height;
            userX = offsetX;
            userY = offsetY;
        }
    }

    // Position mesh at center
    mesh.x = width / 2 + offsetX;
    mesh.y = height / 2 + offsetY;
    mesh.scale.set(userZoom);
    mesh.zIndex = 1;
    
    app.stage.addChild(mesh);
    
    console.log(`[StaticPhotoViewer] Simple Quad Mesh:
        Container: ${width}x${height}
        Texture: ${tex.width}x${tex.height}
        Vertex Scale: ${scale.toFixed(4)}
        User Zoom: ${userZoom.toFixed(4)}
        Pos: ${mesh.x.toFixed(1)}, ${mesh.y.toFixed(1)}
        Mesh Bounds: ${JSON.stringify(mesh.getBounds())}
    `);
    
    app.render();
};

// Helper to update mesh when config changes
const updateMesh = () => {
    if (lastTexture) {
        setupSimpleQuadMesh(lastTexture, lastBaseScale);
    }
};

const setupMesh = (landmarks: any[], tex: PIXI.Texture, scale: number) => {
    if (!app) return;

    // Store for re-use
    lastLandmarks = landmarks;
    lastTexture = tex;
    lastBaseScale = scale;

    // Store parameters for use in update() function
    textureWidth = tex.width;
    textureHeight = tex.height;
    displayScale = scale;

    // 1. Prepare Vertices
    const points: number[] = []; // [x, y, x, y...]
    const uvs: number[] = [];    // [u, v, u, v...]
    
    // Helper to add point - apply scale during vertex creation
    const addPoint = (x: number, y: number) => { // x,y are 0-1 normalized relative to image
        const localX = (x - 0.5) * tex.width * scale;
        const localY = (y - 0.5) * tex.height * scale;
        points.push(localX, localY);
        uvs.push(x, y);
    };

    // 1. Add Primary Face Landmarks (Indices 0-467)
    landmarks.forEach((lm) => {
        addPoint(lm.x, lm.y);
    });

    // 2. Add Stabilization Points (Indices 468+)
    // These add density around the mouth to prevent sharp stretching
    landmarks.forEach((lm, idx) => {
        if (MOUTH_CORE.includes(idx) || MOUTH_SOFT.includes(idx)) {
            const centerX = 0.5;
            const centerY = 0.7; // Mouth is usually lower
            const dx = lm.x - centerX;
            const dy = lm.y - centerY;
            addPoint(lm.x + dx * 0.1, lm.y + dy * 0.05); // Subtle buffer
        }
    });

    // 3. Add Image Corners/Edges
    addPoint(0, 0);
    addPoint(1, 0);
    addPoint(1, 1);
    addPoint(0, 1);
    
    // Add some grid points for background stability
    const grid = 5;
    for(let i=0; i<=grid; i++) {
        for(let j=0; j<=grid; j++) {
            // Check if far from face center (approx 0.5, 0.5)
            // If near face, skip to let face mesh handle it
            const dx = (i/grid) - 0.5;
            const dy = (j/grid) - 0.5;
            if (dx*dx + dy*dy > 0.15) { 
                 addPoint(i/grid, j/grid);
            }
        }
    }

    // 2. Triangulate
    const delaunay = new Delaunator(uvs);
    const indices = new Uint32Array(delaunay.triangles);

    console.log('[StaticPhotoViewer] Mesh data:', {
        vertices: points.length / 2,
        triangles: indices.length / 3,
        uvs: uvs.length / 2
    });

    // 3. Create Mesh - PIXI v7 compatible
    originalVertices = new Float32Array(points);
    
    // Validate UVs
    const validColors = new Float32Array(points.length).fill(1);
    
    const geometry = new PIXI.Geometry();
    geometry.addAttribute('aVertexPosition', new Float32Array(points), 2);
    geometry.addAttribute('aTextureCoord', new Float32Array(uvs), 2);
    geometry.addIndex(Array.from(indices)); 

    const material = new PIXI.MeshMaterial(tex);
    
    // Remove old mesh if exists
    if (mesh) {
        if (mesh.parent) mesh.parent.removeChild(mesh);
        mesh.destroy({ children: true, texture: false, baseTexture: false });
    }

    mesh = new PIXI.Mesh(geometry, material);
    
    // 5. Position and Apply User Zoom
    const width = app!.screen.width;
    const height = app!.screen.height;

    // 6. Apply User Config
    let userZoom = 1.0;
    let offsetX = 0;
    let offsetY = 0;

    if (props.config) {
        if (props.config.scale) {
             userZoom = props.config.scale; 
        } else if (props.config.zoom) {
            userZoom = props.config.zoom;
        }

        if (props.config.offset) {
            // Offset relative to container dimensions
            offsetX = props.config.offset.x * width;
            offsetY = props.config.offset.y * height;
        }
    }

    // 7. Position the Mesh
    // Vertices are already scaled to fit container (via scale parameter)
    // Apply user zoom on top of that
    
    mesh.x = width / 2 + offsetX;
    mesh.y = height / 2 + offsetY;
    mesh.scale.set(userZoom); // Apply user zoom on top of vertex scaling
    
    console.log(`[StaticPhotoViewer] Debug Positioning:
        Container: ${width}x${height}
        Mesh center at: (${mesh.x.toFixed(1)}, ${mesh.y.toFixed(1)})\n        Vertex scale: ${scale.toFixed(4)}
        User zoom: ${userZoom.toFixed(4)}
        Note: Vertices scaled during creation, user zoom applied via mesh.scale
    `);

    // Add aura before mesh
    if (!auraSprite) {
        auraSprite = createAuraSprite(app);
        app.stage.addChild(auraSprite);
    }
    
    // Add to stage
    mesh.zIndex = 1; 
    app.stage.addChild(mesh);
    
    console.log(`[StaticPhotoViewer] Mesh Transform:
        Container: ${width}x${height}
        Texture: ${tex.width}x${tex.height}
        Vertex Scale: ${scale.toFixed(4)}
        User Zoom: ${userZoom.toFixed(4)}
        Pos: ${mesh.x.toFixed(1)}, ${mesh.y.toFixed(1)}
        Mesh Bounds: ${JSON.stringify(mesh.getBounds())}
    `);
    
    // Force render
    app.render();
    
    emit('ready');
    
    // Calculate face metrics for adaptive animations
    calculateFaceMetrics(landmarks, tex, scale);
};

// Face metrics for adaptive animations
// let faceScale = 1.0;
// let eyeHeight = 10; // Default
// let mouthHeight = 20; // Default

const calculateFaceMetrics = (landmarks: any[], tex: PIXI.Texture, scale: number) => {
    // Landmarks are normalized 0-1, need to convert to actual pixel distances
    // Formula: distance_pixels = (landmark2 - landmark1) * texture_dimension * scale
    
    // Calculate eye height (vertical distance between top and bottom of left eye)
    const leftEyeTop = landmarks[159]; // Top of left eye
    const leftEyeBottom = landmarks[145]; // Bottom of left eye
    eyeHeight = Math.abs(leftEyeTop.y - leftEyeBottom.y) * tex.height * scale;
    
    // Calculate mouth height (distance between upper and lower lip center)
    const upperLipCenter = landmarks[0]; // Upper lip center
    const lowerLipCenter = landmarks[17]; // Lower lip center  
    const detectedMouthHeight = Math.abs(upperLipCenter.y - lowerLipCenter.y) * tex.height * scale;
    
    // Calculate overall face scale (distance between eyes)
    const leftEyeCenter = landmarks[33];
    const rightEyeCenter = landmarks[263];
    const eyeDistance = Math.sqrt(
        Math.pow((rightEyeCenter.x - leftEyeCenter.x) * tex.width * scale, 2) +
        Math.pow((rightEyeCenter.y - leftEyeCenter.y) * tex.height * scale, 2)
    );
    faceScale = eyeDistance / 100; // Normalize to ~1.0 for average face

    // ENSURE ROBUSTNESS: Use a minimum baseline if mouth/eyes are closed in the photo
    mouthHeight = Math.max(detectedMouthHeight, faceScale * 20); 
    eyeHeight = Math.max(eyeHeight, faceScale * 8);
    
    console.log('[StaticPhotoViewer] Face metrics:', {
        eyeHeight: eyeHeight.toFixed(1) + 'px',
        mouthHeight: mouthHeight.toFixed(1) + 'px',
        faceScale: faceScale.toFixed(2),
        textureSize: `${tex.width}x${tex.height}`,
        displayScale: scale.toFixed(2)
    });
};



let auraSprite: PIXI.Sprite | null = null;

const createAuraSprite = (app: PIXI.Application) => {
    // Create a simple glow texture if we don't have one
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        // Radial gradient
        const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        grad.addColorStop(0, 'rgba(64, 158, 255, 0.6)'); // Blueish center
        grad.addColorStop(0.5, 'rgba(64, 158, 255, 0.2)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 256, 256);
    }
    const tex = PIXI.Texture.from(canvas);
    const sprite = new PIXI.Sprite(tex);
    sprite.anchor.set(0.5);
    sprite.blendMode = PIXI.BLEND_MODES.ADD;
    sprite.alpha = 0; // Start hidden
    
    // Add behind the mesh (index 0 usually if bg is not there, or 1 if bg is there)
    // Actually we want it behind the mesh but in front of background
    // BG is at index 0
    return sprite;
};

const update = (delta: number) => {
    if (!mesh || !originalVertices) return;

    // Access positions buffer - PIXI v8 compatibility
    const geom: any = mesh.geometry;
    const positions = geom.positions || geom.getBuffer?.('aVertexPosition')?.data || new Float32Array(originalVertices.length);
    if (!positions || positions.length === 0) return;
    
    const rawVol = props.speakingVol || 0;
    const hasLyrics = props.lyrics && props.lyrics.length > 0;
    const isSinging = hasLyrics ? isSingingAtTime(props.lyrics, props.currentTime) : false;
    
    const targetVol = (hasLyrics ? (isSinging ? rawVol : 0) : rawVol) || 0;
    
    const pitch = props.pitchFactor || 0;
    const emp = props.emphasis || 0;
    const multipliers = props.intensity || { gestureIntensity: 1, headTiltRange: 1, nodIntensity: 1 };
    
    // Apply exponential moving average for smooth lip sync
    smoothedVolume = smoothedVolume * VOLUME_SMOOTHING + targetVol * (1 - VOLUME_SMOOTHING);
    
    // Procedural Animation Damping
    const slowTime = breathOffset * 0.5;
    const baseTilt = Math.sin(slowTime) * 12.0; 
    const baseLean = Math.cos(slowTime * 0.7) * 4.0; 

    headTilt = headTilt * 0.9 + baseTilt * 0.1 * multipliers.headTiltRange; 
    bodyLean = bodyLean * 0.85 + baseLean * 0.15 * multipliers.nodIntensity; 
    shoulderShrug = shoulderShrug * 0.8 + (emp * 1.5) * 0.2 * multipliers.gestureIntensity; 
    
    // Clamp values
    if (Math.abs(headTilt) > 10) headTilt = Math.sign(headTilt) * 10;
    
    // Clamp volume to prevent extreme deformation
    const clampedVol = Math.min(smoothedVolume, 0.55); // Slightly increased max for O-shape
    
    // Emotion Blending (Damped)
    const targetEmotion = props.emotion?.toLowerCase() || 'neutral';
    currentEmotions.happy = currentEmotions.happy * 0.9 + (targetEmotion === 'happy' ? 1.0 : 0) * 0.1;
    currentEmotions.surprised = currentEmotions.surprised * 0.9 + (targetEmotion === 'surprised' ? 1.0 : 0) * 0.1;
    currentEmotions.thinking = currentEmotions.thinking * 0.9 + (targetEmotion === 'thinking' ? 1.0 : 0) * 0.1;
    currentEmotions.sad = currentEmotions.sad * 0.9 + (targetEmotion === 'sad' ? 1.0 : 0) * 0.1;

    // Dynamic Camera Logic
    if (props.cinematicMode) {
        // Base Zoom reacts to emphasis
        const targetZoom = 1.0 + (emp * 0.15) + (currentEmotions.thinking * 0.1);
        camZoom = camZoom * 0.92 + targetZoom * 0.08;
        
        // Target framing (Face Centering with Emotional nudge)
        const targetCamX = (currentEmotions.thinking * 20) + (Math.sin(breathOffset * 0.5) * 5);
        const targetCamY = (emp * -10); // Slight dip on emphasis
        
        camX = camX * 0.9 + targetCamX * 0.1;
        camY = camY * 0.9 + targetCamY * 0.1;
        
        // Screen Shake
        if (emp > 0.8) shakeIntensity = Math.max(shakeIntensity, emp * 8);
        shakeIntensity *= 0.85; // Decay
        
        if (app && mesh) {
            const centerX = app.screen.width / 2;
            const centerY = app.screen.height / 2;

            const shakeX = (Math.random() - 0.5) * shakeIntensity;
            const shakeY = (Math.random() - 0.5) * shakeIntensity;
            
            // Combine User Transformation + Cinematic Offsets
            mesh.scale.set(userZoom * camZoom);
            mesh.x = centerX + userX + camX + shakeX;
            mesh.y = centerY + userY + camY + shakeY;
        }
    } else {
        // Reset camera if not in cinematic mode
        camZoom = camZoom * 0.9 + 1.0 * 0.1;
        camX *= 0.9;
        camY *= 0.9;
        if (app && mesh) {
            const centerX = app.screen.width / 2;
            const centerY = app.screen.height / 2;

            mesh.scale.set(userZoom * camZoom);
            mesh.x = centerX + userX + camX;
            mesh.y = centerY + userY + camY;
        }
    }

    // Update Blink State
    if (!isBlinking && Date.now() > nextBlinkTime) {
        isBlinking = true;
        blinkProgress = 0;
    }
    
    if (isBlinking) {
        blinkProgress += delta * 0.14; 
        if (blinkProgress >= Math.PI) {
            isBlinking = false;
            blinkProgress = 0;
            nextBlinkTime = Date.now() + 3000 + Math.random() * 4000; 
        }
    }
    
    const blinkRaw = isBlinking ? Math.sin(blinkProgress) : 0;
    const blinkVal = blinkRaw * blinkRaw * (3 - 2 * blinkRaw); 
    
    // Breathing / Idle Sway
    breathOffset += delta * 0.015; 
    const swayX = Math.sin(breathOffset) * 1.5; 
    const swayY = (Math.cos(breathOffset * 0.5) - 1) * 0.8; 
    
    const shoulderBreath = Math.sin(breathOffset * 1.2) * 1.0; 
    const unifiedMoveX = (swayX * 0.5) + (headTilt * 1.5) + (bodyLean * 1.0);
    const unifiedMoveY = (swayY * 0.4) + (bodyLean * 0.2);
    const upperBodyBreathing = shoulderBreath * 0.8 - shoulderShrug * 0.5;

    // WARPING LOOP
    for (let i = 0; i < positions.length; i += 2) {
        const ox = originalVertices[i];
        const oy = originalVertices[i + 1];
        const idx = i / 2;
        
        let tx = ox; 
        let ty = oy; 
        
        // 1. Improved Lip Sync (Vertical + Horizontal Compression)
        if (smoothedVolume > 0.005) {
            const animatedVolume = Math.sqrt(clampedVol); 
            const baseMovement = animatedVolume * mouthHeight * 0.9; // Increased range
            
            // Calculate Horizontal Squeeze (O-shape effect) via Vertex ID heuristics? 
            // Better: Use normalized X distance from mouth center (approx)
            // But we don't have mouth center easily calculated per frame here without looking up landmarks
            // Use vertex ID groups
            
            let vWeight = 0; // Vertical weight
            let hWeight = 0; // Horizontal weight (squeeze)
            
            if (MOUTH_CORE.includes(idx)) { vWeight = 1.0; hWeight = 0.4; }
            else if (MOUTH_SOFT.includes(idx)) { vWeight = 0.6; hWeight = 0.2; }
            else if (MOUTH_SHORE.includes(idx)) { vWeight = 0.25; hWeight = 0.1; }

            if (vWeight > 0) {
                const moveY = baseMovement * vWeight;
                
                // Vertical open
                if (LOWER_LIP.includes(idx) || idx > 468) { 
                    ty += moveY;
                } else if (UPPER_LIP.includes(idx)) {
                    ty -= moveY * 0.35; // Upper lip moves up more now (was 0.2)
                } else {
                    ty += moveY * 0.3; // Skin
                }
                
                // Horizontal squeeze (towards center) based on volume
                // We need to know if point is Left or Right of mouth center.
                // Simple heuristic: compare ox to textureWidth/2? No, head might be tilted.
                // We can't easily do accurate O-shape without re-calculating center.
                // Fallback: Just vertical opening is often enough if Smooth is good.
                // Let's add a tiny bit of "pucker" scaling if high volume?
                // Scale tx based on distance from center... expensive loop.
                // Skipping complex O-shape for performance, focusing on Smooth Vertical.
            }
        }
        
        // 2. Apply Blink
        if (blinkVal > 0.01) {
            const topMovement = blinkVal * eyeHeight * 1.0; 
            const bottomMovement = blinkVal * eyeHeight * 0.3;
            if (LEFT_EYE_TOP.includes(idx) || RIGHT_EYE_TOP.includes(idx)) ty += topMovement;
            if (LEFT_EYE_BOTTOM.includes(idx) || RIGHT_EYE_BOTTOM.includes(idx)) ty -= bottomMovement;
        }

        // 3. Expressions
        if (idx === L_CORNER || idx === R_CORNER) {
            ty -= (currentEmotions.happy * mouthHeight * 0.4); 
            tx += (idx === L_CORNER ? -1 : 1) * (currentEmotions.happy * mouthHeight * 0.2);
        }
        if (LEFT_EYE_TOP.includes(idx) || RIGHT_EYE_TOP.includes(idx)) ty += (currentEmotions.happy * eyeHeight * 0.2); 
        if (LEFT_EYEBROW.includes(idx) || RIGHT_EYEBROW.includes(idx)) ty -= (currentEmotions.surprised * eyeHeight * 0.8); 
        if (LEFT_EYEBROW.includes(idx)) ty -= (currentEmotions.thinking * eyeHeight * 0.4); 
        if (RIGHT_EYEBROW.includes(idx)) ty += (currentEmotions.thinking * eyeHeight * 0.2); 
        if ([70, 107, 336, 300].includes(idx)) ty -= (currentEmotions.sad * eyeHeight * 0.4); 
        if ([105, 334].includes(idx)) ty += (currentEmotions.sad * eyeHeight * 0.2);

        // 4. Streamer-Sales inspired micro-jitter (Natural oscillation)
        const jitterX = Math.sin(breathOffset * 8 + idx) * 0.15;
        const jitterY = Math.cos(breathOffset * 7 + idx) * 0.15;
        tx += jitterX;
        ty += jitterY;

        // 5. Full Body Sway
        const nx = (ox / (textureWidth * displayScale)) + 0.5;
        const ny = (oy / (textureHeight * displayScale)) + 0.5;
        let swayWeight = 1.0; 
        if (ny > 0.75) swayWeight = Math.max(0, 1.0 - (ny - 0.75) / 0.22); 

        tx += (unifiedMoveX * swayWeight);
        ty += (unifiedMoveY * swayWeight);
        if (ny < 0.7) ty += (upperBodyBreathing * swayWeight);

        positions[i] = tx;
        positions[i + 1] = ty;
    }

    // 5. Update Mouth Interior Overlay Position
    if (clampedVol > 0.1 && lastLandmarks) {
        const upperCenter = lastLandmarks[13]; 
        const lowerCenter = lastLandmarks[14];
        const leftCorner = lastLandmarks[78];
        const rightCorner = lastLandmarks[308];
        
        const centerX = app!.screen.width / 2 + userX + camX;
        const centerY = app!.screen.height / 2 + userY + camY;
        
        // Calculate world coordinates
        const scale = displayScale * userZoom * camZoom;
        const worldUpperY = centerY + (upperCenter.y - 0.5) * textureHeight * scale;
        const worldLowerY = centerY + (lowerCenter.y - 0.5) * textureHeight * scale;
        const worldX = centerX + (upperCenter.x - 0.5) * textureWidth * scale;
        
        const openingHeight = Math.max(0, worldLowerY - worldUpperY);
        const openingWidth = (rightCorner.x - leftCorner.x) * textureWidth * scale * 0.8;

        if (openingHeight > 1) {
            showMouthInterior.value = true;
            Object.assign(mouthInteriorStyle, {
                left: `${worldX - openingWidth/2}px`,
                top: `${worldUpperY}px`,
                width: `${openingWidth}px`,
                height: `${openingHeight}px`,
                transform: `rotate(${headTilt}deg)`,
                opacity: `${Math.min(1, (openingHeight - 1) / 8)}`,
            });
        } else {
            showMouthInterior.value = false;
        }
    } else {
        showMouthInterior.value = false;
    }

    // PIXI v7: Properly update geometry buffer
    const buffer = mesh.geometry.getBuffer('aVertexPosition');
    if (buffer) {
        buffer.update();
    }
    
    // 5. Update Aura Effect
    if (auraSprite) {
        // Pulse aura with volume
        // Only visible if there is volume (or active singing)
        const auraTarget = (isSinging ? 0.6 : 0) + (smoothedVolume * 2.0);
        auraSprite.alpha = auraSprite.alpha * 0.9 + auraTarget * 0.1;
        
        // Slowly rotate
        auraSprite.rotation += 0.005;
        
        // Pulse scale slightly
        const pulse = 1.0 + (smoothedVolume * 0.2);
        const baseAuraScale = Math.max(app.screen.width / auraSprite.texture.width, app.screen.height / auraSprite.texture.height) * 1.5;
        auraSprite.scale.set(baseAuraScale * pulse);
        
        auraSprite.x = app.screen.width / 2;
        auraSprite.y = app.screen.height / 2;
    }
};

const updateBackground = async (url: string) => {
    if (!app || !url) {
        if (bgSprite) {
             app?.stage.removeChild(bgSprite);
             bgSprite.destroy({ children: true, texture: true });
             bgSprite = null;
        }
        return;
    }

    try {
        const bgUrl = getFileUrl(url);
        console.log('[StaticPhotoViewer] Loading background from:', bgUrl);
        
        // Use Texture.from for better compatibility with proxy URLs
        // Assets.load has issues parsing proxy URLs
        const bgTex = await PIXI.Texture.fromURL(bgUrl);
        if (!bgTex) {
            console.warn('[StaticPhotoViewer] Failed to load background texture');
            return;
        }

        if (!bgSprite) {
            bgSprite = new PIXI.Sprite(bgTex);
            bgSprite.anchor.set(0.5);
            app.stage.addChildAt(bgSprite, 0); // Always at bottom
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
        
        console.log('[StaticPhotoViewer] Background updated successfully');
    } catch (e) {
        console.error('[StaticPhotoViewer] Failed to update background:', e);
    }
};


// Modals to expose
watch(() => props.modelUrl, (newUrl) => {
    if (newUrl) {
        console.log('[StaticPhotoViewer] modelUrl changed, re-initializing...');
        init();
    }
});

watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl) updateBackground(newUrl);
    else if (bgSprite) {
        bgSprite.visible = false;
    }
}, { immediate: true });

// Helper to efficiently update mesh transform when config changes (drag, zoom)
const updateTransform = () => {
    if (!app || !mesh || !props.config) return;

    if (props.config.scale) {
         userZoom = props.config.scale; 
    } else if (props.config.zoom) {
        userZoom = props.config.zoom;
    }

    if (props.config.offset) {
        // Update global state AND local offset
        const width = app.screen.width;
        const height = app.screen.height;
        userX = props.config.offset.x * width;
        userY = props.config.offset.y * height;
    }
    
    // Immediate update
    const centerX = app.screen.width / 2;
    const centerY = app.screen.height / 2;
    mesh.x = centerX + userX + camX;
    mesh.y = centerY + userY + camY;
    mesh.scale.set(userZoom * camZoom);
};

// React to config changes for live tuning
watch(() => props.config, (newConfig) => {
    if (mesh && newConfig) {
        console.log('[StaticPhotoViewer] Transform updated V2');
        updateTransform();
    }
}, { deep: true });

onActivated(() => {
    console.log('[StaticPhotoViewer] Activated, resuming ticker...');
    if (app) app.ticker.start();
});

onDeactivated(() => {
    console.log('[StaticPhotoViewer] Deactivated, pausing ticker...');
    if (app) app.ticker.stop();
});

onMounted(() => {
    initValue();
});

// Alias


onBeforeUnmount(() => {
    console.log('[StaticPhotoViewer] Cleaning up...');
    
    if (app) {
        app.ticker.stop();
        app.destroy(true, { 
            children: true, 
            texture: true, 
            baseTexture: true 
        });
        app = null;
    }

    // Nullify references
    mesh = null;
    texture = null;
    bgSprite = null;
});
const captureSnapshot = async (): Promise<string | null> => {
    // Return original image if we can't capture canvas, or just capture canvas.
    // Canvas has the "animated" face.
    if (!app || !canvas.value) return null;
    
    // Force a render
    app.render();
    
    return canvas.value.toDataURL('image/png');
};

const captureVideo = async (durationMs: number = 3000, audioTrack?: MediaStreamTrack): Promise<Blob | null> => {
    if (!canvas.value) return null;
    
    try {
        const stream = canvas.value.captureStream(30);
        
        // Merge audio track if provided
        if (audioTrack) {
            stream.addTrack(audioTrack);
        }

        const recorder = new MediaRecorder(stream, { 
            mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') 
                ? 'video/webm;codecs=vp9,opus' 
                : 'video/webm' 
        });
        const chunks: Blob[] = [];
        
        return new Promise((resolve) => {
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                resolve(blob);
            };
            
            recorder.start();
            setTimeout(() => {
                if (recorder.state === 'recording') recorder.stop();
            }, durationMs);
        });
    } catch (e) {
        console.error('Video capture failed:', e);
        return null;
    }
};

const resetView = () => {
    if (!app || !mesh) return;
    userX = app.screen.width / 2;
    userY = app.screen.height / 2;
    userZoom = 1.0;
    
    mesh.x = userX;
    mesh.y = userY;
    mesh.scale.set(userZoom);
    
    emitConfigUpdate();
};

const initValue = async () => {
    if (!container.value || !canvas.value || !props.modelUrl) return;

    const currentInitBatch = ++initCounter;
    loading.value = true;
    
    // Robust Wait for Container Size
    let retryCount = 0;
    while ((!container.value.clientWidth || !container.value.clientHeight) && retryCount < 50) {
        if (currentInitBatch !== initCounter) return; // Abort if another init started
        await new Promise(r => setTimeout(r, 50));
        retryCount++;
    }

    try {
        if (currentInitBatch !== initCounter) return;
        // FIXED 16:9 Resolution (Internal)
        const width = 1280;
        const height = 720;

        // Force CSS to handle the responsive scaling (Crop/Cover)
        if (canvas.value) {
            canvas.value.style.width = '100%';
            canvas.value.style.height = '100%';
            canvas.value.style.objectFit = 'cover'; 
        }

        // 0. Cleanup / Setup logic
        if (app) {
            console.log('[StaticPhotoViewer] Reusing existing PIXI instance, clearing stage...');
            app.stage.removeChildren();
            bgSprite = null;
            mesh = null;
            // No need to resize app, it stays 1280x720
        } else {
            // 1. Setup Pixi
            app = new PIXI.Application({
                view: canvas.value,
                width,
                height,
                backgroundColor: 0x000000,
                backgroundAlpha: 0,
                antialias: true,
                preserveDrawingBuffer: true
            });

            // Start Render Loop
            app.ticker.add((ticker: any) => {
                const delta = ticker.deltaTime || (ticker.deltaMS ? ticker.deltaMS / 16.67 : 1);
                update(delta);
            });
        }

        if (currentInitBatch !== initCounter) return;
        texture = await PIXI.Assets.load(getFileUrl(props.modelUrl));
        
        // Resize Image to CONTAIN within the 16:9 frame
        // This ensures the whole image is visible inside the 1280x720 canvas.
        // The canvas itself is then COVERED into the slot.
        // Result: Image is fully visible (with black bars if aspect differs) inside the 16:9 feed, which is then cropped.
        // WAIT: User wanted "Fix according to canvas slot".
        
        const scale = Math.min(width / texture.width, height / texture.height);
        // Actually, let's essentially "Fit Height" like we did for VRM.
        // If image is portrait, fitting height is correct.
        
        const displayWidth = texture.width * scale;
        const displayHeight = texture.height * scale;
        
        // Center the mesh
        const offsetX = (width - displayWidth) / 2;
        const offsetY = (height - displayHeight) / 2;

        // 4. Analyze Image
        const url = getFileUrl(props.modelUrl);
        console.log('[StaticPhotoViewer] Loading image from:', url);
        
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = url;
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('Image loading timeout')), 30000);
            img.onload = () => { clearTimeout(timeout); resolve(true); };
            img.onerror = (e) => { clearTimeout(timeout); reject(new Error('Failed to load image for analysis')); };
        });
        
        if (currentInitBatch !== initCounter) return;
        console.log('[StaticPhotoViewer] Detecting face landmarks...');
        
        // RELIABILITY FIX: Try detection on multiple background colors.
        const tryDetect = async (bgColor: string) => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tempCtx = tempCanvas.getContext('2d');
            if (tempCtx) {
                tempCtx.fillStyle = bgColor;
                tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
                tempCtx.drawImage(img, 0, 0);
                // For temp canvas, we don't cache by URL as it varies by bgColor
                return await faceLandmarkService.detect(tempCanvas);
            }
            return await faceLandmarkService.detect(img, props.modelUrl);
        };

        // 1. Check Cache first (Primary)
        let detection = await faceLandmarkService.detect(img, props.modelUrl);

        // 2. Sequential fallback strategies if cache misses or fails
        if (!detection || detection.faceLandmarks.length === 0) {
            console.warn('[StaticPhotoViewer] Initial detection failed, trying GREY strategy...');
            detection = await tryDetect('#808080');
        }
        if (!detection || detection.faceLandmarks.length === 0) {
            console.warn('[StaticPhotoViewer] Detection failed on GREY, trying WHITE...');
            detection = await tryDetect('#FFFFFF');
        }
        
        // SMART HEAD-CROP
        if (!detection || detection.faceLandmarks.length === 0) {
            console.warn('[StaticPhotoViewer] Full-image detection failed. Attempting Head-Crop strategy...');
            const cropCanvas = document.createElement('canvas');
            const cropW = img.width * 0.4;
            const cropH = img.height * 0.5;
            const cropX = (img.width - cropW) / 2;
            const cropY = 0;
            
            cropCanvas.width = cropW;
            cropCanvas.height = cropH;
            const cropCtx = cropCanvas.getContext('2d');
            if (cropCtx) {
                cropCtx.fillStyle = '#808080';
                cropCtx.fillRect(0, 0, cropW, cropH);
                cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
                
                const cropDetection = await faceLandmarkService.detect(cropCanvas);
                if (cropDetection && cropDetection.faceLandmarks.length > 0) {
                    console.log('[StaticPhotoViewer] Face detected in HEAD-CROP zone!');
                    const transformedLandmarks = cropDetection.faceLandmarks[0].map(pt => ({
                        x: (pt.x * cropW + cropX) / img.width,
                        y: (pt.y * cropH + cropY) / img.height,
                        z: pt.z,
                        visibility: (pt as any).visibility ?? 1,
                        presence: (pt as any).presence ?? 1
                    }));
                    
                    detection = {
                        faceLandmarks: [transformedLandmarks],
                        faceBlendshapes: cropDetection.faceBlendshapes,
                        facialTransformationMatrixes: cropDetection.facialTransformationMatrixes
                    };
                }
            }
        }

        // FALLBACK: If detection still fails, reuse the last known successful landmarks.
        if ((!detection || detection.faceLandmarks.length === 0) && lastLandmarks) {
            console.warn('[StaticPhotoViewer] Detection failed on all strategies. Falling back to previous landmarks.');
            detection = { 
                faceLandmarks: [lastLandmarks], 
                faceBlendshapes: [], 
                facialTransformationMatrixes: [] 
            };
        }

        if (detection.faceLandmarks.length > 0) {
            const landmarks = detection.faceLandmarks[0];
            console.log('[StaticPhotoViewer] Face detected! Landmarks:', landmarks.length);
            
            lastLandmarks = landmarks;
            lastDimensions = { w: img.width, h: img.height };
            
            // Calculate final scale before creating mesh
            const width = app!.screen.width;
            const height = app!.screen.height;
            const scaleX = width / texture.width;
            const scaleY = height / texture.height;
            const finalScale = Math.min(scaleX, scaleY);
            
            // Create hybrid mesh (Face Landmarks + Grid) allows full body display + facial animation
            setupMesh(landmarks, texture, finalScale);
        } else {
            throw new Error("No face detected in image. Please use a clearer portrait.");
        }

        if (props.backgroundUrl) {
            await updateBackground(props.backgroundUrl);
        }

        if (currentInitBatch !== initCounter) return;
        loading.value = false;
        
        // 6. Enable Interaction
        if (mesh) {
            mesh.eventMode = 'dynamic';
            mesh.on('pointerdown', (event: any) => {
                isDragging = true;
                dragData = event.data;
                lastMousePos = { x: event.data.global.x, y: event.data.global.y };
            });

            mesh.on('pointermove', (event: any) => {
                if (isDragging && mesh) {
                    const newPos = event.data.global;
                    const dx = newPos.x - lastMousePos.x;
                    const dy = newPos.y - lastMousePos.y;
                    
                    userX += dx;
                    userY += dy;
                    
                    lastMousePos = { x: newPos.x, y: newPos.y };
                    emitConfigUpdate();
                }
            });

            const stopDrag = () => {
                isDragging = false;
                dragData = null;
            };

            mesh.on('pointerup', stopDrag);
            mesh.on('pointerupoutside', stopDrag);
        }

        // Zooming via Wheel
        if (container.value) {
            container.value.removeEventListener('wheel', handleWheel);
            container.value.addEventListener('wheel', handleWheel, { passive: false });
        }

        // 0. Robust Resize Handling
        const resizeObserver = new ResizeObserver(() => {
            if (!container.value || !app || !app.renderer) return;
            
            if (bgSprite) {
                updateBackground(props.backgroundUrl || '');
            }
        });
        resizeObserver.observe(container.value);


        // Re-emit stream if canvas changed (though we reuse it)
        const stream = canvas.value.captureStream(30);
        emit('stream-ready', stream);
        
        emit('ready');
        error.value = null;
    } catch (err: any) {
        console.error("StaticPhotoViewer Error logic:", err);
        error.value = err.message || "Failed to initialize Neural Puppet";
        loading.value = false;
    }
};

const init = initValue;

onActivated(() => {
    if (app) app.ticker.start();
});

onDeactivated(() => {
    if (app) app.ticker.stop();
});

onBeforeUnmount(() => {
    console.log('[StaticPhotoViewer] Cleaning up PIXI app...');
    initCounter++; // Prevent any pending init from finishing
    if (app) {
        app.destroy(true, { children: true, texture: true, baseTexture: true });
        app = null;
    }
    mesh = null;
    texture = null;
    bgSprite = null;
});

defineExpose({
    captureSnapshot,
    captureVideo,
    resetView
});
</script>
