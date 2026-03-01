<template>
  <div class="legal-page">
    <div class="hero-bg" v-if="!embedded">
      <div class="glow-1"></div>
      <div class="glow-2"></div>
    </div>

    <div class="container legal-content" :class="{ 'is-embedded': embedded }">
      <transition name="fade-up" appear>
        <div class="content-inner">
          <h1 class="glow-title" v-if="!embedded">{{ $t('marketing.terms.title') }}</h1>
          <p class="last-updated" v-if="!embedded">{{ $t('marketing.terms.lastUpdated') }}</p>

          <div class="legal-sections card" :class="{ glass: !embedded }">
            <section>
              <h2>{{ $t('marketing.terms.sections.acceptance.title') }}</h2>
              <p>{{ $t('marketing.terms.sections.acceptance.content', { appName: uiStore.appName }) }}</p>
            </section>

            <section>
              <h2>{{ $t('marketing.terms.sections.use.title') }}</h2>
              <p>{{ $t('marketing.terms.sections.use.content', { appName: uiStore.appName }) }}</p>
            </section>

            <section>
              <h2>{{ $t('marketing.terms.sections.property.title') }}</h2>
              <p>{{ $t('marketing.terms.sections.property.content', { appName: uiStore.appName }) }}</p>
            </section>

            <section>
              <h2>{{ $t('marketing.terms.sections.conduct.title') }}</h2>
              <p>{{ $t('marketing.terms.sections.conduct.content', { appName: uiStore.appName }) }}</p>
            </section>
          </div>
        </div>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'

const uiStore = useUIStore()
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
