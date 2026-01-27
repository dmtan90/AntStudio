<template>
  <el-dialog v-model="visible" width="520px" class="cinematic-dialog shadow-2xl overflow-hidden" destroy-on-close
    :show-close="!isAssembling">
    <template #header>
      <div class="flex items-center gap-3">
        <div class="h-8 w-1.5 bg-brand-primary rounded-full shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
        <h3 class="text-sm font-black uppercase tracking-[0.2em] text-white/90">Export Settings</h3>
      </div>
    </template>

    <div v-if="!isAssembling" class="export-settings-container px-2">
      <el-form :model="form" label-position="top">
        <div class="grid grid-cols-2 gap-6">
          <el-form-item>
            <template #label><span
                class="text-[10px] font-black uppercase tracking-widest text-white/30">Format</span></template>
            <el-select v-model="form.format" class="w-full high-contrast-select" popper-class="cinematic-dropdown">
              <el-option label="MP4 (Recommended)" value="mp4" />
              <el-option label="WebM" value="webm" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <template #label><span
                class="text-[10px] font-black uppercase tracking-widest text-white/30">Codec</span></template>
            <el-select v-model="form.codec" class="w-full high-contrast-select" popper-class="cinematic-dropdown">
              <el-option v-for="c in availableCodecs" :key="c.val" :label="c.label" :value="c.val" />
            </el-select>
          </el-form-item>
        </div>

        <div class="grid grid-cols-2 gap-6 mt-2">
          <el-form-item>
            <template #label><span
                class="text-[10px] font-black uppercase tracking-widest text-white/30">Resolution</span></template>
            <el-select v-model="form.resolution" class="w-full high-contrast-select" popper-class="cinematic-dropdown">
              <el-option label="HD (720p)" value="720p" />
              <el-option label="Full HD (1080p)" value="1080p" />
              <el-option label="2K (1440p)" value="2k" />
              <el-option label="4K (2160p)" value="4k" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <template #label><span
                class="text-[10px] font-black uppercase tracking-widest text-white/30">FPS</span></template>
            <el-select v-model="form.fps" class="w-full high-contrast-select" popper-class="cinematic-dropdown">
              <el-option label="24 FPS" :value="24" />
              <el-option label="30 FPS" :value="30" />
              <el-option label="60 FPS" :value="60" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item class="mt-2">
          <template #label><span class="text-[10px] font-black uppercase tracking-widest text-white/30">Quality
              Preset</span></template>
          <el-select v-model="form.bitrate" class="w-full high-contrast-select" popper-class="cinematic-dropdown">
            <el-option label="Low (Faster)" value="low" />
            <el-option label="Medium (Balanced)" value="medium" />
            <el-option label="High (Production)" value="high" />
          </el-select>
        </el-form-item>

        <div class="mt-8 border-t border-white/5 pt-6">
          <div class="flex items-center justify-between mb-6">
            <div class="flex flex-col gap-0.5">
              <span class="text-[11px] font-black text-white/80 uppercase tracking-widest">Global Audio</span>
              <span class="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Include all active
                tracks</span>
            </div>
            <el-switch v-model="form.includeAudio" active-color="#3b82f6" />
          </div>

          <transition name="fade">
            <div v-if="form.includeAudio" class="grid grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2">
              <el-form-item>
                <template #label><span class="text-[10px] font-black uppercase tracking-widest text-white/40">Audio
                    Codec</span></template>
                <el-select v-model="form.audioCodec" class="w-full high-contrast-select"
                  popper-class="cinematic-dropdown">
                  <el-option label="AAC" value="aac" />
                  <el-option label="Opus" value="opus" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <template #label><span class="text-[10px] font-black uppercase tracking-widest text-white/40">Sample
                    Rate</span></template>
                <el-select v-model="form.sampleRate" class="w-full high-contrast-select"
                  popper-class="cinematic-dropdown">
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
    <div v-else class="assembling-state py-12 text-center bg-black/40 border border-white/5 rounded-2xl mx-2">
      <el-progress type="circle" :percentage="Math.round(progress)" :status="progress === 100 ? 'success' : ''"
        :stroke-width="10" color="#3b82f6" :width="120">
        <template #default="{ percentage }">
          <span class="text-2xl font-black text-white tabular-nums">{{ percentage }}%</span>
        </template>
      </el-progress>
      <div class="mt-8 px-6">
        <h3 class="text-lg font-black uppercase tracking-[0.2em] text-white mb-2">{{ status }}</h3>
        <p v-if="progress < 100" class="text-[10px] font-bold text-white/30 uppercase tracking-widest">Optimizing
          segments
          in browser worker...</p>
      </div>
    </div>

    <template #footer>
      <div class="flex gap-3 justify-end px-2 pb-2">
        <template v-if="!isAssembling">
          <el-button @click="visible = false"
            class="cinematic-button !h-10 !px-6 !rounded-xl !bg-white/5 !border-white/10 !text-white/60 hover:!text-white hover:!bg-white/10">CANCEL</el-button>
          <el-button type="primary" @click="handleConfirm"
            class="cinematic-button !h-10 !px-10 !rounded-xl !bg-brand-primary !text-white border-transparent shadow-[0_4px_15px_rgba(59,130,246,0.3)] hover:!scale-[1.02] active:!scale-95 !transition-all">
            <span class="text-[11px] font-black uppercase tracking-[0.2em]">Start Export</span>
          </el-button>
        </template>
        <template v-else>
          <el-button v-if="progress < 100" @click="cancel"
            class="cinematic-button !h-10 !px-8 !rounded-xl !bg-red-500/10 !border-red-500/20 !text-red-500 hover:!bg-red-500/20">ABORT
            PROCESS</el-button>
          <el-button v-else type="success" @click="handleFinish"
            class="cinematic-button !h-10 !px-10 !rounded-xl !bg-green-500 !text-white border-transparent shadow-[0_4px_15px_rgba(34,197,94,0.3)]">
            <span class="text-[11px] font-black uppercase tracking-[0.2em]">View Result</span>
          </el-button>
        </template>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useVideoAssemblerStore } from '@/views/video-editor/store/assembler'
import { type ExportOptions } from '@/composables/useVideoAssembler'

const props = defineProps<{
  modelValue: boolean;
  projectData?: any;
}>()

const emit = defineEmits(['update:modelValue', 'complete'])

const visible = ref(props.modelValue)

watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
})

const assemblerStore = useVideoAssemblerStore()
const { isAssembling, progress, status, result } = storeToRefs(assemblerStore)
const { assemble, cancel } = assemblerStore

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
  await assemble(form as any as ExportOptions, props.projectData)
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
