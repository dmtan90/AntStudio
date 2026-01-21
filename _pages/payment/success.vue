<template>
  <div class="success-page">
    <el-result
      icon="success"
      title="Payment Successful!"
      sub-title="Your subscription has been updated. You can now enjoy your premium features."
    >
      <template #extra>
        <el-button type="primary" @click="navigateTo('/dashboard')">Go to Dashboard</el-button>
        <el-button @click="navigateTo('/subscription')">View My Subscription</el-button>
      </template>
    </el-result>
  </div>
</template>

<style scoped>
.success-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: #f8fafc;
}
</style>
