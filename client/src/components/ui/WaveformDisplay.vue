/**
* Reusable Waveform Display Component
* Renders audio waveform visualization with lazy loading
*/

<template>
    <div class="waveform-display" :style="{ width: width + 'px', height: height + 'px' }">
        <canvas ref="canvasRef" :width="width" :height="height" class="waveform-canvas" />
        <div v-if="loading" class="waveform-loading">
            <div class="spinner"></div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { getWaveformGenerator } from '@/utils/audio/WaveformGenerator'

interface Props {
    audioUrl: string
    width: number
    height?: number
    color?: string
    backgroundColor?: string
    barWidth?: number
    barGap?: number
}

const props = withDefaults(defineProps<Props>(), {
    height: 40,
    color: 'rgba(168, 85, 247, 0.6)',
    backgroundColor: 'transparent',
    barWidth: 2,
    barGap: 1
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const loading = ref(false)
const waveformGenerator = getWaveformGenerator()

const renderWaveform = async () => {
    if (!canvasRef.value || !props.audioUrl) return

    loading.value = true

    try {
        const peaks = await waveformGenerator.generateFromUrl(props.audioUrl, props.width)
        const ctx = canvasRef.value.getContext('2d')

        if (ctx) {
            waveformGenerator.renderToCanvas(ctx, peaks, {
                width: props.width,
                height: props.height,
                color: props.color,
                backgroundColor: props.backgroundColor,
                barWidth: props.barWidth,
                barGap: props.barGap
            })
        }
    } catch (error) {
        console.error('Failed to render waveform:', error)
    } finally {
        loading.value = false
    }
}

// Watch for prop changes
watch(
    () => [props.audioUrl, props.width, props.color],
    () => {
        renderWaveform()
    }
)

onMounted(() => {
    renderWaveform()
})

onUnmounted(() => {
    // Cleanup is handled by singleton
})
</script>

<style scoped>
.waveform-display {
    position: relative;
    overflow: hidden;
}

.waveform-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.waveform-loading {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(4px);
}

.spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-top-color: rgba(168, 85, 247, 0.8);
    border-radius: 50%;
    animation: spin 0.6s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>
