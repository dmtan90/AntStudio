<template>
    <aside class="side-rail left-rail glass-dark studio-rail">
        <!-- <div class="rail-item" :class="{ active: activeTab === 'scenes' }"
            @click="$emit('update:activeTab', 'scenes')">
            <video-two theme="outline" size="20" />
            <span class="label">Scenes</span>
        </div> -->

        <div v-for="tab in effectTabs" :key="tab.id" class="rail-item" :class="{ active: activeTab === tab.id }"
            @click="$emit('update:activeTab', tab.id)">
            <component :is="getIcon(tab.icon)" theme="outline" size="20" />
            <span class="label">{{ tab.name }}</span>
        </div>

        <!-- <div class="rail-item" :class="{ active: activeTab === 'virtual' }"
            @click="$emit('update:activeTab', 'virtual')">
            <video-two theme="outline" size="20" />
            <span class="label">Virtual</span>
        </div> -->

        <div class="rail-item" :class="{ active: activeTab === 'vibe' }" @click="$emit('update:activeTab', 'vibe')">
            <heart theme="outline" size="20" />
            <span class="label">Vibe</span>
        </div>

        <div class="rail-item" :class="{ active: activeTab === 'resources' }"
            @click="$emit('update:activeTab', 'resources')">
            <folder-open theme="outline" size="20" />
            <span class="label">Assets</span>
        </div>

        <!-- <div class="rail-item" :class="{ active: activeTab === 'guests' }" @click="$emit('update:activeTab', 'guests')"
            data-guide="guests">
            <peoples theme="outline" size="20" />
            <span class="label">AI Guests</span>
        </div> -->

        <div class="rail-item" :class="{ active: activeTab === 'collaboration' }"
            @click="$emit('update:activeTab', 'collaboration')">
            <connection-point theme="outline" size="20" />
            <span class="label">Co-Hosts</span>
        </div>
    </aside>
</template>

<script setup lang="ts">
import { VideoTwo, Heart, Peoples, ConnectionPoint, FolderOpen } from '@icon-park/vue-next';
import * as Icons from '@icon-park/vue-next';

defineProps<{
    activeTab: string | null;
    effectTabs: any[];
}>();

defineEmits(['update:activeTab']);

const getIcon = (iconName: any) => {
    if (typeof iconName === 'string') return Icons[iconName as keyof typeof Icons];
    return iconName;
};
</script>

<style scoped lang="scss"></style>
