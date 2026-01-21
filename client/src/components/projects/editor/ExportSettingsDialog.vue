<template>
  <el-dialog
    v-model="visible"
    title="Export Video Settings"
    width="500px"
    class="cinematic-dialog shadow-2xl"
    destroy-on-close
  >
    <div v-if="!isAssembling" class="export-settings-container">
      <el-form :model="form" label-position="top">
        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="Format">
            <el-select v-model="form.format" class="w-full high-contrast-select">
              <el-option label="MP4 (Recommended)" value="mp4" />
              <el-option label="WebM" value="webm" />
            </el-select>
          </el-form-item>

          <el-form-item label="Codec">
            <el-select v-model="form.codec" class="w-full high-contrast-select">
              <el-option v-for="c in availableCodecs" :key="c.val" :label="c.label" :value="c.val" />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <el-form-item label="Resolution">
            <el-select v-model="form.resolution" class="w-full high-contrast-select">
              <el-option label="HD (720p)" value="720p" />
              <el-option label="Full HD (1080p)" value="1080p" />
              <el-option label="2K (1440p)" value="2k" />
              <el-option label="4K (2160p)" value="4k" />
            </el-select>
          </el-form-item>

          <el-form-item label="FPS">
            <el-select v-model="form.fps" class="w-full high-contrast-select">
              <el-option label="24 FPS" :value="24" />
              <el-option label="30 FPS" :value="30" />
              <el-option label="60 FPS" :value="60" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="Quality (Bitrate)">
          <!-- <el-segmented v-model="form.bitrate" class="w-full" :options="[
            { label: 'Low', value: 'low' },
            { label: 'Medium', value: 'medium' },
            { label: 'High', value: 'high' }
          ]" /> -->
          <el-select v-model="form.bitrate" class="w-full high-contrast-select">
            <el-option label="Low" value="low" />
            <el-option label="Medium" value="medium" />
            <el-option label="High" value="high" />
          </el-select>
          <!-- <el-radio-group v-model="form.bitrate" class="flex justify-between">
            <el-radio-button value="low">Low</el-radio-button>
            <el-radio-button value="medium">Medium</el-radio-button>
            <el-radio-button value="high">High</el-radio-button>
          </el-radio-group> -->
        </el-form-item>

        <div class="mt-6 border-t border-white/10 pt-4">
          <div class="flex items-center justify-between mb-4">
            <span class="text-sm font-semibold text-white/80 uppercase tracking-wider">Audio Settings</span>
            <el-switch v-model="form.includeAudio" active-text="Include" />
          </div>

          <transition name="fade">
            <div v-if="form.includeAudio" class="grid grid-cols-2 gap-4">
              <el-form-item label="Audio Codec">
                <el-select v-model="form.audioCodec" class="w-full high-contrast-select">
                  <el-option label="AAC" value="aac" />
                  <el-option label="Opus" value="opus" />
                </el-select>
              </el-form-item>
              <el-form-item label="Sample Rate">
                <el-select v-model="form.sampleRate" class="w-full high-contrast-select">
                  <el-option label="44100 Hz" :value="44100" />
                  <el-option label="48000 Hz" :value="48000" />
                </el-select>
              </el-form-item>
            </div>
          </transition>
        </div>
      </el-form>
    </div>

    <!-- Assembling State -->
    <div v-else class="assembling-state py-8 text-center">
        <el-progress 
            type="circle" 
            :percentage="Math.round(progress)" 
            :status="progress === 100 ? 'success' : ''"
            :stroke-width="8"
            color="#3b82f6"
        />
        <div class="mt-8">
            <h3 class="text-xl font-bold text-white mb-2">{{ status }}</h3>
            <p v-if="progress < 100" class="text-white/40 text-sm">Please do not close this window or refresh the page.</p>
        </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end">
        <template v-if="!isAssembling">
            <el-button @click="visible = false" class="bg-white/5 border-white/10 text-white hover:bg-white/10">Cancel</el-button>
            <el-button type="primary" @click="handleConfirm" class="px-8 shadow-lg shadow-blue-500/20">Start Export</el-button>
        </template>
        <template v-else>
            <el-button v-if="progress < 100" @click="cancel" class="bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20">Cancel Export</el-button>
            <el-button v-else type="success" @click="handleFinish" class="px-8 shadow-lg shadow-green-500/20">View Result</el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { useVideoAssembler, type ExportOptions } from '@/composables/useVideoAssembler'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue', 'complete'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const { assemble, cancel, isAssembling, progress, status, result } = useVideoAssembler()

const form = reactive({
  format: 'mp4',
  codec: 'H264',
  resolution: '1080p',
  fps: 30,
  bitrate: 'medium',
  includeAudio: true,
  audioCodec: 'aac',
  sampleRate: 44100
})

const availableCodecs = computed(() => {
  if (form.format === 'webm') {
    return [
      { label: 'VP9', val: 'VP9' },
      { label: 'VP8', val: 'VP8' }
    ]
  }
  return [
    { label: 'H.264 (AVC)', val: 'H264' },
    { label: 'H.265 (HEVC)', val: 'H265' },
    { label: 'AV1', val: 'AV1' }
  ]
})

watch(() => form.format, (newF) => {
  if (newF === 'webm') {
    form.codec = 'VP9'
  } else if (form.codec === 'VP9' || form.codec === 'VP8') {
    form.codec = 'H264'
  }
})

const handleConfirm = async () => {
    await assemble(form as any as ExportOptions)
}

const handleFinish = () => {
    visible.value = false
    emit('complete', result.value)
}
</script>

<style lang="scss" scoped>
.cinematic-dialog {
  :deep(.el-radio-button__inner) {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.6);
  }
  
  :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
    background: rgba(59, 130, 246, 0.2);
    border-color: #3b82f6;
    color: #fff;
    box-shadow: none;
  }
}

.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
