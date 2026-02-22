<template>
    <div class="production-tab flex flex-col gap-6 h-full overflow-y-auto pr-2 custom-scrollbar">
        <!-- Layout Presets -->
        <div class="panel-section">
            <h3 class="section-title">Recording Layout</h3>
            <div class="grid grid-cols-2 gap-3 mt-4">
                <button v-for="l in layouts" :key="l.id" class="layout-btn" 
                    :class="{ active: layoutPreset === l.id }"
                    @click="emit('update:layout-preset', l.id as any)">
                    <div class="layout-preview mb-2" :class="l.id">
                        <div class="screen-area"></div>
                        <div class="cam-area" v-if="l.id !== 'screen-full'"></div>
                    </div>
                    <span>{{ l.label }}</span>
                </button>
            </div>
        </div>

        <!-- Teleprompter Controls -->
        <div class="panel-section" data-guide="teleprompter">
            <div class="flex items-center justify-between mb-4">
                <h3 class="section-title">Teleprompter</h3>
                <el-switch v-model="localIsTeleprompterActive" @change="v => emit('update:is-teleprompter-active', v as boolean)" />
            </div>

            <div v-if="localIsTeleprompterActive" class="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div class="bg-black/40 rounded-xl border border-white/10 p-4">
                    <textarea v-model="localScript" 
                        class="w-full h-32 bg-transparent border-none resize-none text-sm text-white/80 focus:ring-0 placeholder-white/20"
                        placeholder="Paste your script here..."
                        @input="emit('update:teleprompter-script', localScript)"></textarea>
                </div>

                <div class="flex items-center gap-4">
                    <button class="play-btn" @click="emit('update:is-teleprompter-scrolling', !isTeleprompterScrolling)">
                        <play-one v-if="!isTeleprompterScrolling" theme="filled" size="18" />
                        <pause-one v-else theme="filled" size="18" />
                        <span>{{ isTeleprompterScrolling ? 'Pause Scroll' : 'Start Scroll' }}</span>
                    </button>
                    <button class="reset-btn" @click="emit('update:teleprompter-scroll-pos', 0)">
                        <refresh theme="outline" size="16" />
                        <span>Reset</span>
                    </button>
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-wider">
                        <span>Scroll Speed</span>
                        <span class="text-blue-500">{{ teleprompterSpeed }}x</span>
                    </div>
                    <el-slider v-model="localSpeed" :min="0.5" :max="10" :step="0.5" 
                        @input="v => emit('update:teleprompter-speed', v as number)" />
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between text-xs font-bold text-white/40 uppercase tracking-wider">
                        <span>Font Size</span>
                        <span class="text-blue-500">{{ teleprompterFontSize }}px</span>
                    </div>
                    <el-slider v-model="localFontSize" :min="16" :max="48" :step="2" 
                        @input="v => emit('update:teleprompter-font-size', v as number)" />
                </div>
            </div>
        </div>

        <!-- Annotation Suite -->
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <h3 class="section-title">Annotations</h3>
                <el-switch v-model="localIsAnnotationActive" @change="v => emit('update:is-annotation-active', v as boolean)" />
            </div>

            <div v-if="localIsAnnotationActive" class="space-y-4 animate-in fade-in slide-in-from-top-2">
                <div class="grid grid-cols-2 gap-3">
                    <button class="tool-btn" :class="{ active: annotationTool === 'pen' }" @click="emit('update:annotation-tool', 'pen')">
                        <pencil theme="outline" size="18" />
                        <span>Pen</span>
                    </button>
                    <button class="tool-btn" :class="{ active: annotationTool === 'highlighter' }" @click="emit('update:annotation-tool', 'highlighter')">
                        <high-light theme="outline" size="18" />
                        <span>Highlight</span>
                    </button>
                </div>

                <div class="space-y-3">
                    <span class="text-[10px] font-bold text-white/20 uppercase tracking-widest">Colors</span>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="c in colors" :key="c" 
                            class="w-6 h-6 rounded-full border-2 transition-all"
                            :class="annotationColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'"
                            :style="{ backgroundColor: c }"
                            @click="emit('update:annotation-color', c)"></button>
                    </div>
                </div>

                <div class="space-y-3">
                    <div class="flex items-center justify-between text-xs font-bold text-white/40">
                        <span>Size</span>
                        <span class="text-blue-500">{{ annotationSize }}px</span>
                    </div>
                    <el-slider v-model="localSize" :min="2" :max="20" @input="v => emit('update:annotation-size', v as number)" />
                </div>

                <button class="clear-btn w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-all font-bold text-xs" @click="emit('clear-annotations')">
                    <delete theme="outline" size="14" />
                    <span>Clear All</span>
                </button>
            </div>
        </div>

        <!-- Recording Quality -->
        <div class="panel-section">
            <h3 class="section-title">Video Quality</h3>
            <div class="mt-4 space-y-4">
                <div class="space-y-2">
                    <label class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Resolution</label>
                    <el-select :model-value="recordingQuality.resolution" 
                        @update:model-value="v => emit('update:recording-quality', { ...recordingQuality, resolution: v })" 
                        class="glass-select w-full" size="small">
                        <el-option label="HD (720p)" value="720p" />
                        <el-option label="Full HD (1080p)" value="1080p" />
                        <el-option label="4K Ultra HD" value="4k" />
                    </el-select>
                </div>
                <div class="space-y-2">
                    <label class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Frame Rate</label>
                    <el-select :model-value="recordingQuality.fps" 
                        @update:model-value="v => emit('update:recording-quality', { ...recordingQuality, fps: v })" 
                        class="glass-select w-full" size="small">
                        <el-option label="30 FPS" :value="30" />
                        <el-option label="60 FPS" :value="60" />
                    </el-select>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { PlayOne, PauseOne, Refresh, Loading, Pencil, HighLight, Delete } from '@icon-park/vue-next'
import { ElSwitch, ElSlider, ElSelect, ElOption } from 'element-plus'

const props = defineProps<{
    layoutPreset: string
    isTeleprompterActive: boolean
    isTeleprompterScrolling: boolean
    teleprompterScript: string
    teleprompterSpeed: number
    teleprompterFontSize: number
    isAnnotationActive: boolean
    annotationTool: 'pen' | 'highlighter'
    annotationColor: string
    annotationSize: number
    recordingQuality: { resolution: string; fps: number }
}>()

const emit = defineEmits<{
    (e: 'update:layout-preset', val: string): void
    (e: 'update:is-teleprompter-active', val: boolean): void
    (e: 'update:is-teleprompter-scrolling', val: boolean): void
    (e: 'update:teleprompter-script', val: string): void
    (e: 'update:teleprompter-speed', val: number): void
    (e: 'update:teleprompter-font-size', val: number): void
    (e: 'update:teleprompter-scroll-pos', val: number): void
    (e: 'update:is-annotation-active', val: boolean): void
    (e: 'update:annotation-tool', val: 'pen' | 'highlighter'): void
    (e: 'update:annotation-color', val: string): void
    (e: 'update:annotation-size', val: number): void
    (e: 'clear-annotations'): void
    (e: 'update:recording-quality', val: any): void
}>()

const colors = ['#3b82f6', '#22c55e', '#ef4444', '#eab308', '#ec4899', '#ffffff']

const layouts = [
    { id: 'pip', label: 'Picture-in-Pic', icon: 'pip' },
    { id: 'split', label: 'Side-by-Side', icon: 'split' },
    { id: 'cam-full', label: 'Focus Cam', icon: 'cam' },
    { id: 'screen-full', label: 'Focus Screen', icon: 'screen' }
]

const localIsTeleprompterActive = ref(props.isTeleprompterActive)
const localScript = ref(props.teleprompterScript)
const localSpeed = ref(props.teleprompterSpeed)
const localFontSize = ref(props.teleprompterFontSize)
const localIsAnnotationActive = ref(props.isAnnotationActive)
const localSize = ref(props.annotationSize)

watch(() => props.isTeleprompterActive, (v) => localIsTeleprompterActive.value = v)
watch(() => props.teleprompterScript, (v) => localScript.value = v)
watch(() => props.teleprompterSpeed, (v) => localSpeed.value = v)
watch(() => props.teleprompterFontSize, (v) => localFontSize.value = v)
watch(() => props.isAnnotationActive, (v) => localIsAnnotationActive.value = v)
watch(() => props.annotationSize, (v) => localSize.value = v)

</script>

<style lang="scss" scoped>
.panel-section {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 16px;
}

.section-title {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: rgba(255, 255, 255, 0.4);
}

.layout-btn, .tool-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px;
    background: rgba(10, 10, 10, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 16px;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;

    span {
        font-size: 10px;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.4);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-top: 4px;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
    }

    &.active {
        background: rgba(59, 130, 246, 0.1);
        border-color: rgba(59, 130, 246, 0.4);
        span { color: #3b82f6; }
        svg, i { color: #3b82f6; }
    }
}

.layout-preview {
    width: 100%;
    aspect-ratio: 16/9;
    background: rgba(0,0,0,0.4);
    border-radius: 6px;
    position: relative;
    overflow: hidden;

    .screen-area {
        position: absolute; inset: 0; background: rgba(255, 255, 255, 0.05);
    }

    .cam-area {
        position: absolute; background: #3b82f6; border-radius: 2px;
    }

    &.pip .cam-area { width: 30%; height: 30%; bottom: 4px; right: 4px; border-radius: 50%; opacity: 0.8; }
    &.split .cam-area { width: 50%; height: 100%; left: 0; opacity: 0.8; }
    &.split .screen-area { width: 50%; right: 0; left: auto; }
    &.cam-full .cam-area { inset: 0; width: 100%; height: 100%; opacity: 0.8; }
    &.screen-full .screen-area { inset: 0; opacity: 0.3; background: #3b82f6; }
}

.play-btn, .reset-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    transition: all 0.2s;
    cursor: pointer;
}

.play-btn {
    background: linear-gradient(135deg, #3b82f6, #6366f1);
    color: #fff;
    border: none;
    box-shadow: 0 4px 15px rgba(59, 130, 246, 0.3);
    &:hover { filter: brightness(1.1); transform: translateY(-1px); box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4); }
    &:active { transform: translateY(0); }
}

.reset-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    &:hover { background: rgba(255, 255, 255, 0.1); }
}

.custom-scrollbar {
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
    &:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
}
</style>
