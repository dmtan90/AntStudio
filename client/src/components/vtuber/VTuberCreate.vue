<template>
    <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
        :title="$t('vtubers.create.title')" width="1050px" custom-class="glass-dialog manifest-wizard-v2" @close="onClose">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 p-1 pt-0">
            <!-- Left: Preview & Utilities (5 Cols) -->
            <div class="lg:col-span-5 space-y-4">
                <div class="p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/5 rounded-[40px] text-center relative overflow-hidden h-[580px] group shadow-2xl">
                    <div v-if="hasVisualContent" 
                        class="w-full h-full bg-[#050505] rounded-[32px] border border-white/5 overflow-hidden">
                        
                        <VTuberViewer
                            ref="vtuberViewer"
                            :modelType="newVTuber.visual.modelType as any"
                            :modelUrl="newVTuber.visual.modelUrl"
                            :backgroundUrl="newVTuber.visual.backgroundUrl"
                            v-model:config="newVTuber.visual.modelConfig"
                            :speakingVol="speakingVol"
                            :trackingData="trackingData"
                            :pitchFactor="pitchFactor"
                            :emphasis="emphasis"
                            :intensity="newVTuber.animationConfig"
                            :emotion="testEmotion"
                            :cinematicMode="cinematicMode"
                            :lyrics="newVTuber.backgroundMusic?.lyricsLines || []"
                            :currentTime="audioCurrentTime"
                            :lyricsEnabled="lyricsEnabled"
                            :lyricsStyle="newVTuber.backgroundMusic?.style || 'neon'"
                            :lyricsPosition="newVTuber.backgroundMusic?.position || 'bottom'"
                            :interactive="true"
                        />
                    </div>
                    <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-[32px]">
                        <div class="relative mb-6">
                            <div class="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                            <magic theme="outline" size="64" class="relative text-blue-400/60" />
                        </div>
                        <p class="text-xs font-black uppercase tracking-[0.3em] opacity-40">{{ $t('vtubers.create.projectionPending') }}</p>
                    </div>

                    <div v-if="hasVisualContent" class="absolute top-4 right-4 z-20">
                        <el-tooltip :content="$t('vtubers.create.liveLinkTooltip')" placement="left">
                            <el-button 
                                :type="enableTracking ? 'primary' : 'info'" 
                                circle 
                                class="!bg-black/60 !backdrop-blur-md !border-white/10"
                                @click="toggleTracking"
                            >
                                <div class="relative">
                                    <camera theme="outline" size="18" :class="enableTracking ? 'text-blue-400' : 'text-white/40'" />
                                    <div v-if="enableTracking" class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                            </el-button>
                        </el-tooltip>
                    </div>

                    <!-- Overlay for generation/segmentation -->
                    <div v-if="generatingPreview || isSegmenting" class="absolute inset-x-2 bottom-2 h-24 bg-black/60 backdrop-blur-md rounded-[28px] z-20 flex items-center justify-center gap-4 border border-white/5 mx-2">
                        <el-icon class="is-loading text-blue-400 text-2xl"><loading /></el-icon>
                        <span class="text-[11px] font-black uppercase tracking-widest text-white/80">
                            {{ isSegmenting ? $t('vtubers.create.isolatingSilhouette') : $t('vtubers.create.synthesizingVisuals') }}
                        </span>
                    </div>
                </div>

                <!-- Snapshot Utility -->
                <div class="px-2">
                    <el-button v-if="hasVisualContent"
                               size="large" class="w-full soul-action-btn" @click="generatePreview">
                        <camera theme="outline" class="mr-2"/> {{ $t('vtubers.create.generateSnapshot') }}
                    </el-button>
                </div>
            </div>

            <!-- Right: Unified Config (7 Cols) -->
            <div class="lg:col-span-7 space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                
                <!-- Section 1: Vision Source -->
                <StudioSection :title="$t('vtubers.create.visionSource')">
                    <div class="flex items-center justify-between mb-3 px-1">
                        <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">{{ $t('vtubers.create.projectionType') }}</span>
                        <el-radio-group v-model="newVTuber.visual.modelType" size="small" class="soul-radio-group">
                            <el-radio-button value="vrm">{{ $t('vtubers.create.vrm3d') }}</el-radio-button>
                            <el-radio-button value="live2d">{{ $t('vtubers.create.live2d') }}</el-radio-button>
                            <el-radio-button value="static">{{ $t('vtubers.create.image') }}</el-radio-button>
                        </el-radio-group>
                    </div>
                    <StudioUploadZone
                        :title="$t('vtubers.create.deployEntityFile')"
                        :subtitle="$t('vtubers.create.acceptsPhotos')"
                        :activeTitle="$t('vtubers.create.fileSynchronized')"
                        :activeSubtitle="newVTuber.visual.modelType === 'live2d' ? $t('vtubers.create.live2dAssetSynced') : $t('vtubers.create.vtuberPhotoProcessed')"
                        :hasFile="!!hasVisualContent"
                        :loading="uploading"
                        accept="image/*,.zip,.rar,.vrm"
                        @change="handleFileUpload"
                    />
                </StudioSection>

                <!-- Sections: Identity & Vocal Signature -->
                <div class="grid grid-cols-2 gap-4 items-start">
                    <!-- Section 2: Persona -->
                    <div class="space-y-2">
                        <label class="section-label">{{ $t('vtubers.create.personaIdentity') }}</label>
                        <el-input v-model="newVTuber.name" :placeholder="$t('vtubers.create.namePlaceholder')" class="soul-glass-input" />
                    </div>

                    <!-- Section 3: Vocal Signature -->
                    <div class="space-y-2">
                        <label class="section-label">
                            {{ $t('vtubers.create.vocalSignature') }}
                            <span v-if="newVTuber.voiceConfig.voiceId" class="text-[8px] font-bold opacity-40 uppercase"> {{ newVTuber.voiceConfig.provider }} • {{ newVTuber.voiceConfig.voiceId }}</span>
                        </label>
                        <div class="flex flex-col gap-2">
                            <div class="flex gap-2">
                                <el-button @click="voiceLibraryVisible = true" 
                                           class="flex-1 soul-glass-btn h-[42px] relative overflow-hidden text-left px-4">
                                    <div class="flex items-center gap-2">
                                        <music-one theme="outline" class="text-blue-400" />
                                        <span class="text-[10px] font-black uppercase tracking-widest truncate">
                                            {{ newVTuber.voiceConfig.voiceId ? $t('vtubers.create.signatureLoaded') : $t('vtubers.create.openLibrary') }}
                                        </span>
                                    </div>
                                    <div v-if="newVTuber.voiceConfig.voiceId" class="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div class="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
                                    </div>
                                </el-button>

                                <el-button v-if="newVTuber.voiceConfig.voiceId" 
                                           @click="handleVoicePreview()" 
                                           :loading="previewConfig.loading"
                                           class="soul-neural-test-btn h-[42px] w-[42px] !rounded-xl !p-0">
                                    <pause-one v-if="previewConfig.isPlaying" theme="outline" size="18" />
                                    <play v-else theme="outline" size="18" />
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Objective -->
                <div class="space-y-2 pt-2">
                    <label class="section-label">{{ $t('vtubers.create.promptDescription') }}</label>
                    <el-input v-model="newVTuber.description" type="textarea" :rows="2"
                        :placeholder="$t('vtubers.create.descriptionPlaceholder')" class="soul-glass-input" />
                </div>

                <!-- Section 4: Environment -->
                <div class="space-y-3 pt-2">
                    <label class="section-label">{{ $t('vtubers.create.environment') }}</label>
                    <div class="grid grid-cols-6 gap-2">
                        <div v-for="preset in backgroundPresets" :key="preset.name"
                            @click="newVTuber.visual.backgroundUrl = preset.url"
                            class="cursor-pointer aspect-[1/1] rounded-2xl border-2 transition-all hover:scale-105 overflow-hidden"
                            :class="newVTuber.visual.backgroundUrl === preset.url 
                                ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                                : 'border-white/5 hover:border-white/20'">
                            <img :src="preset.url" :title="preset.name" class="w-full h-full object-cover">
                        </div>
                        <div @click="backgroundInput?.click()" 
                             class="aspect-[1/1] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center cursor-pointer transition-all">
                             <input type="file" ref="backgroundInput" style="display: none" accept="image/*" @change="handleBackgroundUpload" />
                             <plus theme="outline" class="opacity-40" />
                        </div>
                    </div>
                </div>

                <!-- Section 5: Intelligence (Advanced) -->
                <div class="pt-4 border-t border-white/5">
                    <div @click="advancedSettingsVisible = !advancedSettingsVisible" 
                         class="flex items-center justify-center gap-2 cursor-pointer opacity-40 hover:opacity-100 transition-all mb-4">
                        <span class="text-[9px] font-black tracking-[0.2em] uppercase">{{ advancedSettingsVisible ? $t('vtubers.create.hideSpecialized') : $t('vtubers.create.refineIntelligence') }}</span>
                        <down :class="{'rotate-180': advancedSettingsVisible}" class="transition-transform" />
                    </div>

                    <el-collapse-transition>
                        <div v-show="advancedSettingsVisible" class="space-y-6 pb-4">
                            <!-- Traits -->
                            <div class="space-y-2">
                                <label class="section-label">{{ $t('vtubers.create.coreTraits') }}</label>
                                <div class="flex flex-wrap gap-2">
                                    <div v-for="t in presetTraits" :key="t" 
                                         @click="newVTuber.traits.includes(t) ? newVTuber.traits = newVTuber.traits.filter(x => x !== t) : newVTuber.traits.push(t)"
                                         class="trait-tag" :class="{'active': newVTuber.traits.includes(t)}">
                                        {{ $t(`vtubers.create.traits.${t.toLowerCase()}`) }}
                                    </div>
                                </div>
                            </div>

                            <!-- Sliders -->
                            <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                                <StudioSlider 
                                    :label="$t('vtubers.create.gestureIntensity')" 
                                    v-model="newVTuber.animationConfig.gestureIntensity" 
                                    :min="0" :max="2" :step="0.1" :precision="1" 
                                />
                                <StudioSlider 
                                    :label="$t('vtubers.create.tiltFactor')" 
                                    v-model="newVTuber.animationConfig.headTiltRange" 
                                    :min="0" :max="2" :step="0.1" :precision="1" 
                                />
                                <StudioSlider 
                                    :label="$t('vtubers.create.emphasisPower')" 
                                    v-model="newVTuber.animationConfig.nodIntensity" 
                                    :min="0" :max="2" :step="0.1" :precision="1" 
                                />
                                
                                <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                    <div class="flex flex-col">
                                        <span class="text-[9px] font-bold uppercase tracking-widest text-blue-400">{{ $t('vtubers.create.cinematicMode') }}</span>
                                        <span class="text-[8px] opacity-30 italic">{{ $t('vtubers.create.dynamicFraming') }}</span>
                                    </div>
                                    <el-switch v-model="cinematicMode" size="small" />
                                </div>
                            </div>

                            <!-- Director Logic (Phase 81) -->
                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <label class="section-label">{{ $t('vtubers.create.directorMode') }}</label>
                                <div class="grid grid-cols-2 gap-4">
                                     <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-purple-400">{{ $t('vtubers.create.autoFX') }}</span>
                                            <span class="text-[8px] opacity-30 italic">{{ $t('vtubers.create.keywordTriggered') }}</span>
                                        </div>
                                        <el-switch v-model="newVTuber.directorConfig.autoFX" size="small" />
                                    </div>
                                    <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-green-400">{{ $t('vtubers.create.autoCamera') }}</span>
                                            <span class="text-[8px] opacity-30 italic">{{ $t('vtubers.create.emphasisZoom') }}</span>
                                        </div>
                                        <el-switch v-model="newVTuber.directorConfig.autoCamera" size="small" />
                                    </div>
                                </div>
                                <div class="space-y-1 px-1">
                                    <StudioSlider 
                                        :label="$t('vtubers.create.directorAutonomy')" 
                                        v-model="newVTuber.directorConfig.autonomyLevel" 
                                        :min="0" :max="1" :step="0.1" :precision="0"
                                        :display-multiplier="100"
                                        suffix="%"
                                    />
                                </div>
                            </div>

                            <!-- Section 3.5: Background Music -->
                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <div class="flex items-center justify-between">
                                    <label class="section-label">{{ $t('vtubers.create.backgroundMusic') }}</label>
                                    <el-switch v-model="lyricsEnabled" size="small" :inactive-text="$t('vtubers.create.lyrics')" />
                                </div>
                                
                                <div class="flex gap-2">
                                    <el-button 
                                        @click="showMusicDialog = true"
                                        class="flex-1 soul-glass-btn h-[42px] relative overflow-hidden text-left px-4"
                                    >
                                        <div class="flex items-center gap-2">
                                            <music-one theme="outline" class="text-purple-400" />
                                            <span class="text-[10px] font-black uppercase tracking-widest truncate">
                                                {{ newVTuber.backgroundMusic?.title || $t('vtubers.create.selectMusic') }}
                                            </span>
                                        </div>
                                        <div v-if="newVTuber.backgroundMusic" class="absolute right-3 top-1/2 -translate-y-1/2">
                                            <div class="w-2 h-2 rounded-full bg-purple-500 shadow-sm animate-pulse"></div>
                                        </div>
                                    </el-button>

                                    <el-button v-if="newVTuber.backgroundMusic" 
                                               @click="toggleMusicPreview()" 
                                               class="soul-vtuber-test-btn h-[42px] w-[42px] !rounded-xl !p-0">
                                        <pause-one v-if="isPlayingMusic" theme="outline" size="18" />
                                        <play v-else theme="outline" size="18" />
                                    </el-button>
                                </div>

                                <div v-if="newVTuber.backgroundMusic" class="text-[8px] font-bold opacity-40 uppercase px-1">
                                    {{ $t('vtubers.create.lyricsLinesSync', { count: newVTuber.backgroundMusic.lyricsLines?.length || 0 }) }}
                                </div>
                            </div>
                        </div>
                    </el-collapse-transition>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="gap-4 p-4 pt-0 text-center">
                <!-- <el-button @click="$emit('update:modelValue', false)" class="soul-glass-btn flex-1 h-[50px] !rounded-[20px]">ABORT MISSION</el-button> -->
                <el-button type="primary" @click="handleCreateVTuber" :loading="loading"
                    class="soul-initialize-btn flex-3 h-[50px] !rounded-[20px]">{{ $t('vtubers.create.initializeAvatar') }}</el-button>
            </div>
        </template>

        <VoiceLibraryDialog 
            v-model="voiceLibraryVisible"
            v-model:provider="newVTuber.voiceConfig.provider"
            v-model:voiceId="newVTuber.voiceConfig.voiceId"
            v-model:language="newVTuber.voiceConfig.language"
            @select="v => newVTuber.voiceConfig.sampleUrl = v.audioSampleUrl"
        />

        <MusicSelectionDialog 
            v-model="showMusicDialog"
            @select="handleMusicSelect"
        />
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { useVTuberStore } from '@/stores/vtuber';
import { useMediaStore } from '@/stores/media';

import Live2DViewer from './Live2DViewer.vue';
// import VRMViewer from './VRMViewer.vue'; // Wrapped by VTuberViewer
// import StaticPhotoViewer from './StaticPhotoViewer.vue'; // Wrapped by VTuberViewer
import VTuberViewer from './VTuberViewer.vue';
import MusicSelectionDialog from './MusicSelectionDialog.vue';
import VoiceLibraryDialog from './VoiceLibraryDialog.vue';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import { useVTuberTracking } from '@/composables/useVTuberTracking';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';
import { UploadOne, Camera, Magic, Loading, Play, PauseOne, CheckOne, MusicOne, Plus, Down, Search, Avatar } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import { SUPPORTED_LANGUAGES, GOOGLE_VOICES } from '@/constants/google_voices';
import StudioSection from '../studio/shared/StudioSection.vue';
import StudioSlider from '../studio/shared/StudioSlider.vue';
import StudioUploadZone from '../studio/shared/StudioUploadZone.vue';
import StudioVoiceCard from '../studio/shared/StudioVoiceCard.vue';
import { useBackgroundRemoval } from '@/services/BackgroundRemovalService';

const { t } = useI18n();

const props = defineProps<{
    modelValue: boolean;
}>();

const emit = defineEmits(['update:modelValue', 'success']);

const vtuberStore = useVTuberStore();
const mediaStore = useMediaStore();
const backgroundRemoval = useBackgroundRemoval();
const loading = ref(false);
const uploading = ref(false);
const generatingPreview = ref(false);
const isSegmenting = ref(false);
const activeTab = ref('identity');
const avatarInput = ref<HTMLInputElement | null>(null);
const live2dInput = ref<HTMLInputElement | null>(null);
const modelInput = ref<HTMLInputElement | null>(null);
const staticInput = ref<HTMLInputElement | null>(null);
const backgroundInput = ref<HTMLInputElement | null>(null);
const voiceLibraryVisible = ref(false);


const newVTuber = ref({
    name: '',
    description: '',
    traits: [] as string[],
    visual: {
        modelType: 'static', 
        modelUrl: '',
        backgroundUrl: '',
        previewVideoUrl: '', 
        thumbnailUrl: '', 
        modelConfig: {
            zoom: 1.0, 
            offset: { x: 0, y: 0 },
            rotation: 0,
            scale: 1.0,
            idleMotion: '',
            talkMotion: ''
        }
    },
    animationConfig: {
        gestureIntensity: 0.5,
        headTiltRange: 0.5,
        nodIntensity: 0.5
    },
    voiceConfig: {
        provider: 'gemini',
        language: 'en-US',
        voiceId: '',
        sampleUrl: ''
    },
    directorConfig: {
        autoFX: true,
        autoCamera: true,
        autonomyLevel: 0.5
    },
    backgroundMusic: null as any 
});

const advancedSettingsVisible = ref(false);
const showMusicDialog = ref(false);

const handleMusicSelect = (music: any) => {
    newVTuber.value.backgroundMusic = music;
    toast.success(t('vtubers.create.toasts.musicSynced', { title: music.title }));
    
    // Reset music player if music changed
    if (musicPlayer) {
        musicPlayer.pause();
        musicPlayer = null;
        isPlayingMusic.value = false;
        if (musicTimeInterval) clearInterval(musicTimeInterval);
    }
};

const presetTraits = ['FRIENDLY', 'PROFESSIONAL', 'CREATIVE', 'ENERGETIC', 'CALM', 'MYSTERIOUS'];

// const availableVoices = computed(() => {
//     const lang = newSoul.value.voiceConfig.language;
//     return GOOGLE_VOICES[lang] || [];
// });

const backgroundPresets = ref([
    { name: t('vtubers.create.backgrounds.studio'), url: '/bg/pro-studio.jpg' },
    { name: t('vtubers.create.backgrounds.cyberpunk'), url: '/bg/cyberpunk_penthouse.jpg' },
    { name: t('vtubers.create.backgrounds.nature'), url: '/bg/zen_garden.jpg' },
    { name: t('vtubers.create.backgrounds.abstract'), url: '/bg/neon.jpg' },
    { name: t('vtubers.create.backgrounds.solidBlack'), url: '/bg/solid-black.jpg' }
]);

const cacheVoice = {
    provider: '',
    language: '',
    voice: '',
    text: '',
    url: ''
}

// Audio Analysis & Capture (Now using Composable)
// Note: We still need audioCtx for captureVideo, preventing full decoupling yet for video generation 
// but we can simplify the preview visualization.
const { speakingVol, pitchFactor, emphasis, stopAnalysis, attachToAudioElement } = useAudioVisualizer();
const { solveLandmarks } = useVTuberTracking();
const testEmotion = ref('neutral');
const cinematicMode = ref(false);
let cleanupAudioListeners: (() => void) | null = null;
let audioCtx: AudioContext | null = null; // Keep for video capture
let audioDestination: MediaStreamAudioDestinationNode | null = null;

const audioCurrentTime = ref(0);
const lyricsOffset = ref(0);  // Lyrics timing offset in seconds
const isPlayingMusic = ref(false);
const lyricsEnabled = ref(true);
let musicPlayer: HTMLAudioElement | null = null;
let musicTimeInterval: any = null;

const toggleMusicPreview = async () => {
    console.log("toggleMusicPreview");
    if (isPlayingMusic.value) {
        musicPlayer?.pause();
        isPlayingMusic.value = false;
        if (musicTimeInterval) clearInterval(musicTimeInterval);
    } else if (newVTuber.value.backgroundMusic?.audioUrl || newVTuber.value.backgroundMusic?.videoId) {
        if (!musicPlayer) {
            musicPlayer = new Audio();
            musicPlayer.crossOrigin = 'anonymous';
            attachToAudioElement(musicPlayer);
            musicPlayer.onended = () => {
                isPlayingMusic.value = false;
                if (musicTimeInterval) clearInterval(musicTimeInterval);
            };
        }
        const musicUrl = await getFileUrl(`/api/media/youtube/stream/${newVTuber.value.backgroundMusic.videoId}`, {cached: true, refresh: false});
        musicPlayer.src = musicUrl;
        musicPlayer.play();
        isPlayingMusic.value = true;
        audioCurrentTime.value = 0;
        
        musicTimeInterval = setInterval(() => {
            if (musicPlayer) audioCurrentTime.value = musicPlayer.currentTime;
        }, 100);
    }
};

// Audio Preview State
const previewConfig = ref({
    text: t('vtubers.create.tts.defaultTest'),
    loading: false,
    isPlaying: false,
    audio: null as HTMLAudioElement | null
});

watch(() => newVTuber.value?.voiceConfig?.provider, (newVal) => {
    newVTuber.value.voiceConfig.voiceId = '';
});

const handleVoicePreview = async (vid?: string) => {
    const voiceId = vid || newVTuber.value?.voiceConfig?.voiceId;
    if (!voiceId) return;

    if (previewConfig.value.isPlaying && previewConfig.value.audio?.id === voiceId) {
        previewConfig.value.audio.pause();
        previewConfig.value.isPlaying = false;
        return;
    }

    try {
        previewConfig.value.loading = true;
        
        // 1. Check for stored sample URL
        let audioUrl = newVTuber.value?.voiceConfig?.sampleUrl;
        
        if (audioUrl) {
           console.log('[VTuberCreate] Using stored sample:', audioUrl);
        } else {
            const provider = newVTuber.value.voiceConfig.provider;
            const data = await vtuberStore.generateVoicePreview({
                text: t('vtubers.create.tts.syncTesting'),
                provider,
                voiceId,
                language: newVTuber.value.voiceConfig.language || 'en-US'
            });
            audioUrl = data?.audioUrl;
        }
        
        if (audioUrl) {
            if (!previewConfig.value.audio) {
                previewConfig.value.audio = new Audio();
                attachToAudioElement(previewConfig.value.audio);
                previewConfig.value.audio.onended = () => {
                   previewConfig.value.isPlaying = false;
                };
            }
            previewConfig.value.audio.src = getFileUrl(audioUrl);
            previewConfig.value.audio.id = voiceId; // Store for comparison
            previewConfig.value.audio.play();
            previewConfig.value.isPlaying = true;
        }
    } catch (e) {
        toast.error(t('vtubers.create.toasts.voicePreviewFailed'));
    } finally {
        previewConfig.value.loading = false;
    }
};

const trackingData = ref<any>(null);
const enableTracking = ref(false);
let trackingInterval: any = null;
const videoInput = document.createElement('video');

const toggleTracking = async () => {
    if (enableTracking.value) {
        enableTracking.value = false;
        if (trackingInterval) clearInterval(trackingInterval);
        stopWebcam();
        trackingData.value = null;
    } else {
        try {
            await startWebcam();
            await liveAIEngine.initialize();
            enableTracking.value = true;
            startTrackingLoop();
            toast.success(t('vtubers.create.toasts.linkEstablished'));
        } catch (e) {
            toast.error(t('vtubers.create.toasts.cameraAccessFailed'));
        }
    }
};

const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoInput.srcObject = stream;
    videoInput.play();
};

const stopWebcam = () => {
    const stream = videoInput.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
};

const startTrackingLoop = () => {
    trackingInterval = setInterval(async () => {
        if (!enableTracking.value) return;
        const results = await liveAIEngine.processFrame(videoInput, performance.now());
        trackingData.value = solveLandmarks(results, videoInput);
    }, 33); // ~30 FPS
};

const hasVisualContent = computed(() => {
    const v = newVTuber.value.visual;
    return !!v.modelUrl;
});

const handleGenericUpload = async (file: File): Promise<string | null> => {
    uploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await mediaStore.uploadMedia(formData);
        if (res) {
            return res.key || res.url; 
        }
    } catch (e) {
        toast.error(t('vtubers.create.toasts.uploadFailed'));
    } finally {
        uploading.value = false;
    }
    return null;
};

const handleFileUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isVrm = fileName.endsWith('.vrm');
    const isArchive = fileName.endsWith('.zip') || fileName.endsWith('.rar');
    const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/);

    if (isVrm) {
        newVTuber.value.visual.modelType = 'vrm';
        const url = await handleGenericUpload(file);
        if (url) {
            newVTuber.value.visual.modelUrl = url;
            toast.success(t('vtubers.create.toasts.vrmUploaded'));
        }
    } else if (isArchive) {
        newVTuber.value.visual.modelType = 'live2d';
        const url = await handleGenericUpload(file);
        if (url) {
            newVTuber.value.visual.modelUrl = url;
            toast.success(t('vtubers.create.toasts.live2dUploaded'));
        }
    } else if (isImage) {
        newVTuber.value.visual.modelType = 'static';
        const url = await handleGenericUpload(file);
        if (url) {
            newVTuber.value.visual.modelUrl = url;
            toast.success(t('vtubers.create.toasts.avatarUploaded'));
            handleRemoveBackground();
        }
    } else {
        toast.error(t('vtubers.create.toasts.unsupportedFormat'));
    }
};

const handleBackgroundUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = await handleGenericUpload(file);
    if (url) {
        newVTuber.value.visual.backgroundUrl = url;
        toast.success(t('vtubers.create.toasts.backgroundUploaded'));
    }
};

const handleRemoveBackground = async () => {
    if (!newVTuber.value.visual.modelUrl) {
        toast.warning(t('vtubers.create.toasts.uploadAvatarFirst'));
        return;
    }

    isSegmenting.value = true;
    try {
        const url = getFileUrl(newVTuber.value.visual.modelUrl);
        console.log('[VTuberManifest] Starting background removal for:', url);
        const result = await backgroundRemoval.removeBackground(url);
        console.log('[VTuberManifest] Removal complete, uploading result...');
        
        // Convert dataURL to Blob for upload
        const response = await fetch(result.foregroundUrl);
        const blob = await response.blob();
        
        // Upload the segmented result to S3 so it persists
        const s3Url = await handleGenericUpload(new File([blob], `segmented_${Date.now()}.png`, { type: "image/png" }));
        
        if (s3Url) {
            console.log('[VTuberManifest] Segmented result saved to S3:', s3Url);
            newVTuber.value.visual.modelUrl = s3Url;
            toast.success(t('vtubers.create.toasts.backgroundRemoved'));
        } else {
            console.error('[VTuberManifest] S3 upload returned no URL');
            toast.error(t('vtubers.create.toasts.segmentationFailed'));
        }
    } catch (error: any) {
        console.error('[VTuberManifest] Background removal failed:', error);
        toast.error(t('vtubers.create.toasts.removalFailed', { error: error.message || 'Unknown error' }));
    } finally {
        isSegmenting.value = false;
    }
};

// Viewer Reference (Unified Wrapper)
const vtuberViewer = ref<any>(null);

const generatePreview = async () => {
    if (generatingPreview.value) return;
    generatingPreview.value = true;
    
    try {
        if (!vtuberViewer.value) {
            console.warn('[VTuberCreate] No active viewer to capture from.');
            toast.warning(t('vtubers.create.toasts.loadModelFirst'));
            return;
        }

        console.log('[VTuberCreate] Starting preview generation...');

        // 1. Capture Thumbnail using wrapper's captureSnapshot
        if (vtuberViewer.value.captureSnapshot) {
            console.log('[VTuberCreate] Capturing snapshot...');
            const dataUrl = await vtuberViewer.value.captureSnapshot();
            if (dataUrl) {
                // Convert dataURL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], `thumbnail_${Date.now()}.png`, { type: 'image/png' });
                console.log('[VTuberCreate] Uploading thumbnail...');
                const url = await handleGenericUpload(file);
                if (url) {
                    newVTuber.value.visual.thumbnailUrl = url;
                    toast.success(t('vtubers.create.toasts.thumbnailGenerated'));
                    console.log('[VTuberCreate] Thumbnail URL:', url);
                } else {
                    console.error('[VTuberCreate] Thumbnail upload failed');
                }
            } else {
                console.error('[VTuberCreate] Snapshot returned null');
            }
        }

        // 2. Capture Preview Video (with TTS Audio)
        console.log('[VTuberCreate] Checking video capture capability...');
        if (vtuberViewer.value && vtuberViewer.value.captureVideo) {
            console.log('[VTuberCreate] Starting video capture...');
            // Stop any active analysis to avoid competing for the speakingVol ref
            stopAnalysis();
            
            // Generate TTS if not already done or if we need a fresh one
            let audioUrl = newVTuber.value?.voiceConfig?.sampleUrl || '';
            
            if (!audioUrl) {
                 const voiceData = await vtuberStore.generateVoicePreview({
                    text: t('vtubers.create.tts.voicePreview'),
                    provider: newVTuber.value.voiceConfig.provider || 'gemini',
                    voiceId: newVTuber.value.voiceConfig.voiceId,
                    language: newVTuber.value.voiceConfig.language || 'en-US'
                });
                if (voiceData && voiceData.audioUrl) {
                    audioUrl = voiceData.audioUrl;
                }
            }

            if (audioUrl) {
                console.log('[VTuberCreate] Audio URL found, setting up video with audio...');
                const audio = new Audio();
                audio.crossOrigin = 'anonymous'; 
                audio.src = getFileUrl(audioUrl);
                
                await new Promise((resolve) => {
                    audio.onloadedmetadata = resolve;
                });
                
                // Add 800ms buffer for more reliable capture
                const durationMs = (audio.duration || 3) * 1000 + 800;

                // Setup Audio Capture
                if (!audioCtx) audioCtx = new AudioContext();
                if (!audioDestination) audioDestination = audioCtx.createMediaStreamDestination();

                try {
                    if (audioCtx.state === 'suspended') await audioCtx.resume();

                    const audioSource = audioCtx.createMediaElementSource(audio);
                    const analyserNode = audioCtx.createAnalyser();
                    analyserNode.fftSize = 256; // Faster resolution for lip sync
                    
                    audioSource.connect(analyserNode);
                    audioSource.connect(audioDestination); 
                    analyserNode.connect(audioCtx.destination); 

                    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                    
                    const updateVolume = () => {
                        if (audio.ended) return;
                        
                        analyserNode.getByteTimeDomainData(dataArray);
                        let sum = 0;
                        for(let i = 0; i < dataArray.length; i++) {
                            const amplitude = (dataArray[i] - 128) / 128.0; 
                            sum += amplitude * amplitude;
                        }
                        const rms = Math.sqrt(sum / dataArray.length);
                        // Using linear gain (1.8) instead of sqrt for more controlled movement
                        speakingVol.value = Math.min(1.0, rms * 1.8);
                        
                        if (!audio.paused && !audio.ended) {
                            requestAnimationFrame(updateVolume);
                        }
                    };
                    
                    audio.onplay = () => {
                        console.log('[VTuberManifest] Audio playback started, beginning lip-sync loop');
                        updateVolume();
                    };
                    
                    const audioTrack = audioDestination.stream.getAudioTracks()[0];
                    
                    // Start capture, then play audio with a slight delay
                    const capturePromise = vtuberViewer.value.captureVideo(durationMs, audioTrack);
                    
                    setTimeout(() => {
                        audio.play().catch(e => console.error('[VTuberManifest] Playback failed during capture:', e));
                    }, 300);

                    const blob = await capturePromise;
                    
                    console.log('[VTuberCreate] Video capture complete, blob:', blob);
                    // Cleanup audio after capture
                    audio.pause();
                    audio.currentTime = 0;
                    
                    if (blob) {
                        const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                        const url = await handleGenericUpload(file);
                        if (url) {
                            newVTuber.value.visual.previewVideoUrl = url;
                            toast.success(t('vtubers.create.toasts.videoAudioGenerated'));
                        }
                    }
                } catch (e) {
                    console.warn('[VTuberManifestDialog] Audio setup failed:', e);
                } finally {
                    speakingVol.value = 0;
                }
            } else {
                // Fallback to silent video if TTS fails
                const blob = await vtuberViewer.value.captureVideo(3000);
                if (blob) {
                    const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                    const url = await handleGenericUpload(file);
                    if (url) {
                        newVTuber.value.visual.previewVideoUrl = url;
                        toast.success(t('vtubers.create.toasts.videoSilentGenerated'));
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('Preview generation failed:', e);
        toast.error(t('vtubers.create.toasts.previewFailed'));
    } finally {
        generatingPreview.value = false;
    }
};

const handleCreateVTuber = async () => {
    console.log('newVTuber', newVTuber.value);
    if (!newVTuber.value.name || !newVTuber.value.description) {
        toast.warning(t('vtubers.create.toasts.detailsIncomplete'));
        return;
    }
    
    loading.value = true;
    try {
        // Auto-generate assets if missing
        if (!newVTuber.value.visual.thumbnailUrl && hasVisualContent.value) {
            await generatePreview();
        }

        // 1. Initial Manifest (Creates the entity)
        const vtuber = await vtuberStore.fetchVTuber(newVTuber.value.name, newVTuber.value.name);
        
        // 2. Sync all customizations
        if (vtuber && vtuber.entityId) {
            await vtuberStore.updateVTuber(vtuber.entityId, {
                identity: {
                    name: newVTuber.value.name,
                    description: newVTuber.value.description,
                    traits: newVTuber.value.traits
                },
                visual: newVTuber.value.visual,
                meta: {
                    voiceConfig: newVTuber.value.voiceConfig
                },
            });
            
            toast.success(t('vtubers.create.toasts.manifestationSuccess', { name: newVTuber.value.name }));
            emit('update:modelValue', false);
            emit('success');
            
            // Reset
            newVTuber.value = {
                name: '', 
                description: '', 
                traits: [],
                visual: { 
                    modelType: 'vrm', 
                    modelUrl: '',
                    backgroundUrl: '', 
                    previewVideoUrl: '', 
                    thumbnailUrl: '',
                    modelConfig: { zoom: 1.0, offset: { x: 0, y: 0 }, rotation: 0, scale: 1.0, idleMotion: '', talkMotion: '' } 
                },
                animationConfig: {
                    gestureIntensity: 0.5,
                    headTiltRange: 0.5,
                    nodIntensity: 0.5
                },
                directorConfig: {
                    autoFX: true,
                    autoCamera: true,
                    autonomyLevel: 0.5
                },
                backgroundMusic: {
                    id: '',
                    title: '',
                    artist: '',
                    url: ''
                },
                voiceConfig: { provider: 'gemini', language: 'en-US', voiceId: '', sampleUrl: '' }
            };
        }
    } catch (e) {
        console.error('Manifestation failure:', e);
    } finally {
        loading.value = false;
    }
};

const onClose = () => {
    // Reset
    newVTuber.value = {
        name: '', 
        description: '', 
        traits: [],
        visual: { 
            modelType: 'vrm', 
            modelUrl: '',
            backgroundUrl: '', 
            previewVideoUrl: '', 
            thumbnailUrl: '',
            modelConfig: { zoom: 1.0, offset: { x: 0, y: 0 }, rotation: 0, scale: 1.0, idleMotion: '', talkMotion: '' } 
        },
        animationConfig: {
            gestureIntensity: 0.5,
            headTiltRange: 0.5,
            nodIntensity: 0.5
        },
        directorConfig: {
            autoFX: true,
            autoCamera: true,
            autonomyLevel: 0.5
        },
        backgroundMusic: {
            id: '',
            title: '',
            artist: '',
            url: ''
        },
        voiceConfig: { provider: 'gemini', language: 'en-US', voiceId: '', sampleUrl: '' }
    };

    // Reset music player if music changed
    if (musicPlayer) {
        musicPlayer.pause();
        musicPlayer = null;
        isPlayingMusic.value = false;
        if (musicTimeInterval) clearInterval(musicTimeInterval);
    }

    if (enableTracking.value) {
        enableTracking.value = false;
        if (trackingInterval) clearInterval(trackingInterval);
        stopWebcam();
        trackingData.value = null;
    }
    stopAnalysis();
};

onUnmounted(() => {
    onClose();
});
</script>

<script lang="ts">
export default {
    name: 'VTuberCreate'
};
</script>

<style lang="scss" scoped>
.section-label {
    display: block;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 8px;
}

.upload-dropzone {
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(59, 130, 246, 0.4);
        transform: translateY(-2px);
    }

    &.has-file {
        background: rgba(59, 130, 246, 0.03);
        border-style: solid;
        border-color: rgba(59, 130, 246, 0.2);
    }
}

.soul-glass-input {
    :deep(.el-input__wrapper), :deep(.el-textarea__inner) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 12px;
        padding: 0 16px;
        height: 42px;
        color: #fff;
        transition: all 0.3s;

        &:hover, &.is-focus {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
        }
    }

    :deep(.el-textarea__inner) {
        font-family: inherit;
        font-size: 11px;
    }
}

.soul-glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    border-radius: 12px;
    height: 42px;
    display: flex;
    align-items: center;
    transition: all 0.3s;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.soul-action-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    font-weight: 900;
    letter-spacing: 0.1em;
    border-radius: 20px;
    
    &:hover {
        background: rgba(59, 130, 246, 0.2);
        color: #fff;
    }
}

.soul-initialize-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: none;
    color: #fff;
    font-weight: 900;
    letter-spacing: 0.2em;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
    }
}

.trait-tag {
    font-size: 9px;
    font-weight: 900;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    transition: all 0.3s;
    color: rgba(255,255,255,0.4);

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255,255,255,0.8);
    }

    &.active {
        background: rgba(59, 130, 246, 0.1);
        border-color: #3b82f6;
        color: #fff;
    }
}

.voice-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background: rgba(59, 130, 246, 0.05);
        border-color: rgba(59, 130, 246, 0.2);
        transform: scale(1.02);
    }

    &.active {
        background: rgba(59, 130, 246, 0.1);
        border-color: #3b82f6;
    }
}

.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding: 4px;
}

.voice-preview-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    
    &:hover {
        background: #3b82f6;
        border-color: #3b82f6;
    }
}

.voice-search-input-inner {
    :deep(.el-input__wrapper) {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0;
        color: #fff;
        font-weight: 700;
        font-size: 11px;
    }
}

.soul-radio-group {
    :deep(.el-radio-button__inner) {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.4);
        font-weight: 900;
        font-size: 8px;
        letter-spacing: 0.1em;
        padding: 6px 12px;
        transition: all 0.3s;

        &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
        }
    }

    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
    }
}

.glass-select-mini {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 8px;
        height: 28px;
    }
    :deep(.el-input__inner) {
        color: #fff !important;
        font-size: 10px;
        font-weight: 700;
    }
}

.soul-neural-test-btn {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 1px solid rgba(59, 130, 246, 0.2) !important;
    color: #60a5fa !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgba(59, 130, 246, 0.2) !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
}

.soul-mini-test-input {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        box-shadow: none !important;
        border-radius: 10px;
        height: 32px;
        padding-right: 60px;
        transition: all 0.3s;

        &:hover, &.is-focus {
            background: rgba(255, 255, 255, 0.04) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
        }
    }

    :deep(.el-input__inner) {
        color: rgba(255, 255, 255, 0.8) !important;
        font-size: 10px;
        font-weight: 500;

        &::placeholder {
            color: rgba(255, 255, 255, 0.2);
        }
    }
}

.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
}

:deep(.el-collapse) {
    border: none;
    background: transparent;
}

:deep(.el-slider) {
    --el-slider-main-bg-color: #3b82f6;
    --el-slider-runway-bg-color: rgba(255, 255, 255, 0.05);
    --el-slider-stop-bg-color: transparent;
}
</style>
