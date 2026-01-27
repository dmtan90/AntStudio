<template>
  <div class="antflow-page">

    <!-- Hero Section -->
    <section id="overview" class="hero-cinematic">
      <div class="video-bg-container">
        <video 
          autoplay 
          muted 
          loop 
          playsinline 
          class="video-bg"
          :poster="heroBackground"
        >
          <source :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/RNDR_TunnelVidoes_stretched_005_1440x1080.mp4')" type="video/mp4">
        </video>
        <div class="video-overlay"></div>
      </div>

      <div class="hero-content">
        <transition name="fade-up" appear>
          <div class="hero-inner">
            <h1 class="glow-title">AntStudio</h1>
            <p class="hero-tagline">Where the next wave of storytelling happens with AI</p>
            <div class="action-row">
              <router-link to="/dashboard" class="hero-btn-primary">Start with AntStudio</router-link>
            </div>
          </div>
        </transition>
      </div>
    </section>

    <!-- App Intro -->
    <section class="app-intro">
      <div class="container">
        <h2 class="intro-title">AntStudio is an AI filmmaking tool built with and for creatives.</h2>
        <p class="intro-text">
          Seamlessly create cinematic clips, scenes and stories using <br />
          next-generation capable generative AI models.
        </p>
        
        <div class="app-frame glass">
          <div class="frame-content">
            <video 
              autoplay 
              muted 
              loop 
              playsinline 
              class="frame-video"
              :poster="heroBackground"
            >
              <source :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4')" type="video/mp4">
            </video>
            <div class="play-trigger">
              <play-one theme="filled" size="64" fill="#fff" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Tab Section -->
    <section id="capabilities" class="features-tabs">
      <div class="container">
        <div class="tab-triggers">
          <button 
            v-for="tab in featureTabs" 
            :key="tab.id"
            @click="activeFeature = tab.id"
            :class="{ active: activeFeature === tab.id }"
          >
            {{ tab.name }}
          </button>
        </div>
        
        <div class="tab-content">
          <transition name="fade-slide" mode="out-in">
            <div :key="activeFeature" class="feature-detail-v2">
              <div class="feature-info-box">
                <p class="feature-description">{{ currentFeature?.content }}</p>
              </div>
              <div class="feature-scroll-container">
                <div class="feature-video-track">
                  <div v-for="(vid, vIdx) in currentFeature?.videos" :key="vIdx" class="feature-video-card glass">
                    <video autoplay muted loop playsinline class="card-video">
                      <source :src="getFileUrl(vid)" type="video/mp4">
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </section>

    <!-- Partners Section -->
    <section id="partners" class="partners-section">
      <div class="container">
        <div class="section-top">
          <h2 class="section-title">Partners</h2>
        </div>
        
        <div class="partners-grid-v2">
          <div class="partner-card glass">
            <video autoplay muted loop playsinline class="partner-video">
              <source :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4')" type="video/mp4">
            </video>
            <div class="partner-info">
              <h3>Collaborating with the world's best creators</h3>
              <p>We work with leading filmmakers and studios to push the boundaries of what is possible with AI.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Gallery Section -->
    <section id="gallery" class="gallery-cinematic-focus">
      <div class="container-wide">
        <div class="gallery-header">
          <router-link to="/flow-gallery" class="watch-short-btn">Watch Short Films</router-link>
        </div>
        
        <div class="gallery-focus-grid">
          <div v-for="(img, idx) in galleryImages" :key="idx" class="gallery-focus-item" :class="{ 'focal': img.focal }">
            <div class="img-wrapper glass">
              <video 
                v-if="img.focal"
                autoplay 
                muted 
                loop 
                playsinline 
                class="gallery-video"
                :poster="getFileUrl(img.src)"
              >
                <source :src="getFileUrl(img.video)" type="video/mp4">
              </video>
              <img v-else :src="getFileUrl(img.src)" :alt="img.title" />
            </div>
            <div class="img-caption">{{ img.title }}</div>
          </div>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing" class="pricing-minimal">
      <div class="container">
        <h2 class="pricing-title">Start creating</h2>
        <p class="pricing-subtitle">Monthly credits reset at no charge or upgrade to one of our plans below.</p>
        
        <div class="pricing-grid">
          <!-- Plans -->
          <div v-for="plan in plans" :key="plan.name" class="price-item" :class="{ highlighted: plan.name === 'Pro' }">
            <div class="price-header">
              <div class="plan-name">{{ plan.name }}</div>
              <div class="plan-price">${{ plan.price }}/mo</div>
              <div v-if="plan.yearlyPrice" class="billing-cycle">Billed ${{ plan.yearlyPrice }}/year</div>
            </div>
            <ul class="plan-features">
              <li>{{ plan.name === 'Free' ? 'Keep it simple' : 'Everything in Free' }}</li>
              <li>${{ plan.features.monthlyCredits }} credits monthly</li>
              <li v-if="plan.features.prioritySupport">Priority support</li>
              <li v-if="plan.name === 'Enterprise'">Full 4K (4096x2304)</li>
              <!-- <li v-if="plan.name === 'Pro'">Veo 3 Pro cinematic model</li> -->
              <li v-if="plan.name === 'Pro' || plan.name === 'Enterprise'">Commercial rights</li>
            </ul>
          </div>
        </div>

        <!-- Credit Packages -->
        <!-- <h3 class="pricing-divider">Credit Packages</h3>
        <div class="pricing-grid credit-packages gap-0">
          <div v-for="pkg in creditPackages" :key="pkg.id" class="price-item package-item text-center">
            <div class="price-header">
              <div class="plan-price">${{ pkg.price }}</div>
            </div>
            <ul class="plan-features">
              <li>{{ pkg.credits }} credits</li>
              <li>One-time purchase</li>
            </ul>
          </div>
        </div> -->

        <div class="pricing-footer">
          <router-link to="/register" class="get-started-btn">Get Started</router-link>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="ant-footer">
      <div class="container footer-content">
        <div class="footer-left">AntStudio</div>
        <div class="footer-right">
          <router-link to="/privacy">Privacy</router-link>
          <router-link to="/terms">Terms of Service</router-link>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConfigStore } from '@/stores/config'
import { 
  PlayOne,
  Comments,
  Info,
  More
} from '@icon-park/vue-next'
import { getFileUrl } from '@/utils/api'

import heroBackground from '@/assets/images/hero_background.png'
import gallery7 from '@/assets/images/gallery_7.png'
import galleryMicroverse from '@/assets/images/gallery_microverse.png'
import gallery9 from '@/assets/images/gallery_9.png'
import galleryRocket from '@/assets/images/gallery_rocket.png'
import gallery10 from '@/assets/images/gallery_10.png'
import gallery11 from '@/assets/images/gallery_11.png'

const scrolled = ref(false)
const activeFeature = ref('consistent')
const activeSection = ref('overview')

const configStore = useConfigStore()
const { plans, creditPackages } = storeToRefs(configStore)

const featureTabs = [
  { 
    id: 'consistent', 
    name: 'Consistent', 
    content: 'Bring your own assets, or generate them in AntFlow. Then easily manage and reference them as you start to generate clips.',
    videos: [
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Consistent/16x9/01_Ingredients_Edit%201%2016x9_250516d.mp4',
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Consistent/16x9/02_Ingredients%20to%20video_Edit03_16x9_250516e.mp4',
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Consistent/16x9/03%20Frames%20to%20Video_250516a.mp4'
    ]
  },
  { 
    id: 'seamless', 
    name: 'Seamless', 
    content: 'Transition between scenes with mathematical precision. AI-powered world building that feels organic and immersive.',
    videos: [
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Seamless/16x9/04%20Scene%20Builder_250513c_1.mp4',
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Seamless/16x9/05_JumpTo_250516a.mp4'
    ]
  },
  { 
    id: 'cinematic', 
    name: 'Cinematic', 
    content: 'Elevate your story with world-class camera controls and cinematic models designed for the big screen.',
    videos: [
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Cinematic/16x9/07_CameraControls_Edit02%2016x9_250516e.mp4',
      'https://storage.googleapis.com/pinhole-about-assets-prod-us/Cinematic/16x9/08_VEO_Cinematic_Edit01_16x9_250516e.mp4'
    ]
  }
]

const currentFeature = computed(() => {
  return featureTabs.find(t => t.id === activeFeature.value)
})

const galleryImages = ref([
  { 
    src: gallery7, 
    title: 'ZOO BREAK', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/Animals-in-Random-Places.mp4',
    focal: false 
  },
  { 
    src: galleryMicroverse, 
    title: 'MICROVERSE', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/Under-the-Microscope.mp4',
    focal: true 
  },
  { 
    src: gallery9, 
    title: 'WINDOW SEAT', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/View-from-Train.mp4',
    focal: false 
  },
  { 
    src: galleryRocket, 
    title: 'COTTON SPACE', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/It_sAll-Yarn.mp4',
    focal: false 
  },
  { 
    src: gallery10, 
    title: 'GIRAFFE RUN', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/Tiny-Planet-Big-People.mp4',
    focal: false 
  },
  { 
    src: gallery11, 
    title: 'SAND WAVES', 
    video: 'https://storage.googleapis.com/pinhole-about-assets-prod-us/gallery/Queso-Mundo.mp4',
    focal: false 
  }
])

let galleryTimer: any = null

const rotateGallery = () => {
  const currentIndex = galleryImages.value.findIndex(img => img.focal)
  const nextIndex = (currentIndex + 1) % galleryImages.value.length
  
  galleryImages.value.forEach((img, idx) => {
    img.focal = idx === nextIndex
  })
}

const handleScroll = () => {
  scrolled.value = window.scrollY > 50
}

onMounted(() => {
  configStore.fetchPlans()
  window.addEventListener('scroll', handleScroll)
  galleryTimer = setInterval(rotateGallery, 4000)

  const observerOptions = {
    root: null,
    rootMargin: '-20% 0px -70% 0px',
    threshold: 0
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        activeSection.value = entry.target.id
      }
    })
  }, observerOptions)

  document.querySelectorAll('section[id]').forEach((section) => {
    observer.observe(section)
  })
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (galleryTimer) clearInterval(galleryTimer)
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap');

.antflow-page {
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background: #000;
  color: #fff;
  min-height: 100vh;
  scroll-behavior: smooth;
}

section {
  scroll-margin-top: 80px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
}


/* Hero Section */
.hero-cinematic {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.video-bg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.video-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.7) 100%);
}

.hero-content {
  position: relative;
  z-index: 10;
  text-align: center;
  margin-top: -50px;
}

.glow-title {
  font-size: clamp(80px, 15vw, 240px);
  font-weight: 800;
  margin: 0;
  line-height: 0.8;
  letter-spacing: -6px;
  background: linear-gradient(to bottom, #fff 40%, rgba(255,255,255,0.4));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: glow-blur 8s infinite alternate ease-in-out;
}

@keyframes glow-blur {
  0% {
    filter: blur(0px) drop-shadow(0 0 10px rgba(255,255,255,0));
    opacity: 1;
  }
  50% {
    filter: blur(4px) drop-shadow(0 0 30px rgba(255,255,255,0.4));
    opacity: 0.8;
  }
  100% {
    filter: blur(0px) drop-shadow(0 0 10px rgba(255,255,255,0));
    opacity: 1;
  }
}

.hero-tagline {
  font-size: 24px;
  font-weight: 400;
  margin-top: 40px;
  opacity: 0.9;
  letter-spacing: 0.5px;
}

.hero-btn-primary {
  display: inline-block;
  margin-top: 48px;
  padding: 18px 48px;
  background: #fff;
  color: #000;
  text-decoration: none;
  border-radius: 100px;
  font-weight: 700;
  font-size: 18px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.hero-btn-primary:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 20px 40px rgba(255,255,255,0.1);
}

/* Intro Section */
.app-intro {
  padding: 160px 0;
  text-align: center;
}

.intro-title {
  font-size: 48px;
  font-weight: 700;
  max-width: 800px;
  margin: 0 auto 32px;
  line-height: 1.1;
}

.intro-text {
  font-size: 20px;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
  margin-bottom: 80px;
}

.app-frame {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  overflow: hidden;
}

.frame-content {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  aspect-ratio: 16/9;
}

.frame-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.play-trigger {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s;
}

.play-trigger:hover {
  transform: translate(-50%, -50%) scale(1.1);
}

/* Features Tabs */
.features-tabs {
  padding: 120px 0;
}

.tab-triggers {
  display: flex;
  justify-content: flex-start;
  gap: 60px;
  margin-bottom: 60px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 20px;
}

.tab-triggers button {
  background: none;
  border: none;
  color: #fff;
  font-size: 32px;
  font-weight: 700;
  cursor: pointer;
  opacity: 0.3;
  transition: all 0.4s;
  padding: 0;
}

.tab-triggers button.active {
  opacity: 1;
}

.feature-detail-v2 {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.feature-info-box {
  max-width: 600px;
}

.feature-scroll-container {
  width: 100%;
  overflow-x: auto;
  padding-bottom: 20px;
  scrollbar-width: none;
}

.feature-scroll-container::-webkit-scrollbar {
  display: none;
}

.feature-video-track {
  display: flex;
  gap: 30px;
  width: max-content;
}

.feature-video-card {
  width: 600px;
  aspect-ratio: 16/9;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  transition: transform 0.4s;
}

.feature-video-card:hover {
  transform: scale(1.02);
}

/* Partners Section */
.partners-section {
  padding: 120px 0;
  background: #000;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 2px;
  opacity: 0.5;
  margin-bottom: 40px;
}

.partners-grid-v2 {
  width: 100%;
}

.partner-card {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  padding: 60px;
  overflow: hidden;
}

.partner-video {
  width: 100%;
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.partner-info h3 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
  line-height: 1.2;
}

.partner-info p {
  font-size: 18px;
  color: rgba(255,255,255,0.6);
  line-height: 1.6;
}

@media (max-width: 1024px) {
  .partner-card {
    grid-template-columns: 1fr;
    padding: 30px;
  }
}

/* Gallery Focus Layout */
.gallery-cinematic-focus {
  padding: 100px 0;
  background: #000;
}

.container-wide {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 40px;
}

.gallery-header {
  text-align: center;
  margin-bottom: 60px;
}

.watch-short-btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 10px 24px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 100px;
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s;
}

.watch-short-btn::before {
  content: '📺';
}

.watch-short-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: #fff;
}

.gallery-focus-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
  align-items: center;
}

.gallery-focus-item {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0.3;
  filter: blur(12px);
  transform: scale(0.85);
}

.gallery-focus-item.focal {
  opacity: 1;
  filter: blur(0);
  transform: scale(1.1);
  z-index: 10;
}

.img-wrapper {
  aspect-ratio: 16/9;
  overflow: hidden;
  border-radius: 20px;
  margin-bottom: 24px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.gallery-video, .img-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.img-caption {
  text-align: center;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.5);
  text-transform: uppercase;
}

.gallery-focus-item.focal .img-caption {
  color: #fff;
}

/* Pricing Minimal */
.pricing-minimal {
  padding: 160px 0;
  text-align: center;
}

.pricing-title {
  font-size: 56px;
  font-weight: 700;
  margin-bottom: 24px;
}

.pricing-subtitle {
  font-size: 18px;
  color: rgba(255,255,255,0.5);
  margin-bottom: 80px;
}

.pricing-divider {
  font-size: 24px;
  font-weight: 700;
  margin: 60px 0 40px;
  opacity: 0.8;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 20px;
}

.pricing-grid {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 40px;
  margin-bottom: 30px;
}

.pricing-grid.credit-packages {
  margin-top: 20px;
}

.price-item {
  flex: 1;
  min-width: 280px;
  max-width: 400px;
  text-align: left;
  border-top: 1px solid rgba(255,255,255,0.1);
  padding-top: 40px;
}

.price-header {
  margin-bottom: 40px;
}

.plan-name {
  font-size: 16px;
  font-weight: 500;
  opacity: 0.6;
  margin-bottom: 12px;
}

.plan-price {
  font-size: 48px;
  font-weight: 700;
}

.billing-cycle {
  font-size: 14px;
  opacity: 0.4;
  margin-top: 8px;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
}

.plan-features li {
  margin-bottom: 12px;
  font-size: 16px;
  color: rgba(255,255,255,0.7);
}

.price-item.highlighted {
  border-top-color: #fff;
}

.pricing-footer {
  margin-top: 40px;
}

.get-started-btn {
  display: inline-block;
  padding: 16px 40px;
  background: #fff;
  color: #000;
  text-decoration: none;
  border-radius: 100px;
  font-weight: 700;
  font-size: 18px;
  transition: transform 0.3s;
}

.get-started-btn:hover {
  transform: scale(1.05);
}

/* Footer */
.ant-footer {
  padding: 120px 0 40px;
  border-top: 1px solid rgba(255,255,255,0.1);
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left {
  font-size: 20px;
  font-weight: 600;
  opacity: 0.5;
}

.footer-right {
  display: flex;
  gap: 40px;
}

.footer-right a {
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  opacity: 0.5;
  transition: opacity 0.3s;
}

.footer-right a:hover {
  opacity: 1;
}

/* Transitions & Animations */
.fade-up-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

@media (max-width: 1024px) {
  .hero-inner h1 { font-size: 100px; }
  .feature-detail-v2 { grid-template-columns: 1fr; gap: 40px; }
  .pricing-grid { flex-direction: column; align-items: center; }
  .price-item { border-top: 1px solid rgba(255,255,255,0.1); width: 100%; }
}

@media (max-width: 768px) {
  .nav-links-center, .nav-right { display: none; }
  .gallery-focus-grid { grid-template-columns: 1fr; }
  .tab-triggers { gap: 30px; }
  .tab-triggers button { font-size: 24px; }
  .glow-title { font-size: 80px; }
}
</style>
