<template>
  <div class="storyboard-root custom-scrollbar">
    <!-- View Switcher -->
    <div class="flex items-center gap-2 mb-8 bg-white/5 p-1 rounded-xl w-fit">
      <button 
        class="px-5 py-2 rounded-lg text-xs font-bold transition-all"
        :class="activeSection === 'characters' ? 'bg-brand-primary text-black' : 'text-white/40 hover:text-white'"
        @click="activeSection = 'characters'"
      >
        {{ t('projects.editor.storyboard.keyElements') }}
      </button>
      <button 
        class="px-5 py-2 rounded-lg text-xs font-bold transition-all"
        :class="activeSection === 'segments' ? 'bg-brand-primary text-black' : 'text-white/40 hover:text-white'"
        @click="activeSection = 'segments'"
      >
        {{ t('projects.editor.storyboard.productionSegments') }}
      </button>
    </div>

    <!-- Characters Section -->
    <div v-if="activeSection === 'all' || activeSection === 'characters'" class="mb-12">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl text-white font-bold flex items-center gap-2">
          <peoples theme="outline" size="22" class="text-brand-primary"/>
          {{ t('projects.editor.storyboard.keyElements') }}
        </h3>
        <button 
          class="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-black transition-all group disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
          :disabled="isAnyLoading"
          @click="$emit('regenerate-all-characters')"
        >
          <refresh theme="outline" size="14" :class="[isAnyLoading ? '' : 'group-hover:rotate-180 transition-transform duration-500']"/>
          {{ t('projects.editor.storyboard.regenerateAi') }}
        </button>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <div v-for="(char, idx) in project.scriptAnalysis?.characters" :key="idx" 
          class="element-card relative group aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a] transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 cursor-pointer"
          @click="openCharDialog(char, idx as number)"
        >
          
          <!-- Background Image / Placeholder -->
          <div class="absolute inset-0 z-0">
             <GMedia v-if="char.referenceImage" 
                :src="char.referenceImage" 
                class="w-full h-full object-cover" 
             >
              <template #error>
                <div class="image-slot-error">
                  <pic theme="outline" size="48" class="text-white/10" />
                </div>
              </template>
             </GMedia>
             <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#222] to-[#111]">
                <pic theme="outline" size="48" class="text-white/10" />
             </div>
             <!-- Dark Gradient Overlay -->
             <div class="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-10"></div>
          </div>

          <!-- Loading Overlay -->
          <div v-if="loadingStates[`char-${idx}`]" class="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex items-center justify-center flex-col gap-3">
             <refresh theme="outline" size="32" class="text-brand-primary animate-spin" />
             <span class="text-[10px] font-bold text-brand-primary uppercase tracking-widest">{{ t('common.generating') }}</span>
          </div>

          <!-- Top Actions (Regenerate) -->
          <div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
            <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.charDialog.regenerateVisual')"
              :disabled="loadingStates[`char-${idx}`]"
              @click.stop="$emit('regenerate-character', char, idx as number)"
            >
              <refresh theme="outline" size="16"/>
            </button>
            <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.charDialog.uploadImage')"
              :disabled="loadingStates[`char-${idx}`]"
              @click.stop="$emit('upload-character-image', char, idx as number)"
            >
              <upload theme="outline" size="16"/>
            </button>
          </div>

          <!-- Bottom Content -->
          <div class="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h4 class="text-lg font-bold text-white truncate">{{ char.name }}</h4>
            </div>
            <p class="text-xs text-white/60 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
              {{ char.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Segments Section -->
    <div v-if="activeSection === 'all' || activeSection === 'segments'" class="mb-10">
      <div class="flex items-center justify-between mb-6">
        <h3 class="text-xl text-white font-bold flex items-center gap-2">
          <movie theme="outline" size="22" class="text-brand-primary"/>
          {{ t('projects.editor.storyboard.productionSegments') }}
        </h3>
        <div class="flex items-center gap-3">
          <button 
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-black transition-all group disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
            :disabled="isAnyLoading"
            @click="$emit('generate-all-frames')"
          >
            <pic theme="outline" size="14"/>
            {{ t('projects.editor.storyboard.regenerateAllFrames') }}
          </button>
          <button 
            class="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-xs font-bold hover:bg-brand-primary hover:text-black transition-all group disabled:opacity-30 disabled:cursor-not-allowed disabled:grayscale"
            :disabled="isAnyLoading"
            @click="$emit('generate-all-videos')"
          >
            <play theme="outline" size="14"/>
            {{ t('projects.editor.storyboard.regenerateAllVideos') }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <div v-for="(seg, idx) in project.storyboard?.segments" :key="seg._id || idx" 
          class="segment-card relative group h-[300px] rounded-2xl overflow-hidden border border-white/10 bg-[#1a1a1a] transition-all hover:scale-[1.02] hover:shadow-2xl hover:border-white/20 cursor-pointer"
          @click="openSegDialog(seg, idx as number)"
          @mouseenter="seg.hover = true" @mouseleave="seg.hover = false"
        >
          
          <!-- Background Image -->
          <div class="absolute inset-0 z-0">
             <GMedia v-if="seg.sceneImage" 
                :src="seg.sceneImage" 
                class="w-full h-full object-cover" 
             >
              <template #error>
                <div class="image-slot-error">
                  <pic theme="outline" size="48" class="text-white/10" />
                </div>
              </template>
             </GMedia>
             <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#222] to-[#111]">
                <video-two theme="outline" size="48" class="text-white/10" />
             </div>
             <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10"></div>
             <div v-if="seg.hover && seg.generatedVideo?.s3Key" class="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex items-center justify-center flex-col gap-3">
                <GMedia :src="seg.generatedVideo.s3Key" type="video" autoplay muted loop />
             </div>
          </div>

          <!-- Loading Overlay -->
          <div v-if="loadingStates[`seg-${seg.order}`] || loadingStates[`video-${seg.order}`]" class="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex items-center justify-center flex-col gap-3">
             <refresh theme="outline" size="28" class="text-brand-primary animate-spin" />
             <span class="text-[9px] font-bold text-brand-primary uppercase tracking-widest">{{ loadingStates[`video-${seg.order}`] ? t('projects.editor.storyboard.segDialog.videoProcessing') : t('projects.editor.storyboard.segDialog.imageProcessing') }}</span>
          </div>

          <!-- Top Badge -->
          <div class="absolute top-3 left-3 z-30 w-[calc(100%-1.5rem)]">
            <div class="px-3 py-1 rounded-full bg-brand-primary/20 backdrop-blur-md border border-brand-primary/30 text-[10px] font-bold text-brand-primary uppercase tracking-wider items-center flex gap-2">
              <div v-if="seg.sceneImage" class="w-6 h-6 rounded-full overflow-hidden border border-brand-primary/30">
                <GMedia :src="seg.sceneImage" class="w-full h-full object-cover" />
              </div>
              <el-avatar v-else size="small" shape="circle" :icon="Pic"></el-avatar>
              <span>{{ '#' + seg.order + ' ' + seg.title }}</span>
            </div>
          </div>

          <!-- Right Actions -->
          <div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
             <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.segDialog.regenerateFrame')"
              :disabled="loadingStates[`seg-${seg.order}`] || loadingStates[`video-${seg.order}`]"
              @click.stop="$emit('generate-frame', seg)"
            >
              <pic theme="outline" size="16"/>
            </button>
            <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.segDialog.regenerateVideo')"
              :disabled="loadingStates[`seg-${seg.order}`] || loadingStates[`video-${seg.order}`]"
              @click.stop="$emit('generate-video', seg)"
            >
              <play theme="outline" size="16"/>
            </button>
            <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.segDialog.uploadImageVideo')"
              :disabled="loadingStates[`seg-${seg.order}`] || loadingStates[`video-${seg.order}`]"
              @click.stop="$emit('upload-image-video', seg)"
            >
              <upload theme="outline" size="16"/>
            </button>
          </div>

          <!-- Bottom Content -->
          <div class="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">{{ t('projects.detail.duration') }}: {{ seg.duration || t('common.auto') }}s</span>
              </div>
            </div>

            <div class="flex flex-col gap-2">
              <p class="text-xs text-white/80 leading-relaxed italic line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                "{{ seg.description }}"
              </p>
              
              <!-- Rich Cinematic Details (Visible on hover) -->
              <div class="hidden group-hover:flex flex-col gap-3 mt-2 pt-3 border-t border-white/5 animate-in fade-in duration-500">
                <!-- Location Details -->
                <div v-if="seg.locationDetails" class="flex flex-col gap-1">
                  <span class="text-[9px] uppercase text-brand-primary font-bold tracking-widest">{{ t('projects.editor.storyboard.segDialog.tabs.environment') }}</span>
                  <p class="text-[10px] text-white/60 leading-tight">
                    <span class="text-white/40">{{ t('projects.editor.storyboard.segDialog.locationType') }}:</span> {{ seg.locationDetails.type }}<br/>
                    <span class="text-white/40">{{ t('projects.editor.storyboard.segDialog.atmosphere') }}:</span> {{ seg.locationDetails.atmosphere }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Character Detail Dialog -->
    <el-dialog
      v-model="charDialogVisible"
      :title="editingChar?.name || t('projects.editor.storyboard.charDialog.title')"
      width="1000px"
      class="cinematic-dialog"
      destroy-on-close
    >
      <div v-if="editingChar" class="grid grid-cols-12 gap-8">
        <!-- Preview Column -->
        <div class="col-span-12 lg:col-span-5 flex flex-col gap-4">
          <div class="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
            <GMedia
              v-if="editingChar.referenceImage"
              :src="editingChar.referenceImage"
              class="w-full"
              v-loading="loadingStates[`char-${selectedCharIdx}`]"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-white/5 uppercase font-bold tracking-widest italic">
              {{ t('projects.editor.storyboard.charDialog.noImage') }}
            </div>
          </div>
          <div class="flex gap-2">
            <el-button 
              type="primary" 
              :icon="Refresh"
              :loading="loadingStates[`char-${selectedCharIdx}`]"
              class="w-full !rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
              @click="$emit('regenerate-character', editingChar, selectedCharIdx as number)"
            >
              {{ t('projects.editor.storyboard.charDialog.regenerateVisual') }}
            </el-button>
            <el-button 
              type="primary" 
              :icon="Upload"
              :loading="loadingStates[`char-${selectedCharIdx}`]"
              class="w-full !rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
              @click="$emit('upload-character-image', editingChar, selectedCharIdx as number)"
            >
              {{ t('projects.editor.storyboard.charDialog.uploadImage') }}
            </el-button>  
          </div>
        </div>

        <!-- Meta Column -->
        <div class="col-span-12 lg:col-span-7 h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <div class="space-y-6">
            <div class="form-group border-b border-white/5 pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.editor.storyboard.charDialog.general') }}</label>
              <div class="grid grid-cols-2 gap-4">
                <el-input v-model="editingChar.name" :placeholder="t('projects.editor.storyboard.charDialog.name')" class="cinematic-input col-span-2" />
                <el-select v-model="editingChar.species" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.species')" class="cinematic-select" :teleported="false">
                  <el-option v-for="s in speciesOptions" :key="s.key" :label="t('projects.editor.storyboard.charDialog.options.' + s.key)" :value="s.value" />
                </el-select>
                <el-select v-model="editingChar.gender" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.gender')" class="cinematic-select" :teleported="false">
                  <el-option v-for="g in genderOptions" :key="g.key" :label="t('projects.editor.storyboard.charDialog.options.' + g.key)" :value="g.value" />
                </el-select>
                <el-input v-model="editingChar.age" :placeholder="t('projects.editor.storyboard.charDialog.age')" class="cinematic-input" />
                <el-select v-model="editingChar.body_build" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.bodyBuild')" class="cinematic-select" :teleported="false">
                  <el-option v-for="b in bodyBuildOptions" :key="b.key" :label="t('projects.editor.storyboard.charDialog.options.' + b.key)" :value="b.value" />
                </el-select>
              </div>
            </div>

            <div class="form-group border-b border-white/5 pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.detail.summary') }}</label>
              <el-input 
                v-model="editingChar.description" 
                type="textarea" 
                :rows="4" 
                :placeholder="t('projects.detail.summary')"
                class="cinematic-input"
              />
            </div>

            <div class="form-group border-b border-white/5 pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.editor.storyboard.charDialog.physical') }}</label>
              <div class="grid grid-cols-2 gap-4">
                <el-select v-model="editingChar.face_shape" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.faceShape')" class="cinematic-select" :teleported="false">
                  <el-option v-for="f in faceShapeOptions" :key="f.key" :label="t('projects.editor.storyboard.charDialog.options.' + f.key)" :value="f.value" />
                </el-select>
                <el-select v-model="editingChar.hair" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.hair')" class="cinematic-select" :teleported="false">
                  <el-option v-for="h in hairOptions" :key="h.key" :label="t('projects.editor.storyboard.charDialog.options.' + h.key)" :value="h.value" />
                </el-select>
                <el-select v-model="editingChar.skin_or_fur_color" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.skinColor')" class="cinematic-select" :teleported="false">
                  <el-option v-for="sk in skinColorOptions" :key="sk.key" :label="t('projects.editor.storyboard.charDialog.options.' + sk.key)" :value="sk.value" />
                </el-select>
                <el-input v-model="editingChar.signature_feature" :placeholder="t('projects.editor.storyboard.charDialog.features')" class="cinematic-input" />
              </div>
            </div>

            <div class="form-group border-b border-white/5 pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.editor.storyboard.charDialog.costume') }}</label>
              <div class="grid grid-cols-2 gap-4">
                <el-input v-model="editingChar.outfit_top" :placeholder="t('projects.editor.storyboard.charDialog.outfitTop')" class="cinematic-input col-span-2" />
                <el-input v-model="editingChar.outfit_bottom" :placeholder="t('projects.editor.storyboard.charDialog.outfitBottom')" class="cinematic-input" />
                <el-input v-model="editingChar.shoes_or_footwear" :placeholder="t('projects.editor.storyboard.charDialog.footwear')" class="cinematic-input" />
                <el-input v-model="editingChar.helmet_or_hat" :placeholder="t('projects.editor.storyboard.charDialog.headwear')" class="cinematic-input" />
                <el-input v-model="editingChar.props" :placeholder="t('projects.editor.storyboard.charDialog.props')" class="cinematic-input" />
              </div>
            </div>

            <div class="form-group pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.editor.storyboard.charDialog.voice') }}</label>
              <div v-if="editingChar.tts_config" class="grid grid-cols-2 gap-4">
                <div class="flex flex-col gap-2 col-span-2">
                  <span class="text-[10px] text-white/40">{{ t('projects.editor.storyboard.charDialog.voiceId') }}</span>
                  <div class="flex gap-2">
                    <el-select v-model="editingChar.tts_config.voice_id" filterable :placeholder="t('projects.editor.storyboard.charDialog.voiceId')" class="cinematic-select flex-1" :teleported="false">
                      <el-option 
                        v-for="v in googleVoices" 
                        :key="v.id" 
                        :label="`${v.name} (${v.lang}) - ${v.gender}`" 
                        :value="v.id" 
                      />
                    </el-select>
                    <el-button 
                      circle 
                      class="!bg-brand-primary !text-black !border-none"
                      :disabled="!editingChar.tts_config.voice_id"
                      @click="playVoiceSample(editingChar.tts_config.voice_id)"
                      :title="t('projects.editor.storyboard.charDialog.listen')"
                    >
                      <play theme="outline" size="14" fill="#000" />
                    </el-button>
                  </div>
                </div>
                <el-input v-model="editingChar.tts_config.style_category" :placeholder="t('projects.editor.storyboard.charDialog.styleCategory')" class="cinematic-input" />
                <div class="flex flex-col gap-1">
                  <span class="text-[10px] text-white/40">{{ t('projects.editor.storyboard.charDialog.pitch') }} ({{ editingChar.tts_config.base_pitch }})</span>
                  <el-slider v-model="editingChar.tts_config.base_pitch" :min="-20" :max="20" :step="0.5" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-2 py-4">
          <el-button @click="charDialogVisible = false" class="!bg-white/5 !border-none !text-white/60 hover:!bg-white/10 !rounded-xl">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveCharDetail" class="!bg-brand-primary !text-black !border-none !rounded-xl font-bold px-8">{{ t('common.save') }}</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- Segment Detail Dialog -->
    <el-dialog
      v-model="segDialogVisible"
      :title="editingSeg?.title || t('projects.editor.storyboard.segDialog.title')"
      width="1200px"
      class="cinematic-dialog"
      destroy-on-close
    >
      <div v-if="editingSeg" class="grid grid-cols-12 gap-8">
        <!-- Media Preview -->
        <div class="col-span-12 lg:col-span-6 flex flex-col gap-4">
          <div class="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative" 
            v-loading="loadingStates[`seg-${editingSeg.order}`] || loadingStates[`video-${editingSeg.order}`]">
            <GMedia 
              v-if="editingSeg.generatedVideo?.s3Key" 
              :src="editingSeg.generatedVideo.s3Key" 
              type="video"
              controls 
              autoplay
              class="w-full h-full object-contain"
            />
            <GMedia
              v-else-if="editingSeg.sceneImage"
              :src="editingSeg.sceneImage"
              class="w-full h-full object-contain"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-white/5 uppercase font-bold tracking-widest italic">
              {{ t('projects.editor.storyboard.segDialog.noMedia') }}
            </div>
          </div>
          <div class="grid grid-cols-3 gap-1">
             <el-button 
                :icon="Refresh"
                :loading="loadingStates[`seg-${editingSeg.order}`] || loadingStates[`video-${editingSeg.order}`]"
                class="!rounded-xl !h-12 !bg-white/5 !text-white !border-white/10 font-bold"
                @click="$emit('generate-frame', editingSeg)"
              >
                {{ t('projects.editor.storyboard.segDialog.regenerateFrame') }}
              </el-button>
              <el-button 
                :icon="Refresh"
                type="primary"
                :loading="loadingStates[`seg-${editingSeg.order}`] || loadingStates[`video-${editingSeg.order}`]"
                class="!rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
                @click="$emit('generate-video', editingSeg)"
              >
                {{ t('projects.editor.storyboard.segDialog.regenerateVideo') }}
              </el-button>
              <el-button 
                :icon="Upload"
                type="primary"
                :loading="loadingStates[`seg-${editingSeg.order}`] || loadingStates[`video-${editingSeg.order}`]"
                class="!rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
                @click="$emit('upload-image-video', editingSeg)"
              >
                {{ t('projects.editor.storyboard.segDialog.uploadImageVideo') }}
              </el-button>
          </div>
        </div>

        <!-- Forms Tabs -->
        <div class="col-span-12 lg:col-span-6 h-[600px] flex flex-col">
          <el-tabs v-model="activeSegTab" class="cinematic-tabs flex-1 overflow-hidden">
            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.general')" name="general">
              <div class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group pb-4">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.segTitle') }}</label>
                  <el-input v-model="editingSeg.title" class="cinematic-input" />
                </div>
                <div class="form-group pb-4">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.detail.summary') }}</label>
                  <el-input v-model="editingSeg.description" type="textarea" :rows="6" class="cinematic-input" />
                </div>
                <div class="form-group grid grid-cols-2 gap-4">
                  <div>
                    <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.duration') }}</label>
                    <el-input-number v-model="editingSeg.duration" :min="1" :max="60" class="!w-full cinematic-input" />
                  </div>
                  <div>
                    <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.lipSync') }}</label>
                    <el-switch v-model="editingSeg.lipSyncRequired" />
                  </div>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.cinematic')" name="cinematic">
              <div v-if="editingSeg.cameraDetails" class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.framing') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.framing" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="f in framingOptions" :key="f.key" :label="t('projects.editor.storyboard.segDialog.options.' + f.key)" :value="f.value" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.angle') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.angle" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="a in angleOptions" :key="a.key" :label="t('projects.editor.storyboard.segDialog.options.' + a.key)" :value="a.value" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.movement') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.movement" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="m in movementOptions" :key="m.key" :label="t('projects.editor.storyboard.segDialog.options.' + m.key)" :value="m.value" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.focus') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.focus" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="f in focusOptions" :key="f.key" :label="t('projects.editor.storyboard.segDialog.options.' + f.key)" :value="f.value" />
                  </el-select>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.environment')" name="env">
              <div v-if="editingSeg.locationDetails" class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.locationType') }}</label>
                  <el-select v-model="editingSeg.locationDetails.type" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="opt in environmentOptions" :key="opt.key" :label="t('projects.editor.storyboard.segDialog.options.' + opt.key)" :value="opt.value" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.atmosphere') }}</label>
                  <el-input v-model="editingSeg.locationDetails.atmosphere" class="cinematic-input" />
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.lighting') }}</label>
                  <el-input v-model="editingSeg.locationDetails.lighting" type="textarea" :rows="3" class="cinematic-input" />
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.objects') }}</label>
                  <el-input v-model="editingSeg.locationDetails.objects" type="textarea" :rows="3" class="cinematic-input" />
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.audio')" name="audio">
              <div class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.voiceover') }}</label>
                  <el-input v-model="editingSeg.voiceover" type="textarea" :rows="4" class="cinematic-input" />
                </div>
                
                <div v-if="editingSeg.audioDetails" class="space-y-4 pt-4 border-t border-white/5">
                   <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.audioDetails') }}</label>
                    <el-input v-model="editingSeg.audioDetails.ambience" :placeholder="t('projects.editor.storyboard.segDialog.ambience')" class="cinematic-input" />
                   <el-input v-model="editingSeg.audioDetails.sfx" :placeholder="t('projects.editor.storyboard.segDialog.sfx')" class="cinematic-input" />
                   <el-input v-model="editingSeg.audioDetails.music" :placeholder="t('projects.editor.storyboard.segDialog.music')" class="cinematic-input" />
                </div>

                <div v-if="editingSeg.detailedDialogue?.length" class="space-y-4 pt-4 border-t border-white/5">
                   <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.detailedDialogue') }}</label>
                   <div v-for="(d, dIdx) in editingSeg.detailedDialogue" :key="dIdx" class="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div class="flex justify-between items-center">
                        <span class="text-[10px] font-bold text-brand-primary">{{ d.characterName }} ({{ d.characterId }})</span>
                        <el-input v-model="d.language" size="small" class="!w-24 text-[9px]" :placeholder="t('projects.editor.storyboard.segDialog.lang')" />
                      </div>
                      <el-input v-model="d.line" type="textarea" :rows="2" class="cinematic-input" />
                      <div class="grid grid-cols-2 gap-2">
                        <el-input v-model="d.delivery" :placeholder="t('projects.editor.storyboard.segDialog.delivery')" class="cinematic-input" />
                        <el-input v-model="d.style" :placeholder="t('projects.editor.storyboard.segDialog.style')" class="cinematic-input" />
                        <el-input v-model="d.timing" :placeholder="t('projects.editor.storyboard.segDialog.timing')" class="cinematic-input col-span-2" />
                      </div>
                   </div>
                </div>
              </div>
            </el-tab-pane>
            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.prompt')" name="prompt">
              <div class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block">{{ t('projects.editor.storyboard.segDialog.imagePrompt') }}</label>
                    <button 
                      class="flex items-center gap-1 text-[10px] text-white/40 hover:text-brand-primary transition-colors"
                      @click="copyToClipboard(computedImagePrompt)"
                    >
                      <copy theme="outline" size="12"/>
                      {{ t('common.copy') }}
                    </button>
                  </div>
                  <el-input 
                    :model-value="computedImagePrompt" 
                    type="textarea" 
                    :rows="4" 
                    readonly 
                    class="cinematic-input readonly-input" 
                  />
                </div>

                <div class="form-group">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block">{{ t('projects.editor.storyboard.segDialog.videoPrompt') }}</label>
                    <button 
                      class="flex items-center gap-1 text-[10px] text-white/40 hover:text-brand-primary transition-colors"
                      @click="copyToClipboard(computedVideoPrompt)"
                    >
                      <copy theme="outline" size="12"/>
                      {{ t('common.copy') }}
                    </button>
                  </div>
                  <el-input 
                    :model-value="computedVideoPrompt" 
                    type="textarea" 
                    :rows="12" 
                    readonly 
                    class="cinematic-input readonly-input" 
                  />
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
      <template #footer>
        <div class="flex justify-end gap-3 px-2 py-4 mt-4">
          <el-button @click="segDialogVisible = false" class="!bg-white/5 !border-none !text-white/60 hover:!bg-white/10 !rounded-xl">{{ t('common.cancel') }}</el-button>
          <el-button type="primary" @click="saveSegDetail" class="!bg-brand-primary !text-black !border-none !rounded-xl font-bold px-8">{{ t('common.save') }}</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { 
  Refresh, 
  Pic, 
  Peoples, 
  Movie, 
  Play, 
  VideoTwo, 
  Copy, 
  Upload
} from '@icon-park/vue-next'
import { useProjectStore } from '@/stores/project'
import { useTranslations } from '@/composables/useTranslations'
import { toast } from 'vue-sonner'
import GMedia from '@/components/ui/GMedia.vue'

const activeSection = ref('segments')
const projectStore = useProjectStore()
const { t } = useTranslations()

const props = defineProps<{
  project: any,
  loadingStates: Record<string, boolean>
}>()

const emit = defineEmits([
  'regenerate-character', 'generate-frame', 'generate-video',
  'regenerate-all-characters', 'generate-all-frames', 'generate-all-videos',
  'upload-character-image', 'upload-image-video'
])

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  toast.success(t('common.copySuccess'))
}

// Global loading computed
const isAnyLoading = computed(() => {
  return Object.values(props.loadingStates).some(v => v === true)
})

// Dialog States
const charDialogVisible = ref(false)
const selectedCharIdx = ref(-1)
const editingChar = ref<any>(null)
const segDialogVisible = ref(false)
const selectedSegIdx = ref(-1)
const editingSeg = ref<any>(null)
const activeSegTab = ref('general')

// Predefined Options
const speciesOptions = [
  { key: 'human', value: 'Human' },
  { key: 'robot', value: 'Robot' },
  { key: 'animal', value: 'Animal' },
  { key: 'mystical', value: 'Mystical Creature' },
  { key: 'alien', value: 'Alien' }
]
const genderOptions = [
  { key: 'male', value: 'Male' },
  { key: 'female', value: 'Female' },
  { key: 'other', value: 'Other' },
  { key: 'unknown', value: 'Unknown' }
]
const bodyBuildOptions = [
  { key: 'slender', value: 'Slender' },
  { key: 'balanced', value: 'Balanced' },
  { key: 'muscular', value: 'Muscular' },
  { key: 'chubby', value: 'Chubby' },
  { key: 'petite', value: 'Petite' },
  { key: 'athletic', value: 'Athletic' }
]
const faceShapeOptions = [
  { key: 'oval', value: 'Oval' },
  { key: 'round', value: 'Round' },
  { key: 'square', value: 'Square' },
  { key: 'long', value: 'Long' },
  { key: 'diamond', value: 'Diamond' },
  { key: 'heart', value: 'Heart' }
]
const hairOptions = [
  { key: 'blackShort', value: 'Black, short' },
  { key: 'blondeLong', value: 'Blonde, long' },
  { key: 'brownCurly', value: 'Brown, curly' },
  { key: 'bald', value: 'Bald' },
  { key: 'silverBun', value: 'Silver, high bun' },
  { key: 'shoulder', value: 'Shoulder length' }
]
const skinColorOptions = [
  { key: 'white', value: 'White' },
  { key: 'yellow', value: 'Yellow (Asian)' },
  { key: 'tan', value: 'Tan' },
  { key: 'black', value: 'Black' },
  { key: 'grey', value: 'Grey (Robot)' },
  { key: 'green', value: 'Green' }
]
const framingOptions = [
  { key: 'extremeCloseUp', value: 'Extreme Close-up' },
  { key: 'closeUp', value: 'Close-up' },
  { key: 'mediumShot', value: 'Medium Shot' },
  { key: 'fullShot', value: 'Full Shot' },
  { key: 'wideShot', value: 'Wide Shot' },
  { key: 'extremeWideShot', value: 'Extreme Wide Shot' },
  { key: 'pov', value: 'Point of View (POV)' }
]
const angleOptions = [
  { key: 'eyeLevel', value: 'Eye Level' },
  { key: 'highAngle', value: 'High Angle' },
  { key: 'lowAngle', value: 'Low Angle' },
  { key: 'dutchAngle', value: 'Dutch Angle' },
  { key: 'overShoulder', value: 'Over the Shoulder' },
  { key: 'birdsEye', value: 'Bird\'s Eye View' },
  { key: 'wormsEye', value: 'Worm\'s Eye View' }
]
const movementOptions = [
  { key: 'static', value: 'Static' },
  { key: 'pan', value: 'Pan' },
  { key: 'tilt', value: 'Tilt' },
  { key: 'zoomIn', value: 'Zoom In' },
  { key: 'zoomOut', value: 'Zoom Out' },
  { key: 'dolly', value: 'Dolly' },
  { key: 'tracking', value: 'Tracking' },
  { key: 'handheld', value: 'Handheld' },
  { key: 'craneFlycam', value: 'Crane/Flycam' }
]
const focusOptions = [
  { key: 'deepFocus', value: 'Deep Focus' },
  { key: 'shallowFocus', value: 'Shallow Focus' },
  { key: 'rackFocus', value: 'Rack Focus' },
  { key: 'softFocus', value: 'Soft Focus' }
]
const environmentOptions = [
  { key: 'studio', value: 'Studio' },
  { key: 'indoor', value: 'Indoor' },
  { key: 'outdoor', value: 'Outdoor' },
  { key: 'urban', value: 'Urban' },
  { key: 'nature', value: 'Nature' },
  { key: 'scifi', value: 'Sci-fi/Futuristic' },
  { key: 'cyberpunk', value: 'Cyberpunk City' },
  { key: 'cinematicInterior', value: 'Cinematic Interior' }
]

const googleVoices = [
  { id: 'vi-VN-Standard-A', name: 'Vietnam (Female A)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-A.wav' },
  { id: 'vi-VN-Standard-B', name: 'Vietnam (Male B)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-B.wav' },
  { id: 'vi-VN-Standard-C', name: 'Vietnam (Female C)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-C.wav' },
  { id: 'vi-VN-Standard-D', name: 'Vietnam (Male D)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-D.wav' },
  { id: 'vi-VN-Wavenet-A', name: 'Vietnam (Female - Premium A)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Wavenet-A.wav' },
  { id: 'vi-VN-Wavenet-B', name: 'Vietnam (Male - Premium B)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Wavenet-B.wav' },
  { id: 'en-US-Wavenet-D', name: 'English (Male D)', lang: 'en-US', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Wavenet-D.wav' },
  { id: 'en-US-Wavenet-F', name: 'English (Female F)', lang: 'en-US', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Wavenet-F.wav' },
  { id: 'en-US-Neural2-F', name: 'English (Female Neural)', lang: 'en-US', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Neural2-F.wav' },
]

const playVoiceSample = (voiceId: string) => {
  const voice = googleVoices.find(v => v.id === voiceId)
  if (voice && voice.preview) {
    const audio = new Audio(voice.preview)
    audio.play().catch(e => {
        toast.error(t('common.failed'))
        console.error(e)
    })
  } else {
    toast.error(t('common.failed'))
  }
}

const openCharDialog = (char: any, index: number) => {
  selectedCharIdx.value = index
  editingChar.value = JSON.parse(JSON.stringify(char))
  if (!editingChar.value.tts_config) {
    editingChar.value.tts_config = { voice_id: '', style_category: '', base_pitch: 0, base_speaking_rate: 1 }
  }
  charDialogVisible.value = true
}

const openSegDialog = (seg: any, index: number) => {
  selectedSegIdx.value = index
  editingSeg.value = JSON.parse(JSON.stringify(seg))
  if (!editingSeg.value.locationDetails) editingSeg.value.locationDetails = { type: '', atmosphere: '', lighting: '', objects: '' }
  if (!editingSeg.value.cameraDetails) editingSeg.value.cameraDetails = { framing: '', angle: '', movement: '', focus: '' }
  if (!editingSeg.value.audioDetails) editingSeg.value.audioDetails = { ambience: '', sfx: '', music: '' }
  if (!editingSeg.value.detailedDialogue) editingSeg.value.detailedDialogue = []
  
  activeSegTab.value = 'general'
  segDialogVisible.value = true
}

const saveCharDetail = async () => {
  if (!props.project || !editingChar.value) return
  try {
    props.project.scriptAnalysis.characters[selectedCharIdx.value] = editingChar.value
    await projectStore.updateProject({ scriptAnalysis: props.project.scriptAnalysis })
    toast.success(t('common.updateSuccess'))
    charDialogVisible.value = false
  } catch (error) {
    toast.error(t('common.failed'))
  }
}

const saveSegDetail = async () => {
  if (!props.project || !editingSeg.value) return
  try {
    props.project.storyboard.segments[selectedSegIdx.value] = editingSeg.value
    await projectStore.updateProject({ storyboard: props.project.storyboard })
    toast.success(t('common.updateSuccess'))
    segDialogVisible.value = false
  } catch (error) {
    toast.error(t('common.failed'))
  }
}

// Computed Prompts (Keep English for AI logic)
const computedImagePrompt = computed(() => {
  if (!editingSeg.value || !props.project) return ''
  const segment = editingSeg.value
  const allCharacters = props.project.scriptAnalysis?.characters || []
  const prompt = segment.description
  const characterContext = (segment.characters || []).map((name: string) => {
    return allCharacters.find((c: any) => c.name.toLowerCase() === name.toLowerCase())
  }).filter(Boolean)

  if (characterContext.length > 0) {
    const charProfiles = characterContext
      .map((c: any) => {
        const traits = `\nTraits: ${c.species}, ${c.gender}, ${c.age}, ${c.body_build}, ${c.face_shape}, ${c.hair}, ${c.skin_or_fur_color}`
        return `[CHARACTER IDENTITY: ${c.name.toUpperCase()}]\nDescription: ${c.description}${traits}\nVisual Reference: Already established.`
      }).join('\n\n')

    return `### SCENE DESCRIPTION ###\n${prompt}\n\n### CHARACTERS ###\n${charProfiles}`
  }
  return `DESCRIPTION: ${prompt}`
})

const computedVideoPrompt = computed(() => {
  if (!editingSeg.value || !props.project) return ''
  const segment = editingSeg.value
  const projectStyle = props.project.creativeBrief?.visualStyle || 'Cinematic'
  return `VISUAL STYLE: ${projectStyle}. SCENE: ${segment.description}.`
})
</script>

<style lang="scss" scoped>
.storyboard-root {
  height: 100%;
  width: 100%;
  overflow-y: auto;
  padding: 24px;
  background-color: transparent;
}

.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

.animate-in { animation-duration: 0.3s; animation-fill-mode: both; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
.fade-in { animation-name: fade-in; }

.image-slot-error {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: 30px;
  height: 100%;
  width: 100%;
}

:deep(.cinematic-dialog) {
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}
:deep(.cinematic-dialog .el-dialog__header) {
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
:deep(.cinematic-dialog .el-dialog__title) {
  color: white;
  font-weight: 800;
}
:deep(.cinematic-dialog .el-dialog__body) {
  padding: 24px;
}

:deep(.cinematic-input .el-input__wrapper),
:deep(.cinematic-input .el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.03) !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  padding: 8px 12px;
  color: white !important;
}
:deep(.cinematic-input .el-input__wrapper.is-focus),
:deep(.cinematic-input .el-textarea__inner:focus) {
  border-color: #00f2ff !important;
}

:deep(.cinematic-tabs .el-tabs__item) {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
}
:deep(.cinematic-tabs .el-tabs__item.is-active) {
  color: #00f2ff;
}
:deep(.cinematic-tabs .el-tabs__active-bar) {
  background-color: #00f2ff;
}

:deep(.cinematic-select .el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
}

:deep(.el-popper) {
  background: #1a1a1a !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
}

.form-group {
  position: relative;
  overflow: visible !important;
}

:deep(.cinematic-input.readonly-input .el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.02) !important;
  color: rgba(255, 255, 255, 0.5) !important;
  font-family: monospace;
  font-size: 11px;
}
</style>
