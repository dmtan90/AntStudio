<template>
    <transition name="achievement-pop">
        <div v-if="visible" class="achievement-popup-container">
            <div class="achievement-card">
                <div class="glow-effect"></div>
                <div class="icon-section">
                    <trophy theme="filled" size="48" class="text-yellow-400" />
                    <div class="particles">
                        <div v-for="n in 5" :key="n" class="particle"></div>
                    </div>
                </div>
                <div class="text-content">
                    <div class="label">LEVEL UP!</div>
                    <div class="main-text">LEVEL {{ level }}</div>
                    <div class="sub-text">New rewards unlocked</div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Trophy } from '@icon-park/vue-next';
// import confetti from 'canvas-confetti'; // Optional: if available

const visible = ref(false);
const level = ref(1);

const handleLevelUp = (event: Event) => {
    const customEvent = event as CustomEvent;
    level.value = customEvent.detail.level;
    visible.value = true;
    
    // Auto-hide
    setTimeout(() => {
        visible.value = false;
    }, 4000);
};

onMounted(() => {
    window.addEventListener('gamification:levelup', handleLevelUp);
});

onUnmounted(() => {
    window.removeEventListener('gamification:levelup', handleLevelUp);
});
</script>

<style scoped lang="scss">
.achievement-popup-container {
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 200;
    pointer-events: none;
}

.achievement-card {
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(20px);
    border: 2px solid #ffd700;
    border-radius: 24px;
    padding: 24px 48px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    box-shadow: 0 0 50px rgba(255, 215, 0, 0.5);
    position: relative;
    overflow: hidden;
}

.glow-effect {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%);
    animation: rotate 10s linear infinite;
}

.icon-section {
    margin-bottom: 12px;
    position: relative;
    z-index: 2;
    animation: bounce 1s infinite alternate;
}

.text-content {
    position: relative;
    z-index: 2;
}

.label {
    font-size: 14px;
    font-weight: 900;
    color: #ffd700;
    letter-spacing: 4px;
    margin-bottom: 4px;
}

.main-text {
    font-size: 48px;
    font-weight: 900;
    color: white;
    text-shadow: 0 4px 10px rgba(0,0,0,0.5);
    line-height: 1;
    margin-bottom: 8px;
}

.sub-text {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.6);
    text-transform: uppercase;
    letter-spacing: 1px;
}

@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}

@keyframes bounce {
    from { transform: translateY(0); }
    to { transform: translateY(-10px); }
}

.achievement-pop-enter-active {
    animation: popIn 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.achievement-pop-leave-active {
    animation: popOut 0.4s ease-in;
}

@keyframes popIn {
    0% { transform: translate(-50%, -50%) scale(0) rotate(-10deg); opacity: 0; }
    100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); opacity: 1; }
}

@keyframes popOut {
    0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
}
</style>
