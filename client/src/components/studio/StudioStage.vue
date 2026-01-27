<template>
    <div class="preview-stage">
        <div class="canvas-wrapper glass-dark" ref="canvasWrapper">
            <!-- Real-time Render Canvas (Injected via slot from Parent) -->
            <slot name="canvas"></slot>

            <!-- Floating Interactions Overlay -->
            <div class="interaction-overlay">
                <transition-group name="float-up">
                    <div v-for="like in activeLikes" :key="like.id" class="floating-heart" :style="like.style">
                        <like theme="filled" size="24" />
                    </div>
                </transition-group>
            </div>
        </div>

        <!-- Bottom Control Bar -->
        <slot name="controls"></slot>
    </div>
</template>

<script setup lang="ts">
import { Like } from '@icon-park/vue-next';

defineProps<{
    activeLikes: any[];
}>();
</script>

<style scoped lang="scss">
.preview-stage {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 24px;
    gap: 20px;
    background: radial-gradient(circle at center, rgba(30, 64, 175, 0.05) 0%, transparent 70%);

    .canvas-wrapper {
        flex: 1;
        border-radius: 32px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: #000;
        position: relative;
        overflow: hidden;
        box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 0.5);
        @include flex-center;
    }

    .interaction-overlay {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 10;
    }

    .floating-heart {
        position: absolute;
        bottom: 20px;
        color: #ff4d4f;
        filter: drop-shadow(0 0 10px rgba(255, 77, 79, 0.5));
    }
}

.float-up-enter-active {
    animation: float-up 2s ease-out forwards;
}

@keyframes float-up {
    0% {
        transform: translateY(0) scale(1) rotate(0);
        opacity: 1;
    }

    100% {
        transform: translateY(-400px) scale(1.5) rotate(20deg);
        opacity: 0;
    }
}
</style>
