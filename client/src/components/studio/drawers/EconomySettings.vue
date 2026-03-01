<template>
    <div class="economy-settings flex flex-col gap-6 animate-in">
        <!-- Balance Header -->
        <div class="p-6 rounded-3xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/20 flex items-center justify-between">
            <div class="flex flex-col">
                <span class="text-[10px] font-black uppercase tracking-widest opacity-40">{{ $t('studio.drawers.economy.wallet.balance') }}</span>
                <span class="text-3xl font-black text-yellow-400">₵ {{ wallet?.balance || 0 }}</span>
            </div>
            <button @click="addCredits" class="p-3 rounded-2xl bg-yellow-500 hover:bg-yellow-400 text-black transition-all">
                <plus theme="filled" size="20" />
            </button>
        </div>

        <!-- Gift Catalog -->
        <section class="space-y-4">
            <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">{{ $t('studio.drawers.economy.giftCatalog') }}</h4>
            <div class="grid grid-cols-2 gap-3">
                <div v-for="item in catalog" :key="item.id" 
                    @click="buyItem(item)"
                    class="group relative p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-yellow-500/30 cursor-pointer transition-all overflow-hidden"
                >
                    <div class="absolute -right-2 -bottom-2 text-4xl opacity-[0.05] group-hover:opacity-10 transition-all rotate-12">
                        {{ item.icon }}
                    </div>
                    
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl">{{ item.icon }}</span>
                        <div class="flex flex-col">
                            <span class="text-[10px] font-bold">{{ item.name }}</span>
                            <span class="text-[8px] opacity-40 uppercase">{{ item.type }}</span>
                        </div>
                    </div>

                    <div class="flex items-center justify-between mt-4">
                        <span class="text-xs font-black text-yellow-500">₵ {{ item.cost }}</span>
                        <div class="p-1 px-2 rounded-lg bg-white/5 text-[8px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all">
                            {{ $t('studio.common.send') }}
                        </div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Powerups -->
        <section class="space-y-4">
             <h4 class="text-xs font-black opacity-30 uppercase tracking-widest">{{ $t('studio.drawers.economy.powerups') }}</h4>
             <div v-for="item in powerups" :key="item.id"
                class="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/5 flex items-center gap-4 cursor-pointer hover:border-purple-500/30 transition-all"
             >
                <div class="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-2xl">
                    {{ item.icon }}
                </div>
                <div class="flex-1">
                    <p class="text-[10px] font-bold">{{ item.name }}</p>
                    <p class="text-[8px] opacity-40">{{ item.description }}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-purple-400">₵ {{ item.cost }}</p>
                    <p class="text-[7px] font-black uppercase opacity-30">{{ $t('studio.common.unlock') }}</p>
                </div>
             </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { Plus } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';
import { useI18n } from 'vue-i18n';
import axios from 'axios';

const { t } = useI18n();

const catalog = ref<any[]>([]);
const wallet = ref<any>(null);

const powerups = computed(() => catalog.value.filter(i => i.type === 'powerup'));
const gifts = computed(() => catalog.value.filter(i => i.type === 'gift' || i.type === 'sticker'));

const fetchEconomy = async () => {
    try {
        const [catRes, wallRes] = await Promise.all([
            axios.get('/api/economy/catalog'),
            axios.get('/api/economy/wallet')
        ]);
        catalog.value = catRes.data;
        wallet.value = wallRes.data;
    } catch (e) {
        console.error('Failed to fetch economy:', e);
    }
};

const buyItem = async (item: any) => {
    if (wallet.value.balance < item.cost) {
        toast.error(t('studio.drawers.economy.insufficientCredits'));
        return;
    }

    try {
        await axios.post('/api/economy/purchase', { itemId: item.id });
        wallet.value.balance -= item.cost;
        toast.success(t('studio.drawers.economy.sentGift', { name: item.name }), {
            description: t('studio.drawers.economy.effectDescription', { effect: item.effectId || 'reaction' })
        });
    } catch (e: any) {
        toast.error(e.response?.data?.error || t('studio.drawers.economy.purchaseFailed'));
    }
};

const addCredits = async () => {
    try {
        const res = await axios.post('/api/economy/add-credits', { amount: 500 });
        wallet.value.balance = res.data.balance;
        toast.success(t('studio.drawers.economy.creditsAdded'));
    } catch (e) {
        toast.error(t('studio.drawers.economy.addCreditsFailed'));
    }
}

onMounted(fetchEconomy);
</script>

<style scoped lang="scss">
.economy-settings {
    .p-row {
        @include flex-center;
        justify-content: space-between;
    }
}
</style>
