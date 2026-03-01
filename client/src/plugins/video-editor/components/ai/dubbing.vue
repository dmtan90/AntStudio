<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { translateMedia, translateProject, checkTranslationStatus } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Transform, Magic, Loading, CheckOne, Translate, Voice, VolumeNotice, Config } from '@icon-park/vue-next';
import { AutoEditorService } from 'video-editor/services/AutoEditorService';

const editor = useEditorStore();
const loading = ref(false);
const status = ref<'idle' | 'translating' | 'complete'>('idle');
const progress = ref(0);
const targetLang = ref('es');
const useVoiceCloning = ref(true);
const selectedRefLayerId = ref('');

const languages = [
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'ja', label: 'Japanese' },
    { value: 'zh', label: 'Chinese (Mandarin)' },
    { value: 'vi', label: 'Vietnamese' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'it', label: 'Italian' },
];

const availableAudioLayers = computed(() => {
    const activePage = editor.pages[editor.page];
    if (!activePage) return [];
    return (activePage.elements || []).filter((el: any) => el.type === 'video' || el.type === 'audio');
});

const onLocalizeProject = async () => {
    loading.value = true;
    status.value = 'translating';
    progress.value = 10;

    try {
        await AutoEditorService.autoTranslateProject(targetLang.value, useVoiceCloning.value);
        
        progress.value = 100;
        status.value = 'complete';
        toast.success(`Project localization to ${targetLang.value} complete!`);
        editor.onModified();
    } catch (err: any) {
        console.error(err);
        toast.error("Localization failed: " + err.message);
        status.value = 'idle';
    } finally {
        loading.value = false;
        if (status.value === 'complete') {
            setTimeout(() => { status.value = 'idle'; progress.value = 0; }, 3000);
        }
    }
};

const onTranslateSelectedClip = async () => {
    const canvas = editor.getCanvasInstance(editor.page);
    const activeObj = canvas?.getActiveObject();
    if (!activeObj || !((activeObj as any).type === 'video' || (activeObj as any).type === 'audio')) {
        toast.error("Please select a video or audio clip on the canvas first.");
        return;
    }

    loading.value = true;
    status.value = 'translating';
    progress.value = 20;

    try {
        const res = await translateMedia({
            mediaId: (activeObj as any)._id || (activeObj as any).id,
            targetLang: targetLang.value,
            voiceCloning: useVoiceCloning.value
        });

        if ((res as any).url) {
            // Placeholder: Swap the source or add new layer
            toast.success("Clip translated successfully!");
        }
        
        progress.value = 100;
        status.value = 'complete';
    } catch (err: any) {
        toast.error("Clip translation failed: " + err.message);
        status.value = 'idle';
    } finally {
        loading.value = false;
        if (status.value === 'complete') {
            setTimeout(() => { status.value = 'idle'; progress.value = 0; }, 3000);
        }
    }
};
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Header Card -->
        <div class="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-3 mb-3">
                <Translate :size="18" class="text-indigo-400" />
                <span class="text-xs font-black text-white uppercase tracking-[0.2em]">Global Dubbing</span>
            </div>
            <p class="text-[11px] text-white/50 leading-relaxed italic pr-4">
                Translate your video to any language while preserving the original voice profile and emotional tone.
            </p>
        </div>

        <!-- Settings Area -->
        <div class="flex flex-col gap-5 px-1">
            <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5 px-1">
                    <Config :size="10" /> Target Language
                </label>
                <el-select v-model="targetLang" class="cinematic-select w-full" placeholder="Select language">
                    <el-option v-for="lang in languages" :key="lang.value" :label="lang.label" :value="lang.value" />
                </el-select>
            </div>

            <div class="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <div class="flex flex-col gap-0.5">
                    <span class="text-[10px] font-bold text-white/80 uppercase tracking-wider">Voice Cloning</span>
                    <span class="text-[8px] text-white/30 italic">Maintain original speaker's timbre</span>
                </div>
                <el-switch v-model="useVoiceCloning" active-color="#6366f1" />
            </div>

            <!-- Action Area -->
            <div class="flex flex-col gap-3 mt-2">
                <el-button 
                    type="primary" 
                    class="cinematic-button is-primary !h-12 !rounded-xl !border-none w-full group overflow-hidden" 
                    :loading="loading && status === 'translating'"
                    @click="onLocalizeProject"
                >
                    <template #icon><Magic :size="14" /></template>
                    <span class="text-xs font-bold uppercase tracking-widest">Localize Full Project</span>
                </el-button>

                <div class="flex items-center gap-4 py-2">
                    <div class="h-[1px] flex-1 bg-white/5"></div>
                    <span class="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">OR</span>
                    <div class="h-[1px] flex-1 bg-white/5"></div>
                </div>

                <el-button 
                    class="cinematic-button !h-12 !rounded-xl !border-white/10 !bg-white/5 w-full group" 
                    @click="onTranslateSelectedClip"
                    :disabled="loading"
                >
                    <template #icon><Translate :size="14" class="text-white/40 group-hover:text-white transition-colors" /></template>
                    <span class="text-xs font-bold uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">Translate Selected Clip</span>
                </el-button>
            </div>

            <!-- Progress Indicator -->
            <div v-if="loading" class="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
                <div class="flex justify-between items-center mb-2">
                    <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest">
                        Processing Dubbing...
                    </span>
                    <span class="text-[9px] font-black text-indigo-400">{{ Math.round(progress) }}%</span>
                </div>
                <div class="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500 transition-all duration-500" :style="{ width: progress + '%' }"></div>
                </div>
            </div>

            <!-- Tips -->
            <div class="mt-4 flex gap-3 p-3 rounded-xl bg-white/[0.01] border border-white/[0.03]">
                <VolumeNotice :size="14" class="text-white/20 mt-0.5" />
                <span class="text-[9px] text-white/25 leading-normal">
                    AI Dubbing works best with clear background audio. It will automatically create matching subtitles for the translated speech.
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-select .el-input__inner) {
    @apply bg-white/5 border-white/10 text-white text-[10px] h-10 rounded-xl px-4;
}
</style>
