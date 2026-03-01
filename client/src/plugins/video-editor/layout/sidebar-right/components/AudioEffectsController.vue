<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useEditorStore } from 'video-editor/store/editor';
import { useCanvasStore } from 'video-editor/store/canvas';
import { ElSlider, ElSwitch } from 'element-plus';
import { GraphicDesign, MusicOne, Waves, Equalizer, Close, Loading } from '@icon-park/vue-next';
import SpectrumAnalyzer from './SpectrumAnalyzer.vue';
import { toast } from 'vue-sonner';
import { ref } from 'vue';
import { useAIStore } from '@/stores/ai';

const { t } = useI18n();
const editor = useEditorStore();
const canvasStore = useCanvasStore();
const aiStore = useAIStore();

const activeAudio = computed(() => {
    if ((canvasStore.selection as any)?.active?.type === 'audio') {
        return canvasStore.canvas?.audio.get((canvasStore.selection as any).active.id);
    }
    return null;
});

const effects = computed(() => activeAudio.value?.effects || {
    eq: { low: 0, mid: 0, high: 0 },
    compressor: { threshold: -24, ratio: 4, attack: 0.003, release: 0.25, enabled: false },
    reverb: { mix: 0, enabled: false },
    echo: { mix: 0, delayTime: 0.3, feedback: 0.4, enabled: false },
    enhancement: { studio: false, denoise: false, gateThreshold: -60 }
});

const sortedAutomation = computed(() => {
    if (!activeAudio.value?.automation) return [];
    return [...activeAudio.value.automation].sort((a, b) => a.time - b.time);
});

const updateEffect = (path: string, value: any) => {
    if (!activeAudio.value) return;
    const newEffects = JSON.parse(JSON.stringify(effects.value));

    // Simple path setter (e.g., 'eq.low')
    const parts = path.split('.');
    let current = newEffects;
    for (let i = 0; i < parts.length - 1; i++) {
        current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;

    canvasStore.canvas?.audio.update(activeAudio.value.id, { effects: newEffects });
};

const addKeyframe = () => {
    if (!activeAudio.value) return;

    const timelineSeek = canvasStore.canvas?.timeline.seek || 0;
    const clipOffset = activeAudio.value.offset * 1000;
    const relativeTime = Math.max(0, Math.min(activeAudio.value.timeline * 1000, timelineSeek - clipOffset));

    const automation = [...(activeAudio.value.automation || [])];
    const existingIdx = automation.findIndex(p => Math.abs(p.time - relativeTime) < 50);

    if (existingIdx !== -1) {
        automation[existingIdx].value = activeAudio.value.volume;
    } else {
        automation.push({
            id: `kf_${Date.now()}`,
            time: relativeTime,
            value: activeAudio.value.volume,
            easing: 'linear'
        });
    }

    canvasStore.canvas?.audio.update(activeAudio.value.id, { automation });
};

const removeKeyframe = (id: string) => {
    if (!activeAudio.value?.automation) return;
    const automation = activeAudio.value.automation.filter(p => p.id !== id);
    canvasStore.canvas?.audio.update(activeAudio.value.id, { automation });
};

const isEnhancing = ref(false);

const enhanceAudio = async () => {
    if (!activeAudio.value) return;

    isEnhancing.value = true;
    toast.info(t('videoEditor.audio.enhancingAi'), { id: 'enhance-audio' });

    try {
        // 1. Get audio buffer as Blob
        const buffer = activeAudio.value.buffer;
        const offlineCtx = new OfflineAudioContext(buffer.numberOfChannels, buffer.length, buffer.sampleRate);
        const source = offlineCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(offlineCtx.destination);
        source.start();

        const renderedBuffer = await offlineCtx.startRendering();

        // Convert AudioBuffer to WAV/MP3 Blob (using a helper or simplified approach)
        const audioBlob = new Blob([new Uint8Array(renderedBuffer.getChannelData(0).buffer)], { type: 'audio/mpeg' });

        const formData = new FormData();
        formData.append('file', audioBlob, 'audio.mp3');

        const response = await aiStore.enhanceAudio(formData);

        if (response.data.success) {
            toast.success(t('videoEditor.audio.enhancedSuccess'), { id: 'enhance-audio' });
            // Update the audio element with the new URL
            canvasStore.canvas?.audio.update(activeAudio.value.id, { url: response.data.data.url });
            // Force re-initialize to load the new buffer
            await canvasStore.canvas?.audio.initialize([{ ...activeAudio.value, url: response.data.data.url }]);
        }
    } catch (error: any) {
        console.error('Enhancement error:', error);
        toast.error(t('videoEditor.audio.enhancedFailed') + (error.message || 'Unknown error'), { id: 'enhance-audio' });
    } finally {
        isEnhancing.value = false;
    }
};
</script>

<template>
    <div v-if="activeAudio"
        class="flex flex-col gap-6 p-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl">
        <!-- Header -->
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <MusicOne theme="filled" size="16" />
            </div>
            <div class="flex flex-col">
                <span class="text-xs font-bold text-white uppercase tracking-wider">{{ t('videoEditor.audio.title') }}</span>
                <span class="text-[10px] text-white/40 uppercase font-bold">{{ activeAudio.name }}</span>
            </div>
        </div>

        <!-- Spectrum Analyzer -->
        <div class="h-24 bg-black/40 rounded-xl border border-white/5 overflow-hidden">
            <SpectrumAnalyzer :analyser="activeAudio.analyser" />
        </div>

        <!-- EQ Section -->
        <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-white/60">
                    <Equalizer size="14" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.equalizer') }}</span>
                </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
                <div class="flex flex-col items-center gap-2">
                    <el-slider v-model="effects.eq.low" vertical height="80px" :min="-40" :max="40"
                        @input="(val) => updateEffect('eq.low', val)" />
                    <span class="text-[9px] font-bold text-white/40 uppercase">{{ t('videoEditor.audio.low') }}</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <el-slider v-model="effects.eq.mid" vertical height="80px" :min="-40" :max="40"
                        @input="(val) => updateEffect('eq.mid', val)" />
                    <span class="text-[9px] font-bold text-white/40 uppercase">{{ t('videoEditor.audio.mid') }}</span>
                </div>
                <div class="flex flex-col items-center gap-2">
                    <el-slider v-model="effects.eq.high" vertical height="80px" :min="-40" :max="40"
                        @input="(val) => updateEffect('eq.high', val)" />
                    <span class="text-[9px] font-bold text-white/40 uppercase">{{ t('videoEditor.audio.high') }}</span>
                </div>
            </div>
        </div>

        <!-- Dynamics/Compressor Section -->
        <div class="flex flex-col gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-white/60">
                    <GraphicDesign size="14" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.dynamics') }}</span>
                </div>
                <el-switch v-model="effects.compressor.enabled" size="small"
                    @change="(val) => updateEffect('compressor.enabled', val)" />
            </div>

            <div v-if="effects.compressor.enabled" class="flex flex-col gap-3">
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between">
                        <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.threshold') }}</span>
                        <span class="text-[9px] text-orange-400 font-mono">{{ effects.compressor.threshold }}dB</span>
                    </div>
                    <el-slider v-model="effects.compressor.threshold" :min="-100" :max="0" :show-tooltip="false"
                        @input="(val) => updateEffect('compressor.threshold', val)" />
                </div>
                <div class="flex flex-col gap-1">
                    <div class="flex justify-between">
                        <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.ratio') }}</span>
                        <span class="text-[9px] text-orange-400 font-mono">{{ effects.compressor.ratio }}:1</span>
                    </div>
                    <el-slider v-model="effects.compressor.ratio" :min="1" :max="20" :show-tooltip="false"
                        @input="(val) => updateEffect('compressor.ratio', val)" />
                </div>
            </div>
        </div>

        <!-- Volume Automation Section -->
        <div class="flex flex-col gap-4 p-4 rounded-xl bg-white/5 border border-white/10 border-dashed">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-white/60">
                    <Waves size="14" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.automation') }}</span>
                </div>
                <button @click="addKeyframe"
                    class="p-1 px-2 rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[9px] font-black uppercase hover:bg-orange-500/40 transition-all flex items-center gap-1">
                    <Equalizer size="10" />
                    {{ t('videoEditor.audio.addKey') }}
                </button>
            </div>

            <div v-if="activeAudio.automation?.length"
                class="flex flex-col gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                <div v-for="pt in sortedAutomation" :key="pt.id"
                    class="flex items-center justify-between bg-black/20 p-2 rounded-lg border border-white/5 group">
                    <div class="flex flex-col gap-0.5">
                        <span class="text-[9px] font-mono text-white/60">{{ (pt.time / 1000).toFixed(2) }}s</span>
                        <span class="text-[10px] font-black text-orange-400">{{ (pt.value * 100).toFixed(0) }}%</span>
                    </div>
                    <div class="flex items-center gap-2">
                        <button @click="removeKeyframe(pt.id)"
                            class="opacity-0 group-hover:opacity-100 p-1 text-white/20 hover:text-red-400 transition-all">
                            <Close theme="outline" size="12" />
                        </button>
                    </div>
                </div>
            </div>
            <div v-else
                class="flex flex-col items-center justify-center py-4 bg-black/10 rounded-lg border border-white/5 border-dotted">
                <span class="text-[9px] text-white/20 font-bold uppercase tracking-widest">{{ t('videoEditor.audio.noKeyframes') }}</span>
            </div>
        </div>

        <!-- Voice Enhancement Section -->
        <div class="flex flex-col gap-4 p-4 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2 text-orange-400">
                    <Waves size="14" />
                    <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.voiceEnhancement') }}</span>
                </div>
            </div>

            <div class="flex flex-col gap-3">
                <!-- Studio Voice Toggle -->
                <div class="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                    <div class="flex flex-col">
                        <span class="text-[10px] font-black text-white uppercase">{{ t('videoEditor.audio.studioVoice') }}</span>
                        <span class="text-[8px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.clarityAutoLevel') }}</span>
                    </div>
                    <el-switch v-model="effects.enhancement.studio" size="small"
                        @change="(val) => updateEffect('enhancement.studio', val)" />
                </div>

                <!-- AI Denoise Button -->
                <button @click="enhanceAudio" :disabled="isEnhancing"
                    class="w-full py-2.5 rounded-xl bg-white/5 border border-white/10 text-[9px] font-black text-white/60 uppercase hover:bg-orange-500 hover:text-black hover:border-orange-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <component :is="isEnhancing ? Loading : GraphicDesign" size="12"
                        :class="{ 'animate-spin': isEnhancing }" />
                    {{ isEnhancing ? t('videoEditor.audio.processing') : t('videoEditor.audio.cleanAiDenoise') }}
                </button>

                <!-- Noise Gate Threshold -->
                <div v-if="effects.enhancement.denoise || effects.enhancement.studio" class="flex flex-col gap-1 mt-2">
                    <div class="flex justify-between">
                        <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.gateThreshold') }}</span>
                        <span class="text-[9px] text-orange-400 font-mono">{{ effects.enhancement.gateThreshold
                            }}dB</span>
                    </div>
                    <el-slider v-model="effects.enhancement.gateThreshold" :min="-100" :max="0" :show-tooltip="false"
                        @input="(val) => updateEffect('enhancement.gateThreshold', val)" />
                </div>
            </div>
        </div>

        <!-- Spatial Effects Section (Reverb & Echo) -->
        <div class="flex flex-col gap-6 p-4 rounded-xl bg-white/5 border border-white/10">
            <!-- Reverb Section -->
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-white/60">
                        <Waves size="14" />
                        <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.reverb') }}</span>
                    </div>
                    <el-switch v-model="effects.reverb.enabled" size="small"
                        @change="(val) => updateEffect('reverb.enabled', val)" />
                </div>
                <div v-if="effects.reverb.enabled" class="flex flex-col gap-2">
                    <div class="flex justify-between">
                        <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.mix') }}</span>
                        <span class="text-[9px] text-orange-400 font-mono">{{ (effects.reverb.mix * 100).toFixed(0)
                            }}%</span>
                    </div>
                    <el-slider v-model="effects.reverb.mix" :min="0" :max="1" :step="0.01" :show-tooltip="false"
                        @input="(val) => updateEffect('reverb.mix', val)" />
                </div>
            </div>

            <div class="h-px bg-white/5"></div>

            <!-- Echo/Delay Section -->
            <div class="flex flex-col gap-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2 text-white/60">
                        <Waves size="14" />
                        <span class="text-[10px] font-bold uppercase tracking-widest">{{ t('videoEditor.audio.echoDelay') }}</span>
                    </div>
                    <el-switch v-model="effects.echo.enabled" size="small"
                        @change="(val) => updateEffect('echo.enabled', val)" />
                </div>
                <div v-if="effects.echo.enabled" class="flex flex-col gap-4">
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between">
                            <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.delayTime') }}</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ effects.echo.delayTime }}s</span>
                        </div>
                        <el-slider v-model="effects.echo.delayTime" :min="0" :max="2" :step="0.01" :show-tooltip="false"
                            @input="(val) => updateEffect('echo.delayTime', val)" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between">
                            <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.feedback') }}</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ (effects.echo.feedback *
                                100).toFixed(0) }}%</span>
                        </div>
                        <el-slider v-model="effects.echo.feedback" :min="0" :max="0.9" :step="0.01"
                            :show-tooltip="false" @input="(val) => updateEffect('echo.feedback', val)" />
                    </div>
                    <div class="flex flex-col gap-1">
                        <div class="flex justify-between">
                            <span class="text-[9px] text-white/40 font-bold uppercase">{{ t('videoEditor.audio.mix') }}</span>
                            <span class="text-[9px] text-orange-400 font-mono">{{ (effects.echo.mix * 100).toFixed(0)
                                }}%</span>
                        </div>
                        <el-slider v-model="effects.echo.mix" :min="0" :max="1" :step="0.01" :show-tooltip="false"
                            @input="(val) => updateEffect('echo.mix', val)" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
:deep(.el-slider__runway) {
    background-color: rgba(255, 255, 255, 0.05);
}

:deep(.el-slider__bar) {
    background: linear-gradient(90deg, #f97316, #fb923c);
}

:deep(.el-slider__button) {
    border: 2px solid #f97316;
    background-color: #000;
    width: 12px;
    height: 12px;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
}
</style>
