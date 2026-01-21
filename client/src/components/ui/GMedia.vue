<template>
  <div class="g-media-container" :class="{ 'is-loading': isMediaLoading }">
    <div v-if="isMediaLoading" class="media-loader">
      <el-icon class="is-loading">
        <Loading />
      </el-icon>
    </div>
    
    <template v-if="resolvedUrl">
      <video
        v-if="type === 'video'"
        v-bind="$attrs"
        :src="resolvedUrl"
      ></video>
      <img
        v-else
        v-bind="$attrs"
        :src="resolvedUrl"
      />
    </template>
    
    <div v-else-if="!isMediaLoading" class="media-error">
      <slot name="error">
        <pic theme="outline" size="24" class="opacity-20" />
      </slot>
    </div>
  </div>
</template>

<script lang="ts">
export default {
  inheritAttrs: false
}
</script>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { Pic } from '@icon-park/vue-next'
import { getFileUrl } from '@/utils/api'

const props = defineProps<{
  src: string | undefined | null
  type?: 'image' | 'video'
}>()

const resolvedUrl = ref('')
const isMediaLoading = ref(false)

const resolveMedia = async (path: string | undefined | null) => {
  if (!path) {
    resolvedUrl.value = ''
    return
  }
  
  isMediaLoading.value = true
  try {
    resolvedUrl.value = await getFileUrl(path, { cached: true })
  } catch (e) {
    console.error('Failed to resolve media:', path, e)
    resolvedUrl.value = ''
  } finally {
    isMediaLoading.value = false
  }
}

watch(() => props.src, (newSrc) => {
  resolveMedia(newSrc)
}, { immediate: true })

onUnmounted(() => {
  // Note: getFileUrl uses blobCache. blobCache.getBlobUrl returns a URL from URL.createObjectURL.
  // We should ideally revoke it if it's no longer used, but if it's managed by blobCache, 
  // it might be shared.
})
</script>

<style lang="scss" scoped>
.g-media-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.02);
  
  img, video {
    width: 100%;
    height: 100%;
    object-fit: inherit;
  }
}

.media-loader, .media-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
}
</style>
