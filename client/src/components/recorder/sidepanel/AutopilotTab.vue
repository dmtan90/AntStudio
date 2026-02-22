<template>
    <div class="flex flex-col gap-6">
        <div class="panel-section">
            <div class="flex items-center justify-between mb-4">
                <span class="text-[10px] font-bold text-blue-400 uppercase">AI Broadcast Engine</span>
                <button v-if="!autopilotData" @click="$emit('trigger-presentation-upload')"
                    class="text-blue-400 hover:text-blue-300 transition-colors">
                    <file-addition size="16" />
                </button>
            </div>

            <div v-if="!autopilotData"
                class="upload-zone aspect-video border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:border-blue-500/30 group"
                @click="$emit('trigger-presentation-upload')">
                <div
                    class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-500/10">
                    <file-addition size="20" class="text-white/20 group-hover:text-blue-400" />
                </div>
                <span class="text-[9px] font-bold text-white/20 uppercase tracking-tighter">Import PPTX/PDF</span>
            </div>

            <div v-else class="space-y-4">
                <div class="flex flex-col gap-1 mb-6">
                    <h4 class="text-xs font-bold text-white">{{ autopilotData.title }}</h4>
                    <span class="text-[8px] text-white/30 uppercase tracking-widest">{{ autopilotData.scenes.length }}
                        Scenes
                        Detected</span>
                </div>

                <div class="scene-list flex flex-col gap-2 max-h-96 overflow-y-auto custom-scrollbar pr-2">
                    <div v-for="(scene, idx) in autopilotData.scenes" :key="idx"
                        class="slide-item p-4 rounded-xl border transition-all cursor-pointer"
                        :class="currentSlideIndex === idx ? 'bg-blue-500/10 border-blue-500/30' : 'bg-white/5 border-white/5 hover:border-white/10'"
                        @click="$emit('update:currentSlideIndex', Number(idx))">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[9px] font-black text-blue-400 uppercase">Slide {{ Number(idx) + 1
                                }}</span>
                            <span class="text-[8px] text-white/20 font-mono">{{ scene.duration }}s</span>
                        </div>
                        <p class="text-[10px] text-white/60 line-clamp-2 italic leading-relaxed">"{{ scene.script }}"
                        </p>
                    </div>
                </div>

                <div class="panel-section border-t border-white/5 pt-6">
                    <span class="text-[10px] font-bold text-blue-400 uppercase mb-4 block">AI Presenter</span>
                    <div class="grid grid-cols-2 gap-3 mb-6">
                        <div v-for="av in avatarPresets" :key="av.id"
                            class="av-card p-3 rounded-2xl border transition-all cursor-pointer flex flex-col items-center gap-2 group"
                            :class="selectedAvatar === av.id ? 'bg-blue-500/10 border-blue-500/40 shadow-lg shadow-blue-500/5' : 'bg-white/5 border-white/5 hover:border-white/10'"
                            @click="$emit('update:selectedAvatar', av.id)">
                            <div class="w-12 h-12 rounded-full overflow-hidden border-2 bg-black/20 transition-all group-hover:scale-105"
                                :class="selectedAvatar === av.id ? 'border-blue-500' : 'border-white/10'">
                                <img :src="av.image" class="w-full h-full object-cover" />
                            </div>
                            <span class="text-[9px] font-bold uppercase tracking-wider"
                                :class="selectedAvatar === av.id ? 'text-blue-400' : 'text-white/40'">{{ av.name }}</span>
                        </div>
                    </div>

                    <span class="text-[10px] font-bold text-blue-400 uppercase mb-4 block">Voice Persona</span>
                    <div class="bg-white/[0.03] p-4 rounded-2xl border border-white/5 backdrop-blur-md mb-6">
                        <el-select :model-value="selectedVoice" @update:model-value="v => $emit('update:selectedVoice', v)"
                            size="small" class="w-full custom-select">
                            <el-option label="English (Natural)" value="en-US-Standard-C" />
                            <el-option label="English (Professional)" value="en-GB-Standard-A" />
                            <el-option label="Vietnamese (Warm)" value="vi-VN-Standard-A" />
                            <el-option label="Japanese (Soft)" value="ja-JP-Standard-B" />
                        </el-select>
                        <p class="text-[8px] text-white/20 mt-2 uppercase tracking-widest text-center">Cloud Neural Engine Active</p>
                    </div>
                </div>

                <button v-if="!isRecording"
                    class="w-full py-4 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-500/20 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                    @click="$emit('start-autopilot')">
                    Launch AI Broadcast
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { FileAddition } from '@icon-park/vue-next'

defineProps<{
    autopilotData: any
    currentSlideIndex: number
    isRecording: boolean
    avatarPresets: any[]
    selectedAvatar: string
    selectedVoice: string
}>()

defineEmits<{
    (e: 'trigger-presentation-upload'): void
    (e: 'update:currentSlideIndex', idx: number): void
    (e: 'start-autopilot'): void
    (e: 'update:selectedAvatar', id: string): void
    (e: 'update:selectedVoice', id: string): void
}>()
</script>
