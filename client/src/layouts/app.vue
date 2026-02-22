<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useUIStore } from '@/stores/ui'
import AppSidebar from '@/components/AppSidebar.vue'

const uiStore = useUIStore()
const { sidebarCollapsed: isSidebarCollapsed } = storeToRefs(uiStore)
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="app-main" :style="{ marginLeft: isSidebarCollapsed ? '68px' : '260px' }">
      <div class="content-wrapper">
        <slot />
      </div>
    </main>
  </div>
</template>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background: $bg-dark;
  color: $text-primary;
}

.app-main {
  flex: 1;
  transition: $transition-base;
  height: 100vh;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  @include scrollbar;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  padding: $spacing-xl;
  min-height: 100.1%; // Ensure scroll is always possible
}

@media (max-width: 768px) {
  .app-main {
    margin-left: 0 !important;
    padding: $spacing-lg;
    height: 100vh;
  }
}
</style>

<style lang="scss">

</style>
