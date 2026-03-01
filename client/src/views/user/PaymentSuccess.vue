<template>
  <div class="success-page">
    <el-result
      icon="success"
      :title="t('paymentSuccess.title')"
      :sub-title="t('paymentSuccess.subtitle')"
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/dashboard')">{{ t('common.returnDashboard') }}</el-button>
        <el-button @click="router.push('/subscription')">{{ t('paymentSuccess.viewSubscription') }}</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const router = useRouter()
</script>

<style scoped>
.success-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #0a0a0a;
  color: #fff;
}

:deep(.el-result__title) {
  color: #fff !important;
}

:deep(.el-result__subtitle) {
  color: rgba(255, 255, 255, 0.6) !important;
}
</style>
