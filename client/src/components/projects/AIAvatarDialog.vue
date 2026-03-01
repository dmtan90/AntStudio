<template>
  <el-dialog
    v-model="isVisible"
    :title="$t('projects.avatarCreator.title')"
    width="1000px"
    class="ai-avatar-dialog glass-dark"
    :align-center="true"
    :append-to-body="true"
    :destroy-on-close="true"
    @closed="resetWizard"
  >
    <div class="p-6 min-h-[600px] flex flex-col">
      <!-- Stepper -->
      <div class="flex justify-between items-center mb-8 px-4">
        <div>
          <h2 class="text-xl font-black text-white tracking-tight uppercase mb-1">
            {{ $t(`projects.avatarCreator.steps[${step - 1}]`) }}
          </h2>
          <p class="text-[10px] text-gray-400 font-medium uppercase tracking-widest">
            {{ $t('projects.avatarCreator.step', { step }) }}
          </p>
        </div>
        <div class="flex gap-2">
          <div
            v-for="i in 4"
            :key="i"
            class="w-12 h-1 rounded-full transition-all duration-300"
            :class="step >= i ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-white/10'"
          ></div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="flex-1 relative overflow-hidden">
        <Transition name="slide-fade" mode="out-in">
          <!-- Step 1: Select VTuber -->
          <div v-if="step === 1" key="step1" class="h-full flex flex-col gap-6">
            <div class="grid grid-cols-12 gap-8 h-full">
              <!-- Left: Preview -->
              <div class="col-span-12 lg:col-span-5">
                <div class="avatar-preview-container glass-card aspect-[3/4] relative overflow-hidden rounded-3xl border border-white/10 group">
                  <div v-if="selectedAvatarData" class="w-full h-full bg-[#050505]">
                    <VTuberViewer
                      ref="viewerRef"
                      :modelType="selectedAvatarData.visual.modelType"
                      :modelUrl="selectedAvatarData.visual.modelUrl"
                      :backgroundUrl="selectedAvatarData.visual.backgroundUrl || '/bg/pro-studio.jpg'"
                      :modelConfig="selectedAvatarData.visual.modelConfig"
                      :interactive="false"
                      class="w-full h-full"
                    />
                  </div>
                  <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/40">
                    <User theme="outline" size="64" class="text-white/20 mb-4" />
                    <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
                      {{ $t('projects.avatarCreator.selectVTuber') }}
                    </p>
                  </div>
                  
                  <!-- Info Overlay -->
                  <div v-if="selectedAvatarData" class="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/80 to-transparent pt-12">
                    <h3 class="text-lg font-black text-white uppercase tracking-tight">{{ selectedAvatarData.name }}</h3>
                    <p class="text-xs text-white/60 line-clamp-2 mt-1">
                      {{ selectedAvatarData.description || $t('projects.avatarCreator.noDescription') }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Right: Selection Grid -->
              <div class="col-span-12 lg:col-span-7 flex flex-col gap-4">
                <div class="flex items-center justify-between mb-2">
                  <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">
                    {{ $t('projects.avatarCreator.availableAvatars') }}
                  </span>
                  <div class="flex gap-2">
                    <el-input 
                      v-model="searchQuery" 
                      :placeholder="$t('projects.avatarCreator.search')" 
                      size="small" 
                      class="soul-small-input w-40"
                    >
                      <template #prefix><Search /></template>
                    </el-input>
                  </div>
                </div>

                <div class="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px]">
                  <div v-if="loadingAvatars" class="h-full flex items-center justify-center">
                    <el-icon class="is-loading text-blue-500 text-3xl"><Loading /></el-icon>
                  </div>
                  <div v-else class="flex flex-col h-full">
                    <div class="grid grid-cols-3 gap-4 flex-1">
                      <div 
                        v-for="av in paginatedAvatars" 
                        :key="av._id"
                        class="avatar-selection-card glass-card rounded-2xl p-2 cursor-pointer transition-all hover:scale-[1.02] border"
                        :class="selectedAvatarId === av._id ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 bg-white/5'"
                        @click="selectAvatar(av)"
                      >
                        <div class="aspect-square rounded-xl overflow-hidden mb-2 bg-black/40">
                          <img v-if="av.visual?.thumbnailUrl" :src="getFileUrl(av.visual.thumbnailUrl)" class="w-full h-full object-cover" />
                          <div v-else class="w-full h-full flex items-center justify-center">
                            <Avatar size="24" class="opacity-20" />
                          </div>
                        </div>
                        <div class="px-1 pb-1">
                          <div class="text-[10px] font-black text-white uppercase truncate">{{ av.name }}</div>
                          <div class="text-[8px] text-white/40 uppercase tracking-widest border-t border-white/5 mt-1 pt-1">
                            {{ av.visual?.modelType || $t('projects.avatarCreator.static') }}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Pagination -->
                    <div class="mt-6 flex justify-center pb-2">
                      <el-pagination
                        v-model:current-page="currentPage"
                        :page-size="pageSize"
                        :total="filteredAvatars.length"
                        layout="prev, pager, next"
                        background
                        class="soul-pagination"
                        hide-on-single-page
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Script & Voice (Redesigned) -->
          <div v-else-if="step === 2" key="step2" class="h-full flex flex-col gap-6">
            <div class="grid grid-cols-12 gap-8 h-full min-h-0">
              <!-- Left: Live VTuber Preview -->
              <div class="col-span-12 lg:col-span-5 flex flex-col gap-4">
                <div class="avatar-preview-container glass-card aspect-[3/4] relative overflow-hidden rounded-3xl border border-white/10 group bg-[#050505] shadow-2xl">
                  <VTuberViewer
                    ref="previewViewerRef"
                    v-if="selectedAvatarData"
                    :modelType="selectedAvatarData.visual.modelType"
                    :modelUrl="selectedAvatarData.visual.modelUrl"
                    :backgroundUrl="selectedAvatarData.visual.backgroundUrl || '/bg/pro-studio.jpg'"
                    :modelConfig="selectedAvatarData.visual.modelConfig"
                    :speakingVol="previewSpeakingVol"
                    :interactive="false"
                    class="w-full h-full"
                  />
                  
                  <!-- Preview Control Overlay -->
                  <div class="absolute bottom-6 inset-x-6 flex justify-center">
                    <el-button 
                      type="primary" 
                      class="!bg-blue-600 !border-none !rounded-2xl h-12 px-8 font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:scale-105 transition-transform"
                      :loading="previewLoading"
                      @click="previewVoiceWithSync"
                    >
                      <Play v-if="!isPreviewing" theme="outline" class="mr-2" />
                      <PauseOne v-else theme="outline" class="mr-2" />
                      {{ isPreviewing ? $t('projects.avatarCreator.stopPreview') : $t('projects.avatarCreator.realTimePreview') }}
                    </el-button>
                  </div>
                </div>

                <div class="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 items-center">
                  <div class="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <Tips theme="outline" class="text-blue-400" />
                  </div>
                  <div>
                    <h4 class="text-[11px] font-black text-white uppercase tracking-tight">
                      {{ $t('projects.avatarCreator.lipSyncPreview') }}
                    </h4>
                    <p class="text-[10px] text-white/40 leading-relaxed mt-0.5">
                      {{ $t('projects.avatarCreator.lipSyncDesc') }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Right: Config & Script -->
              <div class="col-span-12 lg:col-span-7 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                <!-- Voice Selection Card -->
                <div class="glass-card p-5 rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent">
                  <div class="flex items-center justify-between mb-4">
                    <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      {{ $t('projects.avatarCreator.voiceProfile') }}
                    </span>
                    <el-button 
                      link 
                      class="!text-blue-400 !text-[10px] font-black uppercase"
                      @click="voiceLibraryVisible = true"
                    >
                      <List theme="outline" class="mr-1" /> {{ $t('projects.avatarCreator.openLibrary') }}
                    </el-button>
                  </div>

                  <div class="flex items-center gap-4 mb-6">
                    <div class="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <MusicOne theme="outline" class="text-white" size="28" />
                    </div>
                    <div>
                      <div class="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">{{ voiceConfig.provider }}</div>
                      <div class="text-base font-black text-white uppercase">
                        {{ voiceConfig.voiceId || $t('projects.avatarCreator.selectVoice') }}
                      </div>
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-6">
                    <StudioSlider 
                      :label="$t('projects.avatarCreator.speechSpeed')" 
                      v-model="voiceConfig.speed" 
                      :min="0.5" :max="2.0" :step="0.1" 
                    />
                    <StudioSlider 
                      :label="$t('projects.avatarCreator.pitchAdjustment')" 
                      v-model="voiceConfig.pitch" 
                      :min="-20" :max="20" :step="1" 
                    />
                  </div>
                </div>

                <!-- Script Input -->
                <div class="flex flex-col gap-3">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      {{ $t('projects.avatarCreator.scriptContent') }}
                    </span>
                    <el-button 
                      link 
                      class="!text-blue-400 !text-[10px] font-black uppercase"
                      @click="generateAiscript"
                      :loading="generatingAiScript"
                    >
                      <Magic theme="outline" class="mr-1" /> {{ $t('projects.avatarCreator.aiWrite') }}
                    </el-button>
                  </div>
                  <div class="relative">
                    <el-input
                      v-model="script"
                      type="textarea"
                      :rows="10"
                      :placeholder="$t('projects.avatarCreator.scriptPlaceholder')"
                      class="soul-glass-textarea !p-0"
                      resize="none"
                    />
                    <div class="absolute bottom-3 right-3 text-[9px] font-bold text-white/20 uppercase">
                      {{ $t('projects.avatarCreator.chars', { count: script.length }) }}
                    </div>
                  </div>
                </div>

                <!-- Tools/Settings -->
                <div class="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div class="flex items-center gap-3">
                    <div class="p-2 rounded-lg bg-blue-500/10">
                      <Magic theme="outline" class="text-blue-400" />
                    </div>
                    <div>
                      <div class="text-[10px] font-black text-white uppercase tracking-widest">
                        {{ $t('projects.avatarCreator.enhancedSync') }}
                      </div>
                      <div class="text-[8px] text-white/30 uppercase tracking-tighter">
                        {{ $t('projects.avatarCreator.aiVisemeMapping') }}
                      </div>
                    </div>
                  </div>
                  <el-switch v-model="voiceConfig.enhancedSync" size="small" />
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Render & Export -->
          <div v-else-if="step === 3" key="step3" class="h-full flex flex-col items-center justify-center gap-8">
            <div class="w-full max-w-4xl grid grid-cols-12 gap-12 items-center">
              <!-- Left: Live Render Canvas -->
              <div class="col-span-12 lg:col-span-6">
                <div class="render-canvas-wrapper glass-card aspect-[3/4] relative overflow-hidden rounded-[40px] border border-white/10 shadow-2xl">
                  <VTuberViewer
                    ref="renderViewerRef"
                    v-if="selectedAvatarData"
                    :modelType="selectedAvatarData.visual.modelType"
                    :modelUrl="selectedAvatarData.visual.modelUrl"
                    :backgroundUrl="selectedAvatarData.visual.backgroundUrl || '/bg/pro-studio.jpg'"
                    :modelConfig="selectedAvatarData.visual.modelConfig"
                    :speakingVol="renderSpeakingVol"
                    :interactive="false"
                    class="w-full h-full"
                  />
                  
                  <!-- Recording Progress Overlay -->
                  <!-- <div v-if="isRendering" class="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                    <div class="relative w-24 h-24 mb-6">
                      <svg class="w-full h-full transform -rotate-90">
                        <circle
                          cx="48" cy="48" r="44"
                          fill="none"
                          stroke="rgba(255,255,255,0.1)"
                          stroke-width="4"
                        />
                        <circle
                          cx="48" cy="48" r="44"
                          fill="none"
                          stroke="#3b82f6"
                          stroke-width="4"
                          stroke-dasharray="276"
                          :stroke-dashoffset="276 * (1 - renderProgress / 100)"
                          stroke-linecap="round"
                          class="transition-all duration-300"
                        />
                      </svg>
                      <div class="absolute inset-0 flex items-center justify-center">
                        <span class="text-xl font-black text-white">{{ Math.round(renderProgress) }}%</span>
                      </div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      <span class="text-[10px] font-black text-white uppercase tracking-widest">Synthesizing & Capturing...</span>
                    </div>
                  </div> -->

                  <!-- Success Overlay (Render Finished) -->
                  <div v-if="exportUrl" class="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center z-30 p-8 text-center animate-fade-in">
                    <div class="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                      <CheckOne theme="outline" size="32" class="text-blue-500" />
                    </div>
                    <h3 class="text-xl font-black text-white uppercase tracking-tight mb-2">
                      {{ $t('projects.avatarCreator.captureComplete') }}
                    </h3>
                    <p class="text-xs text-white/60 mb-8 max-w-[200px]">
                      {{ $t('projects.avatarCreator.captureCompleteDesc') }}
                    </p>
                    
                    <div class="flex flex-col w-full gap-3">
                      <el-button 
                        type="primary" 
                        class="w-full h-12 !rounded-2xl !bg-blue-600 !border-none text-[11px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/20"
                        @click="step = 4"
                      >
                         {{ $t('projects.avatarCreator.continueToPreview') }}
                      </el-button>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Right: Info & Controls -->
              <div class="col-span-12 lg:col-span-6 space-y-8">
                <div>
                  <h3 class="text-2xl font-black text-white uppercase tracking-tighter mb-2">
                    {{ $t('projects.avatarCreator.readyToRender') }}
                  </h3>
                  <p class="text-sm text-white/40 leading-relaxed">
                    {{ $t('projects.avatarCreator.renderDesc') }}
                  </p>
                </div>

                <div class="space-y-4">
                  <div class="p-4 rounded-3xl bg-white/5 border border-white/5 space-y-3">
                    <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span class="text-white/40">{{ $t('projects.avatarCreator.avatar') }}</span>
                      <span class="text-blue-400">{{ selectedAvatarData?.name }}</span>
                    </div>
                    <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span class="text-white/40">{{ $t('projects.avatarCreator.voiceProfile') }}</span>
                      <span class="text-blue-400">{{ voiceConfig.voiceId }}</span>
                    </div>
                    <div class="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                      <span class="text-white/40">{{ $t('projects.avatarCreator.estDuration') }}</span>
                      <span class="text-blue-400">{{ estimatedDuration }}s</span>
                    </div>
                  </div>

                  <el-button 
                    v-if="!isRendering && !exportUrl"
                    type="primary" 
                    size="large"
                    class="w-full h-16 !rounded-[24px] !bg-blue-500 !border-none !text-lg !font-black !uppercase !tracking-[0.2em] shadow-2xl shadow-blue-500/40 hover:scale-[1.02] transition-transform"
                    @click="startRendering"
                  >
                    <Video theme="outline" class="mr-4" size="24" /> {{ $t('projects.avatarCreator.startRendering') }}
                  </el-button>
                  
                  <el-button 
                    v-if="isRendering"
                    class="w-full h-16 !rounded-[24px] !bg-red-500/10 !border-red-500/20 !text-red-500 font-black uppercase tracking-widest"
                    @click="abortRendering"
                  >
                    {{ $t('projects.avatarCreator.abortRendering') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 4: Preview & Publish -->
          <div v-else-if="step === 4" key="step4" class="h-full flex flex-col gap-8">
            <div class="grid grid-cols-12 gap-8 h-full">
              <!-- Left: Video Preview -->
              <div class="col-span-12 lg:col-span-6 flex flex-col gap-4">
                <div class="preview-player-container glass-card aspect-video relative overflow-hidden rounded-[32px] border border-white/10 bg-black shadow-2xl">
                  <video :src="exportUrl" controls class="w-full h-full object-contain"></video>
                </div>

                <div class="p-6 rounded-3xl bg-white/5 border border-white/5 flex flex-col gap-4">
                  <div class="flex items-center justify-between">
                    <span class="text-[10px] font-black text-white/40 uppercase tracking-widest">
                      {{ $t('projects.avatarCreator.metadata') }}
                    </span>
                    <el-button 
                      link 
                      class="!text-blue-400 !text-[10px] font-black uppercase"
                      @click="generateViralHooks"
                      :loading="loadingHooks"
                    >
                      <Magic theme="outline" class="mr-1" /> {{ $t('projects.avatarCreator.aiHookLab') }}
                    </el-button>
                  </div>
                  
                  <el-input 
                    v-model="publishMetadata.title" 
                    :placeholder="$t('projects.avatarCreator.videoTitle')" 
                    class="soul-small-input" 
                  />
                  <el-input 
                    v-model="publishMetadata.description" 
                    type="textarea" 
                    :rows="4" 
                    :placeholder="$t('projects.avatarCreator.videoDescription')" 
                    class="soul-glass-textarea !p-0" 
                  />
                </div>
              </div>

              <!-- Right: Syndication & Export -->
              <div class="col-span-12 lg:col-span-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
                <div>
                  <span class="text-[10px] font-black text-white/40 uppercase tracking-widest block mb-4">
                    {{ $t('projects.avatarCreator.syndicateToPlatforms') }}
                  </span>
                  
                  <div v-if="loadingAccounts" class="h-20 flex items-center justify-center">
                    <el-icon class="is-loading text-blue-500"><Loading /></el-icon>
                  </div>
                  
                  <div v-else-if="accounts.length === 0" class="p-8 text-center glass-card rounded-3xl border-dashed border-white/10">
                    <p class="text-[10px] text-white/30 uppercase font-bold mb-4">
                      {{ $t('projects.avatarCreator.noAccounts') }}
                    </p>
                    <el-button size="small" class="soul-glass-btn" @click="openIntegrations">
                      {{ $t('projects.avatarCreator.connectAccounts') }}
                    </el-button>
                  </div>

                  <div v-else class="grid grid-cols-2 gap-3">
                    <div 
                      v-for="acc in accounts" 
                      :key="acc._id"
                      class="platform-item glass-card p-3 rounded-2xl flex items-center gap-3 cursor-pointer border transition-all"
                      :class="selectedAccountIds.includes(acc._id) ? 'border-blue-500 bg-blue-500/10' : 'border-white/5 hover:bg-white/5'"
                      @click="toggleAccount(acc._id)"
                    >
                      <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-black/40">
                        <Youtube v-if="acc.platform === 'youtube'" theme="filled" fill="#ff0000" />
                        <Facebook v-else-if="acc.platform === 'facebook'" theme="filled" fill="#1877f2" />
                        <PlayOne v-else theme="filled" class="text-white" />
                      </div>
                      <div class="flex-1 overflow-hidden">
                        <div class="text-[10px] font-black text-white uppercase truncate">{{ acc.accountName || acc.platform }}</div>
                      </div>
                      <CheckOne v-if="selectedAccountIds.includes(acc._id)" theme="filled" class="text-blue-500" />
                    </div>
                  </div>
                </div>

                <div class="space-y-4 pt-4 border-t border-white/5">
                  <div class="flex gap-3">
                    <el-button 
                      class="flex-1 h-14 !rounded-2xl soul-glass-btn !bg-white/5 !text-white font-black uppercase tracking-widest"
                      @click="downloadVideo"
                    >
                      <Download theme="outline" class="mr-2" /> {{ $t('projects.avatarCreator.download') }}
                    </el-button>
                    <el-button 
                      class="flex-1 h-14 !rounded-2xl soul-glass-btn !bg-white/5 !text-white font-black uppercase tracking-widest"
                      @click="handleExportProject()"
                      :loading="isExporting"
                    >
                       {{ $t('projects.avatarCreator.saveToProjects') }}
                    </el-button>
                  </div>

                  <el-button 
                    type="primary" 
                    class="w-full h-16 !rounded-2xl !bg-blue-600 !border-none !text-[13px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-600/30"
                    @click="handleFinalPublish"
                    :loading="isPublishing"
                    :disabled="selectedAccountIds.length === 0"
                  >
                    <Send theme="outline" class="mr-3" /> {{ $t('projects.avatarCreator.syndicateFinish') }}
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- Footer Buttons -->
      <div v-if="!isRendering && !exportUrl" class="mt-8 flex justify-between items-center px-4">
        <el-button 
          class="soul-glass-btn text-[11px] font-black uppercase tracking-widest px-8"
          @click="step === 1 ? isVisible = false : step--"
        >
          {{ step === 1 ? $t('common.cancel') : $t('projects.avatarCreator.back') }}
        </el-button>
        <el-button 
          v-if="step < 4"
          type="primary" 
          class="soul-initialize-btn text-[11px] font-black uppercase tracking-widest px-12 h-12 !rounded-2xl shadow-xl shadow-blue-500/20"
          :disabled="!isStepValid"
          @click="step++"
        >
          {{ step === 3 ? $t('projects.avatarCreator.previewResults') : step === 2 ? $t('projects.avatarCreator.renderPreview') : $t('projects.avatarCreator.continue') }}
        </el-button>
      </div>
    </div>

    <!-- Modals -->
    <VoiceLibraryDialog 
      v-model="voiceLibraryVisible"
      v-model:provider="voiceConfig.provider"
      v-model:voiceId="voiceConfig.voiceId"
      v-model:language="voiceConfig.language"
      @select="onVoiceSelect"
    />
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { useVTuberStore } from '@/stores/vtuber';
import { useMediaStore } from '@/stores/media';
import { useProjectStore } from '@/stores/project';
import { usePlatformStore } from '@/stores/platform';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import VTuberViewer from '@/components/vtuber/VTuberViewer.vue';
import VoiceLibraryDialog from '@/components/vtuber/VoiceLibraryDialog.vue';
import StudioSlider from '@/components/studio/shared/StudioSlider.vue';
import { getFileUrl } from '@/utils/api';
import { 
  User, Search, Loading, Avatar, Magic, Tips, MusicOne, 
  Play, PauseOne, List, CheckOne, Download, Video,
  Youtube, Facebook, Send, PlayOne
} from '@icon-park/vue-next';
import { storeToRefs } from 'pinia';

const isVisible = defineModel<boolean>('modelValue', { default: false });
const { t } = useI18n();
const router = useRouter();
const vtuberStore = useVTuberStore();
const mediaStore = useMediaStore();
const projectStore = useProjectStore();
const platformStore = usePlatformStore();

const { accounts, loading: loadingAccounts } = storeToRefs(platformStore);

// Wizard State
const step = ref(1);
const searchQuery = ref('');

// Step 1 State
const loadingAvatars = ref(false);
const avatars = ref<any[]>([]);
const selectedAvatarId = ref<string | null>(null);
const selectedAvatarData = ref<any>(null);
const currentPage = ref(1);
const pageSize = ref(9);

// Step 2 State
const script = ref('');
const generatingAiScript = ref(false);
const voiceLibraryVisible = ref(false);
const voiceConfig = ref({
  provider: 'gemini',
  voiceId: '',
  language: 'en-US',
  sampleUrl: '',
  speed: 1.0,
  pitch: 0,
  enhancedSync: true
});

const previewLoading = ref(false);
const isPreviewing = ref(false);
const previewSpeakingVol = ref(0);
const previewViewerRef = ref<any>(null);
let previewAudio: HTMLAudioElement | null = null;
let previewAnalyser: AnalyserNode | null = null;
let previewDataArray: Uint8Array | null = null;
let previewAnimationId: number | null = null;

// Step 3 State
const isRendering = ref(false);
const renderProgress = ref(0);
const exportUrl = ref('');
const renderSpeakingVol = ref(0);
const renderViewerRef = ref<any>(null);
let renderAudio: HTMLAudioElement | null = null;

// Step 4 State
const isExporting = ref(false);
const isPublishing = ref(false);
const selectedAccountIds = ref<string[]>([]);
const publishMetadata = ref({ title: '', description: '' });
const loadingHooks = ref(false);

const estimatedDuration = computed(() => {
  // Rough estimate: 150 words per minute
  const words = script.value.trim().split(/\s+/).length;
  return Math.ceil((words / 150) * 60) || 5;
});

const filteredAvatars = computed(() => {
  if (!searchQuery.value) return avatars.value;
  const q = searchQuery.value.toLowerCase();
  return avatars.value.filter(av => 
    av.name.toLowerCase().includes(q) || 
    av.visual?.modelType?.toLowerCase().includes(q)
  );
});

const paginatedAvatars = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredAvatars.value.slice(start, end);
});

const isStepValid = computed(() => {
  if (step.value === 1) return !!selectedAvatarId.value;
  if (step.value === 2) return script.value.trim().length > 10 && !!voiceConfig.value.voiceId;
  return true;
});

// Logic
watch(searchQuery, () => {
  currentPage.value = 1;
});
const loadAvatars = async () => {
  loadingAvatars.value = true;
  try {
    await vtuberStore.fetchLibrary();
    avatars.value = vtuberStore.vtubers;
  } catch (e) {
    toast.error(t('projects.avatarCreator.toasts.loadFailed'));
  } finally {
    loadingAvatars.value = false;
  }
};

const selectAvatar = (av: any) => {
  selectedAvatarId.value = av._id;
  selectedAvatarData.value = av;
};

const onVoiceSelect = (v: any) => {
  voiceConfig.value.sampleUrl = v.audioSampleUrl;
};

const previewVoiceWithSync = async () => {
  if (isPreviewing.value) {
    stopPreviewSync();
    return;
  }

  try {
    previewLoading.value = true;
    let audioUrl = voiceConfig.value.sampleUrl;

    if (!audioUrl) {
      const data = await vtuberStore.generateVoicePreview({
        text: t('projects.avatarCreator.toasts.voicePreviewDefault'),
        provider: voiceConfig.value.provider,
        voiceId: voiceConfig.value.voiceId,
        language: voiceConfig.value.language || 'en-US'
      });
      audioUrl = data?.audioUrl;
    }

    if (audioUrl) {
      if (!previewAudio) {
        previewAudio = new Audio();
        previewAudio.crossOrigin = 'anonymous';
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(previewAudio);
        previewAnalyser = audioCtx.createAnalyser();
        previewAnalyser.fftSize = 256;
        source.connect(previewAnalyser);
        previewAnalyser.connect(audioCtx.destination);
        previewDataArray = new Uint8Array(previewAnalyser.frequencyBinCount);
        
        previewAudio.onended = () => { stopPreviewSync(); };
      }
      
      previewAudio.src = getFileUrl(audioUrl);
      await previewAudio.play();
      isPreviewing.value = true;
      startPreviewSyncLoop();
    }
  } catch (e) {
    toast.error(t('projects.avatarCreator.toasts.voicePreviewFailed'));
    stopPreviewSync();
  } finally {
    previewLoading.value = false;
  }
};

const startPreviewSyncLoop = () => {
  if (!isPreviewing.value || !previewAnalyser || !previewDataArray) return;
  
  const update = () => {
    if (!isPreviewing.value || !previewAnalyser || !previewDataArray) return;
    
    previewAnalyser.getByteTimeDomainData(previewDataArray as any);
    let sum = 0;
    for(let i = 0; i < previewDataArray.length; i++) {
      const amplitude = (previewDataArray[i] - 128) / 128.0; 
      sum += amplitude * amplitude;
    }
    const rms = Math.sqrt(sum / previewDataArray.length);
    previewSpeakingVol.value = Math.min(1.0, rms * 2.5);
    
    previewAnimationId = requestAnimationFrame(update);
  };
  
  update();
};

const stopPreviewSync = () => {
  if (previewAudio) {
    previewAudio.pause();
    previewAudio.currentTime = 0;
  }
  if (previewAnimationId) {
    cancelAnimationFrame(previewAnimationId);
    previewAnimationId = null;
  }
  isPreviewing.value = false;
  previewSpeakingVol.value = 0;
};

const generateAiscript = async () => {
  try {
    generatingAiScript.value = true;
    // Mock AI script generation
    await new Promise(r => setTimeout(r, 2000));
    const hostName = selectedAvatarData.value?.name || t('projects.avatarCreator.defaultScriptFallback');
    script.value = t('projects.avatarCreator.defaultScript', { name: hostName });
    toast.success(t('projects.avatarCreator.toasts.scriptGenerated'));
  } catch (e) {
    toast.error(t('projects.avatarCreator.toasts.scriptFailed'));
  } finally {
    generatingAiScript.value = false;
  }
};

const startRendering = async () => {
  if (isRendering.value) return;
  
  isRendering.value = true;
  renderProgress.value = 0;
  exportUrl.value = '';
  
  try {
    // 1. Generate FULL TTS Audio
    const voiceData = await vtuberStore.generateVoicePreview({
      text: script.value,
      provider: voiceConfig.value.provider,
      voiceId: voiceConfig.value.voiceId,
      language: voiceConfig.value.language
    });

    if (!voiceData || !voiceData.audioUrl) throw new Error('Failed to synthesize audio');

    // 2. Setup Audio Analysis for Lip Sync
    const audioUrl = getFileUrl(voiceData.audioUrl);
    renderAudio = new Audio(audioUrl);
    renderAudio.crossOrigin = 'anonymous';

    await new Promise((resolve) => {
      renderAudio!.onloadedmetadata = resolve;
    });

    const duration = renderAudio.duration;
    
    // Web Audio API Setup
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaElementSource(renderAudio);
    const analyser = audioCtx.createAnalyser();
    const destination = audioCtx.createMediaStreamDestination();
    
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    source.connect(destination); // Connect to stream destination for recording
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const updateSync = () => {
      if (!isRendering.value || renderAudio!.ended) return;
      
      analyser.getByteTimeDomainData(dataArray as any);
      let sum = 0;
      for(let i = 0; i < dataArray.length; i++) {
        const amplitude = (dataArray[i] - 128) / 128.0; 
        sum += amplitude * amplitude;
      }
      const rms = Math.sqrt(sum / dataArray.length);
      renderSpeakingVol.value = Math.min(1.0, rms * 2.5); // Sensitivity boost
      
      renderProgress.value = (renderAudio!.currentTime / duration) * 100;
      
      if (!renderAudio!.paused) requestAnimationFrame(updateSync);
    };

    // 3. Start Recording + Playback
    if (renderViewerRef.value?.captureVideo) {
      console.log('[AIAvatarDialog] Starting video capture...');
      const capturePromise = renderViewerRef.value.captureVideo(
        duration * 1000 + 500, // duration in ms
        destination.stream.getAudioTracks()[0] // Audio track from TTS
      );
      
      renderAudio.play();
      updateSync();
      
      const videoBlob = await capturePromise;
      if (videoBlob) {
        exportUrl.value = URL.createObjectURL(videoBlob);
        publishMetadata.value.title = t('projects.avatarCreator.defaultTitlePrefix') + (selectedAvatarData.value?.name || '');
        publishMetadata.value.description = script.value;
        toast.success(t('projects.avatarCreator.toasts.videoCaptured'));
      }
    } else {
        throw new Error("Video capture not supported on this viewer");
    }

  } catch (e: any) {
    console.error('[AIAvatarDialog] Rendering failed:', e);
    toast.error(t('projects.avatarCreator.toasts.renderFailed') + ': ' + e.message);
  } finally {
    isRendering.value = false;
    renderProgress.value = 100;
  }
};

const abortRendering = () => {
  renderAudio?.pause();
  isRendering.value = false;
  toast.warning(t('projects.avatarCreator.toasts.renderAborted'));
};

const handleExportProject = async () => {
    if (isExporting.value) return;
    isExporting.value = true;
    try {
        toast.info(t('projects.avatarCreator.toasts.saving'));
        const response = await fetch(exportUrl.value);
        const blob = await response.blob();
        const file = new File([blob], `avatar_render_${Date.now()}.webm`, { type: 'video/webm' });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('purpose', 'avatar-render');
        // const uploadRes = await mediaStore.uploadMedia(formData);
        
        let data = await projectStore.createProject({
            title: publishMetadata.value.title,
            description: publishMetadata.value.description,
            mode: 'avatar',
            aspectRatio: "16:9",
            videoStyle: "",
            targetDuration: 15,
            input: {
              topic: publishMetadata.value.description
            },
            status: "completed",
        });

        data = await projectStore.publishProject(data.project._id, formData);
        
        toast.success(t('projects.avatarCreator.toasts.saveSuccess'));
        return data.project;
    } catch(e) {
        toast.error(t('projects.avatarCreator.toasts.saveFailed'));
        throw e;
    } finally {
        isExporting.value = false;
    }
};

const handleFinalPublish = async () => {
    if (isPublishing.value) return;
    isPublishing.value = true;
    
    try {
        // 1. First save to project if not already done (or just do it anyway to get the key)
        const project = await handleExportProject();
        if (!project) return;

        // 2. Syndicate to selected platforms
        toast.info(t('projects.avatarCreator.toasts.syndicationStarted'));
        const payload = {
            projectId: project._id,
            s3Key: project.publish.s3Key,
            platformAccountIds: selectedAccountIds.value,
            metadata: publishMetadata.value
        };

        await platformStore.publishSyndication(payload);
        
        toast.success(t('projects.avatarCreator.toasts.syndicationSuccess'));
        isVisible.value = false;
        router.push(`/projects`);
    } catch (e: any) {
        toast.error(t('projects.avatarCreator.toasts.syndicationFailed') + ': ' + e.message);
    } finally {
        isPublishing.value = false;
    }
};

const toggleAccount = (id: string) => {
    const idx = selectedAccountIds.value.indexOf(id);
    if (idx === -1) selectedAccountIds.value.push(id);
    else selectedAccountIds.value.splice(idx, 1);
};

const generateViralHooks = async () => {
    loadingHooks.value = true;
    try {
        // Placeholder for AI Hook generation logic if needed
        setTimeout(() => {
            toast.success(t('projects.avatarCreator.toasts.hooksGenerated'));
            loadingHooks.value = false;
        }, 1500);
    } catch(e) {
        loadingHooks.value = false;
    }
};

const openIntegrations = () => {
    window.open('/admin/settings?tab=integrations', '_blank');
};

const downloadVideo = () => {
  if (!exportUrl.value) return;
  const a = document.createElement('a');
  a.href = exportUrl.value;
  a.download = `ai-avatar-${Date.now()}.webm`;
  a.click();
};


const resetWizard = () => {
  stopPreviewSync();
  step.value = 1;
  selectedAvatarId.value = null;
  selectedAvatarData.value = null;
  script.value = '';
  exportUrl.value = '';
  renderProgress.value = 0;
  selectedAccountIds.value = [];
  publishMetadata.value = { title: '', description: '' };
  currentPage.value = 1;
};

onMounted(() => {
  loadAvatars();
});

watch(isVisible, (val) => {
  if (val && avatars.value.length === 0) {
    loadAvatars();
  }
});

watch(step, (val) => {
  if (val === 3) {
    startRendering();
  } else if (val === 2) {
    stopPreviewSync();
  }
});
</script>

<style lang="scss" scoped>
.ai-avatar-dialog {
  :deep(.el-dialog) {
    background: rgba(10, 10, 12, 0.95) !important;
    backdrop-filter: blur(40px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
}

.glass-card {
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.avatar-selection-card {
  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(59, 130, 246, 0.3);
  }
}

.soul-glass-textarea {
  :deep(.el-textarea__inner) {
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 20px;
    padding: 20px;
    color: #fff;
    font-size: 14px;
    line-height: 1.6;
    transition: all 0.3s;
    
    &:focus {
      background: rgba(0, 0, 0, 0.4);
      border-color: rgba(59, 130, 246, 0.5);
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.1);
    }
  }
}

.soul-test-btn {
  background: rgba(255, 255, 255, 0.05) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  color: #fff !important;
  
  &:hover {
    background: rgba(255, 255, 255, 0.1) !important;
    border-color: rgba(59, 130, 246, 0.5) !important;
    color: #3b82f6 !important;
  }
}

.render-canvas-wrapper {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.6), 
              0 0 80px rgba(59, 130, 246, 0.1);
}

/* Custom Scrollbar */
.custom-scrollbar {
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    &:hover { background: rgba(255, 255, 255, 0.2); }
  }
}

/* Pagination Styles */
.soul-pagination {
  :deep(.el-pager li) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    color: rgba(255, 255, 255, 0.4) !important;
    border-radius: 8px !important;
    font-weight: 800 !important;
    font-family: 'Inter', sans-serif !important;
    
    &.is-active {
      background: #3b82f6 !important;
      color: #fff !important;
      border-color: #3b82f6 !important;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }
    
    &:hover:not(.is-active) {
      color: #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
    }
  }

  :deep(button) {
    background: rgba(255, 255, 255, 0.05) !important;
    border: 1px solid rgba(255, 255, 255, 0.05) !important;
    color: #fff !important;
    border-radius: 8px !important;
    
    &:disabled {
      opacity: 0.3;
      background: transparent !important;
    }
    
    &:hover:not(:disabled) {
      color: #3b82f6 !important;
      background: rgba(59, 130, 246, 0.1) !important;
    }
  }
}

.slide-fade-enter-active {
  transition: all 0.4s ease-out;
}
.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}
.slide-fade-enter-from {
  transform: translateX(30px);
  opacity: 0;
}
.slide-fade-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}
</style>
