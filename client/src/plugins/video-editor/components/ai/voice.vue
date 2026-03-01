<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { generateVoice } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { Magic, Transform, Close, Plus, Voice } from '@icon-park/vue-next';
import VoiceLibraryDialog from '@/components/vtuber/VoiceLibraryDialog.vue';

const editor = useEditorStore();
const canvasStore = useCanvasStore();
const userMediaStore = useUserMediaStore();

const loading = ref(false);
const voiceText = ref('');
const selectedVoice = ref('');
const showVoiceLibrary = ref(false);
const voiceProvider = ref('gemini');
const voiceLanguage = ref('en-US');
const selectedVoiceObj = ref<any>(null);
const generatedVoiceMedia = ref<any>(null);

// Multi-speaker State
const isMultiSpeaker = ref(false);
const showSpeaker2Library = ref(false);
const speaker2VoiceObj = ref<any>(null);
const speaker2VoiceId = ref('');

const onGenerateVoice = async () => {
    if (!voiceText.value) {
        toast.error("Please enter text to speak");
        return;
    }

    loading.value = true;
    try {
        const params: any = {
            text: voiceText.value,
            voice: selectedVoice.value,
            provider: voiceProvider.value,
            language: voiceLanguage.value
        };

        if (isMultiSpeaker.value && voiceProvider.value === 'gemini') {
            params.multiSpeaker = {
                enabled: true,
                speakers: [
                    { voiceId: selectedVoice.value },
                    { voiceId: speaker2VoiceId.value || selectedVoice.value }
                ]
            };
        }

        const res = await generateVoice(params);
        if (res && (res as any).media) {
            const media = (res as any).media;
            toast.success("Voice generated successfully!");
            userMediaStore.addLocalItem('audio', media);
            generatedVoiceMedia.value = media;
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Voice generation failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};

const addToTimeline = () => {
    if (!generatedVoiceMedia.value) return;
    const name = `AI Voice: ${voiceText.value.substring(0, 15)}...`;
    canvasStore.canvas?.audio.add(generatedVoiceMedia.value.key, name, false, generatedVoiceMedia.value.id);
    toast.success('Added voice to timeline');
    generatedVoiceMedia.value = null;
};
</script>

<template>
    <div class="flex flex-col gap-4 p-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Script</label>
        <el-input 
            v-model="voiceText" 
            type="textarea" 
            :rows="6" 
            placeholder="Enter text to speak..."
            class="cinematic-input !bg-white/5" 
            resize="none" 
        />

        <div v-show="!isMultiSpeaker" class="flex flex-col gap-2 transition-all">
            <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Voice Model</label>
            <div 
                class="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                @click="showVoiceLibrary = true"
            >
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-lg bg-brand-primary/20 flex items-center justify-center text-brand-primary">
                        <Voice theme="filled" size="14" />
                    </div>
                    <div class="flex flex-col">
                        <span class="text-xs font-bold text-white group-hover:text-brand-primary transition-colors">
                            {{ selectedVoiceObj?.name || selectedVoice || 'Select Voice' }}
                        </span>
                        <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                            {{ voiceProvider.toUpperCase() }} • {{ selectedVoiceObj?.gender || 'Unknown' }}
                        </span>
                    </div>
                </div>
                <div class="text-white/40 group-hover:text-white transition-colors">
                    <Transform size="16" />
                </div>
            </div>
        </div>

        <VoiceLibraryDialog
            v-if="!isMultiSpeaker"
            v-model="showVoiceLibrary"
            v-model:provider="voiceProvider"
            v-model:voiceId="selectedVoice"
            v-model:language="voiceLanguage"
            @select="selectedVoiceObj = $event"
        />

        <div v-show="voiceProvider === 'gemini'" class="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/5 mt-2 transition-all">
            <div class="flex flex-col gap-0.5 px-1">
                <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Multi-Speaker</span>
                <span class="text-[8px] text-white/30 italic">Assign voices to different script segments</span>
            </div>
            <el-switch v-model="isMultiSpeaker" active-color="#10b981" />
        </div>

        <div v-if="isMultiSpeaker && voiceProvider === 'gemini'" class="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5 mt-2">
            <!-- Speaker 1 -->
            <div 
                class="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                @click="showVoiceLibrary = true"
            >
                <div class="flex items-center gap-3">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-white group-hover:text-brand-primary transition-colors">
                            Speaker 1: {{ selectedVoiceObj?.name || selectedVoice || 'Select Voice' }}
                        </span>
                        <span class="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                            {{ selectedVoiceObj?.gender || 'Unknown' }}
                        </span>
                    </div>
                </div>
                <div class="text-white/40 group-hover:text-white transition-colors">
                    <Transform size="14" />
                </div>
            </div>
            
            <VoiceLibraryDialog 
                v-if="isMultiSpeaker"
                v-model="showVoiceLibrary"
                v-model:provider="voiceProvider"
                v-model:voiceId="selectedVoice"
                v-model:language="voiceLanguage"
                @select="selectedVoiceObj = $event"
            />

            <!-- Speaker 2 -->
            <div 
                class="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors group"
                @click="showSpeaker2Library = true"
            >
                <div class="flex items-center gap-3">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-bold text-white group-hover:text-amber-400 transition-colors">
                            Speaker 2: {{ speaker2VoiceObj?.name || speaker2VoiceId || 'Select Voice' }}
                        </span>
                        <span class="text-[8px] font-bold text-white/40 uppercase tracking-widest mt-0.5">
                            {{ speaker2VoiceObj?.gender || 'Unknown' }}
                        </span>
                    </div>
                </div>
                <div class="text-white/40 group-hover:text-white transition-colors">
                    <Transform size="14" />
                </div>
            </div>
            
            <VoiceLibraryDialog 
                v-model="showSpeaker2Library"
                v-model:provider="voiceProvider"
                v-model:voiceId="speaker2VoiceId"
                v-model:language="voiceLanguage"
                @select="speaker2VoiceObj = $event"
            />
        </div>

        <el-button 
            type="primary"
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-4 shadow-lg shadow-brand-primary/20" 
            :loading="loading"
            @click="onGenerateVoice"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Generate Voice</span>
        </el-button>

        <!-- Preview Section -->
        <div v-if="generatedVoiceMedia" class="flex flex-col gap-3 mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div class="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div class="flex items-center justify-between px-1">
                <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Magic size="12" /> Generated Audio
                </span>
                <button class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors" @click="generatedVoiceMedia = null">
                    <Close size="12" />
                </button>
            </div>

            <audio 
                :src="getFileUrl(generatedVoiceMedia.key)" 
                controls 
                class="w-full h-8 cinematic-audio-player rounded-lg overflow-hidden" 
            />

            <button 
                class="flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-brand-primary text-black hover:bg-brand-primary/90 transition-all font-bold text-[11px] uppercase tracking-widest shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)] mt-1"
                @click="addToTimeline"
            >
                <Plus size="14" /> Add to Timeline
            </button>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-input .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-4 shadow-inner transition-all duration-300;
}
:deep(.cinematic-audio-player) {
    background: transparent;
}
:deep(.cinematic-audio-player::-webkit-media-controls-enclosure) {
    @apply bg-white/10 rounded-lg;
}
</style>
