/// <reference lib="webworker" />

import {
    createBilateralFilterShader,
    createGaussianBlurShader,
    createUnsharpMaskShader,
    createBrightnessShader,
    createDenoiseShader,
    createVirtualBackgroundShader,
    createBlurCompositeShader,
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
                sceneDirty = true;
            });
        }

        scene.add(model);

        const mixer = new THREE.AnimationMixer(model);
        threeGuests.set(id, { scene, camera, renderer, renderTarget: null as any, model, mixer });

        console.log(`[Worker] 3D Guest ${id} loaded successfully`);
        sceneDirty = true;
    }, undefined, (err) => {
        console.error(`[Worker] Failed to load 3D model: ${err}`);
    });
}

function update3DAnimations(id: string, audioLevel: number) {
    const guest = threeGuests.get(id);
    if (!guest || !guest.model) return;

    // Micro-expression: Scale jaw or move mouth targets
    guest.model.traverse((child: any) => {
        if (child.isMesh && child.morphTargetInfluences) {
            const targets = child.morphTargetDictionary;
            if (targets && targets['jawOpen']) {
                child.morphTargetInfluences[targets['jawOpen']] = audioLevel * 1.5;
            } else if (targets && targets['mouthOpen']) {
                child.morphTargetInfluences[targets['mouthOpen']] = audioLevel * 1.5;
            }
        }
    });

    sceneDirty = true;
}

/**
 * Apply subtle idle movements to make the AI guest feel alive
 */
function applyIdleState(guest: any, time: number) {
    if (!guest.model) return;

    // Subtle breathing (slight vertical scale oscillation)
    const breathing = Math.sin(time / 2000) * 0.005;
    guest.model.scale.set(1 + breathing, 1 + breathing, 1 + breathing);

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

            if (child.name.toLowerCase().includes('head') || child.name.toLowerCase().includes('neck')) {
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
let compositeProgram: WebGLProgram | null = null;

// Geometry
let fullScreenQuad: { positionBuffer: WebGLBuffer; texCoordBuffer: WebGLBuffer } | null = null;
let unitQuad: { positionBuffer: WebGLBuffer; texCoordBuffer: WebGLBuffer } | null = null;

// State
let activeScene: any = null;
let visualSettings: any = {
    beauty: { smoothing: 0, brightness: 1.0, sharpen: 0, denoise: 0 },
    background: { mode: 'none', blurLevel: 'low', assetUrl: null }
};
let faceTracking = {
    currentX: 0.5,
    currentY: 0.5,
    targetX: 0.5,
    targetY: 0.5
};
let hostTexScale = [1.0, 1.0];
let hostTexOffset = [0.0, 0.0];
let authToken: string | null = null;

// Textures and Framebuffers
const textureMap = new Map<string, WebGLTexture>();
const frameMap = new Map<string, VideoFrame>();
const streamReaders = new Map<string, ReadableStreamDefaultReader<VideoFrame>>();
const videoMetadata = new Map<string, { width: number, height: number }>();
const textureDirtyMap = new Map<string, boolean>();
const slotMap = new Map<string, string>(); // Maps 'guest1' -> 'personaId'

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

let sceneDirty = true;
let lastTime = 0;

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
void main() {
    // Current layout math: 0 is top, 1 is bottom
    vec2 pos = a_position * u_scale + u_translation;
    // Map [0,1] to clip space [-1,1], flipping Y so 0 is top IF u_flipY is true
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
uniform sampler2D u_image;
void main() {
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
let uImageLoc: WebGLUniformLocation | null = null;

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            canvas = payload.canvas;
            if (canvas) initGL();
            break;
        case 'update-settings':
            if (payload) {
                visualSettings = payload;
                if (payload.authToken) {
                    authToken = payload.authToken;
                    console.log('[Worker] Auth Token updated');
                }
                sceneDirty = true;
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
            sceneDirty = true;
            break;

        case 'update-mask':
            // Receive segmentation mask from main thread
            if (payload.maskData && payload.width && payload.height) {
                updateMaskTexture(payload.maskData, payload.width, payload.height);
                sceneDirty = true;
            }
            break;
        case 'update-background':
            // Receive background image/video texture
            if (payload.backgroundData) {
                updateBackgroundTexture(payload.backgroundData);
                sceneDirty = true;
                console.log('[Worker] Background updated');
            }
            break;
        case 'update-overlay':
            if (payload.overlayData) {
                updateOverlayTexture(payload.overlayData);
                sceneDirty = true;
            }
            break;
        case 'update-brand-logo':
            if (payload.logoData) {
                updateBrandLogoTexture(payload.logoData);
                sceneDirty = true;
            }
            break;
        case 'update-guest-slots':
            slotMap.clear();
            if (payload.slots) {
                Object.entries(payload.slots).forEach(([slot, guest]: [string, any]) => {
                    if (guest && guest.uuid) slotMap.set(slot, guest.uuid);
                });
            }
            sceneDirty = true;
            break;
        case 'add-3d-guest':
            init3DGuest(payload.id, payload.modelUrl, payload.textureUrl);
            break;
        case 'update-3d-audio':
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
    gl.bindTexture(gl.TEXTURE_2D, backgroundTexture);
    // Disable Flip Y to match video texture (Top-Down)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backgroundData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    console.log('[Worker] Background texture size:', (backgroundData as any).width, (backgroundData as any).height);
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
                    sceneDirty = true;
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
    const smoothingFactor = 0.1; // More aggressive for snappy tracking
    const dx = faceTracking.targetX - faceTracking.currentX;
    const dy = faceTracking.targetY - faceTracking.currentY;
    
    if (Math.abs(dx) > 0.0001 || Math.abs(dy) > 0.0001) {
        faceTracking.currentX += dx * smoothingFactor;
        faceTracking.currentY += dy * smoothingFactor;
        sceneDirty = true; // Keep loop alive during animation
    }

    if (!sceneDirty && threeGuests.size === 0 && !overlayTexture && !brandLogoTexture && !visualSettings.breakMode?.enabled) {
        requestAnimationFrame(renderLoop);
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
    if (activeScene && activeScene.layout && activeScene.layout.regions) {
        activeScene.layout.regions.forEach((region: any) => {
            drawRegion(region);
        });
    }

    // 3. Render final overlay if exists
    if (overlayTexture) {
        renderOverlay();
    }
 
     // 4. Render Brand Logo (Phase 18)
     if (brandLogoTexture && visualSettings.branding?.logoUrl) {
         renderBrandLogo();
     }
 
     // 5. Render Break Overlay (Phase 18)
     if (visualSettings.breakMode?.enabled) {
         renderBreakOverlay(time);
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
        id = slotMap.get(slotKey) || slotKey;
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
        console.log(`[Worker] Applying effects: mode=${visualSettings.background.mode}, hasMask=${!!maskTexture}`);
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
    if (visualSettings.background.mode === 'blur') {
        if (!maskTexture || !blurHorizontalShader || !blurVerticalShader || !blurCompositeShader) {
            console.warn('[Worker] Blur missing dependencies:', { maskTexture: !!maskTexture, h: !!blurHorizontalShader, v: !!blurVerticalShader, c: !!blurCompositeShader });
            return currentInput;
        }

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
        // NOTE: mirrored=true forces the mask lookup to flip X.
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

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
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

function renderBrandLogo() {
    if (!gl || !brandLogoTexture || !unitQuad || !compositeProgram || !canvas) return;

    gl.useProgram(compositeProgram);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    const branding = visualSettings.branding;
    const scale = branding.logoScale || 1.0;
    const padding = 0.05; // 5% padding
    const logoW = 0.15 * scale;
    const logoH = logoW * (canvas.width / canvas.height);

    let x = padding;
    let y = padding;

    if (branding.logoPosition === 'top-right') {
        x = 1.0 - logoW - padding;
    } else if (branding.logoPosition === 'bottom-left') {
        y = 1.0 - logoH - padding;
    } else if (branding.logoPosition === 'bottom-right') {
        x = 1.0 - logoW - padding;
        y = 1.0 - logoH - padding;
    }

    const positionLoc = gl.getAttribLocation(compositeProgram, 'a_position');
    const texCoordLoc = gl.getAttribLocation(compositeProgram, 'a_texCoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.positionBuffer);
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, unitQuad.texCoordBuffer);
    gl.enableVertexAttribArray(texCoordLoc);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, brandLogoTexture);
    if (uImageLoc) gl.uniform1i(uImageLoc, 0);

    gl.uniform2f(uTranslationLoc!, x, y);
    gl.uniform2f(uScaleLoc!, logoW, logoH);
    gl.uniform2f(uTexScaleLoc!, 1.0, 1.0);
    gl.uniform2f(uTexOffsetLoc!, 0.0, 0.0);
    gl.uniform1i(uFlipHorizontalLoc!, 0);
    gl.uniform1i(uFlipVerticalLoc!, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disable(gl.BLEND);
}

function renderBreakOverlay(time: number) {
    if (!gl || !fullScreenQuad || !canvas) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 0.7); 
    
    gl.disable(gl.BLEND);
}

