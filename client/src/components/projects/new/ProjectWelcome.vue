<template>
  <div class="welcome-section">
    <h1 class="glow-title">{{ t('projects.new.title') }}</h1>
    <p class="subtitle">{{ t('projects.new.subtitle') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useTranslations } from '@/composables/useTranslations'
const { t } = useTranslations()
</script>

<style lang="scss" scoped>
.welcome-section {
  text-align: center;
  margin-top: 10vh;
  margin-bottom: 4vh;
  padding: 0 20px;
  animation: fadeInDown 0.8s cubic-bezier(0.16, 1, 0.3, 1);

  .glow-title { 
    font-size: 5rem;
    font-weight: 900;
    margin-bottom: 1.5rem;
    letter-spacing: -0.05em;
    line-height: 0.9;
    color: #fff;
    filter: drop-shadow(0 0 30px rgba(255, 255, 255, 0.1));

    &::after {
      content: '';
      display: block;
      height: 2px;
      width: 60px;
      background: linear-gradient(90deg, #3b82f6, #8b5cf6);
      margin: 2rem auto 0;
      border-radius: 2px;
    }
  }

  .subtitle { 
    color: rgba(255, 255, 255, 0.5);
    font-size: 1.25rem;
    font-weight: 500;
    max-width: 600px;
    margin: 0 auto;
    letter-spacing: -0.01em;
    line-height: 1.6;
  }
}

@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .welcome-section {
    .glow-title { font-size: 3.5rem; }
    .subtitle { font-size: 1.1rem; }
  }
}
</style>
