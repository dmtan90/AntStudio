<template>
  <div class="lyrics-overlay" v-if="currentLine">
    <!-- CapCut-style animated lyrics -->
    <div class="lyrics-container" :style="containerStyle">
      <div class="lyrics-line" :class="animationClass">
        <!-- Word-by-word animation -->
        <span 
          v-for="(word, index) in currentWords" 
          :key="index"
          class="lyrics-word"
          :class="{ 'active': word.active, 'past': word.past }"
          :style="getWordStyle(word)"
        >
          {{ word.text }}
        </span>
      </div>
      
      <!-- Next line preview (optional) -->
      <div v-if="nextLine && showNextLine" class="lyrics-next">
        {{ nextLine.text }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';

interface LyricsLine {
  text: string;
  startTime: number;
  endTime: number;
}

interface LyricsWord {
  text: string;
  active: boolean;
  past: boolean;
  progress: number;
}

const props = withDefaults(defineProps<{
  lyrics: LyricsLine[];
  currentTime: number;
  style?: 'neon' | 'minimal' | 'kinetic' | 'bounce' | 'slide' | 'fade' | 'scale';
  position?: 'top' | 'center' | 'bottom';
  fontSize?: number;
  color?: string;
  strokeColor?: string;
  strokeWidth?: number;
  showNextLine?: boolean;
}>(), {
  style: 'bounce',
  position: 'bottom',
  fontSize: 48,
  color: '#ffffff',
  strokeColor: '#000000',
  strokeWidth: 2,
  showNextLine: false
});

const currentLine = ref<LyricsLine | null>(null);
const nextLine = ref<LyricsLine | null>(null);
const currentWords = ref<LyricsWord[]>([]);
const animationClass = ref('');

// Find current line based on audio time
watch(() => props.currentTime, (time) => {
  const lineIndex = props.lyrics.findIndex(
    line => time >= line.startTime && time < line.endTime
  );

  if (lineIndex !== -1) {
    const newLine = props.lyrics[lineIndex];
    
    // Only trigger animation if line changed
    if (currentLine.value?.text !== newLine.text) {
      currentLine.value = newLine;
      nextLine.value = props.lyrics[lineIndex + 1] || null;
      animationClass.value = `animate-${props.style}`;
      
      // Reset animation class after animation completes
      setTimeout(() => {
        animationClass.value = '';
      }, 500);
    } else {
      currentLine.value = newLine;
    }
    
    // Split into words and calculate progress
    const words = currentLine.value.text.split(' ');
    const lineDuration = currentLine.value.endTime - currentLine.value.startTime;
    const lineProgress = (time - currentLine.value.startTime) / lineDuration;
    
    currentWords.value = words.map((text, index) => {
      const wordProgress = index / words.length;
      const nextWordProgress = (index + 1) / words.length;
      
      return {
        text,
        active: lineProgress >= wordProgress && lineProgress < nextWordProgress,
        past: lineProgress >= nextWordProgress,
        progress: Math.max(0, Math.min(1, (lineProgress - wordProgress) * words.length))
      };
    });
  } else {
    currentLine.value = null;
    currentWords.value = [];
  }
}, { immediate: true });

const containerStyle = computed(() => {
  const positionStyles: Record<string, string> = {
    top: '10%',
    center: '50%',
    bottom: '85%'
  };
  
  return {
    fontSize: `${props.fontSize}px`,
    color: props.color,
    textShadow: props.strokeWidth 
      ? `
        -${props.strokeWidth}px -${props.strokeWidth}px 0 ${props.strokeColor},
        ${props.strokeWidth}px -${props.strokeWidth}px 0 ${props.strokeColor},
        -${props.strokeWidth}px ${props.strokeWidth}px 0 ${props.strokeColor},
        ${props.strokeWidth}px ${props.strokeWidth}px 0 ${props.strokeColor}
      `
      : '2px 2px 4px rgba(0,0,0,0.8)',
    [props.position]: positionStyles[props.position],
    transform: props.position === 'center' ? 'translateY(-50%)' : 'none'
  };
});

const getWordStyle = (word: LyricsWord) => {
  if (word.active) {
    return {
      color: '#FFD700', // Gold color for active word
      transform: `scale(${1 + word.progress * 0.2})`,
      textShadow: '0 0 20px rgba(255, 215, 0, 0.8)'
    };
  }
  if (word.past) {
    return {
      opacity: 0.6
    };
  }
  return {};
};
</script>

<style scoped lang="scss">
.lyrics-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lyrics-container {
  text-align: center;
  font-weight: 900;
  font-family: 'Outfit', 'Arial Black', sans-serif;
  letter-spacing: 0.05em;
  position: absolute;
  width: 90%;
  max-width: 1200px;
}

.lyrics-line {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.3em;
  margin-bottom: 0.5em;
}

.lyrics-word {
  display: inline-block;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.lyrics-next {
  font-size: 0.6em;
  opacity: 0.4;
  margin-top: 1em;
}

// Animation styles
.animate-bounce {
  animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.animate-slide {
  animation: slide-in 0.5s ease-out;
}

.animate-fade {
  animation: fade-in 0.5s ease-in;
}

.animate-scale {
  animation: scale-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes bounce-in {
  0% {
    transform: translateY(100px) scale(0.5);
    opacity: 0;
  }
  60% {
    transform: translateY(-10px) scale(1.1);
    opacity: 1;
  }
  100% {
    transform: translateY(0) scale(1);
  }
}

@keyframes slide-in {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
