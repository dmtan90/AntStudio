<template>
    <div class="flex flex-col gap-8">
        <div class="panel-section space-y-6">
            <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold text-blue-400 uppercase">Whiteboard Content</span>
                <button v-if="!isLaunchpadActive" @click="$emit('reset-whiteboard')" class="text-[9px] font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1.5 uppercase">
                    <refresh size="12" /> Reset
                </button>
            </div>

            <!-- Content Status -->
            <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                <div v-if="isLaunchpadActive" class="text-center py-4">
                     <p class="text-[9px] text-white/20 uppercase tracking-widest font-black mb-2">Awaiting Content</p>
                     <p class="text-[10px] text-white/40 italic leading-relaxed">Select a source from the dashboard to start collaborating.</p>
                </div>
                <div v-else class="space-y-4">
                     <div class="flex items-center gap-3">
                         <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                             <monitor v-if="contentType === 'stream'" theme="outline" size="20" class="text-blue-400" />
                             <file-pdf v-else-if="contentType === 'pdf'" theme="outline" size="20" class="text-blue-400" />
                             <file-ppt v-else theme="outline" size="20" class="text-blue-400" />
                         </div>
                         <div class="flex flex-col">
                             <span class="text-xs font-black text-white uppercase tracking-tighter">Active Session</span>
                             <span class="text-[9px] text-white/30 uppercase tracking-[0.2em] font-mono">{{ contentType === 'stream' ? 'Screen Share' : 'Document' }}</span>
                         </div>
                     </div>

                     <!-- Page Navigation (if applicable) -->
                     <div v-if="totalPages > 0" class="pt-4 border-t border-white/5 space-y-3">
                         <div class="flex items-center justify-between">
                             <span class="text-[9px] text-white/40 uppercase">Page / Slide</span>
                             <span class="text-[9px] text-white font-mono">{{ currentPage + 1 }} / {{ totalPages }}</span>
                         </div>
                         <div class="flex gap-2">
                             <button @click="$emit('prev-page')" :disabled="currentPage === 0" 
                                class="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all">
                                <left size="14" class="mx-auto" />
                             </button>
                             <button @click="$emit('next-page')" :disabled="currentPage === totalPages - 1"
                                class="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:pointer-events-none transition-all">
                                <right size="14" class="mx-auto" />
                             </button>
                         </div>
                     </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="space-y-4">
                <span class="text-[10px] font-bold text-blue-400 uppercase block">Quick Actions</span>
                <div class="grid grid-cols-2 gap-3">
                    <button @click="$emit('trigger-import', 'pdf')" class="action-card group">
                        <file-pdf theme="outline" size="14" />
                        <span>PDF</span>
                    </button>
                    <button @click="$emit('trigger-import', 'ppt')" class="action-card group">
                        <file-ppt theme="outline" size="14" />
                        <span>PPT</span>
                    </button>
                    <button @click="$emit('trigger-import', 'video')" class="action-card group">
                        <file-video theme="outline" size="14" />
                        <span>Video</span>
                    </button>
                    <button @click="$emit('trigger-share')" class="action-card group">
                        <monitor theme="outline" size="14" />
                        <span>Share</span>
                    </button>
                </div>
            </div>

            <!-- AI Vision Presentation -->
            <div v-if="contentType === 'pdf' || contentType === 'ppt'" class="space-y-4 pt-6 border-t border-white/5">
                <span class="text-[10px] font-bold text-blue-400 uppercase block">AI Vision Presentation</span>
                
                <div class="bg-gradient-to-br from-blue-500/10 to-transparent p-4 rounded-2xl border border-blue-500/20 space-y-4">
                    <div class="flex items-center gap-3">
                         <div class="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shadow-[0_8px_20px_rgba(59,130,246,0.3)]">
                             <robot v-if="!isSynthesizing" theme="outline" size="20" class="text-white" />
                             <loading v-else theme="outline" size="20" class="text-white animate-spin" />
                         </div>
                         <div class="flex flex-col">
                             <span class="text-[11px] font-black text-white uppercase">{{ isAIPresenting ? 'Autopilot Active' : 'AI Autopilot' }}</span>
                             <span class="text-[8px] text-white/40 uppercase font-bold tracking-widest">{{ isSynthesizing ? 'AI is thinking...' : whiteboardScripts.length > 0 ? 'Scripts Ready' : 'Needs Analysis' }}</span>
                         </div>
                    </div>

                    <div class="flex gap-2">
                        <button v-if="whiteboardScripts.length === 0" @click="$emit('generate-scripts')"
                            class="flex-1 py-2 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-white hover:bg-blue-600 hover:border-blue-500 transition-all uppercase">
                            Analyze Slides
                        </button>
                        <template v-else>
                            <button v-if="!isAIPresenting" @click="$emit('start-ai-presentation')"
                                class="flex-1 py-2 rounded-lg bg-blue-600 border border-blue-500 text-[10px] font-bold text-white shadow-[0_8px_25px_rgba(59,130,246,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all uppercase">
                                Start Autopilot
                            </button>
                            <button v-else @click="$emit('stop-ai-presentation')"
                                class="flex-1 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-[10px] font-bold text-red-500 hover:bg-red-500/30 transition-all uppercase">
                                Stop Autopilot
                            </button>
                        </template>
                    </div>

                    <div v-if="whiteboardScripts.length > 0" class="p-2 bg-black/40 rounded-xl border border-white/5">
                        <p class="text-[9px] text-white/60 leading-relaxed line-clamp-2 italic">
                            "{{ whiteboardScripts[currentPage] || 'Script loading...' }}"
                        </p>
                    </div>
                </div>

                <!-- VTuber Presenter Selection (Integrated) -->
                <div class="space-y-4 pt-4 border-t border-white/5">
                    <span class="text-[10px] font-bold text-blue-400 uppercase block">AI Presenter</span>

                    <!-- Loading state -->
                    <div v-if="vtuberStore.isLoading" class="flex items-center justify-center py-4 gap-3">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                    </div>

                    <!-- VTuber selection -->
                    <div v-else class="grid grid-cols-4 gap-2">
                        <div v-for="vt in vtuberStore.vtubers.slice(0, 4)" :key="vt.entityId ?? vt._id"
                            class="av-mini-card p-1 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-1 group"
                            :class="selectedAvatar === (vt.entityId ?? vt._id) ? 'bg-blue-500/10 border-blue-500/40' : 'bg-white/5 border-white/5'"
                            @click="selectVTuber(vt)">
                            <div class="w-8 h-8 rounded-full overflow-hidden border transition-all"
                                :class="selectedAvatar === (vt.entityId ?? vt._id) ? 'border-blue-500' : 'border-white/10'">
                                <img :src="getVTuberThumbnail(vt)" class="w-full h-full object-cover" />
                            </div>
                        </div>
                    </div>

                    <!-- Voice selection -->
                    <div class="space-y-3">
                         <div class="flex items-center justify-between">
                             <span class="text-[9px] font-bold text-white/30 uppercase">Voice Persona</span>
                             <button @click="showVoiceLibrary = true" class="text-[8px] text-blue-400 font-bold hover:text-blue-300 transition-colors uppercase tracking-widest">Browse Library</button>
                         </div>
                         <el-select :model-value="selectedVoice" @update:model-value="v => $emit('update:selectedVoice', v)"
                            size="small" class="w-full custom-select mini-select">
                            <el-option label="Puck (Google)" value="puck" />
                            <el-option label="Charon (Google)" value="charon" />
                            <el-option label="Kore (Google)" value="kore" />
                        </el-select>
                    </div>
                </div>
            </div>

            <!-- Cam in Whiteboard Toggle -->
            <div class="space-y-4 pt-6 border-t border-white/5">
                <div class="toggle-card flex items-center justify-between bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                     <div class="flex flex-col gap-1">
                         <span class="text-xs font-bold text-white/90">Camera Feed</span>
                         <span class="text-[9px] text-white/40">Show yourself on top</span>
                     </div>
                     <el-switch :model-value="camSettings.enableCamInWhiteboard !== false"
                         @update:model-value="v => $emit('update:camSettings', { ...camSettings, enableCamInWhiteboard: !!v })"
                         size="small" />
                </div>
            </div>
        </div>

        <!-- Voice Library Dialog -->
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
import { Refresh, Monitor, FilePdf, FilePpt, VideoOne, Left, Right, Robot, Loading, FileAddition } from '@icon-park/vue-next'
import { ElSwitch, ElSelect, ElOption } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useVTuberStore } from '@/stores/vtuber'
import { getFileUrl } from '@/utils/api'
import VoiceLibraryDialog from '@/components/vtuber/VoiceLibraryDialog.vue'

const props = defineProps<{
    isLaunchpadActive: boolean
    contentType: 'stream' | 'pdf' | 'ppt' | 'video' | null
    currentPage: number
    totalPages: number
    camSettings: any
    whiteboardScripts: string[]
    isAIPresenting: boolean
    isSynthesizing: boolean
    selectedAvatar: string
    selectedVoice: string
    targetLanguage: string
}>()

const emit = defineEmits<{
    (e: 'reset-whiteboard'): void
    (e: 'prev-page'): void
    (e: 'next-page'): void
    (e: 'trigger-import', type: string): void
    (e: 'trigger-share'): void
    (e: 'update:camSettings', val: any): void
    (e: 'generate-scripts'): void
    (e: 'start-ai-presentation'): void
    (e: 'stop-ai-presentation'): void
    (e: 'update:selectedAvatar', id: string): void
    (e: 'update:selectedVoice', id: string): void
    (e: 'select-vtuber-entity', vt: any): void
}>()

const vtuberStore = useVTuberStore()
const showVoiceLibrary = ref(false)

const handleVoiceSelect = (voice: any) => {
    emit('update:selectedVoice', voice.id)
    showVoiceLibrary.value = false
}

onMounted(async () => {
    if (vtuberStore.vtubers.length === 0) {
        await vtuberStore.fetchLibrary(1, 20)
    }
})

const getVTuberThumbnail = (vt: any) => {
    const url = vt.visual?.thumbnailUrl || vt.visual?.modelUrl || vt.thumbnailUrl || '/avatars/default.jpg'
    return getFileUrl(url)
}

const selectVTuber = (vt: any) => {
    const id = vt.entityId ?? vt._id
    emit('update:selectedAvatar', id)
    emit('select-vtuber-entity', vt)
}
</script>

<style lang="scss" scoped>
.action-card {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;
    
    span {
        font-size: 8px;
        font-weight: 800;
        text-transform: uppercase;
        color: rgba(255, 255, 255, 0.4);
    }
    
    color: rgba(255, 255, 255, 0.4);
    
    &:hover {
        background: rgba(249, 115, 22, 0.1);
        border-color: rgba(249, 115, 22, 0.3);
        color: #f97316;
        
        span { color: #f97316; }
    }
}

.toggle-card {
    backdrop-filter: blur(10px);
}
</style>
