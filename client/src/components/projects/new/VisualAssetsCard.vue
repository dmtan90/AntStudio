<template>
  <div class="border border-white/5 rounded-xl cursor-pointer transition-all hover:bg-[rgba(40,40,40,0.6)] mt-4 animate-up">
    <div 
      class="flex justify-between items-center px-5 py-4 bg-[rgba(30,30,30,0.4)] border border-white/5 rounded-xl cursor-pointer transition-all" 
      @click.prevent="expanded = !expanded"
    >
      <div class="flex items-center gap-3 text-[#eee] text-sm font-semibold">
        <pic theme="outline" size="18"/>
        <span>Visual Assets <span class="text-[#888] font-normal ml-1">is ready</span></span>
      </div>
      <arrow-right 
        theme="outline" 
        size="14" 
        :class="['text-[#555] transition-transform duration-300 ease-cinematic', expanded ? 'rotate-90 text-white' : '']" 
      />
    </div>
    <div :class="['overflow-hidden transition-all duration-300 ease-in-out', expanded ? 'max-h-[2000px] p-5 opacity-100' : 'max-h-0 p-0 opacity-0']">
      <div class="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-4">
        <div v-for="(img, idx) in localImages" :key="idx" class="flex flex-col gap-2.5 bg-white/5 p-2.5 rounded-lg border border-white/5 transition-all hover:bg-white/10 hover:-translate-y-0.5">
          <div class="w-full aspect-square rounded-lg overflow-hidden relative bg-black/20 border border-white/10">
             <GMedia 
                v-if="img.status === 'ready' && img.s3Key" 
                :src="img.s3Key" 
                :alt="img.name" 
                class="w-full h-full object-cover" 
             />
             
             <!-- Loading State -->
             <div v-else-if="img.status === 'generating' || img.status === 'pending'" class="w-full h-full flex flex-col items-center justify-center gap-2 text-blue-500 bg-blue-500/5">
                  <loading-one theme="outline" size="24" class="spin" />
                  <span class="text-[10px] font-medium uppercase tracking-wider">{{ img.status === 'generating' ? 'Generating...' : 'Pending' }}</span>
             </div>
 
             <!-- Error State -->
             <div v-else-if="img.status === 'error'" class="w-full h-full flex flex-col items-center justify-center gap-2 text-red-500 bg-red-500/5">
                  <attention theme="outline" size="24" />
                  <span class="text-[10px] font-medium uppercase tracking-wider">Failed</span>
             </div>
          </div>
          <div class="w-full">
            <el-text truncated>{{ img.name }}</el-text>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { Pic, ArrowRight, LoadingOne, CheckOne, Attention } from '@icon-park/vue-next'
import { toast } from 'vue-sonner'
import GMedia from '@/components/ui/GMedia.vue'
import { getFileUrl } from '@/utils/api'

interface VisualAsset {
  name: string
  description?: string
  // url?: string
  status: 'pending' | 'generating' | 'ready' | 'error'
  s3Key?: string
}

const props = defineProps<{
  images: Array<VisualAsset>
  projectId: string
}>()

const expanded = ref(true)
const localImages = ref<VisualAsset[]>([])
const isProcessing = ref(false)



import { useProjectStore } from '@/stores/project'

const projectStore = useProjectStore()

// ... existing code ...

const processQueue = async () => {
    if (isProcessing.value) return 

    // Find first pending item
    const pendingIdx = localImages.value.findIndex(img => img.status === 'pending')
    if (pendingIdx === -1) return // Nothing to do

    console.log('Processing asset queue...', pendingIdx, localImages.value)

    const asset = localImages.value[pendingIdx]
    
    // Start generating
    isProcessing.value = true
    localImages.value[pendingIdx].status = 'generating'
    
    // Update Store Status (Optional, if we want global visibility)
    // projectStore.updateVisualAssetStatus(asset.name, 'generating')
    
    try {
        const data = await projectStore.generateAsset(props.projectId, {
            assetName: asset.name,
            description: asset.description || `Visual asset for ${asset.name}`,
            type: 'image'
        })

        // Success - Local Update
        localImages.value[pendingIdx].status = 'ready'
        localImages.value[pendingIdx].s3Key = data.s3Key

        // Success - Store Sync
        projectStore.updateVisualAssetStatus(asset.name, 'ready', { s3Key: data.s3Key })
        projectStore.syncAssetToElements(asset.name, data.s3Key)

    } catch (error) {
        console.error('Asset generation failed', error)
        localImages.value[pendingIdx].status = 'error'
        toast.error(`Failed to generate ${asset.name}`)
        
        projectStore.updateVisualAssetStatus(asset.name, 'error')
    } finally {
        isProcessing.value = false
        // Process next item
        processQueue()
    }
}

// Init local images
watch(() => props.images, (newVal) => {
  // If we receive new images, merge them or replace?
  // We want to keep local status if we are generating.
  // Simple strategy: Copy over, but respect 'generating' status if we are working on it?
  // Actually, standard prop-down flow: if parent updates, we respect.
  // But parent only knows 'pending' initially.
  
  if (localImages.value.length === 0 || newVal.length !== localImages.value.length) {
      localImages.value = JSON.parse(JSON.stringify(newVal))
      processQueue()
  }
}, { immediate: true })
</script>

<style scoped>
.animate-up { animation: slideInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slideInUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
