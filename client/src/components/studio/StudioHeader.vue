<template>
    <header class="studio-header glass-dark">
        <div class="header-left">
            <div class="live-indicator" :class="{ 'active': isLive }">
                <div class="orb"></div>
                <span>{{ isLive ? 'LIVE' : 'READY' }}</span>
            </div>
            <div class="timer" v-if="isLive">{{ formatTime(liveTime) }}</div>
        </div>
        <div class="header-center">
            <div class="flex flex-col items-center">
                <span class="text-[9px] font-black uppercase tracking-widest opacity-20 mb-1">Professional Studio</span>
                <div class="relative group">
                    <input v-if="editing" ref="titleInput" v-model="localTitle" @blur="saveTitle"
                        @keyup.enter="saveTitle" class="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-center text-sm font-black uppercase tracking-wider text-white outline-none focus:border-blue-500/50 min-w-[300px]" />
                    <h2 v-else @click="startEditing"
                        class="stream-title text-sm font-black uppercase tracking-widest cursor-pointer hover:text-blue-400 transition-all">
                        {{ title }}
                    </h2>
                </div>
            </div>
        </div>
        <div class="header-right">
            <div class="god-mode-indicator mr-2" :class="{ active: showSwarmMonitor }" @click="$emit('toggle-swarm')">
                <connection-point theme="outline" size="14" />
                <span class="text-[9px] font-black uppercase">Swarm</span>
            </div>
            <div class="god-mode-indicator" :class="{ active: isGodMode }" @click="$emit('toggle-god-mode')">
                <robot theme="outline" size="14" />
                <span class="text-[9px] font-black uppercase">God Mode: {{ isGodMode ? 'ENGAGED' : 'OFF' }}</span>
                <div v-if="isGodMode" class="scanline"></div>
            </div>
            <button class="exit-btn" 
                :class="{ 'text-yellow-400 border-yellow-400/50 bg-yellow-500/10': autoEmotionEnabled }"
                @click="$emit('toggle-auto-emotion')"
                title="Auto-Emotion">
                <face-recognition theme="outline" size="18" />
            </button>
            <button class="exit-btn" title="Demo Mode"
                :class="{ 'text-purple-400 border-purple-400/50 bg-purple-500/10': demoMode }"
                @click="$emit('toggle-demo')">
                <magic theme="outline" size="18" />
            </button>
            <button class="exit-btn" title="Auto-Atmosphere"
                :class="{ 'text-orange-400 border-orange-400/50 bg-orange-500/10': autoAtmosphereEnabled }"
                @click="$emit('toggle-auto-atmosphere')">
                <sun-one theme="outline" size="18" />
            </button>
            <button class="exit-btn" @click="$emit('exit')">
                <close theme="outline" size="18" />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { Robot, Close, Magic, ConnectionPoint, FaceRecognition, SunOne } from '@icon-park/vue-next';

const props = defineProps<{
    isLive: boolean;
    liveTime: number;
    isGodMode: boolean;
    demoMode: boolean;
    title: string;
    showSwarmMonitor: boolean;
    autoEmotionEnabled: boolean;
    autoAtmosphereEnabled: boolean;
}>();

const emit = defineEmits(['toggle-god-mode', 'exit', 'toggle-demo', 'update:title', 'toggle-swarm', 'toggle-auto-emotion', 'toggle-auto-atmosphere']);

const editing = ref(false);
const localTitle = ref(props.title);
const titleInput = ref<HTMLInputElement | null>(null);

const startEditing = () => {
    localTitle.value = props.title;
    editing.value = true;
    nextTick(() => {
        titleInput.value?.focus();
        titleInput.value?.select();
    });
};

const saveTitle = () => {
    if (localTitle.value.trim() && localTitle.value !== props.title) {
        emit('update:title', localTitle.value.trim());
    }
    editing.value = false;
};

const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => v < 10 ? '0' + v : v).filter((v, i) => v !== '00' || i > 0).join(':');
};
</script>

<style scoped lang="scss">
.studio-header {
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    z-index: 100;

    .header-left,
    .header-right {
        min-width: 250px;
        width: auto;
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .header-right {
        justify-content: flex-end;
    }

    .live-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 20px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1px;

        .orb {
            width: 6px;
            height: 6px;
            background: #666;
            border-radius: 50%;
            transition: all 0.3s;
        }

        &.active {
            color: #ff4d4f;

            .orb {
                background: #ff4d4f;
                box-shadow: 0 0 10px #ff4d4f;
                animation: pulse 2s infinite;
            }
        }
    }

    .timer {
        font-family: 'Fira Code', monospace;
        font-size: 12px;
        font-weight: 700;
        opacity: 0.6;
    }

    .god-mode-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        cursor: pointer;
        position: relative;
        overflow: hidden;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

        &:hover {
            border-color: rgba(255, 255, 255, 0.3);
        }

        &.active {
            background: rgba(30, 64, 175, 0.2);
            border-color: #3b82f6;
            color: #3b82f6;
            box-shadow: 0 0 30px rgba(59, 130, 246, 0.2);
        }
    }

    .stream-title {
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 2px;
        opacity: 0.4;
        margin-top: 8px;
        text-align: center;
    }

    .exit-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;

        &:hover {
            background: rgba(255, 77, 79, 0.1);
            border-color: #ff4d4f;
            color: #ff4d4f;
        }
    }
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.5);
        opacity: 0.5;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}

.scanline {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 2px;
    background: rgba(59, 130, 246, 0.4);
    animation: scan 2s linear infinite;
    pointer-events: none;
}

@keyframes scan {
    from {
        transform: translateY(-10px);
    }

    to {
        transform: translateY(40px);
    }
}
</style>
