<script setup lang="ts">
import { Toaster } from 'vue-sonner'
import 'vue-sonner/style.css'

const isSidebarCollapsed = useState('sidebar-collapsed', () => false)
</script>

<template>
  <div class="app-layout">
    <AppSidebar />
    <main class="app-main" :style="{ marginLeft: isSidebarCollapsed ? '68px' : '260px' }">
      <div class="content-wrapper">
        <slot />
      </div>
    </main>
    <Toaster position="top-right" theme="dark" richColors />
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
  min-height: 100vh;
  position: relative;
  z-index: 1;
}

.content-wrapper {
  max-width: 1600px;
  margin: 0 auto;
  padding: $spacing-xl;
}

@media (max-width: 768px) {
  .app-main {
    margin-left: 0 !important;
    padding: $spacing-lg;
  }
}
</style>

<style lang="scss">
/* ============================================
   UNIVERSAL GLASSMORPHYSIM (Element Plus)
   ============================================ */

/* Universal Overlays & Poppers - Brute force Dark Glass */
.el-overlay {
  background-color: rgba(0, 0, 0, 0.75) !important;
  backdrop-filter: blur(10px) !important;
  z-index: 4000 !important;
}

/* Target all popper variations, including those injected at body level */
.el-popper, 
.el-popper.is-light, 
.el-popper.is-dark,
.el-dropdown-menu,
.el-select-dropdown__list,
.el-dropdown__popper, 
.el-select-dropdown, 
.dark-dropdown, 
.dark-popover, 
.el-popover {
  background: rgba(18, 18, 18, 0.9) !important;
  backdrop-filter: blur(40px) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 12px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8) !important;
  color: #fff !important;
}

/* Internal overrides to prevent white backgrounds from nested divs */
.el-popper div, .el-popper span, .el-popper ul, .el-popper li {
  background-color: transparent !important;
  color: inherit !important;
}

/* Specifically target the content wrapper */
.el-popper__content {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

/* Arrow styling */
.el-popper .el-popper__arrow::before,
.el-popper.is-light .el-popper__arrow::before {
  background: rgba(15, 15, 15, 0.92) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
}

/* Menu Items */
.el-dropdown-menu__item, .el-select-dropdown__item {
  color: rgba(255, 255, 255, 0.7) !important;
  border-radius: 8px !important;
  padding: 10px 16px !important;
  font-size: 13px !important;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
  
  &:hover, &.is-hovering, &.hover {
    background: rgba(255, 255, 255, 0.08) !important;
    color: #fff !important;
    transform: translateX(4px);
  }
  
  &.is-selected, &.selected {
    background: rgba(255, 255, 255, 0.12) !important;
    color: #fff !important;
    font-weight: 600 !important;
  }
}

/* Inputs & Selects Wrappers */
.el-input__wrapper, .el-select__wrapper {
  background: rgba(255, 255, 255, 0.03) !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
  
  &:hover {
    background: rgba(255, 255, 255, 0.06) !important;
    border-color: rgba(255, 255, 255, 0.2) !important;
  }
  
  &.is-focus, &.is-focused {
    background: rgba(255, 255, 255, 0.08) !important;
    border-color: rgba(255, 255, 255, 0.4) !important;
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.05) !important;
  }
}

/* Slider Customization */
.el-slider__runway {
  background-color: rgba(255, 255, 255, 0.08) !important;
  height: 4px !important;
}

.el-slider__bar {
  background: linear-gradient(90deg, #fff, rgba(255, 255, 255, 0.5)) !important;
  height: 4px !important;
}

.el-slider__button {
  width: 14px !important;
  height: 14px !important;
  border: 2px solid #fff !important;
  background-color: #000 !important;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.3) !important;
  transition: transform 0.2s !important;
  
  &:hover {
    transform: scale(1.2);
  }
}

/* Tags */
.el-tag {
  border-radius: 20px !important;
  font-weight: 600 !important;
  border-width: 1px !important;
  backdrop-filter: blur(4px) !important;
  
  &.el-tag--dark {
    color: #fff !important;
  }
  
  &.el-tag--plain {
    background: rgba(255, 255, 255, 0.05) !important;
    border-color: rgba(255, 255, 255, 0.1) !important;
  }
}

/* Dialogs */
.cinematic-dialog {
  background: rgba(10, 10, 10, 0.85) !important;
  backdrop-filter: blur(50px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 28px !important;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.9) !important;
}

/* Typography Helpers */
.glow-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin: 0 0 8px 0;
  background: linear-gradient(135deg, #fff 0%, rgba(255, 255, 255, 0.7) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  @include text-glow;
}

.subtitle {
  color: rgba(255, 255, 255, 0.5);
  font-size: 15px;
  margin: 0;
  font-weight: 500;
}
</style>
