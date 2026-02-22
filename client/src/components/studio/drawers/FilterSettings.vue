<template>
    <div class="filter-settings flex flex-col gap-8 animate-in">
        <!-- Filters Selection -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">LENS_PROFILES</h4>
            <div class="grid grid-cols-2 gap-3">
                <div v-for="f in filters" :key="f.id"
                    class="p-4 rounded-2xl bg-white/5 border border-white/5 cursor-pointer hover:border-blue-500/50 transition-all flex flex-col items-center gap-2 group"
                    :class="{ 'border-blue-500 bg-blue-500/10': activeFilter === f.id }"
                    @click="$emit('update:activeFilter', f.id)">
                    <div class="w-12 h-12 rounded-xl" :style="{ background: f.preview }"></div>
                    <span class="text-[10px] font-black uppercase tracking-wider opacity-60 group-hover:opacity-100">{{
                        f.name }}</span>
                </div>
            </div>
        </section>

        <!-- Virtual Backgrounds -->
        <section>
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest mb-4">ENVIRONMENT_SYNC</h4>
            <div class="flex flex-col gap-3">
                <div v-for="bg in backgrounds" :key="bg.url"
                    class="p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    :class="{ 'border-blue-400 bg-blue-400/5': selectedBackground === bg.url }"
                    @click="$emit('select-background', bg)">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center">
                            <el-image :src="getFileUrl(bg.url)" :size="20">
                                <template #error>
                                    <pic theme="outline" size="16" class="opacity-20" />
                                </template>
                            </el-image>
                        </div>
                        <span class="text-[10px] font-bold">{{ bg.name }}</span>
                    </div>
                    <div v-if="selectedBackground === bg.url" class="w-2 h-2 rounded-full bg-blue-400"></div>
                </div>

                <!-- Custom Upload -->
                <div class="p-4 rounded-3xl bg-white/5 border border-white/5 border-dashed flex items-center justify-between group hover:border-blue-500/30 cursor-pointer"
                    @click="($refs.bgUpload as HTMLInputElement).click()">
                    <div class="flex items-center gap-3">
                        <div
                            class="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <upload theme="outline" size="16" class="text-blue-400" />
                        </div>
                        <span class="text-[10px] font-black uppercase tracking-widest opacity-60">Upload
                            Environment</span>
                    </div>
                    <input type="file" ref="bgUpload" class="hidden" accept="image/*,video/*"
                        @change="handleBgUpload" />
                </div>
            </div>
        </section>

        <!-- Chromakey Controls -->
        <section class="p-6 rounded-[32px] bg-blue-500/5 border border-blue-500/10">
            <div class="flex justify-between items-center mb-6">
                <h4 class="text-[10px] font-black text-blue-400 uppercase tracking-widest opacity-60">CHROMA_KEY_ENGINE
                </h4>
                <el-switch v-model="localEnableChromakey"
                    @change="$emit('update:enableChromakey', localEnableChromakey)" />
            </div>
            <div v-if="localEnableChromakey" class="space-y-6 animate-in fade-in slide-in-from-top-2">
                <div class="form-group">
                    <label
                        class="text-[9px] opacity-40 uppercase font-black mb-1 block tracking-tighter">Similarity</label>
                    <el-slider v-model="localChromaSettings.similarity" :min="0" :max="1" :step="0.01" />
                </div>
                <div class="form-group">
                    <label
                        class="text-[9px] opacity-40 uppercase font-black mb-1 block tracking-tighter">Smoothness</label>
                    <el-slider v-model="localChromaSettings.smoothness" :min="0" :max="1" :step="0.01" />
                </div>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Pic, Upload } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';

const props = defineProps<{
    activeFilter: string;
    filters: any[];
    selectedBackground: string;
    backgrounds: any[];
    enableChromakey: boolean;
    chromaSettings: { similarity: number, smoothness: number };
}>();

const emit = defineEmits([
    'update:activeFilter',
    'update:enableChromakey',
    'select-background'
]);

const localEnableChromakey = ref(props.enableChromakey);
const localChromaSettings = ref({ ...props.chromaSettings });
const bgUpload = ref<HTMLInputElement | null>(null);

watch(() => props.enableChromakey, (val) => localEnableChromakey.value = val);
watch(() => props.chromaSettings, (val) => localChromaSettings.value = { ...val }, { deep: true });

const handleBgUpload = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const isVideo = file.type.startsWith('video/');

    emit('select-background', {
        id: `custom_${Date.now()}`,
        name: file.name,
        url,
        isVideo,
        thumbnail: url // Use object URL as thumbnail too
    });
};
</script>
