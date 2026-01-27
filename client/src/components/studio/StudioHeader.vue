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
            <div class="god-mode-indicator" :class="{ active: isGodMode }" @click="$emit('toggle-god-mode')">
                <robot theme="outline" size="14" />
                <span class="text-[9px] font-black uppercase">God Mode: {{ isGodMode ? 'ENGAGED' : 'OFF' }}</span>
                <div v-if="isGodMode" class="scanline"></div>
            </div>
            <h2 class="stream-title">Professional Studio — {{ title }}</h2>
        </div>
        <div class="header-right">
            <button class="exit-btn" @click="$emit('exit')">
                <close theme="outline" size="18" />
            </button>
        </div>
    </header>
</template>

<script setup lang="ts">
import { Robot, Close } from '@icon-park/vue-next';

defineProps<{
    isLive: boolean;
    liveTime: number;
    isGodMode: boolean;
    title: string;
}>();

defineEmits(['toggle-god-mode', 'exit']);

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
        width: 250px;
        display: flex;
        align-items: center;
        gap: 16px;
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
