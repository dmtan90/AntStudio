/// <reference lib="webworker" />

import {
    createBilateralFilterShader,
    createGaussianBlurShader,
    createUnsharpMaskShader,
    createBrightnessShader,
    createDenoiseShader,
    createVirtualBackgroundShader,
    createBlurCompositeShader,
    createChromaKeyShader,
    createColorGradingShader,
    createAlphaBlendShader,
    createFullScreenQuad,
    createUnitQuad,
    renderWithShader,
    type ShaderProgram
} from '../utils/webgl/WebGLShaders';
import { WebGLUtils } from '../utils/webgl/WebGLUtils';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Three.js instances for 3D guests
const threeGuests = new Map<string, {
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    renderer: THREE.WebGLRenderer,
    renderTarget: THREE.WebGLRenderTarget,
    model?: THREE.Group,
    mixer?: THREE.AnimationMixer,
    isThinking?: boolean
}>();

function init3DGuest(id: string, modelUrl: string, textureUrl: string) {
    if (threeGuests.has(id)) return;

    console.log(`[Worker] Initializing 3D Guest: ${id}, Model: ${modelUrl}`);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.4, 2.5); // Adjust camera to focus on upper body
    camera.lookAt(0, 1.4, 0);

    // Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(2, 2, 5);
    scene.add(directionalLight);

    // Renderer (Targets an internal canvas for bitmap transfer)
    const offscreenCanvas = new OffscreenCanvas(512, 512);
    const renderer = new THREE.WebGLRenderer({ 
        canvas: offscreenCanvas,
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(512, 512, false);
    renderer.setClearColor(0x000000, 0);

    const loader = new GLTFLoader();
    if (authToken) {
        loader.setRequestHeader({ Authorization: `Bearer ${authToken}` });
    }

    // Phase 64: Defensive check for model URL
    if (!modelUrl || (!modelUrl.toLowerCase().endsWith('.glb') && !modelUrl.toLowerCase().endsWith('.vrm'))) {
        console.warn(`[Worker] Skipping 3D initialization for ${id}: Invalid or non-3D model URL: ${modelUrl}`);
        return;
    }

    loader.load(modelUrl, (gltf) => {
        const model = gltf.scene;

        // Apply custom texture if provided
        if (textureUrl) {
            const texLoader = new THREE.ImageBitmapLoader();
            if (authToken) {
                texLoader.setRequestHeader({ Authorization: `Bearer ${authToken}` });
            }
            texLoader.setOptions({ imageOrientation: 'flipY' }); // Handle Y-flip correctly
            texLoader.load(textureUrl, (imageBitmap) => {
                const texture = new THREE.Texture(imageBitmap);
                texture.needsUpdate = true;

                model.traverse((child: any) => {
                    if (child.isMesh && (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('face'))) {
                        child.material.map = texture;
                        child.material.needsUpdate = true;
                    }
                });
                requestRender();
            });
        }

        scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        threeGuests.set(id, { scene, camera, renderer, renderTarget: null as any, model, mixer });

        console.log(`[Worker] 3D Guest ${id} loaded successfully`);
        requestRender();
    }, undefined, (err) => {
        console.error(`[Worker] Failed to load 3D model: ${err}`);
    });
}

const blendShapeMapping: Record<string, string[]> = {
    'browInnerUp': ['Surprise'],
    'browDownLeft': ['Angry'],
    'browDownRight': ['Angry'],
    'browOuterUpLeft': ['Surprise'],
    'browOuterUpRight': ['Surprise'],
    'eyeBlinkLeft': ['Blink', 'Blink_L'],
    'eyeBlinkRight': ['Blink', 'Blink_R'],
    'eyeWideLeft': ['Surprise'],
    'eyeWideRight': ['Surprise'],
    'jawOpen': ['A', 'jawOpen', 'mouthOpen'],
    'mouthFunnel': ['U', 'O'],
    'mouthPucker': ['U'],
    'mouthSmileLeft': ['Joy', 'Fun'],
    'mouthSmileRight': ['Joy', 'Fun'],
    'mouthFrownLeft': ['Sorrow', 'Angry'],
    'mouthFrownRight': ['Sorrow', 'Angry'],
    'mouthDimpleLeft': ['Joy'],
    'mouthDimpleRight': ['Joy'],
    'mouthStretchLeft': ['I'],
    'mouthStretchRight': ['I'],
    'eyeLookInLeft': ['eyeLookInLeft', 'eyeIn_L'],
    'eyeLookInRight': ['eyeLookInRight', 'eyeIn_R'],
    'eyeLookOutLeft': ['eyeLookOutLeft', 'eyeOut_L'],
    'eyeLookOutRight': ['eyeLookOutRight', 'eyeOut_R'],
    'eyeLookUpLeft': ['eyeLookUpLeft', 'eyeUp_L'],
    'eyeLookUpRight': ['eyeLookUpRight', 'eyeUp_R'],
    'eyeLookDownLeft': ['eyeLookDownLeft', 'eyeDown_L'],
    'eyeLookDownRight': ['eyeLookDownRight', 'eyeDown_R'],
};

function update3DAnimations(id: string, audioLevel: number) {
    const guest = threeGuests.get(id);
    if (!guest || !guest.model) return;

    // Use latest MoCap data if available and for the right guest
    const isHost = id === 'host' || (slotMap.get('host')?.id === id);
    if (isHost && latestFaceData && latestFaceData.blendshapes) {
        applyMoCapToAvatar(guest, latestFaceData);
        return;
    }

    // Fallback: Micro-expression (Audio-driven)
    guest.model.traverse((child: any) => {
        if (child.isMesh && child.morphTargetInfluences) {
            const targets = child.morphTargetDictionary;
            if (targets) {
                if (targets['jawOpen']) child.morphTargetInfluences[targets['jawOpen']] = audioLevel * 1.5;
                else if (targets['mouthOpen']) child.morphTargetInfluences[targets['mouthOpen']] = audioLevel * 1.5;
                else if (targets['A']) child.morphTargetInfluences[targets['A']] = audioLevel * 1.5;
            }
        }
    });

    sceneDirty = true;
}

function applyMoCapToAvatar(guest: any, faceData: any) {
    if (!guest.model || !faceData.blendshapes) return;

    const blendshapes = faceData.blendshapes;
    
    guest.model.traverse((child: any) => {
        if (child.isMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
            const targets = child.morphTargetDictionary;
            
            // Map MediaPipe categories to model morph targets
            blendshapes.forEach((category: any) => {
                const targetNames = blendShapeMapping[category.categoryName];
                if (targetNames) {
                    targetNames.forEach(name => {
                        if (targets[name] !== undefined) {
                            // Apply smoothing/interpolation if needed, but here we just set it
                            child.morphTargetInfluences[targets[name]] = category.score;
                        }
                    });
                }
            });
        }

        // Apply head rotation if matrix is available
        if (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck')) {
            if (faceData.matrix) {
                const m = new THREE.Matrix4().fromArray(faceData.matrix.array);
                const rotation = new THREE.Euler().setFromRotationMatrix(m);
                
                // Fine-tune Euler rotation for typical face orientation
                // MediaPipe matrix is in camera space
                child.rotation.x = rotation.x;
                child.rotation.y = rotation.y;
                child.rotation.z = rotation.z;
            }
        }
    });
}

/**
 * Apply subtle idle movements to make the AI guest feel alive
 */
function applyIdleState(guest: any, time: number) {
    if (!guest.model) return;

    // Subtle breathing (slight vertical scale oscillation)
    const breathing = Math.sin(time / 2000) * 0.005;
    guest.model.scale.set(1 + breathing, 1 + breathing, 1 + breathing);

    // Skip idle rotation if active MoCap is driving the head
    const hasMoCap = latestFaceData && latestFaceData.matrix;

    // Random micro-movements on head/neck if found
    guest.model.traverse((child: any) => {
        if (child.isMesh) {
            // Cognitive Glow: If thinking, make eyes or head parts emit a blue light
            if (guest.isThinking && (child.name.toLowerCase().includes('eye') || child.name.toLowerCase().includes('head'))) {
                if (child.material && child.material.emissive) {
                    const glow = (Math.sin(time / 100) + 1) * 0.5; // Pulsing
                    child.material.emissive.setRGB(0.1 * glow, 0.4 * glow, 1.0 * glow);
                    child.material.emissiveIntensity = 2.0 * glow;
                }
            } else if (child.material && child.material.emissive) {
                // Reset emissive
                child.material.emissive.setRGB(0, 0, 0);
            }

            if (!hasMoCap && (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck'))) {
                // If thinking, faster oscillation to signal "calculating"
                if (guest.isThinking) {
                    child.rotation.z = Math.sin(time / 200) * 0.05;
                    child.rotation.x = Math.cos(time / 150) * 0.03;
                } else {
                    child.rotation.z = Math.sin(time / 3000) * 0.02;
                    child.rotation.x = Math.cos(time / 2500) * 0.01;
                }
            }
        }
    });

    sceneDirty = true;
}

let canvas: OffscreenCanvas | null = null;
let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null;

// Shader Programs
let bilateralShader: ShaderProgram | null = null;
let blurHorizontalShader: ShaderProgram | null = null;
let blurVerticalShader: ShaderProgram | null = null;
let blurCompositeShader: ShaderProgram | null = null;
let sharpenShader: ShaderProgram | null = null;
let brightnessShader: ShaderProgram | null = null;
let denoiseShader: ShaderProgram | null = null;
let virtualBgShader: ShaderProgram | null = null;
let chromaKeyShader: ShaderProgram | null = null;
let colorGradingShader: ShaderProgram | null = null;
let alphaBlendShader: ShaderProgram | null = null;
let compositeProgram: WebGLProgram | null = null;

// Geometry
let fullScreenQuad: { positionBuffer: WebGLBuffer; texCoordBuffer: WebGLBuffer } | null = null;
let unitQuad: { positionBuffer: WebGLBuffer; texCoordBuffer: WebGLBuffer } | null = null;

// State
let activeScene: any = null;
let visualSettings: any = {
    beauty: { smoothing: 0, brightness: 1.0, sharpen: 0, denoise: 0 },
    background: { mode: 'none', blurLevel: 'low', assetUrl: null },
    chromaKey: { enabled: false, similarity: 0.4, smoothness: 0.1, keyColor: '#00ff00' },
    lensProfile: 'none',
    branding: { logoUrl: '', logoPosition: 'top-right', logoScale: 1.0, name: '', title: '', color: '#3b82f6' },
    breakMode: { enabled: false, message: 'We\'ll be right back!' },
    specialOverlays: { showSponsorship: false },
    showLowerThird: false,
    showTicker: false,
    tickerText: 'Breaking News • Latest Updates • '
};
let faceTracking = {
    currentX: 0.5,
    currentY: 0.5,
    targetX: 0.5,
    targetY: 0.5
};
let latestFaceData: {
    blendshapes: any[],
    matrix: any,
    landmarks: any[]
} | null = null;
let hostTexScale = [1.0, 1.0];
let hostTexOffset = [0.0, 0.0];
let authToken: string | null = null;

// Textures and Framebuffers
const textureMap = new Map<string, WebGLTexture>();
const frameMap = new Map<string, VideoFrame>();
const streamReaders = new Map<string, ReadableStreamDefaultReader<VideoFrame>>();
const videoMetadata = new Map<string, { width: number, height: number }>();
const textureDirtyMap = new Map<string, boolean>();
const backgroundMetadata = { width: 0, height: 0 };
interface GuestData {
    id: string;
    name: string;
    title: string;
}
const slotMap = new Map<string, GuestData>(); // Maps 'guest1' -> { id, name, title }

// Intermediate textures for multi-pass rendering
let texPing: WebGLTexture | null = null;
let texPong: WebGLTexture | null = null;
let blurBuffer1: WebGLTexture | null = null;
let blurBuffer2: WebGLTexture | null = null;
let maskTexture: WebGLTexture | null = null;
let backgroundTexture: WebGLTexture | null = null;
let overlayTexture: WebGLTexture | null = null;
let brandLogoTexture: WebGLTexture | null = null;
let framedHostTexture: WebGLTexture | null = null; // New: Stores the cropped/mirrored host frame
let framebuffer: WebGLFramebuffer | null = null;
let lyricsCanvas: OffscreenCanvas | null = null;
let lyricsCtx: any = null;
let lyricsTexture: WebGLTexture | null = null;
let lutTexture: WebGLTexture | null = null;
let lutEnabled = false;
let performanceLyrics: any[] = [];
let performanceLyricsCurrentTime: number = 0;
let performingVTuberId: string | null = null;
let performanceLyricsVisible: boolean = false;
let performanceLyricsStyle: string = 'neon';
let cinematicMode: boolean = false;

// Graphics Overlays (Canvas 2D)
let graphicsCanvas: OffscreenCanvas | null = null;
let graphicsCtx: any = null;
let graphicsTexture: WebGLTexture | null = null;
let tickerOffset: number = 0;
let logoImage: ImageBitmap | null = null;

let sceneDirty = true;
let isRendering = false;
let lastTime = 0;

function requestRender() {
    if (sceneDirty && isRendering) return; // Already dirty or rendering
    sceneDirty = true;
    if (!isRendering && gl && canvas) {
        isRendering = true;
        // console.log('[Worker] Render loop starting...');
        requestAnimationFrame(renderLoop);
    }
}
let subtitleCanvas: OffscreenCanvas | null = null;
let subtitleCtx: any = null;
let subtitleTexture: WebGLTexture | null = null;
let currentSubtitle: string = '';

// Composite Shader (for final scene composition)
const compositeVS = `
attribute vec2 a_position;
attribute vec2 a_texCoord;
uniform vec2 u_translation;
uniform vec2 u_scale;
uniform vec2 u_texScale;
uniform vec2 u_texOffset;
uniform bool u_flipHorizontal;
uniform bool u_flipVertical;
uniform bool u_flipY;
varying vec2 v_texCoord;
varying vec2 v_localCoord;
void main() {
    v_localCoord = a_position;
    vec2 pos = a_position * u_scale + u_translation;
    float yPos = u_flipY ? (1.0 - pos.y) : pos.y;
    gl_Position = vec4(pos.x * 2.0 - 1.0, yPos * 2.0 - 1.0, 0.0, 1.0);
    
    vec2 uv = a_texCoord;
    if (u_flipHorizontal) uv.x = 1.0 - uv.x;
    if (u_flipVertical)   uv.y = 1.0 - uv.y;
    v_texCoord = uv * u_texScale + u_texOffset;
}
`;

const compositeFS = `
precision mediump float;
varying vec2 v_texCoord;
varying vec2 v_localCoord;
uniform sampler2D u_image;
uniform int u_shape; // 0: rect, 1: circle, 2: rounded
uniform float u_aspect; // width / height of the region
uniform float u_borderRadius;

void main() {
    if (u_shape == 1) {
        // Circle clipping: Use the smaller dimension as the radius base
        vec2 p = v_localCoord - 0.5;
        p.x *= u_aspect;
        float radius = min(u_aspect, 1.0) * 0.5;
        if (length(p) > radius) discard;
    } else if (u_shape == 2) {
        // Simple rounded rect clipping (approximate)
        vec2 p = v_localCoord;
        float r = u_borderRadius / 100.0;
        if (p.x < r && p.y < r && length(p - vec2(r)) > r) discard;
        if (p.x > 1.0-r && p.y < r && length(p - vec2(1.0-r, r)) > r) discard;
        if (p.x < r && p.y > 1.0-r && length(p - vec2(r, 1.0-r)) > r) discard;
        if (p.x > 1.0-r && p.y > 1.0-r && length(p - vec2(1.0-r, 1.0-r)) > r) discard;
    }
    gl_FragColor = texture2D(u_image, v_texCoord);
}
`;

// Uniform Locations for composite shader
let uTranslationLoc: WebGLUniformLocation | null = null;
let uScaleLoc: WebGLUniformLocation | null = null;
let uTexScaleLoc: WebGLUniformLocation | null = null;
let uTexOffsetLoc: WebGLUniformLocation | null = null;
let uFlipHorizontalLoc: WebGLUniformLocation | null = null;
let uFlipVerticalLoc: WebGLUniformLocation | null = null;
let uFlipYLoc: WebGLUniformLocation | null = null;
let uShapeLoc: WebGLUniformLocation | null = null;
let uAspectLoc: WebGLUniformLocation | null = null;
let uBorderRadiusLoc: WebGLUniformLocation | null = null;
let uImageLoc: WebGLUniformLocation | null = null;

const getFileUrl = (path: string) => {
    let url = path
    // If it doesn't start with http or /, assume it's an S3 path
    if (!path.startsWith('http') && !path.startsWith('/') && !path.startsWith('blob:') && !path.startsWith('data:')) {
        url = `/api/s3/${path}`
    }
    return url;
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            canvas = payload.canvas;
            if (canvas) initGL();
            break;
        case 'update-settings':
            if (payload) {
                const oldLogoUrl = visualSettings.branding?.logoUrl;
                visualSettings = payload;
                
                // key fix: check if logo url changed or if logoImage is missing but url exists
                if (payload.branding?.logoUrl && (payload.branding.logoUrl !== oldLogoUrl || !logoImage)) {
                     console.log('[Worker] Loading logo from settings update:', getFileUrl(payload.branding.logoUrl));
                     fetch(getFileUrl(payload.branding.logoUrl), {
                        headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                    })
                    .then(res => res.blob())
                    .then(blob => createImageBitmap(blob))
                    .then(bitmap => {
                        logoImage = bitmap;
                        sceneDirty = true;
                        console.log('[Worker] Logo image loaded from settings');
                    })
                    .catch(err => console.error('[Worker] Failed to load logo from settings:', err));
                }

                if (payload.authToken) {
                    authToken = payload.authToken;
                    console.log('[Worker] Auth Token updated');
                }
                requestRender();
            }
            break;
        case 'resize':
            if (canvas) {
                canvas.width = payload.width;
                canvas.height = payload.height;
                if (gl) {
                    gl.viewport(0, 0, canvas.width, canvas.height);
                    resizeIntermediateTextures();
                }
            }
            break;
        case 'add-stream':
            console.log(`[Worker] Adding stream: ${payload.id}, hasStream: ${!!payload.stream}`);
            handleStream(payload.id, payload.stream);
            break;
        case 'remove-stream':
            cleanupStream(payload.id);
            break;
        case 'update-scene':
            activeScene = payload.scene;
            requestRender();
            break;

        case 'update-mask':
            // Receive segmentation mask from main thread
            if (payload.maskData && payload.width && payload.height) {
                updateMaskTexture(payload.maskData, payload.width, payload.height);
                requestRender();
            }
            break;
        case 'update-background':
            // Receive background image/video texture
            if (payload.backgroundData) {
                updateBackgroundTexture(payload.backgroundData);
                requestRender();
                console.log('[Worker] Background updated');
            }
            break;
        case 'update-overlay':
            if (payload.overlayData) {
                updateOverlayTexture(payload.overlayData);
                requestRender();
            }
            break;
        case 'update-brand-logo':
            if (payload.logoUrl) {
                // Load logo image
                console.log("Logo URL: ", getFileUrl(payload.logoUrl));
                fetch(getFileUrl(payload.logoUrl), {
                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
                })
                .then(res => res.blob())
                .then(blob => createImageBitmap(blob))
                .then(bitmap => {
                    logoImage = bitmap;
                    requestRender();
                    console.log('[Worker] Logo image loaded');
                })
                .catch(err => console.error('[Worker] Failed to load logo:', err));
            } else {
                logoImage = null;
                requestRender();
            }
            break;
        case 'update-guest-slots':
            slotMap.clear();
            if (payload.slots) {
                Object.entries(payload.slots).forEach(([slot, guest]: [string, any]) => {
                    if (guest && guest.uuid) {
                        slotMap.set(slot, {
                            id: guest.uuid,
                            name: guest.name,
                            title: guest.title || 'Guest'
                        });
                    }
                });
            }
            sceneDirty = true;
            break;
        case 'add-3d-guest':
            init3DGuest(payload.id, payload.modelUrl, payload.textureUrl);
            break;
        case 'update-3d-audio':
            const gAudio = threeGuests.get(payload.id);
            if (gAudio) (gAudio as any).audioLevel = payload.audioLevel;
            update3DAnimations(payload.id, payload.audioLevel);
            break;
        case 'update-3d-thinking':
            const g = threeGuests.get(payload.id);
            if (g) {
                g.isThinking = payload.isThinking;
                sceneDirty = true;
            }
            break;
        case 'SETUP_AI_CHANNEL':
            const port = e.ports[0];
            port.onmessage = (event) => {
                const { type: aiMessageType, payload: aiPayload } = event.data;
                if (aiMessageType === 'UPDATE_MASK') {
                    if (aiPayload.maskData && aiPayload.width && aiPayload.height) {
                        updateMaskTexture(aiPayload.maskData, aiPayload.width, aiPayload.height);
                        sceneDirty = true;
                    }
                } else if (aiMessageType === 'UPDATE_FACE_FULL') {
                    latestFaceData = aiPayload;
                    sceneDirty = true;
                    
                    // Update camera framing target too
                    if (aiPayload.landmarks?.[1]) {
                        faceTracking.targetX = aiPayload.landmarks[1].x;
                        faceTracking.targetY = aiPayload.landmarks[1].y;
                    }
                }
            };
            console.log('[Worker] AI Channel established');
            break;
        case 'update-face-frame':
            if (payload) {
                if (Math.abs(faceTracking.targetX - payload.x) > 0.005 || Math.abs(faceTracking.targetY - payload.y) > 0.005) {
                    if (Math.floor(performance.now()) % 2000 < 50) {
                        // console.log(`[Worker] New Face Target: x=${payload.x.toFixed(2)}, y=${payload.y.toFixed(2)}`);
                    }
                    faceTracking.targetX = payload.x;
                    faceTracking.targetY = payload.y;
                    sceneDirty = true;
                }
            }
            break;
        case 'update-lyrics':
            performanceLyrics = payload.lyrics || [];
            performanceLyricsCurrentTime = payload.currentTime || 0;
            performingVTuberId = payload.performingVTuberId || null;
            performanceLyricsVisible = payload.visible !== undefined ? payload.visible : false;
            performanceLyricsStyle = payload.style || 'neon';
            sceneDirty = true;
            break;
        case 'update-chroma':
            if (payload) {
                console.log(`[Worker] Updating chroma: enabled=${payload.enabled}, key=${payload.keyColor}, sim=${payload.similarity}`);
                visualSettings.chromaKey = { ...visualSettings.chromaKey, ...payload };
                sceneDirty = true;
            }
            break;
        case 'update-lut':
            lutEnabled = payload.enabled;
            // Generate LUT internally if a profile name is provided
            if (payload.profile) {
                if (!gl) return;
                const lutData = generateLUTData(payload.profile);
                
                if (!lutTexture) {
                    lutTexture = gl.createTexture();
                    gl.bindTexture(gl.TEXTURE_2D, lutTexture);
                    // Use LINEAR for smooth color grading
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                }
                gl.bindTexture(gl.TEXTURE_2D, lutTexture);
                // 512x512 texture, RGBA
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, lutData);
                console.log(`[Worker] LUT regenerated for profile: ${payload.profile}`);
            }
            sceneDirty = true;
            break;
        case 'set-cinematic-mode':
            cinematicMode = payload.enabled;
            sceneDirty = true;
            break;
        case 'set-subtitles':
            currentSubtitle = payload.text;
            sceneDirty = true;
            break;
    }
};

function initGL() {
    if (!canvas) return;

    gl = canvas.getContext('webgl2', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGL2RenderingContext;
    if (!gl) {
        gl = canvas.getContext('webgl', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGLRenderingContext;
        if (!gl) {
            self.postMessage({ type: 'error', error: 'WebGL not supported' });
            return;
        }
    }

    try {
        // Initialize shaders
        bilateralShader = createBilateralFilterShader(gl);
        blurHorizontalShader = createGaussianBlurShader(gl, true);
        blurVerticalShader = createGaussianBlurShader(gl, false);
        sharpenShader = createUnsharpMaskShader(gl);
        brightnessShader = createBrightnessShader(gl);
        denoiseShader = createDenoiseShader(gl);
        virtualBgShader = createVirtualBackgroundShader(gl);
        blurCompositeShader = createBlurCompositeShader(gl);
        chromaKeyShader = createChromaKeyShader(gl);
        colorGradingShader = createColorGradingShader(gl);
        alphaBlendShader = createAlphaBlendShader(gl);

        // Create composite shader
        const vs = WebGLUtils.createShader(gl, gl.VERTEX_SHADER, compositeVS);
        const fs = WebGLUtils.createShader(gl, gl.FRAGMENT_SHADER, compositeFS);
        if (vs && fs) {
            compositeProgram = WebGLUtils.createProgram(gl, vs, fs);
            // Create geometry
            fullScreenQuad = createFullScreenQuad(gl);
            unitQuad = createUnitQuad(gl);

            if (compositeProgram) {
                uTranslationLoc = gl.getUniformLocation(compositeProgram, 'u_translation');
                uScaleLoc = gl.getUniformLocation(compositeProgram, 'u_scale');
                uTexScaleLoc = gl.getUniformLocation(compositeProgram, 'u_texScale');
                uTexOffsetLoc = gl.getUniformLocation(compositeProgram, 'u_texOffset');
                uFlipHorizontalLoc = gl.getUniformLocation(compositeProgram, 'u_flipHorizontal');
                uFlipVerticalLoc = gl.getUniformLocation(compositeProgram, 'u_flipVertical');
                uFlipYLoc = gl.getUniformLocation(compositeProgram, 'u_flipY');
                uShapeLoc = gl.getUniformLocation(compositeProgram, 'u_shape');
                uAspectLoc = gl.getUniformLocation(compositeProgram, 'u_aspect');
                uBorderRadiusLoc = gl.getUniformLocation(compositeProgram, 'u_borderRadius');
                uImageLoc = gl.getUniformLocation(compositeProgram, 'u_image');
            }

            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);

            // Create framebuffer for multi-pass rendering
            framebuffer = gl.createFramebuffer();

            // Create intermediate textures
            resizeIntermediateTextures();

            console.log('[Worker] WebGL initialized with advanced shader pipeline');
            requestAnimationFrame(renderLoop);
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: `Shader initialization failed: ${error}` });
    }
}

function resizeIntermediateTextures() {
    if (!gl || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create new intermediate textures
    texPing = createEmptyTexture(gl, width, height);
    texPong = createEmptyTexture(gl, width, height);
    blurBuffer1 = createEmptyTexture(gl, width, height);
    blurBuffer2 = createEmptyTexture(gl, width, height);
    framedHostTexture = createEmptyTexture(gl, width, height);

    // Initialize mask texture (black = background)
    if (!maskTexture) {
        maskTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, maskTexture!);
        const maskData = new Uint8Array(256 * 256).fill(0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 256, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, maskData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }

    if (!backgroundTexture) {
        backgroundTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, backgroundTexture!);
        const blackData = new Uint8Array(width * height * 4).fill(0);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, blackData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
}

function createEmptyTexture(gl: WebGLRenderingContext, width: number, height: number): WebGLTexture {
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function updateMaskTexture(maskData: Uint8Array, width: number, height: number) {
    if (!gl) return;
    if (!maskTexture) maskTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, maskTexture!);
    
    // Using LUMINANCE for 1-channel mask - 4x less data than RGBA
    // Disable Flip Y to match video texture (Top-Down)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, width, height, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, maskData);
    
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    sceneDirty = true;
}

function updateBackgroundTexture(backgroundData: ImageBitmap | ImageData) {
    if (!gl || !backgroundTexture) return;
    backgroundMetadata.width = (backgroundData as any).width;
    backgroundMetadata.height = (backgroundData as any).height;
    gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    // Disable Flip Y to match video texture (Top-Down)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backgroundData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    console.log('[Worker] Background texture size:', backgroundMetadata.width, backgroundMetadata.height);
}

function updateOverlayTexture(overlayData: ImageBitmap | ImageData) {
    if (!gl) return;
    if (!overlayTexture) {
        overlayTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, overlayTexture!);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, overlayTexture!);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, overlayData);
    sceneDirty = true;
}

function handleStream(id: string, stream: ReadableStream<VideoFrame>) {
    const reader = stream.getReader();
    streamReaders.set(id, reader);

    const read = async () => {
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                if (value) {
                    const oldFrame = frameMap.get(id);
                    if (oldFrame) oldFrame.close();
                    frameMap.set(id, value);
                    videoMetadata.set(id, { width: value.displayWidth, height: value.displayHeight });
                    textureDirtyMap.set(id, true);
                    requestRender();
                }
            }
        } catch (e) {
            console.error('[Worker] Stream reader error:', e);
        } finally {
            streamReaders.delete(id);
        }
    };
    read();
}

function cleanupStream(id: string) {
    if (streamReaders.has(id)) {
        console.log(`[Worker] Removing stream: ${id}`);
        streamReaders.get(id)?.cancel();
        streamReaders.delete(id);
    }
    if (frameMap.has(id)) {
        frameMap.get(id)?.close();
        frameMap.delete(id);
    }
    if (textureMap.has(id)) {
        gl?.deleteTexture(textureMap.get(id)!);
        textureMap.delete(id);
    }

    // Cleanup 3D guests if applicable
    if (threeGuests.has(id)) {
        const guest = threeGuests.get(id)!;
        if (guest.renderer) guest.renderer.dispose();
        if (guest.mixer) guest.mixer.stopAllAction();
        threeGuests.delete(id);
        console.log(`[Worker] Cleaned up 3D Guest: ${id}`);
    }

    textureDirtyMap.delete(id);
    sceneDirty = true;
}
function renderLoop(time: number = 0) {
    if (!gl || !canvas) return;

    const delta = lastTime ? (time - lastTime) / 1000 : 0.016;
    lastTime = time;

    // 0. Update smoothing (always runs at 60fps if loop active)
    const smoothingThreshold = 0.0001;
    const smoothingFactor = 0.15; // Snappier
    const dx = faceTracking.targetX - faceTracking.currentX;
    const dy = faceTracking.targetY - faceTracking.currentY;
    
    if (Math.abs(dx) > smoothingThreshold || Math.abs(dy) > smoothingThreshold) {
        faceTracking.currentX += dx * smoothingFactor;
        faceTracking.currentY += dy * smoothingFactor;
        sceneDirty = true; // Keep loop alive during animation
    } else {
        // Snap to target to prevent precision jitter
        faceTracking.currentX = faceTracking.targetX;
        faceTracking.currentY = faceTracking.targetY;
    }

    // CPU Optimization: Determine if we actually need to draw this frame
    const hasActiveVideo = textureMap.size > 0;
    const hasActiveModel = threeGuests.size > 0 && Array.from(threeGuests.values()).some(g => g.model);
    
    // The loop should ONLY run if:
    // 1. There is an active video stream OR an active 3D model
    // 2. AND something dynamic is happening (ticker, lyrics, scene transition)
    // 3. OR the scene is simply dirty (new settings, first frame)
    
    const hasVisualOutput = hasActiveVideo || hasActiveModel || (activeScene && activeScene.layout);
    
    const hasDynamicElements = performanceLyricsVisible || 
                             visualSettings.showTicker || 
                             visualSettings.breakMode?.enabled;
    
    if (!sceneDirty && (!hasVisualOutput || !hasDynamicElements) && !hasActiveVideo && !hasActiveModel) {
        // console.log('[Worker] Render loop idling (Total Standby)...');
        isRendering = false;
        lastTime = 0;
        return;
    }

    // Upload video frames to textures
    textureDirtyMap.forEach((dirty, id) => {
        if (!dirty) return;
        const frame = frameMap.get(id);
        if (!frame) return;

        if (!textureMap.has(id)) {
            const tex = WebGLUtils.createTexture(gl!);
            if (tex) textureMap.set(id, tex);
        }
        const tex = textureMap.get(id);
        if (tex) {
            gl!.bindTexture(gl!.TEXTURE_2D, tex);
            gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false); // Ensure video frames are not flipped implicitly
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, frame);
            textureDirtyMap.set(id, false);
            sceneDirty = true;
        }
    });

    // Clear canvas for drawing
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Pre-render 3D Guests to textures
    threeGuests.forEach((guest, id) => {
        if (guest.mixer) guest.mixer.update(delta);

        // Apply MoCap or Audio-based animations
        update3DAnimations(id, (guest as any).audioLevel || 0);

        // Apply Idle animations (breathing/noise)
        applyIdleState(guest, time);

        guest.renderer.render(guest.scene, guest.camera);
        
        let texture = textureMap.get(id);
        if (!texture) {
            texture = WebGLUtils.createTexture(gl!);
            if (texture) textureMap.set(id, texture);
        }

        if (texture) {
            gl!.bindTexture(gl!.TEXTURE_2D, texture);
            // Use the Three.js renderer's canvas as the source for our WebGL texture
            gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, guest.renderer.domElement);
            videoMetadata.set(id, { width: 512, height: 512 });
        }
    });

     // 2. Render main scene composition
     // Draw whole-canvas background if exists (Studio background for presentations)
     if (backgroundTexture) {
         renderBackground();
     }

     if (cinematicMode) {
         renderCinematicSource();
     } else if (activeScene && activeScene.layout && activeScene.layout.regions) {
         activeScene.layout.regions.forEach((region: any) => {
             drawRegion(region);
         });
     }
 
     // 2.5 Render Lyrics (Phase 93 integration)
     if (performanceLyricsVisible && performanceLyrics.length > 0) {
         renderLyrics();
     }

     if (currentSubtitle) {
         renderSubtitles(0, 0, 1, 1);
     }

     // 3. Render final overlay if exists
    if (overlayTexture) {
        renderOverlay();
    }
 
     // 4. Render Brand Logo (Phase 18)
     if (logoImage && visualSettings.branding?.logoUrl) {
         renderBrandLogo();
     }
 
     // 5. Render Break Overlay (Phase 18)
     if (visualSettings.breakMode?.enabled) {
         renderBreakOverlay(time);
     }
     
     // 6. Render Lower-Third Graphics
     if (visualSettings.showLowerThird && !cinematicMode) {
         renderLowerThird(visualSettings.branding || {});
     }
     
     // 7. Render Ticker Scroll
     if (visualSettings.showTicker && !cinematicMode) {
         renderTicker(visualSettings.tickerText || 'Breaking News • Latest Updates • ');
         sceneDirty = true; // Keep animating
     }
     
     // 8. Render Sponsorship Badge
     if (visualSettings.specialOverlays?.showSponsorship && !cinematicMode) {
         renderSponsorshipBadge();
     }
 
     sceneDirty = false;
     requestAnimationFrame(renderLoop);
}

function drawRegion(region: any) {
    if (!gl || !unitQuad || !compositeProgram) return;

    let id = '';
    if (region.source === 'host') id = 'host';
    else if (region.source === 'screen') id = 'screen';
    else if (region.source === 'media') id = 'media';
    else if (region.source.startsWith('guest')) {
        const slotKey = region.source;
        const guestData = slotMap.get(slotKey);
        id = guestData ? guestData.id : slotKey;
    }

    const sourceTexture = id ? textureMap.get(id) : null;
    const meta = id ? videoMetadata.get(id) : null;

    if (!sourceTexture || !meta || !canvas) return;

    // Host special pipeline: Framing -> Mirroring -> (Effects)
    if (id === 'host') {
        renderFramedHost(sourceTexture, meta);
        
        let finalTexture = framedHostTexture!;
        // Apply beauty/background effects if needed
        if (visualSettings.beauty.smoothing > 0.01 ||
            visualSettings.beauty.brightness !== 1.0 ||
            visualSettings.beauty.sharpen > 0.01 ||
            visualSettings.beauty.denoise > 0.01 ||
            visualSettings.background.mode !== 'none') {
            finalTexture = applyVisualEffects(framedHostTexture!, canvas.width, canvas.height, true); // Host already mirrored
        }
        
        // Final composite: Face-centric crop happens HERE in the layout pass
        // IMPORTANT: centerX MUST be mirrored (1.0 - x) because the foundation pass mirrored the video!
        const mirroredCenterX = 1.0 - faceTracking.currentX;
        renderToCanvas(finalTexture, region, { width: canvas.width, height: canvas.height }, false, true, mirroredCenterX, faceTracking.currentY);
        return;
    }

    // Default pipeline for other sources
    renderToCanvas(sourceTexture, region, meta, false, false);
}

/**
 * Dedicated pass to crop and mirror the host video based on face tracking
 */
function renderFramedHost(inputTexture: WebGLTexture, meta: { width: number, height: number }) {
    if (!gl || !compositeProgram || !canvas || !framedHostTexture || !framebuffer || !unitQuad) return;

    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, framedHostTexture, 0);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(compositeProgram);

    // Set up attributes
    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTexture);

    // Foundation pass: Just fit the video to the intermediate texture aspect
    // NO face framing here, that happens in the final layout pass
    const targetAspect = canvas.width / canvas.height;
    const sourceAspect = meta.width / meta.height;

    let texScaleX = 1.0;
    let texScaleY = 1.0;
    let texOffsetX = 0.0;
    let texOffsetY = 0.0;

    if (sourceAspect > targetAspect) {
        texScaleX = targetAspect / sourceAspect;
        texOffsetX = (1.0 - texScaleX) / 2.0;
    } else if (sourceAspect < targetAspect) {
        texScaleY = sourceAspect / targetAspect;
        texOffsetY = (1.0 - texScaleY) / 2.0;
    }

    // Save for mask alignment in effects pass
    hostTexScale = [texScaleX, texScaleY];
    hostTexOffset = [texOffsetX, texOffsetY];

    gl.uniform2f(uTranslationLoc!, 0, 0);
    gl.uniform2f(uScaleLoc!, 1.0, 1.0);
    gl.uniform2f(uTexScaleLoc!, texScaleX, texScaleY);
    gl.uniform2f(uTexOffsetLoc!, texOffsetX, texOffsetY);
    gl.uniform1i(uFlipHorizontalLoc!, 1); // Host foundation pass mirrors
    gl.uniform1i(uFlipVerticalLoc!, 0);
    gl.uniform1i(uFlipYLoc!, 1); // Internal textures are flipped Y

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function applyVisualEffects(inputTexture: WebGLTexture, sourceWidth: number, sourceHeight: number, mirrored: boolean = false): WebGLTexture {
    if (!gl || !fullScreenQuad || !framebuffer || !texPing || !texPong || !blurBuffer1 || !blurBuffer2 || !canvas) return inputTexture;

    const width = canvas.width;
    const height = canvas.height;

    let currentInput = inputTexture;
    let currentInputWidth = sourceWidth;
    let currentInputHeight = sourceHeight;

    if (visualSettings.background.mode !== 'none' && Math.floor(performance.now()) % 200 === 0) {
        // console.log(`[Worker] Applying effects: mode=${visualSettings.background.mode}, hasMask=${!!maskTexture}`);
    }
    let currentOutput = texPing;

    const swap = () => {
        currentInput = currentOutput;
        currentInputWidth = width;
        currentInputHeight = height;
        currentOutput = (currentInput === texPing) ? texPong! : texPing!;
    };

    // Pass 1: Denoise
    if (visualSettings.beauty.denoise > 0.01 && denoiseShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);

        renderWithShader(gl, denoiseShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_resolution: [currentInputWidth, currentInputHeight],
            u_denoise: visualSettings.beauty.denoise
        });

        gl.bindTexture(gl.TEXTURE_2D, null);
        swap();
    }

    // Pass 1.5: Chroma Key (Green Screen)
    if (visualSettings.chromaKey?.enabled && chromaKeyShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);

        const hexToRgb = (hex: string) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            ] : [0, 1, 0];
        };
        const keyColor = hexToRgb(visualSettings.chromaKey.keyColor || '#00ff00');

        renderWithShader(gl, chromaKeyShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_keyColor: keyColor,
            u_similarity: visualSettings.chromaKey.similarity,
            u_smoothness: visualSettings.chromaKey.smoothness,
            u_spill: 0.1
        });

        gl.bindTexture(gl.TEXTURE_2D, null);
        swap();
        
        // If virtual background is enabled, composite immediately
        if (visualSettings.background.mode === 'virtual' && backgroundTexture && alphaBlendShader) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.viewport(0, 0, width, height);
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentInput); // Foreground (with alpha from chroma key)
            
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, backgroundTexture); // Background

            renderWithShader(gl, alphaBlendShader, fullScreenQuad, {
                u_foreground: { textureUnit: 0 },
                u_background: { textureUnit: 1 }
            });
            
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
            
            swap();
        }
    }

    // Pass 2: Smoothing
    if (visualSettings.beauty.smoothing > 0.01 && bilateralShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);

        renderWithShader(gl, bilateralShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_resolution: [currentInputWidth, currentInputHeight],
            u_smoothing: visualSettings.beauty.smoothing
        });

        gl.bindTexture(gl.TEXTURE_2D, null);
        swap();
    }

    // Pass 3: Brightness
    if (Math.abs(visualSettings.beauty.brightness - 1.0) > 0.01 && brightnessShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);

        renderWithShader(gl, brightnessShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_brightness: visualSettings.beauty.brightness
        });

        gl.bindTexture(gl.TEXTURE_2D, null);
        swap();
    }

    // Pass 4: Sharpen
    if (visualSettings.beauty.sharpen > 0.01 && sharpenShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);

        renderWithShader(gl, sharpenShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_resolution: [currentInputWidth, currentInputHeight],
            u_sharpen: visualSettings.beauty.sharpen
        });

        gl.bindTexture(gl.TEXTURE_2D, null);
        swap();
    }

    // Pass 5: Background Effects
    // CASE B: AI Mask Composition (Blur)
    if (visualSettings.background.mode === 'blur') {
        if (!maskTexture || !blurHorizontalShader || !blurVerticalShader || !blurCompositeShader) {
            // console.warn('[Worker] Blur missing dependencies');
            // return currentInput;
        } else {
            const blurStrength = visualSettings.background.blurLevel === 'low' ? 0.5 :
                visualSettings.background.blurLevel === 'medium' ? 0.7 : 1.0;

            const sharpInput = currentInput;

            // Blur steps use dedicated blur buffers to avoid collision
            // Step 1: Horizontal Blur (currentInput -> blurBuffer1)
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurBuffer1, 0);
            gl.viewport(0, 0, width, height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, currentInput);
            renderWithShader(gl, blurHorizontalShader, fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [currentInputWidth, currentInputHeight],
                u_blurStrength: blurStrength,
                u_horizontal: true
            });

            // Step 2: Vertical Blur (blurBuffer1 -> blurBuffer2)
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, blurBuffer2, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, blurBuffer1!);
            renderWithShader(gl, blurVerticalShader, fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_resolution: [width, height],
                u_blurStrength: blurStrength,
                u_horizontal: false
            });

            // Step 3: Composite (sharpInput + blurBuffer2 -> currentOutput)
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, sharpInput);
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, blurBuffer2!);
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, maskTexture);
            renderWithShader(gl, blurCompositeShader, fullScreenQuad, {
                u_texture: { textureUnit: 0 },
                u_blurred: { textureUnit: 1 },
                u_mask: { textureUnit: 2 },
                u_feather: 0.15,
                u_flipX: mirrored,
                u_maskScale: hostTexScale,
                u_maskOffset: hostTexOffset
            });

            gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
            
            swap();
        }
    } else if (visualSettings.background.mode === 'virtual' && maskTexture && backgroundTexture && virtualBgShader) {
        
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, currentInput);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, maskTexture);

        renderWithShader(gl, virtualBgShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_background: { textureUnit: 1 },
            u_mask: { textureUnit: 2 },
            u_feather: 0.1,
            u_flipX: mirrored,
            u_maskScale: hostTexScale,
            u_maskOffset: hostTexOffset
        });
        
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);

        swap();
    }

    // Pass 6: Color Grading (LUT)
    if (lutEnabled && lutTexture && colorGradingShader) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, currentOutput, 0);
        gl.viewport(0, 0, width, height);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, currentInput);
        
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, lutTexture);

        renderWithShader(gl, colorGradingShader, fullScreenQuad, {
            u_texture: { textureUnit: 0 },
            u_lut: { textureUnit: 1 },
            u_intensity: 1.0
        });

        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, null);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, null);
        
        swap();
    }

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return currentInput;
}

function renderToCanvas(
    texture: WebGLTexture, 
    region: any, 
    meta: { width: number, height: number }, 
    forceMirror: boolean = false, 
    flipVertical: boolean = false,
    centerX: number = 0.5,
    centerY: number = 0.5
) {
    if (!gl || !compositeProgram || !canvas) return;

    gl.useProgram(compositeProgram);

    // Set up attributes
    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    if (unitQuad) {
        gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (uImageLoc) gl.uniform1i(uImageLoc, 0);

    // Calculate transform (normalized 0->1)
    const x = region.x / 100;
    const y = region.y / 100;
    const w = region.width / 100;
    const h = region.height / 100;

    // Object-fit: cover logic
    const targetWidth = w * canvas.width;
    const targetHeight = h * canvas.height;
    const targetAspect = targetWidth / targetHeight;
    const sourceAspect = meta.width / meta.height;

    if (Date.now() % 2000 < 20 && centerX !== 0.5) {
        // console.log(`[Worker] renderRegion centering: cX=${centerX.toFixed(2)}, aspect[T=${targetAspect.toFixed(2)}, S=${sourceAspect.toFixed(2)}]`);
    }

    let texScaleX = 1.0;
    let texScaleY = 1.0;
    let texOffsetX = 0.0;
    let texOffsetY = 0.0;

    if (sourceAspect > targetAspect) {
        texScaleX = targetAspect / sourceAspect;
        // Use provided centerX for face framing, or default to center (0.5)
        texOffsetX = Math.max(0, Math.min(1.0 - texScaleX, centerX - texScaleX / 2.0));
    } else if (sourceAspect < targetAspect) {
        texScaleY = sourceAspect / targetAspect;
        // Use provided centerY for face framing, or default to center (0.5)
        texOffsetY = Math.max(0, Math.min(1.0 - texScaleY, centerY - texScaleY / 2.0));
    }

    if (uTranslationLoc) gl.uniform2f(uTranslationLoc, x, y);
    if (uScaleLoc) gl.uniform2f(uScaleLoc, w, h);
    if (uTexScaleLoc) gl.uniform2f(uTexScaleLoc, texScaleX, texScaleY);
    if (uTexOffsetLoc) gl.uniform2f(uTexOffsetLoc, texOffsetX, texOffsetY);
    if (uFlipHorizontalLoc) gl.uniform1i(uFlipHorizontalLoc, forceMirror ? 1 : 0);
    if (uFlipVerticalLoc) gl.uniform1i(uFlipVerticalLoc, flipVertical ? 1 : 0); 
    if (uFlipYLoc) gl.uniform1i(uFlipYLoc, 1); // Final pass ALWAYS flips position Y for screen space

    // Shape uniforms
    let shapeInt = 0;
    if (region.shape === 'circle') shapeInt = 1;
    else if (region.shape === 'rounded' || region.shape === 'square') shapeInt = 2; // Square is actually rounded with radius
    
    if (uShapeLoc) gl.uniform1i(uShapeLoc, shapeInt);
    if (uAspectLoc) gl.uniform1f(uAspectLoc, targetAspect);
    if (uBorderRadiusLoc) {
        let radius = 0;
        if (region.shape === 'circle') radius = 50; 
        else if (region.shape === 'rounded') radius = 8;
        else if (region.shape === 'square') radius = 0;
        gl.uniform1f(uBorderRadiusLoc, radius);
    }

    if (uImageLoc) gl.uniform1i(uImageLoc, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Phase 93: Render lyrics on top of the region if this guest is performing
    if (performingVTuberId && performanceLyricsVisible && performanceLyrics.length > 0) {
        let isTarget = false;
        if (region.source === 'host' && performingVTuberId === 'host') isTarget = true;
        else if (region.source.startsWith('guest')) {
            const guestData = slotMap.get(region.source);
            if (guestData && guestData.id === performingVTuberId) isTarget = true;
        }

        if (isTarget) {
            renderLyricsInRegion(x, y, w, h);
        }
    }
}

function wrapText(ctx: any, text: string, maxWidth: number) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}

function renderLyricsInRegion(x: number, y: number, w: number, h: number) {
    if (!gl || !canvas || !compositeProgram || !unitQuad) return;

    const currentLine = performanceLyrics.find(l => performanceLyricsCurrentTime >= l.startTime && performanceLyricsCurrentTime <= l.endTime);
    if (!currentLine) return;

    // 1. Prepare 2D Canvas for text rendering
    if (!lyricsCanvas) {
        lyricsCanvas = new OffscreenCanvas(512, 256); // Taller for multi-line
        lyricsCtx = lyricsCanvas.getContext('2d');
    }
    const ctx = lyricsCtx!;
    ctx.clearRect(0, 0, lyricsCanvas.width, lyricsCanvas.height);

    // Initial Font Size & Config based on style
    let fontSize = 42;
    let fontWeight = 'bold';
    let letterSpacing = 0;
    
    if (performanceLyricsStyle === 'minimal') {
        fontSize = 28;
        fontWeight = '600';
        letterSpacing = 2; // Simulated
    } else if (performanceLyricsStyle === 'kinetic') {
        fontSize = 48;
    }

    const maxTextW = lyricsCanvas.width * 0.9;
    ctx.font = `${fontWeight} ${fontSize}px "Inter", sans-serif`;
    
    // Wrap text
    let lines = wrapText(ctx, currentLine.text, maxTextW);
    
    // Dynamic Scaling
    if (lines.length > 3 || (lines[0] && ctx.measureText(lines[0]).width > maxTextW)) {
        fontSize = Math.max(16, fontSize * 0.7);
        ctx.font = `${fontWeight} ${fontSize}px "Inter", sans-serif`;
        lines = wrapText(ctx, currentLine.text, maxTextW);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = lyricsCanvas.width / 2;
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = (lyricsCanvas.height - totalHeight) / 2 + lineHeight / 2;

    ctx.save();
    
    // Style Specific Pre-render (Backdrops/Transforms)
    if (performanceLyricsStyle === 'minimal') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(maxTextW * 0.05, startY - lineHeight * 0.6, maxTextW, totalHeight + lineHeight * 0.2, 8);
        ctx.fill();
    } else if (performanceLyricsStyle === 'kinetic') {
        // Perspective tilt simulation via horizontal skew/scaling
        ctx.transform(1, 0, 0.1, 0.95, 0, 0); 
    }

    lines.forEach((line, i) => {
        const textY = startY + i * lineHeight;
        
        if (performanceLyricsStyle === 'neon') {
            // Multiple Glow layers
            ctx.shadowBlur = 12;
            ctx.shadowColor = 'rgba(0, 242, 255, 0.8)';
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#00f2ff';
            ctx.strokeText(line, textX, textY);
            
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 2;
            ctx.strokeText(line, textX, textY);
        } else if (performanceLyricsStyle === 'minimal') {
            ctx.shadowBlur = 2;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
        } else if (performanceLyricsStyle === 'kinetic') {
            ctx.shadowBlur = 0;
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.strokeText(line, textX, textY);
        } else {
            // Default/Bounce
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.8)';
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#000000';
            ctx.strokeText(line, textX, textY);
        }

        // Main Fill
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(line, textX, textY);
    });
    
    ctx.restore();

    // 2. Update WebGL Texture
    if (!lyricsTexture) {
        lyricsTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, lyricsTexture!);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, lyricsTexture!);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, lyricsCanvas);

    // 3. Draw to WebGL
    gl.useProgram(compositeProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Maintain 2:1 aspect ratio of the texture (OffscreenCanvas 512x256)
    // Normalized width lyricsW is 90% of the region width
    const lyricsW = w * 0.9;
    // Calculate normalized height to keep 2:1 pixel aspect ratio
    // Formula: (lyricsW * canvas.width) / (lyricsH * canvas.height) = 2
    const lyricsH = (lyricsW * canvas.width) / (2 * canvas.height);
    
    // Centering lyricsX in the region
    const lyricsX = x + (w - lyricsW) / 2;
    
    // Position: Float it higher up (standard VNode placement)
    // Avoid name tags by placing it roughly at 70% of the region height from top
    const lyricsY = y + (h * 0.75) - lyricsH; 

    gl.uniform2f(uTranslationLoc!, lyricsX, lyricsY);
    gl.uniform2f(uScaleLoc!, lyricsW, lyricsH);
    gl.uniform2f(uTexScaleLoc!, 1, 1);
    gl.uniform2f(uTexOffsetLoc!, 0, 0);
    gl.uniform1i(uFlipHorizontalLoc!, 0);
    gl.uniform1i(uFlipVerticalLoc!, 0);
    gl.uniform1i(uFlipYLoc!, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, lyricsTexture);
    gl.uniform1i(uImageLoc!, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
}

function renderSubtitles(x: number, y: number, w: number, h: number) {
    if (!currentSubtitle || !gl) return;

    // 1. Prepare Canvas
    if (!subtitleCanvas) {
        subtitleCanvas = new OffscreenCanvas(1024, 256);
        subtitleCtx = subtitleCanvas.getContext('2d');
    }

    const ctx = subtitleCtx;
    ctx.clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);
    
    // Set text style
    ctx.font = '900 48px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textX = subtitleCanvas.width / 2;
    const textY = subtitleCanvas.height / 2;

    // Draw Shadow/Stroke for readability
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#000000';
    ctx.strokeText(currentSubtitle, textX, textY);

    // Main Fill
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(currentSubtitle, textX, textY);

    // 2. Update WebGL Texture
    if (!subtitleTexture) {
        subtitleTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, subtitleTexture!);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, subtitleTexture!);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, subtitleCanvas);

    // 3. Draw to WebGL
    gl.useProgram(compositeProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Position: Bottom center
    const subW = w * 0.8;
    const subH = (subW * subtitleCanvas.height) / subtitleCanvas.width;
    const subX = x + (w - subW) / 2;
    const subY = y + (h * 0.9) - subH;

    gl.uniform2f(uTranslationLoc!, subX, subY);
    gl.uniform2f(uScaleLoc!, subW, subH);
    gl.uniform2f(uTexScaleLoc!, 1, 1);
    gl.uniform2f(uTexOffsetLoc!, 0, 0);
    gl.uniform1i(uFlipHorizontalLoc!, 0);
    gl.uniform1i(uFlipVerticalLoc!, 0);
    gl.uniform1i(uFlipYLoc!, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, subtitleTexture);
    gl.uniform1i(uImageLoc!, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
}

function regionHeightRatio(h: number) {
    // Helper to estimate visual height scale
    return h;
}

function renderOverlay() {
    if (!gl || !compositeProgram || !overlayTexture || !unitQuad) return;

    gl.useProgram(compositeProgram);

    // Set up attributes
    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, overlayTexture);
    if (uImageLoc) gl.uniform1i(uImageLoc, 0);

    // Overlay is always full screen
    if (uTranslationLoc) gl.uniform2f(uTranslationLoc, 0, 0);
    if (uScaleLoc) gl.uniform2f(uScaleLoc, 1, 1);
    if (uTexScaleLoc) gl.uniform2f(uTexScaleLoc, 1, 1);
    if (uTexOffsetLoc) gl.uniform2f(uTexOffsetLoc, 0, 0);
    if (uFlipHorizontalLoc) gl.uniform1i(uFlipHorizontalLoc, 0);
    if (uFlipVerticalLoc) gl.uniform1i(uFlipVerticalLoc, 0);

    // Enable blending for transparent overlay
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.disable(gl.BLEND);
}

function renderBackground() {
    if (!gl || !backgroundTexture || !unitQuad || !compositeProgram || !canvas) return;

    gl.useProgram(compositeProgram);
    
    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    if (uImageLoc) gl.uniform1i(uImageLoc, 0);

    // Scaling logic for background (contain mode)
    const targetAspect = canvas.width / canvas.height;
    const sourceAspect = (backgroundMetadata.width || canvas.width) / (backgroundMetadata.height || canvas.height);

    let scaleX = 1.0;
    let scaleY = 1.0;
    let transX = 0.0;
    let transY = 0.0;

    if (sourceAspect > targetAspect) {
        // Source is wider than target
        scaleY = targetAspect / sourceAspect;
        transY = (1.0 - scaleY) / 2.0;
    } else if (sourceAspect < targetAspect) {
        // Source is taller than target
        scaleX = sourceAspect / targetAspect;
        transX = (1.0 - scaleX) / 2.0;
    }

    gl.uniform2f(uTranslationLoc!, transX, transY);
    gl.uniform2f(uScaleLoc!, scaleX, scaleY);
    gl.uniform2f(uTexScaleLoc!, 1, 1);
    gl.uniform2f(uTexOffsetLoc!, 0, 0);
    gl.uniform1i(uFlipHorizontalLoc!, 0);
    gl.uniform1i(uFlipVerticalLoc!, 0);
    gl.uniform1i(uFlipYLoc!, 1);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function updateBrandLogoTexture(logoData: ImageBitmap | ImageData) {
    if (!gl) return;
    if (!brandLogoTexture) {
        brandLogoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, brandLogoTexture!);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    }
    gl.bindTexture(gl.TEXTURE_2D, brandLogoTexture!);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, logoData);
    sceneDirty = true;
}

// function renderBrandLogo() {
//     if (!gl || !brandLogoTexture || !unitQuad || !compositeProgram || !canvas) return;

//     gl.useProgram(compositeProgram);
//     gl.enable(gl.BLEND);
//     gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

//     const branding = visualSettings.branding;
//     const scale = branding.logoScale || 1.0;
//     const padding = 0.05; // 5% padding
//     const logoW = 0.15 * scale;
//     const logoH = logoW * (canvas.width / canvas.height);

//     let x = padding;
//     let y = padding;

//     if (branding.logoPosition === 'top-right') {
//         x = 1.0 - logoW - padding;
//     } else if (branding.logoPosition === 'bottom-left') {
//         y = 1.0 - logoH - padding;
//     } else if (branding.logoPosition === 'bottom-right') {
//         x = 1.0 - logoW - padding;
//         y = 1.0 - logoH - padding;
//     }

//     const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
//     const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

//     gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
//     gl.enableVertexAttribArray(positionLoc);
//     gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

//     gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
//     gl.enableVertexAttribArray(texCoordLoc);
//     gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

//     gl.activeTexture(gl.TEXTURE0);
//     gl.bindTexture(gl.TEXTURE_2D, brandLogoTexture);
//     if (uImageLoc) gl.uniform1i(uImageLoc, 0);

//     gl.uniform2f(uTranslationLoc!, x, y);
//     gl.uniform2f(uScaleLoc!, logoW, logoH);
//     gl.uniform2f(uTexScaleLoc!, 1.0, 1.0);
//     gl.uniform2f(uTexOffsetLoc!, 0.0, 0.0);
//     gl.uniform1i(uFlipHorizontalLoc!, 0);
//     gl.uniform1i(uFlipVerticalLoc!, 0);

//     gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
//     gl.disable(gl.BLEND);
// }

// ===== GRAPHICS OVERLAY RENDERING =====

/**
 * Render Brand Logo Overlay
 */
function renderBrandLogo() {
    if (!gl || !canvas || !visualSettings.branding?.logoUrl || !logoImage) return;
    
    const { logoPosition, logoScale } = visualSettings.branding;
    const logoSize = 80 * logoScale;
    const margin = 20;
    
    // Calculate position based on logoPosition
    let x = 0, y = 0;
    switch (logoPosition) {
        case 'top-left':
            x = margin;
            y = margin;
            break;
        case 'top-right':
            x = canvas.width - logoSize - margin;
            y = margin;
            break;
        case 'bottom-left':
            x = margin;
            y = canvas.height - logoSize - margin;
            break;
        case 'bottom-right':
            x = canvas.width - logoSize - margin;
            y = canvas.height - logoSize - margin;
            break;
    }
    
    // Render logo using Canvas 2D
    if (!graphicsCanvas) {
        graphicsCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        graphicsCtx = graphicsCanvas.getContext('2d');
    }
    
    const ctx = graphicsCtx!;
    ctx.clearRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    if (logoImage) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(logoImage, x, y, logoSize, logoSize);
        ctx.restore();
        
        // Upload to WebGL texture
        if (!graphicsTexture) {
            graphicsTexture = gl.createTexture();
        }
        gl.bindTexture(gl.TEXTURE_2D, graphicsTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graphicsCanvas);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        
        // Render texture to screen
        renderGraphicsOverlay(graphicsTexture);
    }
}

/**
 * Render Break Mode Overlay
 */
function renderBreakOverlay(time: number) {
    if (!gl || !canvas) return;
    
    if (!graphicsCanvas) {
        graphicsCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        graphicsCtx = graphicsCanvas.getContext('2d');
    }
    
    const ctx = graphicsCtx!;
    ctx.clearRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    // Semi-transparent dark overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    // Message text
    const message = visualSettings.breakMode?.message || 'We\'ll be right back!';
    ctx.font = 'bold 48px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Animated glow effect
    const pulse = (Math.sin(time / 500) + 1) * 0.5;
    ctx.shadowBlur = 20 + pulse * 10;
    ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(message, graphicsCanvas.width / 2, graphicsCanvas.height / 2);
    
    // Upload to WebGL texture
    if (!graphicsTexture) {
        graphicsTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, graphicsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graphicsCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Render texture to screen
    renderGraphicsOverlay(graphicsTexture);
}

/**
 * Render Lower-Third Graphics
 */
function renderLowerThird(branding: any) {
    if (!gl || !canvas || !activeScene) return;
    
    if (!graphicsCanvas) {
        graphicsCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        graphicsCtx = graphicsCanvas.getContext('2d');
    }
    
    const ctx = graphicsCtx!;
    ctx.clearRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    // Iterate over regions to render identity for Host and Guests
    // Note: branding arg contains Host info
    
    const regions = activeScene.layout?.regions || [];
    
    regions.forEach((region: any) => {
        let identity = null;
        let isHost = false;
        
        if (region.source === 'host') {
            identity = { ...branding };
            if (!identity.name) identity.name = 'Host';
            isHost = true;
            console.log('[Worker] Host Region:', region, 'Identity:', identity);
        } else if (region.source.startsWith('guest')) {
            const guestData = slotMap.get(region.source);
            if (guestData) {
                identity = {
                    name: guestData.name,
                    title: guestData.title,
                    color: branding.color
                };
            }
            console.log('[Worker] Guest Region:', region, 'Data:', guestData, 'Identity:', identity);
        }
        
        if (identity && identity.name) {
             // Calculate region bounds in pixels
             const rx = (region.x / 100) * canvas.width;
             const ry = (region.y / 100) * canvas.height;
             const rw = (region.width / 100) * canvas.width;
             const rh = (region.height / 100) * canvas.height;

             // Draw lower-third locally within this region
             // Bottom-Left of the region
             
             const barHeight = 60; // Smaller bar for local context
             const lx = rx + 20;
             const ly = ry + rh - barHeight - 20;
             const lw = Math.min(rw - 40, 400); // Max width of 400px or region width
             
             // Background gradient
             const gradient = ctx.createLinearGradient(lx, ly, lx + lw, ly);
             gradient.addColorStop(0, identity.color || '#3b82f6');
             gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.8)');
             gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
             
             ctx.fillStyle = gradient;
             
             // Draw with rounded corners (simple rect for now)
             ctx.fillRect(lx, ly, lw, barHeight);
             
             // Name
             ctx.font = 'bold 24px "Inter", sans-serif';
             ctx.fillStyle = '#ffffff';
             ctx.textAlign = 'left';
             ctx.textBaseline = 'top';
             ctx.fillText(identity.name, lx + 20, ly + 15);
             
             // Title
             if (identity.title) {
                ctx.font = '14px "Inter", sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(identity.title, lx + 20, ly + 45);
             }
        }
    });
    
    // Upload to WebGL texture
    if (!graphicsTexture) {
        graphicsTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, graphicsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graphicsCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Render texture to screen
    renderGraphicsOverlay(graphicsTexture);
}

/**
 * Render Dynamic Ticker Scroll
 */
function renderTicker(tickerText: string) {
    if (!gl || !canvas) return;
    
    if (!graphicsCanvas) {
        graphicsCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        graphicsCtx = graphicsCanvas.getContext('2d');
    }
    
    const ctx = graphicsCtx!;
    ctx.clearRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    const barHeight = 50;
    const y = canvas.height - barHeight;
    
    // Background bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, y, canvas.width, barHeight);
    
    // Scrolling text
    ctx.font = 'bold 24px "Inter", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    
    const text = tickerText || 'Breaking News • Latest Updates • ';
    const textWidth = ctx.measureText(text).width;
    
    // Animate ticker
    tickerOffset -= 2;
    if (tickerOffset < -textWidth) {
        tickerOffset += textWidth; // Smooth loop reset
    }
    
    // Draw text multiple times to fill screen
    const repeatCount = Math.ceil(canvas.width / textWidth) + 2;
    for (let i = 0; i < repeatCount; i++) {
        ctx.fillText(text, tickerOffset + (textWidth * i), y + barHeight / 2);
    }
    
    // Upload to WebGL texture
    if (!graphicsTexture) {
        graphicsTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, graphicsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graphicsCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Render texture to screen
    renderGraphicsOverlay(graphicsTexture);
}

/**
 * Render Sponsorship Badge
 */
function renderSponsorshipBadge() {
    if (!gl || !canvas) return;
    
    if (!graphicsCanvas) {
        graphicsCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        graphicsCtx = graphicsCanvas.getContext('2d');
    }
    
    const ctx = graphicsCtx!;
    ctx.clearRect(0, 0, graphicsCanvas.width, graphicsCanvas.height);
    
    const badgeSize = 150;
    const x = canvas.width - badgeSize - 20;
    const y = 20;
    
    // Badge background
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + badgeSize, y);
    ctx.lineTo(x + badgeSize - 20, y + badgeSize / 2);
    ctx.lineTo(x + badgeSize, y + badgeSize);
    ctx.lineTo(x, y + badgeSize);
    ctx.closePath();
    ctx.fill();
    
    // Text
    const sponsorName = visualSettings.specialOverlays?.sponsorName || 'SPONSORED';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px "Inter", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(sponsorName, x + badgeSize / 2, y + badgeSize / 2);
    ctx.restore();
    
    // Upload to WebGL texture
    if (!graphicsTexture) {
        graphicsTexture = gl.createTexture();
    }
    gl.bindTexture(gl.TEXTURE_2D, graphicsTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, graphicsCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    // Render texture to screen
    renderGraphicsOverlay(graphicsTexture);
}

/**
 * Helper: Render graphics overlay texture to screen with alpha blending
 */
function renderGraphicsOverlay(texture: WebGLTexture) {
    if (!gl || !fullScreenQuad || !canvas || !compositeProgram) return;
    
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.useProgram(compositeProgram);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');
    
    if (fullScreenQuad) {
        gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuad.positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, fullScreenQuad.texCoordBuffer);
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    const uImageLoc = gl.getUniformLocation(compositeProgram, 'u_image');
    const uTranslationLoc = gl.getUniformLocation(compositeProgram, 'u_translation');
    const uScaleLoc = gl.getUniformLocation(compositeProgram, 'u_scale');
    const uTexScaleLoc = gl.getUniformLocation(compositeProgram, 'u_texScale');
    const uTexOffsetLoc = gl.getUniformLocation(compositeProgram, 'u_texOffset');
    const uFlipHorizontalLoc = gl.getUniformLocation(compositeProgram, 'u_flipHorizontal');
    const uFlipVerticalLoc = gl.getUniformLocation(compositeProgram, 'u_flipVertical');
    const uFlipYLoc = gl.getUniformLocation(compositeProgram, 'u_flipY');
    
    if (uImageLoc) gl.uniform1i(uImageLoc, 0);
    if (uTranslationLoc) gl.uniform2f(uTranslationLoc, 0.0, 0.0);
    if (uScaleLoc) gl.uniform2f(uScaleLoc, 1.0, 1.0);
    if (uTexScaleLoc) gl.uniform2f(uTexScaleLoc, 1.0, 1.0);
    if (uTexOffsetLoc) gl.uniform2f(uTexOffsetLoc, 0.0, 0.0);
    if (uFlipHorizontalLoc) gl.uniform1i(uFlipHorizontalLoc, 0);
    if (uFlipVerticalLoc) gl.uniform1i(uFlipVerticalLoc, 0);
    if (uFlipYLoc) gl.uniform1i(uFlipYLoc, 1);
    
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
}

// LUT Generation Logic
function generateLUTData(profile: string): Uint8Array {
    const width = 512;
    const height = 512;
    // RGBA = 4 channels
    const data = new Uint8Array(width * height * 4);
    
    // Default filter for unknown profiles
    let filter = (r: number, g: number, b: number) => [r, g, b];
    
    // Choose filter
    if (profile === 'noir') {
        filter = (r, g, b) => {
            const avg = (r + g + b) / 3;
            const v = (avg - 128) * 1.5 + 128;
            return [v, v, v];
        };
    } else if (profile === 'vintage') {
        filter = (r, g, b) => {
            const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
            const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
            const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
            return [tr, tg, tb];
        };
    } else if (profile === 'cool') {
        filter = (r, g, b) => [r, g, b * 1.5];
    } else if (profile === 'warm') {
        filter = (r, g, b) => [r * 1.2, g * 1.1, b * 0.9];
    } else if (profile === 'cinematic' || profile === 'cinema') {
        filter = (r, g, b) => { 
            const gray = (r + g + b) / 3;
            let nr = r, ng = g, nb = b;
            if (gray < 128) {
                 nb += (128 - gray) * 0.5;
                 ng += (128 - gray) * 0.1;
                 nr -= (128 - gray) * 0.2;
            } else {
                 nr += (gray - 128) * 0.5;
                 ng += (gray - 128) * 0.1;
                 nb -= (gray - 128) * 0.2;
            }
             nr = (nr - 128) * 1.1 + 128;
             ng = (ng - 128) * 1.1 + 128;
             nb = (nb - 128) * 1.1 + 128;
             return [nr, ng, nb];
        };
    }

    // Standard Bottom-Up Layout (matches standard BMP & WebGL texture space)
    // y=0 is Bottom Row.
    // Tile 0 (Blue=0) should be at Bottom-Left.
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            
            // 1. Identify Tile (8x8 grid)
            const tileX = Math.floor(x / 64);
            const tileY = Math.floor(y / 64);
            
            // 2. Identify coordinates inside tile (0-63)
            const redRaw = x % 64;
            const greenRaw = y % 64;
            
            // 3. Identify Blue value based on tile index
            // tileY * 8 + tileX
            const blueRaw = tileY * 8 + tileX;
            
            // 4. Normalize (0-255)
            const r = Math.floor(redRaw * (255 / 63));
            const g = Math.floor(greenRaw * (255 / 63));
            const b = Math.floor(blueRaw * (255 / 63));

            // 5. Apply Filter
            const [fr, fg, fb] = filter(r, g, b);

            // 6. Write Pixel (RGBA)
            const index = (y * width + x) * 4;
            data[index] = Math.max(0, Math.min(255, Math.floor(fr)));
            data[index + 1] = Math.max(0, Math.min(255, Math.floor(fg)));
            data[index + 2] = Math.max(0, Math.min(255, Math.floor(fb)));
            data[index + 3] = 255; // Alpha
        }
    }
    return data;
}

function renderCinematicSource() {
    if (!gl || !unitQuad || !compositeProgram) return;

    const sourceTexture = textureMap.get('cinematic');
    if (!sourceTexture || !canvas) return;

    gl.useProgram(compositeProgram);
    gl.viewport(0, 0, canvas.width, canvas.height);

    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(uTranslationLoc!, 0, 0);
    gl.uniform2f(uScaleLoc!, 1, 1);
    gl.uniform2f(uTexScaleLoc!, 1, 1);
    gl.uniform2f(uTexOffsetLoc!, 0, 0);
    gl.uniform1i(uFlipHorizontalLoc!, 0);
    gl.uniform1i(uFlipVerticalLoc!, 0);
    gl.uniform1i(uFlipYLoc!, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.uniform1i(uImageLoc!, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

function renderLyrics() {
    // For full-screen cinematic mode, we pass 0,0,1,1
    renderLyricsInRegion(0, 0, 1, 1);
}

