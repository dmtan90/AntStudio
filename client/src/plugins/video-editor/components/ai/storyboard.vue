<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { generateStoryboard, generateImage, generateVoice } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { MovieBoard, Magic, Loading, CheckOne, Timer, EditTwo } from '@icon-park/vue-next';
import { nanoid } from 'nanoid';
import { getFileUrl } from '@/utils/api';

const editor = useEditorStore();
const loading = ref(false);
const scriptPrompt = ref("");
const status = ref<'idle' | 'scripting' | 'assembling' | 'complete'>('idle');
const progress = ref(0);

const onGenerateStoryboard = async () => {
    if (!scriptPrompt.value) {
        toast.error("Please enter a script or video idea first");
        return;
    }

    loading.value = true;
    status.value = 'scripting';
    progress.value = 10;
    
    try {
        // Step 1: Generate full storyboard structure
        const res = await generateStoryboard({ 
            prompt: scriptPrompt.value,
            format: editor.targetRatio || '16:9',
            duration: 15 // Default 15s for AI shorts
        }) as any;

        const storyboard = res.storyboard || res;
        
        if (!storyboard || !storyboard.segments) {
            throw new Error("Invalid storyboard generated: segments missing");
        }

        progress.value = 30;
        status.value = 'assembling';

        const scenes: any[] = [];
        const totalSegments = storyboard.segments.length;

        // Step 2: Generate assets for each segment
        for (let i = 0; i < totalSegments; i++) {
            const segment = storyboard.segments[i];
            const sceneOrder = i + 1;
            
            status.value = 'assembling'; // Keep 'assembling' status but update feedback
            const segmentProgressStart = 30 + (i / totalSegments) * 60;
            progress.value = segmentProgressStart;

            console.log(`[CreativeDirector] Generating assets for scene ${sceneOrder}/${totalSegments}`);

            // 2.1 Generate Image
            const imgRes = await generateImage({ 
                prompt: segment.description, 
                aspectRatio: editor.targetRatio as any || '16:9' 
            }) as any;
            const videoUrl = await getFileUrl(imgRes.url || imgRes.media?.url || imgRes);

            // 2.2 Generate Speech if voiceover exists
            let speech = null;
            if (segment.voiceover) {
                const voiceRes = await generateVoice({
                    text: segment.voiceover,
                    voice: 'en-US-Standard-A' // Could be dynamic based on character later
                }) as any;
                const audioUrl = await getFileUrl(voiceRes.url || voiceRes.media?.url || voiceRes);
                speech = {
                    url: audioUrl,
                    voice: 'en-US-Standard-A',
                    gender: 'neutral',
                    subtitle: segment.voiceover
                };
            }

            scenes.push({
                duration: segment.duration || 3,
                video: {
                    name: segment.title || `Scene ${sceneOrder}`,
                    url: videoUrl,
                    meta: { tags: segment.visualKeywords || [], audios: [] }
                },
                speech: speech
            });
            
            progress.value = segmentProgressStart + (1 / totalSegments) * 60;
        }

        // Create the PromptSession object expected by the plugin
        const session = {
            id: nanoid(),
            prompt: scriptPrompt.value,
            format: editor.targetRatio || '16:9',
            duration: storyboard.totalDuration || 15,
            tags: [],
            scene: scenes
        };

        // Step 3: Use the existing Prompt plugin logic to build the scenes
        await editor.instance.prompter.createSceneFromPromptSession(session);

        progress.value = 100;
        status.value = 'complete';
        toast.success("AI Video Project Assembled!");
        
        editor.onModified();
    } catch (err: any) {
        console.error(err);
        toast.error("Creative Director failed to build project");
        status.value = 'idle';
    } finally {
        loading.value = false;
        // Reset status after a delay if complete
        if (status.value === 'complete') {
            setTimeout(() => { status.value = 'idle'; progress.value = 0; }, 3000);
        }
    }
};
</script>

<template>
    <div class="flex flex-col gap-6">
        <!-- Header Card -->
        <div class="p-5 rounded-2xl bg-gradient-to-br from-brand-primary/10 to-transparent border border-brand-primary/20 relative overflow-hidden group">
            <div class="absolute -right-4 -top-4 w-24 h-24 bg-brand-primary/10 rounded-full blur-3xl group-hover:bg-brand-primary/20 transition-colors duration-500"></div>
            <div class="flex items-center gap-3 mb-3">
                <MovieBoard :size="18" class="text-brand-primary" />
                <span class="text-xs font-black text-white uppercase tracking-[0.2em]">Creative Director</span>
            </div>
            <p class="text-[11px] text-white/50 leading-relaxed italic pr-4">
                Describe your video idea or paste a script. AI will storyboard, generate assets, and assemble the entire timeline for you.
            </p>
        </div>

        <!-- Input Area -->
        <div class="flex flex-col gap-4 px-1">
            <div class="flex flex-col gap-2">
                <div class="flex items-center justify-between px-1">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest flex items-center gap-1.5">
                        <EditTwo :size="10" /> Script / Idea
                    </label>
                </div>
                <el-input
                    v-model="scriptPrompt"
                    type="textarea"
                    placeholder="E.g. A 15-second cinematic ad for a mountain bike, focusing on suspension and speed. Include dramatic voiceover about freedom."
                    :rows="6"
                    class="cinematic-textarea"
                />
            </div>

            <!-- Progress Indicator -->
            <div v-if="loading || status === 'complete'" class="mt-2 p-4 rounded-xl bg-white/[0.03] border border-white/5 backdrop-blur-md">
                <div class="flex justify-between items-center mb-3">
                    <div class="flex items-center gap-2">
                        <Loading v-if="loading" class="animate-spin text-brand-primary" :size="14" />
                        <CheckOne v-else class="text-emerald-400" :size="14" />
                        <span class="text-[10px] font-bold text-white/80 uppercase tracking-widest">
                            {{ status === 'scripting' ? 'AI Scripting Scenes...' : status === 'assembling' ? 'Assembling Timeline...' : 'Magic Complete!' }}
                        </span>
                    </div>
                    <span class="text-[10px] font-black text-brand-primary">{{ Math.round(progress) }}%</span>
                </div>
                <div class="h-1.5 bg-white/5 rounded-full overflow-hidden shadow-inner">
                    <div class="h-full bg-brand-primary transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" :style="{ width: progress + '%' }"></div>
                </div>
                <div class="mt-3 flex items-center justify-between">
                    <span class="text-[9px] text-white/20 italic">Generating images and narration...</span>
                    <div class="flex gap-1">
                        <div class="w-1 h-1 rounded-full bg-brand-primary animate-pulse"></div>
                        <div class="w-1 h-1 rounded-full bg-brand-primary animate-pulse [animation-delay:0.2s]"></div>
                        <div class="w-1 h-1 rounded-full bg-brand-primary animate-pulse [animation-delay:0.4s]"></div>
                    </div>
                </div>
            </div>

            <el-button 
                v-else
                type="primary" 
                class="cinematic-button is-primary !h-14 !rounded-2xl !border-none w-full shadow-xl shadow-brand-primary/20 group overflow-hidden mt-2" 
                @click="onGenerateStoryboard"
            >
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <template #icon><Magic :size="16" /></template>
                <span class="text-xs font-black uppercase tracking-[0.2em]">Generate Full Video</span>
            </el-button>

            <!-- Tip -->
            <div class="mt-4 flex gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 group hover:border-brand-primary/20 transition-colors">
                <Timer :size="16" class="text-white/20 group-hover:text-brand-primary/40 transition-colors" />
                <span class="text-[9px] text-white/30 leading-tight">
                    Estimated processing time: 45s. This will clear the current canvas and build a new multi-scene project.
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-textarea .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-4 shadow-inner transition-all duration-300;
}
:deep(.cinematic-textarea .el-textarea__inner:focus) {
    @apply bg-white/[0.07] shadow-lg shadow-brand-primary/5;
}
</style>
