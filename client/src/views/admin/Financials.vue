<template>
    <div class="financial-dashboard p-8 animate-in">
        <header class="flex justify-between items-start mb-12">
            <div>
                <h1 class="text-4xl font-black tracking-tighter text-white mb-2">FINANCIAL OVERSEER</h1>
                <p class="text-[10px] font-bold uppercase tracking-[0.2em] text-green-500">Revenue Stream Intelligence
                </p>
            </div>
            <div class="flex gap-4">
                <button
                    class="px-6 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase hover:bg-white/10 transition-all">Download
                    CSV</button>
            </div>
        </header>

        <div class="grid grid-cols-12 gap-8 mb-12">
            <!-- STATS -->
            <div class="col-span-3 bg-white/5 border border-white/5 rounded-3xl p-8 relative overflow-hidden group">
                <div class="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <chart-line theme="outline" size="64" />
                </div>
                <p class="text-[10px] font-black uppercase text-gray-500 mb-2">Monthly Recurring Revenue</p>
                <h2 class="text-4xl font-black text-white">{{ formatCurrency(stats.mrr) }}</h2>
                <div class="flex items-center gap-2 mt-4 text-green-400">
                    <trending-up theme="outline" />
                    <span class="text-xs font-bold">+12.4% vs last month</span>
                </div>
            </div>

            <div class="col-span-3 bg-white/5 border border-white/5 rounded-3xl p-8">
                <p class="text-[10px] font-black uppercase text-gray-500 mb-2">Active Subscribers</p>
                <h2 class="text-4xl font-black text-white">{{ stats.subscribers }}</h2>
                <div class="flex items-center gap-2 mt-4 text-blue-400">
                    <people theme="outline" />
                    <span class="text-xs font-bold">142 New this week</span>
                </div>
            </div>

            <div class="col-span-3 bg-white/5 border border-white/5 rounded-3xl p-8">
                <p class="text-[10px] font-black uppercase text-gray-500 mb-2">Transaction Volume</p>
                <h2 class="text-4xl font-black text-white">{{ formatCompact(stats.volume) }}</h2>
                <div class="flex items-center gap-2 mt-4 text-gray-400">
                    <history theme="outline" />
                    <span class="text-xs font-bold">Lifetime Gross</span>
                </div>
            </div>

            <div class="col-span-3 bg-white/5 border border-white/5 rounded-3xl p-8">
                <p class="text-[10px] font-black uppercase text-gray-500 mb-2">Churn Rate</p>
                <h2 class="text-4xl font-black text-red-400">{{ stats.churn }}%</h2>
                <div class="flex items-center gap-2 mt-4 text-red-400/60">
                    <attention theme="outline" />
                    <span class="text-xs font-bold">Within Acceptable Limits</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-12 gap-8 h-[500px]">
            <!-- RECENT TRANSACTIONS -->
            <div class="col-span-8 bg-white/5 border border-white/5 rounded-3xl overflow-hidden flex flex-col">
                <div class="p-8 border-b border-white/5 bg-black/20 flex justify-between items-center">
                    <h3 class="text-sm font-black uppercase tracking-widest">Global Ledger</h3>
                    <div class="flex gap-2">
                        <span class="flex items-center gap-2 text-[10px] uppercase font-bold text-green-400">
                            <div class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div> Live Feed
                        </span>
                    </div>
                </div>
                <div class="flex-1 overflow-y-auto">
                    <table class="w-full text-left">
                        <thead
                            class="bg-white/5 text-[10px] font-black uppercase text-gray-500 sticky top-0 backdrop-blur-md">
                            <tr>
                                <th class="p-6">Transaction ID</th>
                                <th class="p-6">Customer Context</th>
                                <th class="p-6">Type</th>
                                <th class="p-6">Amount</th>
                                <th class="p-6">Status</th>
                                <th class="p-6 text-right">Gateway</th>
                            </tr>
                        </thead>
                        <tbody class="text-xs font-medium">
                            <tr v-for="tx in transactions" :key="tx._id"
                                class="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                <td class="p-6 font-mono opacity-60">{{ tx.gatewayTransactionId }}</td>
                                <td class="p-6 text-white font-bold">{{ tx.userId?.email || 'System' }}</td>
                                <td class="p-6 uppercase text-[10px] tracking-wider">{{ tx.type.replace('_', ' ') }}
                                </td>
                                <td class="p-6 font-mono text-green-400 text-sm whitespace-nowrap">+ ${{
                                    tx.amount.toFixed(2) }}</td>
                                <td class="p-6">
                                    <span
                                        :class="['px-2 py-1 rounded text-[8px] font-black uppercase',
                                            tx.status === 'completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400']">
                                        {{ tx.status }}
                                    </span>
                                </td>
                                <td class="p-6 text-right uppercase text-[10px] font-bold opacity-40">{{ tx.gateway }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- TIER DISTRIBUTION -->
            <div class="col-span-4 bg-white/5 border border-white/5 rounded-3xl p-8 flex flex-col">
                <h3 class="text-sm font-black uppercase tracking-widest mb-8">Fleet Distribution</h3>
                <div class="flex-1 flex flex-col justify-center space-y-6">

                    <div v-for="tier in tiers" :key="tier.name" class="space-y-2">
                        <div class="flex justify-between items-center text-xs font-bold text-gray-400 uppercase">
                            <span>{{ tier.name }}</span>
                            <span class="text-white">{{ tier.count }} Units</span>
                        </div>
                        <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                            <div class="h-full rounded-full transition-all duration-1000"
                                :style="{ width: `${tier.percentage}%`, backgroundColor: tier.color }"></div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ChartLine, TrendingUp, People, History, Attention } from '@icon-park/vue-next';
import api from '@/utils/api';

const transactions = ref<any[]>([]);
const stats = ref<{
    mrr: number;
    subscribers: number;
    volume: number;
    churn: number;
    distribution?: {
        enterprise: number;
        pro: number;
        basic: number;
    };
}>({
    mrr: 0,
    subscribers: 0,
    volume: 0,
    churn: 0
});

const tiers = ref([
    { name: 'Enterprise', count: 124, percentage: 15, color: '#a855f7' },
    { name: 'Pro', count: 842, percentage: 45, color: '#3b82f6' },
    { name: 'Basic', count: 1240, percentage: 40, color: '#22c55e' }
]);

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
};

const formatCompact = (value: number) => {
    return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
};

const fetchData = async () => {
    try {
        const [statsRes, txRes] = await Promise.all([
            api.get('/payment/admin/stats'),
            api.get('/payment/admin/transactions')
        ]);
        
        stats.value = (statsRes.data || statsRes) as any; 
        transactions.value = ((txRes as any).data?.transactions || (txRes as any).transactions || []) as any[];

        // Update distribution
        if (stats.value.distribution) {
            const dist = stats.value.distribution;
            const total = (dist.enterprise || 0) + (dist.pro || 0) + (dist.basic || 0) || 1;
            
            tiers.value = [
                { name: 'Enterprise', count: dist.enterprise || 0, percentage: ((dist.enterprise || 0) / total) * 100, color: '#a855f7' },
                { name: 'Pro', count: dist.pro || 0, percentage: ((dist.pro || 0) / total) * 100, color: '#3b82f6' },
                { name: 'Basic', count: dist.basic || 0, percentage: ((dist.basic || 0) / total) * 100, color: '#22c55e' }
            ];
        }
    } catch (e) {
        console.error('Failed to fetch financial data', e);
    }
};

onMounted(fetchData);
</script>

<style scoped>
.financial-dashboard {
    min-height: 100vh;
    background: radial-gradient(circle at bottom center, rgba(16, 185, 129, 0.05), transparent 40%);
}
</style>
