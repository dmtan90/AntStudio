<template>
    <div 
        ref="container" 
        class="relative w-full h-full overflow-hidden bg-black/20 flex items-center justify-center"
        v-once
    >
        <!-- Canvas will be injected by PIXI -->
    </div>
    <!-- Loading State -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-md z-50">
        <div class="flex flex-col items-center gap-4">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">{{ $t('vtubers.neuralLinkEstablishing') }}</span>
        </div>
    </div>

    <!-- Dynamic Lyrics Overlay -->
    <StageLyricsOverlay 
        v-if="lyricsEnabled && lyrics && lyrics.length > 0"
        :lyrics="lyrics"
        :currentTime="currentTime || 0"
        :style="lyricsStyle || 'neon'"
        :position="lyricsPosition || 'bottom'"
    />
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, onActivated, onDeactivated, shallowRef } from 'vue';
import * as PIXI from 'pixi.js';
import { Live2DModel, ZipLoader } from 'pixi-live2d-display-advanced';
import JSZip from 'jszip';
import { getFileUrl } from '@/utils/api';
import { getCachedFile, cacheFile } from '@/utils/ModelCache';
import { isSingingAtTime } from '@/utils/lyricUtils';
// Define options for the component
// inheritAttrs: false is used because the component now uses a fragment root (due to Loading/Overlays),
// so Vue cannot automatically inherit attributes. This prevents "Extraneous non-props attributes" warnings.
defineOptions({
  inheritAttrs: false
});

// 1. Configure ZipLoader to use JSZip
// This is REQUIRED for the library to handle .zip files or JSZip instances.
if (typeof window !== 'undefined') {
    (ZipLoader as any).zipReader = (data: Blob) => JSZip.loadAsync(data);
    (ZipLoader as any).getFilePaths = (jszip: JSZip) => Promise.resolve(Object.keys(jszip.files));
    (ZipLoader as any).getFiles = (jszip: JSZip, paths: string[]) => {
        return Promise.all(paths.map(async path => {
            const file = jszip.file(path);
            if (!file) throw new Error('File not found in zip: ' + path);
            const blob = await file.async('blob');
            // Important: ZipLoader expects File objects or at least objects with a name property
            return new File([blob], path.split('/').pop() || 'file');
        }));
    };
    (ZipLoader as any).readText = (jszip: JSZip, path: string) => {
        const file = jszip.file(path);
        if (!file) return Promise.reject(new Error('File not found in zip: ' + path));
        return file.async('text');
    };
}

// Register PIXI globally for the Live2D SDK
if (typeof window !== 'undefined') {
    (window as any).PIXI = PIXI;
    
    // FIX for 'Invalid value of 0 passed to checkMaxIfStatementsInShader'
    // This happens on some hardware/drivers where PIXI fails to detect shader capabilities.
    try {
        if ((PIXI as any).BatchRenderer) {
            const proto = (PIXI as any).BatchRenderer.prototype;
            const originalContextChange = proto.contextChange;
            proto.contextChange = function() {
                try {
                    return originalContextChange.apply(this, arguments);
                } catch (e: any) {
                    if (e.message?.includes('checkMaxIfStatementsInShader')) {
                        console.warn('[Live2DViewer] PIXI Shader bug detected, forcing fallback maxIfStatements=32');
                        this.maxIfStatements = 32;
                        // Forcing it to 32 usually bypasses the 0 error
                        // We return instead of throwing to allow initialization to continue if possible
                        return;
                    }
                    throw e;
                }
            };
        }
    } catch (e) {
        console.error('[Live2DViewer] Failed to apply PIXI initialization patch:', e);
    }
}

const props = defineProps<{
    modelUrl: string;
    speakingVol?: number;
    pitchFactor?: number;
    emphasis?: number;
    intensity?: {
        gestureIntensity: number;
        headTiltRange: number;
        nodIntensity: number;
    };
    backgroundUrl?: string;
    config?: {
        idleMotion?: string;
        talkMotion?: string;
        scale?: number;
        position?: { x: number; y: number };
        zoom?: number;
        offset?: { x: number; y: number };
    };
    isHostSpeaking?: boolean;
    emotion?: string;
    cinematicMode?: boolean;
    interactive?: boolean;
    lyrics?: any[];
    currentTime?: number;
    lyricsStyle?: 'neon' | 'minimal' | 'kinetic';
    lyricsPosition?: 'top' | 'bottom';
    lyricsEnabled?: boolean;
}>();

const emit = defineEmits<{
    'ready': [],
    'snapshot': [dataUrl: string];
    'motions': [groups: string[]];
    'update:modelUrl': [url: string];
    'update:config': [config: any];
}>();

const container = ref<HTMLElement | null>(null);
const canvas = ref<HTMLCanvasElement | null>(null); // Still needed for internal refs, but not from template
const appRef = shallowRef<any>(null); // Use shallowRef for PIXI app to avoid deep reactivity overhead
const loading = ref(true);

let app: PIXI.Application | null = null;
let model: Live2DModel | null = null;
let backgroundSprite: PIXI.Sprite | null = null;
const createdBlobUrls: string[] = [];
let manualEyeControlUntil = 0;
let manualPoseControlUntil = 0;
const manualPoseParams: Record<string, number> = {};
const performanceQueue: { style: string, intensity: number, duration: number }[] = [];
let isPerforming = false;
let latestLoadId = 0; // Track concurrent load requests

// Initialize PixiJS and Live2D
const initValue = async () => {
    if (!container.value) return;

    loading.value = true;
    
    // Wait for container to be ready
    let retryCount = 0;
    while ((!container.value || container.value.clientWidth === 0) && retryCount < 50) {
        // console.log(`[Live2DViewer] Waiting for container sizing... Attempt ${retryCount}`);
        await new Promise(r => setTimeout(r, 50));
        retryCount++;
    }

    if (!container.value || !container.value.clientWidth || !container.value.clientHeight) {
        console.warn('[Live2DViewer] Container size still 0 after multiple retries. Using defaults.');
    }

    const width = container.value?.clientWidth || 400;
    const height = container.value?.clientHeight || 400;
    // console.log(`[Live2DViewer] Initializing PIXI with size: ${width}x${height}`);

    let initRetries = 0;
    const maxInitRetries = 3;

    while (initRetries < maxInitRetries) {
        // Centralized Smart Sync Logic
        const isSinging = isSingingAtTime(props.lyrics, props.currentTime);

        const vol = isSinging ? props.speakingVol : 0;
        try {
            // Cleanup previous PIXI app and its canvas
            if (app && app.view) {
                const view = app.view as HTMLCanvasElement;
                if (view && view.parentNode) {
                    view.parentNode.removeChild(view);
                }
            }

            if (app) {
                try {
                    app.destroy(true, {
                        children: true,
                        texture: true,
                        baseTexture: true
                    });
                } catch (e) {
                    console.error('[Live2DViewer] Error destroying PIXI app:', e);
                }
                app = null;
            }

            // Clear any old children from the container (Vue's v-once prevents Vue from touching it,
            // but we still need to manually clear if PIXI previously added a canvas)
            if (container.value) {
                container.value.innerHTML = '';
            }

            // Create PixiJS Application (v7 style)
            // DO NOT pass 'view: canvas.value' - let PIXI create its own to avoid context conflicts
            app = new PIXI.Application({
                width,
                height,
                backgroundAlpha: 0, 
                antialias: true, 
                preserveDrawingBuffer: true, 
                resolution: window.devicePixelRatio || 1, 
                autoDensity: true 
            });

            // Re-attach canvas to DOM
            // We use manual DOM manipulation here because Vue's v-dom conflicts with PIXI's canvas management
            // causing "insertBefore" or "removeChild" errors when Vue tries to patch the component.
            if (container.value) {
                // Clear any old children (including previous canvases)
                while (container.value.firstChild) {
                    container.value.removeChild(container.value.firstChild);
                }
                
                const appView = app.view as HTMLCanvasElement;
                appView.style.width = '100%';
                // appView.style.height = '100%'; // Let CSS handle ratio
                appView.style.display = 'block';
                appView.classList.add('object-contain', 'w-full', 'h-full', 'absolute', 'inset-0');
                
                container.value.appendChild(appView);
                canvas.value = appView;
            }

            // DEBUG: Render a fallback red rectangle to confirm PIXI is alive
            // const dbg = new PIXI.Graphics();
            // dbg.beginFill(0xff0000);
            // dbg.drawRect(0, 0, 100, 100);
            // dbg.endFill();
            // dbg.x = 10;
            // dbg.y = 10;
            // app.stage.addChild(dbg);
            
            console.log(`[Live2DViewer] PIXI App created: ${width}x${height}, ratio=${window.devicePixelRatio}`);

            // Load Live2D Model
            await loadModel();

            // Ensure background is applied after app is ready
            await updateBackground();
            
            // If we reached here, success!
            loading.value = false;
            emit('ready');
            break;
        } catch (err: any) {
            initRetries++;
            console.error(`[Live2DViewer] Initialization attempt ${initRetries} failed:`, err);
            
            if (initRetries >= maxInitRetries) {
                console.error('[Live2DViewer] Max initialization retries reached. Model will not be loaded.');
                loading.value = false; // Force stop loading even on failure
                break;
            }
            
            // Wait a bit before retrying
            await new Promise(r => setTimeout(r, 500));
        }
    }

    // 0. Robust Resize Handling
    const resizeObserver = new ResizeObserver(() => {
        if (!container.value || !app || !app.renderer) return;
        const w = container.value.clientWidth;
        const h = container.value.clientHeight;
        if (w === 0 || h === 0) return; // Ignore zero-size resizes
        app.renderer.resize(w, h);
        
        // Re-center if needed or adjust background
        if (backgroundSprite) {
            updateBackground();
        }
    });
    resizeObserver.observe(container.value);
};

// Robust Resize Handling with Visibility Check
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
    // If container starts with 0 size (born hidden), the observer will trigger when it becomes visible
    resizeObserver = new ResizeObserver((entries) => {
        const entry = entries[0];
        if (!entry) return;
        
        const w = entry.contentRect.width;
        const h = entry.contentRect.height;
        
        if (w > 0 && h > 0) {
            console.log(`[Live2DViewer] Container became visible/sized: ${w}x${h}. Initializing...`);
            if (!app) {
                initValue();
            } else if (app.renderer) {
                // app.renderer.resize(w, h); -> REMOVED
                updateBackground();
            }
        }
    });
    
    if (container.value) {
        resizeObserver.observe(container.value);
    }
});

onBeforeUnmount(() => {
    if (resizeObserver) {
        resizeObserver.disconnect();
    }
    // ... existing cleanup ...
});

// Alias for compatibility
const init = initValue;

// Load Live2D Model
const loadModel = async () => {
    if (!app || !props.modelUrl) return;

    latestLoadId++;
    const currentLoadId = latestLoadId;

    // Cleanup previous model
    if (model) {
        if ((model as any)._tickerCallback) {
            app.ticker.remove((model as any)._tickerCallback);
        }
        app.stage.removeChild(model as any);
        model.destroy({ children: true });
        model = null;
    }
    
    // IMPORTANT: Wait for app to be ready if it's new
    if (!app.renderer) {
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    try {
        console.log('[Live2DViewer] Loading model:', props.modelUrl);
        const url = getFileUrl(props.modelUrl);
        
        // Unified Archive Loader (ZIP/RAR)
        const isZip = props.modelUrl.toLowerCase().endsWith('.zip');
        const isRar = props.modelUrl.toLowerCase().endsWith('.rar');

        if (isZip || isRar) {
            // Try cached clean zip first
            const cachedBlob = await getCachedFile(url);
            if (cachedBlob) {
                console.log('[Live2DViewer] Loading from cache');
                const zipUrl = 'zip://' + URL.createObjectURL(cachedBlob);
                createdBlobUrls.push(zipUrl);
                const newModel = await Live2DModel.from(zipUrl, {autoHitTest: true, autoFocus: false});
                if (currentLoadId !== latestLoadId) {
                    newModel.destroy();
                    return;
                }
                model = newModel;
            } else {
            const rawFilesMap = new Map<string, Uint8Array>();
            const normalize = (p: string) => p.replace(/\\/g, '/').replace(/^\.\//,  '').replace(/^\//, '');

            // 1. Extract all binary data into a map
            if (isZip) {
                const response = await fetch(url);
                const blob = await response.blob();
                const zip = await JSZip.loadAsync(blob);
                for (const [name, file] of Object.entries(zip.files)) {
                    if (!file.dir) {
                        rawFilesMap.set(normalize(name), await file.async('uint8array'));
                    }
                }
            } else {
                const { createExtractorFromData } = await import('node-unrar-js');
                const unrarWasmUrl = (await import('node-unrar-js/esm/js/unrar.wasm?url')).default;
                const [wasmRes, rarRes] = await Promise.all([fetch(unrarWasmUrl), fetch(url)]);
                const [wasmBinary, rarBuffer] = await Promise.all([wasmRes.arrayBuffer(), rarRes.arrayBuffer()]);
                const extractor = await createExtractorFromData({ data: rarBuffer, wasmBinary });
                const extracted = extractor.extract();
                for (const file of Array.from(extracted.files)) {
                    if (!file.fileHeader.flags.directory && file.extraction) {
                        rawFilesMap.set(normalize(file.fileHeader.name), file.extraction.slice());
                    }
                }
            }

            // 2. Locate model3.json and determine prefix
            const allPaths = Array.from(rawFilesMap.keys());
            const modelPath = allPaths.find(p => p.toLowerCase().endsWith('.model3.json') && !p.includes('__MACOSX'));
            if (!modelPath) throw new Error('No .model3.json found in archive');

            const pathParts = modelPath.split('/');
            const prefix = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') + '/' : '';
            
            // 3. Re-package into a fresh, FLATTENED JSZip instance
            const cleanZip = new JSZip();
            for (const [path, data] of rawFilesMap.entries()) {
                let cleanPath = path;
                if (prefix && path.startsWith(prefix)) {
                    cleanPath = path.substring(prefix.length);
                }
                if (cleanPath) {
                    cleanZip.file(cleanPath, data);
                }
            }

            // 4. Create a Blob URL and load using the zip:// protocol
            const zipBlob = await cleanZip.generateAsync({ type: 'blob' });
            
            // Cache the cleaned zip for next time (fire-and-forget)
            cacheFile(url, zipBlob);
            
            const zipUrl = 'zip://' + URL.createObjectURL(zipBlob);
            createdBlobUrls.push(zipUrl);
            
            console.log(`[Live2DViewer] Loading via native ZipLoader proxy: ${zipUrl}`);
            const newModel = await Live2DModel.from(zipUrl, {autoHitTest: true, autoFocus: false});
            if (currentLoadId !== latestLoadId) {
                newModel.destroy();
                return;
            }
            model = newModel;
            } // end else (cache miss)
        } else {
            // Load from direct URL
            // [Live2DModel(uninitialized)] options.autoInteract is deprecated since v0.5.0, use autoHitTest and autoFocus instead.
            const newModel = await Live2DModel.from(props.modelUrl, {autoHitTest: true, autoFocus: false});
            if (currentLoadId !== latestLoadId) {
                newModel.destroy();
                return;
            }
            model = newModel;
        }

        if (!model) throw new Error('Failed to create Live2D model');
        if (!app) throw new Error('PIXI Application failed to initialize');

        // Configure model auto-scaling and centering
        const canvasWidth = app.screen.width;
        const canvasHeight = app.screen.height;

        // 1. Try to get the artist's intended dimensions from the model settings
        const internalSettings = (model.internalModel as any).settings;
        const canvasInfo = internalSettings?.json?.CanvasInfo;
        const bounds = model.getBounds();
        
        // If we have CanvasInfo, we use the original design size for a stable scale factor
        // Otherwise we fall back to the dynamic bounding box.
        const modelWidth = canvasInfo?.Width || bounds.width;
        const modelHeight = canvasInfo?.Height || bounds.height;

        // 2. RELATIVE SCALING (Refactored for Height Consistency)
        // We prioritize HEIGHT for consistency across Portrait (Manifest) and Square (Tuning) views.
        // Base Scale = Fit Height (0.85)
        // This ensures the "Head size" remains consistent relative to the screen height.
        const padding = 0.85;
        const scaleY = (modelHeight > 0) ? canvasHeight / modelHeight : 0.001;
        
        // We use Height as the primary anchor. 
        // We only switch to Width if the model is extraordinarily wide (unlikely for avatars)
        const baseAutoFitScale = scaleY * padding;
        
        (model as any)._baseAutoFitScale = baseAutoFitScale; 

        // Apply Relative Zoom
        let relativeZoom = props.config?.zoom || 1.0;
        model.scale.set(baseAutoFitScale * relativeZoom);

        const scaledBounds = model.getBounds();
        
        // Anchor to BOTTOM-CENTER
        // Live2D coordinates can be tricky.
        // We want the bottom of the model (y + height) to align with bottom of canvas (height)
        // And center of model (x + width/2) to align with center of canvas (width/2)
        
        const centerX = (canvasWidth - scaledBounds.width) / 2 - scaledBounds.x;
        // Position such that the bottom of the model touches the bottom of the canvas
        // (canvasHeight - scaledBounds.height) would be top-align if y=0, but y is often non-zero.
        // Let's use the bounding box logic.
        // We want (scaledBounds.y + scaledBounds.height) + deltaY = canvasHeight
        // So deltaY = canvasHeight - (scaledBounds.y + scaledBounds.height)
        // Then model.y += deltaY
        
        const deltaY = canvasHeight - (scaledBounds.y + scaledBounds.height);
        
        // Apply vertical offset (default to slight padding from bottom)
        const verticalPadding = canvasHeight * 0.05; 
        const centerY = deltaY + verticalPadding; // Positive pushes it down, so we actually already calculated 'deltaY' to flush fit.
        
        // Let's use simpler centering first, then push down.
        // const centerY = (canvasHeight - scaledBounds.height) / 2 - scaledBounds.y;

        // Apply Relative Offset (% of Canvas Dimension)
        const offsetX = (props.config?.offset?.x || 0) * canvasWidth;
        const offsetY = (props.config?.offset?.y || 0) * canvasHeight;

        model.x = centerX + offsetX;
        
        // Default (0,0 offset) = Bottom Aligned
        // If config offset Y exists, we add it.
        // Note: 'centerY' variable name is reused here for the base Y position.
        model.y += deltaY + offsetY;

        // Apply additional config if available (Support both absolute and relative)
        if (props.config) {
            console.log('[Live2DViewer] Applying model config:', props.config);
            
            // 1. Position/Offset
            if (props.config.offset) {
                // Already handled by centerX + offsetX above, but ensure it's re-applied if needed
                model.x = centerX + (props.config.offset.x * canvasWidth);
                model.y = centerY + (props.config.offset.y * canvasHeight);
            } else if (props.config.position) {
                // RELATIVE POSITIONING FALLBACK (If coming from store as absolute pixel values)
                // If position.x is huge (> canvasWidth), it might be from a different resolution.
                // We should likely ignore absolute position unless we trust the coordinate system.
                // For now, let's prioritize OFFSET over direct POSITION.
                // model.x = props.config.position.x;
                // model.y = props.config.position.y;
            }

            // 2. Scale/Zoom
            // FIX: Prioritize RELATIVE ZOOM over ABSOLUTE SCALE
            // The `scale` property in config often comes as "1" (default) which breaks auto-fit for large models.
            // We only use `scale` if it seems intentional (not 1.0) or if zoom is missing.
            
            const configScale = props.config.scale || 1.0;
            const configZoom = props.config.zoom || 1.0;

            if (configZoom !== 1.0) {
                 model.scale.set(baseAutoFitScale * configZoom);
            } else if (configScale !== 1.0) {
                 // Check if scale is reasonable (e.g. not > 5x base scale)
                 // If it is huge, warn and use base scale
                 if (configScale > baseAutoFitScale * 5 && baseAutoFitScale < 0.2) {
                     console.warn(`[Live2DViewer] Ignoring suspicious absolute scale ${configScale} (Base: ${baseAutoFitScale})`);
                     model.scale.set(baseAutoFitScale);
                 } else {
                     model.scale.set(configScale);
                 }
            } else {
                 // Default case: Just use base auto fit
                 model.scale.set(baseAutoFitScale);
            }
        }

        console.log(`[Live2DViewer] Loaded: BaseScale=${baseAutoFitScale.toFixed(4)}, Zoom=${relativeZoom}, Offset=(${props.config?.offset?.x?.toFixed(2)||0}, ${props.config?.offset?.y?.toFixed(2)||0})`);

        // Add model to stage
        app.stage.addChild(model as any);
        
        // DEBUG: Log final model state
        const finalBounds = model.getBounds();
        console.log(`[Live2DViewer] Model bounds after config: x=${finalBounds.x.toFixed(2)}, y=${finalBounds.y.toFixed(2)}, w=${finalBounds.width.toFixed(2)}, h=${finalBounds.height.toFixed(2)}, visible=${model.visible}, alpha=${model.alpha}, worldTransform=${model.worldTransform}`);

        // DEBUG: Draw border around model (Optional, keeping simpler version if debugging needed)
        // const border = new PIXI.Graphics();
        // border.lineStyle(2, 0x00ff00, 1); // Thinner line
        // border.drawRect(0, 0, scaledBounds.width, scaledBounds.height);
        // border.x = model.x; 
        // border.y = model.y;
        // app.stage.addChild(border);

        // Play idle motion if specified
        if (props.config?.idleMotion) {
            (model as any).motion(props.config.idleMotion, 0, (PIXI as any).UPDATE_PRIORITY.NORMAL);
        }

        // --- ENHANCED MOTION DISCOVERY ---
        let motionGroups: string[] = [];
        const internalModel = model.internalModel as any;

        // Strategy A: Direct definitions (Cubism 2/3)
        if (internalModel.motionManager?.definitions) {
            motionGroups = Object.keys(internalModel.motionManager.definitions);
        }

        // Strategy B: Settings groups (Cubism 4/5)
        if (motionGroups.length === 0 && internalModel.settings?.motions) {
            motionGroups = Object.keys(internalModel.settings.motions);
        }

        // Strategy C: Filesystem discovery (Fallback)
        if (motionGroups.length === 0 && internalModel.motionManager?.groups) {
            const groups = internalModel.motionManager.groups;
            motionGroups = Array.isArray(groups) ? groups.map((g: any) => g.name || g) : Object.keys(groups);
        }
        
        console.log('[Live2DViewer] Available motions:', motionGroups);
        emit('motions', motionGroups);

        // --- AGGRESSIVE MOUSE TRACKING DISABLE ---
        // 1. Disable library's auto-interaction
        (model as any).autoInteract = false; 
        
        // 2. MONKEY PATCH internal 'focus' method to do NOTHING
        // This prevents the internal Cubism SDK from updating look targets based on mouse position.
        // if (internalModel.focus) {
        //     internalModel.focus = (_x: number, _y: number) => { /* NO-OP */ };
        //     // Also force it to look center once
        //     // if (internalModel.coreModel && internalModel.coreModel.setParameterValueById) {
        //     //      internalModel.coreModel.setParameterValueById('ParamEyeBallX', 0);
        //     //      internalModel.coreModel.setParameterValueById('ParamEyeBallY', 0);
        //     // }
        //     // focusCenter();
        // }

        // 3. Remove interaction manager if exists
        // if ((model as any).interaction) {
        //      (model as any).interaction = null;
        // }

        // --- STICKY LIP SYNC & NATURAL ANIMATION TICKER ---
        const mouthCandidates = [
            'ParamMouthOpenY', 'ParamMouthOpen', 'ParamMouthY',
            'PARAM_MOUTH_OPEN_Y', 'PARAM_MOUTH_OPEN', 'PARAM_MOUTH_Y'
        ];
        
        const coreModel = internalModel.coreModel as any;
        const existingMouthParams = mouthCandidates.filter(id => {
            try { return coreModel.getParameterIndex(id) >= 0; } catch(e) { return false; }
        });

        let pulseCount = 0;
        let blinkTimer = Math.random() * 100;
        let blinkState = 1.0; 
        let swayX = Math.random() * 100;
        let swayY = Math.random() * 100;
        
        // Cinematic Camera State
        let camZoom = 1.0;
        let camX = 0;
        let camY = 0;
        let shakeIntensity = 0;

        // Pre-cache parameter indices for efficiency and to avoid ReferenceErrors
        const paramAngleX = coreModel.getParameterIndex('ParamAngleX');
        const paramAngleY = coreModel.getParameterIndex('ParamAngleY');
        const paramAngleZ = coreModel.getParameterIndex('ParamAngleZ');
        const paramEyeX = coreModel.getParameterIndex('ParamEyeBallX');
        const paramEyeY = coreModel.getParameterIndex('ParamEyeBallY');
        const eyeL = coreModel.getParameterIndex('ParamEyeOpenL');
        const eyeR = coreModel.getParameterIndex('ParamEyeOpenR');
        const bodyY = coreModel.getParameterIndex('ParamBodyAngleY');
        const armL = coreModel.getParameterIndex('ParamArmLA') || coreModel.getParameterIndex('ParamArmL');
        const armR = coreModel.getParameterIndex('ParamArmRA') || coreModel.getParameterIndex('ParamArmR');

        const tickerCallback = () => {
            if (!model || !internalModel || !coreModel) return;
            pulseCount++;
            const vol = props.speakingVol || 0;
            const isSpeakingRaw = vol > 0.01;
            
            const hasLyrics = props.lyrics && props.lyrics.length > 0;
            const isSinging = hasLyrics ? isSingingAtTime(props.lyrics, props.currentTime) : false;

            const isSpeaking = isSpeakingRaw && (hasLyrics ? isSinging : true);
            const syncVol = (hasLyrics ? (isSinging ? vol : 0) : vol) || 0;
            
            const pitch = props.pitchFactor || 0;
            const emp = props.emphasis || 0;
            const multipliers = props.intensity || { gestureIntensity: 1, headTiltRange: 1, nodIntensity: 1 };
            
            // 0. CINEMATIC CAMERA
            if (props.cinematicMode && model) {
                const targetZoom = 1.0 + (emp * 0.1) + (props.emotion === 'thinking' ? 0.05 : 0);
                camZoom = camZoom * 0.9 + targetZoom * 0.1;
                
                const targetCamX = (props.emotion === 'thinking' ? 0.1 : 0) * app.screen.width;
                const targetCamY = (emp * -0.05) * app.screen.height;
                
                camX = camX * 0.85 + targetCamX * 0.15;
                camY = camY * 0.85 + targetCamY * 0.15;
                
                if (emp > 0.85) shakeIntensity = Math.max(shakeIntensity, emp * 10);
                shakeIntensity *= 0.8;
                
                const sx = (Math.random() - 0.5) * shakeIntensity;
                const sy = (Math.random() - 0.5) * shakeIntensity;
                
                model.scale.set(((model as any)._baseAutoFitScale || 1.0) * (props.config?.zoom || 1.0) * camZoom);
                // We add the cam offset to the base position
                // Note: this might conflict with manual drag if not careful, 
                // but usually cinematic mode is used for auto-performances.
                model.x += (camX - model.x) * 0.1 + sx;
                model.y += (camY - model.y) * 0.1 + sy;
            }

            // 1. BLINK LOGIC
            blinkTimer -= 1;
            if (blinkTimer <= 0) {
                if (blinkState === 1.0) {
                    blinkState = 0.0; // Close
                    blinkTimer = 6; // Sustain closure
                } else {
                    blinkState = 1.0; // Open
                    blinkTimer = 120 + Math.random() * 180; // 2-5 seconds
                }
            }
            
            if (eyeL >= 0) coreModel.setParameterValueById(eyeL, blinkState);
            if (eyeR >= 0) coreModel.setParameterValueById(eyeR, blinkState);

            // 2. NATURAL HEAD SWAY & LOOK STRAIGHT (FORCE OVERRIDE)
            // Critical: Force eyes to 0 to override any internal SDK mouse tracking
            
            if (Date.now() > manualEyeControlUntil) {
                if (paramEyeX >= 0) coreModel.setParameterValueById(paramEyeX, 0);
                if (paramEyeY >= 0) coreModel.setParameterValueById(paramEyeY, 0);
            }

            swayX += isSpeaking ? 0.08 : 0.02; // Move faster when speaking
            swayY += isSpeaking ? 0.06 : 0.015;
            
            // Speech-driven procedural additions
            const emphasisNod = emp * 15 * multipliers.nodIntensity;
            const pitchTilt = (pitch - 0.5) * 10 * multipliers.headTiltRange;

            const headX = Math.sin(swayX) * (isSpeaking ? 5 : 2) + pitchTilt; 
            const headY = Math.cos(swayY) * (isSpeaking ? 3 : 1.5) - emphasisNod; // Dip on emphasis
            const headZ = Math.sin(swayX * 0.5) * (isSpeaking ? 2 : 1.0) + pitchTilt * 0.5;
            
            // 4. Subtle Arm Movement on Emphasis
            const armSwing = emp * 10 * multipliers.gestureIntensity;
            
            if (Date.now() > manualPoseControlUntil) {
                if (paramAngleX >= 0) coreModel.setParameterValueById(paramAngleX, headX);
                if (paramAngleY >= 0) coreModel.setParameterValueById(paramAngleY, headY);
                if (paramAngleZ >= 0) coreModel.setParameterValueById(paramAngleZ, headZ);
                if (bodyY >= 0) coreModel.setParameterValueById(bodyY, headY * 0.5); // Body follows head slightly
                
                // 4. Subtle Arm Movement on Emphasis
                if (armL >= 0) coreModel.setParameterValueById(armL, armSwing);
                if (armR >= 0) coreModel.setParameterValueById(armR, armSwing);
            } else {
                // Apply manual pose params if they exist
                for (const [id, val] of Object.entries(manualPoseParams)) {
                    try { coreModel.setParamValue(id, val); } catch(e) {}
                }
            }

            // 3. LIP SYNC
            if (isSpeaking) {
                // Use a clean, linear mapping without random noise to ensure tight synchronization
                // Use a clean, linear mapping without random noise to ensure tight synchronization
                // Multiplier 4.0 works well with RMS input (which is typically lower than peak)
                const mouthValue = Math.min(1.0, syncVol * 4.0);
                
                // Bob head up/down with audio volume
                if (paramAngleY >= 0) coreModel.setParameterValueById(paramAngleY, headY + syncVol * 12 * multipliers.nodIntensity);
                
                for (const id of existingMouthParams) {
                    if (internalModel.setParamValue) {
                        internalModel.setParamValue(id, mouthValue);
                    } else if (coreModel.setParameterValueById) {
                        coreModel.setParameterValueById(id, mouthValue);
                    }
                }
                
                if (coreModel.getParameterIndex('ParamMouthForm') >= 0) {
                    if (internalModel.setParamValue) internalModel.setParamValue('ParamMouthForm', 1.0);
                    else if (coreModel.setParameterValueById) coreModel.setParameterValueById('ParamMouthForm', 1.0);
                }
            } else if (pulseCount % 10 === 0) {
                for (const id of existingMouthParams) {
                    if (internalModel.setParamValue) internalModel.setParamValue(id, 0);
                    else if (coreModel.setParameterValueById) coreModel.setParameterValueById(id, 0);
                }
            }
        };
        
        // Use LOW priority to run AFTER the model's internal updates, allowing us to overwrite values (like eyes)
        app.ticker.add(tickerCallback, null, PIXI.UPDATE_PRIORITY.LOW);
        (model as any)._tickerCallback = tickerCallback;

        // Initialize Interactive controls if enabled
        if (props.interactive) {
            setupInteraction();
        }

        console.log('[Live2DViewer] Model loaded successfully');
    } catch (error) {
        console.error('[Live2DViewer] Failed to load model:', error);
        loading.value = false;
    }
};

// const focusCenter = () => {
//     if(model){
//         // console.log("focusCenter", container.value.getBoundingClientRect());
//         const internalModel = model as any;
//         // Also force it to look center once
//         if (internalModel.coreModel && internalModel.coreModel.setParameterValueById) {
//                 internalModel.coreModel.setParameterValueById('ParamEyeBallX', 0);
//                 internalModel.coreModel.setParameterValueById('ParamEyeBallY', 0);
//         }
//     }
// };

// --- INTERACTIVE CANVAS LOGIC (DRAG & ZOOM) ---
let isDragging = false;
let dragData: any = null;
let lastMousePos = { x: 0, y: 0 };

const setupInteraction = () => {
    if (!model || !container.value) return;

    // Enable interaction on the model
    // (model as any).interactive = true;
    //eventMode = 'none'/'passive'/'auto'/'static'/'dynamic' instead.
    (model as any).eventMode = 'dynamic';
    // (model as any).buttonMode = true;

    model.on('pointerdown', (event: any) => {
        isDragging = true;
        dragData = event.data;
        lastMousePos = { x: event.data.global.x, y: event.data.global.y };
    });

    model.on('pointermove', (event: any) => {
        if (isDragging && model) {
            const newPos = event.data.global;
            const dx = newPos.x - lastMousePos.x;
            const dy = newPos.y - lastMousePos.y;
            
            model.x += dx;
            model.y += dy;
            
            lastMousePos = { x: newPos.x, y: newPos.y };
            emitConfigUpdate();
        }
    });

    const stopDrag = () => {
        isDragging = false;
        dragData = null;
    };

    model.on('pointerup', stopDrag);
    model.on('pointerupoutside', stopDrag);

    // Zooming via Wheel
    container.value.addEventListener('wheel', handleWheel, { passive: false });
};

const handleWheel = (e: WheelEvent) => {
    if (!model || !container.value) return;
    e.preventDefault();

    // 1. Get Mouse Position relative to Canvas
    const rect = container.value.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomSpeed = 0.001;
    const delta = -e.deltaY;
    const factor = 1 + delta * zoomSpeed;
    
    const currentScale = model.scale.x;
    const newScale = currentScale * factor;
    // Limit scale range
    if (newScale > 0.05 && newScale < 5) {
        model.scale.set(newScale);
        
        // 2. Zoom towards mouse (Compensate position)
        // Formula: NewPos = MousePos - (MousePos - OldPos) * Factor
        // Explanation: We want the point under the mouse to remain fixed relative to the viewport.
        // The distance from the model's origin to the mouse scales by 'factor'.
        // So the origin must move to compensate.
        model.x = mx - (mx - model.x) * factor;
        model.y = my - (my - model.y) * factor;

        emitConfigUpdate();
    }
};

const emitConfigUpdate = () => {
    if (!model || !app) return;
    
    // Emit RELATIVE configuration
    // 1. Calculate Zoom (Current Scale / Base Fit Scale)
    const baseScale = (model as any)._baseAutoFitScale || 1.0;
    const currentZoom = model.scale.x / baseScale;

    // 2. Calculate Relative Offset
    // Reverse the centering logic: (CurrentPos - CenterPos) / CanvasSize
    const scaledBounds = model.getBounds();
    // Re-calculate where the "Natural Center" would be
    // Note: getBounds() includes the current x/y offset. 
    // This part is tricky because getBounds changes as we move.
    
    // Simpler approach: 
    // We set model.x = CenterX + OffsetX
    // So OffsetX = model.x - CenterX
    // CenterX was calculated as: (canvasWidth - scaledBounds.width) / 2 - "LocalBoundsX" 
    // But accessing LocalBoundsX is annoying.
    
    // Let's use the center of the screen as the relative anchor.
    // Normalized Offset = (ModelCenter - ScreenCenter) / ScreenSize
    
    const screenCenterX = app.screen.width / 2;
    const screenCenterY = app.screen.height / 2;
    const modelCenterX = scaledBounds.x + (scaledBounds.width / 2);
    const modelCenterY = scaledBounds.y + (scaledBounds.height / 2);
    
    const relOffsetX = (modelCenterX - screenCenterX) / app.screen.width;
    const relOffsetY = (modelCenterY - screenCenterY) / app.screen.height;

    
    // Unified Config Emission
    const config = {
        zoom: currentZoom,
        offset: { x: relOffsetX, y: relOffsetY },
        scale: model.scale.x,
        rotation: model.rotation,
        position: { x: model.x, y: model.y },
        // Preserve Live2D specific props handled by parent merging usually, but good to have
        idleMotion: props.config?.idleMotion,
        talkMotion: props.config?.talkMotion
    };
    
    emit('update:config', config);
};

const resetView = () => {
    if (!model || !app) return;
    
    // 1. Reset Scale
    const baseScale = (model as any)._baseAutoFitScale || 1.0;
    model.scale.set(baseScale);
    
    // 2. Center Model
    const bounds = model.getBounds();
    const desiredX = (app.screen.width - bounds.width) / 2;
    const desiredY = (app.screen.height - bounds.height) / 2;
    
    model.x += (desiredX - bounds.x);
    model.y += (desiredY - bounds.y);
    
    // 3. Reset Rotation
    model.rotation = 0;
    
    emitConfigUpdate();
};

const takeSnapshot = async () => {
    if (!app || !app.renderer) return null;
    app.render();
    return app.renderer.extract.base64(app.stage);
};
// Obsolete mouth update logic removed - replaced by 'modelUpdate' hook in init()
// watch(() => props.speakingVol, () => {
//     updateLipSync();
// });

// Behavior Logic
let behaviorInterval: any = null;

watch(() => props.isHostSpeaking, (newValue) => {
    if (!model) return;
    
    // Clear existing behavior interval
    if (behaviorInterval) {
        clearInterval(behaviorInterval);
        behaviorInterval = null;
    }
    
    if (newValue) {
        // LISTENING MODE: Look at camera, occasional nod
        // 1. Center Eyes
        const core = model.internalModel.coreModel as any;
        const eyeX = core.getParameterIndex('ParamEyeBallX');
        const eyeY = core.getParameterIndex('ParamEyeBallY');
        if (eyeX >= 0) core.setParameterValueById(eyeX, 0); 
        if (eyeY >= 0) core.setParameterValueById(eyeY, 0);
        
        // 2. Random Nodding
        behaviorInterval = setInterval(() => {
            if (Math.random() > 0.6) {
                // Trigger a nod motion if available basically by manipulating Angle Y
                // Or simplified: just quick head dip
                const angleY = (model?.internalModel.coreModel as any).getParameterIndex('ParamAngleY');
                if (angleY && angleY >= 0) {
                     // Simple tween mock - for real usage, we'd use a motion group 'TapBody' or similar if defined
                     // But direct param manipulation is safer if we don't know motions
                     let nodState = 0;
                     const nod = setInterval(() => {
                         nodState += 0.2;
                         const val = Math.sin(nodState * Math.PI) * -10; // Dip down
                         (model?.internalModel.coreModel as any).setParameterValueById(angleY, val);
                         if (nodState >= 1) clearInterval(nod);
                     }, 30);
                }
            }
        }, 2000);
        
    } else {
        // IDLE MODE: Look around randomly
        behaviorInterval = setInterval(() => {
            if (Math.random() > 0.5) {
                const core = model?.internalModel.coreModel as any;
                const eyeX = core?.getParameterIndex('ParamEyeBallX');
                const eyeY = core?.getParameterIndex('ParamEyeBallY');
                
                if (eyeX && eyeX >= 0) {
                    const val = (Math.random() - 0.5) * 0.5; // -0.5 to 0.5 range
                    core?.setParameterValueById(eyeX, val);
                }
                if (eyeY && eyeY >= 0) {
                     const val = (Math.random() - 0.5) * 0.2;
                     core?.setParameterValueById(eyeY, val);
                }
            }
        }, 3000);
    }
}, { immediate: true });

// Emotion Management
const applyEmotion = (emotion: string) => {
    if (!model || !emotion) return;
    
    const lowerEmotion = emotion.toLowerCase();
    console.log(`[Live2DViewer] Applying emotion: ${lowerEmotion}`);

    // 1. Try to trigger a motion group with the same name
    const motionGroups = Object.keys((model.internalModel as any).motionManager.definitions);
    const matchedGroup = motionGroups.find(g => g.toLowerCase().includes(lowerEmotion));
    
    if (matchedGroup) {
        model.motion(matchedGroup, 0, (PIXI as any).UPDATE_PRIORITY.HIGH);
        return;
    }

    // 2. Fallback: Manual parameter manipulation for standard emotions
    const core = model.internalModel.coreModel as any;
    
    // Reset standard emotion params first
    ['ParamEyeSmile', 'ParamCheek', 'ParamBrowLForm', 'ParamBrowRForm'].forEach(p => {
        const idx = core.getParameterIndex(p);
        if (idx >= 0) core.setParameterValueById(idx, 0);
    });

    if (lowerEmotion === 'joy' || lowerEmotion === 'happy') {
        const eyeSmile = core.getParameterIndex('ParamEyeSmile');
        const cheek = core.getParameterIndex('ParamCheek');
        if (eyeSmile >= 0) core.setParameterValueById(eyeSmile, 1);
        if (cheek >= 0) core.setParameterValueById(cheek, 1);
    } else if (lowerEmotion === 'sorrow' || lowerEmotion === 'sad') {
        const browL = core.getParameterIndex('ParamBrowLForm');
        const browR = core.getParameterIndex('ParamBrowRForm');
        if (browL >= 0) core.setParameterValueById(browL, -1);
        if (browR >= 0) core.setParameterValueById(browR, -1);
    }
}

watch(() => props.emotion, (emotion) => {
    applyEmotion(emotion || 'neutral');
});

// Background Management
const updateBackground = async () => {
    if (!app || !props.backgroundUrl) {
        if (backgroundSprite && app) {
            app.stage.removeChild(backgroundSprite);
            backgroundSprite = null;
        }
        return;
    }

    if (props.backgroundUrl) {
        try {
            console.log('[Live2DViewer] Loading background:', props.backgroundUrl);
            
            // Use PIXI.Texture.from which handles extension-less URLs (like Unsplash) better than Assets.load
            // We wrap it to ensure it's ready
            const texture = await new Promise<PIXI.Texture>((resolve, reject) => {
                const tex = PIXI.Texture.from(props.backgroundUrl);
                if ((tex.baseTexture as any).valid) {
                    resolve(tex);
                } else {
                    tex.once('update', () => resolve(tex));
                    (tex as any).once('error', (e: any) => reject(e));
                }
            });
            
            // Remove existing background if valid
            if (backgroundSprite) {
                app.stage.removeChild(backgroundSprite);
                backgroundSprite.destroy();
                backgroundSprite = null;
            }

            backgroundSprite = new PIXI.Sprite(texture);
            
            // Scale to fit (Cover Mode)
            const targetW = app.screen.width || 400;
            const targetH = app.screen.height || 400;
            
            let scale = 1.0;
            if (texture.width > 0 && texture.height > 0) {
                const scaleX = targetW / texture.width;
                const scaleY = targetH / texture.height;
                scale = Math.max(scaleX, scaleY);
            }
            
            backgroundSprite.scale.set(scale);
            backgroundSprite.anchor.set(0.5);
            backgroundSprite.x = targetW / 2;
            backgroundSprite.y = targetH / 2;
            
            // Add to back (Index 0) & Force render
            app.stage.addChildAt(backgroundSprite, 0);
        } catch (error) {
            console.error('[Live2DViewer] Failed to load background:', error);
        }
    }
};

watch(() => props.backgroundUrl, () => {
    updateBackground();
}, { immediate: true });

// Video Recording State
let mediaRecorder: MediaRecorder | null = null;
let recordedChunks: Blob[] = []
let recordingResolve: ((blob: Blob) => void) | null = null;

// Start Video Recording
const startRecording = async (): Promise<void> => {
    if (!canvas.value) {
        console.error('[Live2DViewer] Cannot start recording: canvas not ready');
        return;
    }

    try {
        const canvasStream = canvas.value.captureStream(30); // 30 FPS
        
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
        console.log('[Live2DViewer] Recording started');
    } catch (error) {
        console.error('[Live2DViewer] Failed to start recording:', error);
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
        console.log('[Live2DViewer] Recording stopped');
    });
};

// Expose methods to parent
const captureSnapshot = async (): Promise<string | null> => {
    if (!app || !app.view) return null;
    app.render(); // Ensure fresh frame
    const canvasEl = app.view as HTMLCanvasElement;
    return canvasEl.toDataURL('image/png');
};

const captureVideo = async (durationMs: number = 3000, audioTrack?: MediaStreamTrack): Promise<Blob | null> => {
    if (!canvas.value) return null;
    
    try {
        const stream = canvas.value.captureStream(30);
        
        // Merge audio track if provided 
        // Important: Create a new MediaStream with combined tracks
        const tracks = [...stream.getVideoTracks()];
        if (audioTrack) {
            tracks.push(audioTrack as any);
        }
        const combinedStream = new MediaStream(tracks);

        const recorder = new MediaRecorder(combinedStream, { 
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

const setPose = (part: string, value: number) => {
    if (!model) return;
    manualPoseControlUntil = Date.now() + 5000;
    const core = (model.internalModel as any).coreModel;
    const partMap: Record<string, string> = {
        'arm_l': 'ParamArmLA',
        'arm_r': 'ParamArmRA',
        'leg_l': 'ParamLegL',
        'leg_r': 'ParamLegR',
        'body_roll': 'ParamBodyAngleZ',
        'body_pitch': 'ParamBodyAngleX'
    };
    const id = partMap[part];
    if (id) {
        manualPoseParams[id] = value;
        try {
            core.setParameterValueById(id, value);
        } catch (e) {}
    }
};

const setEyeFocus = (target: string) => {
    if (!model) return;
    manualEyeControlUntil = Date.now() + 5000;
    const core = (model.internalModel as any).coreModel;
    try {
        let x = 0, y = 0;
        if (target === 'left') x = -1;
        else if (target === 'right') x = 1;
        else if (target === 'up') y = 1;
        else if (target === 'down') y = -1;
        else if (target === 'audience') { x = 0; y = -0.5; }
        else if (target === 'thinking') { x = -0.6; y = 0.8; }
        else if (target === 'suspicious') { x = 0.7; y = 0.1; }
        else if (target === 'shy') { x = -0.3; y = -0.7; }

        const paramEyeX = core.getParameterIndex('ParamEyeBallX');
        const paramEyeY = core.getParameterIndex('ParamEyeBallY');
        if (paramEyeX >= 0) core.setParameterValueById('ParamEyeBallX', x);
        if (paramEyeY >= 0) core.setParameterValueById('ParamEyeBallY', y);
    } catch (e) {}
};

const triggerPerformance = (style: string, intensity: number = 1.0, durationMs: number = 3000) => {
    if (!model) return;
    
    // If already performing, queue it
    if (isPerforming && performanceQueue.length < 5) {
        performanceQueue.push({ style, intensity, duration: durationMs });
        return;
    }

    const lowerStyle = style.toLowerCase();
    const internalModel = model.internalModel as any;
    const motionGroups = Object.keys(internalModel.motionManager?.definitions || internalModel.settings?.motions || {});
    
    // High-impact mapping
    const styleMap: Record<string, string[]> = {
        'laugh': ['laugh', 'happy', 'joy'],
        'think': ['think', 'reason', 'ponder'],
        'shock': ['surprise', 'shock', 'wonder'],
        'dance': ['dance', 'spin', 'rhythm'],
        'bow': ['bow', 'greet', 'respect'],
        'point': ['point', 'target', 'show']
    };

    let matched = motionGroups.find(g => g.toLowerCase().includes(lowerStyle));
    if (!matched && styleMap[lowerStyle]) {
        matched = motionGroups.find(g => styleMap[lowerStyle].some(keyword => g.toLowerCase().includes(keyword)));
    }

    isPerforming = true;
    if (matched) {
        console.log(`[Live2DViewer] Playing performance: ${matched} (Intensity: ${intensity})`);
        model.motion(matched, 0, (PIXI as any).UPDATE_PRIORITY.HIGH);
    } else {
        // Parametric performance (procedural)
        const angleY = internalModel.coreModel.getParameterIndex('ParamAngleY');
        const bodyZ = internalModel.coreModel.getParameterIndex('ParamBodyAngleZ');
        
        if (lowerStyle === 'nod' && angleY >= 0) {
            manualPoseControlUntil = Date.now() + durationMs;
            let start = Date.now();
            const tick = () => {
                const elapsed = Date.now() - start;
                if (elapsed > durationMs) return;
                const val = Math.sin((elapsed / 500) * Math.PI) * 15 * intensity;
                internalModel.coreModel.setParameterValueById(angleY, val);
                requestAnimationFrame(tick);
            };
            tick();
        }
    }

    setTimeout(() => {
        isPerforming = false;
        if (performanceQueue.length > 0) {
            const next = performanceQueue.shift()!;
            triggerPerformance(next.style, next.intensity, next.duration);
        }
    }, durationMs);
};

const setExpression = (expression: string) => applyEmotion(expression);
const setMood = (mood: string) => applyEmotion(mood);
const playMotion = (motion: string) => triggerPerformance(motion, 1.0);

defineExpose({
    takeSnapshot,
    resetView,
    captureSnapshot,
    captureVideo,
    setPose,
    setEyeFocus,
    triggerPerformance,
    setExpression,
    setMood,
    playMotion
});

onActivated(() => {
    console.log('[Live2DViewer] Activated, resuming ticker...');
    if (app) app.ticker.start();
});

onDeactivated(() => {
    console.log('[Live2DViewer] Deactivated, pausing ticker...');
    if (app) app.ticker.stop();
});

onMounted(() => {
    init();
});

watch(() => props.modelUrl, () => {
    console.log('[Live2DViewer] modelUrl changed, reloading model...');
    loadModel();
});

onBeforeUnmount(() => {
    console.log('[Live2DViewer] Cleaning up...');
    
    // Cleanup Blob URLs to prevent memory leaks
    createdBlobUrls.forEach(url => URL.revokeObjectURL(url));
    createdBlobUrls.length = 0;

    if (app) {
        if (model && (model as any)._tickerCallback) {
            app.ticker.remove((model as any)._tickerCallback);
        }
        
        app.ticker.stop();
        
        // Comprehensive destruction
        app.destroy(true, { 
            children: true,
            texture: true,
            baseTexture: true
        });
        
        app = null;
    }
});
</script>

<style scoped>
/* Ensure canvas fills container */
canvas {
    display: block;
}
</style>
