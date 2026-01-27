<template>
  <div class="affiliate-dashboard p-6 animate-in">
    <header class="page-header flex justify-between items-start mb-8">
       <div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-2">Partner & Affiliate Hub</h1>
          <p class="text-gray-400">Scale the AntStudio ecosystem and earn commissions on every referral.</p>
       </div>
       <div v-if="affiliate" class="status-badge px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full">
          <span class="text-[10px] font-black uppercase text-green-400">{{ affiliate.status }} PARTNER</span>
       </div>
    </header>

    <div v-if="!affiliate" class="onboarding-gate max-w-2xl mx-auto text-center py-20 bg-white/5 rounded-3xl border border-white/10">
       <div class="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-400">
          <peoples size="40" />
       </div>
       <h2 class="text-2xl font-black mb-4">Join the AntStudio Partner Program</h2>
       <p class="text-gray-400 mb-8 px-12">Earn a 20% recurring commission for every user or business you refer to the platform. No caps, no limits.</p>
       <button class="primary-btn px-12 py-4 text-sm font-black" @click="joinProgram">BECOME A PARTNER NOW</button>
    </div>

    <div v-else class="grid grid-cols-12 gap-6">
       <!-- Stat Row -->
       <div class="col-span-12 grid grid-cols-4 gap-6 mb-4">
          <div v-for="(val, key) in statCards" :key="key" class="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden">
             <div class="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div>
             <p class="text-[10px] font-black uppercase opacity-40 mb-2">{{ key }}</p>
             <p class="text-2xl font-black text-white">{{ val }}</p>
          </div>
       </div>

       <!-- Left: Referral Engine -->
       <div class="col-span-12 lg:col-span-8 space-y-6">
          <section class="glass-card p-8 rounded-2xl border border-white/5">
             <h3 class="text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                <share-two theme="outline" /> Your Referral Engine
             </h3>
             <div class="space-y-6">
                <div class="link-box p-4 bg-black/40 border border-white/10 rounded-xl flex items-center gap-4">
                   <div class="flex-1">
                      <p class="text-[10px] opacity-40 font-black mb-1">YOUR UNIQUE PARTNER LINK</p>
                      <code class="text-blue-400 font-mono text-sm">{{ referralLink }}</code>
                   </div>
                   <button class="action-btn px-6 py-2 text-[10px] font-black" @click="copyLink">COPY LINK</button>
                </div>
                <div class="grid grid-cols-2 gap-4">
                   <div class="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2">COMMISSION RATE</p>
                      <p class="text-lg font-bold">{{ affiliate.commissionRate }}% <span class="text-[10px] opacity-50">Recurring</span></p>
                   </div>
                   <div class="p-4 bg-white/5 rounded-xl border border-white/5">
                      <p class="text-[10px] font-black opacity-30 mb-2">COOKIE DURATION</p>
                      <p class="text-lg font-bold">30 Days</p>
                   </div>
                </div>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <div class="flex justify-between items-center mb-6">
                <h3 class="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <history theme="outline" /> Recent Commissions
                </h3>
                <button class="text-[10px] font-bold opacity-40 hover:opacity-100">VIEW ALL</button>
             </div>
             <div class="space-y-2">
                <div v-for="i in 3" :key="i" class="commission-item p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                   <div class="flex items-center gap-4">
                      <div class="w-10 h-10 rounded bg-green-500/10 flex items-center justify-center text-green-400"><check-one /></div>
                      <div>
                         <p class="text-xs font-bold">Pro Plan Subscription Renewal</p>
                         <p class="text-[10px] opacity-40">User: user_4921... • 12 Jan 2026</p>
                      </div>
                   </div>
                   <div class="text-right">
                      <p class="text-sm font-black text-green-400">+$29.50</p>
                      <p class="text-[8px] uppercase font-black opacity-30">APPROVED</p>
                   </div>
                </div>
             </div>
          </section>
       </div>

       <!-- Right: Financials -->
       <div class="col-span-12 lg:col-span-4 space-y-6">
          <section class="glass-card p-8 rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 to-transparent">
             <h3 class="text-[10px] font-black uppercase opacity-60 mb-6 tracking-widest text-center">WALLET BALANCE</h3>
             <div class="text-center mb-8">
                <p class="text-4xl font-black text-white mb-2">${{ affiliate.balance.unpaid }}</p>
                <p class="text-[10px] font-black text-blue-400">AVAILABLE FOR WITHDRAWAL</p>
             </div>
             <button class="primary-btn w-full py-4 text-xs font-black mb-4">REQUEST PAYOUT</button>
             <div class="p-4 bg-black/40 rounded-xl border border-white/5 text-center">
                <p class="text-[8px] opacity-40 font-black mb-1">TOTAL LIFETIME EARNINGS</p>
                <p class="text-lg font-black">${{ affiliate.balance.totalEarned }}</p>
             </div>
          </section>

          <section class="glass-card p-6 rounded-2xl border border-white/5">
             <h3 class="text-xs font-black mb-4 opacity-50 uppercase tracking-widest">Growth Tips</h3>
             <ul class="space-y-4">
                <li class="flex gap-3 items-start">
                   <div class="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0"><lightning size="12" /></div>
                   <p class="text-[10px] leading-relaxed opacity-60">Share your referral link on platforms like ProductHunt or Reddit to attract SaaS early adopters.</p>
                </li>
                <li class="flex gap-3 items-start">
                   <div class="w-6 h-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0"><video-two size="12" /></div>
                   <p class="text-[10px] leading-relaxed opacity-60">Create a "How-to" video on YouTube showing AntFlow's AI capabilities with your link in the bio.</p>
                </li>
             </ul>
          </section>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Peoples, ShareTwo, History, CheckOne, Lightning, VideoTwo } from '@icon-park/vue-next';
import { toast } from 'vue-sonner';

// Mock Data
const affiliate = ref<any>({
  status: 'active',
  referralCode: 'agent77',
  commissionRate: 20,
  metrics: { totalClicks: 1240, conversions: 84, totalRevenueGenerated: 12840 },
  balance: { unpaid: 450.00, totalEarned: 2480.00 }
});

const referralLink = computed(() => `https://antstudio.ai/?ref=${affiliate.value?.referralCode}`);

const statCards = computed(() => ({
  'Total Traffic': affiliate.value?.metrics.totalClicks || 0,
  'Conversions': affiliate.value?.metrics.conversions || 0,
  'Revenue Generated': `$${affiliate.value?.metrics.totalRevenueGenerated.toLocaleString()}`,
  'Conversion Rate': `${((affiliate.value?.metrics.conversions / affiliate.value?.metrics.totalClicks) * 100).toFixed(1)}%`
}));

const joinProgram = () => {
    toast.success("Welcome aboard! Your partner profile has been created.");
    // In real app, call POST /api/affiliate/join
};

const copyLink = () => {
    navigator.clipboard.writeText(referralLink.value);
    toast.success("Partner link copied to clipboard!");
};
</script>

<style lang="scss" scoped>
.glass-card {
    backdrop-filter: blur(20px);
}
</style>
