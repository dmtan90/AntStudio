<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps<{
    analyser: AnalyserNode | null | undefined;
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
let animationId: number;

const draw = () => {
    if (!canvasRef.value || !props.analyser) return;

    const canvas = canvasRef.value;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = props.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
        animationId = requestAnimationFrame(render);
        props.analyser?.getByteFrequencyData(dataArray);

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const barHeight = (dataArray[i] / 255) * canvas.height;

            // Gradient based on orange cinematic theme
            const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
            gradient.addColorStop(0, 'rgba(249, 115, 22, 0.2)');
            gradient.addColorStop(1, 'rgba(251, 146, 60, 0.8)');

            ctx.fillStyle = gradient;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }
    };

    render();
};

onMounted(() => {
    draw();
});

onUnmounted(() => {
    cancelAnimationFrame(animationId);
});

watch(() => props.analyser, () => {
    cancelAnimationFrame(animationId);
    draw();
});
</script>

<template>
    <canvas ref="canvasRef" width="300" height="100" class="w-full h-full" />
</template>
