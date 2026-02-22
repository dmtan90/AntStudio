<template>
  <div class="timeline-view flex flex-col h-full bg-[#0a0a0a] overflow-hidden select-none">
    <!-- Top: Video Player Section -->
    <div class="player-section flex-1 relative flex items-center justify-center min-h-0 bg-[#000]">
      <div class="player-container relative w-full h-full flex items-center justify-center p-8">
        <div
          :class="['video-preview-wrapper relative h-full max-w-full rounded-lg overflow-hidden border border-white/10 group shadow-2xl', previewAspectClass]">
          <canvas ref="canvasRef" class="w-full h-full object-contain bg-black"></canvas>

          <!-- Overlay Controls -->
          <div
            class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <el-button circle class="!w-16 !h-16 !bg-blue-600 !text-white !border-none shadow-[0_0_30px_rgba(59,130,246,0.4)]" @click="togglePlay">
              <Play v-if="!isPlaying" theme="filled" size="32" />
              <Pause v-else theme="filled" size="32" />
            </el-button>
          </div>
        </div>

        <!-- Floating Tooltips/Adustments -->
        <div v-if="selectedAssetId" class="absolute top-10 right-10 flex flex-col gap-4 z-50">
          <el-popover placement="left" :width="280" trigger="click" popper-class="cinematic-popper">
            <template #reference>
              <button class="tool-btn bg-blue-600/10 border-blue-500/20 text-blue-400 shadow-[0_4px_15px_rgba(59,130,246,0.1)]">
                <magic theme="outline" size="18" /> <span>GENERATE</span>
              </button>
            </template>
            <div class="p-4 space-y-4">
              <div class="flex flex-col gap-3">
                <div class="text-[11px] uppercase font-bold text-white/40 mb-1">Manual Generation</div>
                
                <el-button class="!w-full !justify-start !bg-blue-600/10 !text-blue-400 !border-blue-500/20 !text-[11px] !font-bold hover:!bg-blue-600 hover:!text-white transition-all shadow-lg"
                  @click="handleGenerateAllVoiceovers">
                  <voice theme="outline" size="14" class="mr-2" /> CREATE ALL VOICEOVERS
                </el-button>

                <el-button class="!w-full !justify-start !bg-yellow-500/10 !text-yellow-500 !border-yellow-500/20 !text-[11px] !font-bold"
                  @click="handleGenerateAllCaptions">
                  <text-message theme="outline" size="14" class="mr-2" /> CREATE ALL SUBTITLES
                </el-button>

                <el-button class="!w-full !justify-start !bg-blue-500/10 !text-blue-400 !border-blue-500/20 !text-[11px] !font-bold"
                  @click="handleGenerateMusic">
                  <music-one theme="outline" size="14" class="mr-2" /> REGEN BACKGROUND MUSIC
                </el-button>
              </div>
            </div>
          </el-popover>

          <el-popover placement="left" :width="240" trigger="click" popper-class="cinematic-popper">
            <template #reference>
              <button class="tool-btn"><volume-notice theme="outline" size="18" /> <span>{{
                t('projects.editor.timeline.volume') }}</span></button>
            </template>
            <div class="p-4 space-y-4">
              <div class="flex flex-col gap-4">
                <!-- Music Volume (Always visible) -->
                <div class="flex flex-col gap-2">
                  <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Music Volume</div>
                  <div class="flex items-center gap-3">
                    <el-slider v-model="musicVolume" :min="0" :max="1" :step="0.01" class="flex-1"
                      @change="updateMusicVolume" />
                    <span class="text-[10px] w-8 text-right">{{ Math.round(musicVolume * 100) }}%</span>
                  </div>
                </div>

                <!-- Segment Volume (Only if segment selected and is not BGM) -->
                <div v-if="selectedAssetId && !selectedAssetId.startsWith('bgm')" class="flex flex-col gap-4 pt-4 border-t border-white/5">
                   <div class="text-[10px] uppercase font-bold text-blue-400 px-1">Selected: #{{ selectedAssetId }}</div>
                   <div class="flex flex-col gap-2">
                    <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">Video Volume</div>
                    <div class="flex items-center gap-3">
                      <el-slider v-model="currentVolume" :min="0" :max="1" :step="0.01" class="flex-1"
                        @change="updateVolume" />
                      <span class="text-[10px] w-8 text-right">{{ Math.round(currentVolume * 100) }}%</span>
                    </div>
                  </div>
                </div>
                
                <div class="flex flex-col gap-2 pt-4 border-t border-white/5">
                  <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">{{
                    t('projects.editor.timeline.fadeOut') }}</div>
                  <el-slider v-model="fadeOut" :min="0" :max="5" :step="0.1" @change="updateFade" />
                </div>
              </div>
            </div>
          </el-popover>

          <el-popover placement="left" :width="240" trigger="click" popper-class="cinematic-popper">
            <template #reference>
              <button class="tool-btn">
                <speed theme="outline" size="18" /> <span>{{ t('projects.editor.timeline.speed') }}</span>
              </button>
            </template>
            <div class="p-4 space-y-4">
              <div class="flex flex-col gap-2">
                <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">{{
                  t('projects.editor.timeline.speed') }}</div>
                <div class="flex items-center gap-3">
                  <el-slider v-model="currentSpeed" :min="0.1" :max="5" :step="0.1" class="flex-1"
                    @change="updateSpeed" />
                  <span class="text-[10px] w-8 text-right">{{ currentSpeed }}x</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">{{
                  t('projects.editor.timeline.duration') }}</div>
                <div class="flex items-center gap-2">
                  <el-input-number v-model="currentDuration" :min="1" :max="60" size="small" @change="updateDuration" />
                  <span class="text-[10px] text-white/40">{{ t('common.seconds') }}</span>
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <div class="flex justify-between text-[11px] uppercase font-bold text-white/40">{{
                  t('projects.editor.timeline.trimOffset') }}</div>
                <div class="flex items-center gap-2">
                  <el-input-number v-model="currentTrimOffset" :min="0" :step="0.1" size="small"
                    @change="updateTrimOffset" />
                  <span class="text-[10px] text-white/40">{{ t('common.seconds') }}</span>
                </div>
              </div>
            </div>
          </el-popover>
        </div>

        <el-dialog v-model="transitionMenuVisible" :title="t('projects.editor.timeline.transitionSettings')"
          :width="300" :modal="true" :append-to-body="true" class="cinematic-dialog" align-center>
          <div class="flex flex-col gap-2">
            <button v-for="trans in availableTransitions" :key="trans.value"
              class="w-full text-left px-4 py-3 rounded-lg text-sm hover:bg-white/10 transition-colors flex justify-between items-center bg-[#1a1a1a] border border-white/5"
              :class="{ '!border-blue-500 !bg-blue-500/10 text-blue-400': activeTransitionSegment?.transition === trans.value }"
              @click="applyTransition(trans.value)">
              <span class="capitalize">{{ trans.label }}</span>
              <check v-if="activeTransitionSegment?.transition === trans.value" theme="outline" size="16" />
            </button>
          </div>
        </el-dialog>
      </div>

      <!-- Bottom Player Controls -->
      <div class="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 z-30">
        <div
          class="flex items-center gap-6 px-6 py-3 rounded-full bg-black/60 backdrop-blur-xl border border-white/10 shadow-2xl">
          <button class="ctrl-btn-small hover:text-blue-400" @click="handleSeek(-5)">
            <back theme="outline" size="20" />
          </button>
          <button class="ctrl-btn-large bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]" @click="togglePlay">
            <Play v-if="!isPlaying" theme="filled" size="24" />
            <Pause v-else theme="filled" size="24" />
          </button>
          <button class="ctrl-btn-small hover:text-blue-400" @click="handleSeek(5)">
            <next theme="outline" size="20" />
          </button>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <div class="font-mono text-xs tracking-wider min-w-[120px] text-center">
            <span ref="currentTimeRef" class="text-white">00:00.00</span>
            <span class="mx-1 text-white/20">/</span>
            <span ref="totalTimeRef" class="text-white/40">00:00.00</span>
          </div>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <!-- Zoom Controls -->
          <div class="flex items-center gap-3 px-2">
            <button class="text-white/40 hover:text-white transition-colors"
              @click="pxPerSec = Math.max(5, pxPerSec - 5)">
              <zoom-out theme="outline" size="16" />
            </button>
            <div class="w-24">
              <el-slider :model-value="pxPerSec" :min="5" :max="100" :step="1" :show-tooltip="false" class="zoom-slider"
                @input="(val: any) => { pxPerSec = Array.isArray(val) ? val[0] : val }" />
            </div>
            <button class="text-white/40 hover:text-white transition-colors"
              @click="pxPerSec = Math.min(100, pxPerSec + 5)">
              <zoom-in theme="outline" size="16" />
            </button>
          </div>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <button class="ctrl-btn-small hover:text-blue-400" @click="toggleTimeline">
            <Timeline theme="outline" size="20" />
          </button>

          <div class="h-4 w-px bg-white/10 mx-2"></div>

          <button class="ctrl-btn-small hover:text-blue-400" @click="handleAssemble">
            <Export theme="outline" size="20" />
          </button>

          <div v-if="project.publish?.s3Key" class="flex items-center gap-4">
            <div class="w-px h-6 bg-white/10" />
            <div
              class="px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 flex items-center gap-2 cursor-pointer hover:bg-green-500/20 transition-all shadow-[0_4px_15px_rgba(34,197,94,0.1)] active:scale-95 translate-x-1"
              @click="showPublishDialog = true">
              <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span class="text-[10px] font-black text-green-400 uppercase tracking-[0.15em]">Live</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Export Settings Dialog -->
    <ExportSettingsDialog v-model="showExportSettings" @complete="onExportComplete" />

    <!-- Publish / Result Dialog -->
    <PublishDialog v-model="showPublishDialog" :project="project" />

    <!-- Resize Handle -->
    <div
      class="resize-handle h-1 bg-white/5 hover:bg-blue-500 active:bg-blue-500 cursor-row-resize z-[60] transition-colors"
      @mousedown.preventDefault="startResize"></div>

    <!-- Bottom: Timeline Section -->
    <div class="timeline-section flex-shrink-0 border-t border-white/5 bg-[#111] flex overflow-hidden"
      :style="{ height: timelineHeight + 'px' }">
      <!-- Fixed Left: Track Labels -->
      <div
        class="timeline-sidebar w-40 border-r border-white/5 flex flex-col text-[10px] uppercase font-bold text-white/40 bg-[#111] z-50">
        <div class="h-8 border-b border-white/5 flex items-center px-4 bg-black/20">{{
          t('projects.editor.timeline.tracks')
        }}</div>
        <div class="flex-1 py-4 flex flex-col">
          <div class="h-[64px] mb-1 px-4 flex items-center gap-2">
            <video-two theme="outline" size="14" /> {{ t('projects.editor.timeline.videoTrack') }}
          </div>
          <div class="h-14 mb-1 px-4 flex items-center gap-2">
            <voice theme="outline" size="14" /> {{ t('projects.editor.timeline.voiceTrack') }}
          </div>
          <div class="h-14 mb-1 px-4 flex items-center gap-2">
            <text-message theme="outline" size="14" /> {{ t('projects.editor.timeline.subtitleTrack') }}
          </div>
          <div class="h-14 px-4 flex items-center gap-2">
            <music-one theme="outline" size="14" /> {{ t('projects.editor.timeline.musicTrack') }}
          </div>
        </div>
      </div>

      <!-- Scrollable Right: Ruler and Tracks -->
      <div ref="timelineViewportRef"
        class="timeline-viewport flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar relative bg-[#0d0d0d]"
        @scroll="onScroll" @click="onTimelineClick">
        <div class="timeline-content relative h-full" :style="{ width: totalTimelineWidth + 'px' }">

          <!-- Ruler Area -->
          <div class="timeline-ruler h-8 border-b border-white/5 sticky top-0 bg-[#0d0d0d] z-30">
            <div v-for="s in visibleMarkers" :key="s"
              class="absolute inset-y-0 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
              :style="{ left: s * pxPerSec + 'px', width: pxPerSec + 'px' }" @click.stop="onTimelineClick($event, s)">
              <div class="text-[9px] text-white/20 font-mono mb-0.5 pointer-events-none select-none">{{ formatTime(s) }}
              </div>
              <div class="w-px bg-white/10 h-2 pointer-events-none"></div>
            </div>
            <!-- Sub-ticks (only if zoomed in) -->
            <template v-if="pxPerSec > 30">
              <div v-for="s in secondaryMarkers" :key="'sub_' + s" class="absolute bottom-0 w-px bg-white/5 h-1"
                :style="{ left: s * pxPerSec + 'px' }"></div>
            </template>
          </div>

          <div class="tracks-area pt-4">
            <!-- Playhead Line -->
            <div ref="playheadRef"
              class="playhead-line absolute top-0 bottom-0 w-0.5 bg-blue-500 z-50 cursor-ew-resize hover:shadow-[0_0_10px_rgba(59,130,246,0.8)] transition-shadow"
              @mousedown.stop="startDrag">
              <div
                class="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-blue-500 rotate-45 -mt-2 shadow-[0_0_10px_rgba(59,130,246,0.5)] flex items-center justify-center group">
                <div class="w-1.5 h-1.5 bg-white rounded-full opacity-50 group-hover:opacity-100 transition-opacity">
                </div>
              </div>
            </div>

            <!-- Snap Guide Line -->
            <div v-if="snapGuideVisible"
              class="absolute top-0 bottom-0 w-px bg-yellow-500 z-[60] pointer-events-none shadow-[0_0_10px_rgba(234,179,8,0.8)]"
              :style="{ left: snapGuidePos + 'px' }"></div>

            <!-- Video Track Area -->
            <div class="track-row mb-1 flex items-center relative">
              <div v-for="(seg, idx) in timelineSegments" :key="seg.uuid || seg.order"
                class="timeline-clip relative rounded-lg border border-white/10 bg-[#1a1a1a] transition-all cursor-move group"
                :class="selectedAssetId === `vid:${seg.uuid || seg.order}` ? 'border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' : 'hover:border-white/30'"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px', height: '64px' }"
                @click.stop="selectAsset(`vid:${seg.uuid || seg.order}`, seg)">
                <!-- Transition Button -->
                <div v-if="(idx as number) < timelineSegments.length - 1"
                  class="absolute -right-4 top-1/2 -translate-y-1/2 z-[60] opacity-0 group-hover:opacity-100 transition-opacity hover:!opacity-100 w-8 h-8 flex items-center justify-center">
                  <button
                    class="w-6 h-6 rounded-full bg-white border border-black flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] cursor-pointer"
                    @click.stop="openTransitionMenu(seg)">
                    <magic theme="outline" size="14" />
                  </button>
                </div>

                <div class="absolute inset-0 flex overflow-hidden rounded-lg">
                  <GMedia v-if="seg.sceneImage" :src="seg.sceneImage"
                    class="h-full w-full object-cover opacity-50 shrink-0" />
                  <div v-else class="h-full w-full bg-white/5 flex items-center justify-center shrink-0">
                    <pic theme="outline" size="24" class="text-white/10" />
                  </div>
                  <!-- Trim Handles -->
                  <div v-if="selectedAssetId === `vid:${seg.uuid || seg.order}`"
                    class="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-blue-500 opacity-100 transition-opacity z-20 flex items-center justify-center group"
                    @mousedown.stop="startTrim($event, 'start', seg)">
                    <div class="w-1 h-4 bg-black rounded-full"></div>
                  </div>
                  <div v-if="selectedAssetId === `vid:${seg.uuid || seg.order}`"
                    class="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-blue-500 opacity-100 transition-opacity z-20 flex items-center justify-center group"
                    @mousedown.stop="startTrim($event, 'end', seg)">
                    <div class="w-1 h-4 bg-black rounded-full"></div>
                  </div>
                </div>

                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex flex-col justify-end pointer-events-none">
                  <span class="text-[10px] font-bold truncate">{{ seg.title || seg.order }}</span>
                  <span class="text-[9px] text-white/40">{{ (seg.duration / (seg.speed || 1)).toFixed(1) }}s • {{
                    seg.speed
                    || 1 }}x</span>
                </div>
              </div>
            </div>

            <!-- AI Voice Track Area -->
            <div class="track-row h-14 mb-2 flex items-center relative">
              <div v-for="seg in timelineSegments" :key="(seg.uuid || seg.order) + '_voice'"
                class="timeline-clip-audio relative h-10 rounded-md border border-blue-500/20 bg-blue-500/5 flex items-center px-4 cursor-pointer transition-all overflow-hidden"
                :class="selectedAssetId === `voice:${seg.uuid || seg.order}` ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500' : 'hover:border-blue-500/40'"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }"
                @click.stop="selectAsset(`voice:${seg.uuid || seg.order}`, seg)">
                <!-- Waveform Visualization -->
                <WaveformDisplay v-if="seg.voiceUrl" :audio-url="seg.voiceUrl"
                  :width="Math.floor((seg.duration / (seg.speed || 1)) * pxPerSec)" :height="40"
                  color="rgba(59, 130, 246, 0.6)" :bar-width="2" :bar-gap="1" class="absolute inset-0" />
                <span class="absolute left-2 text-[9px] text-blue-400 font-bold uppercase z-10">AI Voice</span>

                <!-- Voice Clip Status Icon -->
                <div v-if="seg.generatedAudio?.status === 'completed'" class="absolute bottom-1 right-1">
                  <check theme="outline" size="10" class="text-blue-400" />
                </div>
              </div>
            </div>

            <!-- Subtitle/Caption Track Area -->
            <div class="track-row h-14 mb-2 flex items-center relative">
              <div v-for="seg in timelineSegments" :key="(seg.uuid || seg.order) + '_caption'"
                class="timeline-clip-caption relative h-10 rounded-md border border-yellow-500/20 bg-yellow-500/5 flex items-center px-4 cursor-pointer transition-all overflow-hidden"
                :class="selectedAssetId === `cap:${seg.uuid || seg.order}` ? 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500' : 'hover:border-yellow-500/40'"
                :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }"
                @click.stop="selectAsset(`cap:${seg.uuid || seg.order}`, seg)">
                <template v-if="seg.captions && seg.captions.length > 0">
                  <div class="flex w-full h-full items-center relative overflow-hidden">
                    <div v-for="(cap, cIdx) in seg.captions" :key="cIdx"
                      class="absolute top-1 bottom-1 bg-yellow-500/20 rounded px-1 flex items-center justify-center text-[9px] text-yellow-500 font-mono whitespace-nowrap overflow-hidden border border-yellow-500/30"
                      :style="{
                        left: (cap.start * pxPerSec) + 'px',
                        width: ((cap.end - cap.start) * pxPerSec) + 'px'
                      }" :title="cap.text">
                      {{ cap.text }}
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div class="w-full h-full flex items-center justify-center opacity-30">
                    <div class="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">{{
                        t('projects.editor.timeline.noCaptions') }}</div>
                  </div>
                </template>
              </div>
            </div>

            <!-- Lower-Third Track -->
            <!-- <div class="track-row h-12 flex items-center relative border-t border-white/5">
              <template v-for="seg in timelineSegments" :key="seg.order + '_lowerthird'">
                <div class="track-content flex-1 relative h-full flex items-center gap-1 group"
                  :style="{ width: (seg.duration / (seg.speed || 1)) * pxPerSec + 'px' }">
                  <template v-if="seg.lowerThirds && seg.lowerThirds.length > 0">
                    <div class="flex w-full h-full items-center relative overflow-hidden">
                      <div v-for="(lt, ltIdx) in seg.lowerThirds" :key="lt.id"
                      class="absolute top-1 bottom-1 bg-purple-500/20 rounded px-2 flex items-center justify-center text-[9px] text-purple-400 font-medium whitespace-nowrap overflow-hidden border border-purple-500/30 cursor-pointer hover:bg-purple-500/30 transition-colors"
                      :style="{
                        left: (lt.startTime * pxPerSec) + 'px',
                        width: (lt.duration * pxPerSec) + 'px'
                      }" :title="lt.text" @click.stop="handleEditLowerThird(seg, lt)">
                      {{ lt.text }}
                    </div>
                  </div>
                </template>
                <template v-else>
                  <div
                    class="w-full h-full flex items-center justify-center opacity-30 group-hover:opacity-100 transition-opacity relative group">
                    <div class="text-[10px] text-purple-400 font-bold uppercase tracking-widest group-hover:hidden">
                      {{ t('projects.editor.timeline.noLowerThirds') }}
                    </div>

                    <el-button size="small"
                      class="hidden group-hover:flex !bg-purple-500/10 !text-purple-400 !border-purple-500/30 !text-[9px] !font-bold"
                      @click.stop="handleAddLowerThird(seg)">
                      {{ t('projects.editor.timeline.addLowerThird') }}
                    </el-button>
                  </div>
                </template>
              </div>
            </template>
            </div> -->

            <!-- Music Track Area -->
            <div class="track-row h-14 flex items-center relative">
              <!-- Has Music: Show waveform -->
              <div v-if="project.musics?.[0]"
                class="timeline-clip-music relative h-10 rounded-md border border-blue-500/20 bg-blue-500/5 flex items-center px-4 cursor-pointer transition-all"
                :class="selectedAssetId?.startsWith('bgm:') ? 'border-blue-400 bg-blue-500/10 ring-1 ring-blue-400' : 'hover:border-blue-400/40'"
                :style="{ width: totalDuration * pxPerSec + 'px' }"
                @click.stop="selectAsset(`bgm:${project.musics[0].id || 'default'}`, { _id: 'bgm', order: 'bgm' })">
                <!-- Waveform Visualization -->
                <WaveformDisplay :audio-url="project.musics?.[0]?.s3Key"
                  :width="Math.floor(totalDuration * pxPerSec)" :height="40" color="rgba(59, 130, 246, 0.5)"
                  :bar-width="2" :bar-gap="1" class="absolute inset-0" />
                <span class="absolute left-2 text-[9px] text-blue-400 font-bold uppercase z-10">{{
                  t('projects.editor.timeline.backgroundMusic') }}</span>
              </div>
              <!-- No Music: Show generate prompt -->
              <div v-else
                class="relative h-10 rounded-md border border-dashed border-blue-500/20 bg-blue-500/5 flex items-center justify-center overflow-hidden cursor-pointer transition-all hover:border-blue-500/40 hover:bg-blue-500/10 group"
                :style="{ width: Math.max(totalDuration * pxPerSec, 200) + 'px' }"
                @click.stop="handleGenerateMusic">
                <div v-if="isGeneratingMusic" class="flex items-center gap-2 text-blue-400">
                  <div class="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                  <span class="text-[9px] font-bold uppercase tracking-widest">Generating AI Music...</span>
                </div>
                <div v-else class="flex items-center gap-2 text-blue-500/50 group-hover:text-blue-400 transition-colors">
                  <music-one theme="outline" size="12" />
                  <span class="text-[9px] font-bold uppercase tracking-widest">Generate AI Background Music</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Lower-Third Editor Dialog -->
  <LowerThirdEditor v-model="lowerThirdEditorVisible" :lower-third="currentLowerThird"
    :max-start-time="currentLowerThirdSegment?.duration || 60" @save="handleSaveLowerThird" />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, markRaw, shallowRef } from 'vue'
import {
  VideoTwo, Pic, Voice, MusicOne, ZoomIn,
  ZoomOut, Magic, Check, Timeline, TextMessage,
  MusicOne as Music, Refresh, Back, Next, Export,
  Speed, VolumeNotice, Play, Pause
} from '@icon-park/vue-next'
import { cn } from '@/utils/ui'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'
import { useTimelinePlayer } from '@/composables/useTimelinePlayer'
import { toast } from 'vue-sonner'
import ExportSettingsDialog from './ExportSettingsDialog.vue'
import PublishDialog from './PublishDialog.vue'
import LowerThirdEditor from './LowerThirdEditor.vue'
import GMedia from '@/components/ui/GMedia.vue'
import WaveformDisplay from '@/components/ui/WaveformDisplay.vue'

const props = defineProps<{
  project: any
}>()

const projectStore = useProjectStore()
const { t } = useTranslations()

// Canvas Ref
const canvasRef = ref<HTMLCanvasElement | null>(null)
const pxPerSec = ref(15)

const currentDuration = ref(0)
const currentVolume = ref(1)
const currentSpeed = ref(1)
const currentTrimOffset = ref(0)
const fadeOut = ref(0)
const timelineHeight = ref(200)

const currentTimeRef = ref<HTMLElement | null>(null)
const totalTimeRef = ref<HTMLElement | null>(null)
const playheadRef = ref<HTMLElement | null>(null)

const segments = computed(() => props.project?.pages || props.project?.storyboard?.segments || [])

// Compute aspect ratio CSS class from project setting
const previewAspectClass = computed(() => {
  switch (props.project?.aspectRatio) {
    case '9:16': return 'aspect-[9/16]'
    case '1:1':  return 'aspect-square'
    case '4:3':  return 'aspect-[4/3]'
    default:     return 'aspect-video' // 16:9
  }
})

const visibleMarkers = computed(() => {
  const duration = totalDuration.value || 60
  const max = Math.ceil(duration * 2)
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

const timelineSegments = shallowRef<any[]>([])
watch(segments, (newSegs) => {
  timelineSegments.value = markRaw(newSegs.map((s: any) => {
    // Check if it matches EditorTemplatePage (has data prop)
    const isTemplatePage = !!s.data;

    // Normalize Duration (Template uses ms, Agentic uses s)
    const rawDuration = s.duration || 5;
    const durationInSeconds = isTemplatePage ? rawDuration / 1000 : rawDuration;

    return {
      _id: s._id || s.order || 0,
      url: s.preview || s.generatedVideo?.s3Key || s.s3Key || '',
      duration: durationInSeconds,
      sourceDuration: s.generatedVideo?.duration || durationInSeconds, // Update this if needed
      speed: s.speed || 1,
      volume: s.volume || 1,
      order: s.order || 0,
      trimOffset: s.trimOffset || 0,
      voiceUrl: s.generatedAudio?.s3Key || s.generatedAudio?.url || '',
      voiceVolume: 1,
      captions: s.captions,
      templatePage: isTemplatePage ? s : undefined,
      sceneImage: s.thumbnail || s.sceneImage
    }
  }))
}, { immediate: true, deep: true })

const player = useTimelinePlayer({
  segments: () => timelineSegments.value,
  backgroundMusic: () => props.project.musics?.[0]?.s3Key ? {
    url: props.project.musics[0].s3Key,
    volume: props.project.musics[0].volume || 0.5
  } : undefined,
  onTimeUpdate: (time) => {
    if (currentTimeRef.value) currentTimeRef.value.textContent = formatTime(time)
    if (playheadRef.value) playheadRef.value.style.left = `${time * pxPerSec.value}px`
  }
})

const { currentTime, isPlaying, totalDuration } = player

onUnmounted(() => {
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup', stopDrag)
})

const selectedAssetId = ref<string | null>(null)
const selectedSegmentId = computed(() => {
  if (!selectedAssetId.value) return null
  const parts = selectedAssetId.value.split(':')
  return parts.length > 1 ? parts[1] : parts[0]
})
const selectedSegment = computed(() => {
  const id = selectedSegmentId.value
  if (!id) return null
  return segments.value.find((s: any) => (s.uuid === id || s.order.toString() === id || s._id === id))
})
const selectedTrack = computed(() => {
  if (!selectedAssetId.value) return null
  return selectedAssetId.value.split(':')[0]
})

const togglePlay = () => {
  if (isPlaying.value) player.pause()
  else player.play()
}

const handleSeek = (seconds: number) => {
  player.seek(currentTime.value + seconds)
}

const musicVolume = ref(props.project.musics?.[0]?.volume || 0.5)

const selectAsset = (assetId: string, seg: any) => {
  selectedAssetId.value = assetId
  if (assetId.startsWith('bgm:')) {
    // bgm selection, no segment specifics
    return
  }
  currentVolume.value = seg.volume || 1
  currentSpeed.value = seg.speed || 1
  currentDuration.value = seg.duration || 5
  currentTrimOffset.value = seg.trimOffset || 0

  let elapsed = 0
  for (const s of timelineSegments.value) {
    if (s.order === seg.order) break
    elapsed += (s.duration / (s.speed || 1))
  }
  player.seek(elapsed)
}

const updateMusicVolume = async () => {
  if (!props.project.musics?.[0]) return
  try {
    props.project.musics[0].volume = musicVolume.value
    player.setMusicVolume(musicVolume.value)
    await saveProjectUpdate()
    toast.success("Music volume updated")
  } catch (e) {
    toast.error("Failed to update music volume")
  }
}

const saveProjectUpdate = async () => {
  try {
    if (props.project.pages) {
      await projectStore.updateProject({ pages: props.project.pages })
    } else {
      await projectStore.updateProject({ storyboard: props.project.storyboard })
    }
    return true
  } catch (e) {
    return false
  }
}

const updateVolume = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.volume = currentVolume.value
    await saveProjectUpdate()
    toast.success(t('projects.editor.timeline.volumeUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateVolume'))
  }
}

const updateSpeed = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.speed = currentSpeed.value
    await saveProjectUpdate()
    toast.success(t('projects.editor.timeline.speedUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateSpeed'))
  }
}

const updateDuration = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.duration = currentDuration.value
    await saveProjectUpdate()
    toast.success(t('projects.editor.timeline.durationUpdated'))
  } catch (e) {
    toast.error(t('projects.editor.timeline.failedUpdateDuration'))
  }
}

const updateTrimOffset = async () => {
  if (!selectedSegment.value) return
  try {
    selectedSegment.value.trimOffset = currentTrimOffset.value
    await saveProjectUpdate()
    toast.success(t('common.updateSuccess'))
  } catch (e) {
    toast.error(t('common.failed'))
  }
}

const updateFade = () => {
  toast.info(t('projects.editor.timeline.fadeUpdated'))
}

const handleGenerateVoiceover = async (seg: any) => {
  const sourceSeg = segments.value.find((s: any) => (s.order || s.order) === seg.order)
  if (!sourceSeg) return;

  if (sourceSeg.data) {
    toast.error("Voice generation not supported for template pages yet")
    return
  }

  if (!sourceSeg.voiceover) {
    toast.error(t('projects.editor.timeline.voiceoverFailed'))
    return
  }
  try {
    const promise = projectStore.generateVoiceover(props.project._id, sourceSeg.order, {
      voiceId: 'en-US-Neural2-J'
    })
    toast.promise(promise, {
      loading: t('projects.editor.timeline.voiceoverGenerating'),
      success: t('projects.editor.timeline.voiceoverSuccess'),
      error: (err) => err.response?.data?.error || t('projects.editor.timeline.voiceoverFailed')
    })
    await promise
  } catch (error) {
    console.error('Voiceover generation error:', error)
  }
}

const handleGenerateCaptions = async (seg: any) => {
  if (seg.isGeneratingCaptions) return

  const sourceSeg = segments.value.find((s: any) => (s.order || s.order) === seg.order)
  if (!sourceSeg) return

  if (sourceSeg.data) {
    toast.error("Caption generation not supported for template pages yet")
    return
  }

  try {
    seg.isGeneratingCaptions = true
    await projectStore.generateCaptions(props.project._id, sourceSeg.order)
    toast.success(t('projects.editor.timeline.captionsGenerated'))
  } catch (error) {
    console.error('Caption generation error:', error)
    toast.error(t('common.failed'))
  } finally {
    seg.isGeneratingCaptions = false
  }
}

const handleGenerateAllVoiceovers = async () => {
  toast.info("Generating all voiceovers...")
  for (const seg of timelineSegments.value) {
    if (!seg.voiceUrl) {
      await handleGenerateVoiceover(seg)
    }
  }
}

const handleGenerateAllCaptions = async () => {
  toast.info("Generating all captions...")
  for (const seg of timelineSegments.value) {
    if (!seg.captions || seg.captions.length === 0) {
      await handleGenerateCaptions(seg)
    }
  }
}

const isGeneratingMusic = ref(false)
const handleGenerateMusic = async () => {
  if (isGeneratingMusic.value) return
  isGeneratingMusic.value = true
  try {
    const mood = props.project?.scriptAnalysis?.analysis?.overview?.mood || props.project?.scriptAnalysis?.audio?.music || 'cinematic'
    const prompt = `Background music for: ${props.project?.title || 'a video'}. Mood: ${mood}`
    await projectStore.generateMusic(props.project._id, { prompt })
    toast.success(t('projects.editor.timeline.backgroundMusic') + ' generated!')
  } catch (error) {
    console.error('Music generation error:', error)
    toast.error(t('common.failed'))
  } finally {
    isGeneratingMusic.value = false
  }
}

// Lower-Third Management
const lowerThirdEditorVisible = ref(false)
const currentLowerThirdSegment = ref<any>(null)
const currentLowerThird = ref<any>(null)

const handleAddLowerThird = (seg: any) => {
  currentLowerThirdSegment.value = seg
  currentLowerThird.value = null
  lowerThirdEditorVisible.value = true
}

const handleEditLowerThird = (seg: any, lowerThird: any) => {
  currentLowerThirdSegment.value = seg
  currentLowerThird.value = lowerThird
  lowerThirdEditorVisible.value = true
}

const handleSaveLowerThird = async (lowerThirdData: any) => {
  if (!currentLowerThirdSegment.value) return

  try {
    const segmentId = currentLowerThirdSegment.value.order
    const segment = segments.value.find((s: any) => s.order === segmentId)

    if (!segment) return

    if (!segment.lowerThirds) {
      segment.lowerThirds = []
    }

    // Check if editing or adding
    const existingIndex = segment.lowerThirds.findIndex((lt: any) => lt.id === lowerThirdData.id)

    if (existingIndex >= 0) {
      // Update existing
      segment.lowerThirds[existingIndex] = lowerThirdData
    } else {
      // Add new
      segment.lowerThirds.push(lowerThirdData)
    }

    await saveProjectUpdate()
    toast.success(t('common.updateSuccess'))
  } catch (error) {
    console.error('Failed to save lower-third:', error)
    toast.error(t('common.failed'))
  }
}

const toggleTimeline = () => {
  timelineHeight.value = timelineHeight.value > 0 ? 0 : 250
}

const showExportSettings = ref(false)
const showPublishDialog = ref(false)

const handleAssemble = () => {
  const completedSegments = timelineSegments.value.filter((s: any) => s.url)
  if (completedSegments.length === 0) {
    toast.error(t('projects.editor.video.noSegments'))
    return
  }
  showExportSettings.value = true
}

const onExportComplete = async () => {
  showPublishDialog.value = true
}

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

// Dragging Logic
const isDragging = ref(false)
const timelineViewportRef = ref<HTMLElement | null>(null)
const onTimelineClick = (e: MouseEvent, time?: number) => {
  if (time !== undefined) {
    player.seek(time)
  } else if (timelineViewportRef.value) {
    const rect = timelineViewportRef.value.getBoundingClientRect()
    const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft
    player.seek(offsetX / pxPerSec.value)
    
    // Deselect if clicking on background
    selectedAssetId.value = null
  }
}

const startDrag = () => {
  isDragging.value = true
  document.body.style.cursor = 'ew-resize'
}


const stopDrag = () => {
  if (isDragging.value) {
    isDragging.value = false
    document.body.style.cursor = ''
  }
}

// Transition Logic
const transitionMenuVisible = ref(false)
const activeTransitionSegment = ref<any>(null)
const availableTransitions = computed(() => [
  { label: t('projects.editor.timeline.transitions.none'), value: null },
  { label: t('projects.editor.timeline.transitions.fade'), value: 'fade' },
  { label: t('projects.editor.timeline.transitions.dissolve'), value: 'dissolve' },
  { label: t('projects.editor.timeline.transitions.blur'), value: 'blur' },
  { label: t('projects.editor.timeline.transitions.zoomBlur'), value: 'zoom-blur' },
  { label: t('projects.editor.timeline.transitions.morph'), value: 'morph' },
  { label: t('projects.editor.timeline.transitions.glitch'), value: 'glitch' },
  { label: t('projects.editor.timeline.transitions.lightLeak'), value: 'light-leak' },
  { label: t('projects.editor.timeline.transitions.cube'), value: 'cube' },
  { label: t('projects.editor.timeline.transitions.flip'), value: 'flip' },
  { label: t('projects.editor.timeline.transitions.wipe'), value: 'wipe' },
  { label: t('projects.editor.timeline.transitions.circle'), value: 'circle' },
  { label: t('projects.editor.timeline.transitions.slide'), value: 'slide' }
])

const openTransitionMenu = (seg: any) => {
  // Find source segment
  const source = segments.value.find((s: any) => (s.order || s.order) === seg.order)
  activeTransitionSegment.value = source
  transitionMenuVisible.value = true
}

const applyTransition = async (type: string | null) => {
  if (!activeTransitionSegment.value) return
  try {
    activeTransitionSegment.value.transition = type
    await saveProjectUpdate()
    toast.success(t('projects.editor.timeline.transitionUpdated'))
    transitionMenuVisible.value = false
  } catch (e) {
    toast.error(t('common.failed'))
  }
}

const onScroll = (e: Event) => {
  // Logic for syncing or handling scroll if needed
}

// Trim Logic
const isTrimming = ref(false)
const trimType = ref<'start' | 'end' | null>(null)
const trimSegment = ref<any>(null)
const trimStartX = ref(0)
const trimOriginalDuration = ref(0)

const startTrim = (e: MouseEvent, type: 'start' | 'end', seg: any) => {
  isTrimming.value = true
  trimType.value = type
  trimSegment.value = seg
  trimStartX.value = e.clientX
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
    let newDisplayDuration = Math.max(0.5, trimOriginalDuration.value + deltaSeconds)
    const maxDur = (trimSegment.value.sourceDuration || 9999) - (trimSegment.value.trimOffset || 0)
    newDisplayDuration = Math.min(newDisplayDuration, maxDur)
    trimSegment.value.duration = newDisplayDuration * speed
  } else if (trimType.value === 'start') {
    const startOffset = trimSegment.value.trimOffset || 0
    const startDur = trimOriginalDuration.value
    const deltaSource = deltaSeconds * speed
    let newTrimOffset = startOffset + deltaSource
    let newDuration = startDur - deltaSeconds
    if (newTrimOffset < 0) {
      newTrimOffset = 0
      newDuration = startDur + (startOffset / speed)
    }
    if (newDuration < 0.5) {
      newDuration = 0.5
      newTrimOffset = startOffset + (startDur - 0.5) * speed
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
    if (trimSegment.value) {
      await saveProjectUpdate()
      trimSegment.value = null
    }
  }
}

// Resize Logic
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
  const deltaY = startY.value - e.clientY
  timelineHeight.value = Math.max(25, Math.min(window.innerHeight * 0.8, startHeight.value + deltaY))
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
      player.draw(ctx, width, height)
    }
  }
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup', stopDrag)
})

// Snap Logic
const snapGuideVisible = ref(false)
const snapGuidePos = ref(0) // in pixels

const getSnappedTime = (time: number) => {
  const threshold = 10 / pxPerSec.value // 10px snap threshold
  let snapped = time
  let minDiff = Infinity

  // Snap to 0
  if (Math.abs(time) < threshold) {
    return { time: 0, snapped: true }
  }

  // Snap to Segment Boundaries
  let elapsed = 0
  for (const seg of segments.value) {
    const duration = seg.duration / (seg.speed || 1)

    // Snap to start of segment (which is end of prev)
    const diffStart = Math.abs(time - elapsed)
    if (diffStart < threshold && diffStart < minDiff) {
      minDiff = diffStart
      snapped = elapsed
    }

    elapsed += duration

    // Snap to end of segment
    const diffEnd = Math.abs(time - elapsed)
    if (diffEnd < threshold && diffEnd < minDiff) {
      minDiff = diffEnd
      snapped = elapsed
    }
  }

  return { time: snapped, snapped: minDiff < threshold }
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !timelineViewportRef.value) return
  const rect = timelineViewportRef.value.getBoundingClientRect()
  const offsetX = e.clientX - rect.left + timelineViewportRef.value.scrollLeft
  const rawTime = Math.max(0, offsetX / pxPerSec.value)

  const { time, snapped } = getSnappedTime(rawTime)
  
  if (snapped && !snapGuideVisible.value) {
    // Pulse haptic feedback when first hitting a snap point
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(10)
    }
  }

  if (snapped) {
    snapGuideVisible.value = true
    snapGuidePos.value = time * pxPerSec.value
  } else {
    snapGuideVisible.value = false
  }

  player.seek(time)
}
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

.player-container {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.video-preview-wrapper {
  position: relative;
  aspect-ratio: 16 / 9;
  height: 100%;
  max-width: 100%;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.tool-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 10px 16px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: #3b82f6;
    color: #3b82f6;
    box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
  }
}

.ctrl-btn-small {
  color: rgba(255, 255, 255, 0.4);
  transition: all 0.2s;
}

.ctrl-btn-large {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    transform: scale(1.1);
  }
}

.timeline-section {
  display: flex;
  background: #111;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.timeline-viewport {
  flex: 1;
  overflow-x: auto;
  position: relative;
  background: #0d0d0d;
}

.timeline-clip {
  flex-shrink: 0;
  position: relative;
  z-index: 10;
}

.timeline-clip-audio,
.timeline-clip-music {
  flex-shrink: 0;
  position: relative;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
  height: 6px;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

:deep(.cinematic-popper) {
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 16px !important;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4) !important;
}

:deep(.zoom-slider .el-slider__runway) {
  background-color: rgba(255, 255, 255, 0.05);
  height: 4px;
}

:deep(.zoom-slider .el-slider__bar) {
  background: linear-gradient(90deg, #3b82f6, #6366f1) !important;
  height: 4px;
}

:deep(.zoom-slider .el-slider__button) {
  width: 12px;
  height: 12px;
  border: 2px solid #3b82f6 !important;
  background: #fff !important;
  box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
}
</style>
