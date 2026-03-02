<template>
    <div class="guest-video-preview w-full h-full bg-black/40" ref="container">
        <!-- The video element will be injected here -->
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject } from 'vue';

const props = defineProps<{
    guestId: string;
    videoElements: Map<string, HTMLVideoElement> | null;
}>();

const container = ref<HTMLElement | null>(null);



const attachVideo = () => {
    if (!container.value) return;

    // Clear existing
    container.value.innerHTML = '';

    const video = props.videoElements?.get(props.guestId);

    if (video) {
        // Clone is not possible for live video, we must MOVE it or 
        // use a secondary strategy like sharing the stream.
        // HOWEVER, HTML5 video can only be in ONE place at a time.
        // For the sidebar, we might need a canvas-based capture or a secondary 2D context.

        // Easiest for now: Create a NEW video element for the preview and attach the same stream ID.
        // Actually, we can get the stream from the studio store guest object.

        const previewVideo = document.createElement('video');
        previewVideo.autoplay = true;
        previewVideo.playsInline = true;
        previewVideo.muted = true; // Sidebar previews are always muted
        previewVideo.className = 'w-full h-full object-cover rounded-lg';

        // We can't easily get the stream just from the ID here without access to studioStore or p2p internal state.
        // Let's use the srcObject of the main video element if available.
        if (video.srcObject) {
            previewVideo.srcObject = video.srcObject;
            
            const attemptPlay = () => {
                if (previewVideo.paused) {
                    previewVideo.play().catch(() => { });
                }
            };

            previewVideo.onloadedmetadata = attemptPlay;
            previewVideo.oncanplay = attemptPlay;
            
            container.value.appendChild(previewVideo);
            attemptPlay();
        }
    }
};

onMounted(() => {
    attachVideo();
});

watch(() => props.guestId, attachVideo);
watch(() => props.videoElements?.get(props.guestId)?.srcObject, attachVideo);
watch(() => props.videoElements?.size, attachVideo);
</script>


<style scoped>
.guest-video-preview {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}
</style>
