<template>
  <div class="timeline-view flex flex-col h-full bg-[#0a0a0a] overflow-hidden select-none">
    <!-- Top: Video Player Section -->
    <div class="player-section flex-1 relative flex items-center justify-center min-h-0 bg-[#000]">
      <div class="player-container relative w-full h-full flex items-center justify-center p-8">
        <div class="video-preview-wrapper relative aspect-video h-full max-w-full rounded-lg overflow-hidden border border-white/10 group shadow-2xl">
          <canvas 
            ref="canvasRef"
            class="w-full h-full object-contain bg-black"
          ></canvas>
          
          <!-- Overlay Controls -->
          <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
             <el-button circle class="!w-16 !h-16 !bg-[#ffffff] !text-black !border-none" @click="togglePlay">
                <PlayIcon v-if="!isPlaying" theme="filled" size="32" />
                <PauseIcon v-else theme="filled" size="32" />
             </el-button>
          </div>
        </div>

        <!-- Floating Tooltips/Adustments (Images 2 & 3) -->
        <div class="absolute top-10 right-10 flex flex-col gap-4 z-50">
           <el-popover placement="left" :width="240" trigger="click" popper-class="cinematic-popper">
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
                 <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Trim Offset</div>
                    <div class="flex items-center gap-2">
                      <el-input-number v-model="currentTrimOffset" :min="0" :step="0.1" size="small" @change="updateTrimOffset" />
                      <span class="text-[10px] text-white/40">seconds</span>
                    </div>
                 </div>
              </div>
           </el-popover>
        </div>
   
        <el-dialog
            v-model="transitionMenuVisible"
            title="Transition Settings"
            :width="300"
            :modal="true"
            :append-to-body="true"
            class="cinematic-dialog"
            align-center
        >
            <div class="flex flex-col gap-2">
                <button 
                  v-for="trans in availableTransitions" 
                  :key="trans.value"
                  class="w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-white/10 transition-colors flex justify-between items-center bg-[#1a1a1a] border border-white/5"
                  :class="{ '!border-brand-primary !bg-brand-primary/10 text-brand-primary': activeTransitionSegment?.transition === trans.value }"
                  @click="applyTransition(trans.value)"
                >
                  <span class="capitalize">{{ trans.label }}</span>
                  <check v-if="activeTransitionSegment?.transition === trans.value" theme="outline" size="16" />
                </button>
            </div>
        </el-dialog>
      </div>
      
      <!-- Bottom Player Controls -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-30">
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
              <el-slider :model-value="pxPerSec" :min="5" :max="100" :step="1" :show-tooltip="false" class="zoom-slider" @input="(val: any) => { pxPerSec = Array.isArray(val) ? val[0] : val }" />
            </div>
            <button class="text-white/40 hover:text-white transition-colors" @click="pxPerSec = Math.min(100, pxPerSec + 5)">
              <zoom-in theme="outline" size="16" />
            </button>
          </div>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <button class="ctrl-btn-small hover:text-brand-primary" @click="toggleTimeline">
            <Timeline theme="outline" size="20" />
          </button>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <button class="ctrl-btn-small hover:text-brand-primary" @click="handleAssemble">
            <Export theme="outline" size="20" />
          </button>
        </div>
      </div>
    </div>

    <!-- Export Settings Dialog -->
    <ExportSettingsDialog 
      v-model="showExportSettings" 
      @complete="onExportComplete" 
    />

    <!-- Publish / Result Dialog -->
    <PublishDialog
      v-model="showPublishDialog"
      :project="project"
    />

    <!-- Resize Handle -->
    <div 
      class="resize-handle h-1 bg-white/5 hover:bg-brand-primary active:bg-brand-primary cursor-row-resize z-[60] transition-colors"
      @mousedown.preventDefault="startResize"
    ></div>

    <!-- Bottom: Timeline Section -->
    <div class="timeline-section flex-shrink-0 border-t border-white/5 bg-[#111] flex overflow-hidden" :style="{ height: timelineHeight + 'px' }">
      <!-- Fixed Left: Track Labels -->
      <div class="timeline-sidebar w-40 border-r border-white/5 flex flex-col text-[10px] uppercase font-bold text-white/40 bg-[#111] z-50">
        <div class="h-8 border-b border-white/5 flex items-center px-4 bg-black/20">{{ t('projects.editor.timeline.tracks') }}</div>
        <div class="flex-1 py-4 flex flex-col">
          <div class="h-[64px] mb-1 px-4 flex items-center gap-2">
            <video-two theme="outline" size="14" /> {{ t('projects.editor.timeline.videoTrack') }}
          </div>
          <div class="h-14 mb-1 px-4 flex items-center gap-2">
            <voice theme="outline" size="14" /> {{ t('projects.editor.timeline.voiceTrack') }}
          </div>
          <div class="h-14 px-4 flex items-center gap-2">
            <music-one theme="outline" size="14" /> {{ t('projects.editor.timeline.musicTrack') }}
          </div>
        </div>
      </div>

      <!-- Scrollable Right: Ruler and Tracks -->
      <div ref="timelineViewportRef" class="timeline-viewport flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#0d0d0d]" @scroll="onScroll" @click="onTimelineClick">
        <div class="timeline-content relative h-full" :style="{ width: totalTimelineWidth + 'px' }">
          
          <!-- Ruler Area -->
          <div class="timeline-ruler h-8 border-b border-white/5 sticky top-0 bg-[#0d0d0d] z-30">
             <div v-for="s in visibleMarkers" :key="s" class="absolute inset-y-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors" :style="{ left: s * pxPerSec + 'px', width: pxPerSec + 'px' }" @click.stop="onTimelineClick($event, s)">
                <div class="text-[9px] text-white/20 font-mono mb-0.5 pointer-events-none select-none">{{ formatTime(s) }}</div>
                <div class="w-px bg-white/10 h-2 pointer-events-none"></div>
             </div>
             <!-- Sub-ticks (only if zoomed in) -->
             <template v-if="pxPerSec > 30">
               <div v-for="s in secondaryMarkers" :key="'sub_'+s" class="absolute bottom-0 w-px bg-white/5 h-1" :style="{ left: s * pxPerSec + 'px' }"></div>
             </template>
          </div>

          <div class="tracks-area pt-4">
            <!-- Playhead Line -->
            <div 
              ref="playheadRef" 
              class="playhead-line absolute top-0 bottom-0 w-0.5 bg-brand-primary z-50 cursor-ew-resize hover:shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.8)] transition-shadow"
              @mousedown.stop="startDrag"
            >
              <div class="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-brand-primary rotate-45 -mt-2 shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)] flex items-center justify-center group">
                 <div class="w-1.5 h-1.5 bg-white rounded-full opacity-50 group-hover:opacity-100 transition-opacity"></div>
              </div>
            </div>

            <!-- Video Track Area -->
            <div class="track-row mb-1 flex items-center relative">
              <div 
                v-for="(seg, idx) in segments" 
                :key="seg._id"
                class="timeline-clip relative rounded-lg border border-white/10 bg-[#1a1a1a] transition-all cursor-move group"
                :class="selectedSegmentId === seg._id ? 'border-brand-primary shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]' : 'hover:border-white/30'"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px', height: '64px' }"
                @click="selectSegment(seg)"
              >
                <!-- Transition Button -->
                <!-- Use z-50 to ensure it's above handles and clip content. 
                     Position strictly between clips. -->
                <div v-if="idx < segments.length - 1" class="absolute -right-4 top-1/2 -translate-y-1/2 z-[60] opacity-0 group-hover:opacity-100 transition-opacity hover:!opacity-100 w-8 h-8 flex items-center justify-center">
                    <button class="w-6 h-6 rounded-full bg-white border border-black flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-pointer" @click.stop="openTransitionMenu(seg)">
                       <magic theme="outline" size="14" />
                    </button>
                </div>

                <div class="absolute inset-0 flex overflow-hidden rounded-lg">
                  <GMedia v-if="seg.sceneImage" :src="seg.sceneImage" class="h-full w-full object-cover opacity-50 shrink-0" />
                  <div v-else class="h-full w-full bg-white/5 flex items-center justify-center shrink-0">
                    <pic theme="outline" size="24" class="text-white/10" />
                  </div>
                  <!-- Trim Handles (only visible when selected) -->
                  <div v-if="selectedSegmentId === seg._id" class="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-brand-primary opacity-100 transition-opacity z-20 flex items-center justify-center group" @mousedown.stop="startTrim($event, 'start', seg)">
                      <div class="w-1 h-4 bg-black rounded-full"></div>
                  </div>
                  <div v-if="selectedSegmentId === seg._id" class="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-brand-primary opacity-100 transition-opacity z-20 flex items-center justify-center group" @mousedown.stop="startTrim($event, 'end', seg)">
                      <div class="w-1 h-4 bg-black rounded-full"></div>
                  </div>
                </div>
                
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end pointer-events-none">
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
                class="timeline-clip-audio relative h-10 rounded-md border border-brand-primary/20 bg-brand-primary/5 flex items-center px-4 overflow-hidden"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }"
              >
                <div class="flex-1 flex items-center gap-0.5 opacity-40">
                  <div v-for="i in 100" :key="i" class="w-0.5 bg-brand-primary rounded-full transition-all duration-300" :style="{ height: (30 + (i * 7) % 50) + '%' }"></div>
                </div>
                <span class="absolute left-2 text-[9px] text-brand-primary font-bold uppercase truncate pr-4">{{ t('projects.editor.timeline.dialogueSegment') }} {{ seg.order }}</span>

                <!-- Voice Clip Status / Actions -->
                <div v-if="!seg.generatedAudio || seg.generatedAudio.status !== 'completed'" class="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity">
                   <el-button 
                      size="small" 
                      class="!bg-brand-primary !text-black !border-none !text-[9px] !font-bold"
                      :loading="seg.generatedAudio?.status === 'generating'"
                      @click.stop="handleGenerateVoiceover(seg)"
                   >
                     {{ seg.generatedAudio?.status === 'generating' ? 'GENERATING...' : 'GENERATE VOICEOVER' }}
                   </el-button>
                </div>
                <div v-else-if="seg.generatedAudio?.status === 'completed'" class="absolute bottom-1 right-1 pb-1 pr-1">
                   <div class="flex items-center gap-1 bg-brand-primary/20 backdrop-blur-md border border-brand-primary/30 rounded px-1.5 py-0.5">
                      <check theme="outline" size="10" class="text-brand-primary" />
                      <span class="text-[8px] font-bold text-brand-primary uppercase">Ready</span>
                   </div>
                </div>
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
                <span class="absolute left-2 text-[9px] text-blue-400 font-bold uppercase">{{ t('projects.editor.timeline.backgroundMusic') }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, markRaw, shallowRef } from 'vue'
import { 
  Play as PlayIcon, Pause as PauseIcon, Back, Next, Export, VolumeNotice, Speed, 
  VideoTwo, Pic, Voice, MusicOne, ZoomIn, ZoomOut, Magic, Check, Timeline 
} from '@icon-park/vue-next'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'
import { useTimelinePlayer } from '@/composables/useTimelinePlayer'
import { toast } from 'vue-sonner'
import { getFileUrl } from '@/utils/api'
import ExportSettingsDialog from './ExportSettingsDialog.vue'
import PublishDialog from './PublishDialog.vue'
import GMedia from '@/components/ui/GMedia.vue'
import { useVideoAssembler } from '@/composables/useVideoAssembler'


const props = defineProps<{
  project: any
}>()

const projectStore = useProjectStore()
const { t } = useTranslations()

// Canvas Ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pxPerSec = ref(15) // Zoom level

const currentDuration = ref(0)
const currentVolume = ref(1)
const currentSpeed = ref(1)
const currentTrimOffset = ref(0)
const fadeOut = ref(0)
const timelineHeight = ref(200)

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

// // Map project segments to player segments - Stabilized with watch
const timelineSegments = shallowRef<any[]>([])
watch(segments, (newSegs) => {
  timelineSegments.value = markRaw(newSegs.map((s: any) => ({
    _id: s._id,
    url: s.generatedVideo?.s3Key || s.s3Key || '',
    duration: s.duration || 5,
    sourceDuration: s.generatedVideo?.duration || s.duration || 5,
    speed: s.speed || 1,
    volume: s.volume || 1,
    order: s.order,
    trimOffset: s.trimOffset || 0
  })))
}, { immediate: true, deep: true })

// // Initialize Player
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

const { currentTime, isPlaying, totalDuration } = player



onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

// // Selected Clip State
const selectedSegmentId = ref<string | null>(null)
const selectedSegment = computed(() => 
  props.project?.storyboard?.segments?.find((s: any) => s._id === selectedSegmentId.value)
)

// // Actions
const togglePlay = () => {
  if (isPlaying.value) player.pause()
  else player.play()
}

const handleSeek = (seconds: number) => {
  player.seek(currentTime.value + seconds)
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
  currentTrimOffset.value = seg.trimOffset || 0
  
  // Jump playhead to start of this segment
  let elapsed = 0
  for (const s of segments.value) {
    if (s._id === seg._id) break
    elapsed += (s.duration / (s.speed || 1))
  }
  player.seek(elapsed)
}

const updateVolume = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.volume = currentVolume.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success(t('projects.editor.timeline.volumeUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateVolume'))
  }
}

const updateSpeed = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.speed = currentSpeed.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success(t('projects.editor.timeline.speedUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateSpeed'))
  }
}

const updateDuration = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.duration = currentDuration.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success(t('projects.editor.timeline.durationUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateDuration'))
  }
}

const updateTrimOffset = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.trimOffset = currentTrimOffset.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success('Trim offset updated')
  } catch (e) {
    toast.error('Failed to update trim offset')
  }
}

const updateFade = () => {
  toast.info(t('projects.editor.timeline.fadeUpdated'))
}

const handleGenerateVoiceover = async (seg: any) => {
  if (!seg.voiceover) {
    toast.error('No dialogue text found for this segment')
    return
  }

  try {
    const promise = projectStore.generateVoiceover(props.project._id, seg._id, {
      voiceId: 'en-US-Neural2-J' // Default voice
    })

    toast.promise(promise, {
      loading: `Generating voiceover for segment ${seg.order}...`,
      success: `Voiceover generated successfully`,
      error: (err) => err.response?.data?.error || 'Failed to generate voiceover'
    })

    await promise
  } catch (error) {
    console.error('Voiceover generation error:', error)
  }
}

const toggleTimeline = () => {
  if(timelineHeight.value > 0){
    timelineHeight.value = 0
  }else{
    timelineHeight.value = 250
  }
};

// // Assembly/Export State
const showExportSettings = ref(false)
const showPublishDialog = ref(false)

const handleAssemble = () => {
  const completedSegments = segments.value.filter((s: any) => s.generatedVideo?.status === 'completed' || s.s3Key)
  if (completedSegments.length === 0) {
    toast.error(t('projects.editor.video.noSegments'))
    return
  }
  showExportSettings.value = true
}

const onExportComplete = async (result: any) => {
  showPublishDialog.value = true
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}



watch(currentTime, (time) => {
  // Logic to switch video source if we reach end of current segment could be here manually
  // but let the computed `currentVideoUrl` handle it for now.
})

// // Dragging Logic
const isDragging = ref(false)
const timelineViewportRef = ref<HTMLElement | null>(null) // We need to add ref="timelineViewportRef" to the viewport div
const onTimelineClick = (e: MouseEvent, time?: number) => {
  if (time !== undefined) {
    player.seek(time)
  } else if (timelineViewportRef.value) {
    const rect = timelineViewportRef.value.getBoundingClientRect()
    const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft
    const newTime = offsetX / pxPerSec.value
    player.seek(newTime)
  }
}

const startDrag = (e: MouseEvent) => {
  isDragging.value = true
  document.body.style.cursor = 'ew-resize'
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !timelineViewportRef.value) return
  const rect = timelineViewportRef.value.getBoundingClientRect()
  // Calculate time based on scroll position + mouse offset relative to viewport
  const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft
  const newTime = Math.max(0, offsetX / pxPerSec.value)
  player.seek(newTime)
}

const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    document.body.style.cursor = ''
  }
}


// // Transition Logic
const transitionMenuVisible = ref(false)
const activeTransitionSegment = ref<any>(null)
const availableTransitions = [
    { label: 'None', value: null }, // or 'none'
    { label: 'Fade', value: 'fade' },
    { label: 'Dissolve', value: 'dissolve' },
    { label: 'Wipe', value: 'wipe' },
    { label: 'Circle', value: 'circle' }
]

const openTransitionMenu = (seg: any) => {
    // For simplicity, we can use the clicked button as reference if we track it,
    // or just toggle a global boolean if we had a single centered modal.
    // However, with el-popover v-model:visible, we need a reference.
    // Hack: We'll set the active segment and just position the "invisible" reference or 
    // simply rely on the fact that we might need a distinct popover for each button (expensive)
    // OR: Use a manual fixed position div (custom popup) instead of el-popover for better control.
    
    // Better approach for now: Just one centered dialog/popup for settings to avoid "reference" hell in v-for.
    activeTransitionSegment.value = seg
    transitionMenuVisible.value = true
}

const applyTransition = async (type: string | null) => {
    if (!activeTransitionSegment.value) return
    try {
        activeTransitionSegment.value.transition = type
        await projectStore.updateProject({ storyboard: props.project.storyboard })
        toast.success(t('projects.editor.timeline.transitionUpdated'))
        transitionMenuVisible.value = false
    } catch (e) {
        toast.error('Failed to update transition')
    }
}


// // Trim Logic
const isTrimming = ref(false)
const trimType = ref<'start' | 'end' | null>(null)
const trimSegment = ref<any>(null)
const trimStartX = ref(0)
const trimOriginalDuration = ref(0) // Original displayed duration (accounting for speed)

const startTrim = (e: MouseEvent, type: 'start' | 'end', seg: any) => {
  isTrimming.value = true
  trimType.value = type
  trimSegment.value = seg
  trimStartX.value = e.clientX
  // Store valid duration
  trimOriginalDuration.value = seg.duration / (seg.speed || 1)
  
  document.body.style.cursor = 'ew-resize'
  window.addEventListener('mousemove', onTrim)
  window.addEventListener('mouseup', stopTrim)
}

const onTrim = (e: MouseEvent) => {
  if (!isTrimming.value || !trimSegment.value) return
  
  const deltaX = e.clientX - trimStartX.value
  const deltaSeconds = deltaX / pxPerSec.value
  const speed = trimSegment.value.speed || 1

  if (trimType.value === 'end') {
    // Changing duration by adjusting end
    // New displayed duration
    let newDisplayDuration = trimOriginalDuration.value + deltaSeconds
    // Clamp: Min 1s, Max original source duration (approx... simplified here to just don't go below 0.5)
    newDisplayDuration = Math.max(0.5, newDisplayDuration)
    
    // Set actual duration property
    // Max duration is sourceDuration (if available) - trimOffset
    const maxDur = (trimSegment.value.sourceDuration || 9999) - (trimSegment.value.trimOffset || 0)
    newDisplayDuration = Math.min(newDisplayDuration, maxDur)
    trimSegment.value.duration = newDisplayDuration * speed
  } else if (trimType.value === 'start') {
     // Trimming start usually means cutting from left, but for simplicity we'll just reduce duration for now
     // Implementing true split/trim requires offset logic not present in model yet (sourceStartTime).
     // Ideally: duration gets shorter, but we keep same end point visually? Or same start point?
     // Standard behavior: dragging left handle right -> start time moves right, duration decreases.
     
     // DeltaX positive (move right) -> duration decreases, offset increases
     const startOffset = trimSegment.value.trimOffset || 0
     const startDur = trimOriginalDuration.value
     
     // Original duration logic: newDisplayDuration = trimOriginalDuration - deltaSeconds
     // But we need to track offset
     
     // Calculate proposed change in source time
     const deltaSource = deltaSeconds * speed
     
     let newTrimOffset = startOffset + deltaSource
     let newDuration = startDur - deltaSeconds // on timeline
     
     // Bounds
     // Offset >= 0
     if (newTrimOffset < 0) {
        newTrimOffset = 0
        newDuration = startDur + (startOffset / speed) // Revert duration expansion if hitting 0 offset
     }
     
     // Duration >= 0.5
     if (newDuration < 0.5) {
        newDuration = 0.5
        newTrimOffset = startOffset + (startDur - 0.5) * speed // Cap offset at end
     }
     
     // Offset + Duration*Speed <= SourceDuration
     const sourceDur = trimSegment.value.sourceDuration || 9999
     if (newTrimOffset + (newDuration * speed) > sourceDur) {
         // Should not happen if dragging start handle usually, unless dragging LEFT (negative delta)
         // If dragging LEFT, offset decreases, duration increases.
         // If we exceed source bounds:
         newTrimOffset = 0 // can't go before 0
         // Max duration is sourceDur / speed
     }

     trimSegment.value.trimOffset = newTrimOffset
     trimSegment.value.duration = newDuration * speed
  }
}

const stopTrim = async () => {
  if (isTrimming.value) {
    isTrimming.value = false
    trimType.value = null
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', onTrim)
    window.removeEventListener('mouseup', stopTrim)
    
    // Persist
    if (trimSegment.value) {
       await projectStore.updateProject({ storyboard: props.project.storyboard })
       trimSegment.value = null
    }
  }
}

// // Resize Logic
const isResizing = ref(false)
const startY = ref(0)
const startHeight = ref(0)

const startResize = (e: MouseEvent) => {
  isResizing.value = true
  startY.value = e.clientY
  startHeight.value = timelineHeight.value
  document.body.style.cursor = 'row-resize'
  window.addEventListener('mousemove', onResize)
  window.addEventListener('mouseup', stopResize)
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value) return
  const deltaY = startY.value - e.clientY // Pulling up increases height
  const newHeight = startHeight.value + deltaY
  // Clamp height (min 200px, max 80% of window height)
  timelineHeight.value = Math.max(25, Math.min(window.innerHeight * 0.8, newHeight))
}

const stopResize = () => {
  isResizing.value = false
  document.body.style.cursor = ''
  window.removeEventListener('mousemove', onResize)
  window.removeEventListener('mouseup', stopResize)
}

onMounted(() => {
  if (totalTimeRef.value) totalTimeRef.value.textContent = formatTime(totalDuration.value)
  
  if (canvasRef.value) {
    const ctx = canvasRef.value.getContext('2d')
    if (ctx) {
      const width = canvasRef.value.clientWidth
      const height = canvasRef.value.clientHeight
      canvasRef.value.width = width
      canvasRef.value.height = height
      player.setCanvas(ctx, width, height)
      player.draw(ctx, width, height) // Initial draw
    }
  }

  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
})

// Ensure Viewport Ref is captured
// See template changes to add ref="timelineViewportRef"
</script>
<style lang="scss" scoped>
.timeline-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: #0a0a0a;
  overflow: hidden;
}

.player-section {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 0;
  background-color: #000;
}

.timeline-section {
  height: 340px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background-color: #111;
  display: flex;
  overflow: hidden;
}

.timeline-sidebar {
  width: 160px;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  background-color: #111;
  z-index: 50;
}

.timeline-viewport {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  position: relative;
  background-color: #0d0d0d;
}

.track-row {
  display: flex;
  align-items: center;
  position: relative;
}

.ctrl-btn-large {
  display: flex;
  align-items: center;
  justify-content: center;
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
  display: flex;
  align-items: center;
  justify-content: center;
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
  &:hover { background: rgba(255, 255, 255, 0.1); border-color: #ffffff; }
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
  .el-popover__title { color: #ffffff; font-weight: bold; font-size: 12px; }
}

.custom-scrollbar::-webkit-scrollbar { height: 6px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }

.zoom-slider {
  :deep(.el-slider__runway) {
    background-color: rgba(255, 255, 255, 0.1);
    height: 4px;
  }
  :deep(.el-slider__bar) {
    background-color: #ffffff;
    height: 4px;
  }
  :deep(.el-slider__button) {
    width: 12px;
    height: 12px;
    border: 2px solid #ffffff;
    background-color: #000;
  }
}
</style>
