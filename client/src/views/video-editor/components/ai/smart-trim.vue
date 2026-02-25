<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { detectSilence } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Magic } from '@icon-park/vue-next';
import { FabricUtils } from '../../fabric/utils';

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);
const loading = ref(false);

const noiseThreshold = ref(-30);
const minSilenceLen = ref(0.5);

const onSmartTrim = async () => {
    if (!selected.value || selected.value.type !== 'video') {
        toast.error("Please select a video clip first");
        return;
    }

    loading.value = true;
    try {
        const res = await detectSilence({
            mediaId: (selected.value as any).id,
            noiseThreshold: noiseThreshold.value,
            minSilenceLen: minSilenceLen.value
        });

        if (res && (res as any).regions) {
            const regions = (res as any).regions;
            if (regions.length === 0) {
                toast.info("No active segments detected.");
                return;
            }

            toast.success(`Identified ${regions.length} active segments!`);
            
            const originalClip = selected.value;
            const originalMeta = (originalClip as any).meta;
            const originalOffset = originalMeta.offset;
            const isVideo = FabricUtils.isVideoElement(originalClip);
            
            let cumulativeOffset = originalOffset;

            // Sort regions just in case
            regions.sort((a: any, b: any) => a.start - b.start);

            for (let i = 0; i < regions.length; i++) {
                const region = regions[i];
                const regionDurationMs = (region.end - region.start) * 1000;

                if (i === 0) {
                    // Update the first clip instead of deleting and recreating (smoother UX)
                    if (isVideo) {
                        const video = editor.canvas.instance.getItemByName(originalClip.name) as any;
                        video.set('trimStart', (video.trimStart || 0) + region.start);
                        video.meta.duration = regionDurationMs;
                        video.meta.offset = originalOffset; // Keep original start point
                        cumulativeOffset = originalOffset + regionDurationMs;
                    } else {
                        const audio = editor.canvas.audio.elements.find(e => e.id === (originalClip as any).id);
                        if (audio) {
                            audio.trim += region.start;
                            audio.timeline = regionDurationMs / 1000;
                            audio.offset = originalOffset / 1000;
                            cumulativeOffset = originalOffset + regionDurationMs;
                        }
                    }
                } else {
                    // Create subsequent clips
                    if (isVideo) {
                        const video = editor.canvas.instance.getItemByName(originalClip.name) as any;
                        const clone: any = await editor.canvas.cloner.clone(video as fabric.Object);
                        clone.set({
                            name: FabricUtils.elementID("video"),
                            trimStart: (video._originalTrimStart || video.trimStart || 0) + region.start 
                        });
                        clone.meta = { ...video.meta, offset: cumulativeOffset, duration: regionDurationMs };
                        editor.canvas.instance.add(clone);
                        cumulativeOffset += regionDurationMs;
                    } else {
                        const originalAudio = editor.canvas.audio.elements.find(e => e.id === (originalClip as any).id);
                        if (originalAudio) {
                            const newAudio = { 
                                ...JSON.parse(JSON.stringify(originalAudio)),
                                id: FabricUtils.elementID("audio"),
                                offset: cumulativeOffset / 1000,
                                timeline: regionDurationMs / 1000,
                                trim: (originalAudio.trim || 0) + region.start
                            };
                            editor.canvas.audio.elements.push(newAudio);
                            cumulativeOffset += regionDurationMs;
                        }
                    }
                }
            }
            
            editor.canvas.instance.requestRenderAll();
            editor.onModified();
            toast.success("Silence removed and timeline adjusted.");
        }
    } catch (err) {
        console.error(err);
        toast.error("Smart Trim failed");
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
                <Magic :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Smart Trim</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Automatically remove silent gaps from your video. AI identifies active audio regions.
            </p>
        </div>

        <div class="flex flex-col gap-4 px-1">
            <div class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest">Threshold (dB)</label>
                    <el-input-number v-model="noiseThreshold" :min="-60" :max="-10" :step="5" class="cinematic-number-input !w-full" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-[9px] font-black text-white/30 uppercase tracking-widest">Min Silence (s)</label>
                    <el-input-number v-model="minSilenceLen" :min="0.1" :max="2.0" :step="0.1" class="cinematic-number-input !w-full" />
                </div>
            </div>

            <el-button 
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full shadow-lg shadow-brand-primary/10 mt-2" 
                :loading="loading"
                @click="onSmartTrim"
            >
                <template #icon><Magic /></template>
                <span class="text-xs font-black uppercase tracking-[0.1em]">Analyze & Trim</span>
            </el-button>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
