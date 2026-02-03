import { ref, type Ref, onUnmounted, watch, onMounted } from 'vue';
// @ts-ignore
import StudioWorker from '@/workers/studio.render.worker?worker';
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
    }
) {
    const frameCount = ref(0);
    const lastAIProcessTime = 0;
    const AI_PROCESS_INTERVAL = 40;

    // Worker State
    let worker: Worker | null = null;
    let isWorkerEnabled = false;
    const bridgedStreams = new Set<string>();
    let animationFrameId: number | null = null;
    let forceFirstMask = true;

    // AI Processing State
    let aiCanvas: HTMLCanvasElement | null = null;
    let aiCtx: CanvasRenderingContext2D | null = null;
    let cachedMaskImageData: ImageData | null = null;

    const initWorker = () => {
        if (!outputCanvas.value) return false;

        // Check for OffscreenCanvas support (required for this performance optimization)
        if (typeof OffscreenCanvas === 'undefined' || typeof VideoFrame === 'undefined' || typeof MediaStreamTrackProcessor === 'undefined') {
            return false;
        }

        try {
            const canvas = outputCanvas.value;
            const offscreen = canvas.transferControlToOffscreen();

            worker = new StudioWorker();
            if (worker) {
                worker.onmessage = (e) => {
                    if (e.data.type === 'error') console.error("Recorder Worker Error:", e.data.error);
                };

                worker.postMessage({ type: 'init', payload: { canvas: offscreen } }, [offscreen]);
                worker.postMessage({ type: 'resize', payload: { width: canvas.width, height: canvas.height } });

                isWorkerEnabled = true;

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
                // Small cam overlay
                const s = options.camSettings.value;
                scene.layout.regions.push({
                    source: 'host',
                    x: s.x / 10, // Approximate conversion if needed, or assume normalized
                    y: s.y / 10,
                    width: s.size,
                    height: (s.size * 9) / 16,
                    shape: s.shape,
                    borderRadius: s.shape === 'circle' ? 999 : 20,
                    border: { color: s.borderColor, width: s.borderWidth }
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
            if (!track) return;

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

        if (sourceVideo.value && sourceVideo.value.srcObject) {
            const id = (options.mode.value === 'camera') ? 'host' : 'screen';
            currentActiveIds.add(id);
            bridgeStream(id, sourceVideo.value);
        }

        if (webcamVideo.value && webcamVideo.value.srcObject) {
            currentActiveIds.add('host');
            bridgeStream('host', webcamVideo.value);
        }

        // Cleanup stale streams
        bridgedStreams.forEach(id => {
            if (!currentActiveIds.has(id)) {
                worker?.postMessage({ type: 'remove-stream', payload: { id } });
                bridgedStreams.delete(id);
            }
        });
    };

    const startRendering = () => {
        if (initWorker()) {
            renderLoop();
        }
    };

    const renderLoop = () => {
        const loop = (time: number) => {
            checkStreams();

            // Bridge annotations if active
            if (worker && annotationCanvas) {
                createImageBitmap(annotationCanvas).then(bitmap => {
                    worker?.postMessage({
                        type: 'update-overlay',
                        payload: { overlayData: bitmap }
                    }, [bitmap]);
                });
            }

            // Process AI segmentation if needed (for background blur)
            const needsSegmentation = options.camSettings.value.enableBlur;
            if (needsSegmentation && (webcamVideo.value || sourceVideo.value)) {
                const aiSource = (options.mode.value === 'camera' ? sourceVideo.value : webcamVideo.value) as HTMLVideoElement;
                if (aiSource && aiSource.videoWidth > 0 && (forceFirstMask || time - lastAIProcessTime > AI_PROCESS_INTERVAL)) {
                    processAISegmentation(aiSource, time);
                    forceFirstMask = false;
                }
            }

            frameCount.value++;
            animationFrameId = requestAnimationFrame(loop);
        };
        animationFrameId = requestAnimationFrame(loop);
    };

    const processAISegmentation = (video: HTMLVideoElement, timestamp: number) => {
        if (!worker || !video.videoWidth) return;

        const results = liveAIEngine.processFrame(video, timestamp, { enableSegmentation: true });
        if (results.segmentationMask) {
            if (!aiCanvas) {
                aiCanvas = document.createElement('canvas');
                aiCtx = aiCanvas.getContext('2d', { willReadFrequently: true });
            }

            if (aiCanvas && aiCtx) {
                if (aiCanvas.width !== video.videoWidth || aiCanvas.height !== video.videoHeight) {
                    aiCanvas.width = video.videoWidth;
                    aiCanvas.height = video.videoHeight;
                }

                const mask = results.segmentationMask;
                if (!cachedMaskImageData || cachedMaskImageData.width !== aiCanvas.width) {
                    cachedMaskImageData = aiCtx.createImageData(aiCanvas.width, aiCanvas.height);
                }

                const data = cachedMaskImageData.data;
                const maskData = mask.getAsFloat32Array?.() || mask.getAsUint8Array?.();

                if (maskData) {
                    for (let i = 0; i < maskData.length; i++) {
                        const val = maskData[i] * 255;
                        const idx = i << 2;
                        data[idx] = val;
                        data[idx + 1] = val;
                        data[idx + 2] = val;
                        data[idx + 3] = 255;
                    }

                    worker.postMessage({
                        type: 'update-mask',
                        payload: { maskData: cachedMaskImageData }
                    });
                }
            }
        }
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

    // Watchers for reactive updates
    watch([() => options.mode.value, () => options.layoutPreset.value, () => options.camSettings.value], () => {
        updateWorkerScene();
        updateWorkerSettings();
    }, { deep: true });

    watch([() => options.enableBeauty.value, () => options.beautySettings.value], () => {
        updateWorkerSettings();
    }, { deep: true });

    onUnmounted(stopRendering);

    return {
        frameCount,
        startRendering,
        stopRendering
    };
}
