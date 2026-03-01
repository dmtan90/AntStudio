<template>
    <Teleport to="body">
        <Transition name="guide-fade">
            <div v-if="isActive" class="user-guide-overlay" @click.self="handleSkip">
                <!-- Spotlight Effect -->
                <div class="spotlight-mask" :style="spotlightStyle"></div>

                <!-- Guide Card -->
                <Transition name="guide-slide" mode="out-in">
                    <div :key="currentStepIndex" class="guide-card" :style="cardPosition as CSSProperties">
                        <!-- Header -->
                        <div class="guide-header">
                            <div class="flex items-center gap-3">
                                <div class="guide-icon">
                                    <Info theme="filled" class="text-yellow-400" />
                                </div>
                                <div>
                                    <h3 class="guide-title">{{ typeof currentStep.title === 'function' ? currentStep.title() : currentStep.title }}</h3>
                                    <p class="guide-subtitle">{{ $t('common.guide.step', { step: currentStepIndex + 1, total: steps.length }) }}</p>
                                </div>
                            </div>
                            <button @click="handleSkip" class="close-btn">
                                <Close theme="outline" />
                            </button>
                        </div>

                        <!-- Content -->
                        <div class="guide-content">
                            <p class="guide-description">{{ typeof currentStep.description === 'function' ? currentStep.description() : currentStep.description }}</p>
                            
                            <!-- Optional Image/GIF -->
                            <img v-if="currentStep.image" :src="currentStep.image" 
                                 class="guide-image" alt="Guide illustration" />
                            
                            <!-- Tips -->
                            <div v-if="currentStep.tip" class="guide-tip">
                                <Info theme="outline" class="tip-icon" />
                                <span>{{ typeof currentStep.tip === 'function' ? currentStep.tip() : currentStep.tip }}</span>
                            </div>
                        </div>

                        <!-- Footer -->
                        <div class="guide-footer">
                            <div class="step-indicators">
                                <div v-for="(step, idx) in steps" :key="idx" 
                                     class="step-dot"
                                     :class="{ active: idx === currentStepIndex, completed: idx < currentStepIndex }">
                                </div>
                            </div>
                            
                            <div class="guide-actions">
                                <button v-if="currentStepIndex > 0" @click="previousStep" class="btn-secondary">
                                    <span class="flex items-center gap-2">
                                        <Left theme="outline" />
                                        {{ $t('common.guide.back') }}
                                    </span>
                                </button>
                                <button v-if="currentStepIndex < steps.length - 1" @click="nextStep" class="btn-primary">
                                    <span class="flex items-center gap-2">
                                        {{ $t('common.guide.next') }}
                                        <Right theme="outline" />
                                    </span>
                                </button>
                                <button v-else @click="completeGuide" class="btn-success">
                                    <span class="flex items-center gap-2">
                                        <Check theme="outline" />
                                        {{ $t('common.guide.gotIt') }}
                                    </span>
                                </button>
                            </div>
                        </div>

                        <!-- Skip Link -->
                        <button @click="handleSkip" class="skip-link">
                            {{ $t('common.guide.skip') }}
                        </button>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { Close, Info, Left, Right, Check } from '@icon-park/vue-next';
import type { CSSProperties } from 'vue';

export interface GuideStep {
    title: string | (() => string);
    description: string | (() => string);
    target?: string; // CSS selector for element to highlight
    position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
    image?: string; // Optional illustration
    tip?: string | (() => string); // Optional tip
}

interface Props {
    steps: GuideStep[];
    storageKey: string; // LocalStorage key to track if guide was completed
    autoStart?: boolean; // Auto-start on mount if not completed
}

const props = withDefaults(defineProps<Props>(), {
    autoStart: true
});

const emit = defineEmits<{
    complete: [];
    skip: [];
}>();

const isActive = ref(false);
const currentStepIndex = ref(0);

const currentStep = computed(() => props.steps[currentStepIndex.value]);

const spotlightStyle = computed(() => {
    if (!currentStep.value.target) {
        return { clipPath: 'none' };
    }

    const element = document.querySelector(currentStep.value.target);
    if (!element) return { clipPath: 'none' };

    const rect = element.getBoundingClientRect();
    const padding = 8;

    return {
        clipPath: `polygon(
            0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
            ${rect.left - padding}px ${rect.top - padding}px,
            ${rect.left - padding}px ${rect.bottom + padding}px,
            ${rect.right + padding}px ${rect.bottom + padding}px,
            ${rect.right + padding}px ${rect.top - padding}px,
            ${rect.left - padding}px ${rect.top - padding}px
        )`
    };
});

const cardPosition = computed(() => {
    if (!currentStep.value.target || currentStep.value.position === 'center') {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    const element = document.querySelector(currentStep.value.target);
    if (!element) {
        return {
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)'
        };
    }

    const rect = element.getBoundingClientRect();
    const position = currentStep.value.position || 'bottom';
    const offset = 20;

    switch (position) {
        case 'top':
            return {
                position: 'fixed',
                bottom: `${window.innerHeight - rect.top + offset}px`,
                left: `${rect.left + rect.width / 2}px`,
                transform: 'translateX(-50%)'
            };
        case 'bottom':
            return {
                position: 'fixed',
                top: `${rect.bottom + offset}px`,
                left: `${rect.left + rect.width / 2}px`,
                transform: 'translateX(-50%)'
            };
        case 'left':
            return {
                position: 'fixed',
                top: `${rect.top + rect.height / 2}px`,
                right: `${window.innerWidth - rect.left + offset}px`,
                transform: 'translateY(-50%)'
            };
        case 'right':
            return {
                position: 'fixed',
                top: `${rect.top + rect.height / 2}px`,
                left: `${rect.right + offset}px`,
                transform: 'translateY(-50%)'
            };
        default:
            return {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
            };
    }
});

const nextStep = () => {
    if (currentStepIndex.value < props.steps.length - 1) {
        currentStepIndex.value++;
        scrollToTarget();
    }
};

const previousStep = () => {
    if (currentStepIndex.value > 0) {
        currentStepIndex.value--;
        scrollToTarget();
    }
};

const scrollToTarget = () => {
    if (currentStep.value.target) {
        const element = document.querySelector(currentStep.value.target);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
};

const completeGuide = () => {
    localStorage.setItem(props.storageKey, 'completed');
    isActive.value = false;
    emit('complete');
};

const handleSkip = () => {
    localStorage.setItem(props.storageKey, 'skipped');
    isActive.value = false;
    emit('skip');
};

const startGuide = () => {
    const status = localStorage.getItem(props.storageKey);
    if (!status && props.autoStart) {
        isActive.value = true;
        currentStepIndex.value = 0;
    }
};

const resetGuide = () => {
    localStorage.removeItem(props.storageKey);
    isActive.value = true;
    currentStepIndex.value = 0;
};

// Keyboard navigation
const handleKeydown = (e: KeyboardEvent) => {
    if (!isActive.value) return;
    
    if (e.key === 'Escape') {
        handleSkip();
    } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStepIndex.value < props.steps.length - 1) {
            nextStep();
        } else {
            completeGuide();
        }
    } else if (e.key === 'ArrowLeft') {
        previousStep();
    }
};

watch(() => currentStep.value.target, () => {
    scrollToTarget();
}, { immediate: true });

onMounted(() => {
    startGuide();
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});

defineExpose({
    startGuide,
    resetGuide,
    isActive
});
</script>

<style lang="scss" scoped>
.user-guide-overlay {
    position: fixed;
    inset: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
}

.spotlight-mask {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    pointer-events: none;
    transition: clip-path 0.3s ease;
}

.guide-card {
    width: 420px;
    max-width: 90vw;
    background: linear-gradient(135deg, rgba(30, 30, 40, 0.98), rgba(20, 20, 30, 0.98));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    z-index: 10000;
}

.guide-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.guide-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(250, 204, 21, 0.1);
    border-radius: 12px;
    font-size: 20px;
}

.guide-title {
    font-size: 16px;
    font-weight: 700;
    color: white;
    margin: 0;
}

.guide-subtitle {
    font-size: 11px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 4px 0 0 0;
}

.close-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.05);
    border: none;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
}

.guide-content {
    padding: 24px;
}

.guide-description {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.8);
    margin: 0 0 16px 0;
}

.guide-image {
    width: 100%;
    border-radius: 12px;
    margin-bottom: 16px;
}

.guide-tip {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    border-radius: 12px;
    font-size: 12px;
    color: rgba(147, 197, 253, 1);
}

.tip-icon {
    flex-shrink: 0;
    margin-top: 2px;
}

.guide-footer {
    padding: 20px 24px;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.step-indicators {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;
}

.step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transition: all 0.3s;

    &.active {
        width: 24px;
        border-radius: 4px;
        background: rgb(59, 130, 246);
    }

    &.completed {
        background: rgba(34, 197, 94, 0.6);
    }
}

.guide-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
}

.btn-secondary,
.btn-primary,
.btn-success {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    border: none;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-secondary {
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.8);

    &:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
    }
}

.btn-primary {
    background: rgb(59, 130, 246);
    color: white;

    &:hover {
        background: rgb(37, 99, 235);
    }
}

.btn-success {
    background: rgb(34, 197, 94);
    color: white;

    &:hover {
        background: rgb(22, 163, 74);
    }
}

.skip-link {
    display: block;
    width: 100%;
    padding: 12px;
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.4);
    font-size: 12px;
    font-weight: 600;
    text-align: center;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
        color: rgba(255, 255, 255, 0.6);
    }
}

// Transitions
.guide-fade-enter-active,
.guide-fade-leave-active {
    transition: opacity 0.3s ease;
}

.guide-fade-enter-from,
.guide-fade-leave-to {
    opacity: 0;
}

.guide-slide-enter-active,
.guide-slide-leave-active {
    transition: all 0.3s ease;
}

.guide-slide-enter-from {
    opacity: 0;
    transform: translateY(20px);
}

.guide-slide-leave-to {
    opacity: 0;
    transform: translateY(-20px);
}
</style>
