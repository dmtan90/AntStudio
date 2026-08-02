<template>
  <el-dialog
    v-model="visible"
    width="720px"
    class="cinematic-dialog shadow-2xl overflow-hidden"
    destroy-on-close
    append-to-body>
    <template #header>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="h-8 w-1.5 bg-yellow-500 rounded-full shadow-[0_0_12px_rgba(234,179,8,0.5)]" />
          <div>
            <h3 class="text-sm font-black uppercase tracking-[0.2em] text-white/90">
              {{ t('projects.editor.storyboard.editCaptions') || 'Edit Subtitles & Captions' }}
            </h3>
            <p class="text-[10px] text-white/40 mt-0.5">
              {{ t('projects.editor.storyboard.editCaptionsSubtitle') || 'Adjust text timing, content, and styles for each segment' }}
            </p>
          </div>
        </div>
      </div>
    </template>

    <div class="px-2 space-y-6">
      <!-- Segment Selection Tabs -->
      <div class="flex items-center gap-2 overflow-x-auto pb-2 border-b border-white/10 custom-scrollbar">
        <button
          v-for="(seg, idx) in segments"
          :key="getSegmentOrder(seg, idx)"
          class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2"
          :class="activeSegmentOrder === getSegmentOrder(seg, idx)
            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
            : 'bg-black/30 text-white/40 border border-white/5 hover:text-white'"
          @click="activeSegmentOrder = getSegmentOrder(seg, idx)">
          <span>#{{ getSegmentOrder(seg, idx) }} {{ seg.title || `Segment ${getSegmentOrder(seg, idx)}` }}</span>
          <span
            class="px-1.5 py-0.2 rounded-full text-[9px]"
            :class="(localCaptionsMap[getSegmentOrder(seg, idx)] || []).length > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/40'">
            {{ (localCaptionsMap[getSegmentOrder(seg, idx)] || []).length }}
          </span>
        </button>
      </div>

      <!-- Active Segment Captions List -->
      <div class="space-y-4 min-h-[300px] max-h-[420px] overflow-y-auto pr-1 custom-scrollbar">
        <div v-if="currentSegmentCaptions.length === 0" class="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-2xl bg-black/20">
          <text-message theme="outline" size="32" class="text-white/20 mb-3" />
          <p class="text-xs text-white/40 mb-4">{{ t('projects.editor.storyboard.noCaptionsYet') || 'No subtitle lines for this segment yet.' }}</p>
          <el-button type="warning" plain round bg size="small" :icon="Plus" @click="addCaptionLine">
            {{ t('projects.editor.storyboard.addFirstCaption') || 'Add First Subtitle Line' }}
          </el-button>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(cap, capIdx) in currentSegmentCaptions"
            :key="capIdx"
            class="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col gap-3 hover:border-white/20 transition-all">
            
            <div class="flex items-center gap-3">
              <span class="text-[10px] font-mono text-white/30 w-5">#{{ capIdx + 1 }}</span>
              <el-input
                v-model="cap.text"
                :placeholder="t('projects.editor.storyboard.captionTextPlaceholder') || 'Subtitle text...'"
                class="cinematic-input flex-1" />
              <el-button
                circle
                size="small"
                class="!bg-red-500/10 !text-red-400 !border-red-500/20 hover:!bg-red-500 hover:!text-white"
                @click="removeCaptionLine(capIdx)">
                <delete theme="outline" size="14" />
              </el-button>
            </div>

            <div class="flex items-center gap-4 text-xs text-white/60 pl-8">
              <!-- Start Time -->
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] uppercase font-bold text-white/40">{{ t('projects.editor.storyboard.startTime') || 'Start' }}:</span>
                <el-input-number
                  v-model="cap.start"
                  :min="0"
                  :max="999"
                  :step="0.1"
                  :precision="1"
                  size="small"
                  class="cinematic-number-input w-24" />
                <span class="text-[10px] text-white/30">s</span>
              </div>

              <!-- End Time -->
              <div class="flex items-center gap-1.5">
                <span class="text-[10px] uppercase font-bold text-white/40">{{ t('projects.editor.storyboard.endTime') || 'End' }}:</span>
                <el-input-number
                  v-model="cap.end"
                  :min="0"
                  :max="999"
                  :step="0.1"
                  :precision="1"
                  size="small"
                  class="cinematic-number-input w-24" />
                <span class="text-[10px] text-white/30">s</span>
              </div>

              <!-- Caption Style -->
              <div class="flex items-center gap-1.5 ml-auto">
                <span class="text-[10px] uppercase font-bold text-white/40">{{ t('projects.editor.storyboard.captionStyle') || 'Style' }}:</span>
                <el-select v-model="cap.style" size="small" class="w-28 cinematic-select" :teleported="false">
                  <el-option label="Default" value="default" />
                  <el-option label="CapCut Yellow" value="capcut" />
                  <el-option label="Bold Red" value="bold" />
                  <el-option label="Minimal White" value="minimal" />
                  <el-option label="Neon Blue" value="neon" />
                </el-select>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="flex items-center justify-between px-2 py-2">
        <el-button
          plain
          round
          bg
          size="small"
          :icon="Plus"
          @click="addCaptionLine">
          {{ t('projects.editor.storyboard.addCaptionLine') || 'Add Line' }}
        </el-button>

        <div class="flex items-center gap-3">
          <el-button @click="visible = false">
            {{ t('common.cancel') }}
          </el-button>
          <el-button type="warning" :loading="saving" @click="handleSaveCaptions">
            {{ t('common.save') }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { TextMessage, Plus, Delete } from '@icon-park/vue-next'
import { useI18n } from 'vue-i18n'
import { useProjectStore } from '@/stores/project'
import { toast } from 'vue-sonner'

const props = defineProps<{
  modelValue: boolean
  project: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const { t } = useI18n()
const projectStore = useProjectStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const saving = ref(false)
const activeSegmentOrder = ref(1)

const segments = computed(() => {
  return props.project?.storyboard?.segments || (Array.isArray(props.project?.storyboard) ? props.project.storyboard : [])
})

// Deep reactive local map of segment order -> caption items
const localCaptionsMap = ref<Record<number, any[]>>({})

const getSegmentOrder = (seg: any, idx?: any): number => {
  const num = Number(seg?.order)
  if (!isNaN(num) && num > 0) return num
  const indexNum = Number(idx)
  return !isNaN(indexNum) ? indexNum + 1 : 1
}

watch(visible, (isOpen) => {
  if (isOpen) {
    const map: Record<number, any[]> = {}
    for (let i = 0; i < segments.value.length; i++) {
      const seg = segments.value[i]
      const order = getSegmentOrder(seg, i)
      const caps = seg.captions ? JSON.parse(JSON.stringify(seg.captions)) : []
      map[order] = caps.map((c: any) => ({
        start: c.start ?? c.startTime ?? 0,
        end: c.end ?? c.endTime ?? 3,
        text: c.text || c.content || '',
        style: c.style || 'default'
      }))
    }
    localCaptionsMap.value = map
    if (segments.value.length > 0) {
      activeSegmentOrder.value = getSegmentOrder(segments.value[0], 0)
    }
  }
}, { immediate: true })

const currentSegmentCaptions = computed({
  get: () => {
    if (!localCaptionsMap.value[activeSegmentOrder.value]) {
      localCaptionsMap.value[activeSegmentOrder.value] = []
    }
    return localCaptionsMap.value[activeSegmentOrder.value]
  },
  set: (val) => {
    localCaptionsMap.value[activeSegmentOrder.value] = val
  }
})

const addCaptionLine = () => {
  const list = currentSegmentCaptions.value
  const lastCap = list[list.length - 1]
  const start = lastCap ? Math.round((lastCap.end + 0.1) * 10) / 10 : 0
  const end = Math.round((start + 2.5) * 10) / 10

  list.push({
    start,
    end,
    text: '',
    style: 'default'
  })
}

const removeCaptionLine = (index: number) => {
  currentSegmentCaptions.value.splice(index, 1)
}

const handleSaveCaptions = async () => {
  if (!props.project?._id) return
  saving.value = true
  try {
    for (let i = 0; i < segments.value.length; i++) {
      const seg = segments.value[i]
      const order = getSegmentOrder(seg, i)
      const caps = localCaptionsMap.value[order] || []
      // Filter empty lines & sort by start time
      const validCaps = caps
        .filter(c => c.text && c.text.trim().length > 0)
        .sort((a, b) => a.start - b.start)

      await projectStore.updateCaptions(props.project._id, order.toString(), validCaps)
    }

    toast.success(t('projects.editor.storyboard.captionsSaved') || 'Captions updated successfully!')
    emit('saved')
    visible.value = false
  } catch (err: any) {
    toast.error(err.message || 'Failed to save captions')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cinematic-number-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  box-shadow: none !important;
}
</style>
