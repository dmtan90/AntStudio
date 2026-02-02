<template>
    <div class="controls-overlay absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center gap-6 z-50">
        <!-- Main Controls -->
        <div
            class="controls-bar flex items-center justify-center gap-4 px-6 py-3 bg-black/40 backdrop-blur-3xl border border-white/5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative">

            <button class="ctrl-btn" :class="{ 'active': activeSidebar === 'filters' }"
                @click="emit('toggle-sidebar', 'filters')" title="Filters">
                <effects theme="outline" size="20" />
            </button>

            <button class="ctrl-btn flex-col gap-0.5" :class="{ 'text-red-500': !micEnabled }" @click="emit('toggle-mic')"
                title="Microphone (M)">
                <microphone-one v-if="micEnabled" theme="filled" size="20" />
                <microphone-one v-else theme="outline" size="20" />
                <span class="text-[7px] font-mono opacity-40">[M]</span>
            </button>

            <button class="ctrl-btn" :class="{ 'text-pink-400': enableBeauty }" @click="emit('toggle-sidebar', 'ai')"
                title="Beauty & AI">
                <magic theme="outline" size="20" />
            </button>

            <button
                class="w-14 h-14 rounded-full relative flex flex-col items-center justify-center transition-all bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30 group mx-2"
                @click="emit('toggle-recording')" title="Toggle Recording (Space)">
                <div class="w-5 h-5 rounded bg-white transition-all duration-300"
                    :class="{ 'scale-100 rounded-sm': isRecording, 'scale-0 rounded-full': !isRecording }">
                </div>
                <div class="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" v-if="isRecording">
                </div>
                <span class="text-[7px] text-white/60 font-mono mt-1 group-hover:text-white transition-colors" v-if="!isRecording">SPACE</span>
            </button>

            <button class="ctrl-btn" :class="{ 'text-green-400': isStreaming }" @click="emit('toggle-live')"
                title="Live Stream">
                <broadcast-radio theme="outline" size="20" />
            </button>

            <button class="ctrl-btn" :class="{ 'active': activeSidebar === 'hardware' }"
                @click="emit('toggle-sidebar', 'hardware')" title="Hardware Settings">
                <setting-config theme="outline" size="20" />
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
                <span class="text-[7px] font-mono opacity-40">[P]</span>
            </button>

            <!-- Production Toggle -->
            <button class="ctrl-btn flex-col gap-0.5" :class="{ 'active': activeSidebar === 'production' }"
                @click="emit('toggle-sidebar', 'production')" title="Production (T)">
                <setting-config v-if="activeSidebar === 'production'" theme="filled" size="20" />
                <setting-config v-else theme="outline" size="20" />
                <span class="text-[7px] font-mono opacity-40">[T]</span>
            </button>

            <!-- Reshare Screen Button (If Stopped) -->
            <button v-if="isScreenShareEnded && (mode === 'screen' || mode === 'camera-screen')"
                class="absolute -top-16 left-1/2 -translate-x-1/2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-full text-xs font-bold shadow-lg flex items-center gap-2 animate-bounce whitespace-nowrap"
                @click="emit('initialize-stream')">
                <share theme="outline" size="16" />
                Reshare Screen
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import {
    MicrophoneOne, FileAddition, Effects,
    BroadcastRadio, Magic, Share, SettingConfig, Pencil
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
    (e: 'toggle-live'): void
    (e: 'trigger-upload'): void
    (e: 'initialize-stream'): void
    (e: 'update:is-annotation-active', val: boolean): void
}>()
</script>

<style lang="scss" scoped>
.ctrl-btn {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: transparent;
    border: 1px solid transparent;
    color: rgba(255, 255, 255, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        color: #fff;
        background: rgba(255, 255, 255, 0.05);
        border-color: rgba(255, 255, 255, 0.1);
    }

    &.active {
        color: #fff;
        background: rgba(249, 115, 22, 0.2);
        border-color: rgba(249, 115, 22, 0.3);
    }
}
</style>
