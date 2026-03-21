<template>
    <div v-if="activeLine" 
        class="stage-lyrics-container" 
        :class="[style, activeLine.intensity > 0.8 ? 'high-energy' : '', position]">
        <transition name="lyric-slide" mode="out-in">
            <div :key="activeLine.text" class="lyric-line-wrapper">
                <div class="lyric-backdrop"></div>
                <div class="lyric-line">
                    <span class="text-glow" :data-text="activeLine.text">{{ activeLine.text }}</span>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';

interface LyricLine {
    text: string;
    startTime: number;
    endTime: number;
    intensity?: number;
}

const props = defineProps<{
    lyrics: any[];
    currentTime: number;
    style?: 'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale';
    position?: 'top' | 'center' | 'bottom';
}>();

const activeLine = computed(() => {
    if (!props.lyrics || props.lyrics.length === 0) return null;
    
    // Find the line where currentTime is between startTime and endTime
    const line = props.lyrics.find(l => 
        props.currentTime >= l.startTime && props.currentTime <= l.endTime
    );
    
    if (line) {
        // Calculate intensity based on text length
        const intensity = line.text.length / 50;
        return { ...line, intensity };
    }
    
    return null;
});

onMounted(() => {
});
</script>

<style scoped lang="scss">
.stage-lyrics-container {
    position: absolute;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: none;
    z-index: 100;
    padding: 0 5%; /* Relative padding */
    text-align: center;
    transition: all 0.5s ease;
    container-type: inline-size; /* Enable container-relative units */

    &.bottom { bottom: 15%; } /* Use percentage for vertical positioning */
    &.center { top: 50%; transform: translateY(-50%); }
    &.top { top: 15%; }
}

.lyric-line-wrapper {
    position: relative;
    padding: 2% 4%;
    display: flex;
    justify-content: center;
    align-items: center;
    max-width: 100%;
}

.lyric-backdrop {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    border-radius: 20px;
    mask-image: radial-gradient(circle at center, black 60%, transparent 100%);
    opacity: 0.8;
    z-index: -1;
}

.lyric-line {
    font-family: 'Inter', 'Roboto', 'Segoe UI', 'system-ui', sans-serif;
    font-weight: 800;
    letter-spacing: 0.02em;
    -webkit-text-stroke: 1.5px rgba(0, 0, 0, 0.8);
    paint-order: stroke fill;
    line-height: 1.2;
    color: #ffffff;
    font-size: clamp(14px, 8cqw, 40px); /* Dynamic Scaling */
    word-break: break-word; /* Ensure wrapping */
    overflow-wrap: break-word;
    max-width: 100%;
}

/* --- STYLE: NEON --- */
.neon {
    .lyric-line {
        font-size: clamp(16px, 9cqw, 44px);
        color: #fff;
        text-shadow: 
            0 0 8px rgba(0, 242, 255, 0.8),
            0 0 16px rgba(0, 242, 255, 0.4),
            0 4px 8px rgba(0, 0, 0, 0.9);
        
        .text-glow {
            position: relative;
            &::after {
                content: attr(data-text);
                position: absolute;
                left: 0;
                top: 0;
                color: #00f2ff;
                filter: blur(8px);
                opacity: 0.4;
                animation: pulse-glow 2s infinite;
                z-index: -1;
            }
        }
    }
}

/* --- STYLE: MINIMAL --- */
.minimal {
    .lyric-backdrop {
        background: rgba(0, 0, 0, 0.7);
        border-radius: 8px;
        mask-image: none;
    }
    .lyric-line {
        font-size: clamp(12px, 6cqw, 28px);
        color: rgba(255, 255, 255, 0.95);
        letter-spacing: 0.1em;
        font-weight: 600;
        -webkit-text-stroke: 0;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }
}

/* --- STYLE: KINETIC --- */
.kinetic {
    .lyric-line {
        font-size: clamp(18px, 10cqw, 48px);
        color: #fff;
        text-shadow: 0 6px 15px rgba(0, 0, 0, 0.7);
        transform: perspective(500px) rotateX(5deg);
        animation: kinetic-bounce 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    &.high-energy .lyric-line {
        color: #ff007a;
        transform: scale(1.05) perspective(500px) rotateX(5deg);
        text-shadow: 0 0 20px rgba(255, 0, 122, 0.6), 0 6px 15px rgba(0,0,0,0.9);
    }
}

/* --- STYLE: BOUNCE (Compatibility) --- */
.bounce {
    .lyric-line {
        font-size: clamp(16px, 8cqw, 40px);
        color: #fff;
        text-shadow: 0 4px 8px rgba(0, 0, 0, 0.8);
        animation: lyrics-bounce-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
}

@keyframes lyrics-bounce-in {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
}

/* --- ANIMATIONS --- */
.lyric-slide-enter-active, .lyric-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
}

.lyric-slide-enter-from {
    opacity: 0;
    transform: scale(0.95) translateY(10px);
}

.lyric-slide-leave-to {
    opacity: 0;
    transform: scale(1.05) translateY(-10px);
}

@keyframes pulse-glow {
    0%, 100% { opacity: 0.3; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(1.02); }
}

@keyframes kinetic-bounce {
    0% { transform: scale(0.8) translateY(20px); opacity: 0; }
    100% { transform: scale(1) translateY(0); opacity: 1; }
}
</style>
