<template>
  <div class="timeline-view flex flex-col h-full bg-[#0a0a0a] overflow-hidden">
    <!-- Top: Video Player Section -->
    <div class="player-section flex-1 relative flex items-center justify-center min-h-0 bg-[#000]">
      <div class="player-container relative w-full h-full flex items-center justify-center p-8">
        <div class="video-preview-wrapper relative aspect-video h-full max-w-full rounded-lg overflow-hidden border border-white/10 group shadow-2xl">
          <canvas 
            ref="canvasRef"
            class="w-full h-full object-contain bg-black"
          ></canvas>
          
          <!-- Overlay Controls -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
             <el-button circle class="!w-16 !h-16 !bg-brand-primary !text-black !border-none pointer-events-auto" @click="togglePlay">
                <play v-if="!isPlaying" theme="filled" size="32" />
                <pause v-else theme="filled" size="32" />
             </el-button>
          </div>
        </div>

        <!-- Floating Tooltips/Adustments (Images 2 & 3) -->
        <div class="absolute top-10 right-10 flex flex-col gap-4 z-50">
           <!-- <el-popover placement="left" :width="240" trigger="click" popper-class="cinematic-popper">
              <template #reference>
                <button class="tool-btn"><volume-notice theme="outline" size="18" /> <span>Audio</span></button>
              </template>
              <div class="p-4 space-y-4">
                 <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Volume</div>
                    <div class="flex items-center gap-3">
                       <el-slider v-model="currentVolume" :min="0" :max="1" :step="0.01" class="flex-1" @change="updateVolume" />
                       <span class="text-[10px] w-8 text-right">{{ Math.round(currentVolume * 100) }}%</span>
                    </div>
                 </div>
                 <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Fade out</div>
                    <el-slider v-model="fadeOut" :min="0" :max="5" :step="0.1" @change="updateFade" />
                 </div>
              </div>
           </el-popover>

           <el-popover placement="left" :width="240" trigger="click" popper-class="cinematic-popper">
              <template #reference>
                <button class="tool-btn"><speed theme="outline" size="18" /> <span>Speed</span></button>
              </template>
              <div class="p-4 space-y-4">
                 <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Speed</div>
                    <div class="flex items-center gap-3">
                       <el-slider v-model="currentSpeed" :min="0.1" :max="5" :step="0.1" class="flex-1" @change="updateSpeed" />
                       <span class="text-[10px] w-8 text-right">{{ currentSpeed }}x</span>
                    </div>
                 </div>
                 <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Duration</div>
                    <div class="flex items-center gap-2">
                      <el-input-number v-model="currentDuration" :min="1" :max="60" size="small" @change="updateDuration" />
                      <span class="text-[10px] text-white/40">seconds</span>
                    </div>
                 </div>
              </div>
           </el-popover> -->
        </div>
      </div>
      
      <!-- Bottom Player Controls -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-30">
        <!-- Assembly Progress -->
        <div v-if="isAssembling" class="w-64 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-2 shadow-2xl animate-in fade-in zoom-in duration-300">
          <div class="flex justify-between text-[10px] font-bold uppercase tracking-wider text-brand-primary">
            <span>Assembling...</span>
            <span>{{ assemblyProgress }}%</span>
          </div>
          <el-progress :percentage="assemblyProgress" :show-text="false" :stroke-width="4" color="#FFD700" />
        </div>

        <div class="flex items-center gap-6 px-6 py-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
          <button class="ctrl-btn-small hover:text-brand-primary" @click="handleSeek(-5)"><back theme="outline" size="20" /></button>
          <button class="ctrl-btn-large bg-brand-primary text-black" @click="togglePlay">
            <PlayIcon v-if="!isPlaying" theme="filled" size="24" />
            <PauseIcon v-else theme="filled" size="24" />
          </button>
          <button class="ctrl-btn-small hover:text-brand-primary" @click="handleSeek(5)"><next theme="outline" size="20" /></button>
          
          <div class="h-4 w-px bg-white/10 mx-2"></div>
          
          <div class="font-mono text-xs tracking-wider min-w-[120px] text-center">
            <span ref="currentTimeRef" class="text-white">00:00.00</span>
            <span class="mx-1 text-white/20">/</span>
            <span ref="totalTimeRef" class="text-white/40">00:00.00</span>
          </div>
          
          <div class="h-4 w-px bg-white/10 mx-2"></div>
          
          <!-- Zoom Controls -->
          <div class="flex items-center gap-3 px-2">
            <button class="text-white/40 hover:text-white transition-colors" @click="pxPerSec = Math.max(5, pxPerSec - 5)">
              <zoom-out theme="outline" size="16" />
            </button>
            <div class="w-24">
              <!-- <el-slider :model-value="pxPerSec" :min="5" :max="100" :step="1" :show-tooltip="false" class="zoom-slider" @input="(val: any) => { pxPerSec = Array.isArray(val) ? val[0] : val }" /> -->
            </div>
            <button class="text-white/40 hover:text-white transition-colors" @click="pxPerSec = Math.min(100, pxPerSec + 5)">
              <zoom-in theme="outline" size="16" />
            </button>
          </div>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <button class="ctrl-btn-small hover:text-brand-primary" :disabled="isAssembling" @click="handleAssemble">
            <export theme="outline" size="20" :class="{ 'animate-pulse text-brand-primary': isAssembling }" />
          </button>
        </div>
      </div>
    </div>

    <!-- Bottom: Timeline Section -->
    <div class="timeline-section h-[340px] border-t border-white/5 bg-[#111] flex select-none overflow-hidden">
      <!-- Fixed Left: Track Labels -->
      <div class="timeline-sidebar w-40 border-r border-white/5 flex flex-col text-[10px] uppercase font-bold text-white/40 bg-[#111] z-50">
        <div class="h-8 border-b border-white/5 flex items-center px-4 bg-black/20">Tracks</div>
        <div class="flex-1 py-4 flex flex-col">
          <div class="h-24 mb-4 px-4 flex items-center gap-2">
            <video-two theme="outline" size="14" /> Video
          </div>
          <div class="h-14 mb-2 px-4 flex items-center gap-2">
            <voice theme="outline" size="14" /> AI Voice
          </div>
          <div class="h-14 px-4 flex items-center gap-2">
            <music-one theme="outline" size="14" /> Music
          </div>
        </div>
      </div>

      <!-- Scrollable Right: Ruler and Tracks -->
      <div class="timeline-viewport flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#0d0d0d]" @scroll="onScroll">
        <div class="timeline-content relative h-full" :style="{ width: totalTimelineWidth + 'px' }">
          
          <!-- Ruler Area -->
          <div class="timeline-ruler h-8 border-b border-white/5 sticky top-0 bg-[#0d0d0d] z-30">
             <div v-for="s in visibleMarkers" :key="s" class="absolute inset-y-0 flex flex-col items-center justify-center" :style="{ left: s * pxPerSec + 'px' }">
                <div class="text-[9px] text-white/20 font-mono mb-0.5">{{ formatTime(s) }}</div>
                <div class="w-px bg-white/10 h-2"></div>
             </div>
             <!-- Sub-ticks (only if zoomed in) -->
             <template v-if="pxPerSec > 30">
               <div v-for="s in secondaryMarkers" :key="'sub_'+s" class="absolute bottom-0 w-px bg-white/5 h-1" :style="{ left: s * pxPerSec + 'px' }"></div>
             </template>
          </div>

          <div class="tracks-area pt-4">
            <!-- Playhead Line -->
            <div ref="playheadRef" class="playhead-line absolute top-0 bottom-0 w-px bg-brand-primary z-50 pointer-events-none">
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-brand-primary rotate-45 -mt-1.5 shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"></div>
            </div>

            <!-- Video Track Area -->
            <div class="track-row h-24 mb-4 flex items-center relative">
              <div 
                v-for="(seg, idx) in segments" 
                :key="seg._id"
                class="timeline-clip relative h-20 rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1a] transition-all cursor-move group"
                :class="selectedSegmentId === seg._id ? 'border-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'hover:border-white/30'"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }"
                @click="selectSegment(seg)"
              >
                <div class="absolute inset-0 flex">
                  <img v-if="seg.sceneImage" :src="getFileUrl(seg.sceneImage)" class="h-full w-full object-cover opacity-50 shrink-0" />
                  <div v-else class="h-full w-full bg-white/5 flex items-center justify-center shrink-0">
                    <pic theme="outline" size="24" class="text-white/10" />
                  </div>
                </div>
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end">
                  <span class="text-[10px] font-bold truncate">{{ seg.title }}</span>
                  <span class="text-[9px] text-white/40">{{ (seg.duration / (seg.speed || 1)).toFixed(1) }}s • {{ seg.speed || 1 }}x</span>
                </div>
              </div>
            </div>

            <!-- AI Voice Track Area -->
            <div class="track-row h-14 mb-2 flex items-center relative">
              <div 
                v-for="seg in segments" 
                :key="seg._id + '_voice'"
                class="timeline-clip-audio relative h-10 rounded-md border border-brand-primary/20 bg-brand-primary/5 flex items-center px-4"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }"
              >
                <div class="flex-1 flex items-center gap-0.5 opacity-40">
                  <div v-for="i in 100" :key="i" class="w-0.5 bg-brand-primary rounded-full transition-all duration-300" :style="{ height: (30 + (i * 7) % 50) + '%' }"></div>
                </div>
                <span class="absolute left-2 text-[9px] text-brand-primary font-bold uppercase truncate pr-4">Dialogue Segment {{ seg.order }}</span>
              </div>
            </div>

            <!-- Music Track Area -->
            <div class="track-row h-14 flex items-center relative">
              <div 
                v-if="project.finalVideo?.backgroundMusic"
                class="timeline-clip-music relative h-10 rounded-md border border-blue-500/20 bg-blue-500/5 flex items-center px-4"
                :style="{ width: totalDuration * pxPerSec + 'px' }"
              >
                <div class="flex-1 flex items-center gap-0.5 opacity-40">
                  <div v-for="i in 500" :key="i" class="w-0.5 bg-blue-400 rounded-full transition-all duration-500" :style="{ height: (20 + (i * 13) % 60) + '%' }"></div>
                </div>
                <span class="absolute left-2 text-[9px] text-blue-400 font-bold uppercase">Background Music</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, markRaw } from 'vue'
import { 
  Play as PlayIcon, Pause as PauseIcon, Back, Next, Export, VolumeNotice, Speed, 
  VideoTwo, Pic, Voice, MusicOne, ZoomIn, ZoomOut 
} from '@icon-park/vue-next'
import { useProjectStore } from '~/stores/project'
import { toast } from 'vue-sonner'

const props = defineProps<{
  project: any
}>()

const projectStore = useProjectStore()
const { t } = useTranslations()

// Canvas Ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pxPerSec = ref(15) // Zoom level

const currentDuration = ref(0)

// Manual DOM Refs for performance
const currentTimeRef = ref<HTMLElement | null>(null)
const totalTimeRef = ref<HTMLElement | null>(null)
const playheadRef = ref<HTMLElement | null>(null)

// Computed
const segments = computed(() => props.project?.storyboard?.segments || [])

const visibleMarkers = computed(() => {
  const duration = totalDuration.value || 60
  const max = Math.ceil(duration * 2)
  // Adaptive step based on zoom
  let step = 10
  if (pxPerSec.value > 50) step = 1
  else if (pxPerSec.value > 30) step = 2
  else if (pxPerSec.value > 15) step = 5
  
  const markers = []
  for (let i = 0; i <= max; i += step) markers.push(i)
  return markers
})

const secondaryMarkers = computed(() => {
  if (pxPerSec.value <= 30) return []
  const duration = totalDuration.value || 60
  const max = Math.ceil(duration * 2)
  const markers = []
  for (let i = 0; i <= max; i += 1) {
    if (i % (pxPerSec.value > 50 ? 0.5 : 1) === 0) markers.push(i)
  }
  return markers
})

const totalTimelineWidth = computed(() => {
  const dur = totalDuration.value || 0
  return Math.max(dur * 2, 60) * pxPerSec.value
})

// Map project segments to player segments - Stabilized with watch
const timelineSegments = shallowRef<any[]>([])
watch(segments, (newSegs) => {
  timelineSegments.value = markRaw(newSegs.map((s: any) => ({
    _id: s._id,
    url: s.generatedVideo?.s3Key || s.s3Key || '',
    duration: s.duration || 5,
    speed: s.speed || 1,
    volume: s.volume || 1,
    order: s.order
  })))
}, { immediate: true, deep: true })

// Initialize Player
const player = useTimelinePlayer({
  segments: () => timelineSegments.value,
  backgroundMusic: () => props.project.backgroundMusic?.s3Key ? {
    url: props.project.backgroundMusic.s3Key,
    volume: props.project.backgroundMusic.volume || 0.5
  } : undefined,
  onTimeUpdate: (time) => {
    // Direct DOM manipulation to bypass Vue VDOM during playback
    if (currentTimeRef.value) currentTimeRef.value.textContent = formatTime(time)
    if (playheadRef.value) playheadRef.value.style.left = `${time * pxPerSec.value}px`
  }
})

const { currentTime, isPlaying, totalDuration, play, pause, seek, draw, setCanvas } = player

onMounted(() => {
  if (totalTimeRef.value) totalTimeRef.value.textContent = formatTime(totalDuration.value)
  
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      const width = canvasRef.value.clientWidth
      const height = canvasRef.value.clientHeight
      canvasRef.value.width = width
      canvasRef.value.height = height
      setCanvas(ctx, width, height)
      draw(ctx, width, height) // Initial draw
    }
  }
})

// Selected Clip State
const selectedSegmentId = ref<string | null>(null)
const selectedSegment = computed(() => 
  props.project?.storyboard?.segments?.find((s: any) => s._id === selectedSegmentId.value)
)

// Actions
const togglePlay = () => {
  if (isPlaying.value) pause()
  else play()
}

const handleSeek = (seconds: number) => {
  seek(currentTime.value + seconds)
}

const onScroll = (e: Event) => {
  // Unused for now
}

const selectSegment = (seg: any) => {
  console.log("selectSegment", seg);
  selectedSegmentId.value = seg._id
  currentVolume.value = seg.volume || 1
  currentSpeed.value = seg.speed || 1
  currentDuration.value = seg.duration || 5
  
  // Jump playhead to start of this segment
  let elapsed = 0
  for (const s of segments.value) {
    if (s._id === seg._id) break
    elapsed += (s.duration / (s.speed || 1))
  }
  seek(elapsed)
}

const updateVolume = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.volume = currentVolume.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success('Volume updated')
  } catch (e) {
    toast.error('Failed to update volume')
  }
}

const updateSpeed = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.speed = currentSpeed.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success('Speed updated')
  } catch (e) {
    toast.error('Failed to update speed')
  }
}

const updateDuration = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.duration = currentDuration.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success('Duration updated')
  } catch (e) {
    toast.error('Failed to update duration')
  }
}

const updateFade = () => {
  toast.info('Fade effect updated (Visual placeholder)')
}

// Assembly State
const isAssembling = ref(false)
const assemblyProgress = ref(0)

const handleAssemble = async () => {
  if (isAssembling.value) return
  
  const completedSegments = segments.value.filter((s: any) => s.generatedVideo?.status === 'completed' && s.generatedVideo?.s3Key)
  if (completedSegments.length === 0) {
    toast.error('No completed segment videos found.')
    return
  }

  isAssembling.value = true
  assemblyProgress.value = 0
  
  try {
    const { 
      Output, Mp4OutputFormat, BufferTarget, 
      Input, ALL_FORMATS, UrlSource,
      VideoSampleSource, AudioSampleSource,
      VideoSampleSink, AudioSampleSink,
      QUALITY_HIGH
    } = await import('mediabunny')

    const output = new Output({
      format: new Mp4OutputFormat(),
      target: new BufferTarget()
    })

    const videoSource = new VideoSampleSource({
      codec: 'avc',
      width: 1920,
      height: 1080,
      bitrate: QUALITY_HIGH
    } as any)
    
    const audioSource = new AudioSampleSource({
      codec: 'aac',
      bitrate: 128000
    })

    output.addVideoTrack(videoSource)
    output.addAudioTrack(audioSource)

    await output.start()

    let compositionTime = 0
    const totalSegments = completedSegments.length

    for (let i = 0; i < totalSegments; i++) {
        const seg = completedSegments[i]
        const segSpeed = seg.speed || 1
        
        assemblyProgress.value = Math.round((i / totalSegments) * 100)
        
        const input = new Input({
          source: new UrlSource(getFileUrl(seg.generatedVideo.s3Key)),
          formats: ALL_FORMATS
        })

        const videoTrack = await input.getPrimaryVideoTrack()
        const audioTrack = await input.getPrimaryAudioTrack()

        if (videoTrack) {
            const sink = new VideoSampleSink(videoTrack)
            for await (const sample of sink.samples()) {
                const adjustedTimestamp = compositionTime + (sample.timestamp / segSpeed)
                const adjustedDuration = sample.duration / segSpeed
                
                sample.setTimestamp(adjustedTimestamp)
                sample.setDuration(adjustedDuration)
                await videoSource.add(sample)
                sample.close()
            }
        }

        if (audioTrack) {
            const sink = new AudioSampleSink(audioTrack)
            for await (const sample of sink.samples()) {
                const adjustedTimestamp = compositionTime + (sample.timestamp / segSpeed)
                sample.setTimestamp(adjustedTimestamp)
                // Note: Volume adjustment would happen here if supported by sample processing
                await audioSource.add(sample)
                sample.close()
            }
        }

        const duration = await input.computeDuration()
        compositionTime += (duration / segSpeed)
        input.dispose()
    }

    await output.finalize()
    assemblyProgress.value = 100

    const finalBlob = new Blob([output.target.buffer as ArrayBuffer], { type: 'video/mp4' })
    
    // Upload to server
    const token = localStorage.getItem('auth-token')
    const formData = new FormData()
    formData.append('file', finalBlob, 'final.mp4')
    formData.append('duration', compositionTime.toString())

    toast.info('Uploading final video...')
    await ($fetch as any)(`/api/projects/${props.project._id}/upload-final-video`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    })

    toast.success('Video assembled and uploaded successfully!')
    projectStore.fetchProject(props.project._id)
  } catch (e: any) {
    console.error('Frontend Assembly Error:', e)
    toast.error(e.message || 'Failed to assemble video in browser')
  } finally {
    isAssembling.value = false
  }
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/s3/${path}`
}

watch(currentTime, (time) => {
  // Logic to switch video source if we reach end of current segment could be here manually
  // but let the computed `currentVideoUrl` handle it for now.
})
</script>

<style lang="scss" scoped>
.ctrl-btn-large {
  @include flex-center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { transform: scale(1.1); }
}

.ctrl-btn-small {
  background: none;
  border: none;
  color: #fff;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s;
  &:hover { opacity: 1; }
}

.tool-btn {
  @include flex-center;
  gap: 8px;
  padding: 0 16px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  backdrop-filter: blur(10px);
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: $brand-primary; }
}

.timeline-clip {
  flex-shrink: 0;
  margin-right: 2px;
}

.tracks-container {
  mask-image: none;
}

.track-row {
  &::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(255, 255, 255, 0.03);
    top: 0;
  }
}

:deep(.cinematic-popper) {
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 0;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  .el-popover__title { color: $brand-primary; font-weight: bold; font-size: 12px; }
}

.custom-scrollbar::-webkit-scrollbar { height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }

.zoom-slider {
  :deep(.el-slider__runway) {
    background-color: rgba(255, 255, 255, 0.1);
    height: 4px;
  }
  :deep(.el-slider__bar) {
    background-color: $brand-primary;
    height: 4px;
  }
  :deep(.el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid $brand-primary;
    background-color: #000;
  }
}
</style>
