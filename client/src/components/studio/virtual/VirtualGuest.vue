<template>
    <div class="virtual-guest relative w-full h-full bg-black/20 overflow-hidden rounded-xl">
        <div ref="viewerContainer" class="absolute inset-0" v-if="persona.visual?.modelUrl">
            <!-- Live2D Model Viewer -->
            <Live2DViewer
                v-if="isLive2D"
                ref="viewerLive2D"
                :model-url="persona.visual.modelUrl"
                :speaking-vol="audioLevel"
                :config="persona.visual.live2dConfig"
                :is-host-speaking="isHostSpeaking"
                :emotion="currentEmotion || persona.emotion"
                :intensity="safeAnimationConfig"
                :background-url="hideBackground ? null : (persona.visual?.backgroundUrl || backgroundUrl)"
                :aura-enabled="persona.performanceConfig?.auraEnabled || isThinking || hypeLevel > 1.0"
                :aura-color="hypeLevel > 1.5 ? '#ff0055' : (persona.performanceConfig?.auraColor || '#00f2ff')"
                :particle-type="persona.performanceConfig?.particleType || (isThinking ? 'glitter' : (hypeLevel > 0.8 ? 'glitter' : null))"
                :particle-density="(persona.performanceConfig?.particleDensity || 0.4) + (hypeLevel * 0.5)"
                :lyrics="performanceLyrics"
                :current-time="performanceLyricsCurrentTime"
                :lyrics-enabled="!hideBackground"
                :camera-transform="cameraTransform"
                :is-portrait="isPortrait"
                @ready="handleReady"
            />

            <!-- Static Photo Viewer (Neural Puppet) -->
            <StaticPhotoViewer
                v-else-if="isStatic"
                ref="viewerStatic"
                :model-url="persona.visual.modelUrl"
                :speaking-vol="audioLevel"
                :is-host-speaking="isHostSpeaking"
                :emotion="currentEmotion || persona.emotion"
                :intensity="safeAnimationConfig"
                :background-url="hideBackground ? null : (persona.visual?.backgroundUrl || backgroundUrl)"
                :aura-enabled="persona.performanceConfig?.auraEnabled || isThinking || hypeLevel > 1.0"
                :aura-color="hypeLevel > 1.5 ? '#ff0055' : (persona.performanceConfig?.auraColor || '#00f2ff')"
                :particle-type="persona.performanceConfig?.particleType || (isThinking ? 'glitter' : (hypeLevel > 0.8 ? 'glitter' : null))"
                :particle-density="(persona.performanceConfig?.particleDensity || 0.4) + (hypeLevel * 0.5)"
                :lyrics="performanceLyrics"
                :current-time="performanceLyricsCurrentTime"
                :lyrics-enabled="!hideBackground"
                :camera-transform="cameraTransform"
                :is-portrait="isPortrait"
                :uuid="persona.uuid"
                @ready="handleReady"
            />

            <!-- Video Based 2D Model Viewer -->
            <VideoViewer
                v-else-if="isVideo"
                ref="viewerVideo"
                :model-url="persona.visual.modelUrl"
                :speaking-vol="audioLevel"
                :lyrics="performanceLyrics"
                :current-time="performanceLyricsCurrentTime"
                :lyrics-enabled="!hideBackground"
                :camera-transform="cameraTransform"
                :aura-enabled="persona.performanceConfig?.auraEnabled || isThinking || hypeLevel > 1.0"
                :aura-color="hypeLevel > 1.5 ? '#ff0055' : (persona.performanceConfig?.auraColor || '#00f2ff')"
                :particle-type="persona.performanceConfig?.particleType || (isThinking ? 'glitter' : (hypeLevel > 0.8 ? 'glitter' : null))"
                :particle-density="(persona.performanceConfig?.particleDensity || 0.4) + (hypeLevel * 0.5)"
                :emotion="currentEmotion || persona.emotion"
                :gesture="currentGesture || persona.gesture"
                :is-portrait="isPortrait"
                :uuid="persona.uuid"
                @ready="handleReady"
            />

            <!-- AIDOL State Machine Viewer -->
            <AidolVideoPlayer
                v-else-if="isAidol"
                ref="viewerAidol"
                :uuid="persona.uuid"
                :model-url="persona.visual.modelUrl"
                :video-clips="(persona.visual as any)?.aidolClips"
                :active-state="aidolState as any"
                :hype-level="hypeLevel"
                :is-portrait="isPortrait"
                :is-paused="isPaused"
                @ready="handleReady"
            />

            <!-- VRM Model Viewer (Upgraded from Head3DViewer) -->
            <VRMViewer v-else
                ref="vrmViewer"
                :model-url="persona.visual.modelUrl"
                :speaking-vol="audioLevel"
                :aura-enabled="persona.performanceConfig?.auraEnabled || isThinking || hypeLevel > 1.0"
                :aura-color="hypeLevel > 1.5 ? '#ff0055' : (persona.performanceConfig?.auraColor || '#00f2ff')"
                :particle-type="persona.performanceConfig?.particleType || (isThinking ? 'glitter' : (hypeLevel > 0.8 ? 'glitter' : null))"
                :particle-density="(persona.performanceConfig?.particleDensity || 0.4) + (hypeLevel * 0.5)"
                :background-url="hideBackground ? null : (persona.visual?.backgroundUrl || backgroundUrl)"
                :is360="is360"
                :is-portrait="isPortrait"
                :emotion="currentEmotion || persona.emotion"
                :gesture="currentGesture || persona.gesture"
                :animation-config="persona.animationConfig"
                :config="{
                    zoom: persona.visual.live2dConfig?.zoom || 1.0,
                    offset: persona.visual.live2dConfig?.offset || { x: 0, y: 0 }
                }"
                :lyrics="performanceLyrics"
                :current-time="performanceLyricsCurrentTime"
                :lyrics-enabled="!hideBackground"
                :camera-transform="cameraTransform"
                :active-camera-path="persona.performanceConfig?.activeCameraPath"
                :camera-intensity="persona.performanceConfig?.cameraIntensity"
                @ready="handleReady"
            />
        </div>


        <!-- Identity Label -->
        <div class="absolute bottom-2 left-2 px-2 py-1 bg-black/60 rounded text-[10px] font-bold text-white z-10 flex items-center gap-1">
            <span class="w-2 h-2 rounded-full" :class="isTalking ? 'bg-green-500 animate-pulse' : 'bg-blue-500'"></span>
            <span v-if="isThinking" class="animate-bounce">...</span>
            {{ persona.name }} <span>{{ $t('studio.virtual.aiSuffix') || '(AI)' }}</span>
        </div>

        <!-- Global Loading Overlay -->
        <div v-if="isLoading" class="absolute inset-0 flex items-center justify-center bg-[#050505] z-50">
            <div class="flex flex-col items-center gap-4">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-white/80"></div>
                <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 animate-pulse">{{ $t('studio.common.initializingEntity') || 'INITIALIZING ENTITY' }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { AIGuestPersona, syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';
import VRMViewer from '@/components/influencer/VRMViewer.vue';
import Live2DViewer from '@/components/influencer/Live2DViewer.vue';
import StaticPhotoViewer from '@/components/influencer/StaticPhotoViewer.vue';
import VideoViewer from '@/components/influencer/VideoViewer.vue';
import AidolVideoPlayer from '@/components/influencer/AidolVideoPlayer.vue';
import { useCameraMotion } from '@/composables/influencer/useCameraMotion';
import { useMediaStore } from '@/stores/media';

const props = defineProps<{
    persona: AIGuestPersona;
    isHostSpeaking?: boolean;
    backgroundUrl?: string | null;
    is360?: boolean;
    hideBackground?: boolean;
    isPortrait?: boolean;
    isPaused?: boolean;
}>();

const emit = defineEmits<{
    'stream-ready': [stream: MediaStream];
}>();

onMounted(() => {
    console.log('[VirtualGuest] Mounted:', props);
});

const mediaStore = useMediaStore();

// Check if this influencer is currently performing
const isPerforming = computed(() => {
    const performingId = mediaStore.performingInfluencerId;
    const currentId = props.persona.uuid;
    const match = performingId === currentId;
    if (performingId) {
        console.log(`[VirtualGuest] ${props.persona.name} performance check: store=${performingId}, me=${currentId}, match=${match}`);
    }
    return match;
});

const performanceLyrics = computed(() => {
    const lyrics = isPerforming.value ? mediaStore.performanceLyrics : [];
    if (isPerforming.value && lyrics.length === 0) {
        console.warn(`[VirtualGuest] ${props.persona.name} is performing but has NO lyrics in store!`);
    }
    return lyrics;
});
const performanceLyricsCurrentTime = computed(() => isPerforming.value ? mediaStore.performanceLyricsCurrentTime : 0);

// Camera Motion Logic
const { cameraTransform, updateProgress, setPath } = useCameraMotion();

// Drive camera motion
watch(() => props.persona.performanceConfig?.activeCameraPath, (newPath) => {
    if (newPath) {
        setPath(newPath as any, props.persona.performanceConfig?.cameraIntensity || 1.0);
    } else {
        setPath(null);
    }
}, { immediate: true });

// Drive camera animation loop
let cameraAnimationId: number | null = null;
onMounted(() => {
    let lastTime = performance.now();
    const animateCamera = (time: number) => {
        const dt = (time - lastTime) / 16.666; // Normalize to 60fps
        lastTime = time;
        
        if (!props.isPaused && props.persona.performanceConfig?.activeCameraPath && (props.persona.performanceConfig.activeCameraPath as any) !== 'none') {
            updateProgress(dt);
        }
        
        cameraAnimationId = requestAnimationFrame(animateCamera);
    };
    cameraAnimationId = requestAnimationFrame(animateCamera);
});

onUnmounted(() => {
    if (cameraAnimationId) {
        cancelAnimationFrame(cameraAnimationId);
        cameraAnimationId = null;
    }
});
const performanceLyricsVisible = computed(() => {
    const visible = isPerforming.value ? mediaStore.performanceLyricsVisible : false;
    // if (isPerforming.value) console.log(`[VirtualGuest] ${props.persona.name} lyrics visible:`, visible);
    return visible;
});
const performanceLyricsStyle = computed(() => mediaStore.performanceLyricsStyle);
const performanceLyricsPosition = computed(() => mediaStore.performanceLyricsPosition);

const vrmViewer = ref<InstanceType<typeof VRMViewer> | null>(null);
const viewerLive2D = ref<InstanceType<typeof Live2DViewer> | null>(null);
const viewerStatic = ref<InstanceType<typeof StaticPhotoViewer> | null>(null);
const viewerVideo = ref<InstanceType<typeof VideoViewer> | null>(null);
const viewerAidol = ref<InstanceType<typeof AidolVideoPlayer> | null>(null);
const viewerContainer = ref<HTMLElement | null>(null);
const audioLevel = ref(0);
const audioLevelOverride = ref<number | null>(null); // For performance mode
const isTalking = ref(false);
const isThinking = ref(false);
const currentEmotion = ref('');
const currentGesture = ref('');
const currentProductId = ref<string | null>(null);
const isLiveVoiceActive = ref(false);
const hypeLevel = ref(0);
const isLoading = ref(true);

const handleReady = () => {
    // Small delay to ensure render is stable/visible
    setTimeout(() => {
        isLoading.value = false;
        captureStreamWithRetry();
    }, 100);
};

const setLiveVoiceState = (active: boolean) => {
    isLiveVoiceActive.value = active;
};

const setLiveVoiceAudioLevel = (level: number) => {
    if (isLiveVoiceActive.value) {
        // Use override if set (performance mode), otherwise use provided level
        const effectiveLevel = audioLevelOverride.value !== null ? audioLevelOverride.value : level;
        audioLevel.value = effectiveLevel;
        isTalking.value = effectiveLevel > 0.01;
    }
};

const setAudioLevelOverride = (level: number | null) => {
    audioLevelOverride.value = level;
    // Immediately apply if set
    if (level !== null) {
        audioLevel.value = level;
        isTalking.value = level > 0.01;
    }
};

const setLiveVoiceEmotion = (emotion: string) => {
    if (isLiveVoiceActive.value) {
        currentEmotion.value = emotion;
    }
};

const setLiveVoiceGesture = (gesture: string) => {
    if (isLiveVoiceActive.value) {
        currentGesture.value = gesture;
    }
};

const setLiveVoicePose = (part: string, value: number) => {
    if (isLiveVoiceActive.value && viewerLive2D.value) {
        viewerLive2D.value.setPose(part, value);
    }
};

const setLiveVoiceEyeFocus = (target: string) => {
    if (isLiveVoiceActive.value && viewerLive2D.value) {
        viewerLive2D.value.setEyeFocus(target);
    }
};

const setLiveVoicePerformance = (style: string, intensity: number) => {
    if (isLiveVoiceActive.value && viewerLive2D.value) {
        viewerLive2D.value.triggerPerformance(style, intensity);
    }
};

const isLive2D = computed(() => props.persona.visual?.modelType === 'live2d');
const isStatic = computed(() => props.persona.visual?.modelType === 'static' || props.persona.visual?.modelType === 'image');
const isVideo = computed(() => (props.persona.visual?.modelType as string) === 'video');
const isAidol = computed(() => (props.persona.visual?.modelType as string) === 'aidol');

const aidolState = computed(() => {
    // 0. Dynamic mapping via 'type' (which is the segment.type passed as currentGesture)
    if (currentGesture.value && props.persona.visual?.aidolClips?.[currentGesture.value]) {
        return currentGesture.value;
    }

    // 0.1 Fallback to mapping via 'productId'
    if (currentProductId.value && props.persona.visual?.aidolClips?.[currentProductId.value]) {
        return currentProductId.value;
    }

    // 1. High-priority reactions (Gifts / Hype)
    if (['react_gift', 'victory', 'bashful', 'love', 'surprised', 'clap'].includes(currentGesture.value)) return 'gift_react';
    if (hypeLevel.value > 0.8 || currentGesture.value === 'hype') return 'hype';
    
    // 2. Specific performance actions
    if (['product_intro', 'point'].includes(currentGesture.value)) return 'product';
    if (currentGesture.value === 'checkout') return 'checkout';
    if (currentGesture.value === 'wave') return 'wave';
    if (currentGesture.value === 'dance') return 'dance';
    
    // 3. Dialogue
    if (isTalking.value || props.isHostSpeaking) return 'speaking';
    
    // 4. Fallback
    return 'idle';
});

const safeAnimationConfig = computed(() => ({
    gestureIntensity: props.persona.animationConfig?.gestureIntensity ?? 1,
    headTiltRange: props.persona.animationConfig?.headTiltRange ?? 1,
    nodIntensity: props.persona.animationConfig?.nodIntensity ?? 1
}));

// Listen for audio updates from manager
const handleWorkerCommand = (e: CustomEvent) => {
    const { type, payload } = e.detail;
    
    if (payload.id !== props.persona.uuid) return;

    if (type === 'update-3d-audio') {
        if (!isLiveVoiceActive.value) {
            audioLevel.value = payload.audioLevel;
            isTalking.value = payload.audioLevel > 0.01;
        }
    } else if (type === 'update-3d-thinking') {
        isThinking.value = payload.isThinking;
    } else if (type === 'update-3d-expression') {
        if (!isLiveVoiceActive.value) {
            currentEmotion.value = payload.emotion;
            currentGesture.value = payload.gesture;
            currentProductId.value = payload.productId;
        }
    } else if (type === 'update-hype-level') {
        hypeLevel.value = payload.level;
    }
};

onMounted(() => {
    window.addEventListener('studio-worker-command', handleWorkerCommand as EventListener);
    
    // Capture stream after mount with retry
    captureStreamWithRetry();
});

const captureStreamWithRetry = (retries = 5, delay = 1000) => {
    let attempt = 0;
    const tryCapture = () => {
        const success = captureStream();
        if (!success && attempt < retries) {
            attempt++;
            setTimeout(tryCapture, delay);
        }
    };
    tryCapture(); // Immediate first attempt
};

onUnmounted(() => {
    window.removeEventListener('studio-worker-command', handleWorkerCommand as EventListener);
});

const captureStream = async () => {
    let canvas: HTMLCanvasElement | null = null;
    
    if (viewerContainer.value) {
        canvas = viewerContainer.value.querySelector('canvas');
    }
    
    if (!canvas) {
        // Fallback for safety across different viewer types
        const viewers = [vrmViewer, viewerLive2D, viewerStatic, viewerVideo, viewerAidol];
        for (const v of viewers) {
            if (v.value) {
                const el = (v.value as any).$el;
                if (el && typeof el.querySelector === 'function') {
                    canvas = el.querySelector('canvas');
                    if (canvas) break;
                }
            }
        }
    }

    if (canvas) {
        try {
            // Optimization: Standardize to 30fps for smooth motion
            const stream = (canvas as any).captureStream(30);
            if (stream) {
                emit('stream-ready', stream);
                return true;
            }
        } catch (e) {
            console.error(`[VirtualGuest] captureStream failed for ${props.persona.name}:`, e);
        }
    }

    console.warn(`[VirtualGuest] Could not find or capture canvas for ${props.persona.name}`);
    return false;
};

// Re-capture if model type switches
watch(() => props.persona.visual?.modelUrl, () => {
    isLoading.value = true;
    // captureStreamWithRetry will be called by @ready
});

// Expose methods for Gemini Live integration
defineExpose({
    setLiveVoiceState,
    setLiveVoiceAudioLevel,
    setAudioLevelOverride,
    setLiveVoiceEmotion,
    setLiveVoiceGesture,
    setLiveVoicePose,
    setLiveVoiceEyeFocus,
    setLiveVoicePerformance
});
</script>
