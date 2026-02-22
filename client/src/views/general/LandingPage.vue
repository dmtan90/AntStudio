<template>
  <div class="landing-page bg-[#030303] text-white selection:bg-blue-500 selection:text-white">
    <!-- Global Navigation -->
    <nav class="fixed top-0 left-0 w-full z-[100] transition-all duration-500" :class="{ 'bg-black/80 backdrop-blur-2xl border-b border-white/5 py-4': scrolled, 'py-8': !scrolled }">
      <div class="container mx-auto px-6 flex justify-between items-center">
        <div class="flex items-center gap-2 group cursor-pointer" @click="$router.push('/')">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform overflow-hidden">
            <img v-if="uiStore.logo" :src="getFileUrl(uiStore.logo)" class="w-full h-full object-contain" />
            <camera-five v-else size="24" theme="filled" fill="#fff" />
          </div>
          <span class="text-xl font-black tracking-tighter uppercase group-hover:tracking-normal transition-all">{{ uiStore.appName }}</span>
        </div>

        <div class="hidden lg:flex items-center gap-10">
          <a v-for="link in ['Features', 'Enterprise', 'Partners', 'Pricing']" :key="link" href="#" class="text-[10px] font-black uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity">{{ link }}</a>
        </div>

        <div class="flex items-center gap-4">
          <button class="text-[10px] font-black uppercase tracking-widest px-6 py-2 rounded-xl hover:bg-white/5" @click="$router.push('/login')">Log In</button>
          <button class="primary-btn px-6 py-3 text-[10px] font-black rounded-xl shadow-xl shadow-blue-600/20" @click="$router.push('/signup')">GET STARTED</button>
        </div>
      </div>
    </nav>

    <!-- Content Sections -->
    <LandingHero />
    
    <div class="divider h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>

    <!-- Feature Parallax (Internal or Inline for simplicity) -->
    <section class="features-parallax py-32">
       <div class="container mx-auto px-6">
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center mb-40">
             <div class="content space-y-6">
                <h3 class="text-3xl font-black italic text-blue-400 uppercase tracking-widest">01. AI Production</h3>
                <h4 class="text-5xl font-black leading-tight">Cinematic Visuals <br/> from simple text.</h4>
                <p class="text-gray-400 leading-relaxed text-lg">Harness the power of Veo 3 and Imagen 3 to generate high-fidelity cinematic video and product photography instantly. No camera required.</p>
             </div>
             <div class="visual p-1 rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group">
                <img src="/bg/photo-1620641788421-7a1c342ea42e.jpg" alt="AI Production" class="w-full h-auto opacity-80 group-hover:scale-105 transition-transform duration-1000" />
                <div class="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
             </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center flex-row-reverse">
             <div class="visual order-2 lg:order-1 p-1 rounded-3xl bg-white/5 border border-white/10 overflow-hidden relative group">
                <img src="/bg/photo-1590602847861-f357a9332bbc.jpg" alt="Global Streaming" class="w-full h-auto opacity-80 group-hover:scale-105 transition-transform duration-1000" />
                <div class="absolute inset-0 bg-purple-500/10 mix-blend-overlay"></div>
             </div>
             <div class="content space-y-6 order-1 lg:order-2">
                <h3 class="text-3xl font-black italic text-purple-400 uppercase tracking-widest">02. Global Reach</h3>
                <h4 class="text-5xl font-black leading-tight">Stream to everywhere. <br/> in every language.</h4>
                <p class="text-gray-400 leading-relaxed text-lg">Broadcast to 40+ platforms simultaneously. Use real-time AI translation to reach global audiences in their native tongue.</p>
             </div>
          </div>
       </div>
    </section>

    <B2BShowcase />

    <!-- Corporate Footer -->
    <footer class="py-20 border-t border-white/5 relative overflow-hidden">
      <div class="container mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 relative z-10">
        <div class="brand-side space-y-4">
          <div class="flex items-center gap-2 opacity-100">
            <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden">
              <img v-if="uiStore.logo" :src="getFileUrl(uiStore.logo)" class="w-full h-full object-contain" />
              <camera-five v-else size="18" fill="#fff" />
            </div>
            <span class="text-xl font-black tracking-tighter uppercase">{{ uiStore.appName }}</span>
          </div>
          <p class="text-[10px] text-gray-500 leading-relaxed">The global infrastructure for next-gen broadcast and AI-driven content monetization.</p>
        </div>
        
        <div v-for="group in footerLinks" :key="group.title">
          <h5 class="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-white">{{ group.title }}</h5>
          <ul class="space-y-3">
            <li v-for="link in group.links" :key="link" class="text-[10px] font-bold text-gray-500 hover:text-blue-400 cursor-pointer transition-colors">{{ link }}</li>
          </ul>
        </div>
      </div>
      <div class="container mx-auto px-6 pt-20 flex justify-between items-center text-[8px] font-black uppercase tracking-widest text-gray-700">
        <p>© 2026 {{ uiStore.appName }} Systems. All rights reserved.</p>
        <div class="flex gap-6">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { CameraFive } from '@icon-park/vue-next';
import LandingHero from '@/components/marketing/LandingHero.vue';
import B2BShowcase from '@/components/marketing/B2BShowcase.vue';
import { useUIStore } from '@/stores/ui';
import { getFileUrl } from '@/utils/api';

const uiStore = useUIStore();

const scrolled = ref(false);

const handleScroll = () => {
    scrolled.value = window.scrollY > 50;
};

onMounted(() => {
    window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});

const footerLinks = [
  { title: 'Platform', links: ['Video Editor', 'AI Generator', 'Live Studio', 'Analytics'] },
  { title: 'Business', links: ['Enterprise', 'Reselling', 'Whitelabel', 'API Access'] },
  { title: 'Company', links: ['About Us', 'Careers', 'Contact', 'Blog'] }
];
</script>

<style lang="scss">
.primary-btn {
  background: #3b82f6;
  color: white;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  &:hover {
    transform: translateY(-2px);
    background: #2563eb;
    box-shadow: 0 20px 40px rgba(59, 130, 246, 0.2);
  }
}

.secondary-btn {
  color: white;
  transition: all 0.3s ease;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}

.animate-fade-in {
  animation: fadeIn 1s ease-out forwards;
}

.animate-fade-in-down {
  animation: fadeInDown 1s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
