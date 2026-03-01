<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useVTuberStore } from '@/stores/vtuber';
import { useMediaStore } from '@/stores/media';
import { toast } from 'vue-sonner';
import { 
  User, Magic, Loading, CheckOne, Play, PauseOne, 
  MusicOne, Video, Download, Plus, Search
} from '@icon-park/vue-next';
import VTuberViewer from '@/components/vtuber/VTuberViewer.vue';
import VoiceLibraryDialog from '@/components/vtuber/VoiceLibraryDialog.vue';
import StudioSlider from '@/components/studio/shared/StudioSlider.vue';
import { getFileUrl, uploadFile } from '@/utils/api';
import { storeToRefs } from 'pinia';

const editor = useEditorStore();
const vtuberStore = useVTuberStore();
const mediaStore = useMediaStore();

const { vtubers } = storeToRefs(vtuberStore);

// State
const loadingAvatars = ref(false);
const selectedAvatarId = ref<string | null>(null);
const selectedAvatarData = ref<any>(null);
const script = ref("");
const voiceLibraryVisible = ref(false);
const voiceConfig = ref({
  provider: 'gemini',
  voiceId: 'en-US-Standard-A',
  language: 'en-US',
  sampleUrl: '',
  speed: 1.0,
  pitch: 0,
});

const isRendering = ref(false);
const renderProgress = ref(0);
const renderViewerRef = ref<any>(null);
const previewSpeakingVol = ref(0);
const isPreviewing = ref(false);

// Audio Analysis for Preview
let previewAudio: HTMLAudioElement | null = null;
let previewAnalyser: AnalyserNode | null = null;
let previewDataArray: Uint8Array | null = null;
let previewAnimationId: number | null = null;

onMounted(async () => {
    loadingAvatars.value = true;
    try {
        await vtuberStore.fetchLibrary();
    } catch (e) {
        toast.error("Failed to load avatars");
    } finally {
        loadingAvatars.value = false;
    }
});

const selectAvatar = (av: any) => {
    selectedAvatarId.value = av._id;
    selectedAvatarData.value = av;
};

const stopPreviewSync = () => {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
  if (previewAnimationId) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }
  isPreviewing.value = false;
  previewSpeakingVol.value = 0;
};

const startPreviewSyncLoop = () => {
  if (!isPreviewing.value || !previewAnalyser || !previewDataArray) return;
  
  const update = () => {
    if (!isPreviewing.value || !previewAnalyser || !previewDataArray) return;
    
    previewAnalyser.getByteTimeDomainData(previewDataArray as any);
    let sum = 0;
    for(let i = 0; i < previewDataArray.length; i++) {
      const amplitude = (previewDataArray[i] - 128) / 128.0; 
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / previewDataArray.length);
    previewSpeakingVol.value = Math.min(1.0, rms * 2.5);
    
    previewAnimationId = requestAnimationFrame(update);
  };
  
  update();
};

const onPreviewVoice = async () => {
  if (isPreviewing.value) {
    stopPreviewSync();
    return;
  }

  if (!voiceConfig.value.voiceId) {
      toast.error("Please select a voice profile first");
      return;
  }

  try {
    toast.info("Generating voice preview...");
    const data = await vtuberStore.generateVoicePreview({
      text: script.value || "This is a preview of the selected voice profile.",
      provider: voiceConfig.value.provider,
      voiceId: voiceConfig.value.voiceId,
      language: voiceConfig.value.language || 'en-US'
    });

    if (data?.audioUrl) {
      if (!previewAudio) {
        previewAudio = new Audio();
        previewAudio.crossOrigin = 'anonymous';
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(previewAudio);
        previewAnalyser = audioCtx.createAnalyser();
        previewAnalyser.fftSize = 256;
        source.connect(previewAnalyser);
        previewAnalyser.connect(audioCtx.destination);
        previewDataArray = new Uint8Array(previewAnalyser.frequencyBinCount);
        
        previewAudio.onended = () => { stopPreviewSync(); };
      }
      
      previewAudio.src = getFileUrl(data.audioUrl);
      await previewAudio.play();
      isPreviewing.value = true;
      startPreviewSyncLoop();
    }
  } catch (e) {
    toast.error('Voice preview failed');
    stopPreviewSync();
  }
};

const onRenderAndAdd = async () => {
    if (!selectedAvatarData.value || !script.value) {
        toast.error("Missing avatar or script");
        return;
    }

    isRendering.value = true;
    renderProgress.value = 10;

    try {
        // 1. Generate Voice
        const voiceData = await vtuberStore.generateVoicePreview({
            text: script.value,
            provider: voiceConfig.value.provider,
            voiceId: voiceConfig.value.voiceId,
            language: voiceConfig.value.language
        });

        if (!voiceData || !voiceData.audioUrl) throw new Error('Failed to synthesize audio');
        renderProgress.value = 30;

        // 2. Setup Recording
        const audioUrl = getFileUrl(voiceData.audioUrl);
        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';

        await new Promise((resolve) => { audio.onloadedmetadata = resolve; });
        const duration = audio.duration;
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(audio);
        const analyser = audioCtx.createAnalyser();
        const destination = audioCtx.createMediaStreamDestination();
        
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        source.connect(destination);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        
        const updateSync = () => {
            if (!isRendering.value || audio.ended) return;
            analyser.getByteTimeDomainData(dataArray as any);
            let sum = 0;
            for(let i = 0; i < dataArray.length; i++) {
                const amplitude = (dataArray[i] - 128) / 128.0; 
                sum += amplitude * amplitude;
            }
            const rms = Math.sqrt(sum / dataArray.length);
            previewSpeakingVol.value = Math.min(1.0, rms * 2.5);
            renderProgress.value = 30 + (audio.currentTime / duration) * 60;
            if (!audio.paused) requestAnimationFrame(updateSync);
        };

        // 3. Start Recording
        if (renderViewerRef.value?.captureVideo) {
            const capturePromise = renderViewerRef.value.captureVideo(
                duration * 1000 + 500,
                destination.stream.getAudioTracks()[0]
            );
            
            audio.play();
            updateSync();
            
            const blob = await capturePromise;
            audio.pause();

            // 4. Upload & Add to Project
            const file = new File([blob], `avatar_${Date.now()}.webm`, { type: 'video/webm' });
            const media = await uploadFile(file, 'ai-avatar');
            
            if (media) {
                await editor.addVideo({ src: media });
                toast.success("AI Avatar added to timeline!");
            }
        }
    } catch (e) {
        console.error(e);
        toast.error("Avatar rendering failed");
    } finally {
        isRendering.value = false;
        renderProgress.value = 0;
        previewSpeakingVol.value = 0;
    }
};

</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Preview & Selector -->
        <div class="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/40 border border-white/10 group shadow-2xl">
            <VTuberViewer
                v-if="selectedAvatarData"
                ref="renderViewerRef"
                :modelType="selectedAvatarData.visual.modelType"
                :modelUrl="selectedAvatarData.visual.modelUrl"
                :backgroundUrl="selectedAvatarData.visual.backgroundUrl || '/bg/pro-studio.jpg'"
                :modelConfig="selectedAvatarData.visual.modelConfig"
                :speakingVol="previewSpeakingVol"
                :interactive="false"
                class="w-full h-full"
            />
            <div v-else class="w-full h-full flex flex-col items-center justify-center opacity-40">
                <User :size="48" />
                <span class="text-[10px] uppercase font-black tracking-widest mt-4">Select Avatar</span>
            </div>

            <!-- Avatar List Overlay -->
            <div class="absolute inset-0 bg-black/80 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col pointer-events-none group-hover:pointer-events-auto">
                <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-black text-white/60 uppercase tracking-widest">Digital Identities</span>
                    <Search :size="14" class="text-white/40" />
                </div>
                <div class="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    <div class="grid grid-cols-2 gap-2">
                        <div v-for="av in vtubers" :key="av._id" 
                             @click="selectAvatar(av)"
                             class="aspect-square rounded-xl bg-white/5 border border-white/10 overflow-hidden cursor-pointer hover:border-brand-primary active:scale-95 transition-all"
                             :class="selectedAvatarId === av._id ? 'border-brand-primary ring-1 ring-brand-primary' : ''"
                        >
                            <img v-if="av.visual?.thumbnailUrl" :src="getFileUrl(av.visual.thumbnailUrl)" class="w-full h-full object-cover" />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <span class="text-[8px] font-black uppercase text-white/20">{{ av.name }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Processing Overlay -->
            <div v-if="isRendering" class="absolute inset-0 bg-black/60 backdrop-blur-lg z-50 flex flex-col items-center justify-center p-8">
                <Loading class="animate-spin text-brand-primary mb-6" :size="32" />
                <div class="w-full h-1 bg-white/10 rounded-full overflow-hidden shadow-inner">
                    <div class="h-full bg-brand-primary transition-all duration-300" :style="{ width: renderProgress + '%' }"></div>
                </div>
                <span class="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mt-4 animate-pulse">Capturing Digital Voice...</span>
            </div>
        </div>

        <!-- Script & Configuration -->
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between px-1">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest">Narration Script</label>
                    <span class="text-[9px] font-black text-brand-primary/60 uppercase tracking-widest">{{ script.length }} chars</span>
                </div>
                <el-input
                    v-model="script"
                    type="textarea"
                    placeholder="Enter what your avatar should say..."
                    :rows="4"
                    class="cinematic-textarea"
                />
            </div>

            <!-- Controls -->
            <div class="grid grid-cols-1 gap-3">
                <!-- Voice Selector -->
                <div class="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-brand-primary/30 transition-colors">
                    <div class="flex items-center gap-3">
                        <div class="p-2 rounded-lg bg-brand-primary/10 text-brand-primary">
                            <MusicOne :size="14" />
                        </div>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-black text-white/90 uppercase">{{ voiceConfig.voiceId || 'Select Voice' }}</span>
                            <span class="text-[8px] text-white/30 uppercase tracking-widest">{{ voiceConfig.provider }}</span>
                        </div>
                    </div>
                    <el-button link class="!text-brand-primary !text-[10px] font-black uppercase" @click="voiceLibraryVisible = true">Change</el-button>
                </div>

                <div class="flex gap-2">
                    <el-button 
                        class="cinematic-button flex-1 !h-12 !rounded-xl !bg-white/5 !border-white/10 !text-white"
                        @click="onPreviewVoice"
                        :loading="isPreviewing"
                    >
                        <template #icon><Play v-if="!isPreviewing" :size="14" /><PauseOne v-else :size="14" /></template>
                        <span class="text-[10px] font-black uppercase tracking-widest">{{ isPreviewing ? 'Stop' : 'Preview' }}</span>
                    </el-button>

                    <el-button 
                        type="primary"
                        class="cinematic-button is-primary flex-[2] !h-12 !rounded-xl !border-none"
                        @click="onRenderAndAdd"
                        :loading="isRendering"
                        :disabled="!selectedAvatarId || !script"
                    >
                        <template #icon><Video :size="14" /></template>
                        <span class="text-[10px] font-black uppercase tracking-widest">Render & Add</span>
                    </el-button>
                </div>
            </div>
        </div>

        <VoiceLibraryDialog 
            v-model="voiceLibraryVisible"
            v-model:provider="voiceConfig.provider"
            v-model:voiceId="voiceConfig.voiceId"
            v-model:language="voiceConfig.language"
        />
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-textarea .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-4 shadow-inner transition-all duration-300;
}
</style>
