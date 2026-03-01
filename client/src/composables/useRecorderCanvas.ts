import { ref, type Ref, onUnmounted, watch, onMounted } from 'vue';
// @ts-ignore
import StudioWorker from '@/workers/StudioRender.worker?worker';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';

export function useRecorderCanvas(
    outputCanvas: Ref<HTMLCanvasElement | null>,
    sourceVideo: Ref<HTMLVideoElement | null>,
    webcamVideo: Ref<HTMLVideoElement | null>,
    annotationCanvas: HTMLCanvasElement,
    options: {
        mode: Ref<string>;
        layoutPreset: Ref<string>;
        camSettings: Ref<any>;
        appliedFilter: Ref<string>;
        enableBeauty: Ref<boolean>;
        beautySettings: Ref<any>;
        isRecording: Ref<boolean>;
        isVTuberActive: Ref<boolean>;
        vtuberStream: Ref<MediaStream | null>;
        whiteboardContent: Ref<MediaStream | ImageBitmap | null>;
    }
) {
    const frameCount = ref(0);
    const isTransferred = ref(false);
    let lastAIProcessTime = 0;
    const AI_PROCESS_INTERVAL = 300; // Increase from 120ms to 300ms to save CPU, ~3 fps segmentation is usually enough for background processing

    // Worker State
    let worker: Worker | null = null;
    let isWorkerEnabled = false;
    let animationFrameId: number | null = null;
    let isAnnotationDirty = false;
    let lastBridgedWhiteboardContent: any = null;
    const bridgedStreams = new Set<string>();
    let forceFirstMask = true;

    // AI Processing State
    let aiCanvas: HTMLCanvasElement | null = null;
    let aiCtx: CanvasRenderingContext2D | null = null;
    let cachedMaskImageData: ImageData | null = null;

    const initWorker = () => {
        if (!outputCanvas.value || isTransferred.value) return false;

        // Check for OffscreenCanvas support (required for this performance optimization)
        if (typeof OffscreenCanvas === 'undefined' || typeof VideoFrame === 'undefined' || typeof MediaStreamTrackProcessor === 'undefined') {
            return false;
        }

        try {
            const canvas = outputCanvas.value;
            const offscreen = canvas.transferControlToOffscreen();
            isTransferred.value = true;

            worker = new StudioWorker();
            if (worker) {
                worker.onmessage = (e) => {
                    if (e.data.type === 'error') console.error("Recorder Worker Error:", e.data.error);
                };

                worker.postMessage({ type: 'init', payload: { canvas: offscreen } }, [offscreen]);
                worker.postMessage({ type: 'resize', payload: { width: canvas.width, height: canvas.height } });

                isWorkerEnabled = true;

                // Sync bridged streams tracking
                bridgedStreams.clear();

                // Set initial scene based on recorder mode and layout
                updateWorkerScene();
                updateWorkerSettings();

                console.log("Recorder Rendering Worker Initialized");
                return true;
            }
        } catch (e) {
            console.error("Recorder Worker Init Failed:", e);
        }
        return false;
    };

    const updateWorkerScene = () => {
        if (!isWorkerEnabled || !worker) return;

        // Map Recorder modes/layouts to Studio Worker scene format
        const scene = {
            id: 'recorder_scene',
            layout: {
                id: options.mode.value + '_' + options.layoutPreset.value,
                regions: [] as any[]
            }
        };

        if (options.mode.value === 'camera' || options.mode.value === 'screen') {
            scene.layout.regions.push({
                source: options.mode.value === 'camera' ? 'host' : 'screen',
                x: 0, y: 0, width: 100, height: 100
            });
        } else if (options.mode.value === 'camera-screen') {
            if (options.layoutPreset.value === 'pip') {
                // Main screen
                scene.layout.regions.push({
                    source: 'screen',
                    x: 0, y: 0, width: 100, height: 100
                });
                // Small cam overlay - use position preset to compute x/y
                const s = options.camSettings.value;
                const pipSize = Math.max(10, Math.min(50, s.size ?? 25));
                // const pipH = (pipSize * 9) / 16;
                const pipH = pipSize;
                const margin = 10;
                const offset = 100;
                console.log(s, pipSize, pipH, margin);

                const rawPos = (s.position ?? 'BR').toUpperCase();
                let pos = 'BR';
                if (rawPos.includes('TL') || rawPos.includes('TOP-LEFT')) pos = 'TL';
                else if (rawPos.includes('TR') || rawPos.includes('TOP-RIGHT')) pos = 'TR';
                else if (rawPos.includes('BL') || rawPos.includes('BOTTOM-LEFT')) pos = 'BL';
                else if (rawPos.includes('BR') || rawPos.includes('BOTTOM-RIGHT')) pos = 'BR';

                let pipX = margin;
                let pipY = offset - pipH - margin;
                if (pos === 'TL') { pipX = margin; pipY = margin; }
                else if (pos === 'TR') { pipX = offset - pipSize - margin; pipY = margin; }
                else if (pos === 'BL') { pipX = margin; pipY = offset - pipH - margin; }
                else if (pos === 'BR') { pipX = offset - pipSize - margin; pipY = offset - pipH - margin; }

                scene.layout.regions.push({
                    source: 'host',
                    x: pipX,
                    y: pipY,
                    width: pipSize,
                    height: pipH,
                    shape: s.shape ?? 'circle',
                    borderRadius: (s.shape ?? 'circle') === 'circle' ? 999 : 20,
                    border: { color: s.borderColor ?? '#ffffff', width: s.borderWidth ?? 2 }
                });
            } else if (options.layoutPreset.value === 'split') {
                scene.layout.regions.push({
                    source: 'screen',
                    x: 0, y: 0, width: 50, height: 100
                });
                scene.layout.regions.push({
                    source: 'host',
                    x: 50, y: 0, width: 50, height: 100
                });
            } else if (options.layoutPreset.value === 'cam-full') {
                scene.layout.regions.push({
                    source: 'host',
                    x: 0, y: 0, width: 100, height: 100
                });
            } else if (options.layoutPreset.value === 'screen-full') {
                scene.layout.regions.push({
                    source: 'screen',
                    x: 0, y: 0, width: 100, height: 100
                });
            }
        } else if (options.mode.value === 'whiteboard') {
            scene.layout.regions.push({
                source: 'screen',
                x: 0, y: 0, width: 100, height: 100
            });
            
            if (options.isVTuberActive.value || options.camSettings.value.enableCamInWhiteboard === true) {
                scene.layout.regions.push({
                    source: 'host',
                    x: 75, 
                    y: 70, 
                    width: 22, 
                    height: 25,
                    shape: 'circle',
                    border: { color: '#ffffff', width: 2 }
                });
            }
        }

        worker.postMessage({ type: 'update-scene', payload: { scene } });
    };

    const updateWorkerSettings = () => {
        if (!isWorkerEnabled || !worker) return;

        const settings = {
            beauty: {
                smoothing: options.enableBeauty.value ? options.beautySettings.value.smoothing : 0,
                brightness: options.enableBeauty.value ? options.beautySettings.value.brightness : 1.0,
                sharpen: options.enableBeauty.value ? 0.2 : 0, // Default sharpening if beauty is on
                denoise: options.enableBeauty.value ? 0.1 : 0
            },
            background: {
                mode: options.camSettings.value.enableBlur ? 'blur' : 'none',
                blurLevel: options.camSettings.value.blurStrength > 15 ? 'high' : 'medium'
            }
        };

        worker.postMessage({ type: 'update-settings', payload: settings });
    };

    const bridgeStream = (id: string, element: HTMLVideoElement) => {
        if (!worker || !element.srcObject || bridgedStreams.has(id)) return;

        try {
            const stream = element.srcObject as MediaStream;
            const track = stream.getVideoTracks()[0];
            if (!track || track.readyState !== 'live') return;

            const processor = new MediaStreamTrackProcessor({ track });
            const readable = processor.readable;

            worker.postMessage({ type: 'add-stream', payload: { id, stream: readable } }, [readable]);
            bridgedStreams.add(id);
        } catch (e) {
            console.error("Recorder Stream Bridge Failed:", e);
        }
    };

    const checkStreams = () => {
        if (!worker) return;

        const currentActiveIds = new Set<string>();

        // 1. Host Source (Cam or VTuber)
        if (options.isVTuberActive.value && options.vtuberStream.value) {
            currentActiveIds.add('host');
            // Bridge VTuber stream
            if (worker && !bridgedStreams.has('host')) {
                const track = options.vtuberStream.value.getVideoTracks()[0];
                if (track && track.readyState === 'live') {
                    const processor = new MediaStreamTrackProcessor({ track });
                    const readable = processor.readable;
                    worker.postMessage({ type: 'add-stream', payload: { id: 'host', stream: readable } }, [readable]);
                    bridgedStreams.add('host');
                }
            }
        } else if (sourceVideo.value && sourceVideo.value.srcObject && options.mode.value === 'camera') {
            currentActiveIds.add('host');
            bridgeStream('host', sourceVideo.value);
        } else if (webcamVideo.value && webcamVideo.value.srcObject && options.mode.value === 'camera-screen') {
            currentActiveIds.add('host');
            bridgeStream('host', webcamVideo.value);
        } else if (webcamVideo.value && webcamVideo.value.srcObject && options.mode.value === 'whiteboard' && options.camSettings.value.enableCamInWhiteboard) {
            currentActiveIds.add('host');
            bridgeStream('host', webcamVideo.value);
        }

        // 2. Screen/Content Source
        if (options.mode.value === 'whiteboard' && options.whiteboardContent.value) {
            currentActiveIds.add('screen');
            if (options.whiteboardContent.value instanceof MediaStream) {
                // Bridge whiteboard screen share
                if (worker && !bridgedStreams.has('screen')) {
                     const track = (options.whiteboardContent.value as MediaStream).getVideoTracks()[0];
                     if (track && track.readyState === 'live') {
                         const processor = new MediaStreamTrackProcessor({ track });
                         const readable = processor.readable;
                         worker.postMessage({ type: 'add-stream', payload: { id: 'screen', stream: readable } }, [readable]);
                         bridgedStreams.add('screen');
                     }
                }
            } else if (options.whiteboardContent.value instanceof ImageBitmap) {
                // Transfer image bitmap to worker (imported slide)
                if (options.whiteboardContent.value !== lastBridgedWhiteboardContent) {
                    lastBridgedWhiteboardContent = options.whiteboardContent.value;
                    worker.postMessage({ type: 'update-background', payload: { backgroundData: options.whiteboardContent.value } }, [options.whiteboardContent.value]);
                }
            }
        } else if (sourceVideo.value && sourceVideo.value.srcObject && (options.mode.value === 'screen' || options.mode.value === 'camera-screen')) {
            currentActiveIds.add('screen');
            bridgeStream('screen', sourceVideo.value);
        }

        // Cleanup stale streams
        bridgedStreams.forEach(id => {
            if (!currentActiveIds.has(id)) {
                console.log(`[useRecorderCanvas] Cleaning up stream: ${id}`);
                worker?.postMessage({ type: 'remove-stream', payload: { id } });
                bridgedStreams.delete(id);
            }
        });
    };

    const startRendering = () => {
        // If already transferred, just ensure the loop is running
        if (isTransferred.value) {
            if (!animationFrameId && options.mode.value !== 'audio') {
                renderLoop();
            }
            return;
        }
        
        if (initWorker()) {
            renderLoop();
        }
    };

    const renderLoop = () => {
        const loop = (time: number) => {
            // CPU Optimization: Kill loop if in audio mode and no special streams are active
            if (options.mode.value === 'audio') {
                // IMPORTANT: Before idling, we must ensure the worker is clear
                if (bridgedStreams.size > 0) {
                    bridgedStreams.forEach(id => {
                        worker?.postMessage({ type: 'remove-stream', payload: { id } });
                    });
                    bridgedStreams.clear();
                }
                animationFrameId = null;
                return;
            }

            frameCount.value++;

            // Throttled: check active streams only every 60 frames (~1s) or on demand via watchers
            if (frameCount.value % 60 === 0) {
                checkStreams();
            }
            
            // Throttled & Conditional: send annotations only when potentially changed
            if (worker && annotationCanvas && frameCount.value % 10 === 0 && isAnnotationDirty) {
                createImageBitmap(annotationCanvas).then(bitmap => {
                    worker?.postMessage({
                        type: 'update-overlay',
                        payload: { overlayData: bitmap }
                    }, [bitmap]);
                    isAnnotationDirty = false;
                });
            }

            const modeValue = options.mode.value;
            const needsSegmentation = options.camSettings.value.enableBlur || options.enableBeauty.value || options.isVTuberActive.value;
            if (needsSegmentation && (modeValue === 'camera' || modeValue === 'camera-screen') && (webcamVideo.value || sourceVideo.value)) {
                const aiSource = (options.mode.value === 'camera' ? sourceVideo.value : webcamVideo.value) as HTMLVideoElement;
                if (aiSource && aiSource.videoWidth > 0 && (forceFirstMask || time - lastAIProcessTime > AI_PROCESS_INTERVAL)) {
                    processAISegmentation(aiSource, time);
                    forceFirstMask = false;
                    lastAIProcessTime = time;
                }
            }

            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
    };

    const processAISegmentation = async (video: HTMLVideoElement, timestamp: number) => {
        if (!worker || !video.videoWidth) return;

        // Skip segmentation if beauty/blur is off and vtuber is not active
        if (!options.camSettings.value.enableBlur && !options.isVTuberActive.value && !options.enableBeauty.value) {
            return;
        }

        const results = await liveAIEngine.processFrame(video, timestamp, { 
            enableSegmentation: true,
            enableFace: true 
        });
        if (results.segmentationMask) {
            const maskData = results.segmentationMask;
            if (maskData) {
                worker.postMessage({
                    type: 'update-mask',
                    payload: { 
                        maskData, 
                        width: video.videoWidth, 
                        height: video.videoHeight 
                    }
                }, [maskData.buffer]);
            }
        }
    };

    const stopRendering = () => {
        if (worker) {
            // NEVER terminate the worker if we want to keep the transition to OffscreenCanvas alive
            // Instead, remove all streams and stop the loop
            bridgedStreams.forEach(id => {
                worker?.postMessage({ type: 'remove-stream', payload: { id } });
            });
            bridgedStreams.clear();
            lastBridgedWhiteboardContent = null;
            
            // Clear visual state in the worker
            worker.postMessage({ type: 'update-scene', payload: { scene: null } });
        }
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    };

    const destroy = () => {
        stopRendering();
        if (worker) {
            worker.terminate();
            worker = null;
        }
        isTransferred.value = false;
    };

    // Watchers for reactive updates
    watch(() => options.mode.value, (newMode) => {
        if (newMode === 'audio') {
            stopRendering();
        } else {
            // For all other modes, ensure the loop is running
            if (!animationFrameId) {
                startRendering();
            }
        }
        // Always update scene structure even if not rendering video (e.g. for branding/overlays)
        updateWorkerScene();
    });

    watch([options.layoutPreset, options.camSettings], () => {
        updateWorkerScene();
        updateWorkerSettings();
    }, { deep: true, immediate: true });

    watch([() => options.enableBeauty.value, () => options.beautySettings.value], () => {
        updateWorkerSettings();
    }, { deep: true });

    onUnmounted(destroy);

    return {
        startRendering,
        stopRendering,
        destroy,
        isTransferred,
        markAnnotationDirty: () => { isAnnotationDirty = true; }
    };
}
