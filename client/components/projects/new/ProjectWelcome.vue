<template>
  <div class="welcome-section">
    <h1 class="glow-title">{{ t('projects.new.title') }}</h1>
    <p class="subtitle">{{ t('projects.new.subtitle') }}</p>
  </div>
</template>

<script setup lang="ts">
const { t } = useTranslations()
</script>

<style lang="scss" scoped>
.welcome-section {
  text-align: center;
  margin-top: 8vh;
  .glow-title { 
    font-size: 3rem; 
    margin-bottom: 1rem; 
    @include text-glow; 
  }
  .subtitle { 
    color: $text-muted; 
    font-size: 1.1rem; 
  }
}
</style>
