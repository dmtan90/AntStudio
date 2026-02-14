<template>
    <div class="linguistic-settings flex flex-col gap-8 animate-in">
        <!-- Translation Engine -->
        <section>
            <div class="flex justify-between items-center mb-4">
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">GLOBAL_SYNC</h4>
                <el-switch v-model="localIsTranslating" @change="$emit('update:isTranslating', localIsTranslating)" />
            </div>

            <div class="grid grid-cols-1 gap-4">
                <div class="form-group p-4 rounded-2xl bg-white/5 border border-white/5">
                    <label class="text-[9px] opacity-40 uppercase font-black mb-3 block">Voice Input Language</label>
                    <el-select v-model="localSourceLang" size="small" class="w-full glass-input"
                        @change="$emit('update:sourceLang', localSourceLang)">
                        <el-option label="English (US)" value="en-US" />
                        <el-option label="Vietnamese" value="vi-VN" />
                        <el-option label="Japanese" value="ja-JP" />
                        <el-option label="Chinese (Simplified)" value="zh-CN" />
                    </el-select>
                </div>

                <div class="form-group p-4 rounded-2xl bg-white/5 border border-white/5">
                    <label class="text-[9px] opacity-40 uppercase font-black mb-3 block">Neural Subtitle Target</label>
                    <el-select v-model="localTargetLang" size="small" class="w-full glass-input"
                        @change="$emit('update:targetLang', localTargetLang)">
                        <el-option label="Vietnamese" value="vi-VN" />
                        <el-option label="English (US)" value="en-US" />
                        <el-option label="Japanese" value="ja-JP" />
                        <el-option label="Spanish" value="es-ES" />
                    </el-select>
                </div>
            </div>

            <div
                class="mt-6 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                <div class="flex justify-between items-center">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-purple-400 uppercase tracking-tighter">Neural
                            Dubbing</span>
                        <span class="text-[8px] opacity-40 font-bold uppercase tracking-widest">Voice Clone Relay</span>
                    </div>
                    <el-switch v-model="dubbingEnabled" active-color="#a855f7" />
                </div>
                <div v-if="dubbingEnabled && isDubbing" class="mt-4 flex gap-1 items-center animate-pulse">
                    <div v-for="i in 3" :key="i" class="w-1 h-2 bg-purple-500/40 rounded-full"></div>
                    <span class="text-[8px] text-purple-400 font-black italic ml-1 uppercase">Cloning in Progress</span>
                </div>
            </div>
        </section>

        <!-- Real-time Transcript -->
        <section v-if="isTranslating" class="animate-slide-down">
            <div class="flex items-center gap-2 mb-3">
                <div class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></div>
                <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">LIVE_TRANSCRIPT</h4>
            </div>
            <div
                class="transcript-preview bg-black/60 rounded-3xl p-6 border border-white/5 min-h-[120px] relative overflow-hidden">
                <div class="absolute top-0 right-0 p-4 opacity-10">
                    <translation theme="outline" size="40" />
                </div>
                <p class="text-xs italic opacity-80 leading-relaxed font-medium relative z-10">{{ currentTranscript ||
                    'Awaiting neural voice processing...' }}</p>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { Translation } from '@icon-park/vue-next';

const props = defineProps<{
    isTranslating: boolean;
    enableAsl: boolean;
    sourceLang: string;
    targetLang: string;
    currentTranscript: string;
    isDubbing?: boolean;
}>();

const emit = defineEmits(['update:isTranslating', 'update:enableAsl', 'update:sourceLang', 'update:targetLang']);

const localIsTranslating = ref(props.isTranslating);
const localSourceLang = ref(props.sourceLang);
const localTargetLang = ref(props.targetLang);
const dubbingEnabled = ref(false); // Local switch for the FEATURE, not the ACTIVITY state

watch(() => props.isTranslating, (val) => localIsTranslating.value = val);
watch(() => props.sourceLang, (val) => localSourceLang.value = val);
watch(() => props.targetLang, (val) => localTargetLang.value = val);
</script>
