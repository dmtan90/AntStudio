<template>
    <div class="leaderboard-container glass-panel">
        <div class="header">
            <crown theme="filled" size="24" class="text-yellow-400" />
            <span class="title">TOP CONTRIBUTORS</span>
        </div>

        <div class="list">
            <div v-for="(user, index) in users" :key="user.id" class="user-row" :class="{ 'highlight': user.isMe }">
                <div class="rank" :class="getRankClass(index)">{{ index + 1 }}</div>
                <div class="avatar">
                    <img :src="user.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + user.id" />
                </div>
                <div class="info">
                    <div class="name">{{ user.name }}</div>
                    <div class="level">Lvl {{ user.level }}</div>
                </div>
                <div class="xp">{{ formatNumber(user.xp) }} XP</div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Crown } from '@icon-park/vue-next';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();

const users = computed(() => {
    return studioStore.leaderboardData.map(user => ({
        ...user,
        isMe: user.id === studioStore.myGuestId
    }));
});

onMounted(async () => {
    await studioStore.fetchLeaderboard();
});

const getRankClass = (index: number) => {
    if (index === 0) return 'gold';
    if (index === 1) return 'silver';
    if (index === 2) return 'bronze';
    return '';
};

const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", maximumFractionDigits: 1 }).format(num);
};
</script>

<style scoped lang="scss">
.leaderboard-container {
    width: 100%;
    /* max-width: 300px; */ /* Let parent control width */
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    padding: 16px;
    font-family: 'Inter', sans-serif;
}

.header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    
    .title {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 1px;
        color: rgba(255, 255, 255, 0.8);
    }
}

.user-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: 8px;
    margin-bottom: 4px;
    transition: all 0.2s;
    
    &:hover {
        background: rgba(255, 255, 255, 0.05);
    }
    
    &.highlight {
        background: rgba(64, 158, 255, 0.1);
        border: 1px solid rgba(64, 158, 255, 0.2);
    }
}

.rank {
    font-size: 14px;
    font-weight: 900;
    width: 20px;
    text-align: center;
    color: rgba(255, 255, 255, 0.4);
    
    &.gold { color: #ffd700; text-shadow: 0 0 10px rgba(255, 215, 0, 0.5); }
    &.silver { color: #c0c0c0; }
    &.bronze { color: #cd7f32; }
}

.avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    overflow: hidden;
    background: rgba(255, 255, 255, 0.1);
    
    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
}

.info {
    flex: 1;
    .name {
        font-size: 12px;
        font-weight: 700;
        color: white;
    }
    .level {
        font-size: 10px;
        color: rgba(255, 255, 255, 0.5);
    }
}

.xp {
    font-size: 12px;
    font-weight: 700;
    color: #409eff;
    font-family: monospace;
}
</style>
