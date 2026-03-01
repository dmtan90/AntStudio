<template>
  <div class="auth-page">
    <div class="video-bg-container">
      <video autoplay muted loop playsinline class="video-bg">
        <source :src="getFileUrl('https://storage.googleapis.com/pinhole-about-assets-prod-us/video-section/video.mp4')"
          type="video/mp4">
      </video>
      <div class="video-overlay"></div>
    </div>

    <div class="auth-container">
      <transition name="fade-up" appear>
        <GCard class="auth-card" :hoverable="false">
          <div class="logo">
            <div class="flex justify-center mb-6">
              <el-image :src="getFileUrl(uiStore.logo)" class="h-16 w-auto object-contain">
                <template #error>
                  <img src="/logo.png" :alt="uiStore.appName" class="h-16 w-auto object-contain" />
                </template>
              </el-image>
            </div>
            <h1 class="brand">{{ uiStore.appName }}</h1>
            <p>{{ t('auth.register.subtitle') }}</p>
          </div>

          <el-form ref="formRef" :model="form" :rules="rules" @submit.prevent="handleRegister" class="ant-form">
            <el-form-item prop="name">
              <GInput v-model="form.name" :placeholder="t('auth.register.namePlaceholder')" class="register-input" />
            </el-form-item>

            <el-form-item prop="email">
              <GInput v-model="form.email" :placeholder="t('auth.register.emailPlaceholder')" type="email" class="register-input" />
            </el-form-item>

            <el-form-item prop="password">
              <GInput v-model="form.password" :placeholder="t('auth.register.passwordPlaceholder')" type="password" show-password
                class="register-input" />
            </el-form-item>

            <el-form-item prop="confirmPassword">
              <GInput v-model="form.confirmPassword" :placeholder="t('auth.register.confirmPasswordPlaceholder')" type="password" show-password
                class="register-input" />
            </el-form-item>

            <el-form-item>
              <GButton type="primary" size="lg" :loading="loading" native-type="submit" class="register-btn">
                {{ t('auth.register.createAccount') }}
              </GButton>
            </el-form-item>
          </el-form>

          <div class="auth-footer">
            <p>
              {{ t('auth.register.alreadyHave') }}
              <router-link to="/login" class="link">{{ t('auth.register.login') }}</router-link>
            </p>
            <router-link to="/" class="back-home">{{ t('auth.login.backHome') }}</router-link>
          </div>
        </GCard>
      </transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { FormRules } from 'element-plus'
import { useRouter } from 'vue-router'
import { ref, reactive } from 'vue'
import { useUserStore } from '@/stores/user'
import { useUIStore } from '@/stores/ui'
import GCard from '@/components/ui/GCard.vue'
import GInput from '@/components/ui/GInput.vue'
import GButton from '@/components/ui/GButton.vue'
import { getFileUrl } from '@/utils/api'
import { useI18n } from 'vue-i18n';

const { t } = useI18n()
const router = useRouter()
const userStore = useUserStore()
const uiStore = useUIStore()

const formRef = ref()
const loading = ref(false)
const form = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const validateConfirmPassword = (rule: any, value: any, callback: any) => {
  if (value !== form.password) {
    callback(new Error(t('auth.register.rules.mismatch')))
  } else {
    callback()
  }
}

const rules: FormRules = {
  name: [
    { required: true, message: t('auth.register.rules.nameRequired'), trigger: 'blur' }
  ],
  email: [
    { required: true, message: t('auth.register.rules.emailRequired'), trigger: 'blur' },
    { type: 'email', message: t('auth.register.rules.emailInvalid'), trigger: 'blur' }
  ],
  password: [
    { required: true, message: t('auth.register.rules.passwordRequired'), trigger: 'blur' },
    { min: 8, message: t('auth.register.rules.passwordMin'), trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: t('auth.register.rules.confirmRequired'), trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' }
  ]
}

const handleRegister = async () => {
  if (!formRef.value) return

  await formRef.value.validate(async (valid: boolean) => {
    if (!valid) return

    loading.value = true
    try {
      await userStore.register({
        email: form.email,
        password: form.password,
        name: form.name
      })

      toast.success(t('auth.register.toasts.success'))

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || t('auth.register.toasts.failed'))
    } finally {
      loading.value = false
    }
  })
}
</script>

<style lang="scss" scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #000;
  position: relative;
  overflow: hidden;
}

.video-bg-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
}

.video-bg {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: brightness(0.4);
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(circle at center, transparent, #000 90%);
}

.auth-container {
  width: 100%;
  max-width: 440px;
  padding: 24px;
  position: relative;
  z-index: 1;
}

.auth-card {
  box-shadow: 0 40px 100px rgba(0, 0, 0, 0.5);

  :deep(.g-card__body) {
    padding: 50px 40px;
  }
}

.logo {
  text-align: center;
  margin-bottom: 40px;
}

.brand {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin-bottom: 10px;
  color: #fff;
  margin-top: 0;
}

.logo p {
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  font-size: 15px;
  font-weight: 400;
}

.ant-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.register-btn {
  width: 100%;
  height: 52px !important;
}

.auth-footer {
  margin-top: 32px;
  text-align: center;
}

.auth-footer p {
  color: rgba(255, 255, 255, 0.6);
  font-size: 14px;
  margin-bottom: 24px;
}

.link {
  color: #fff;
  text-decoration: none;
  font-weight: 600;
  margin-left: 5px;

  &:hover {
    text-decoration: underline;
  }
}

.back-home {
  display: block;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: #fff;
  }
}

/* Animations */
.fade-up-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-up-enter-from {
  opacity: 0;
  transform: translateY(40px);
}
</style>
