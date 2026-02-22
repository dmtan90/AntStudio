<template>
    <div ref="container" class="w-full h-full rounded-xl overflow-hidden relative group bg-[#050505]">
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-10">
            <div class="flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Initializing Neural Link</span>
            </div>
        </div>
        
        <!-- 3D Canvas -->
        <canvas ref="canvas" class="w-full h-full block"></canvas>

        <!-- Dynamic Lyrics Overlay -->
        <StageLyricsOverlay 
            v-if="lyricsEnabled && lyrics && lyrics.length > 0"
            :lyrics="lyrics"
            :currentTime="currentTime || 0"
            :style="lyricsStyle || 'neon'"
            :position="lyricsPosition || 'bottom'"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, onActivated, onDeactivated } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { VRM, VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { getFileUrl } from '@/utils/api';
import { isSingingAtTime } from '@/utils/lyricUtils';
import { getCachedFile, cacheFile } from '@/utils/ModelCache';
import { VRMPropManager } from '@/utils/vrm/VRMPropManager';
import { VRMLightingManager } from '@/utils/vrm/VRMLightingManager';
import { VRMCameraManager } from '@/utils/vrm/VRMCameraManager';
import { VRMDirector } from '@/utils/vrm/VRMDirector';
import StageLyricsOverlay from './StageLyricsOverlay.vue';

const props = defineProps<{
    modelUrl: string;
    backgroundUrl?: string;
    speakingVol?: number;
    trackingData?: any; // Data from KalidoKit
    activePropId?: string | null;
    auraEnabled?: boolean;
    auraColor?: string;
    particleType?: 'sakura' | 'snow' | 'glitter' | null;
    particleDensity?: number; // 0 to 1
    lightingPreset?: string;
    dynamicLighting?: boolean;
    lightingIntensity?: number;
    activeCameraPath?: string | null;
    cameraIntensity?: number;
    autoDirectorEnabled?: boolean;
    lyrics?: any[];
    currentTime?: number;
    lyricsEnabled?: boolean;
    lyricsStyle?: 'neon' | 'minimal' | 'kinetic';
    lyricsPosition?: 'top' | 'bottom';
    config?: {
        zoom?: number;
        offset?: { x: number, y: number, z?: number };
        position?: { x: number, y: number, z?: number };
        rotation?: number; // azimuth
        scale?: number; // distance/zoom factor
    };
    is360?: boolean;
}>();

const emit = defineEmits<{
    'update:config': [config: any];
    'load': [vrm: any];
    'ready': [];
    'update:director': [decisions: any];
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let currentVrm: VRM | null = null;
let propManager: VRMPropManager = new VRMPropManager();
let lightingManager: VRMLightingManager = new VRMLightingManager();
let cameraManager: VRMCameraManager = new VRMCameraManager();
let director: VRMDirector = new VRMDirector();
let auraSystem: THREE.Points | null = null;
let auraMaterial: THREE.PointsMaterial | null = null;
let particleSystem: THREE.Points | null = null;
let particleMaterial: THREE.PointsMaterial | null = null;
let particleVelocities: number[] = [];
let animationId: number;
let clock = new THREE.Clock();
let isPaused = false;

onActivated(() => {
    console.log('[VRMViewer] Activated, resuming animation loop...');
    console.log('[VRMViewer] Background URL:', props.backgroundUrl);
    isPaused = false;
    animate();
});

onDeactivated(() => {
    console.log('[VRMViewer] Deactivated, pausing animation loop...');
    isPaused = true;
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
});

const animate = () => {
    if (isPaused || !renderer || !scene || !camera) {
        if (Math.floor(Date.now() / 1000) % 5 === 0 && Math.random() < 0.02) {
            console.warn('[VRMViewer] Animation Loop Paused/Aborted:', { isPaused, hasRenderer: !!renderer, hasScene: !!scene, hasCamera: !!camera });
        }
        return;
    }
    
    animationId = requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    // Debug Log (Periodic)
    // if (Math.floor(clock.elapsedTime) % 5 === 0 && Math.floor(clock.elapsedTime * 10) % 10 === 0) {
    //    console.log('[VRMViewer] Animation Loop Running', { 
    //        hasVrm: !!currentVrm, 
    //        vol: props.speakingVol, 
    //        fps: 1/deltaTime,
    //        delta: deltaTime
    //    });
    // }

    if (currentVrm) {
        // Update VRM (Spring bones, etc.)
        currentVrm.update(deltaTime);
        
        // Apply Lip Sync if speaking
        applyLipSync();
        
        // Apply Tracking Data
        if (props.trackingData) {
            applyTracking(props.trackingData);
        } else {
            applyIdleAnimation(deltaTime);
        }

        // Update Aura
        updateAura(deltaTime);

        // Update Particles
        updateParticles(deltaTime);

        // Update Lighting Reaction
        if (props.dynamicLighting) {
            lightingManager.updateReaction(props.speakingVol || 0, props.lightingIntensity || 1.0);
        }

        // Update Camera Path
        if (props.activeCameraPath) {
            const isControlling = cameraManager.update(
                camera, 
                controls.target, 
                clock.getElapsedTime(), 
                props.cameraIntensity || 1.0
            );
            if (isControlling) {
                controls.enabled = false; // Disable orbit while auto is active
            }
        } else {
            controls.enabled = true;
        }

        // Centralized Smart Sync Logic
        let isSinging = isSingingAtTime(props.lyrics, props.currentTime);
        const rawVol = props.speakingVol || 0;
        // Update AI Director
        if (props.autoDirectorEnabled) {
            const decisions = director.update(props.speakingVol || 0, 0, deltaTime); // pitch not yet used
            if (decisions.isCut) {
                emit('update:director', decisions);
            }
        }
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
};

const initValue = async () => {
    if (!container.value || !canvas.value) return;

    loading.value = true;

    // Robust Wait for Container Size
    let retryCount = 0;
    while ((!container.value.clientWidth || !container.value.clientHeight) && retryCount < 50) {
        await new Promise(r => setTimeout(r, 50));
        retryCount++;
    }

    // 1. Scene setup
    scene = new THREE.Scene();
    
    // 2. Camera setup (Fixed 16:9 Aspect Ratio)
    // We treat the VRM render like a 1080p/720p video feed
    const targetAspect = 16 / 9;
    const baseHeight = 720; // Internal resolution height
    const baseWidth = baseHeight * targetAspect; // 1280
    
    camera = new THREE.PerspectiveCamera(35, targetAspect, 0.1, 100);
    camera.position.set(0, 1.4, 3.5); 

    // 3. Renderer setup (Fixed Resolution)
    renderer = new THREE.WebGLRenderer({
        canvas: canvas.value,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(baseWidth, baseHeight, false); // false = do not update style
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    // Force CSS to handle the responsive scaling (Crop/Cover)
    if (canvas.value) {
        canvas.value.style.width = '100%';
        canvas.value.style.height = '100%';
        canvas.value.style.objectFit = 'cover'; // Key requirement: Scale/Crop center
    }

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(1, 2, 3);
    scene.add(mainLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1.4, 0); 
    controls.enableDamping = true;
    controls.enableZoom = true;
    controls.enablePan = true;
    
    controls.addEventListener('end', saveCameraState);

    // 5.5. Lighting setup
    lightingManager.setup(scene);
    if (props.lightingPreset) {
        lightingManager.applyPreset(props.lightingPreset);
    }

    // 6. Load Model
    loadModel();

    // 7. Initialize Aura
    initAura();

    // 8. Initialize Particles
    initParticles();

    animate();

    // 7. Removed dynamic ResizeObserver for renderer size
    // We rely on CSS object-fit: cover to adapt the 16:9 feed to the container.
    // However, we might want to re-trigger auto-fit if the container changes drastically?
    // Actually, user wants fixed 16:9 render. So we just assume the "Feed" is stable.

    // 9. Load Background
    if (props.backgroundUrl) {
        loadBackground(props.backgroundUrl);
    }

    loading.value = false;
};

onMounted(() => {
    initValue();
});

// Alias
const init = initValue;

const initParticles = () => {
    const count = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    particleVelocities = [];

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 10;
        positions[i * 3 + 1] = Math.random() * 10;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        
        particleVelocities.push(
            (Math.random() - 0.5) * 0.02, // x
            -Math.random() * 0.02 - 0.01, // y
            (Math.random() - 0.5) * 0.02  // z
        );
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    particleMaterial = new THREE.PointsMaterial({
        size: 0.05,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    particleSystem = new THREE.Points(geometry, particleMaterial);
    scene.add(particleSystem);
};

const updateParticles = (delta: number) => {
    if (!particleSystem || !particleMaterial) return;

    const density = props.particleDensity ?? 0.5;
    const targetOpacity = props.particleType ? density : 0;
    particleMaterial.opacity += (targetOpacity - particleMaterial.opacity) * 0.05;

    if (particleMaterial.opacity < 0.01) return;

    // Apply Presets
    if (props.particleType === 'sakura') {
        particleMaterial.color.set('#ffb7c5');
        particleMaterial.size = 0.08;
    } else if (props.particleType === 'snow') {
        particleMaterial.color.set('#ffffff');
        particleMaterial.size = 0.06;
    } else if (props.particleType === 'glitter') {
        particleMaterial.color.set('#fff200');
        particleMaterial.size = 0.04;
    }

    const positions = particleSystem.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < 1000; i++) {
        // Move
        positions[i * 3] += particleVelocities[i * 3];
        positions[i * 3 + 1] += particleVelocities[i * 3 + 1];
        positions[i * 3 + 2] += particleVelocities[i * 3 + 2];

        // Custom physics per type
        if (props.particleType === 'sakura') {
            positions[i * 3] += Math.sin(Date.now() * 0.001 + i) * 0.005; // Drifting
        } else if (props.particleType === 'glitter') {
            positions[i * 3 + 1] += Math.sin(Date.now() * 0.01 + i) * 0.02; // Twinkly movement
        }

        // Reset if out of bounds
        if (positions[i * 3 + 1] < 0) {
            positions[i * 3 + 1] = 5;
            positions[i * 3] = (Math.random() - 0.5) * 10;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
        }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true;
};

const initAura = () => {
    const geometry = new THREE.BufferGeometry();
    const vertices = [];
    for (let i = 0; i < 500; i++) {
        vertices.push(
            (Math.random() - 0.5) * 2,
            Math.random() * 2,
            (Math.random() - 0.5) * 2
        );
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    
    auraMaterial = new THREE.PointsMaterial({
        color: props.auraColor || '#00f2ff',
        size: 0.05,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    auraSystem = new THREE.Points(geometry, auraMaterial);
    scene.add(auraSystem);
};

const updateAura = (delta: number) => {
    if (!auraSystem || !auraMaterial) return;

    const isEnabled = props.auraEnabled && (props.speakingVol || 0) > 0.01;
    const targetOpacity = isEnabled ? Math.min(0.8, (props.speakingVol || 0) * 4) : 0;
    
    // Smooth transition
    auraMaterial.opacity += (targetOpacity - auraMaterial.opacity) * 0.1;

    if (auraMaterial.opacity > 0.01) {
        auraSystem.rotation.y += delta * 0.5;
        auraSystem.scale.setScalar(1 + (props.speakingVol || 0) * 0.5);
        
        // Dynamic color update if prop changed
        if (props.auraColor) {
            auraMaterial.color.set(props.auraColor);
        }
    }
};

// 1. Helper Functions (Defined before loadModel)

const saveCameraState = () => {
    if (!controls || !camera) return;
    
    // We only save if the director isn't currently controlling it
    if (props.activeCameraPath) return;

    // Distance as zoom proxy
    const dist = camera.position.distanceTo(controls.target);
    const azimuth = controls.getAzimuthalAngle();
    
    const state = {
        zoom: dist, 
        offset: { x: controls.target.x, y: controls.target.y, z: controls.target.z }, 
        rotation: azimuth,
        scale: 1.0 
    };
    
    emit('update:config', state);
};

const getSmartTarget = (vrm: any): THREE.Vector3 => {
    let target = new THREE.Vector3(0, 1.3, 0); 
    if (vrm.humanoid) {
        const headNode = vrm.humanoid.getNormalizedBoneNode('head');
        const chestNode = vrm.humanoid.getNormalizedBoneNode('chest') || vrm.humanoid.getNormalizedBoneNode('spine');
        if (headNode) {
            target.copy(headNode.getWorldPosition(new THREE.Vector3()));
            target.y -= 0.05; 
        } else if (chestNode) {
             target.copy(chestNode.getWorldPosition(new THREE.Vector3()));
             target.y += 0.15; 
        } else {
             const box = new THREE.Box3().setFromObject(vrm.scene);
             target.copy(box.getCenter(new THREE.Vector3()));
             target.y += 0.3; 
        }
        if (target.y < 0.8) target.y = 1.3;
    } else {
         const box = new THREE.Box3().setFromObject(vrm.scene);
         const sizeY = box.getSize(new THREE.Vector3()).y;
         target.copy(box.getCenter(new THREE.Vector3()));
         if (sizeY > 1.0) target.y += sizeY * 0.2; 
    }
    return target;
};

const resetView = () => {
    if (!currentVrm || !camera || !controls || !container.value) return;
    
    // Strategy: FULL BODY FIT (Head to Toe) 16:9
    const box = new THREE.Box3();
    let boxValid = false;
    
    if (currentVrm.humanoid) {
        const boneNames = ['head', 'neck', 'hips', 'leftHand', 'rightHand', 'leftFoot', 'rightFoot', 'leftLowerLeg', 'rightLowerLeg'] as const;
        boneNames.forEach(name => {
            const node = currentVrm.humanoid.getNormalizedBoneNode(name);
            if (node) {
                box.expandByPoint(node.getWorldPosition(new THREE.Vector3()));
                boxValid = true;
            }
        });
        if (boxValid) {
            box.max.y += 0.25; box.min.y -= 0.10; box.min.x -= 0.25; box.max.x += 0.25; box.min.z -= 0.25; box.max.z += 0.25;
            if (box.getSize(new THREE.Vector3()).y < 0.6) boxValid = false;
        }
    }

    if (!boxValid) box.setFromObject(currentVrm.scene);

    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    controls.target.copy(center);

    const fov = camera.fov * (Math.PI / 180);
    const margin = 1.1; 
    let dist = (size.y * margin) / (2 * Math.tan(fov / 2));
    
    dist = Math.max(0.5, Math.min(dist, 20.0));

    console.log('[VRMViewer] Auto-fitting 16:9 Feed:', { center, size, dist });

    const azimuth = controls.getAzimuthalAngle() || 0;
    camera.position.set(center.x + Math.sin(azimuth) * dist, center.y, center.z + Math.cos(azimuth) * dist);
    
    controls.update();
    saveCameraState();
};

const destroyCurrentModel = () => {
    if (!currentVrm) return;
    
    console.log('[VRMViewer] Destroying current model...');
    
    // 1. Detach props before disposing the VRM
    try { propManager.detachProp(); } catch(e) { /* ignore */ }
    
    // 2. Remove aura/particles tied to model position
    if (auraSystem) {
        scene.remove(auraSystem);
        auraSystem.geometry.dispose();
        if (auraMaterial) auraMaterial.dispose();
        auraSystem = null;
        auraMaterial = null;
    }
    if (particleSystem) {
        scene.remove(particleSystem);
        particleSystem.geometry.dispose();
        if (particleMaterial) particleMaterial.dispose();
        particleSystem = null;
        particleMaterial = null;
    }
    
    // 3. Remove scene and deep dispose all GPU resources
    scene.remove(currentVrm.scene);
    VRMUtils.deepDispose(currentVrm.scene);
    currentVrm = null;
    
    console.log('[VRMViewer] Model destroyed successfully.');
};

const loadModel = async () => {
    if (!props.modelUrl) return;
    loading.value = true;
    
    // Fully destroy old model before loading new one
    destroyCurrentModel();

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    try {
        const url = getFileUrl(props.modelUrl);
        
        // Try IndexedDB cache first to avoid re-downloading
        let loadUrl = url;
        const cached = await getCachedFile(url);
        if (cached) {
            loadUrl = URL.createObjectURL(cached);
            console.log('[VRMViewer] Loading from cache');
        } else {
            console.log('[VRMViewer] Cache miss, downloading...');
        }
        
        const gltf = await loader.loadAsync(loadUrl);
        
        // Cache the file for next time (if we downloaded it)
        if (!cached) {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                cacheFile(url, blob); // fire-and-forget
            } catch (e) { /* cache write is best-effort */ }
        } else {
            URL.revokeObjectURL(loadUrl);
        }
        
        const vrm = gltf.userData.vrm as VRM;
        
        currentVrm = vrm;
        scene.add(vrm.scene);
        vrm.scene.rotation.y = Math.PI; 

        if (props.activePropId) propManager.attachProp(vrm, props.activePropId);
        
        emit('load', vrm);
        console.log('[VRMViewer] VRM Loaded:', vrm);

        // Config Apply
        let cameraApplied = false;
        const isDefaultConfig = props.config && 
            props.config.zoom === 1 && 
            (!props.config.offset || (props.config.offset.x === 0 && props.config.offset.y === 0 && (!props.config.offset.z || props.config.offset.z === 0))) &&
            (!props.config.rotation || props.config.rotation === 0);

        if (props.config && !isDefaultConfig) {
            console.log('[VRMViewer] Applying user config:', props.config);
            if (props.config.scale) vrm.scene.scale.setScalar(props.config.scale);

            let targetSet = false;
            if (props.config.offset) {
                controls.target.set(props.config.offset.x, props.config.offset.y, props.config.offset.z || 0);
                targetSet = true;
            } else if (props.config.position) {
                controls.target.set(props.config.position.x, props.config.position.y, props.config.position.z || 0);
                targetSet = true;
            }

            if (!targetSet) {
                 const smartTarget = getSmartTarget(vrm); // Now defined!
                 controls.target.copy(smartTarget);
            }

            if (props.config.zoom) {
                const dist = props.config.zoom;
                const azimuth = props.config.rotation || 0;
                camera.position.set(controls.target.x + Math.sin(azimuth) * dist, controls.target.y, controls.target.z + Math.cos(azimuth) * dist);
                cameraApplied = true;
            }
            controls.update();
        } else {
            console.log('[VRMViewer] Config default/missing. Auto-fitting.');
        }
        
        if (!cameraApplied) {
            resetView(); // Now defined!
        }
    } catch (e) {
        console.error('[VRMViewer] Load failed:', e);
    } finally {
        loading.value = false;
        emit('ready');
    }
};

const applyIdleAnimation = (deltaTime: number) => {
    if (!currentVrm || !currentVrm.humanoid) return;
    
    const t = clock.elapsedTime;
    const vol = props.speakingVol || 0;
    const isSpeaking = vol > 0.01;
    
    // ========================================
    // Layer 1: Breathing (Spine/Chest, slow)
    // ========================================
    const spine = currentVrm.humanoid.getNormalizedBoneNode('spine');
    if (spine) {
        // Gentle breathing on X-axis, ~4s cycle
        spine.rotation.x = Math.sin(t * 1.5) * 0.015;
    }
    
    const chest = currentVrm.humanoid.getNormalizedBoneNode('chest');
    if (chest) {
        // Chest breathe slightly offset from spine for organic feel
        chest.rotation.x = Math.sin(t * 1.5 + 0.5) * 0.02;
    }

    // ========================================
    // Layer 2: Head & Neck Sway (multi-freq)
    // ========================================
    const head = currentVrm.humanoid.getNormalizedBoneNode('head');
    const neck = currentVrm.humanoid.getNormalizedBoneNode('neck');
    
    if (neck) {
        // Slow lateral sway (~6s cycle)
        neck.rotation.z = Math.sin(t * 1.0) * 0.02;
        // Slight forward/back (~8s cycle)
        neck.rotation.x = Math.sin(t * 0.8 + 1.0) * 0.01;
    }
    
    if (head) {
        // Head has its own sway, slightly faster and layered on top of neck
        head.rotation.z = Math.sin(t * 1.3 + 2.0) * 0.025;
        head.rotation.y = Math.sin(t * 0.7) * 0.03; // Slow look left/right
        
        // Speech-driven head nod: small downward nod when speaking
        if (isSpeaking) {
            head.rotation.x = Math.sin(t * 4.0) * 0.03 * Math.min(1, vol * 3);
        } else {
            head.rotation.x = Math.sin(t * 0.9 + 0.5) * 0.01;
        }
    }

    // ========================================
    // Layer 3: Relaxed A-Pose (Arms Down)
    // ========================================
    const lArm = currentVrm.humanoid.getNormalizedBoneNode('leftUpperArm');
    if (lArm) {
        lArm.rotation.z = 1.2 + Math.sin(t * 0.6) * 0.02;
        lArm.rotation.y = 0.1;
    }
    
    const rArm = currentVrm.humanoid.getNormalizedBoneNode('rightUpperArm');
    if (rArm) {
        rArm.rotation.z = -1.2 + Math.sin(t * 0.6 + 1.0) * 0.02;
        rArm.rotation.y = -0.1;
    }

    // ========================================
    // Layer 4: Hips micro-sway (weight shift)
    // ========================================
    const hips = currentVrm.humanoid.getNormalizedBoneNode('hips');
    if (hips) {
        hips.rotation.z = Math.sin(t * 0.4) * 0.008;
        hips.rotation.y = Math.sin(t * 0.3 + 1.5) * 0.01;
    }

    // ========================================
    // Layer 5: Auto-blink cycle
    // ========================================
    if (currentVrm.expressionManager) {
        // Blink every 3-6 seconds with a quick close-open
        const blinkCycle = (t % 4.5);
        let blinkWeight = 0;
        if (blinkCycle > 4.0 && blinkCycle < 4.3) {
            // Quick blink: ramp up and down over 0.3s 
            const blinkT = (blinkCycle - 4.0) / 0.3;
            blinkWeight = blinkT < 0.5 ? blinkT * 2 : (1 - blinkT) * 2;
        }
        currentVrm.expressionManager.setValue('blink', blinkWeight);
    }
};

const applyLipSync = () => {
    if (!currentVrm || !props.speakingVol) return;
    
    const expressionManager = currentVrm.expressionManager;
    if (!expressionManager) return;
    // Centralized Smart Sync Logic
    const isSinging = isSingingAtTime(props.lyrics, props.currentTime);

    const vol = isSinging ? props.speakingVol : 0;
    
    // Boost sensitivity: vol is typically 0-0.3, we need 0-1 range
    const mouthOpen = Math.min(1.0, vol * 8);
    
    // Primary mouth open (aa = jaw drop)
    expressionManager.setValue('aa', mouthOpen);
    
    // Secondary shapes for more natural lip movement  
    // "oh" shape at lower volumes for resting-open feel
    expressionManager.setValue('oh', Math.min(0.4, vol * 3));
    // "ee" flicker for consonant-like variation
    const flickerT = Date.now() * 0.01;
    const consonantFlicker = mouthOpen > 0.2 ? Math.sin(flickerT) * 0.15 * mouthOpen : 0;
    expressionManager.setValue('ee', Math.max(0, consonantFlicker));
};

const applyTracking = (data: any) => {
    if (!currentVrm || !data) return;

    // 1. Face Tracking (BlendShapes)
    if (data.face && currentVrm.expressionManager) {
        const face = data.face;
        const expressions = currentVrm.expressionManager;

        // Blinking
        expressions.setValue('blinkLeft', 1 - face.eyeL);
        expressions.setValue('blinkRight', 1 - face.eyeR);

        // Mouth (Simplified A-I-U-E-O)
        expressions.setValue('aa', face.mouthA);
        expressions.setValue('ih', face.mouthI);
        expressions.setValue('ou', face.mouthU);
        expressions.setValue('ee', face.mouthE);
        expressions.setValue('oh', face.mouthO);
    }

    // 2. Pose Tracking (Bones)
    if (data.pose && currentVrm.humanoid) {
        const pose = data.pose;
        const humanoid = currentVrm.humanoid;

        // Apply joint rotations from KalidoKit
        // This requires a mapping between KalidoKit bone names and VRM bone names
        // Humanoid bones are handled via currentVrm.humanoid.getRawBoneNode()
        
        const setBoneRotation = (vrmBoneName: string, kalidoRotation: any) => {
            const bone = humanoid.getNormalizedBoneNode(vrmBoneName as any);
            if (bone && kalidoRotation) {
                bone.quaternion.set(
                    kalidoRotation.x,
                    kalidoRotation.y,
                    kalidoRotation.z,
                    kalidoRotation.w
                );
            }
        };

        // Example rotations (KalidoKit names)
        if (pose.Neck) setBoneRotation('neck', pose.Neck);
        if (pose.Spine) setBoneRotation('spine', pose.Spine);
        if (pose.LeftUpperArm) setBoneRotation('leftUpperArm', pose.LeftUpperArm);
        if (pose.RightUpperArm) setBoneRotation('rightUpperArm', pose.RightUpperArm);
        if (pose.LeftLowerArm) setBoneRotation('leftLowerArm', pose.LeftLowerArm);
        if (pose.RightLowerArm) setBoneRotation('rightLowerArm', pose.RightLowerArm);
    }
};

// NOTE: Lifecycle hooks consolidated below (single onBeforeUnmount at line ~760+)
// onMounted is already called at line 273.

// Watchers
watch(() => props.modelUrl, loadModel);

watch(() => props.activePropId, (newId) => {
    if (currentVrm) {
        if (newId) propManager.attachProp(currentVrm, newId);
        else propManager.detachProp();
    }
});

watch(() => props.particleType, () => {}); // Handled in updateParticles

watch(() => props.lightingPreset, (newPreset) => {
    if (newPreset) {
        lightingManager.applyPreset(newPreset);
    }
});

watch(() => props.activeCameraPath, (newPath) => {
    if (camera && controls) {
        cameraManager.setPath(newPath, camera, controls.target);
    }
});

const loadBackground = (url: string) => {
    if (!scene) {
        console.warn('[VRMViewer] Cannot load background: scene not initialized');
        return;
    }
    
    console.log('[VRMViewer] Loading background:', url);
    const loader = new THREE.TextureLoader();
    loader.load(getFileUrl(url), (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        console.log('[VRMViewer] Background Loaded:', url, 
            'Size:', texture.image.width, 'x', texture.image.height, 
            'Mapping:', props.is360 ? '360' : '2D');

        if (props.is360) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.background = texture;
            scene.environment = texture; // Also use for lighting if 360
        } else {
            // Calculate aspect ratios
            const imageAspect = texture.image.width / texture.image.height;
            const screenAspect = container.value ? container.value.clientWidth / container.value.clientHeight : 1;
            
            // Apply object-fit: cover behavior
            if (imageAspect > screenAspect) {
                // Image is wider - fit height, crop width
                const scale = screenAspect / imageAspect;
                texture.repeat.set(scale, 1);
                texture.offset.set((1 - scale) / 2, 0);
            } else {
                // Image is taller - fit width, crop height
                const scale = imageAspect / screenAspect;
                texture.repeat.set(1, scale);
                texture.offset.set(0, (1 - scale) / 2);
            }
            scene.background = texture;
        }
    }, undefined, (err) => {
        console.error('[VRMViewer] Background load failed:', err);
    });
};

watch(() => props.backgroundUrl, (newUrl) => {
    if (newUrl && scene) {
        loadBackground(newUrl);
    } else if (scene) {
        scene.background = null;
    }
});





onBeforeUnmount(() => {
    console.log('[VRMViewer] Cleaning up...');
    
    if (animationId) {
        cancelAnimationFrame(animationId);
    }

    // Destroy VRM model (props, effects, GPU resources)
    destroyCurrentModel();

    if (controls) {
        controls.dispose();
    }

    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss();
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
    }

    if (scene) {
        scene.traverse((object: any) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach((material: any) => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
    }

    // Nullify references
    currentVrm = null;
    renderer = null;
    scene = null;
    camera = null;
    controls = null;
});

defineExpose({
    captureSnapshot: async () => {
        if (!renderer) return null;
        renderer.render(scene, camera);
        return renderer.domElement.toDataURL('image/png');
    },
    captureVideo: async (durationMs: number, audioTrack?: MediaStreamTrack) => {
        if (!renderer) return null;

        console.log('[VRMViewer] Starting video capture...', durationMs, 'ms');

        // Capture canvas stream
        const canvasStream = renderer.domElement.captureStream(30); // 30 FPS
        
        // Combine with audio if provided
        if (audioTrack) {
            canvasStream.addTrack(audioTrack);
            console.log('[VRMViewer] Audio track added to stream');
        }

        const mediaRecorder = new MediaRecorder(canvasStream, {
            mimeType: 'video/webm;codecs=vp9',
            videoBitsPerSecond: 2500000 // 2.5 Mbps
        });

        const chunks: Blob[] = [];

        return new Promise<Blob>((resolve, reject) => {
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                console.log('[VRMViewer] Video capture complete, size:', blob.size);
                resolve(blob);
            };

            mediaRecorder.onerror = (event: any) => {
                console.error('[VRMViewer] MediaRecorder error:', event.error);
                reject(event.error);
            };

            mediaRecorder.start();
            console.log('[VRMViewer] MediaRecorder started');

            // Stop after duration
            setTimeout(() => {
                if (mediaRecorder.state !== 'inactive') {
                    mediaRecorder.stop();
                    console.log('[VRMViewer] MediaRecorder stopped after', durationMs, 'ms');
                }
            }, durationMs);
        });
    },
    resetView
});
</script>
