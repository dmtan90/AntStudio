<template>
  <div class="success-page">
    <el-result
      icon="success"
      title="Payment Successful!"
      sub-title="Your subscription has been updated. You can now enjoy your premium features."
    >
      <template #extra>
        <el-button type="primary" @click="router.push('/dashboard')">Go to Dashboard</el-button>
        <el-button @click="router.push('/subscription')">View My Subscription</el-button>
      </template>
    </el-result>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
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
