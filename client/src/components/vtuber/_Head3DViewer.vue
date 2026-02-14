<template>
    <div ref="container" class="w-full h-full rounded-xl overflow-hidden relative group">
        <!-- Loading State -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
        
        <!-- 3D Canvas -->
        <canvas ref="canvas" class="w-full h-full block"></canvas>

        <!-- Controls Hint -->
        <div class="absolute bottom-4 left-0 right-0 text-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span class="text-[10px] text-white/50 bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                Drag to rotate • Scroll to zoom
            </span>
        </div>

        <!-- Calibration Mode Active Indicator -->
        <div v-if="calibrationMode" class="absolute top-4 left-4 pointer-events-none">
            <div class="flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 px-2 py-1 rounded-lg backdrop-blur-sm animate-pulse">
                <div class="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                <span class="text-[8px] font-black uppercase text-blue-400 tracking-tighter">Calibration Active</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { getFileUrl } from '@/utils/api';
import { faceLandmarkService } from '@/utils/ai/FaceLandmarkService';

const props = defineProps<{
    textureUrl: string;
    modelUrl?: string;
    preserveMaterials?: boolean;
    speakingVol?: number;
    calibrationMode?: boolean;
    faceCalibration?: {
        xOffset: number;
        yOffset: number;
        zOffset: number;
        yScale: number;
        xScale: number;
        zDepth: number;
    };
    backgroundUrl?: string;
    isHostSpeaking?: boolean;
    emotion?: string;
    gesture?: string;
    isThinking?: boolean;
    baseExpression?: any;
}>();

const emit = defineEmits<{
    snapshot: [dataUrl: string];
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null);
const loading = ref(true);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let headMesh: THREE.Object3D | THREE.Mesh;
let aiMaskGroup: THREE.Group;
let animationId: number;
let morphMeshes: THREE.Mesh[] = [];

// MediaPipe & AI State
let facialMetadata: any = null;

// New Multi-Mesh AI State
interface MouthVertex {
    index: number;
    weight: number;
    isLower: boolean;
    ox: number; 
    oy: number;
    oz: number;
    bx: number;
    by: number;
    bz: number;
}
interface MouthMeshData {
    mesh: THREE.Mesh;
    vertices: MouthVertex[];
}
let mouthMeshData: MouthMeshData[] = [];
let talkTilt = 0;
let blinkTimer = 0;
let isBlinking = false;
const blinkDuration = 0.15; // seconds
let blinkProgress = 0;

// Caze & Nodding State
const lookTarget = new THREE.Vector3(0, 0, 5); // Where the avatar is looking
const currentLook = new THREE.Vector3(0, 0, 5); // Smoothed look vector
let nextGazeTime = 0;
let nodTimer = 0;
let isNodding = false;
let nodProgress = 0;
const localEmotion = ref<string | null>(null);

// Caching to prevent jitter
let cachedFaceMetrics: any = null;
let mouthPeakIdx = 30; // Default vertical midline

const MODELS_DIR = '/assets/models/';
const MODEL_CANDIDATES = ['humanoid_base.fbx', 'humanoid_base.glb', 'humanoid_base.obj'];

const init = () => {
    if (!container.value || !canvas.value) return;

    // 1. Scene
    scene = new THREE.Scene();
    scene.background = null; // Will be set by watcher

    // 2. Camera Setup
    const width = container.value.clientWidth || 400;
    const height = container.value.clientHeight || 400;
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    // 3. Renderer
    renderer = new THREE.WebGLRenderer({
        canvas: canvas.value,
        alpha: true,
        antialias: true,
        preserveDrawingBuffer: true
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(2, 4, 5);
    scene.add(mainLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 1.0);
    backLight.position.set(-2, 1, -5);
    scene.add(backLight);

    // 5. Load Content
    loadContent();

    // 6. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enableZoom = true;
    controls.minDistance = 1;
    controls.maxDistance = 10;

    // 7. Handle Resize
    const resizeObserver = new ResizeObserver(() => {
        if (!container.value || !canvas.value) return;
        const w = container.value.clientWidth;
        const h = container.value.clientHeight;
        if (w === 0 || h === 0) return;
        
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
    resizeObserver.observe(container.value);

    // Animation Loop
    const clock = new THREE.Clock();
    const animate = () => {
        animationId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const elapsed = clock.getElapsedTime();

        // 1. Update Layers
        updateLipSync();
        updateEmotions(delta);
        if (morphMeshes.length > 0) {
            updateBlinking(delta);
        }
        
        // Update Behavior
        updateBehaviors(elapsed, delta);
            
        // 2. Head Motion
        if (headMesh) {
            // HARD FREEZE in calibration mode - absolute 0 rotation
            if (props.calibrationMode) {
                headMesh.rotation.y = 0;
                headMesh.rotation.x = 0;
                talkTilt = 0; // Reset talk tilt too
            } else {
                // Combine: Look Target + Talk Tilt + Nodding + Idle Sway
                
                // Smoothed Look (Gaze)
                currentLook.lerp(lookTarget, 0.05);
                
                // Calculate desired rotations from look target
                // Assuming camera at (0,0,3.5), avatar at (0,0,0)
                // If lookTarget.x is positive (right), avatar should rot Y negative to look right? 
                // Actually, standard: rot Y positive = turn left. rot Y negative = turn right.
                // target (2,0,5) -> right side of screen -> avatar looks to ITS left (screen right).
                const lookY = Math.atan2(currentLook.x, currentLook.z) * 0.5; // Gaze Yaw
                const lookX = -Math.atan2(currentLook.y, currentLook.z) * 0.5; // Gaze Pitch
                
                const nodOffset = isNodding ? Math.sin(nodProgress * Math.PI * 2) * 0.15 : 0;
                
                headMesh.rotation.y = lookY + Math.sin(elapsed * 0.5) * 0.02; // + idle sway
                headMesh.rotation.x = lookX + (Math.sin(elapsed * 0.3) * 0.01) + talkTilt + nodOffset;
            }
        }

        controls.update();
        renderer.render(scene, camera);
    };
    animate();
};

// Background Management
const updateBackground = async () => {
    if (!scene) return;
    
    if (props.backgroundUrl) {
        const loader = new THREE.TextureLoader();
        loader.load(props.backgroundUrl, (texture) => {
            scene.background = texture;
        }, undefined, (error) => {
            console.error('[Head3DViewer] Failed to load background:', error);
            scene.background = null;
        });
    } else {
        scene.background = null;
    }
};

// Snapshot for Thumbnail Generation
const takeSnapshot = (): string | null => {
    if (!renderer || !scene || !camera) {
        console.error('[Head3DViewer] Cannot take snapshot: renderer not ready');
        return null;
    }
    
    try {
        renderer.render(scene, camera);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        return dataUrl;
    } catch (error) {
        console.error('[Head3DViewer] Snapshot failed:', error);
        return null;
    }
};

// Expose snapshot method to parent

// Video Recording State
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = [];
let recordingResolve: ((blob: Blob) => void) | null = null;

// Start Video Recording
const startRecording = async (): Promise<void> => {
    if (!renderer || !canvas.value) {
        console.error('[Head3DViewer] Cannot start recording: renderer not ready');
        return;
    }

    try {
        // Capture canvas stream
        const canvasStream = canvas.value.captureStream(30); // 30 FPS
        
        // Create MediaRecorder
        const options = { mimeType: 'video/webm;codecs=vp9' };
        mediaRecorder = new MediaRecorder(canvasStream, options);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            if (recordingResolve) {
                recordingResolve(blob);
                recordingResolve = null;
            }
        };

        mediaRecorder.start();
        console.log('[Head3DViewer] Recording started');
    } catch (error) {
        console.error('[Head3DViewer] Failed to start recording:', error);
        throw error;
    }
};

// Stop Video Recording
const stopRecording = (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            reject(new Error('No active recording'));
            return;
        }

        recordingResolve = resolve;
        mediaRecorder.stop();
        console.log('[Head3DViewer] Recording stopped');
    });
};

const updateLipSync = () => {
    const rawVol = props.speakingVol || 0;
    const boostedVol = Math.sqrt(rawVol) * 2.5;
    // REST POSE: Force vol to 0 during calibration to prevent "lộn xộn" (messy) movement
    const vol = props.calibrationMode ? 0 : Math.min(boostedVol, 1.2); 

    // 1. AI VERTEX ANIMATION (CALIBRATED)
    if (mouthMeshData.length > 0 && cachedFaceMetrics) {
        const { stableHeadWidth, stableCalMouthY } = cachedFaceMetrics;
        const cal = props.faceCalibration || { xOffset: 0, yOffset: 0, zOffset: 0, yScale: 1.0, xScale: 1.0 };
        
        // Unified animation units
        const stableMouthHeightRange = (0.2 * stableHeadWidth) * cal.yScale;
        const speechMaxOpening = stableMouthHeightRange * 1.2;
        
        mouthMeshData.forEach(data => {
            const posAttr = data.mesh.geometry.getAttribute('position');

            data.vertices.forEach(mv => {
                let ty = mv.by;
                let tz = mv.bz;
                
                if (mv.weight > 0.01) {
                    const isLower = mv.oy < stableCalMouthY;
                    
                    if (isLower) {
                        ty = mv.by - (vol * mv.weight * speechMaxOpening);
                        tz = mv.bz + (vol * mv.weight * speechMaxOpening * 0.3);
                    } else {
                        ty = mv.by + (vol * mv.weight * speechMaxOpening * 0.2);
                    }
                }
                
                // LERP for smooth motion
                posAttr.setY(mv.index, THREE.MathUtils.lerp(posAttr.getY(mv.index), ty, 0.25));
                posAttr.setZ(mv.index, THREE.MathUtils.lerp(posAttr.getZ(mv.index), tz, 0.25));
            });
            posAttr.needsUpdate = true;
        });
    }

    // 2. MORPH ANIMATIONS
    if (morphMeshes.length > 0) {
        morphMeshes.forEach((mesh) => {
            if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
            const keys = Object.keys(mesh.morphTargetDictionary!);
            const patterns = ['mouthOpen', 'viseme_aa', 'jawOpen', 'viseme_O', 'Mouth_1'];
            
            let mouthIdx = -1;
            for (const pattern of patterns) {
                const lowerPattern = pattern.toLowerCase();
                const foundKey = keys.find(k => k.toLowerCase().includes(lowerPattern));
                if (foundKey) {
                    mouthIdx = mesh.morphTargetDictionary![foundKey];
                    break;
                }
            }

            if (mouthIdx !== -1) {
                mesh.morphTargetInfluences[mouthIdx] = THREE.MathUtils.lerp(
                    mesh.morphTargetInfluences[mouthIdx],
                    vol,
                    0.3
                );
            }
        });
    }

    // 3. procedural head motion (Reduced intensity)
    if (headMesh) {
        const targetTilt = Math.sin(Date.now() * 0.005) * vol * 0.03;
        talkTilt = THREE.MathUtils.lerp(talkTilt, targetTilt, 0.1);
    }
};

const updateEmotions = (delta: number) => {
    if (morphMeshes.length === 0) return;

    const emotion = (localEmotion.value || props.emotion || 'neutral').toLowerCase();
    
    morphMeshes.forEach((mesh) => {
        if (!mesh.morphTargetDictionary || !mesh.morphTargetInfluences) return;
        const dict = mesh.morphTargetDictionary;
        const influences = mesh.morphTargetInfluences;

        // Map standard emotions to morph targets
        const emotionMap: Record<string, string[]> = {
            joy: ['joy', 'happy', 'fun', 'smile'],
            sorrow: ['sorrow', 'sad'],
            angry: ['angry'],
            surprise: ['surprise', 'surprised'],
            neutral: []
        };

        const targetKeys = emotionMap[emotion] || [];
        
        // Find matching keys in the dictionary
        Object.keys(dict).forEach(key => {
            const lowerKey = key.toLowerCase();
            
            // Check if this key belongs to the current emotion
            const isMatch = targetKeys.some(tk => lowerKey.includes(tk));
            
            // Expose mouth patterns to avoid conflict with lipsync
            const isMouth = ['mouthopen', 'jawopen', 'viseme'].some(p => lowerKey.includes(p));
            if (isMouth) return;

            // Target influence: 0.8 if match, 0 if neutral or different emotion
            const targetVal = isMatch ? 0.8 : 0;
            
            // Smoothly interpolate to target
            const idx = dict[key];
            influences[idx] = THREE.MathUtils.lerp(influences[idx], targetVal, 0.1);
        });
    });
};

const updateBehaviors = (elapsed: number, delta: number) => {
    // Restored head tilt logic
    if (headMesh) {
        const rawVol = props.speakingVol || 0;
        const targetTilt = Math.sin(Date.now() * 0.005) * rawVol * 0.03;
        talkTilt = THREE.MathUtils.lerp(talkTilt, targetTilt, 0.1);
    }

    // 1. Gaze Logic
    if (Date.now() > nextGazeTime) {
        if (props.speakingVol && props.speakingVol > 0.01) {
             nextGazeTime = Date.now() + 1000 + Math.random() * 2000;
        } else if (props.isThinking) {
             // Thinking: Look UP and slightly away
             lookTarget.set(1, 2, 5);
             nextGazeTime = Date.now() + 500;
        } else if (props.isHostSpeaking) {
             // If listening, look at camera INTENTLY
             lookTarget.set(0, 0, 5);
             nextGazeTime = Date.now() + 500; // Keep refreshing
        } else {
             // Idle Mode: Look around naturally
             // Range: X [-2, 2], Y [-1, 1]
             const rx = (Math.random() - 0.5) * 3;
             const ry = (Math.random() - 0.5) * 1.5;
             lookTarget.set(rx, ry, 5);
             nextGazeTime = Date.now() + 2000 + Math.random() * 4000;
        }
    }
    
    // 1b. Gesture Logic (Simple Proc Animations)
    if (props.gesture === 'nod') {
        if (!isNodding) {
            isNodding = true;
            nodProgress = 0;
        }
    }
    
    // 2. Listening Nod Logic
    if (props.isHostSpeaking && !props.speakingVol) {
        if (!isNodding && Date.now() > nodTimer) {
             // Trigger nod randomly
             if (Math.random() > 0.7) {
                 isNodding = true;
                 nodProgress = 0;
             }
             nodTimer = Date.now() + 2000 + Math.random() * 3000;
        }
    }
    
    if (isNodding) {
        nodProgress += delta * 4; // speed of nod
        if (nodProgress >= 1) {
            isNodding = false;
            nodProgress = 0;
        }
    }
};

const updateBlinking = (delta: number) => {
    blinkTimer -= delta;
    if (blinkTimer <= 0 && !isBlinking) {
        isBlinking = true;
        blinkProgress = 0;
    }

    if (isBlinking) {
        blinkProgress += delta / blinkDuration;
        const blinkAmount = Math.sin(Math.min(blinkProgress, 1) * Math.PI);

        morphMeshes.forEach(mesh => {
            if (!mesh.morphTargetDictionary) return;
            
            const blinkLeft = mesh.morphTargetDictionary['eyeBlinkLeft'] ?? mesh.morphTargetDictionary['EyeBlinkLeft'] ?? mesh.morphTargetDictionary['eyeBlink_L'];
            const blinkRight = mesh.morphTargetDictionary['eyeBlinkRight'] ?? mesh.morphTargetDictionary['EyeBlinkRight'] ?? mesh.morphTargetDictionary['eyeBlink_R'];

            if (blinkLeft !== undefined) mesh.morphTargetInfluences![blinkLeft] = blinkAmount;
            if (blinkRight !== undefined) mesh.morphTargetInfluences![blinkRight] = blinkAmount;
        });

        if (blinkProgress >= 1) {
            isBlinking = false;
            blinkTimer = 2 + Math.random() * 4;
        }
    }
};

const loadModelFile = (url: string): Promise<THREE.Object3D> => {
    return new Promise((resolve, reject) => {
        const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
        
        if (ext === 'glb' || ext === 'gltf') {
            const loader = new GLTFLoader();
            loader.setCrossOrigin('anonymous');
            loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
        } else if (ext === 'fbx') {
            const loader = new FBXLoader();
            loader.setCrossOrigin('anonymous');
            loader.load(url, (fbx) => resolve(fbx), undefined, reject);
        } else if (ext === 'obj') {
            const loader = new OBJLoader();
            loader.setCrossOrigin('anonymous');
            loader.load(url, (obj) => resolve(obj), undefined, reject);
        } else {
            reject(new Error(`Unsupported format: .${ext}`));
        }
    });
};

// --- AI PIPELINE: Face Analysis ---
// --- AI PIPELINE: Face Analysis ---
const runFaceAnalysis = async (imgUrl: string) => {
    try {
        const results = await faceLandmarkService.detect(imgUrl as any);
        if (results && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            
            // Extract Mouth Region (MediaPipe landmarks for lips)
            const mouthLandmarks = [0, 13, 14, 17, 37, 39, 40, 61, 78, 80, 81, 82, 84, 87, 88, 91, 95, 146, 178, 181, 191, 267, 269, 270, 271, 272, 291, 308, 310, 311, 312, 314, 317, 318, 321, 324, 375, 402, 405, 415];
            
            const bounds = {
                minX: 1, maxX: 0, minY: 1, maxY: 0
            };
            
            mouthLandmarks.forEach(idx => {
                const pt = landmarks[idx];
                if (pt.x < bounds.minX) bounds.minX = pt.x;
                if (pt.x > bounds.maxX) bounds.maxX = pt.x;
                if (pt.y < bounds.minY) bounds.minY = pt.y;
                if (pt.y > bounds.maxY) bounds.maxY = pt.y;
            });

            // Pad bounds slightly
            const padding = 0.05;
            bounds.minX -= padding;
            bounds.maxX += padding;
            bounds.minY -= padding;
            bounds.maxY += padding;

            console.log('[Head3DViewer] AI Portrait Analysis complete. Mouth bounds detected:', bounds);
            return { 
                bounds, 
                rawLandmarks: landmarks // Store landmarks for wireframe
            };
        } else {
            console.warn('[Head3DViewer] AI Analysis: No face found in texture');
            return null;
        }
    } catch (e) {
        console.error('[Head3DViewer] AI Analysis Failed:', e);
        return null;
    }
};

const tryLoadModels = async (candidates: string[]): Promise<THREE.Object3D> => {
    for (const filename of candidates) {
        try {
            let fullUrl = getFileUrl(filename);
            // if (!filename.startsWith('http') && !filename.startsWith('blob:') && !filename.startsWith('/') && !filename.startsWith('data:')) {
            //      fullUrl = MODELS_DIR + filename;
            // }
            const model = await loadModelFile(fullUrl);
            console.log('[Head3DViewer] Model loaded:', fullUrl);
            return model;
        } catch (e) {
            console.warn(`[Head3DViewer] Failed candidate ${filename}:`, e);
        }
    }
    throw new Error('All model candidates failed');
};

const loadContent = async () => {
    if (!scene) return;
    loading.value = true;
    
    try {
        // 1. Load Model First
        const candidates = props.modelUrl ? [props.modelUrl] : MODEL_CANDIDATES;
        const model = await tryLoadModels(candidates);
        
        // Remove old mesh if exists
        if (headMesh) {
            scene.remove(headMesh);
            cachedFaceMetrics = null; // Clear scan cache
        }
        
        headMesh = model;
        
        // 2. Setup Morph Targets
        morphMeshes = [];
        console.log('[Head3DViewer] Starting traverse on:', headMesh.type, headMesh.name);
        
        headMesh.traverse((child) => {
            // Log every mesh found for debugging
            if (child.type === 'Mesh' || child.type === 'SkinnedMesh') {
                const mesh = child as THREE.Mesh;
                const hasMorphs = !!(mesh.morphTargetInfluences && mesh.morphTargetDictionary);
                
                console.log(`[Head3DViewer] Found mesh: ${mesh.name}, type: ${mesh.type}, morphs: ${hasMorphs}`);
                
                if (hasMorphs) {
                    morphMeshes.push(mesh);
                    console.log(`[Head3DViewer] Morph targets for ${mesh.name}:`, Object.keys(mesh.morphTargetDictionary!));
                }
                
                const posAttr = mesh.geometry.getAttribute('position');
                // Capture Absolute Original Positions to prevent shifting baseline
                if (posAttr) {
                    mesh.userData.originalPos = new Float32Array(posAttr.array);
                }

                // Fix transparency/side issues
                if (mesh.material) {
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                    materials.forEach(m => {
                        m.side = THREE.DoubleSide;
                        m.transparent = false;
                        m.alphaTest = 0.5;
                        m.depthWrite = true;
                        m.depthTest = true;
                        m.needsUpdate = true;
                    });
                }
            }
        });
        
        if (morphMeshes.length > 0) {
            console.log('[Head3DViewer] Morph Targets found:');
            morphMeshes.forEach(mesh => {
                const dict = mesh.morphTargetDictionary!;
                const influences = mesh.morphTargetInfluences!;
                Object.keys(dict).forEach(key => {
                    const idx = dict[key];
                    console.log(`  - ${key}: ${influences[idx]}`);
                    
                    // NEUTRALIZE IDLE SMILE: If the model has a baked smile, force it to 0
                    const lowerKey = key.toLowerCase();
                    if (lowerKey.includes('smile') || lowerKey.includes('cheek') || lowerKey.includes('grin') || lowerKey.includes('joy')) {
                        console.log(`[Head3DViewer] Neutralizing idle morph: ${key}`);
                        influences[idx] = 0;
                    }
                });
            });
        }

        // 3. Robust Centering and Scaling
        const box = new THREE.Box3().setFromObject(headMesh);
        const center = box.getCenter(new THREE.Vector3());
        headMesh.position.set(-center.x, -center.y, -center.z);
        
        // Create an outer wrapper for easy rotation/sway
        const wrapper = new THREE.Group();
        wrapper.add(headMesh);
        
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 0) {
            const baseScale = 2.0 / maxDim;
            wrapper.scale.setScalar(baseScale);
        }

        scene.add(wrapper);
        headMesh = wrapper; // Assign wrapper to headMesh for animations

        // 4. Lighting Reinforcement (Ensure only one spotLight)
        const oldLight = scene.getObjectByName('reinforcementLight');
        if (oldLight) scene.remove(oldLight);

        const spotLight = new THREE.SpotLight(0xffffff, 10);
        spotLight.name = 'reinforcementLight';
        spotLight.position.set(0, 5, 5);
        scene.add(spotLight);

        // 5. Load & Apply Texture
        if (props.textureUrl) {
            // Run AI analysis on texture to find facial parts
            facialMetadata = await runFaceAnalysis(props.textureUrl);
            cachedFaceMetrics = null; // Clear scan cache on texture change
            
            if (!props.preserveMaterials) {
                const textureLoader = new THREE.TextureLoader();
                textureLoader.setCrossOrigin('anonymous');
                textureLoader.load(props.textureUrl, (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.flipY = false;
                    applyTextureToRef(headMesh, texture);
                }, undefined, (err) => {
                    console.error('[Head3DViewer] Texture load failed:', err);
                });
            }
        }

        // 6. Pre-calculate Vertex Mapping for AI Fallback & Biasing
        if (facialMetadata && headMesh) {
            setupVertexMapping();
        }

    } catch (err) {
        console.error('[Head3DViewer] Load content failed:', err);
    } finally {
        loading.value = false;
    }
};

// --- 3D FACE MASK HUD LOGIC ---

const updateMaskOverlay = () => {
    if (!scene || !facialMetadata) return;
    
    // Create group if missing
    if (!aiMaskGroup) {
        aiMaskGroup = new THREE.Group();
        scene.add(aiMaskGroup);
    }
    
    // Clear old lines
    while(aiMaskGroup.children.length > 0) {
        const child = aiMaskGroup.children[0];
        if ((child as THREE.Line).geometry) (child as THREE.Line).geometry.dispose();
        aiMaskGroup.remove(child);
    }
    
    aiMaskGroup.visible = !!props.calibrationMode;
    if (!aiMaskGroup.visible) return;

    // Build the "Wireframe" from landmarks
    const landmarks = facialMetadata.rawLandmarks;
    const material = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
    
    // Core Face Outlines (MediaPipe indices)
    const contours = [
        [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33], // Left Eye
        [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263], // Right Eye
        [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78, 61], // Mouth Outer
        [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78] // Mouth Inner
    ];

    const box = new THREE.Box3().setFromObject(headMesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    
    const cal = props.faceCalibration || { xOffset: 0, yOffset: 0, zOffset: 0, yScale: 1.0, xScale: 1.0 };
    
    // Positioning the Mask
    aiMaskGroup.position.set(
        center.x + (cal.xOffset * size.x),
        center.y + (cal.yOffset * size.y),
        box.max.z + (cal.zOffset * size.z)
    );
    
    // Use a UNIFORM scale based on width to prevent "méo" (distortion) on bust models
    const uniformBase = size.x;
    aiMaskGroup.scale.set(uniformBase * cal.yScale, uniformBase * cal.yScale, uniformBase * cal.yScale);

    contours.forEach(loop => {
        const points: THREE.Vector3[] = [];
        loop.forEach(idx => {
            const landmark = landmarks[idx];
            points.push(new THREE.Vector3(
                (landmark.x - 0.5),
                -(landmark.y - 0.5), // Invert Y
                0
            ));
        });
        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, material);
        aiMaskGroup.add(line);
    });
};

const setupVertexMapping = () => {
    // --- RESET PREVIOUS MAPPING ---
    mouthMeshData.forEach(m => {
        const posAttr = m.mesh.geometry.getAttribute('position');
        const colorAttr = m.mesh.geometry.getAttribute('color');
        
        // RESET TO ABSOLUTE ORIGINAL POSITIONS (Preventing "tam sao thất bản")
        if (m.mesh.userData.originalPos) {
            posAttr.array.set(m.mesh.userData.originalPos);
        } else {
            // Fallback to mv.ox/oy/oz if originalPos is missing for some reason
            m.vertices.forEach(v => {
                posAttr.setXYZ(v.index, v.ox, v.oy, v.oz);
            });
        }
        
        posAttr.needsUpdate = true;
        if (colorAttr) {
            colorAttr.array.fill(1); // WIPE ALL COLORS TO WHITE
            colorAttr.needsUpdate = true;
        }
    });
    mouthMeshData = [];
    if (!headMesh || !facialMetadata) return;

    // --- SETUP AI WIREFRAME MASK ---
    updateMaskOverlay();

    // Calculate center of mouth for weighting
    const { bounds, rawLandmarks } = facialMetadata;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const rx = (facialMetadata.maxX - facialMetadata.minX) / 2;
    const ry = (facialMetadata.maxY - facialMetadata.minY) / 2;

    const box = new THREE.Box3().setFromObject(headMesh);
    const size = box.getSize(new THREE.Vector3());
    const modelScale = size.y / 2;

    // Add 10% padding for better coverage
    const paddingX = (facialMetadata.maxX - facialMetadata.minX) * 0.1;
    const paddingY = (facialMetadata.maxY - facialMetadata.minY) * 0.1;
    const minX = facialMetadata.minX - paddingX;
    const maxX = facialMetadata.maxX + paddingX;
    const minY = facialMetadata.minY - paddingY;
    const maxY = facialMetadata.maxY + paddingY;

    headMesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh && (child as THREE.Mesh).geometry) {
            const mesh = child as THREE.Mesh;
            const geo = mesh.geometry;
            const uvAttr = geo.getAttribute('uv');
            const posAttr = geo.getAttribute('position');

            if (uvAttr && posAttr) {
                // Use mesh-local bounding box for precise depth filtering
                geo.computeBoundingBox();
                const b = geo.boundingBox!;
                const s = b.getSize(new THREE.Vector3());

                // --- PHASE 1 & 2: GEOMETRIC SCAN (CACHED) ---
                if (!cachedFaceMetrics) {
                    console.log(`[Head3DViewer] Running heavy geometric scan on "${mesh.name}"...`);
                    
                    // --- PHASE 1: GEOMETRIC Sagittal Scan (X-Axis) ---
                    const xBuckets = 50;
                    const xHistogram = new Array(xBuckets).fill(0);
                    for (let i = 0; i < posAttr.count; i++) {
                        const oz = posAttr.getZ(i);
                        if (oz > b.max.z - (s.z * 0.15)) {
                            const xPct = (posAttr.getX(i) - b.min.x) / s.x;
                            const bx = Math.floor(xPct * xBuckets);
                            if (bx >= 0 && bx < xBuckets) xHistogram[bx]++;
                        }
                    }
                    
                    let maxXCount = 0;
                    let xPeakIdx = -1;
                    for (let j = 0; j < xBuckets; j++) {
                        if (xHistogram[j] > maxXCount) {
                            maxXCount = xHistogram[j];
                            xPeakIdx = j;
                        }
                    }
                    const sagittalMidlinePct = (xPeakIdx + 0.5) / xBuckets;
                    const sagittalMidlineX = b.min.x + sagittalMidlinePct * s.x;

                    // --- PHASE 2: GEOMETRIC Vertical Scan (Y-Axis) ---
                    const yBuckets = 60;
                    const yHistogram = new Array(yBuckets).fill(0);
                    for (let i = 0; i < posAttr.count; i++) {
                        const ox = posAttr.getX(i);
                        const oz = posAttr.getZ(i);
                        if (Math.abs(ox - sagittalMidlineX) < (s.x * 0.12) && oz > b.max.z - (s.z * 0.15)) {
                            const yPct = (posAttr.getY(i) - b.min.y) / s.y;
                            const by = Math.floor(yPct * yBuckets);
                            if (by >= 0 && by < yBuckets) yHistogram[by]++;
                        }
                    }

                    const peaks: { idx: number, count: number }[] = [];
                    for (let j = 1; j < yBuckets - 1; j++) {
                        if (yHistogram[j] > yHistogram[j-1] && yHistogram[j] > yHistogram[j+1] && yHistogram[j] > 10) {
                            peaks.push({ idx: j, count: yHistogram[j] });
                        }
                    }
                    
                    let maxCount = 0;
                    let peakIdx = -1;
                    for (let j = Math.floor(yBuckets * 0.1); j < Math.floor(yBuckets * 0.9); j++) {
                        if (yHistogram[j] > maxCount) {
                            maxCount = yHistogram[j];
                            peakIdx = j;
                        }
                    }

                    let mouthPeak = { idx: peakIdx, count: maxCount };
                    const facePeaks = peaks.filter(p => (p.idx / yBuckets) > 0.1 && (p.idx / yBuckets) < 0.9);
                    if (facePeaks.length >= 2) {
                        facePeaks.sort((a, b) => a.idx - b.idx);
                        mouthPeak = facePeaks[0];
                    }

                    const autoMouthCenterY = (mouthPeak.idx + 0.5) / yBuckets;
                    const autoMouthCenterWorldY = b.min.y + autoMouthCenterY * s.y;

                    cachedFaceMetrics = {
                        sagittalMidlineX,
                        autoMouthCenterWorldY,
                        mouthPeakIdx: mouthPeak.idx,
                        stableHeadWidth: s.x, // GLOBAL ANCHOR
                        stableCalMouthY: autoMouthCenterWorldY // GLOBAL BASELINE
                    };
                }

                const { sagittalMidlineX, autoMouthCenterWorldY, stableHeadWidth, stableCalMouthY } = cachedFaceMetrics;
                mouthPeakIdx = cachedFaceMetrics.mouthPeakIdx;
                
                // --- 3D MASK MOUTH CALCULATION ---
                const cal = props.faceCalibration || { xOffset: 0, yOffset: 0, zOffset: 0, yScale: 1.0, xScale: 1.0, zDepth: 1.0 };
                
                // GLOBAL STABLE METRICS: All meshes now use these standard units
                const calCenterWorldX = sagittalMidlineX + (cal.xOffset * stableHeadWidth);
                const calCenterWorldY = stableCalMouthY + (cal.yOffset * stableHeadWidth * 0.5); 
                const calCenterWorldZ = b.max.z + (cal.zOffset * s.z);
                
                const calHeightRange = (0.2 * stableHeadWidth) * cal.yScale; 
                const calWidthRange = (0.3 * stableHeadWidth) * cal.xScale;
                const calDepthLimit = calCenterWorldZ - (s.z * (0.08 * (cal.zDepth || 1.5)));

                console.log(`[Head3DViewer] Mask Center: X=${calCenterWorldX.toFixed(2)}, Y=${calCenterWorldY.toFixed(2)}, Z=${calCenterWorldZ.toFixed(2)}`);

                // --- PHASE 3: COLLECT & BIAS ---
                const currentMeshVertices: MouthVertex[] = [];
                for (let i = 0; i < uvAttr.count; i++) {
                    const ox = posAttr.getX(i);
                    const oy = posAttr.getY(i);
                    const oz = posAttr.getZ(i);

                    if (Math.abs(oy - calCenterWorldY) < calHeightRange && 
                        Math.abs(ox - calCenterWorldX) < calWidthRange && 
                        oz > calDepthLimit) {
                        
                        const dx = (ox - calCenterWorldX) / calWidthRange;
                        const dy = (oy - calCenterWorldY) / calHeightRange;
                        const distSq = dx * dx + dy * dy;
                        const weight = Math.exp(-distSq * 30.0); 
                        
                        const isLower = oy < calCenterWorldY;
                        
                        currentMeshVertices.push({ 
                            index: i, weight, isLower, 
                            ox, oy, oz,
                            bx: ox, by: oy, bz: oz
                        });
                    }
                }
                
                    if (currentMeshVertices.length > 0) {
                        // PROPORTIONAL INTENSITY: Scale forces to match the actual calibrated height
                        // This prevents the "beak" look by ensuring lips don't cross over each other.
                        // PROPORTIONAL INTENSITY: Softened for natural rest pose
                        const closureIntensity = calHeightRange * 0.45; 
                        const smileIntensity = calHeightRange * 0.05;   
                        const tuckIntensity = calHeightRange * 0.15; 
                        
                        if (!geo.getAttribute('color')) {
                            geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(posAttr.count * 3).fill(1), 3));
                        }
                        const colorAttr = geo.getAttribute('color');
    
                        currentMeshVertices.forEach(mv => {
                            const dx = (mv.ox - sagittalMidlineX) / calWidthRange;
                            const dy = (mv.oy - calCenterWorldY) / calHeightRange;
                            const distSq = dx * dx + dy * dy;
                            
                            // SMOOTH WEIGHT: Natural falloff for REST POSE
                            const weight = Math.exp(-distSq * 30.0); 
                            
                            // HYBRID BIAS: Only deform the mesh if NOT in calibration mode
                            if (!props.calibrationMode) {
                                if (mv.isLower) mv.by = mv.oy + (closureIntensity * weight);
                                else mv.by = mv.oy - (closureIntensity * weight);
                                
                                mv.bz = mv.oz - (tuckIntensity * weight);
                                
                                const cornerWeight = Math.abs(dx);
                                if (cornerWeight > 0.6) mv.by += smileIntensity * (cornerWeight - 0.6) * weight;
                                
                                // Store the specific weight used for animation
                                // Use a SHARPER weight for speech to isolate lips from chin
                                mv.weight = Math.exp(-distSq * 45.0); 
                            } else {
                                // Calibration mode resets to raw original positions
                                mv.by = mv.oy;
                                mv.bz = mv.oz;
                                mv.weight = weight;
                            }
    
                            posAttr.setXYZ(mv.index, mv.bx, mv.by, mv.bz);
                        
                        // Calibration Highlight - Only glow if relevant weight exists
                        if (props.calibrationMode) {
                            if (mv.weight > 0.05) {
                                // Fade from red to white based on weight
                                colorAttr.setXYZ(mv.index, 1, 1 - mv.weight, 1 - mv.weight); 
                            } else {
                                colorAttr.setXYZ(mv.index, 1, 1, 1);
                            }
                        } else {
                            colorAttr.setXYZ(mv.index, 1, 1, 1);
                        }
                    });
                    
                    posAttr.needsUpdate = true;
                    colorAttr.needsUpdate = true;
                    if (mesh.material) (mesh.material as any).vertexColors = true;

                    mouthMeshData.push({ mesh, vertices: currentMeshVertices });
                    console.log(`[Head3DViewer] SUCCESS: Mapped ${currentMeshVertices.length} / ${posAttr.count} vertices on "${mesh.name}"`);
                } else {
                    console.log(`[Head3DViewer] MESH FAILED: 0 vertices caught on "${mesh.name}". Check bounds.`);
                }
            }
        }
    });

    console.log(`[Head3DViewer] AI Pipeline: Activated on ${mouthMeshData.length} sub-meshes. Mode: Hybrid Bias.`);
};


// --- 3D FACE MASK HUD LOGIC ---
const applyTextureToRef = (object: THREE.Object3D, texture: THREE.Texture) => {
    object.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            
            materials.forEach((mat, idx) => {
                const cloned = mat.clone() as THREE.MeshStandardMaterial;
                if (cloned.map !== undefined) {
                    cloned.map = texture;
                    cloned.needsUpdate = true;
                }
                
                if (Array.isArray(mesh.material)) {
                    mesh.material[idx] = cloned;
                } else {
                    mesh.material = cloned;
                }
            });
        }
    });
};

// Watch for changes
watch([() => props.textureUrl, () => props.modelUrl], () => {
    loadContent();
});

watch(() => props.calibrationMode, () => {
    setupVertexMapping();
});

watch(() => props.faceCalibration, () => {
    setupVertexMapping();
}, { deep: true });

// Watch for background changes
watch(() => props.backgroundUrl, () => {
    updateBackground();
}, { immediate: true });

// Expose methods to parent
const captureSnapshot = async (): Promise<Blob | null> => {
    if (!renderer || !scene || !camera) return null;
    renderer.render(scene, camera); // Ensure fresh frame
    return new Promise((resolve) => {
        canvas.value?.toBlob((blob) => {
            resolve(blob);
        }, 'image/png');
    });
};

const captureVideo = async (durationMs: number = 3000, audioTrack?: MediaStreamTrack): Promise<Blob | null> => {
    if (!canvas.value) return null;
    
    try {
        const stream = canvas.value.captureStream(30); // 30 FPS
        
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

const setExpression = (expression: string) => {
    localEmotion.value = expression;
    // Auto reset after 10s if it's a tool call? Or just leave it.
    // Usually tool calls set a state.
};

const setMood = (mood: string) => {
    localEmotion.value = mood;
};

const playAnimation = (animation: string) => {
    const lower = animation.toLowerCase();
    if (lower.includes('nod')) {
        isNodding = true;
        nodProgress = 0;
    }
};

defineExpose({
    captureSnapshot,
    captureVideo,
    setExpression,
    setMood,
    playAnimation,
    playMotion: playAnimation // Alias
});

onMounted(() => {
    init();
    updateBackground();
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animationId);
    renderer?.dispose();
    controls?.dispose();
});
</script>
