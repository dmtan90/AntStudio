import { ref, type Ref, onUnmounted, watch, onMounted } from 'vue';
import { useStudioStore } from '@/stores/studio';
import { QRCodeGenerator } from '@/utils/ai/QRCodeGenerator';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';
// @ts-ignore
import StudioWorker from '@/workers/studio.render.worker?worker';

export function useStudioCanvas(
    outputCanvas: Ref<HTMLCanvasElement | null>,
    sourceVideo: Ref<HTMLVideoElement | null>,
    guestVideos: Ref<Record<string, HTMLVideoElement>>,
    options: {
        streamQuality: Ref<string>;
        enableASL: Ref<boolean>;
        purchaseNotifications: Ref<any[]>;
        hostLevel: Ref<number>;
        guestLevels: Ref<Record<string, number>>;
        realChatVelocity: Ref<number>;
        isGuest?: Ref<boolean>;
        myGuestId?: Ref<string | null>;
        useWebGL?: Ref<boolean>;
        screenVideo?: Ref<HTMLVideoElement | null>;
        activeMediaVideo?: Ref<HTMLVideoElement | null>;
    },
    overlayCanvas?: Ref<HTMLCanvasElement | null>
) {
    const studioStore = useStudioStore();
    const frameCount = ref(0);
    const lastRenderTime = ref(0);
    const transitionStartTime = ref(0);
    const transitionProgress = ref(0);
    const qrCodeImages = new Map<string, HTMLImageElement>();
    const audioLevel = ref(0);

    let animationFrameId: number | null = null;
    let lastAIProcessTime = 0;
    const AI_PROCESS_INTERVAL = 40; // Process AI every 40ms (25fps) for smoother segmentation

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

                if (studioStore.activeScene) {
                    worker.postMessage({ type: 'update-scene', payload: { scene: JSON.parse(JSON.stringify(studioStore.activeScene)) } });
                }

                // Push current background asset if any immediately
                if (studioStore.visualSettings.background.assetUrl) {
                    updateBackgroundAsset(studioStore.visualSettings.background.assetUrl);
                }
                forceFirstMask = true;

                console.log("Studio Rendering Worker Initialized");
                return true;
            }
        } catch (e) {
            console.error("Worker Init Failed:", e);
        }
        return false;
    };

    const bridgeStream = (id: string, element: HTMLVideoElement) => {
        if (!worker || !element.srcObject || bridgedStreams.has(id)) return;

        try {
            const stream = element.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (!track) return;

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
        if (sourceVideo.value) {
            if (!options.isGuest?.value) {
                currentActiveIds.add('host');
                bridgeStream('host', sourceVideo.value);
            } else if (options.myGuestId?.value) {
                const myGuest = studioStore.liveGuests.find(g => g.id === options.myGuestId?.value);
                if (myGuest && myGuest.slotIndex !== undefined) {
                    const id = `guest${myGuest.slotIndex + 1}`;
                    currentActiveIds.add(id);
                    bridgeStream(id, sourceVideo.value);
                }
            }
        }

        Object.entries(guestVideos.value).forEach(([key, video]) => {
            currentActiveIds.add(key);
            bridgeStream(key, video);
        });

        // 1.5 Bridge Screen Share
        if (options.screenVideo?.value && studioStore.isScreenSharing) {
            currentActiveIds.add('screen');
            bridgeStream('screen', options.screenVideo.value);
        }

        // 1.6 Bridge Active Media
        if (options.activeMediaVideo?.value && studioStore.activeMediaId) {
            currentActiveIds.add('media');
            bridgeStream('media', options.activeMediaVideo.value);
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

    watch(() => studioStore.visualSettings, (newSettings) => {
        if (isWorkerEnabled && worker) {
            worker.postMessage({ type: 'update-settings', payload: JSON.parse(JSON.stringify(newSettings)) });
        }
    }, { deep: true, immediate: true });

    watch(() => guestVideos.value, () => {
        if (isWorkerEnabled) checkNewStreams();
    }, { deep: true });

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
                img.src = url;
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

    // Initialize AI Engine
    onMounted(async () => {
        try {
            await liveAIEngine.initialize();
            console.log('[Studio Canvas] AI Engine initialized');
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
        if (initWorker()) {
            startWorkerLoop();
        } else {
            start2DLoop();
        }
    };

    const startWorkerLoop = () => {
        const loop = (time: number) => {
            checkNewStreams();
            if (!studioStore.godModeEnabled) audioLevel.value = options.hostLevel.value;

            // Process AI for segmentation (if background effects are enabled)
            const needsSegmentation = studioStore.visualSettings.background.mode !== 'none';
            if (needsSegmentation && sourceVideo.value && (forceFirstMask || time - lastAIProcessTime > AI_PROCESS_INTERVAL)) {
                processAISegmentation(sourceVideo.value, time);
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
            const hasNotifications = options.purchaseNotifications.value.length > 0;
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

                    renderCommerceOverlays(ctx, canvas);
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

            if (options.enableASL.value) {
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
            drawImageCover(ctx, sourceElement, x, y, w, h);
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
            qrImg.src = QRCodeGenerator.getProductQR(product.inventoryUrl || `https://antflow.ai/shop/${productId}`);
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
        ctx.font = 'bold 10px Inter, sans-serif';
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
            if (options.isGuest?.value) {
                const remoteStream = guestVideos.value[source];
                if (remoteStream) return remoteStream;
                const guestInSlot = studioStore.guestSlotMap[source];
                if (guestInSlot?.id === options.myGuestId?.value) return sourceVideo.value;
                return null;
            }
            return guestVideos.value[source] || null;
        }
        return null;
    };

    const drawImageCover = (ctx: CanvasRenderingContext2D, img: any, x: number, y: number, w: number, h: number) => {
        const imgW = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
        const imgH = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
        if (!imgW || !imgH) {
            ctx.fillStyle = '#111';
            ctx.fillRect(x, y, w, h);
            return;
        }
        const imgRatio = imgW / imgH;
        const destRatio = w / h;
        let sx, sy, sw, sh;
        if (imgRatio > destRatio) {
            sw = imgH * destRatio; sh = imgH; sx = (imgW - sw) / 2; sy = 0;
        } else {
            sw = imgW; sh = imgW / destRatio; sx = 0; sy = (imgH - sh) / 2;
        }
        ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };

    const processAISegmentation = (video: HTMLVideoElement, timestamp: number) => {
        if (!worker || !video.videoWidth || !video.videoHeight) return;

        try {
            // Process frame through AI engine
            const results = liveAIEngine.processFrame(video, timestamp, {
                enableSegmentation: true,
                enableFace: false,
                enableHands: false
            });

            if (results.segmentationMask) {
                // Create canvas if needed
                if (!aiCanvas) {
                    aiCanvas = document.createElement('canvas');
                    aiCtx = aiCanvas.getContext('2d', { willReadFrequently: true });
                }

                if (aiCanvas && aiCtx) {
                    // Resize canvas to match video
                    if (aiCanvas.width !== video.videoWidth || aiCanvas.height !== video.videoHeight) {
                        aiCanvas.width = video.videoWidth;
                        aiCanvas.height = video.videoHeight;
                    }

                    // Convert mask to ImageData
                    const mask = results.segmentationMask;
                    const canvasWidth = aiCanvas.width;
                    const canvasHeight = aiCanvas.height;

                    if (!cachedMaskImageData || cachedMaskImageData.width !== canvasWidth || cachedMaskImageData.height !== canvasHeight) {
                        cachedMaskImageData = aiCtx.createImageData(canvasWidth, canvasHeight);
                    }

                    const data = cachedMaskImageData.data;

                    // MediaPipe mask is a Float32Array or Uint8Array
                    const maskData = mask.getAsFloat32Array?.() || mask.getAsUint8Array?.();

                    if (maskData) {
                        // FAST PATH: Optimized loop for RGBA mask generation
                        // We also normalize mask values to 0-255
                        for (let i = 0; i < maskData.length; i++) {
                            // MediaPipe Selfie Segmenter: 1.0 is person, 0.0 is background
                            const val = maskData[i] * 255;
                            const idx = i << 2; // i * 4
                            data[idx] = val;     // R (used by shader)
                            data[idx + 1] = val; // G
                            data[idx + 2] = val; // B
                            data[idx + 3] = 255; // A
                        }

                        if (timestamp % 1000 < 50) {
                            console.log('[Studio Canvas] Sending mask update at timestamp:', timestamp);
                        }

                        // Send to worker
                        worker.postMessage({
                            type: 'update-mask',
                            payload: { maskData: cachedMaskImageData }
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[Studio Canvas] AI segmentation error:', error);
        }
    };

    onUnmounted(() => {
        stopRendering();
        liveAIEngine.close();
    });

    return {
        frameCount,
        audioLevel,
        startRendering,
        stopRendering
    };
}
