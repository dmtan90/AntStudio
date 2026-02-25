<template>
  <div class="legal-page">
    <div class="hero-bg" v-if="!embedded">
      <div class="glow-1"></div>
      <div class="glow-2"></div>
    </div>

    <div class="container legal-content" :class="{ 'is-embedded': embedded }">
      <transition name="fade-up" appear>
        <div class="content-inner">
          <h1 class="glow-title" v-if="!embedded">Terms of Service</h1>
          <p class="last-updated" v-if="!embedded">Last Updated: January 10, 2026</p>

          <div class="legal-sections card" :class="{ glass: !embedded }">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>By accessing or using AntStudio, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services.</p>
            </section>

            <section>
              <h2>2. Use of Service</h2>
              <p>You agree to use AntStudio only for lawful purposes. You are responsible for all content generated using your account.</p>
            </section>

            <section>
              <h2>3. Intellectual Property</h2>
              <p>While AntStudio provides tools to generate content, you must ensure you have the necessary rights to any assets used as input. Ownership of generated content is subject to your specific plan terms.</p>
            </section>

            <section>
              <h2>4. Prohibited Conduct</h2>
              <p>You may not use AntStudio to generate content that is harmful, illegal, or violates the rights of others.</p>
            </section>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  embedded?: boolean
}>()
</script>

<style lang="scss" scoped>
.legal-page {
  background: #0a0a0a;
  color: #fff;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
  
  &:has(.is-embedded) {
    background: transparent;
    min-height: auto;
    overflow: visible;
  }
}

.hero-bg {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
  overflow: hidden;
  background: radial-gradient(circle at 50% -20%, #1a1a1a, #000);
}

.glow-1 {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.03) 0%, transparent 70%);
  filter: blur(80px);
}

.glow-2 {
  position: absolute;
  bottom: -10%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.02) 0%, transparent 70%);
  filter: blur(80px);
}

.container {
  max-width: 900px;
  margin: 0 auto;
  padding: 0 24px;
  position: relative;
  z-index: 1;
}

.legal-content {
  padding-top: 140px;
  padding-bottom: 120px;

  &.is-embedded {
    padding: 0;
    max-width: 100%;
    margin: 0;

    .legal-sections {
      padding: 0;
      border: none;
      background: transparent;
    }
  }
}

.glow-title {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -2px;
  margin-bottom: 15px;
  color: #fff;
}

.last-updated {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 50px;
}

.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 60px;
}

section {
  margin-bottom: 40px;
  &:last-child {
    margin-bottom: 0;
  }
}

h2 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #fff;
}

p {
  font-size: 16px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.6);
}

/* Animations */
.fade-up-enter-active {
  transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}
</style>
