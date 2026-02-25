<script setup lang="ts">
import { ref, computed } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { detectBeats } from 'video-editor/api/ai';
import { toast } from 'vue-sonner';
import { Magic, Music, Connection } from '@icon-park/vue-next';
import { FabricUtils } from 'video-editor/fabric/utils';

const editor = useEditorStore();
const selected = computed(() => editor.canvas.selection.active);
const loading = ref(false);

const beats = computed({
    get: () => editor.beats,
    set: (val) => editor.$patch({ beats: val })
});

const onExtractBeats = async () => {
    if (!selected.value || selected.value.type !== 'audio') {
        toast.error("Please select a music track first");
        return;
    }

    loading.value = true;
    try {
        const res = await detectBeats({
            mediaId: (selected.value as any).id
        });

        if (res && (res as any).beats) {
            beats.value = (res as any).beats;
            toast.success(`Extracted ${beats.value.length} beats! Ready to sync.`);
        }
    } catch (err) {
        console.error(err);
        toast.error("Beat extraction failed");
    } finally {
        loading.value = false;
    }
};

const onSyncSelectedClips = async () => {
    if (beats.value.length === 0) {
        toast.error("Please extract beats from a music track first");
        return;
    }

    // Get active selection or selected objects
    const canvas = editor.canvas.instance;
    const activeObject = canvas.getActiveObject();
    
    let targets: any[] = [];
    if (FabricUtils.isActiveSelection(activeObject)) {
        targets = activeObject.getObjects().filter(obj => FabricUtils.isVideoElement(obj));
    } else if (FabricUtils.isVideoElement(activeObject)) {
        targets = [activeObject];
    }

    if (targets.length === 0) {
        toast.error("Please select some video clips to sync");
        return;
    }

    // Sort targets by timeline offset
    targets.sort((a, b) => (a.meta?.offset || 0) - (b.meta?.offset || 0));

    loading.value = true;
    try {
        let currentOffset = targets[0].meta.offset;

        for (const target of targets) {
            target.meta.offset = currentOffset;
            
            // Find the beat that is closest to currentOffset + currentDuration
            // and align the clip's end to it
            const currentEnd = currentOffset + target.meta.duration;
            const currentEndSec = currentEnd / 1000;

            // Find nearest beat AFTER currentEndSec
            const nextBeat = beats.value.find(b => b > currentEndSec + 0.1);
            
            if (nextBeat) {
                const newDurationMs = (nextBeat * 1000) - currentOffset;
                target.meta.duration = newDurationMs;
                currentOffset += newDurationMs;
            } else {
                currentOffset += target.meta.duration;
            }
        }

        canvas.requestRenderAll();
        editor.onModified();
        toast.success(`Synced ${targets.length} clips to beats!`);
    } catch (err) {
        console.error(err);
        toast.error("Sync failed");
    } finally {
        loading.value = false;
    }
};

const clearBeats = () => {
    beats.value = [];
    toast.info("Beats cleared");
};
</script>

<template>
    <div class="flex flex-col gap-5">
        <div class="p-4 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 relative overflow-hidden group">
            <div class="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-transparent via-brand-primary/20 to-transparent"></div>
            <div class="flex items-center gap-2 mb-3">
                <Music :size="14" class="text-brand-primary" />
                <span class="text-[10px] font-bold text-white/50 uppercase tracking-[0.2em]">Beat Sync</span>
            </div>
            <p class="text-[10px] text-white/40 leading-relaxed italic">
                Sync your video cuts perfectly with the rhythm of the music. 
            </p>
        </div>

        <!-- Extract Beats Section -->
        <div v-if="selected?.type === 'audio'" class="flex flex-col gap-3 px-1">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black text-white/30 uppercase tracking-widest">Audio Analysis</span>
                <span v-if="beats.length > 0" class="text-[9px] text-brand-primary font-bold">{{ beats.length }} Beats Stored</span>
            </div>
            
            <el-button 
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full" 
                :loading="loading"
                @click="onExtractBeats"
            >
                <template #icon><Magic /></template>
                <span class="text-xs font-black uppercase tracking-[0.1em]">Extract Rhythms</span>
            </el-button>

            <button v-if="beats.length > 0" @click="clearBeats" class="text-[9px] text-white/20 hover:text-white/40 transition-colors uppercase font-bold tracking-tighter self-end">
                Reset Beats
            </button>
        </div>

        <!-- Sync Section -->
        <div v-else class="flex flex-col gap-3 px-1">
            <div class="flex items-center justify-between">
                <span class="text-[9px] font-black text-white/30 uppercase tracking-widest">Timeline Alignment</span>
                <span v-if="beats.length === 0" class="text-[9px] text-red-400/50 font-bold italic">No Beats Data</span>
            </div>

            <p v-if="beats.length === 0" class="text-[10px] text-white/20 px-2 py-3 border border-white/5 rounded-xl bg-white/[0.02]">
                Select an audio track first to extract beats, then select video clips to align them.
            </p>

            <el-button 
                v-else
                type="primary" 
                class="cinematic-button is-primary !h-12 !rounded-2xl !border-none w-full" 
                :loading="loading"
                :disabled="!selected"
                @click="onSyncSelectedClips"
            >
                <template #icon><Connection /></template>
                <span class="text-xs font-black uppercase tracking-[0.1em]">Snap to Beats</span>
            </el-button>

            <div v-if="beats.length > 0" class="flex items-center gap-2 p-2 bg-brand-primary/5 rounded-lg border border-brand-primary/10">
                <div class="w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse"></div>
                <span class="text-[9px] text-white/60">Selected clips will be resized to transition exactly on the next detected beat.</span>
            </div>
        </div>
    </div>
</template>

<style scoped lang="postcss">
:deep(.el-button.is-loading) {
    @apply opacity-80;
}
</style>
