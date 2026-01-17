<template>
  <div class="ai-bubble text animate-up">
    <div class="bubble-header">
      <div class="brand-logo"></div>
      <span class="brand-name">AntFlow</span>
    </div>
    <div class="bubble-body" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  content?: string
}>()
</script>

<style lang="scss" scoped>
.ai-bubble.text {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 20px 24px;
  border-radius: 20px 20px 20px 4px;
  font-size: 15px;
  line-height: 1.7;
  color: #eee;
  max-width: 650px;
  margin-bottom: 24px;
  align-self: flex-start;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    .brand-logo {
      width: 18px;
      height: 18px;
      background: linear-gradient(135deg, #FF3D00, #FFEA00, #00E676);
      border-radius: 4px;
      position: relative;
      &::after {
        content: '';
        position: absolute;
        top: 25%;
        left: 25%;
        width: 50%;
        height: 50%;
        background: #fff;
        border-radius: 1px;
      }
    }

    .brand-name {
      font-weight: 800;
      font-size: 18px;
      color: #fff;
      letter-spacing: -0.5px;
    }
  }

  :deep(.bubble-body) {
    b {
      color: #fff;
      font-weight: 700;
    }
    ol {
      margin: 12px 0;
      padding-left: 20px;
      line-height: 2;
    }
  }
}

.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
