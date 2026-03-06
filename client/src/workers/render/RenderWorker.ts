import { Avatar3DEngine } from './services/Avatar3DEngine';
import { WebGLCompositor, VisualSettings } from './services/WebGLCompositor';
import { UIOverlayRenderer } from './services/UIOverlayRenderer';
import { AntAREngine } from './services/AntAREngine';

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let activeScene: any = null;
let authToken: string | null = null;

// Core Engines
let compositor: WebGLCompositor;
let avatarEngine: Avatar3DEngine;
let uiOverlay: UIOverlayRenderer;
let antArEngine: AntAREngine;

// Data States
const frameMap = new Map<string, VideoFrame>();
const streamReaders = new Map<string, ReadableStreamDefaultReader<VideoFrame>>();
const videoMetadata = new Map<string, { width: number, height: number }>();
const textureMap = new Map<string, WebGLTexture>();
const textureDirtyMap = new Map<string, boolean>();

// Face Tracking State
const faceTracking = {
    currentX: 0.5,
    currentY: 0.5,
    targetX: 0.5,
    targetY: 0.5
};
let latestFaceData: any = null;

// Lyrics State
let performanceLyrics: any[] = [];
let performanceLyricsCurrentTime: number = 0;
let performingVTuberId: string | null = null;
let performanceLyricsVisible: boolean = false;
let performanceLyricsStyle: string = 'neon';

// Graphics State
let logoImage: ImageBitmap | null = null;
let currentSubtitle: string = '';
let currentCaption: any = null;
let cinematicMode: boolean = false;
const slotMap = new Map<string, { id: string, name: string, title: string }>();

// Settings
let visualSettings: VisualSettings = {
    background: { mode: 'none', blurLevel: 'medium' },
    streamRatio: '16:9',
    ar: {
        beauty: { smoothing: 0, brighten: 1, denoise: 0, slimming: 0, eyeEnlarge: 0 }
    }
} as any;

// Commerce State
let commerceState = {
    flashSaleActive: false,
    activeProduct: null as any,
    purchaseNotifications: [] as any[],
    qrCodeBitmap: null as ImageBitmap | null
};

let sceneDirty = true;
let isRendering = false;
let lastTime = 0;

function requestRender() {
    if (sceneDirty && isRendering) return;
    sceneDirty = true;
    if (!isRendering && compositor?.gl && canvas) {
        isRendering = true;
        requestAnimationFrame(renderLoop);
    }
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'init':
            canvas = payload.canvas;
            if (canvas) {
                compositor = new WebGLCompositor();
                compositor.init(canvas);
                
                uiOverlay = new UIOverlayRenderer();
                uiOverlay.init(compositor.gl!, canvas.width, canvas.height, compositor.compositeProgram!, compositor.unitQuad, compositor.fullScreenQuad);

                avatarEngine = new Avatar3DEngine(() => { sceneDirty = true; requestRender(); });
                antArEngine = new AntAREngine();
                requestRender();
            }
            break;

        case 'resize':
            if (canvas && compositor && uiOverlay) {
                canvas.width = payload.width;
                canvas.height = payload.height;
                compositor.resize(payload.width, payload.height);
                uiOverlay.resize(payload.width, payload.height);
                requestRender();
            }
            break;

        case 'update-settings':
            if (payload) {
                const oldLogoUrl = (visualSettings as any).branding?.logoUrl;
                visualSettings = payload;
                if (payload.branding?.logoUrl && (payload.branding.logoUrl !== oldLogoUrl || !logoImage)) {
                    loadLogo(payload.branding.logoUrl);
                }
                if (payload.authToken) {
                    authToken = payload.authToken;
                    avatarEngine?.setAuthToken(authToken);
                }
                
                // Update AntAR Mask if specified
                if (payload.ar?.active3DMask) {
                    // This could be mapped to actual model URLs
                    antArEngine?.loadMask({
                        id: payload.ar.active3DMask,
                        modelUrl: `/models/ar/masks/${payload.ar.active3DMask}.glb`,
                        offset: { x: 0, y: 0, z: 0 } as any,
                        scale: 1,
                        rotation: { x: 0, y: 0, z: 0 } as any,
                        anchorLandmark: 1
                    });
                } else if (payload.ar?.active3DMask === null) {
                    // Clear mask
                }

                requestRender();
            }
            break;

        case 'add-stream':
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
            if (payload.maskData && payload.width && payload.height) {
                compositor?.updateMaskTexture(payload.maskData, payload.width, payload.height);
                requestRender();
            }
            break;

        case 'update-background':
            if (payload.backgroundData) {
                compositor?.updateBackgroundTexture(payload.backgroundData);
                requestRender();
            }
            break;

        case 'update-overlay':
            // Logic for pre-rendered full-screen overlays like PNG frames
            break;

        case 'update-guest-slots':
            slotMap.clear();
            if (payload.slots) {
                Object.entries(payload.slots).forEach(([slot, guest]: [string, any]) => {
                    if (guest && guest.uuid) {
                        slotMap.set(slot, { id: guest.uuid, name: guest.name, title: guest.title || 'Guest' });
                    }
                });
            }
            sceneDirty = true;
            break;

        case 'add-3d-guest':
            avatarEngine?.initGuest(payload.id, payload.modelUrl, payload.textureUrl);
            break;

        case 'update-3d-audio':
            avatarEngine?.updateGuestAudioTracking(payload.id, payload.audioLevel);
            break;

        case 'update-3d-thinking':
            avatarEngine?.updateGuestThinking(payload.id, payload.isThinking);
            break;

        case 'SETUP_AI_CHANNEL':
            const port = e.ports[0];
            port.onmessage = (event) => {
                const { type: aiMessageType, payload: aiPayload } = event.data;
                if (aiMessageType === 'UPDATE_MASK') {
                    if (aiPayload.maskData && aiPayload.width && aiPayload.height) {
                        compositor?.updateMaskTexture(aiPayload.maskData, aiPayload.width, aiPayload.height);
                        sceneDirty = true;
                    }
                } else if (aiMessageType === 'UPDATE_FACE_FULL') {
                    latestFaceData = aiPayload;
                    sceneDirty = true;
                    if (aiPayload.landmarks?.[1]) {
                        faceTracking.targetX = aiPayload.landmarks[1].x;
                        faceTracking.targetY = aiPayload.landmarks[1].y;
                    }
                }
            };
            break;

        case 'update-face-full':
            if (payload) {
                latestFaceData = payload;
                sceneDirty = true;
                if (payload.landmarks?.[1]) {
                    faceTracking.targetX = payload.landmarks[1].x;
                    faceTracking.targetY = payload.landmarks[1].y;
                }
            }
            break;

        case 'update-face-frame':
            if (payload) {
                if (Math.abs(faceTracking.targetX - payload.x) > 0.005 || Math.abs(faceTracking.targetY - payload.y) > 0.005) {
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
            if (payload && visualSettings) {
                visualSettings.chromaKey = { ...visualSettings.chromaKey, ...payload };
                sceneDirty = true;
            }
            break;

        case 'set-cinematic-mode':
            cinematicMode = payload.enabled;
            sceneDirty = true;
            break;

        case 'set-subtitles':
            currentSubtitle = payload.text;
            sceneDirty = true;
            break;

        case 'update-caption':
            currentCaption = payload;
            sceneDirty = true;
            break;

        case 'update-commerce':
            if (commerceState.qrCodeBitmap && payload.qrCodeBitmap) {
                commerceState.qrCodeBitmap.close(); // Clean up old bitmap
            }
            if (payload.qrCodeBitmap) commerceState.qrCodeBitmap = payload.qrCodeBitmap;
            commerceState.activeProduct = payload.activeProduct;
            commerceState.flashSaleActive = payload.flashSaleActive;
            commerceState.purchaseNotifications = payload.purchaseNotifications;
            sceneDirty = true;
            requestRender();
            break;
            
        case 'trigger-transition':
            if (compositor && payload) {
                compositor.startTransition(payload.type, payload.duration || 500);
                sceneDirty = true;
                requestRender();
            }
            break;
            
        case 'update-ratio':
            if (payload.ratio) {
                (visualSettings as any).streamRatio = payload.ratio;
                compositor?.setTargetRatio(payload.ratio);
                uiOverlay?.setTargetRatio(payload.ratio);
                sceneDirty = true;
                requestRender();
            }
            break;
    }
};

const getFileUrl = (path: string) => {
    let url = path;
    if (!path.startsWith('http') && !path.startsWith('/') && !path.startsWith('blob:') && !path.startsWith('data:')) {
        url = `/api/s3/${path}`;
    }
    return url;
};

function loadLogo(logoUrl: string) {
    fetch(getFileUrl(logoUrl), { headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {} })
    .then(res => res.blob())
    .then(blob => createImageBitmap(blob))
    .then(bitmap => {
        logoImage = bitmap;
        requestRender();
    })
    .catch(err => console.error('[Worker] Failed to load logo:', err));
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
        streamReaders.get(id)?.cancel();
        streamReaders.delete(id);
    }
    if (frameMap.has(id)) {
        frameMap.get(id)?.close();
        frameMap.delete(id);
    }
    if (textureMap.has(id)) {
        compositor?.gl?.deleteTexture(textureMap.get(id)!);
        textureMap.delete(id);
    }
    if (avatarEngine?.getGuest(id)) {
        // Assume renderer/mixer cleanup is handled or memory leaked manually? 
        // Need to add explicit cleanup in AvatarEngine if needed long term
        avatarEngine.getAllGuests().delete(id);
    }

    textureDirtyMap.delete(id);
    sceneDirty = true;
}

function renderLoop(time: number = 0) {
    if (!compositor || !compositor.gl || !canvas || !uiOverlay || !avatarEngine) return;
    const gl = compositor.gl;

    const delta = lastTime ? (time - lastTime) / 1000 : 0.016;
    lastTime = time;

    // Face Tracking Smoothing
    const smoothingThreshold = 0.0001;
    const smoothingFactor = 0.15;
    const dx = faceTracking.targetX - faceTracking.currentX;
    const dy = faceTracking.targetY - faceTracking.currentY;
    
    if (Math.abs(dx) > smoothingThreshold || Math.abs(dy) > smoothingThreshold) {
        faceTracking.currentX += dx * smoothingFactor;
        faceTracking.currentY += dy * smoothingFactor;
        sceneDirty = true; 
    }

    const hasActiveVideo = textureMap.size > 0;
    const hasActiveModel = avatarEngine.getAllGuests().size > 0;
    let hasNewFrames = false;
    textureDirtyMap.forEach((dirty) => { if (dirty) hasNewFrames = true; });

    const hasVisualOutput = hasActiveVideo || hasActiveModel || (activeScene && activeScene.layout);
    const hasDynamicElements = performanceLyricsVisible || (visualSettings as any).showTicker || (visualSettings as any).breakMode?.enabled || commerceState.purchaseNotifications.length > 0;

    if (!sceneDirty && !hasNewFrames && !hasDynamicElements && !hasActiveModel && hasVisualOutput) {
        requestAnimationFrame(renderLoop);
        return;
    }

    if (!sceneDirty && (!hasVisualOutput || !hasDynamicElements) && !hasActiveVideo && !hasActiveModel && !hasNewFrames) {
        isRendering = false;
        lastTime = 0;
        return;
    }

    // Upload Video Textures
    textureDirtyMap.forEach((dirty, id) => {
        if (!dirty) return;
        const frame = frameMap.get(id);
        if (!frame) return;

        if (!textureMap.has(id)) {
            const tex = compositor.createEmptyTexture(frame.displayWidth, frame.displayHeight);
            if (tex) textureMap.set(id, tex);
        }
        const tex = textureMap.get(id);
        if (tex) {
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(gl.TEXTURE_2D, 0, (gl as any).RGBA, (gl as any).RGBA, gl.UNSIGNED_BYTE, frame);
            textureDirtyMap.set(id, false);
            sceneDirty = true;
        }
    });

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 1. Process 3D Guests
    const isHostActive = activeScene?.layout?.regions?.some((r: any) => r.source === 'host') || false;
    avatarEngine.renderAll(time, isHostActive, latestFaceData);
    
    // 1b. Process AntAR Masks
    if (antArEngine && latestFaceData) {
        antArEngine.updateFaceData(latestFaceData.landmarks, latestFaceData.matrix);
        const maskCanvas = antArEngine.render();
        compositor.updateAntArMaskTexture(maskCanvas);
        
        // Ensure AR settings have latest landmarks for morphing shaders
        if (visualSettings.ar) {
            visualSettings.ar.landmarks = latestFaceData.landmarks;
        }
    }

    avatarEngine.getAllGuests().forEach((guest, id) => {
        let texture = textureMap.get(id);
        if (!texture) {
            texture = compositor.createEmptyTexture(512, 512);
            if (texture) textureMap.set(id, texture);
        }
        if (texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, (gl as any).RGBA, (gl as any).RGBA, gl.UNSIGNED_BYTE, guest.renderer.domElement);
            videoMetadata.set(id, { width: 512, height: 512 });
        }
    });

    // 2. Base Compositor rendering
    if (cinematicMode && textureMap.has('cinematic')) {
        compositor.renderToCanvas(textureMap.get('cinematic')!, {x:0, y:0, width:100, height:100}, videoMetadata.get('cinematic') || {width:1920, height:1080}, false, false);
    } else if (activeScene?.layout?.regions) {
        activeScene.layout.regions.forEach((region: any) => {
            let id = '';
            if (region.source === 'host') id = 'host';
            else if (region.source === 'screen') id = 'screen';
            else if (region.source === 'media') id = 'media';
            else if (region.source.startsWith('guest')) {
                const guestData = slotMap.get(region.source);
                id = guestData ? guestData.id : region.source;
            }

            const sourceTexture = id ? textureMap.get(id) : null;
            const meta = id ? videoMetadata.get(id) : null;

            if (sourceTexture && meta) {
                if (id === 'host') {
                    // Pre-calculate aspects for effects
                    const targetAspect = (canvas?.width || 0) / (canvas?.height || 1); // Fullscreen framing pass
                    const sourceAspect = meta.width / meta.height;
                    let texScaleX = 1.0, texScaleY = 1.0, texOffsetX = 0.0, texOffsetY = 0.0;
                    if (sourceAspect > targetAspect) { texScaleX = targetAspect / sourceAspect; texOffsetX = (1.0 - texScaleX) / 2.0; } 
                    else if (sourceAspect < targetAspect) { texScaleY = sourceAspect / targetAspect; texOffsetY = (1.0 - texScaleY) / 2.0; }

                    let finalTexture = sourceTexture;
                    if (visualSettings.beauty.smoothing > 0.01 || visualSettings.beauty.brightness !== 1.0 || visualSettings.beauty.sharpen > 0.01 || visualSettings.beauty.denoise > 0.01 || visualSettings.background.mode !== 'none' || visualSettings.chromaKey?.enabled) {
                        finalTexture = compositor.applyVisualEffects(sourceTexture, meta.width, meta.height, visualSettings, true, [texScaleX, texScaleY], [texOffsetX, texOffsetY]);
                    }
                    const mirroredCenterX = 1.0 - faceTracking.currentX;
                    compositor.renderToCanvas(finalTexture, region, canvas!, true, true, mirroredCenterX, faceTracking.currentY);
                } else {
                    compositor.renderToCanvas(sourceTexture, region, meta, false, false);
                }
            }
        });
    }

    // 3. 2D Overlays
    if (performanceLyricsVisible && performanceLyrics.length > 0) {
        if (cinematicMode) {
            uiOverlay.renderLyricsInRegion(0, 0, 1, 1, performanceLyrics, performanceLyricsCurrentTime, performanceLyricsStyle);
        } else if (activeScene?.layout?.regions && performingVTuberId) {
            activeScene.layout.regions.forEach((region: any) => {
                let isTarget = false;
                if (region.source === 'host' && performingVTuberId === 'host') isTarget = true;
                else if (region.source.startsWith('guest')) {
                    const guestData = slotMap.get(region.source);
                    if (guestData && guestData.id === performingVTuberId) isTarget = true;
                }
                if (isTarget) {
                    const x = region.x / 100.0, y = region.y / 100.0, w = region.width / 100.0, h = region.height / 100.0;
                    uiOverlay.renderLyricsInRegion(x, y, w, h, performanceLyrics, performanceLyricsCurrentTime, performanceLyricsStyle);
                }
            });
        }
    }

    if (currentSubtitle) {
        uiOverlay.renderSubtitles(0, 0, 1, 1, currentSubtitle);
    }

    if (currentCaption) {
        uiOverlay.renderCapCutSubtitle(0, 0, 1, 1, currentCaption, time);
        sceneDirty = true; // Animate pop-in and highlights
    }

    if (logoImage && (visualSettings as any).branding?.logoUrl) {
        uiOverlay.renderBrandLogo(logoImage, (visualSettings as any).branding);
    }

    if ((visualSettings as any).breakMode?.enabled) {
        uiOverlay.renderBreakOverlay(time, (visualSettings as any).breakMode?.message);
    }

    if ((visualSettings as any).showLowerThird && !cinematicMode) {
        uiOverlay.renderLowerThird((visualSettings as any).branding || {}, activeScene, slotMap);
    }

    if ((visualSettings as any).showTicker && !cinematicMode) {
        uiOverlay.renderTicker((visualSettings as any).tickerText);
        sceneDirty = true; // Animate
    }

    if ((visualSettings as any).specialOverlays?.showSponsorship && !cinematicMode) {
        uiOverlay.renderSponsorshipBadge((visualSettings as any).specialOverlays.sponsorName);
    }

    if (!cinematicMode && (commerceState.flashSaleActive || commerceState.activeProduct || commerceState.purchaseNotifications.length > 0)) {
        const vibe = (visualSettings as any).vibeScore || 85;
        const velocity = (visualSettings as any).chatVelocity || 0;
        uiOverlay.renderCommerceOverlays(commerceState.flashSaleActive, commerceState.activeProduct, commerceState.qrCodeBitmap, commerceState.purchaseNotifications, time, vibe, velocity);
        sceneDirty = true; // Keep animating for notifications
    }

    sceneDirty = false;
    requestAnimationFrame(renderLoop);
}
