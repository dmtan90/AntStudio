<template>
    <div v-if="activeLine" class="stage-lyrics-container" :class="[style, activeLine.intensity > 0.8 ? 'high-energy' : '']">
        <transition name="lyric-slide" mode="out-in">
            <div :key="activeLine.text" class="lyric-line">
                <span class="text-glow" :data-text="activeLine.text">{{ activeLine.text }}</span>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface LyricLine {
    time: number;
    text: string;
    intensity?: number;
}

const props = defineProps<{
    lyrics: LyricLine[];
    currentTime: number;
    style?: 'neon' | 'minimal' | 'kinetic';
}>();

const activeLine = computed(() => {
    if (!props.lyrics || props.lyrics.length === 0) return null;
    
    // Find the latest line that has started but not yet been surpassed by the next line
    for (let i = props.lyrics.length - 1; i >= 0; i--) {
        if (props.currentTime >= props.lyrics[i].time) {
            // Optional: Calculate intensity based on volume or character count
            const intensity = props.lyrics[i].text.length / 50; 
            return { ...props.lyrics[i], intensity };
        }
    }
    return null;
});
</script>

<style scoped lang="scss">
.stage-lyrics-container {
    position: absolute;
    bottom: 80px;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    z-index: 100;
    padding: 0 40px;
    text-align: center;
}

.lyric-line {
    font-family: 'Inter', sans-serif;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

/* --- STYLE: NEON --- */
.neon {
    .lyric-line {
        font-size: 28px;
        color: #fff;
        text-shadow: 
            0 0 10px rgba(0, 242, 255, 0.8),
            0 0 20px rgba(0, 242, 255, 0.5),
            0 0 40px rgba(0, 242, 255, 0.2);
        
        .text-glow {
            position: relative;
            &::after {
                content: attr(data-text);
                position: absolute;
                left: 0;
                top: 0;
                color: #00f2ff;
                filter: blur(8px);
                opacity: 0.5;
                animation: pulse-glow 2s infinite;
            }
        }
    }
}

/* --- STYLE: MINIMAL --- */
.minimal {
    bottom: 40px;
    .lyric-line {
        font-size: 18px;
        color: rgba(255, 255, 255, 0.9);
        background: rgba(0, 0, 0, 0.4);
        padding: 4px 16px;
        border-radius: 4px;
        backdrop-filter: blur(4px);
        letter-spacing: 0.2em;
        font-weight: 400;
    }
}

/* --- STYLE: KINETIC --- */
.kinetic {
    .lyric-line {
        font-size: 32px;
        color: #fff;
        transform: perspective(500px) rotateX(10deg);
        animation: kinetic-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    &.high-energy .lyric-line {
        color: #ff007a;
        transform: scale(1.1) perspective(500px) rotateX(10deg);
        text-shadow: 0 0 20px rgba(255, 0, 122, 0.6);
    }
}

/* --- ANIMATIONS --- */
.lyric-slide-enter-active, .lyric-slide-leave-active {
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.lyric-slide-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.9);
}

.lyric-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(1.1);
}

@keyframes pulse-glow {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.05); }
}

@keyframes kinetic-bounce {
    0% { transform: scale(0.8) translateY(40px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
