<template>
    <div class="lyrics-overlay pointer-events-none select-none absolute inset-0 flex flex-col items-center justify-end pb-[15%] z-50">
        <div class="lyrics-container relative w-full flex flex-col items-center">
            <!-- Dynamic Lyrics Line -->
            <transition name="lyric-slide" mode="out-in">
                <div v-if="currentLine" :key="currentLine.text" 
                    class="lyric-line px-6 py-2 rounded-lg"
                    :class="[style || 'modern']">
                    
                    <!-- Main Text -->
                    <div class="main-text font-black uppercase tracking-tighter sm:text-2xl md:text-3xl lg:text-4xl text-white">
                        {{ currentLine.text }}
                    </div>
                    
                    <!-- Highlight/Gauze Layer for Karaoke effect if needed in future -->
                    <div class="glitch-layer" v-if="style === 'glitch'">{{ currentLine.text }}</div>
                </div>
            </transition>
            
            <!-- Contextual Hint (Sub-lyrics if any) -->
            <div v-if="nextLine && showNext" class="next-hint opacity-30 mt-2 scale-75 blur-[1px]">
                {{ nextLine.text }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

interface LyricLine {
    time: number;
    text: string;
}

const props = defineProps<{
    lyrics: LyricLine[];
    currentTime: number;
    style?: 'modern' | 'glitch' | 'neon' | 'minimal';
    showNext?: boolean;
}>();

const currentLine = ref<LyricLine | null>(null);
const nextLine = ref<LyricLine | null>(null);

watch(() => props.currentTime, (time) => {
    if (!props.lyrics?.length) return;

    const idx = props.lyrics.findIndex((line, i) => {
        const next = props.lyrics[i + 1];
        return time >= line.time && (!next || time < next.time);
    });

    if (idx !== -1) {
        currentLine.value = props.lyrics[idx];
        nextLine.value = props.lyrics[idx + 1] || null;
    } else {
        currentLine.value = null;
        nextLine.value = props.lyrics[0] || null;
    }
});
</script>

<style scoped>
.lyrics-overlay {
    perspective: 1000px;
}

.lyric-line {
    position: relative;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

/* Modern Style (CapCut vibe) */
.modern .main-text {
    text-shadow: 0 4px 12px rgba(0,0,0,0.5);
    background: linear-gradient(to bottom, #fff 0%, #ddd 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

/* Neon Style */
.neon .main-text {
    color: #fff;
    text-shadow: 
        0 0 7px #fff,
        0 0 10px #fff,
        0 0 21px #fff,
        0 0 42px #b45309,
        0 0 82px #b45309,
        0 0 92px #b45309,
        0 0 102px #b45309,
        0 0 151px #b45309;
}

/* Glitch Style */
.glitch .main-text {
    position: relative;
    z-index: 1;
}
.glitch-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    color: #0ff;
    z-index: -1;
    animation: glitch 1s infinite linear alternate-reverse;
    opacity: 0.5;
    font-weight: 900;
    text-transform: uppercase;
}

@keyframes glitch {
    0% { transform: translate(0); }
    20% { transform: translate(-2px, 2px); }
    40% { transform: translate(-2px, -2px); }
    60% { transform: translate(2px, 2px); }
    80% { transform: translate(2px, -2px); }
    100% { transform: translate(0); }
}

/* Animation: Slide Up & Fade */
.lyric-slide-enter-active {
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.lyric-slide-leave-active {
    transition: all 0.3s cubic-bezier(0.6, -0.28, 0.735, 0.045);
}

.lyric-slide-enter-from {
    opacity: 0;
    transform: translateY(20px) scale(0.9) rotateX(-20deg);
}
.lyric-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(1.1) rotateX(20deg);
}

.main-text {
    line-height: 1.1;
    text-align: center;
    filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
}

.next-hint {
    color: white;
    font-weight: 700;
    text-transform: uppercase;
}
</style>
