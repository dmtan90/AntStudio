<template>
    <div class="transition-trigger-container" :class="{ 'has-transition': hasTransition }">
        <el-popover placement="top" :width="200" trigger="click" popper-class="transition-popover">
            <template #reference>
                <div class="transition-btn" :title="transitionName">
                    <component :is="transitionIcon" :size="14" :theme="hasTransition ? 'filled' : 'outline'"
                        :class="hasTransition ? 'text-brand-primary' : 'text-white/20'" />
                </div>
            </template>

            <div class="transition-menu flex flex-col gap-2 p-2">
                <div class="text-xs font-bold text-white/40 uppercase tracking-widest mb-1">Transition</div>
                <div class="grid grid-cols-2 gap-2">
                    <button v-for="t in transitions" :key="t.value"
                        class="transition-option p-2 rounded border border-white/5 hover:border-brand-primary/50 transition-all flex flex-col items-center gap-1"
                        :class="{ 'active': modelValue === t.value }" @click="selectTransition(t.value)">
                        <component :is="t.icon" :size="20" />
                        <span class="text-[10px]">{{ t.label }}</span>
                    </button>
                </div>

                <template v-if="hasTransition">
                    <div class="mt-2 pt-2 border-t border-white/5">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-[10px] text-white/40 uppercase">Duration</span>
                            <span class="text-[10px] text-white/60">{{ duration }}s</span>
                        </div>
                        <el-slider v-model="duration" :min="0.1" :max="2.0" :step="0.1" size="small" />
                    </div>
                    <el-button size="small" type="danger" plain class="w-full mt-2" @click="selectTransition('none')">
                        Remove Transition
                    </el-button>
                </template>
            </div>
        </el-popover>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
    Connection,
    DistributeVertically,
    Back,
    Next,
    MoreOne,
    Effects,
    GraphicDesign,
    Switch
} from '@icon-park/vue-next';

const props = defineProps<{
    modelValue: string;
    durationValue?: number;
}>();

const emit = defineEmits(['update:modelValue', 'update:durationValue']);

const hasTransition = computed(() => props.modelValue && props.modelValue !== 'none');

const transitions = [
    { label: 'None', value: 'none', icon: MoreOne },
    { label: 'Fade', value: 'fade', icon: Switch },
    { label: 'Wipe', value: 'wipe', icon: Back },
    { label: 'Slide', value: 'slide', icon: Next },
    { label: 'Zoom', value: 'zoom-in', icon: GraphicDesign },
    { label: 'Blur', value: 'blur', icon: Effects },
];

const transitionIcon = computed(() => {
    const t = transitions.find(t => t.value === props.modelValue);
    return t ? t.icon : Connection;
});

const transitionName = computed(() => {
    const t = transitions.find(t => t.value === props.modelValue);
    return t ? t.label : 'Add Transition';
});

const duration = computed({
    get: () => props.durationValue || 0.5,
    set: (val) => emit('update:durationValue', val)
});

const selectTransition = (val: string) => {
    emit('update:modelValue', val);
};
</script>

<style lang="scss" scoped>
.transition-trigger-container {
    width: 24px;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    z-index: 10;
    margin: 0 -12px; // Overlap with scene cards
}

.transition-btn {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #1a1a1a;
    border: 1px solid rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);

    &:hover {
        transform: scale(1.2);
        border-color: var(--brand-primary);
        background: #222;
    }
}

.has-transition .transition-btn {
    border-color: var(--brand-primary);
    background: rgba(59, 130, 246, 0.1);
}

.transition-option {
    &.active {
        background: rgba(59, 130, 246, 0.2);
        border-color: var(--brand-primary);
        color: var(--brand-primary);
    }
}
</style>

<style lang="scss">
.transition-popover {
    background: #141414 !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    padding: 0 !important;

    .el-popper__arrow::before {
        background: #141414 !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
    }
}
</style>
