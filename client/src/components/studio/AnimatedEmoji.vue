<template>
    <span class="animated-emoji-wrapper" :title="emoji">
        <img 
            v-if="notoUrl" 
            :src="notoUrl" 
            :alt="emoji"
            class="animated-emoji"
            @error="handleError"
        />
        <span v-else class="fallback-emoji">{{ emoji }}</span>
    </span>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
    emoji: string;
    size?: number;
}>();

const hasError = ref(false);

const getEmojiHex = (emoji: string) => {
    // Basic implementation to get the hex code point
    // Note: Some emojis have multiple code points (e.g. skin tones, flags)
    // For now we handle single code point emojis which are most common in Noto Animated
    const codePoint = emoji.codePointAt(0);
    if (!codePoint) return '';
    return codePoint.toString(16).toLowerCase();
};

const notoUrl = computed(() => {
    if (hasError.value) return null;
    const hex = getEmojiHex(props.emoji);
    if (!hex) return null;
    // Noto Animated Emojis CDN
    return `https://fonts.gstatic.com/s/e/notoemoji/latest/${hex}/512.webp`;
});

const handleError = () => {
    hasError.value = true;
};
</script>

<style scoped>
.animated-emoji-wrapper {
    display: inline-flex;
    align-items: center;
    vertical-align: middle;
}

.animated-emoji {
    width: 1.4em;
    height: 1.4em;
    object-fit: contain;
    margin: 0 1px;
}

.fallback-emoji {
    font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
}
</style>
