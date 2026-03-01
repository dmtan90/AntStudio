<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useCanvasStore } from 'video-editor/store/canvas';

const props = defineProps<{
    type: 'horizontal' | 'vertical';
}>();

const canvasElement = ref<HTMLCanvasElement | null>(null);
const canvasStore = useCanvasStore();

const RULER_THICKNESS = 20;
const TICK_COLOR = '#555';
const TEXT_COLOR = '#888';
const BACKGROUND_COLOR = '#18181b'; // zinc-900

const drawRuler = () => {
    const cvs = canvasElement.value;
    if (!cvs || !canvasStore.canvas) return;

    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const width = cvs.width;
    const height = cvs.height;

    // Clear
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Canvas state
    const fabricCanvas = canvasStore.canvas.instance;
    const vpt = fabricCanvas?.viewportTransform || [1, 0, 0, 1, 0, 0];
    const zoom = fabricCanvas?.getZoom() || 1;

    // Viewport offset (pan)
    const offsetX = vpt[4];
    const offsetY = vpt[5];

    ctx.fillStyle = TEXT_COLOR;
    ctx.strokeStyle = TICK_COLOR;
    ctx.font = '10px Inter';
    ctx.lineWidth = 1;

    if (props.type === 'horizontal') {
        const startX = 0;
        const endX = width;

        // Find logical start
        // screenX = logicalX * zoom + offsetX
        // logicalX = (screenX - offsetX) / zoom

        // Draw ticks
        // Determine tick spacing based on zoom
        let step = 100; // logical pixels
        if (zoom > 2) step = 20;
        else if (zoom > 0.8) step = 50;
        else if (zoom < 0.2) step = 500;
        else if (zoom < 0.5) step = 200;

        const screenStep = step * zoom;

        // Find first tick
        const startLogical = Math.floor((startX - offsetX) / zoom / step) * step;

        // Draw
        ctx.beginPath();
        for (let logicalX = startLogical; ; logicalX += step) {
            const screenX = logicalX * zoom + offsetX;
            if (screenX > endX) break;

            if (screenX >= startX) {
                // Major tick
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, 15);
                ctx.fillText(logicalX.toString(), screenX + 2, 10);
            }
        }
        ctx.stroke();

        // Minor ticks
        const subStep = step / 10;
        ctx.beginPath();
        // Optimize: verify loop limits
        const subStartLogical = Math.floor((startX - offsetX) / zoom / subStep) * subStep;

        for (let logicalX = subStartLogical; ; logicalX += subStep) {
            const screenX = logicalX * zoom + offsetX;
            if (screenX > endX) break;
            if (screenX >= startX) {
                if (Math.abs(logicalX % step) > 0.01) { // Skip major
                    ctx.moveTo(screenX, 10); // Shorter
                    ctx.lineTo(screenX, 15); // Bottom align
                }
            }
        }
        ctx.stroke();

    } else {
        // Vertical
        const startY = 0;
        const endY = height;

        let step = 100;
        if (zoom > 2) step = 20;
        else if (zoom > 0.8) step = 50;
        else if (zoom < 0.2) step = 500;
        else if (zoom < 0.5) step = 200;

        const startLogical = Math.floor((startY - offsetY) / zoom / step) * step;

        ctx.beginPath();
        for (let logicalY = startLogical; ; logicalY += step) {
            const screenY = logicalY * zoom + offsetY;
            if (screenY > endY) break;

            if (screenY >= startY) {
                ctx.moveTo(0, screenY);
                ctx.lineTo(15, screenY);

                // Draw text vertically? Or just standard
                ctx.save();
                ctx.translate(10, screenY + 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(logicalY.toString(), 0, 0);
                ctx.restore();
            }
        }
        ctx.stroke();

        // Minor
        const subStep = step / 10;
        const subStartLogical = Math.floor((startY - offsetY) / zoom / subStep) * subStep;

        ctx.beginPath();
        for (let logicalY = subStartLogical; ; logicalY += subStep) {
            const screenY = logicalY * zoom + offsetY;
            if (screenY > endY) break;
            if (screenY >= startY) {
                if (Math.abs(logicalY % step) > 0.01) {
                    ctx.moveTo(10, screenY);
                    ctx.lineTo(15, screenY);
                }
            }
        }
        ctx.stroke();
    }
}

// Hook into fabric events via store or event listener
let animFrame: number;
const tick = () => {
    drawRuler();
    // animFrame = requestAnimationFrame(tick); // Polling is expensive, better to listen
}

// Listen to events
const updateRuler = () => {
    requestAnimationFrame(drawRuler);
}

onMounted(() => {
    if (!canvasElement.value) return;

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
        if (!canvasElement.value) return;
        // Match parent size
        const parent = canvasElement.value.parentElement;
        if (parent) {
            canvasElement.value.width = parent.offsetWidth;
            canvasElement.value.height = parent.offsetHeight;
            drawRuler();
        }
    });

    if (canvasElement.value.parentElement) {
        resizeObserver.observe(canvasElement.value.parentElement);
        // Initial size
        canvasElement.value.width = canvasElement.value.parentElement.offsetWidth;
        canvasElement.value.height = canvasElement.value.parentElement.offsetHeight;
    }

    // Subscribe to canvas events
    // We need to wait for canvas to be initialized
    const interval = setInterval(() => {
        if (canvasStore.canvas?.instance) {
            clearInterval(interval);
            canvasStore.canvas.instance.on('after:render', updateRuler);
            canvasStore.canvas.instance.on('mouse:wheel', updateRuler); // Zoom
            canvasStore.canvas.instance.on('mouse:move', updateRuler); // Panning implies move usually involves interaction? Not necessarily.
            // fabric pan event? usually implemented via mouse:wheel or touch:drag

            updateRuler();
        }
    }, 100);

    onUnmounted(() => {
        clearInterval(interval);
        if (canvasStore.canvas?.instance) {
            canvasStore.canvas.instance.off('after:render', updateRuler);
            canvasStore.canvas.instance.off('mouse:wheel', updateRuler);
            canvasStore.canvas.instance.off('mouse:move', updateRuler);
        }
        resizeObserver.disconnect();
    });
});

</script>

<template>
    <canvas ref="canvasElement" class="absolute top-0 left-0 w-full h-full pointer-events-none"></canvas>
</template>
