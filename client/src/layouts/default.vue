<template>
  <div class="default-layout">
    <AppNavbar />
    <main class="main-content">
      <slot />
    </main>
    <!-- <footer class="app-footer">
      <div class="footer-container">
        <p>&copy; 2026 AntStudio - Advanced AI Video Generation Platform</p>
      </div>
    </footer> -->
  </div>
</template>

<style lang="scss">
.default-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: $bg-dark;
}

.main-content {
  flex: 1;
}

.app-footer {
  padding: 60px 0;
  background: transparent;
  text-align: center;
  color: $text-muted;
  font-size: 13px;
  border-top: 1px solid $border-glass;
}
</style>
