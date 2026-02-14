<template>
    <div class="gifts-overlay fixed inset-0 pointer-events-none z-[100] flex flex-col items-center justify-start pt-24 gap-4">
        <transition-group name="gift-float">
            <div v-for="gift in activeGifts" :key="gift.id" 
                 class="gift-notification flex items-center gap-4 px-6 py-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div class="gift-icon-container relative">
                    <span class="text-4xl animate-bounce-slow inline-block">{{ gift.item.icon }}</span>
                    <div class="absolute -inset-2 bg-yellow-500/20 blur-xl rounded-full"></div>
                </div>
                
                <div class="flex flex-col">
                    <div class="flex items-center gap-2">
                        <span class="text-xs font-black text-white uppercase tracking-tight">{{ gift.senderId.substring(0, 8) }}</span>
                        <span class="text-[10px] font-bold text-yellow-500 uppercase tracking-widest">SENT A GIFT</span>
                    </div>
                    <span class="text-lg font-black text-white leading-tight">{{ gift.item.name }}</span>
                </div>
                
                <div class="ml-4 pl-4 border-l border-white/10">
                    <span class="text-xs italic text-white/60">"{{ getVibeMessage(gift.item.id) }}"</span>
                </div>
            </div>
        </transition-group>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { ActionSyncService } from '@/utils/ai/ActionSyncService';

interface IncomingGift {
    id: string;
    senderId: string;
    item: {
        id: string;
        name: string;
        icon: string;
    };
    timestamp: number;
}

const activeGifts = ref<IncomingGift[]>([]);
const MAX_GIFTS = 3;
const DISPLAY_DURATION = 5000;

const getVibeMessage = (itemId: string) => {
    const messages: Record<string, string[]> = {
        'gift_coffee': ['Energy boost!', 'Stay awake!', 'Brewing magic...'],
        'gift_rose': ['So much love!', 'Beautiful!', 'Blooming...'],
        'gift_rocket': ['To the moon!', 'Full speed ahead!', 'Blast off!'],
        'sticker_gg': ['Good game!', 'Well played!', 'GGWP'],
        'sticker_fire': ['That\'s hot!', 'Burning up!', 'Fire!']
    };
    const pool = messages[itemId] || ['Awesome!'];
    return pool[Math.floor(Math.random() * pool.length)];
};

const handleGiftReceived = (data: any) => {
    const newGift: IncomingGift = {
        id: Math.random().toString(36).substr(2, 9),
        senderId: data.senderId,
        item: data.item,
        timestamp: Date.now()
    };

    activeGifts.value.push(newGift);
    if (activeGifts.value.length > MAX_GIFTS) {
        activeGifts.value.shift();
    }

    setTimeout(() => {
        activeGifts.value = activeGifts.value.filter(g => g.id !== newGift.id);
    }, DISPLAY_DURATION);
};

onMounted(() => {
    const socket = ActionSyncService.getSocket();
    if (socket) {
        socket.on('economy:gift_received', handleGiftReceived);
    }
});

onUnmounted(() => {
    const socket = ActionSyncService.getSocket();
    if (socket) {
        socket.off('economy:gift_received', handleGiftReceived);
    }
});
</script>

<style scoped>
.gift-float-enter-active {
    transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.gift-float-leave-active {
    transition: all 0.4s cubic-bezier(0.4, 0, 1, 1);
}

.gift-float-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.8);
}
.gift-float-leave-to {
    opacity: 0;
    transform: translateY(-20px) scale(0.9);
}

.animate-bounce-slow {
    animation: bounce-slow 2s infinite;
}

@keyframes bounce-slow {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
}

.gift-notification {
    box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5), 
                0 0 20px -5px rgba(234, 179, 8, 0.2);
}
</style>
