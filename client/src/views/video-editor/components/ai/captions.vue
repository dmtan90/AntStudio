<script setup lang="ts">
import { computed, ref } from 'vue';
import { Refresh as RefreshCcw, MagicWand } from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { generateCaptions } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';

const editor = useEditorStore();
const canvasStore = useCanvasStore();

const selected = computed(() => editor.canvas.selection.active);
const loading = ref(false);
const language = ref('en');

const onGenerateCaptions = async () => {
    if (!selected.value) {
        toast.error("Please select a video or audio clip first");
        return;
    }

    loading.value = true;
    try {
        const res = await generateCaptions({
            mediaId: (selected.value as any).id,
            language: language.value
        });

        if (res && res.segments) {
            toast.success("Captions generated successfully!");
            
            // Find current scene offset for correct placement
            const currentScene = editor.canvas;
            
            res.segments.forEach((seg: any) => {
                currentScene.onAddSubtitle(seg.text, {
                    start: seg.start,
                    duration: seg.duration
                });
            });
            
            editor.onModified();
        }
    } catch (err) {
        console.error(err);
        toast.error("Failed to generate captions");
    } finally {
        loading.value = false;
    }
};
</script>

<template>
    <div class="flex flex-col gap-5">
        <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
             <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
             <div class="flex items-center gap-2 mb-3">
                 <MagicWand :size="14" class="text-brand-primary" />
                 <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Magic Captioning</span>
             </div>
             <p class="text-[10px] text-white/40 leading-relaxed italic">
                 AI will transcribe the audio from the selected clip and create synchronized subtitles on the timeline.
             </p>
        </div>

        <div class="flex flex-col gap-3 px-1">
            <label class="text-[9px] font-black text-white/30 uppercase tracking-widest pl-1">Target Language</label>
            <el-select v-model="language" class="cinematic-select !w-full" placeholder="Select Language">
                <el-option label="English (US)" value="en" />
                <el-option label="Vietnamese" value="vi" />
                <el-option label="Japanese" value="ja" />
            </el-select>
        </div>

        <el-button 
            type="primary" 
            class="cinematic-button is-primary !h-12 !rounded-2xl !border-none mt-2 shadow-lg shadow-brand-primary/10" 
            :loading="loading"
            @click="onGenerateCaptions"
        >
            <template #icon>
                <MagicWand />
            </template>
            <span class="text-xs font-black uppercase tracking-[0.1em]">Generate Captions</span>
        </el-button>

        <div class="flex items-center gap-2 px-1 opacity-40">
            <div class="flex-1 h-px bg-white/10"></div>
            <span class="text-[8px] font-bold uppercase tracking-widest">Powered by Gemini AI</span>
            <div class="flex-1 h-px bg-white/10"></div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
