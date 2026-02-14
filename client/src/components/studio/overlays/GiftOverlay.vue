<template>
    <div class="gift-overlay pointer-events-none fixed inset-0 z-[2000] overflow-hidden">
        <transition-group name="gift-fly">
            <div v-for="gift in activeGifts" :key="gift.instanceId" 
                 class="absolute flex flex-col items-center"
                 :style="gift.style">
                <div class="text-[64px] filter drop-shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-bounce-custom">
                    {{ gift.icon }}
                </div>
                <div class="bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold border border-white/20 mt-2">
                    {{ gift.senderId }} sent {{ gift.name }}!
                </div>
            </div>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

interface ActiveGift {
    instanceId: string;
    senderId: string;
    name: string;
    icon: string;
    style: any;
}

const activeGifts = ref<ActiveGift[]>([]);

const handleGift = (event: Event) => {
    const customEvent = event as CustomEvent;
    const { senderId, item } = customEvent.detail;
    
    const instanceId = `gift_${Date.now()}_${Math.random()}`;
    
    // Random start position logic
    const startX = Math.random() * 80 + 10; // 10% to 90% width
    
    const newGift: ActiveGift = {
        instanceId,
        senderId,
        name: item.name,
        icon: item.icon,
        style: {
            left: `${startX}%`,
            bottom: '-10%',
            opacity: 1
        }
    };
    
    activeGifts.value.push(newGift);

    // Remove after animation (approx 4s)
    setTimeout(() => {
        const idx = activeGifts.value.findIndex(g => g.instanceId === instanceId);
        if (idx !== -1) activeGifts.value.splice(idx, 1);
    }, 4000);
};

onMounted(() => {
    window.addEventListener('economy:gift', handleGift);
});

onUnmounted(() => {
    window.removeEventListener('economy:gift', handleGift);
});
</script>

<style scoped>
.gift-fly-enter-active {
    animation: flyUp 4s ease-out forwards;
}

.gift-fly-leave-active {
    transition: opacity 0.5s;
}
.gift-fly-leave-to {
    opacity: 0;
}

@keyframes flyUp {
    0% { transform: translateY(0) scale(0.5) rotate(-10deg); opacity: 0; }
    10% { opacity: 1; transform: translateY(-10vh) scale(1) rotate(10deg); }
    50% { transform: translateY(-50vh) scale(1.2) rotate(-10deg); }
    100% { transform: translateY(-110vh) scale(1) rotate(10deg); opacity: 0; }
}

@keyframes bounce-custom {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}
</style>
