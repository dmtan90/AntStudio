<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { generateVideo } from 'video-editor/api/ai';
import { useUserMediaStore } from 'video-editor/hooks/use-user-media';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';
import { Magic, Close, Plus } from '@icon-park/vue-next';

const editor = useEditorStore();
const userMediaStore = useUserMediaStore();

const loading = ref(false);
const videoPrompt = ref('');
const videoDuration = ref(5);
const generatedVideoMedia = ref<any>(null);

const onGenerateVideo = async () => {
    if (!videoPrompt.value) {
        toast.error("Please describe the video movement");
        return;
    }

    loading.value = true;
    try {
        const res = await generateVideo({
            prompt: videoPrompt.value,
            duration: videoDuration.value
        });
        if (res && (res as any).media) {
            const media = (res as any).media;
            toast.success("Video generated successfully!");
            userMediaStore.addLocalItem('video', media);
            generatedVideoMedia.value = media;
        } else if (res && (res as any).jobId) {
            toast.success("Video generation started! It will appear in your videos shortly.");
            setTimeout(() => { userMediaStore.refreshVideos() }, 5000);
            setTimeout(() => { userMediaStore.refreshVideos() }, 15000);
        }
    } catch (err: any) {
        console.error(err);
        toast.error(`Video generation failed: ${err.message || 'Unknown error'}`);
    } finally {
        loading.value = false;
    }
};

const addToTimeline = () => {
    if (!generatedVideoMedia.value) return;
    const pages = editor.pages;
    const lastPage = pages[pages.length - 1];
    if (lastPage) {
        lastPage.onAddVideoFromSource(generatedVideoMedia.value.key, {});
        toast.success('Added to timeline');
        generatedVideoMedia.value = null;
    } else {
        toast.error("No scene found to add video to");
    }
};
</script>

<template>
    <div class="flex flex-col gap-4 p-4">
        <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest px-1">Prompt</label>
        <el-input 
            v-model="videoPrompt" 
            type="textarea" 
            :rows="4" 
            placeholder="Describe the video movement and scene..."
            class="cinematic-input !bg-white/5" 
            resize="none" 
        />

        <div class="flex flex-col gap-3 mt-2 px-1">
            <div class="flex justify-between items-center">
                <label class="text-[10px] text-white/40 font-bold uppercase tracking-widest">Duration (sec)</label>
                <span class="text-[10px] font-mono text-brand-primary/80">{{ videoDuration }}s</span>
            </div>
            <el-slider v-model="videoDuration" :min="3" :max="6" :step="1" show-stops class="cinematic-slider" />
            <div class="flex justify-between text-[8px] text-white/20 font-mono tracking-tighter">
                <span>3S</span><span>4S</span><span>5S</span><span>6S</span>
            </div>
        </div>

        <el-button 
            type="primary"
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-6 shadow-lg shadow-brand-primary/20" 
            :loading="loading"
            @click="onGenerateVideo"
        >
            <template #icon><Magic :size="16" /></template>
            <span class="text-xs font-black uppercase tracking-widest">Generate Video</span>
        </el-button>

        <!-- Video Preview -->
        <div v-if="generatedVideoMedia" class="flex flex-col gap-3 mt-4 p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
            <div class="absolute inset-0 bg-brand-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            
            <div class="flex items-center justify-between px-1">
                <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest flex items-center gap-1.5">
                    <Magic size="12" /> Result
                </span>
                <button class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors" @click="generatedVideoMedia = null">
                    <Close size="12" />
                </button>
            </div>

            <div class="aspect-video rounded-xl overflow-hidden bg-black/40 border border-white/10">
                <video :src="getFileUrl(generatedVideoMedia.key)" controls class="w-full h-full object-cover" />
            </div>

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
:deep(.cinematic-slider .el-slider__runway) {
    @apply bg-white/5 h-1.5;
}
:deep(.cinematic-slider .el-slider__bar) {
    @apply bg-brand-primary h-1.5;
}
:deep(.cinematic-slider .el-slider__button) {
    @apply border-brand-primary bg-black border-2;
}
</style>
