<template>
  <div class="ai-bubble text animate-up">
    <div class="bubble-header">
      <el-image :src="getFileUrl(uiStore.logo)" class="h-[24px] w-auto object-contain">
		<template #error>
		  <img src="/logo.png" :alt="uiStore.appName" class="h-[24px] w-auto object-contain" />
		</template>
	  </el-image>
      <span class="brand-name">{{ uiStore.appName }}</span>
    </div>
    <div class="bubble-body" v-html="content"></div>
  </div>
</template>

<script setup lang="ts">
import { useUIStore } from '@/stores/ui'
import { getFileUrl } from '@/utils/api'
defineProps<{
  content?: string
}>()

const uiStore = useUIStore()
</script>

<style lang="scss" scoped>
.ai-bubble.text {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px 32px;
  border-radius: 28px 28px 28px 6px;
  font-size: 16px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.8);
  max-width: 720px;
  margin-bottom: 24px;
  align-self: flex-start;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.4);
  animation: slideInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;

  .bubble-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    .brand-name {
      font-weight: 900;
      font-size: 20px;
      color: #fff;
      letter-spacing: -0.02em;
      text-transform: uppercase;
    }
  }

  :deep(.bubble-body) {
    b {
      color: #fff;
      font-weight: 800;
    }
    ol {
      margin: 16px 0;
      padding-left: 24px;
      line-height: 2.2;
      li {
        margin-bottom: 8px;
        &::marker {
          color: #3b82f6;
          font-weight: 900;
        }
      }
    }
  }
}

@keyframes slideInUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
