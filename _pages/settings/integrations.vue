<template>
  <div class="integrations-page">
    <div class="page-header">
      <h1>🔗 Social Media Integrations</h1>
      <p>Connect your social media accounts to publish videos directly from AntFlow.</p>
    </div>

    <div class="integrations-grid">
      <!-- YouTube Integration -->
      <GCard class="integration-card">
        <div class="card-content">
          <div class="platform-icon youtube">
            <youtube-icon theme="filled" size="48" />
          </div>
          <div class="platform-info">
            <h3>YouTube</h3>
            <p v-if="user?.socialAccounts?.youtube?.channelId">
              Connected to Channel ID: {{ user.socialAccounts.youtube.channelId }}
            </p>
            <p v-else>Connect your YouTube channel to upload videos directly.</p>
          </div>
          <div class="actions">
            <GButton 
              v-if="user?.socialAccounts?.youtube?.channelId" 
              type="danger" 
              plain
              @click="disconnect('youtube')"
            >
              Disconnect
            </GButton>
            <GButton 
              v-else 
              type="primary" 
              @click="connect('youtube')"
              :loading="connecting === 'youtube'"
            >
              Connect YouTube
            </GButton>
          </div>
        </div>
      </GCard>

      <!-- Facebook Integration -->
      <GCard class="integration-card">
        <div class="card-content">
          <div class="platform-icon facebook">
            <facebook-icon theme="filled" size="48" />
          </div>
          <div class="platform-info">
            <h3>Facebook Pages</h3>
            <p v-if="user?.socialAccounts?.facebook?.pageId">
              Connected to Page ID: {{ user.socialAccounts.facebook.pageId }}
            </p>
            <p v-else>Connect your Facebook Page to publish videos.</p>
          </div>
          <div class="actions">
            <GButton 
              v-if="user?.socialAccounts?.facebook?.pageId" 
              type="danger" 
              plain
              @click="disconnect('facebook')"
            >
              Disconnect
            </GButton>
            <GButton 
              v-else 
              type="primary" 
              @click="connect('facebook')"
              :loading="connecting === 'facebook'"
            >
              Connect Facebook
            </GButton>
          </div>
        </div>
      </GCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Youtube as YoutubeIcon, Facebook as FacebookIcon } from '@icon-park/vue-next'


const { data: user, refresh } = await useFetch('/api/auth/me', {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('auth-token')}`
  }
})

const connecting = ref<string | null>(null)

const connect = async (provider: string) => {
  connecting.value = provider
  try {
    const { url } = await $fetch<{ url: string }>(`/api/social/connect?provider=${provider}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('auth-token')}`
      }
    })
    window.location.href = url
  } catch (error: any) {
    toast.error(error.data?.message || 'Failed to connect')
  } finally {
    connecting.value = null
  }
}

const disconnect = async (provider: string) => {
  // TODO: Implement disconnect endpoint
  toast.info(`Disconnecting ${provider}...`)
}

onMounted(() => {
  const route = useRoute()
  if (route.query.success) {
    toast.success(`Successfully connected to ${route.query.success}!`)
  }
  if (route.query.error) {
    toast.error('Failed to connect social account.')
  }
})
</script>

<style scoped>
.integrations-page {
  padding: 40px;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 40px;
  text-align: center;
}

.integrations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}

.integration-card {
  border-radius: 12px;
  transition: transform 0.2s;
}

.integration-card:hover {
  transform: translateY(-4px);
}

.card-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 24px;
}

.platform-icon {
  margin-bottom: 16px;
  padding: 20px;
  border-radius: 50%;
}

.youtube { color: #ff0000; background: rgba(255, 0, 0, 0.1); }
.facebook { color: #1877f2; background: rgba(24, 119, 242, 0.1); }

.platform-info h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
}

.platform-info p {
  color: #666;
  font-size: 14px;
  margin-bottom: 24px;
}

.actions {
  width: 100%;
}

.el-button {
  width: 100%;
}
</style>
