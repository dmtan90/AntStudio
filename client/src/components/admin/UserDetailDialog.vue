<template>
  <el-dialog
    v-model="visible"
    :title="t('admin.userDetails.title')"
    width="600px"
    class="cinematic-dialog"
    destroy-on-close
  >
    <div v-if="loading" class="py-12 flex flex-col items-center gap-4">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      <span class="text-[10px] font-black uppercase tracking-widest opacity-40">{{ $t('admin.userDetails.loading') }}</span>
    </div>

    <div v-else-if="user" class="user-detail-content">
      <div class="user-header">
        <div class="avatar-wrapper">
          <GMedia v-if="user.avatar" :src="user.avatar" class="user-avatar" />
          <div v-else class="avatar-placeholder">{{ user.name?.charAt(0) }}</div>
        </div>
        <div class="user-main-info">
          <h3>{{ user.name }}</h3>
          <p class="email">{{ user.email }}</p>
          <div class="badges">
            <el-tag :type="user.role === 'admin' ? 'danger' : 'info'" size="small">{{ user.role }}</el-tag>
            <el-tag :type="user.isActive ? 'success' : 'danger'" size="small">{{ user.isActive ? $t('admin.userDetails.status.active') : $t('admin.userDetails.status.inactive') }}</el-tag>
            <el-tag size="small">{{ user.subscription?.plan?.toUpperCase() || $t('admin.userDetails.subscription.free').toUpperCase() }}</el-tag>
          </div>
        </div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <label>{{ $t('admin.userDetails.userId') }}</label>
          <div class="value code">{{ user._id }}</div>
        </div>
        <div class="info-item">
          <label>{{ $t('admin.userDetails.joinedDate') }}</label>
          <div class="value">{{ new Date(user.createdAt).toLocaleDateString() }}</div>
        </div>
        <div class="info-item">
          <label>{{ $t('admin.userDetails.lastLogin') }}</label>
          <div class="value">{{ user.lastLogin ? new Date(user.lastLogin).toLocaleString() : $t('admin.userDetails.never') }}</div>
        </div>
        <div class="info-item">
          <label>{{ $t('admin.userDetails.creditsBalance') }}</label>
          <div class="value highlight">{{ user.credits?.balance || 0 }}</div>
        </div>
      </div>

      <div class="subscription-details">
        <h4>{{ $t('admin.userDetails.subscription.status') }}</h4>
        <div class="glass-box">
             <div class="detail-row">
                <span>{{ $t('admin.userDetails.subscription.plan') }}</span>
                <strong>{{ user.subscription?.plan?.toUpperCase() || $t('admin.userDetails.subscription.free') }}</strong>
             </div>
             <div class="detail-row">
                <span>{{ $t('admin.userDetails.subscription.currentStatus') }}</span>
                <span :class="user.subscription?.status">{{ user.subscription?.status || $t('admin.userDetails.status.active') }}</span>
             </div>
             <div class="detail-row" v-if="user.subscription?.currentPeriodEnd">
                <span>{{ $t('admin.userDetails.subscription.renewsOn') }}</span>
                <span>{{ new Date(user.subscription.currentPeriodEnd).toLocaleDateString() }}</span>
             </div>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import GDialog from '@/components/ui/GDialog.vue'
import GMedia from '@/components/ui/GMedia.vue'
import { useAdminStore } from '@/stores/admin'
import { getFileUrl } from '@/utils/api'

const { t } = useI18n()

const props = defineProps<{
  modelValue: boolean
  userId: string | null
}>()

const emit = defineEmits(['update:modelValue'])
const adminStore = useAdminStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const user = ref<any>(null)
const loading = ref(false)



const fetchUser = async () => {
  if (!props.userId) return
  loading.value = true
  try {
    const data = await adminStore.fetchUser(props.userId)
    user.value = data.user
  } catch (error) {
    console.error('Failed to fetch user details:', error)
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val && props.userId) {
    fetchUser()
  } else {
    user.value = null
  }
})
</script>

<style lang="scss" scoped>
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: $text-muted;
  
  .spinner {
    width: 30px;
    height: 30px;
    border: 3px solid rgba(255, 255, 255, 0.1);
    border-top-color: $primary-color;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }
}

.user-header {
  display: flex;
  gap: 24px;
  align-items: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);

  .avatar-wrapper {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    background: #333;
    flex-shrink: 0;
    
    img { width: 100%; height: 100%; object-fit: cover; }
    .avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 32px; color: #fff; font-weight: 700; }
  }

  .user-main-info {
    h3 { font-size: 24px; font-weight: 700; color: #fff; margin: 0 0 4px 0; }
    .email { color: $text-muted; margin: 0 0 12px 0; font-size: 14px; }
    .badges { display: flex; gap: 8px; }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.info-item {
  label { font-size: 12px; color: $text-secondary; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 4px; }
  .value { font-size: 15px; color: #fff; font-weight: 500; }
  .code { font-family: monospace; background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px; display: inline-block; font-size: 13px; color: $text-muted; }
  .highlight { color: $primary-color; font-weight: 700; font-size: 18px; }
}

.subscription-details {
  h4 { font-size: 14px; color: #fff; margin-bottom: 12px; font-weight: 600; }
  .glass-box {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 16px;
      
      .detail-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
          font-size: 14px;
          color: $text-muted;
          
          &:last-child { border-bottom: none; }
          strong { color: #fff; }
      }
  }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
