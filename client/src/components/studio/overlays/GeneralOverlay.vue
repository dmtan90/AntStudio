<template>
  <div class="general-overlay absolute inset-0 pointer-events-none">
    <!-- Hovering Social Notifications (Top Right) -->
    <div class="absolute top-8 right-8 space-y-4 pointer-events-auto">
        <TransitionGroup name="social-pop">
           <div v-for="notif in socialNotifs" :key="notif.id" class="flex items-center gap-4 rounded-2xl bg-white/10 border border-white/10 p-4 shadow-xl backdrop-blur-2xl">
              <div class="h-10 w-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-white">
                 <svg v-if="notif.type === 'gift'" viewBox="0 0 24 24" class="h-6 w-6"><path fill="currentColor" d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.65-.5-.65C10.96 2.54 10.05 2 9 2c-1.66 0-3 1.34-3 3 0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2z"/></svg>
                 <svg v-else viewBox="0 0 24 24" class="h-6 w-6"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
              </div>
              <div>
                 <p class="text-xs font-black text-white leading-none mb-1">{{ notif.title }}</p>
                 <p class="text-[10px] font-medium text-white/50">{{ notif.desc }}</p>
              </div>
           </div>
        </TransitionGroup>
    </div>

    <!-- Active Poll (Top Left) -->
    <div v-if="data.activePoll" class="absolute top-8 left-8 w-64 pointer-events-auto rounded-2xl border border-white/5 bg-[#0a0a0f]/80 p-6 shadow-2xl backdrop-blur-3xl animate-in slide-in-from-left duration-500">
       <span class="text-[8px] font-black uppercase tracking-widest text-primary mb-2 block">Live Poll</span>
       <h5 class="text-xs font-black text-white leading-tight mb-4">{{ data.activePoll.question }}</h5>
       <div class="space-y-2">
          <div v-for="(opt, idx) in data.activePoll.options" :key="idx" class="relative h-8 rounded-lg bg-white/5 border border-white/5 overflow-hidden flex items-center px-4">
             <div class="absolute inset-y-0 left-0 bg-primary/20 transition-all duration-1000" :style="{ width: `${data.activePoll.results[idx]}%` }"></div>
             <span class="relative z-10 text-[10px] font-bold text-white/80 flex-1">{{ opt }}</span>
             <span class="relative z-10 text-[10px] font-black text-white">{{ data.activePoll.results[idx] }}%</span>
          </div>
       </div>
    </div>

    <!-- Floating Chat (Bottom Left) -->
    <div class="absolute bottom-10 left-10 w-[450px] h-72 pointer-events-auto flex flex-col gap-4">
       <div class="flex-1 overflow-hidden rounded-[2.5rem] border border-white/5 bg-black/20 p-8 shadow-2xl backdrop-blur-3xl">
          <div class="space-y-6">
             <div v-for="msg in messages" :key="msg.id" class="flex gap-4">
                <div class="h-10 w-10 rounded-full bg-white/5 border border-white/5 overflow-hidden">
                   <img :src="`https://i.pravatar.cc/40?u=${msg.user}`" class="h-full w-full object-cover" />
                </div>
                <div class="flex-1">
                   <div class="flex items-center gap-2 mb-1">
                      <span class="text-sm font-black text-white">{{ msg.user }}</span>
                      <span v-if="msg.badge" class="px-1.5 py-0.5 rounded-md bg-white/10 text-[8px] font-black uppercase text-white/40 tracking-widest">{{ msg.badge }}</span>
                   </div>
                   <p class="text-sm font-medium text-white/70 leading-relaxed">{{ msg.text }}</p>
                </div>
             </div>
          </div>
       </div>

       <!-- Interaction Bar -->
       <div class="flex items-center gap-4 px-6 h-16 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-2xl">
          <input type="text" placeholder="Send a message..." class="flex-1 bg-transparent border-none text-sm font-medium text-white focus:outline-none placeholder:text-white/20" />
          <div class="flex items-center gap-3">
             <button class="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/40 hover:text-white transition-all">
                <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
             </button>
             <button class="h-10 w-10 flex items-center justify-center rounded-xl bg-primary text-white shadow-lg active:scale-95 transition-transform">
                <svg viewBox="0 0 24 24" class="h-5 w-5"><path fill="currentColor" d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
             </button>
          </div>
       </div>
    </div>

    <!-- AI Engagement Stats (Bottom Right) -->
    <div class="absolute bottom-10 right-10 pointer-events-auto">
       <div class="flex items-center gap-8 rounded-[2rem] border border-white/5 bg-black/40 p-6 px-10 shadow-2xl backdrop-blur-3xl">
          <div class="flex flex-col items-center">
             <span class="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Hype</span>
             <div class="h-12 w-1 bg-white/5 rounded-full overflow-hidden flex flex-col justify-end">
                <div class="w-full bg-pink-500 shadow-[0_0_15px_#ec4899] transition-all duration-1000" :style="{ height: `${data.engagement}%` }"></div>
             </div>
          </div>
          <div class="flex flex-col">
             <h4 class="text-xs font-black uppercase tracking-widest text-white/60 mb-1">Audience Impact</h4>
             <p class="text-2xl font-black text-white">{{ (data.engagement * 45000).toLocaleString() }} <span class="text-xs font-bold text-green-400">🔥</span></p>
             <div class="mt-2 flex items-center gap-2">
                <div v-for="i in 5" :key="i" class="h-1.5 w-6 rounded-full bg-white/5 overflow-hidden">
                   <div class="h-full bg-primary" :style="{ width: `${data.engagement * (0.5 + Math.random() * 0.5)}%` }"></div>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useStudioStore } from '@/stores/studio';

const studioStore = useStudioStore();
const data = computed(() => studioStore.contextData.general);

const socialNotifs = ref([
  { id: 1, type: 'gift', title: 'Gift Received!', desc: 'User99 sent a Rose' },
  { id: 2, type: 'like', title: 'Viral Moment!', desc: 'Session reached 1k likes' }
]);

const messages = [
  { id: 1, user: 'Nova_Cloud', text: 'This design is absolutely insane!', badge: 'Subscriber' },
  { id: 2, user: 'DevLink', text: 'How did you build the glassmorphism effect?', badge: 'Mod' },
];
</script>

<style scoped>
.social-pop-enter-active, .social-pop-leave-active {
  transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.social-pop-enter-from {
  transform: translateX(100px) scale(0.8);
  opacity: 0;
}
.social-pop-leave-to {
  transform: translateX(100px) scale(0.8);
  opacity: 0;
}
</style>
