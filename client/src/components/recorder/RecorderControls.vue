<template>
    <div class="controls-overlay absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-50">
        <!-- Main Controls -->
        <div
            class="controls-bar recorder-controls flex flex-wrap md:flex-nowrap items-center justify-center gap-4 md:gap-6 px-6 md:px-8 py-4 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-full shadow-[0_25px_60px_rgba(0,0,0,0.6)] relative max-w-[720px] mx-auto">

            <!-- Core: Mic -->
            <button class="ctrl-btn flex-col gap-0.5" :class="{ 'text-red-400': !micEnabled }"
                @click="emit('toggle-mic')" title="Microphone (M)">
                <microphone-one v-if="micEnabled" theme="filled" size="22" />
                <microphone-one v-else theme="outline" size="22" />
                <!-- <span class="text-[8px] font-black opacity-30 tracking-tight">[M]</span> -->
            </button>

            <!-- Core: Share Screen -->
            <button
                class="ctrl-btn flex-col gap-0.5"
                :class="{ 'active': mode === 'screen' || mode === 'camera-screen' }"
                @click="emit('toggle-share')"
                title="Share Screen (S)">
                <Share theme="outline" size="22" />
            </button>

            <!-- Core: Recording -->
            <button
                class="w-16 h-16 rounded-full relative flex flex-col items-center justify-center transition-all bg-red-500 hover:bg-red-600 shadow-2xl shadow-red-500/40 group mx-2 hover:scale-110 active:scale-95"
                @click="emit('toggle-recording')" title="Toggle Recording (Space)">
                <Round v-if="!isRecording" theme="filled" size="26" class="text-white" />
                <Square v-else theme="filled" size="20" class="text-white" />
                <div class="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" v-if="isRecording">
                </div>
            </button>

            <!-- Core: Live -->
            <button class="ctrl-btn" :class="{ 'text-blue-400 active': isStreaming }" @click="emit('toggle-live')"
                title="Live Stream">
                <broadcast-radio theme="outline" size="22" />
            </button>

            <!-- Overflow / Advanced Controls -->
            <el-popover placement="top" trigger="click" popper-class="cinematic-popover !p-0" :width="260">
                <template #reference>
                    <button class="ctrl-btn flex-col gap-0.5" title="More tools">
                        <MoreFour theme="outline" size="22" />
                        <!-- <span class="text-[8px] font-black opacity-30 tracking-tight">More</span> -->
                    </button>
                </template>

                <div class="bg-[#050507]/95 backdrop-blur-2xl rounded-2xl border border-white/10 p-3 space-y-2">
                    <div class="grid grid-cols-3 gap-2">
                        <button class="ctrl-btn" :class="{ 'active': activeSidebar === 'filters' }"
                            @click="emit('toggle-sidebar', 'filters')" title="Filters">
                            <effects theme="outline" size="20" />
                        </button>

                        <button class="ctrl-btn" :class="{ 'text-indigo-400 active': activeSidebar === 'ai' }"
                            @click="emit('toggle-sidebar', 'ai')" title="Beauty & AI">
                            <magic theme="outline" size="20" />
                        </button>

                        <button class="ctrl-btn" :class="{ 'active': activeSidebar === 'hardware' }"
                            @click="emit('toggle-sidebar', 'hardware')" title="Hardware Settings">
                            <Cpu theme="outline" size="20" />
                        </button>

                        <button class="ctrl-btn" :class="{ 'active': activeSidebar === 'resources' }"
                            @click="emit('toggle-sidebar', 'resources')" title="Resource Pool">
                            <file-addition theme="outline" size="20" />
                        </button>

                        <!-- Annotation Toggle -->
                        <button class="ctrl-btn flex-col gap-0.5" :class="{ 'active': isAnnotationActive }"
                            @click="$emit('update:is-annotation-active', !isAnnotationActive)" title="Annotate (P)">
                            <pencil v-if="isAnnotationActive" theme="filled" size="20" />
                            <pencil v-else theme="outline" size="20" />
                            <span class="text-[8px] font-black opacity-30 tracking-tight">[P]</span>
                        </button>

                        <!-- Production Toggle -->
                        <button class="ctrl-btn flex-col gap-0.5" :class="{ 'active': activeSidebar === 'production' }"
                            @click="emit('toggle-sidebar', 'production')" title="Production (T)">
                            <setting-config v-if="activeSidebar === 'production'" theme="filled" size="20" />
                            <setting-config v-else theme="outline" size="20" />
                            <span class="text-[8px] font-black opacity-30 tracking-tight">[T]</span>
                        </button>
                    </div>
                </div>
            </el-popover>

            <!-- Reshare Screen Button (If Stopped) -->
            <button v-if="isScreenShareEnded && (mode === 'screen' || mode === 'camera-screen')"
                class="absolute -top-16 left-1/2 -translate-x-1/2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-full text-xs font-black shadow-2xl flex items-center gap-2 animate-bounce transition-all hover:scale-105"
                @click="emit('initialize-stream')">
                <share theme="outline" size="16" />
                RESHARE SCREEN
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    MicrophoneOne, FileAddition, Effects,
    BroadcastRadio, Magic, Share, SettingConfig, Pencil,
    MoreFour, Round, Square, Cpu
} from '@icon-park/vue-next'
import type { RecordingMode } from '@/composables/useRecorder'

defineProps<{
    mode: RecordingMode
    isRecording: boolean
    micEnabled: boolean
    enableBeauty: boolean
    isStreaming: boolean
    activeSidebar: string | null
    isScreenShareEnded: boolean
    isAnnotationActive: boolean
    layoutPreset: string
    isTeleprompterActive: boolean
}>()

const emit = defineEmits<{
    (e: 'toggle-sidebar', name: string): void
    (e: 'toggle-mic'): void
    (e: 'toggle-ai'): void
    (e: 'toggle-recording'): void
    (e: 'toggle-share'): void
    (e: 'toggle-live'): void
    (e: 'trigger-upload'): void
    (e: 'initialize-stream'): void
    (e: 'update:is-annotation-active', val: boolean): void
}>()
</script>

<style lang="scss" scoped>
.ctrl-btn {
    width: 52px;
    height: 52px;
    border-radius: 18px;
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.1);
        transform: translateY(-2px);
    }

    &.active {
        color: #fff;
        background: rgba(59, 130, 246, 0.15);
        border-color: rgba(59, 130, 246, 0.3);
        box-shadow: 0 5px 15px rgba(59, 130, 246, 0.2);
    }
}
</style>
