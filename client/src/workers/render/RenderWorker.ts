import { WebGLCompositor, VisualSettings } from './services/WebGLCompositor';
import { UIOverlayRenderer } from './services/UIOverlayRenderer';
import { AntAREngine } from './services/AntAREngine';
import { ShaderLibrary } from '@/utils/webgl/ShaderLibrary';

let canvas: HTMLCanvasElement | OffscreenCanvas | null = null;
let activeScene: any = null;
let authToken: string | null = null;

// Core Engines
let compositor: WebGLCompositor;
let uiOverlay: UIOverlayRenderer;
let antArEngine: AntAREngine;
let shaderLib: ShaderLibrary;

// Data States
const frameMap = new Map<string, VideoFrame>();
const streamReaders = new Map<string, ReadableStreamDefaultReader<VideoFrame>>();
const videoMetadata = new Map<string, { width: number, height: number }>();
const textureMap = new Map<string, WebGLTexture>();
const textureDirtyMap = new Map<string, boolean>();
const snapshotInProgress = new Map<string, boolean>();

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
let performingInfluencerId: string | null = null;
let performanceLyricsVisible: boolean = false;
let performanceLyricsStyle: string = 'neon';

// Graphics State
let logoImage: ImageBitmap | null = null;
let currentSubtitle: string = '';
let currentCaption: any = null;
let currentQuest: any = null;
let activeFacts: any[] = [];
let vizData: any[] = [];
let activeRecap: any = null;
let cinematicMode: boolean = false;
let hypeLevel: number = 0;
let contextData: Record<string, any> = {};
let isLiveState: boolean = false;
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
                const gl = canvas.getContext('webgl2', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGL2RenderingContext || 
                           canvas.getContext('webgl', { alpha: false, desynchronized: true, premultipliedAlpha: false }) as WebGLRenderingContext;
                
                if (!gl) throw new Error('WebGL not supported');

                shaderLib = new ShaderLibrary(gl);
                
                compositor = new WebGLCompositor();
                compositor.init(canvas, shaderLib);
                
                uiOverlay = new UIOverlayRenderer();
                uiOverlay.init(gl, canvas.width, canvas.height, shaderLib);

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
                // console.log(`[RenderWorker] Updating background texture: ${payload.backgroundData.width}x${payload.backgroundData.height}`);
                compositor?.updateBackgroundTexture(payload.backgroundData);
                requestRender();
            }
            break;

        case 'update-overlay':
            // Logic for pre-rendered full-screen overlays like PNG frames
            break;

        case 'update-guest-texture':
            if (payload.bitmap) {
                payload.bitmap.close(); // Immediate cleanup as engine is removed
            }
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
        case 'update-3d-audio':
        case 'update-3d-thinking':
            // Logic handled by VirtualGuest component in main thread now.
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
            performingInfluencerId = payload.performingInfluencerId || null;
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
            
        case 'update-quest':
            currentQuest = payload;
            sceneDirty = true;
            break;

        case 'update-commerce':
            console.log("update-commerce", payload);
            if (commerceState.qrCodeBitmap && payload.qrCodeBitmap) {
                commerceState.qrCodeBitmap.close(); // Clean up old bitmap
            }
            if (payload.qrCodeBitmap !== undefined) commerceState.qrCodeBitmap = payload.qrCodeBitmap;
            if (payload.activeProduct !== undefined) commerceState.activeProduct = payload.activeProduct;
            if (payload.flashSaleActive !== undefined) commerceState.flashSaleActive = payload.flashSaleActive;
            if (payload.purchaseNotifications !== undefined) commerceState.purchaseNotifications = payload.purchaseNotifications;
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
            
        case 'update-facts':
            activeFacts = payload.facts || [];
            sceneDirty = true;
            break;

        case 'update-viz':
            vizData = payload.data || [];
            sceneDirty = true;
            break;

        case 'show-recap':
            activeRecap = payload.recap;
            sceneDirty = true;
            break;

        case 'update-hype-level':
            hypeLevel = payload.level || 0;
            sceneDirty = true;
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
            
        case 'videoMetadata':
            videoMetadata.set(payload.id, payload.metadata);
            sceneDirty = true;
            break;

        case 'update-context-data':
            contextData = { ...contextData, ...payload.data };
            sceneDirty = true;
            break;

        case 'update-live-status':
            isLiveState = !!payload.isLive;
            sceneDirty = true;
            requestRender();
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

    textureDirtyMap.delete(id);
    sceneDirty = true;
}

function renderLoop(time: number = 0) {
    if (!compositor || !compositor.gl || !canvas || !uiOverlay) return;
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

    const hasVisualOutput = (textureMap.size > 0) || (activeScene && activeScene.layout);
    let hasNewFrames = false;
    textureDirtyMap.forEach((dirty) => { if (dirty) hasNewFrames = true; });

    const hasDynamicElements = performanceLyricsVisible || (visualSettings as any).showTicker || (visualSettings as any).breakMode?.enabled || commerceState.purchaseNotifications.length > 0;

    if (!sceneDirty && !hasNewFrames && !hasDynamicElements && hasVisualOutput) {
        requestAnimationFrame(renderLoop);
        return;
    }

    if (!sceneDirty && (!hasVisualOutput || !hasDynamicElements) && textureMap.size === 0 && !hasNewFrames) {
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

    gl.viewport(0, 0, (canvas as any).width, (canvas as any).height);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // 0. Base Layer: Virtual Background (Robustness Fix Phase 35)
    if (visualSettings.background?.mode === 'virtual') {
        if (compositor.backgroundTexture && compositor.backgroundMetadata.width > 0) {
            const bgMeta = compositor.backgroundMetadata;
            compositor.renderToCanvas(compositor.backgroundTexture, { x: 0, y: 0, width: 100, height: 100 }, bgMeta, false, false);
        } else {
            // Fallback: Use a moody studio depth color if texture is loading
            gl.clearColor(0.02, 0.02, 0.05, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        }
    }

    // 1. Process 3D Guests
    // const isHostActive = activeScene?.layout?.regions?.some((r: any) => r.source === 'host') || false;
    // avatarEngine.renderAll(time, isHostActive, latestFaceData);
    
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
                    const targetAspect = (canvas?.width || 0) / (canvas?.height || 1); 
                    const sourceAspect = meta.width / meta.height;
                    let texScaleX = 1.0, texScaleY = 1.0, texOffsetX = 0.0, texOffsetY = 0.0;
                    if (sourceAspect > targetAspect) { texScaleX = targetAspect / sourceAspect; texOffsetX = (1.0 - texScaleX) / 2.0; } 
                    else if (sourceAspect < targetAspect) { texScaleY = sourceAspect / targetAspect; texOffsetY = (1.0 - texScaleY) / 2.0; }

                    let finalTexture = sourceTexture;
                    if (visualSettings.beauty.smoothing > 0.01 || visualSettings.beauty.brightness !== 1.0 || visualSettings.beauty.sharpen > 0.01 || visualSettings.beauty.denoise > 0.01 || visualSettings.background.mode !== 'none' || visualSettings.chromaKey?.enabled) {
                        finalTexture = compositor.applyVisualEffects(sourceTexture, meta.width, meta.height, visualSettings, true, [texScaleX, texScaleY], [texOffsetX, texOffsetY]);
                    }
                    
                    if (id === 'host') {
                        const mirroredCenterX = 1.0 - faceTracking.currentX;
                        compositor.renderToCanvas(finalTexture, region, canvas!, true, true, mirroredCenterX, faceTracking.currentY);
                    } else {
                        // For guest, render directly to scene region using the effect-processed texture
                        compositor.renderToCanvas(finalTexture, region, meta, false, false);
                    }
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
        } else if (activeScene?.layout?.regions && performingInfluencerId) {
            activeScene.layout.regions.forEach((region: any) => {
                let isTarget = false;
                if (region.source === 'host' && performingInfluencerId === 'host') isTarget = true;
                else if (region.source.startsWith('guest')) {
                    const guestData = slotMap.get(region.source);
                    if (guestData && guestData.id === performingInfluencerId) isTarget = true;
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

    // Prepare 2D Canvas for Context & Global Overlays
    uiOverlay.clearGraphics();

    if (logoImage && (visualSettings as any).branding?.logoUrl) {
        uiOverlay.drawBrandLogo(logoImage, (visualSettings as any).branding);
    }

    if ((visualSettings as any).breakMode?.enabled) {
        uiOverlay.drawBreakOverlay(time, (visualSettings as any).breakMode?.message);
    }

    if ((visualSettings as any).showLowerThird && !cinematicMode) {
        uiOverlay.drawLowerThird((visualSettings as any).branding || {}, activeScene, slotMap);
    }

    if ((visualSettings as any).showTicker && !cinematicMode && isLiveState) {
        uiOverlay.drawTicker((visualSettings as any).tickerText);
        sceneDirty = true; // Animate
    }

    if ((visualSettings as any).specialOverlays?.showSponsorship && !cinematicMode && isLiveState) {
        uiOverlay.drawSponsorshipBadge((visualSettings as any).specialOverlays.sponsorName);
    }

    if (!cinematicMode && isLiveState && (commerceState.flashSaleActive || commerceState.activeProduct || commerceState.purchaseNotifications.length > 0)) {
        const vibe = (visualSettings as any).vibeScore || 85;
        const velocity = (visualSettings as any).chatVelocity || 0;
        
        const ctxType = (visualSettings as any).streamingContext;
        if (ctxType === 'sales') {
            // Sales context has its own overlay for product/timer, so only draw notifications here
            uiOverlay.drawCommerceOverlays(null, null, null, commerceState.purchaseNotifications, time, vibe, velocity);
        } else {
            uiOverlay.drawCommerceOverlays(commerceState.flashSaleActive, commerceState.activeProduct, commerceState.qrCodeBitmap, commerceState.purchaseNotifications, time, vibe, velocity);
        }
        sceneDirty = true; // Keep animating for notifications
    }

    if (currentQuest && !cinematicMode && isLiveState) {
        uiOverlay.drawQuestOverlay(currentQuest, time);
        sceneDirty = true; // Keep animating for shimmers/pulses
    }

    if (activeFacts.length > 0 && !cinematicMode && isLiveState) {
        uiOverlay.drawFactCheckHub(activeFacts, 40, canvas.height - (activeFacts.length * 60 + 60));
        sceneDirty = true;
    }

    if (vizData.length > 0 && !cinematicMode && isLiveState) {
        uiOverlay.drawDataVizWidget(vizData, 'Live Engagement', 40, 150);
        sceneDirty = true;
    }

    // Context-Specific Overlays
    const ctxType = (visualSettings as any).streamingContext;
    if (ctxType && !cinematicMode && isLiveState) {
        if (ctxType === 'education' && visualSettings.streamRatio !== '9:16') {
            uiOverlay.drawEducationOverlay(contextData.education);
            sceneDirty = true;
        } else if (ctxType === 'news') {
            uiOverlay.drawNewsOverlay(contextData.news);
        } else if (ctxType === 'sport') {
            uiOverlay.drawSportOverlay(contextData.sport);
        } else if (ctxType === 'sales') {
            uiOverlay.drawSalesOverlay(contextData.sales);
            // // FORCE DEBUG MOCK: Render product even if none is selected
            // const activeProduct = commerceState.activeProduct || {
            //     name: "LIMITED EDITION E-COMMERCE MOCK PRODUCT",
            //     price: 1337.99,
            //     features: ["Anti-Gravity Tech", "Super Fast Delivery", "Zero Latency AI"],
            //     showQR: true
            // };
            // const flashSale = commerceState.flashSaleActive || {
            //     startTime: Date.now() - 60000,
            //     durationMinutes: 60
            // };
            
            // const salesData = { 
            //     ...contextData.sales, 
            //     activeProduct: activeProduct, 
            //     flashSale: flashSale 
            // };
            // // Uses a default placeholder QR if qrCodeBitmap is missing
            // uiOverlay.drawSalesOverlay(salesData, commerceState.qrCodeBitmap);
            sceneDirty = true;
        } else if (ctxType === 'gameshow') {
            uiOverlay.drawGameShowOverlay(contextData.gameshow);
        } else if (ctxType === 'talkshow') {
            uiOverlay.drawTalkShowOverlay(contextData.talkshow);
        }
    }

    if (activeRecap && !cinematicMode && isLiveState) {
        uiOverlay.drawFinalRecapCard(activeRecap, canvas.width, canvas.height);
        sceneDirty = true;
    }

    // Phase 33: Neural Singularity Aura Effect
    if (hypeLevel > 0.5) {
        uiOverlay.drawSingularityAura(hypeLevel);
        sceneDirty = true;
    }

    // FLUSH 2D GRAPHICS CONTEXT TO WEBGL TEXTURE
    uiOverlay.uploadAndRenderGraphics();

    sceneDirty = false;
    requestAnimationFrame(renderLoop);
}
