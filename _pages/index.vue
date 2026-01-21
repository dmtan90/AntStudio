<template>
  <div class="antflow-page">
    <nav class="fixed-nav" :class="{ 'scrolled': scrolled }">
      <div class="nav-container">
        <div class="nav-left">
          <div class="brand">AntFlow</div>
        </div>
        <div class="nav-links-center">
          <a href="#overview" class="nav-link" :class="{ active: activeSection === 'overview' }">Overview</a>
          <a href="#capabilities" class="nav-link" :class="{ active: activeSection === 'capabilities' }">Capabilities</a>
          <a href="#partners" class="nav-link" :class="{ active: activeSection === 'partners' }">Partners</a>
          <a href="#gallery" class="nav-link" :class="{ active: activeSection === 'gallery' }">Gallery</a>
          <a href="#pricing" class="nav-link" :class="{ active: activeSection === 'pricing' }">Pricing</a>
        </div>
        <div class="nav-right">
          <a href="#" class="nav-icon"><comments theme="outline" size="20" fill="#fff" /></a>
          <a href="#" class="nav-icon"><info theme="outline" size="20" fill="#fff" /></a>
          <a href="#" class="nav-icon"><more theme="outline" size="20" fill="#fff" /></a>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section id="overview" class="hero-cinematic">
      <div class="video-bg-container">
        <!-- Using a high-quality placeholder image that looks like a video frame or a sample video URL -->
        <video 
          autoplay 
          muted 
          loop 
          playsinline 
          class="video-bg"
          :poster="heroBackground"
        >
          <source src="https://storage.googleapis.com/pinhole-about-assets-prod-us/RNDR_TunnelVidoes_stretched_005_1440x1080.mp4" type="video/mp4">
        </video>
        <div class="video-overlay"></div>
      </div>

      <div class="hero-content">
        <transition name="fade-up" appear>
          <div class="hero-inner">
            <h1 class="glow-title">AntFlow</h1>
            <p class="hero-tagline">Where the next wave of storytelling happens with AI</p>
            <div class="action-row">
              <NuxtLink to="/dashboard" class="hero-btn-primary">Start with AntFlow</NuxtLink>
            </div>
          </div>
        </transition>
      </div>
    </section>

    <!-- App Intro -->
    <section class="app-intro">
      <div class="container">
        <h2 class="intro-title">AntFlow is an AI filmmaking tool built with and for creatives.</h2>
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
              <source src="https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4" type="video/mp4">
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
                <p class="feature-description">{{ currentFeature.content }}</p>
              </div>
              <div class="feature-scroll-container">
                <div class="feature-video-track">
                  <div v-for="(vid, vIdx) in currentFeature.videos" :key="vIdx" class="feature-video-card glass">
                    <video autoplay muted loop playsinline class="card-video">
                      <source :src="vid" type="video/mp4">
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>
      </div>
    </section>

    <!-- Gallery Section -->
    <section id="gallery" class="gallery-cinematic-focus">
      <div class="container-wide">
        <div class="gallery-header">
          <NuxtLink to="/flow-gallery" class="watch-short-btn">Watch Short Films</NuxtLink>
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
                :poster="img.src"
              >
                <source :src="img.video" type="video/mp4">
              </video>
              <img v-else :src="img.src" :alt="img.title" />
            </div>
            <div class="img-caption">{{ img.title }}</div>
          </div>
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
              <source src="https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4" type="video/mp4">
            </video>
            <div class="partner-info">
              <h3>Collaborating with the world's best creators</h3>
              <p>We work with leading filmmakers and studios to push the boundaries of what is possible with AI.</p>
            </div>
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
          <!-- Free Plan -->
          <div class="price-item">
            <div class="price-header">
              <div class="plan-name">Free</div>
              <div class="plan-price">$0/mo</div>
            </div>
            <ul class="plan-features">
              <li>Keep it simple</li>
              <li>Veo 3.0 access</li>
              <li>Text to Video</li>
              <li>Image to Video</li>
              <li>Up to 120s videos</li>
              <li>Scene Analysis</li>
              <li>Basic support</li>
              <li>720p Rendering</li>
              <li>Free credits monthly</li>
            </ul>
          </div>

          <!-- Pro Plan -->
          <div class="price-item highlighted">
            <div class="price-header">
              <div class="plan-name">Pro</div>
              <div class="plan-price">$124.99/mo</div>
              <div class="billing-cycle">Billed Monthly</div>
            </div>
            <ul class="plan-features">
              <li>Everything in Free</li>
              <li>+</li>
              <li>Higher priority generation</li>
              <li>Full 4K (4096x2304)</li>
              <li>Veo 3 Pro cinematic model</li>
              <li>Commercial rights</li>
            </ul>
          </div>
        </div>

        <div class="pricing-footer">
          <NuxtLink to="/register" class="get-started-btn">Get Started</NuxtLink>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="ant-footer">
      <div class="container footer-content">
        <div class="footer-left">AntFlow</div>
        <div class="footer-right">
          <NuxtLink to="/privacy">Privacy</NuxtLink>
          <NuxtLink to="/terms">Terms of Service</NuxtLink>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { 
  PlayOne,
  Comments,
  Info,
  More
} from '@icon-park/vue-next'

definePageMeta({
  layout: false
})
import heroBackground from '~/assets/images/hero_background.png'
import gallery7 from '~/assets/images/gallery_7.png'
import galleryMicroverse from '~/assets/images/gallery_microverse.png'
import gallery9 from '~/assets/images/gallery_9.png'
import galleryRocket from '~/assets/images/gallery_rocket.png'
import gallery10 from '~/assets/images/gallery_10.png'
import gallery11 from '~/assets/images/gallery_11.png'

const scrolled = ref(false)
const activeFeature = ref('consistent')
const activeSection = ref('overview')

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

let galleryTimer = null

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
  window.addEventListener('scroll', handleScroll)
  galleryTimer = setInterval(rotateGallery, 4000)

  // Scroll Spy logic
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

useHead({
  title: 'AntFlow | Next-Gen AI Filmmaking',
  meta: [
    { name: 'description', content: 'Create cinematic AI videos with AntFlow. Powered by Veo3 and Gemini.' }
  ]
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

/* Navbar */
.fixed-nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 80px;
  z-index: 1000;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  align-items: center;
}

.fixed-nav.scrolled {
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(20px);
  height: 64px;
}

.nav-container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
  height: 100%;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
}

.nav-links-center {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.brand {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -1px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 24px;
  justify-self: end;
}

.nav-link {
  color: #fff;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.6;
  transition: all 0.3s;
  position: relative;
  padding: 4px 0;
}

.nav-link:hover, .nav-link.active {
  opacity: 1;
}

.nav-link.active::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  right: 0;
  height: 2px;
  background: #fff;
  border-radius: 2px;
}

.nav-icon {
  color: #fff;
  opacity: 0.6;
  transition: opacity 0.3s;
}

.nav-icon:hover {
  opacity: 1;
}

.nav-btn {
  padding: 10px 24px;
  background: #fff;
  color: #000;
  text-decoration: none;
  border-radius: 100px;
  font-weight: 600;
  transition: transform 0.3s;
}

.nav-btn:hover {
  transform: scale(1.05);
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

.frame-video, .frame-img {
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
  /* Hide scrollbar but keep functionality */
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

.pricing-grid {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-bottom: 80px;
}

.price-item {
  flex: 1;
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

.get-started-btn {
  display: inline-block;
  padding: 16px 40px;
  background: #fff;
  color: #000;
  text-decoration: none;
  border-radius: 100px;
  font-weight: 700;
  font-size: 18px;
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
}

/* Animations */
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
  .feature-detail { grid-template-columns: 1fr; gap: 40px; }
  .pricing-grid { flex-direction: column; align-items: center; }
  .price-item { border-top: 1px solid rgba(255,255,255,0.1); width: 100%; }
}

@media (max-width: 768px) {
  .gallery-grid { grid-template-columns: 1fr; }
  .tab-triggers { gap: 30px; }
  .tab-triggers button { font-size: 24px; }
}
</style>

<style>
/* Global reset for landing page */
html, body {
  margin: 0 !important;
  padding: 0 !important;
  background: #000 !important;
  overflow-x: hidden;
}

* {
  box-sizing: border-box;
}
</style>
