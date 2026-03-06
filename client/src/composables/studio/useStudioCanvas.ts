import { ref, type Ref, reactive, onUnmounted, watch, onMounted } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { QRCodeGenerator } from '@/utils/ai/QRCodeGenerator';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';
import { arEngine } from '@/utils/ar/AREngine';
import { useMediaStore } from '@/stores/media';
import { getFileUrl } from '@/utils/api';
// @ts-ignore
import StudioWorker from '@/workers/render/RenderWorker?worker';

export function useStudioCanvas(
    outputCanvas: Ref<HTMLCanvasElement | null>,
    sourceVideo: Ref<HTMLVideoElement | null>,
    guestVideos: Ref<Record<string, HTMLVideoElement>>,
    options: {
        streamQuality: Ref<string>;
        enableAsl: Ref<boolean>;
        purchaseNotifications: Ref<any[]>;
        hostLevel: Ref<number>;
        guestLevels: Ref<Record<string, number>>;
        realChatVelocity: Ref<number>;
        isGuest?: Ref<boolean>;
        myGuestId?: Ref<string | null>;
        useWebGL?: Ref<boolean>;
        screenVideo?: Ref<HTMLVideoElement | null>;
        activeMediaVideo?: Ref<HTMLVideoElement | null>;
        cinematicVideo?: Ref<HTMLVideoElement | null>;
    },
    overlayCanvas?: Ref<HTMLCanvasElement | null>
) {
    const studioStore = useStudioStore();
    const mediaStore = useMediaStore();
    const frameCount = ref(0);
    const lastRenderTime = ref(0);
    const transitionStartTime = ref(0);
    const audioLevel = ref(0);
    const faceFrame = reactive({ x: 0.5, y: 0.5, w: 1, h: 1, targetX: 0.5, targetY: 0.5 });
    
    let isAIProcessing = false;

    const transitionProgress = ref(0);
    const qrCodeImages = new Map<string, HTMLImageElement>();

    let animationFrameId: number | null = null;
    let isRendering = false;
    let lastAIProcessTime = 0;
    const AI_PROCESS_INTERVAL = 30; // 33fps tracking

    // Worker State
    let worker: Worker | null = null;
    let isWorkerEnabled = false;
    const bridgedStreams = new Set<string>();

    // AI Processing Canvas
    let aiCanvas: HTMLCanvasElement | null = null;
    let aiCtx: CanvasRenderingContext2D | null = null;
    let cachedMaskImageData: ImageData | null = null;
    let forceFirstMask = true;
    let lastBackgroundSyncTime = 0;

    const initWorker = () => {
        if (!outputCanvas.value || options.useWebGL?.value === false || options.isGuest?.value) return false;

        // Check support
        if (typeof OffscreenCanvas === 'undefined' || typeof VideoFrame === 'undefined' || typeof MediaStreamTrackProcessor === 'undefined') {
            return false;
        }

        // Proactively check for WebGL2 capability
        try {
            const temp = new OffscreenCanvas(1, 1);
            if (!temp.getContext('webgl2') && !temp.getContext('webgl')) {
                console.warn("[Studio Canvas] WebGL not supported on OffscreenCanvas. Falling back.");
                return false;
            }
        } catch (e) {
            return false;
        }

        try {
            const canvas = outputCanvas.value;
            const offscreen = canvas.transferControlToOffscreen();

            worker = new StudioWorker();
            if (worker) {
                worker.onmessage = (e) => {
                    if (e.data.type === 'error') console.error("Worker Error:", e.data.error);
                };
                worker.postMessage({ type: 'init', payload: { canvas: offscreen } }, [offscreen]);
                worker.postMessage({ type: 'resize', payload: { width: canvas.width, height: canvas.height } });
                isWorkerEnabled = true;
                checkNewStreams();

                if (studioStore.activeScene) {
                    worker.postMessage({ type: 'update-scene', payload: { scene: JSON.parse(JSON.stringify(studioStore.activeScene)) } });
                }

                // Push current background asset if any immediately
                if (studioStore.visualSettings.background.assetUrl) {
                    updateBackgroundAsset(studioStore.visualSettings.background.assetUrl);
                }
                forceFirstMask = true;

                console.log("Studio Rendering Worker Initialized");

                // Listen for guest commands and forward to worker
                const handleWorkerCommand = (e: any) => {
                    if (isWorkerEnabled && worker) {
                        worker.postMessage(e.detail);
                    }
                };
                window.addEventListener('studio-worker-command', handleWorkerCommand);
                // Listener management is now handled at top-level to avoid lifecycle warnings

                return true;
            }
        } catch (e) {
            console.error("Worker Init Failed:", e);
        }
        return false;
    };

    // Cleanup worker commands on unmount (hoisted)
    onUnmounted(() => {
        const handleWorkerCommand = (e: any) => {
            if (isWorkerEnabled && worker) {
                worker.postMessage(e.detail);
            }
        };
        window.removeEventListener('studio-worker-command', handleWorkerCommand);
    });

    const bridgeStream = (id: string, stream: MediaStream | null) => {
        if (!worker || !stream || bridgedStreams.has(id)) return;

        try {
            const track = stream.getVideoTracks()[0];
            if (!track) return;

            // Phase 89: Stop cloning tracks. Cloning creates a new track instance
            // that doesn't share the 'enabled' state of the original.
            // Using the original track allows MediaStreamTrackProcessor to see
            // track.enabled = false (black frames) when toggled in LiveStudio.vue.
            const processor = new MediaStreamTrackProcessor({ track });
            const readable = processor.readable;

            worker.postMessage({ type: 'add-stream', payload: { id, stream: readable } }, [readable]);
            bridgedStreams.add(id);
        } catch (e) {
            console.error("Stream Bridge Failed:", e);
        }
    };

    const checkNewStreams = () => {
        if (!worker) return;

        const currentActiveIds = new Set<string>();

        // 1. Identify what SHOULD be bridged
        if (sourceVideo.value && sourceVideo.value.srcObject) {
            if (!options.isGuest?.value) {
                currentActiveIds.add('host');
                let streamToBridge = sourceVideo.value.srcObject as MediaStream;

                if ((studioStore.visualSettings as any).arEnabled) {
                    if (!arEngine.stream) {
                        arEngine.init(streamToBridge).then(arStream => {
                            arEngine.setEnabled(true);
                            if (bridgedStreams.has('host')) {
                                worker?.postMessage({ type: 'remove-stream', payload: { id: 'host' } });
                                bridgedStreams.delete('host');
                            }
                            bridgeStream('host', arStream);
                        });
                    } else {
                        streamToBridge = arEngine.stream;
                        bridgeStream('host', streamToBridge);
                    }
                } else {
                    if (arEngine.stream) {
                        arEngine.setEnabled(false);
                        arEngine.destroy();
                        if (bridgedStreams.has('host')) {
                            worker?.postMessage({ type: 'remove-stream', payload: { id: 'host' } });
                            bridgedStreams.delete('host');
                        }
                    }
                    bridgeStream('host', streamToBridge);
                }
            } else if (options.myGuestId?.value) {
                const myGuest = studioStore.liveGuests.find(g => g.uuid === options.myGuestId?.value);
                if (myGuest && myGuest.slotIndex !== undefined) {
                    const id = `guest${myGuest.slotIndex + 1}`;
                    currentActiveIds.add(id);
                    bridgeStream(id, sourceVideo.value.srcObject as MediaStream);
                }
            }
        }

        Object.entries(guestVideos.value).forEach(([key, video]) => {
            console.log(`[Studio Canvas] Bridging guest video: ${key}, hasVideo: ${!!video}, readyState: ${video.readyState}`);
            currentActiveIds.add(key);
            bridgeStream(key, video.srcObject as MediaStream);
        });

        // 1.5 Bridge Screen Share
        if (options.screenVideo?.value && studioStore.isScreenSharing) {
            currentActiveIds.add('screen');
            bridgeStream('screen', options.screenVideo.value.srcObject as MediaStream);
        }

        // 1.6 Bridge Active Media
        if (options.activeMediaVideo?.value && studioStore.activeMediaId) {
            currentActiveIds.add('media');
            bridgeStream('media', options.activeMediaVideo.value.srcObject as MediaStream);
        }

        // 1.7 Bridge Cinematic Stage
        if (options.cinematicVideo?.value) {
            currentActiveIds.add('cinematic');
            bridgeStream('cinematic', options.cinematicVideo.value.srcObject as MediaStream);
        }

        // 2. Remove what is no longer active
        bridgedStreams.forEach(id => {
            if (!currentActiveIds.has(id)) {
                console.log(`[Studio Canvas] Removing orphaned stream: ${id}`);
                worker?.postMessage({ type: 'remove-stream', payload: { id } });
                bridgedStreams.delete(id);
            }
        });
    };

    // Watchers for Worker
    watch(() => studioStore.activeScene, (newScene) => {
        if (isWorkerEnabled && worker && newScene) {
            worker.postMessage({ type: 'update-scene', payload: { scene: JSON.parse(JSON.stringify(newScene)) } });
        }
    }, { deep: true });

    watch([
        () => studioStore.visualSettings,
        () => studioStore.vibeScore,
        () => studioStore.chatVelocity
    ], ([newSettings, vibe, chatVelocity]) => {
        if (isWorkerEnabled && worker) {
            const token = localStorage.getItem('auth-token');
            worker.postMessage({ 
                type: 'update-settings', 
                payload: {
                    ...JSON.parse(JSON.stringify(newSettings)),
                    authToken: token,
                    vibeScore: vibe,
                    chatVelocity: chatVelocity,
                    streamRatio: studioStore.streamRatio
                } 
            });
        }
    }, { deep: true, immediate: true });

    watch(() => studioStore.streamRatio, (ratio) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({ type: 'update-ratio', payload: { ratio } });
        }
    });
    
    watch(() => studioStore.guestSlotMap, (newSlots) => {
        if (isWorkerEnabled && worker) {
			console.log("update-guest-slots");
            worker.postMessage({ type: 'update-guest-slots', payload: { slots: JSON.parse(JSON.stringify(newSlots)) } });
        }
    }, { deep: true, immediate: true });

    watch([
        () => guestVideos.value,
        () => sourceVideo.value,
        () => options.screenVideo?.value,
        () => options.activeMediaVideo?.value,
        () => options.cinematicVideo?.value,
        () => studioStore.isScreenSharing,
        () => studioStore.activeMediaId,
        () => (studioStore.visualSettings as any).arEnabled
    ], () => {
        if (isWorkerEnabled) checkNewStreams();
    }, { deep: true, immediate: true });

    // Phase 93: Sync lyrics to worker
    watch([
        () => mediaStore.performanceLyrics,
        () => mediaStore.performanceLyricsCurrentTime,
        () => mediaStore.performingVTuberId,
        () => mediaStore.performanceLyricsVisible,
        () => mediaStore.performanceLyricsStyle
    ], ([lyrics, currentTime, vtuberId, visible, style]) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({
                type: 'update-lyrics',
                payload: {
                    lyrics: JSON.parse(JSON.stringify(lyrics)),
                    currentTime,
                    performingVTuberId: vtuberId,
                    visible,
                    style
                }
            });
        }
    }, { immediate: true });

    // Handle Background Asset Changes
    let bgVideoElement: HTMLVideoElement | null = null;
    const updateBackgroundAsset = async (url: string | null) => {
        if (!isWorkerEnabled || !worker || !url) return;

        if (studioStore.visualSettings.background.isAssetVideo) {
            if (!bgVideoElement) {
                bgVideoElement = document.createElement('video');
                bgVideoElement.crossOrigin = 'anonymous';
                bgVideoElement.muted = true;
                bgVideoElement.loop = true;
            }
            bgVideoElement.src = url;
            await bgVideoElement.play();
        } else {
            if (bgVideoElement) {
                bgVideoElement.pause();
                bgVideoElement.src = '';
            }
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = getFileUrl(url);
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
                const bitmap = await createImageBitmap(img);
                worker.postMessage({ type: 'update-background', payload: { backgroundData: bitmap } }, [bitmap]);
            } catch (e) {
                console.error("[Studio Canvas] Background load failed:", e);
            }
        }
    };

    watch(() => studioStore.visualSettings.background.assetUrl, (url) => {
        updateBackgroundAsset(url);
    }, { immediate: true });

    // Chroma Key
    watch(() => studioStore.visualSettings.chromaKey, (newSettings) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({ 
                type: 'update-chroma', 
                payload: JSON.parse(JSON.stringify(newSettings)) 
            });
        }
    }, { deep: true, immediate: true });

    // Lens Profile (LUT)
    const updateLUT = async (profileId: string) => {
        if (!isWorkerEnabled || !worker) return;

        if (profileId === 'none') {
            worker.postMessage({ type: 'update-lut', payload: { enabled: false } });
            return;
        }

        // Send profile name to worker (Internal Generation)
        worker.postMessage({ type: 'update-lut', payload: { enabled: true, profile: profileId } });
    };

    watch(() => studioStore.visualSettings.lensProfile, (newProfile) => {
        updateLUT(newProfile);
    });
    
    // Also watch activeFilter for backward compatibility if settings uses that
    watch(() => studioStore.visualSettings.activeFilter, (newFilter) => {
        if (newFilter !== 'none') updateLUT(newFilter);
    });

    // Handle Brand Logo Changes (Phase 18)
    const updateBrandLogo = (url: string) => {
        if (!isWorkerEnabled || !worker) return;
        worker.postMessage({ type: 'update-brand-logo', payload: { logoUrl: url } });
        console.log('[Studio Canvas] Brand logo URL updated:', url);
    };

    watch(() => studioStore.visualSettings.branding.logoUrl, (url) => {
        updateBrandLogo(url);
    }, { immediate: true });

    // Commerce State Sync Watcher
    const sendCommerceState = async () => {
        if (!isWorkerEnabled || !worker) return;

        const flashSaleActive = studioStore.activeFlashSale;
        let activeProduct = null;
        let qrCodeBitmap: ImageBitmap | null = null;
        
        if (studioStore.activeProductId) {
            activeProduct = studioStore.liveProducts.find((p: any) => p.id === studioStore.activeProductId || p._id === studioStore.activeProductId);
            
            if (activeProduct) {
                const productId = activeProduct.id || activeProduct._id;
                let qrImg = qrCodeImages.get(productId);

                if (!qrImg) {
                    qrImg = new Image();
                    qrImg.crossOrigin = 'anonymous';
                    qrImg.src = QRCodeGenerator.getProductQR(activeProduct.inventoryUrl || `https://antstudio.agrhub.com/p/${productId}`);
                    qrCodeImages.set(productId, qrImg);
                    
                    await new Promise(resolve => {
                        qrImg!.onload = resolve;
                        qrImg!.onerror = resolve; // Continue on error
                    });
                }
                
                try {
                    if (qrImg.complete && qrImg.naturalWidth > 0) {
                        qrCodeBitmap = await createImageBitmap(qrImg);
                    }
                } catch (e) {
                    console.error("Failed to create QR code bitmap", e);
                }
            }
        }

        const notifications = JSON.parse(JSON.stringify(options.purchaseNotifications.value));

        let transfer: Transferable[] = [];
        if (qrCodeBitmap) transfer.push(qrCodeBitmap);

        worker.postMessage({
            type: 'update-commerce',
            payload: {
                flashSaleActive,
                activeProduct,
                purchaseNotifications: notifications,
                qrCodeBitmap
            }
        }, transfer);
    };

    watch([
        () => studioStore.activeProductId,
        () => studioStore.activeFlashSale,
        () => options.purchaseNotifications.value.length
    ], () => {
        sendCommerceState();
    }, { deep: true, immediate: true });

    // Initialize AI Engine
    onMounted(async () => {
        // Phase 89: Listen for metadata on these elements so we bridge as soon as stream exists
        if (options.screenVideo?.value) {
            options.screenVideo.value.onloadedmetadata = () => checkNewStreams();
        }
        if (options.activeMediaVideo?.value) {
            options.activeMediaVideo.value.onloadedmetadata = () => checkNewStreams();
        }

        try {
            await liveAIEngine.initialize();
            console.log('[Studio Canvas] AI Engine initialized');

            // --- LATENCY FIX: Worker-to-Worker Direct Channel ---
            if (isWorkerEnabled && worker && liveAIEngine.getWorker()) {
                const channel = new MessageChannel();
                
                // Send port1 to Render Worker
                worker.postMessage({ type: 'SETUP_AI_CHANNEL' }, [channel.port1]);
                
                // Send port2 to AI Tracking Worker
                liveAIEngine.getWorker()!.postMessage({ type: 'SETUP_CHANNEL' }, [channel.port2]);
                
                console.log('[Studio Canvas] Worker-to-Worker Direct Channel Established');
            }
        } catch (error) {
            console.error('[Studio Canvas] Failed to initialize AI engine:', error);
        }
    });


    const overlayDirty = ref(true);

    // Watch for state changes that require a redraw
    watch([
        () => studioStore.liveGuests,
        () => studioStore.activeScene,
        () => studioStore.activeProductId,
        () => studioStore.activeFlashSale,
        () => options.purchaseNotifications.value.length
    ], () => {
        overlayDirty.value = true;
    }, { deep: true });

    // Handle stage resizing
    onMounted(() => {
        if (overlayCanvas?.value) {
            const resizeObserver = new ResizeObserver(() => {
                overlayDirty.value = true;
                // If worker is active, send updated dimensions
                if (isWorkerEnabled && worker && outputCanvas.value) { // Use outputCanvas for worker dimensions
                    worker.postMessage({ type: 'resize', payload: { width: outputCanvas.value.width, height: outputCanvas.value.height } });
                    forceFirstMask = true;
                }
            });
            resizeObserver.observe(overlayCanvas.value);
            onUnmounted(() => resizeObserver.disconnect());
        }
    });

    const startRendering = () => {
        if (isRendering) {
            console.warn('[Studio Canvas] Rendering loop already active. Ignoring start request.');
            return;
        }

        console.log('[Studio Canvas] Starting rendering loop...');
        isRendering = true;

        if (initWorker()) {
            startWorkerLoop();
        } else {
            start2DLoop();
        }
    };

    const startWorkerLoop = () => {
        const loop = (time: number) => {
            if (!isRendering) return;
            // checkNewStreams(); // Moved to watch() for efficiency
            if (!studioStore.godModeEnabled) audioLevel.value = options.hostLevel.value;

            // Process AI for framing and segmentation
            if (sourceVideo.value && sourceVideo.value.readyState >= 2 && (forceFirstMask || time - lastAIProcessTime > AI_PROCESS_INTERVAL)) {
                // Always process for framing, but skip heavy segmentation if background mode is 'none'
                const skipSegmentation = studioStore.visualSettings.background.mode === 'none';
                processAISegmentation(sourceVideo.value, time, skipSegmentation);
                
                lastAIProcessTime = time;
                forceFirstMask = false;

                // If virtual background is video, send frame too
                if (studioStore.visualSettings.background.mode === 'virtual' && bgVideoElement && !bgVideoElement.paused) {
                    createImageBitmap(bgVideoElement).then(bitmap => {
                        worker?.postMessage({ type: 'update-background', payload: { backgroundData: bitmap } }, [bitmap]);
                    });
                }
            }

            // Hybrid Rendering: Draw Overlays on Main Thread ONLY if dirty
            const hasNotifications = !isWorkerEnabled && options.purchaseNotifications.value.length > 0;
            const isGuestWithHost = options.isGuest?.value && guestVideos.value['host'];

            if (overlayCanvas?.value && (overlayDirty.value || hasNotifications)) {
                const canvas = overlayCanvas.value;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    // Render Overlays even for Guests (they see them on top of host's program feed)
                    if (studioStore.activeScene && studioStore.activeScene.layout) {
                        studioStore.activeScene.layout.regions.forEach((region: any) => {
                            const x = (region.x / 100) * canvas.width;
                            const y = (region.y / 100) * canvas.height;
                            const w = (region.width / 100) * canvas.width;
                            const h = (region.height / 100) * canvas.height;

                            if (region.source === 'host') {
                                renderNameTag(ctx, 'HOST', x, y, w, h);
                            } else if (region.source.startsWith('guest')) {
                                const guest = studioStore.guestSlotMap[region.source];
                                if (guest) {
                                    renderNameTag(ctx, guest.name, x, y, w, h);
                                }
                            }
                        });
                    }
                    
                    // Phase 93: Global Lyrics Burn-in removed from overlay canvas to prevent duplication
                    // Per-slot lyrics are handled in drawActualRegion

                    if (!hasNotifications) overlayDirty.value = false;
                }
            }

            // Periodic background re-sync (every 2 seconds)
            if (studioStore.visualSettings.background.mode === 'virtual' && time - lastBackgroundSyncTime > 2000) {
                updateBackgroundAsset(studioStore.visualSettings.background.assetUrl);
                lastBackgroundSyncTime = time;
            }

            animationFrameId = requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    };


    const start2DLoop = () => {
        const render = (time: number) => {
            if (!isRendering) return;
            const delta = time - lastRenderTime.value;
            const targetFps = options.streamQuality.value === 'low' ? 24 : 30;
            const frameInterval = 1000 / targetFps;

            if (delta < frameInterval) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }
            lastRenderTime.value = time;
            frameCount.value++;

            if (!outputCanvas.value) return;
            const canvas = outputCanvas.value;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Handle Transition Progress
            if (studioStore.isTransitioning) {
                if (transitionStartTime.value === 0) transitionStartTime.value = time;
                transitionProgress.value = Math.min(1, (time - transitionStartTime.value) / 600);
            } else {
                transitionStartTime.value = 0;
                transitionProgress.value = 0;
            }

            if (options.isGuest?.value && guestVideos.value['host']) {
                // If Guest, just show the Host's Program Feed (unified composition)
                drawImageCover(ctx, guestVideos.value['host'], 0, 0, canvas.width, canvas.height);
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            if (studioStore.isTransitioning && studioStore.nextScene && studioStore.transitionType !== 'instant') {
                renderTransition(ctx, canvas);
            } else {
                studioStore.activeScene.layout.regions.forEach((region: any) => {
                    renderRegion(ctx, region, canvas);
                });
            }
            renderCommerceOverlays(ctx, canvas);

            if (options.enableAsl.value) {
                // ASL logic
            }

            if (!studioStore.godModeEnabled) {
                audioLevel.value = options.hostLevel.value;
            }

            animationFrameId = requestAnimationFrame(render);
        };
        animationFrameId = requestAnimationFrame(render);
    };

    const stopRendering = () => {
        isRendering = false;
        console.log('[Studio Canvas] Stopping rendering loop...');

        if (worker) {
            worker.terminate();
            worker = null;
            isWorkerEnabled = false;
        }
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    const renderRegion = (ctx: CanvasRenderingContext2D, region: any, canvas: HTMLCanvasElement) => {
        const x = (region.x / 100) * canvas.width;
        const y = (region.y / 100) * canvas.height;
        let w = (region.width / 100) * canvas.width;
        let h = (region.height / 100) * canvas.height;

        if (region.shape === 'square' || region.shape === 'circle') {
            const size = Math.min(w, h);
            const cx = x + w / 2;
            const cy = y + h / 2;
            w = size;
            h = size;
            drawActualRegion(ctx, cx - w / 2, cy - h / 2, w, h, region);
        } else {
            drawActualRegion(ctx, x, y, w, h, region);
        }
    };

    const drawActualRegion = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, region: any) => {
        const sourceElement = getSourceForRegion(region.source);
        ctx.save();

        if (region.shadow) {
            ctx.shadowBlur = region.shadow.blur;
            ctx.shadowColor = region.shadow.color;
            ctx.shadowOffsetX = region.shadow.x;
            ctx.shadowOffsetY = region.shadow.y;
        }

        ctx.beginPath();
        if (region.shape === 'circle') {
            ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
        } else if (region.borderRadius) {
            ctx.roundRect(x, y, w, h, region.borderRadius);
        } else {
            ctx.rect(x, y, w, h);
        }

        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.clip();

        if (sourceElement) {
            drawImageCover(ctx, sourceElement, x, y, w, h, region.source === 'host');
        } else {
            const guest = getGuestForRegion(region.source);
            if (guest) {
                renderGuestPlaceholder(ctx, guest, x, y, w, h);
            } else {
                ctx.fillStyle = '#1a1a1a';
                ctx.fillRect(x, y, w, h);
            }
        }

        ctx.restore();

        if (region.border) {
            ctx.save();
            ctx.strokeStyle = region.border.color;
            ctx.lineWidth = region.border.width;
            ctx.beginPath();
            if (region.shape === 'circle') {
                ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2);
            } else if (region.borderRadius) {
                ctx.roundRect(x, y, w, h, region.borderRadius);
            } else {
                ctx.rect(x, y, w, h);
            }
            ctx.stroke();
            ctx.restore();
        }

        if (region.source.startsWith('guest')) {
            const guest = studioStore.guestSlotMap[region.source];
            if (guest) {
                renderNameTag(ctx, guest.name, x, y, w, h);
            }
        } else if (region.source === 'host') {
            renderNameTag(ctx, 'HOST', x, y, w, h);
        }

        // Phase 93: Lyrics Rendering per-slot
        const guestId = mediaStore.performingVTuberId;
        if (guestId && mediaStore.performanceLyricsVisible) {
            let isTarget = false;
            if (region.source === 'host' && guestId === 'host') isTarget = true;
            else if (region.source.startsWith('guest')) {
                const slotGuest = studioStore.guestSlotMap[region.source];
                if (slotGuest && slotGuest.uuid === guestId) isTarget = true;
            }

            if (isTarget) {
                renderLyricsInRegion(ctx, x, y, w, h);
            }
        }
    };

    const renderTransition = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const type = studioStore.transitionType;
        const progress = transitionProgress.value;

        if (type === 'fade') {
            ctx.save();
            ctx.globalAlpha = 1 - progress;
            studioStore.activeScene.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));
            ctx.restore();

            ctx.save();
            ctx.globalAlpha = progress;
            studioStore.nextScene!.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));
            ctx.restore();
        } else if (type === 'wipe') {
            studioStore.activeScene.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));

            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, canvas.width * progress, canvas.height);
            ctx.clip();
            studioStore.nextScene!.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));
            ctx.restore();

            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(canvas.width * progress, 0);
            ctx.lineTo(canvas.width * progress, canvas.height);
            ctx.stroke();
        } else {
            ctx.save();
            ctx.globalAlpha = 1 - progress;
            studioStore.activeScene.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));
            ctx.restore();
            ctx.save();
            ctx.globalAlpha = progress;
            studioStore.nextScene!.layout.regions.forEach((region: any) => renderRegion(ctx, region, canvas));
            ctx.restore();
        }
    };

    const renderCommerceOverlays = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        if (studioStore.activeFlashSale) {
            renderFlashSaleBanner(ctx, canvas);
        }

        if (studioStore.activeProductId) {
            const product = studioStore.liveProducts.find(p => p.id === studioStore.activeProductId || p._id === studioStore.activeProductId);
            if (product) {
                renderProductCard(ctx, product, 0, canvas);
            }
        }

        renderPurchaseNotifications(ctx, canvas);
    };

    const renderPurchaseNotifications = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const now = Date.now();
        options.purchaseNotifications.value.forEach((notification, index) => {
            const elapsed = now - notification.startTime;
            let opacity = 0;
            if (elapsed < 500) opacity = elapsed / 500;
            else if (elapsed > 4500) opacity = Math.max(0, 1 - (elapsed - 4500) / 500);
            else opacity = 1;

            const yOffset = Math.max(0, 40 - (elapsed / 100));
            const x = 40;
            const y = canvas.height - 150 - (index * 40) - yOffset;

            ctx.save();
            ctx.globalAlpha = opacity;
            ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
            const textPad = 15;
            ctx.font = 'black 10px Inter, sans-serif';
            const textWidth = ctx.measureText(notification.text).width;

            ctx.beginPath();
            ctx.roundRect(x, y, textWidth + textPad * 2, 30, 15);
            ctx.fill();

            ctx.fillStyle = 'white';
            ctx.textAlign = 'left';
            ctx.fillText(notification.text, x + textPad, y + 19);
            ctx.restore();
        });
    };

    const renderFlashSaleBanner = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
        const bannerH = 40;
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(0, 0, canvas.width, bannerH);
        ctx.fillStyle = 'white';
        ctx.font = 'black 14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔥 FLASH SALE ACTIVE: GET -30% OFF NOW! 🔥', canvas.width / 2, bannerH / 2 + 6);
    };

    const renderProductCard = (ctx: CanvasRenderingContext2D, product: any, index: number, canvas: HTMLCanvasElement) => {
        const cardW = 180;
        const cardH = 60;
        const padding = 20;
        const x = canvas.width - cardW - padding;
        const y = padding + (cardH + 10) * index + 60;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.roundRect(x, y, cardW, cardH, 12);
        ctx.fill();
        ctx.strokeStyle = '#f97316';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(product.name.toUpperCase(), x + 10, y + 20);

        ctx.fillStyle = '#f97316';
        ctx.font = 'black 14px Inter, sans-serif';
        ctx.fillText(`$${product.price}`, x + 10, y + 42);

        const qrSize = cardH - 10;
        const qrX = x + cardW - qrSize - 5;
        const qrY = y + 5;

        ctx.fillStyle = 'black';
        ctx.fillRect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4);

        const productId = product.id || product._id;
        let qrImg = qrCodeImages.get(productId);

        if (!qrImg) {
            qrImg = new Image();
            qrImg.crossOrigin = 'anonymous';
            qrImg.src = QRCodeGenerator.getProductQR(product.inventoryUrl || `https://antstudio.agrhub.com/p/${productId}`);
            qrCodeImages.set(productId, qrImg);
        }

        if (qrImg.complete) {
            ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
        } else {
            ctx.fillStyle = '#333';
            ctx.fillRect(qrX, qrY, qrSize, qrSize);
        }

        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.font = 'black 6px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SCAN TO BUY', qrX + qrSize / 2, qrY + qrSize + 6);
    };

    const renderNameTag = (ctx: CanvasRenderingContext2D, name: string, x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        const tagW = name.length * 8 + 20;
        const tagH = 24;
        ctx.beginPath();
        ctx.roundRect(x + 10, y + h - tagH - 10, tagW, tagH, 6);
        ctx.fill();

        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name.toUpperCase(), x + 10 + tagW / 2, y + h - 10 - 8);
    };

    const getGuestForRegion = (source: string) => {
        if (!source.startsWith('guest')) return null;
        return studioStore.guestSlotMap[source] || null;
    };

    const renderGuestPlaceholder = (ctx: CanvasRenderingContext2D, guest: any, x: number, y: number, w: number, h: number) => {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(x, y, w, h);
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = '#444';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.stroke();

        if (guest.type === 'ai') {
            ctx.fillStyle = '#3b82f6';
            ctx.font = 'black 8px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('AI GUEST', x + w / 2, y + h / 2 + Math.min(w, h) * 0.2 + 15);
        }
    };

    const getSourceForRegion = (source: string) => {
        if (source === 'host') {
            if (options.isGuest?.value) return guestVideos.value['host'] || null;
            return sourceVideo.value;
        }
        if (source === 'screen') {
            return options.screenVideo?.value || null;
        }
        if (source === 'media') {
            return options.activeMediaVideo?.value || null;
        }
        if (source.startsWith('guest')) {
            // Debug: Log lookup attempts
            // console.log(`[StudioCanvas] Looking up source: ${source}`);
            
            // First check if 'source' is a direct ID match (e.g. 'pachan')
            if (guestVideos.value[source]) return guestVideos.value[source];

            // Otherwise, treat 'source' as a slot name (e.g. 'guest1') and resolve ID
            const guestInSlot = studioStore.guestSlotMap[source];
            if (guestInSlot) {
                 // console.log(`[StudioCanvas] Resolved ${source} -> ${guestInSlot.uuid}`);
                 if (guestVideos.value[guestInSlot.uuid]) {
                     return guestVideos.value[guestInSlot.uuid];
                 } else {
                     // console.warn(`[StudioCanvas] Video stream missing for ${guestInSlot.uuid}`);
                 }
            }

            if (options.isGuest?.value) {
                 const remoteStream = guestVideos.value[source];
                 if (remoteStream) return remoteStream;
                 
                 // If I am this guest, return my local feed (sourceVideo)
                 if (guestInSlot?.uuid === options.myGuestId?.value) return sourceVideo.value;
                 return null;
            }
            
            return null;
        }
        return null;
    };

    const renderLyricsInRegion = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
        const lyrics = mediaStore.performanceLyrics;
        const currentTime = mediaStore.performanceLyricsCurrentTime;
        if (!lyrics || lyrics.length === 0) return;

        // Find current line
        const currentLine = lyrics.find(l => currentTime >= l.startTime && currentTime <= l.endTime);
        if (!currentLine) return;

        ctx.save();
        
        // Improved Scaling: Ensure text fits within region width
        let fontSize = Math.max(16, h * 0.08); // Initial font size: 8% of height
        ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
        
        const maxTextW = w * 0.9; // 90% of region width
        let textMetrics = ctx.measureText(currentLine.text);
        
        if (textMetrics.width > maxTextW) {
            fontSize = fontSize * (maxTextW / textMetrics.width);
            ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
        }

        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';

        // Improved Positioning: Above the name tag to avoid overlap
        // Name tag is at y + h - 24 - 10 = y + h - 34
        // We'll place lyrics at y + h - 40 to stay clear
        const lyricY = y + h - 40;
        const lyricX = x + w / 2;

        // Draw shadow/outline for readability
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000000';
        ctx.strokeText(currentLine.text, lyricX, lyricY);

        // Draw text
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(currentLine.text, lyricX, lyricY);

        ctx.restore();
    };

    const drawImageCover = (ctx: CanvasRenderingContext2D, img: any, x: number, y: number, w: number, h: number, useFaceFraming = false) => {
        const imgW = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
        const imgH = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
        if (!imgW || !imgH) {
            ctx.fillStyle = '#111';
            ctx.fillRect(x, y, w, h);
            return;
        }

        // Smoothly interpolate face frame
        if (useFaceFraming) {
            faceFrame.x += (faceFrame.targetX - faceFrame.x) * 0.1;
            faceFrame.y += (faceFrame.targetY - faceFrame.y) * 0.1;
        } else {
            faceFrame.x = 0.5;
            faceFrame.y = 0.5;
        }

        const imgRatio = imgW / imgH;
        const destRatio = w / h;
        let sx, sy, sw, sh;
        
        if (imgRatio > destRatio) {
            sw = imgH * destRatio; 
            sh = imgH; 
            
            // horizontal centering/framing
            const centerX = imgW * faceFrame.x;
            sx = Math.max(0, Math.min(imgW - sw, centerX - sw / 2));
            sy = 0;
        } else {
            sw = imgW; 
            sh = imgW / destRatio; 
            
            // vertical centering/framing
            const centerY = imgH * faceFrame.y;
            sx = 0; 
            sy = Math.max(0, Math.min(imgH - sh, centerY - sh / 2));
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };

    let lastMaskTimestamp = -1;

    const processAISegmentation = async (video: HTMLVideoElement, timestamp: number, skipSegmentation = false) => {
        if (!worker || !video.videoWidth || isAIProcessing || !studioStore.aiEnabled) return;

        isAIProcessing = true;
		if(liveAIEngine && liveAIEngine.isInitialized){
            try {
                const stream = video.srcObject as MediaStream;
                const track = stream?.getVideoTracks()[0];
                
                if (!track) {
                    if (timestamp % 200 === 0) console.warn("[Studio Canvas] No video track found on active video source");
                    isAIProcessing = false;
                    return;
                }

                // Phase 95: Enable Face Tracking for real-time framing
                const results = await liveAIEngine.processFrame(track, timestamp, { 
                    enableSegmentation: !skipSegmentation,
                    enableFace: true 
                });

                // 1. Process Face Framing
                if (results.faceLandmarks && results.faceLandmarks.length > 0) {
                    const landmarks = results.faceLandmarks[0];
                    // Landmark 1 is usually the nose or center of face
                    // Or we can average a few landmarks (0-16 for jaw, 1 for nose, etc)
                    // Simplified: Use landmark 1 (nose tip) for centering
                    const nose = landmarks[1];
                    if (nose) {
                        faceFrame.targetX = nose.x;
                        faceFrame.targetY = nose.y;

                        if (Date.now() % 1000 < 100) {
                            // console.log(`[Studio Canvas] Nose Landmark: x=${nose.x.toFixed(2)}, y=${nose.y.toFixed(2)}`);
                        }

                        // Forward to worker for advanced rendering mode
                        if (worker) {
                            worker.postMessage({ 
                                type: 'update-face-frame', 
                                payload: { x: nose.x, y: nose.y } 
                            });
                        }
                    }
                }

                // 2. Process Segmentation Mask
                if (results.segmentationMask && results.timestamp && results.timestamp > lastMaskTimestamp) {
                    lastMaskTimestamp = results.timestamp;
                    const maskData = results.segmentationMask;
                    
                    if (maskData) {
                        if (timestamp % 100 === 0) console.log("[Studio Canvas] Sending fresh mask to worker", maskData.length);
                        worker.postMessage({
                            type: 'update-mask',
                            payload: { 
                                maskData, 
                                width: (results as any).maskWidth || video.videoWidth, 
                                height: (results as any).maskHeight || video.videoHeight 
                            }
                        }, [maskData.buffer]); 
                    }
                }
            } catch (err) {
                console.warn("[Studio Canvas] AI Segmentation failed:", err);
            } finally {
                isAIProcessing = false;
            }
		} else {
            isAIProcessing = false;
        }
    };

    const resizeCanvas = (width: number, height: number) => {
        if (worker && options.streamQuality) {
            // If worker is active, notify it
            worker.postMessage({ type: 'resize', payload: { width, height } });
        } else {
            // Fallback for non-worker mode
            if (outputCanvas.value) {
                outputCanvas.value.width = width;
                outputCanvas.value.height = height;
            }
        }

        // Overlay canvas is always on main thread
        if (overlayCanvas?.value) {
            overlayCanvas.value.width = width;
            overlayCanvas.value.height = height;
        }
    };

    onUnmounted(() => {
        stopRendering();
        liveAIEngine?.close();
    });

    const setCinematicMode = (enabled: boolean) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({ type: 'set-cinematic-mode', payload: { enabled } });
        }
    };

    const setSubtitles = (text: string) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({ type: 'set-subtitles', payload: { text } });
        }
    };

    return {
        frameCount,
        audioLevel,
        startRendering,
        stopRendering,
        resizeCanvas,
        setCinematicMode,
        setSubtitles
    };
}
