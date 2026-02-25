<template>
    <div class="flex flex-col gap-6">
        <!-- 1. Visual & Camera Filters Group -->
        <div v-if="showVisualGroup" class="panel-section space-y-6">
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Visual Enhancement</span>
                </div>
                
                <div
                    class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white/90">Beauty Retouch</span>
                        <span class="text-[9px] text-white/40">Smooth & Brighten skin</span>
                    </div>
                    <el-switch :model-value="enableBeauty"
                        @update:model-value="v => $emit('toggle-ai-filter', 'beauty_smooth', !!v)" size="small" />
                </div>

                <div v-if="enableBeauty" class="space-y-4 pt-2 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div class="control-item">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Smoothing</span>
                            <span class="text-[9px] text-blue-400 font-mono">{{ (beautySettings.smoothing * 100).toFixed(0) }}%</span>
                        </div>
                        <el-slider v-model="beautySettings.smoothing" :min="0" :max="1" :step="0.01" :show-tooltip="false" size="small" />
                    </div>
                    <div class="control-item">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Brightness</span>
                            <span class="text-[9px] text-blue-400 font-mono">{{ (beautySettings.brightness * 100).toFixed(0) }}%</span>
                        </div>
                        <el-slider v-model="beautySettings.brightness" :min="0.5" :max="2" :step="0.01" :show-tooltip="false" size="small" />
                    </div>
                </div>

                <!-- Virtual Background -->
                <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md space-y-4">
                    <div class="flex items-center justify-between">
                        <span class="text-[9px] text-white/40 uppercase">Virtual Background</span>
                        <div class="flex gap-2">
                            <button v-for="t in ['none', 'blur', 'image', 'video']" :key="t"
                                class="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-[8px] font-bold uppercase transition-all"
                                :class="camSettings.backgroundType === t ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'text-white/40 hover:text-white/60'"
                                @click="$emit('update:camSettings', { ...camSettings, backgroundType: t })">
                                {{ t[0] }}
                            </button>
                        </div>
                    </div>
                    
                    <div v-if="camSettings.backgroundType === 'blur'" class="control-item animate-in fade-in slide-in-from-top-1 duration-200">
                        <div class="flex items-center justify-between mb-1">
                            <span class="text-[9px] text-white/60 uppercase">Blur Strength</span>
                            <span class="text-[9px] text-blue-400 font-mono">{{ camSettings.blurStrength }}px</span>
                        </div>
                        <el-slider :model-value="camSettings.blurStrength" @update:model-value="v => $emit('update:camSettings', { ...camSettings, blurStrength: v })"
                            :min="0" :max="30" :show-tooltip="false" size="small" />
                    </div>

                    <div v-if="camSettings.backgroundType === 'image' || camSettings.backgroundType === 'video'" class="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div class="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                            <div v-for="res in filteredResources" :key="res.id"
                                class="w-10 h-10 rounded-lg bg-black/40 border-2 cursor-pointer overflow-hidden transition-all"
                                :class="camSettings.backgroundResource === res.id ? 'border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'border-transparent hover:border-white/20'"
                                @click="$emit('update:camSettings', { ...camSettings, backgroundResource: res.id })">
                                <img v-if="res.type === 'image'" :src="res.url" class="w-full h-full object-cover" />
                                <div v-else class="w-full h-full flex items-center justify-center">
                                    <VideoOne theme="outline" size="14" class="text-white/20" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white/90">Enhanced Quality</span>
                        <span class="text-[9px] text-white/40">AI denoising & sharpening</span>
                    </div>
                    <el-switch :model-value="camSettings.enableEnhance" 
                        @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableEnhance: !!v })"
                        size="small" />
                </div>
            </div>
        </div>

        <!-- 2. AI Avatar & MoCap Group -->
        <div v-if="showAvatarGroup" class="panel-section space-y-6 pt-4 border-t border-white/5">
            <div class="flex items-center justify-between">
                <div class="flex flex-col gap-1">
                    <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest">AI Persona</span>
                    <span class="text-[9px] text-white/40 uppercase font-black tracking-[0.2em]">Avatar & Motion Capture</span>
                </div>
                <el-switch :model-value="isVTuberActive" 
                    @update:model-value="v => $emit('update:isVTuberActive', !!v)"
                    size="small" />
            </div>

            <div v-if="isVTuberActive" class="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <!-- VTuber selection grid -->
                <div class="grid grid-cols-4 gap-2">
                    <div v-for="av in vtuberStore.vtubers.slice(0, 8)" :key="av.entityId ?? av._id"
                        class="av-mini-card p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 group"
                        :class="selectedAvatar === (av.entityId ?? av._id) ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/5 hover:bg-white/[0.08]'"
                        @click="selectVTuber(av)">
                        <div class="w-8 h-8 rounded-full overflow-hidden border transition-all"
                            :class="selectedAvatar === (av.entityId ?? av._id) ? 'border-blue-500' : 'border-white/10 group-hover:border-white/20'">
                            <img :src="getVTuberThumbnail(av)" class="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>

                <!-- MoCap & FaceSwap -->
                <div v-if="hasWebcam" class="toggle-card flex flex-col gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-white/90">MoCap Drive</span>
                                <span class="bg-blue-500/20 text-blue-400 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Pro</span>
                            </div>
                            <span class="text-[9px] text-white/40">Avatar follows your expressions</span>
                        </div>
                        <el-switch :model-value="camSettings.enableFaceSwap" 
                            @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableFaceSwap: !!v })"
                            size="small" />
                    </div>
                    
                    <div v-if="camSettings.enableFaceSwap" class="pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                         <span class="text-[9px] text-white/40 uppercase block mb-2">Target Face Identity</span>
                         <div v-if="resourcePool.filter(r => r.type === 'image').length" 
                            class="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                            <div v-for="res in resourcePool.filter(r => r.type === 'image')" :key="res.id"
                                class="w-10 h-10 rounded-lg bg-black/40 border-2 cursor-pointer overflow-hidden transition-all"
                                :class="camSettings.faceSwapResource === res.id ? 'border-blue-500 shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'border-transparent hover:border-white/10'"
                                @click="$emit('update:camSettings', { ...camSettings, faceSwapResource: res.id })">
                                <img :src="res.url" class="w-full h-full object-cover" />
                            </div>
                        </div>
                        <button v-else @click="$emit('trigger-resource-upload')" 
                            class="w-full py-2 border border-dashed border-white/10 rounded-xl text-[8px] text-blue-400 font-bold hover:bg-blue-500/5 transition-all uppercase tracking-widest">
                            UPLOAD FACE FOR SWAP
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 3. Audio & Voice Synthesis Group -->
        <div class="panel-section space-y-6 pt-4 border-t border-white/5">
            <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Audio Intelligence</span>
            
            <div class="space-y-4">
                <!-- Voice Conversion -->
                <div class="toggle-card flex flex-col gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col gap-1">
                            <div class="flex items-center gap-2">
                                <span class="text-xs font-bold text-white/90">Voice Swap</span>
                                <span class="bg-indigo-500/20 text-indigo-400 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">New</span>
                            </div>
                            <span class="text-[9px] text-white/40">Change your voice to VTuber profile</span>
                        </div>
                        <el-switch :model-value="camSettings.enableVoiceSwap" @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableVoiceSwap: !!v })"
                            size="small" />
                    </div>

                    <div class="space-y-3 pt-3 border-t border-white/5">
                         <div class="flex items-center justify-between">
                             <span class="text-[9px] font-bold text-white/30 uppercase">Voice Persona</span>
                             <button @click="showVoiceLibrary = true" class="text-[8px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-widest">Library</button>
                         </div>
                         <el-select :model-value="selectedVoice" @update:model-value="v => $emit('update:selectedVoice', v)"
                            size="small" class="w-full custom-select mini-select">
                            <el-option label="Puck (Google)" value="puck" />
                            <el-option label="Charon (Google)" value="charon" />
                            <el-option label="Kore (Google)" value="kore" />
                        </el-select>
                    </div>
                </div>

                <!-- Live Assistant (Gemini) -->
                <div class="toggle-card flex flex-col gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-bold text-white">Live AI Assistant</span>
                            <span class="text-[9px] text-white/40">Real-time coaching & feedback</span>
                        </div>
                        <el-switch v-model="assistantEnabled" @change="toggleAssistant" size="small" />
                    </div>

                    <div v-if="assistantEnabled" class="assistant-card bg-purple-500/5 border border-purple-500/20 p-3 rounded-xl space-y-3 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div class="flex items-center gap-3 relative z-10">
                            <div class="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                                <Microphone v-if="!isConnected" theme="outline" size="16" class="text-purple-400" />
                                <div v-else class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="text-[10px] font-black text-white uppercase truncate">{{ archiveName || 'Gemini Director' }}</h4>
                                <p class="text-[8px] text-white/40 font-medium uppercase">{{ isAudioPlaying ? 'Speaking...' : 'Listening...' }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 4. Information & Utility Group -->
        <div class="panel-section space-y-6 pt-4 border-t border-white/5 pb-10">
            <span class="text-[10px] font-bold text-blue-400 uppercase tracking-widest block">Accessibility & Tools</span>
            <div class="space-y-4">
                <div class="toggle-card flex flex-col gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex items-center justify-between">
                        <div class="flex flex-col gap-1">
                            <span class="text-xs font-bold text-white/90">ASL Assist</span>
                            <span class="text-[9px] text-white/40">Hand signs recognition</span>
                        </div>
                        <el-switch :model-value="enableAslAssist"
                            @update:model-value="v => $emit('update:enableAslAssist', !!v)" size="small" />
                    </div>
 
                    <div v-if="enableAslAssist" class="pt-2 border-t border-white/5 flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div class="grid grid-cols-2 gap-2">
                            <button class="p-2 rounded-lg text-[9px] font-bold border transition-all"
                                :class="aslMode === 'asl-to-text' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'"
                                @click="$emit('update:aslMode', 'asl-to-text')">
                                Sign to Text
                            </button>
                            <button class="p-2 rounded-lg text-[9px] font-bold border transition-all"
                                :class="aslMode === 'text-to-asl' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'"
                                @click="$emit('update:aslMode', 'text-to-asl')">
                                Text to Sign
                            </button>
                        </div>
                    </div>
                </div>

                <div class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                    <div class="flex flex-col gap-1">
                        <span class="text-xs font-bold text-white">Live Captions</span>
                        <span class="text-[9px] text-white/40">Real-time STT & Translate</span>
                    </div>
                    <el-switch :model-value="activeCaptions" @update:model-value="v => $emit('toggle-captions', !!v)"
                        size="small" />
                </div>
                
                <div v-if="activeCaptions" class="pt-2 border-b border-white/5 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <span class="text-[9px] text-white/40 uppercase block mb-2 font-black">Target Language</span>
                    <el-select :model-value="targetLanguage"
                        @update:model-value="v => $emit('update:targetLanguage', v)" size="small" class="w-full custom-select mini-select">
                        <el-option label="Vietnamese" value="vi" />
                        <el-option label="English" value="en" />
                        <el-option label="Japanese" value="ja" />
                        <el-option label="Korean" value="ko" />
                    </el-select>
                </div>
            </div>
        </div>

        <!-- Transitions Layer -->
        <VoiceLibraryDialog 
            v-model="showVoiceLibrary" 
            provider="google"
            :voice-id="selectedVoice"
            :language="targetLanguage"
            @update:voice-id="$emit('update:selectedVoice', $event)"
            @select="handleVoiceSelect"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElSwitch, ElSlider, ElSelect, ElOption } from 'element-plus'
import { VideoOne, Microphone, Close, VolumeSmall, OffScreen } from '@icon-park/vue-next'
import { useVTuberStore } from '@/stores/vtuber'
import { useUserStore } from '@/stores/user'
import { useGeminiLive } from '@/composables/useGeminiLive'
import { getFileUrl } from '@/utils/api';
import VoiceLibraryDialog from '@/components/vtuber/VoiceLibraryDialog.vue';

const props = defineProps<{
    mode: string
    enableBeauty: boolean
    beautySettings: { smoothing: number; brightness: number }
    enableAslAssist: boolean
    aslMode: 'asl-to-text' | 'text-to-asl'
    activeCaptions: boolean
    targetLanguage: string
    camSettings: any
    resourcePool: any[]
    isVTuberActive: boolean
    selectedAvatar: string
    selectedVoice: string
    processingCanvas: HTMLCanvasElement | null
}>()

const emit = defineEmits<{
    (e: 'toggle-ai-filter', id: string, val: boolean): void
    (e: 'update:enableAslAssist', val: boolean): void
    (e: 'update:aslMode', mode: 'asl-to-text' | 'text-to-asl'): void
    (e: 'toggle-captions', val: boolean): void
    (e: 'update:targetLanguage', val: string): void
    (e: 'update:camSettings', val: any): void
    (e: 'trigger-resource-upload'): void
    (e: 'update:isVTuberActive', val: boolean): void
    (e: 'update:selectedAvatar', id: string): void
    (e: 'update:selectedVoice', id: string): void
    (e: 'select-vtuber-entity', vt: any): void
    (e: 'presentation-next'): void
    (e: 'presentation-prev'): void
    (e: 'presentation-go-to', page: number): void
}>()

const vtuberStore = useVTuberStore()
const userStore = useUserStore()
const {
    isConnected,
    isSpeaking,
    isAudioPlaying,
    isMuted,
    audioLevel,
    archiveName,
    connect,
    disconnect,
    startMicrophone,
    sendVideoFrame,
    setToolCallCallback
} = useGeminiLive()

const assistantEnabled = ref(false)
const showVoiceLibrary = ref(false)

const handleVoiceSelect = (voice: any) => {
    emit('update:selectedVoice', voice.id);
    showVoiceLibrary.value = false;
}

const toggleAssistant = async (val: any) => {
    if (val) {
        await startAssistant()
    } else {
        await disconnectAssistant()
    }
}

const startAssistant = async () => {
    try {
        const activeVTuber = vtuberStore.vtubers.find(v => (v.entityId ?? v._id) === props.selectedAvatar)
        await connect({
            archiveId: activeVTuber?.entityId || vtuberStore.vtubers[0]?.entityId,
            token: userStore.token || undefined
        })
        await startMicrophone()
    } catch (e) {
        assistantEnabled.value = false
    }
}

const disconnectAssistant = async () => {
    disconnect()
    assistantEnabled.value = false
}

const toggleMuteAssistant = () => {
    isMuted.value = !isMuted.value
}

// Vision Feedback Loop
let visionTimer: any = null

const startVisionLoop = () => {
    if (visionTimer) return
    visionTimer = setInterval(() => {
        if (isConnected.value && props.processingCanvas && assistantEnabled.value) {
            try {
                const canvas = props.processingCanvas
                const base64 = canvas.toDataURL('image/jpeg', 0.5).split(',')[1]
                sendVideoFrame(base64)
            } catch (e) {
                console.error('[Assistant] Vision capture failed:', e)
            }
        }
    }, 500)
}

const stopVisionLoop = () => {
    if (visionTimer) {
        clearInterval(visionTimer)
        visionTimer = null
    }
}

watch([isConnected, assistantEnabled], ([connected, enabled]) => {
    if (connected && enabled) startVisionLoop()
    else stopVisionLoop()
})

onUnmounted(() => stopVisionLoop())

const getVTuberThumbnail = (av: any) => {
    const url = av.visual?.thumbnailUrl || av.visual?.modelUrl || av.thumbnailUrl || '/avatars/default.jpg'
    return getFileUrl(url)
}

onMounted(() => {
    vtuberStore.fetchLibrary();
    setToolCallCallback((toolCall: any) => {
        if (toolCall.name === 'set_presentation_page') {
            const { action, page } = toolCall.args;
            if (action === 'next') emit('presentation-next');
            else if (action === 'prev') emit('presentation-prev');
            else if (action === 'go_to') emit('presentation-go-to', page);
        }
    });
})

const selectVTuber = (av: any) => {
    const id = av.entityId ?? av._id;
    emit('update:selectedAvatar', id);
    emit('select-vtuber-entity', av);
}

const filteredResources = computed(() => {
    if (props.camSettings.backgroundType === 'image') return props.resourcePool.filter(r => r.type === 'image')
    if (props.camSettings.backgroundType === 'video') return props.resourcePool.filter(r => r.type === 'video')
    return []
})

// UI Visibility Logic
const showVisualGroup = computed(() => {
    return ['camera', 'camera-screen', 'whiteboard', 'podcast'].includes(props.mode)
})

const showAvatarGroup = computed(() => {
    return ['camera', 'camera-screen', 'whiteboard', 'podcast'].includes(props.mode)
})

const hasWebcam = computed(() => {
    return ['camera', 'camera-screen', 'whiteboard', 'podcast'].includes(props.mode)
})
</script>

<style lang="scss" scoped>
.toggle-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    &:hover {
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
    }
}

.custom-select {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.03) !important;
        border-radius: 12px !important;
        box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.05) inset !important;
        padding: 4px 12px !important;
    }
}

.animate-in {
    animation-duration: 0.2s;
}
</style>
