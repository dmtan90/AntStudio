<script setup lang="ts">
import { ref } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { generateImage, generateHeadline, generateDescription, generateCTA } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Magic, AllApplication, Loading } from '@icon-park/vue-next';
import { FabricUtils } from 'video-editor/fabric/utils';
import { getFileUrl } from '@/utils/api';

const editor = useEditorStore();
const loading = ref(false);
const globalPrompt = ref("");
const progress = ref(0);
const total = ref(0);

const onBulkReplace = async () => {
    if (!globalPrompt.value) {
        toast.error("Please enter a creative direction first");
        return;
    }

    loading.value = true;
    progress.value = 0;
    
    try {
        const pages = editor.pages;
        const placeholders: any[] = [];

        // Collect all placeholder objects from all pages
        pages.forEach(page => {
            const objects = page.instance.getObjects();
            objects.forEach(obj => {
                if (obj.meta?.label && ["main-image", "brand-image", "headline-text", "description-text", "cta-text"].includes(obj.meta.label)) {
                    placeholders.push({ page, object: obj });
                }
            });
        });

        total.value = placeholders.length;
        if (total.value === 0) {
            toast.info("No placeholders found in this project.");
            loading.value = false;
            return;
        }

        // Parallel processing or sequential? 
        // Sequential is safer for rate limits and feedback
        for (const item of placeholders) {
            const label = item.object.meta.label;
            
            try {
                if (label.includes("image")) {
                    const res = await generateImage({ prompt: globalPrompt.value }) as any;
                    const url = res?.url || res?.data?.url;
                    if (url) {
                        const resolvedUrl = await getFileUrl(url);
                        (item.object as any).setSrc(resolvedUrl, () => {
                            item.page.instance.requestRenderAll();
                        });
                    }
                } else if (label.includes("text")) {
                    let newText = "";
                    if (label === "headline-text") {
                        const res = await generateHeadline({ description: globalPrompt.value } as any, "General" as any) as any;
                        const data = res?.data || res;
                        newText = Array.isArray(data) ? data[0] : (typeof data === 'string' ? data : "");
                    } else if (label === "description-text") {
                        const res = await generateDescription({ description: globalPrompt.value } as any, "General" as any) as any;
                        const data = res?.data || res;
                        newText = Array.isArray(data) ? data[0] : (typeof data === 'string' ? data : "");
                    } else if (label === "cta-text") {
                        const res = await generateCTA({ description: globalPrompt.value } as any, "General" as any) as any;
                        const data = res?.data || res;
                        newText = Array.isArray(data) ? data[0] : (typeof data === 'string' ? data : "");
                    }
                    
                    if (newText) {
                        item.object.set({ text: newText });
                        item.page.instance.requestRenderAll();
                    }
                }
            } catch (e) {
                console.warn(`Failed to process placeholder ${label}:`, e);
            }

            progress.value++;
        }

        toast.success(`Batch magic complete! Processed ${total.value} elements.`);
        editor.onModified();
    } catch (err) {
        console.error(err);
        toast.error("Bulk magic failed");
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
                <AllApplication :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Bulk Magic</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Populate your entire template with AI content in one click. Define your creative direction.
            </p>
        </div>

        <div class="flex flex-col gap-4 px-1">
            <div class="flex flex-col gap-2">
                <label class="text-[9px] font-black text-white/30 uppercase tracking-widest px-1">Unified Prompt</label>
                <el-input
                    v-model="globalPrompt"
                    type="textarea"
                    placeholder="E.g. Vintage Italian leather shoes, cinematic lighting, luxury store background..."
                    :rows="4"
                    class="cinematic-textarea"
                />
            </div>

            <div v-if="loading" class="flex flex-col gap-2 p-3 bg-white/5 rounded-xl border border-white/5">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-[9px] text-white/40 font-bold uppercase tracking-widest">Processing Artifacts...</span>
                    <span class="text-[9px] text-brand-primary font-black">{{ progress }}/{{ total }}</span>
                </div>
                <div class="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div class="h-full bg-brand-primary transition-all duration-300" :style="{ width: (progress / total * 100) + '%' }"></div>
                </div>
            </div>

            <el-button 
                v-else
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/10 mt-2" 
                @click="onBulkReplace"
            >
                <template #icon><Magic /></template>
                <span class="text-xs font-black uppercase tracking-[0.1em]">Apply to All Placeholders</span>
            </el-button>

            <div class="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                <span class="text-[9px] text-white/30 leading-tight">
                    This will find all 'main-image', 'headline', and 'CTA' layers across ALL scenes and replace them with unique AI generated content matching your prompt.
                </span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.cinematic-textarea .el-textarea__inner) {
    @apply bg-white/5 border-white/10 text-white text-xs rounded-xl focus:border-brand-primary/30 py-3;
}
</style>
