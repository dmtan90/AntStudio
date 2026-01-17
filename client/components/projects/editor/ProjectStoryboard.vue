<template>
  <div class="p-6 h-full overflow-y-auto custom-scrollbar">
    <!-- Characters Section -->
    <div class="mb-12">
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
          @click="openCharDialog(char, idx)"
        >
          
          <!-- Background Image / Placeholder -->
          <div class="absolute inset-0 z-0">
             <el-image v-if="char.referenceImage" 
                :src="getFileUrl(char.referenceImage)" 
                class="w-full h-full object-cover" 
                fit="cover" 
             >
              <template #error>
                <div class="image-slot-error">
                  <pic theme="outline" size="48" class="text-white/10" />
                </div>
              </template>
             </el-image>
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
          <div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
            <button 
              class="w-8 h-8 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-brand-primary hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :title="t('projects.editor.storyboard.charDialog.regenerateVisual')"
              :disabled="loadingStates[`char-${idx}`]"
              @click.stop="$emit('regenerate-character', char, idx)"
            >
              <refresh theme="outline" size="16"/>
            </button>
          </div>

          <!-- Bottom Content -->
          <div class="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <h4 class="text-lg font-bold text-white truncate">{{ char.name }}</h4>
              <button 
                v-if="editingId !== `char-${idx}`"
                class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all disabled:opacity-20"
                :disabled="loadingStates[`char-${idx}`]"
                @click.stop="startEdit('char', idx, char.description)"
              >
                <edit theme="outline" size="14"/>
              </button>
            </div>

              <!-- Description / Editor -->
            <div v-if="editingId === `char-${idx}`" class="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <textarea 
                v-model="tempDesc"
                class="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-3 text-xs text-white/90 focus:outline-none focus:border-brand-primary resize-none"
                rows="4"
                @click.stop
              ></textarea>
              <div class="flex justify-end gap-2">
                <button class="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-white/20 transition-all" @click.stop="cancelEdit">{{ t('common.cancel') }}</button>
                <button class="bg-brand-primary text-black px-3 py-1 rounded-lg text-[10px] font-bold hover:scale-105 transition-all" @click.stop="saveEdit('char', idx)">{{ t('common.save') }}</button>
              </div>
            </div>
            <p v-else class="text-xs text-white/60 leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-all duration-500">
              {{ char.description }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Segments Section -->
    <div class="mb-10">
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
          @click="openSegDialog(seg, idx)"
          @mouseenter="seg.hover = true" @mouseleave="seg.hover = false"
        >
          
          <!-- Background Image -->
          <div class="absolute inset-0 z-0">
             <el-image v-if="seg.sceneImage" 
                :src="getFileUrl(seg.sceneImage)" 
                class="w-full h-full object-cover" 
                fit="cover" 
             >
              <template #error>
                <div class="image-slot-error">
                  <pic theme="outline" size="48" class="text-white/10" />
                </div>
              </template>
             </el-image>
             <div v-else class="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#222] to-[#111]">
                <video-two theme="outline" size="48" class="text-white/10" />
             </div>
             <div class="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent z-10"></div>
             <div v-if="seg.hover && seg.generatedVideo?.s3Key" class="absolute inset-0 z-40 bg-black/60 backdrop-blur-[2px] flex items-center justify-center flex-col gap-3">
                <video :src="getFileUrl(seg.generatedVideo.s3Key)" autoplay />
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
              <el-avatar v-if="seg.sceneImage" size="small" shape="circle" :src="getFileUrl(seg.sceneImage)"></el-avatar>
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
          </div>

          <!-- Bottom Content -->
          <div class="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-[10px] uppercase text-white/40 font-bold tracking-widest mb-1">{{ t('projects.detail.duration') }}: {{ seg.duration || 'Auto' }}s</span>
              </div>
              <button 
                v-if="editingId !== `seg-${idx}`"
                class="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all disabled:opacity-20"
                :disabled="loadingStates[`seg-${seg.order}`] || loadingStates[`video-${seg.order}`]"
                @click.stop="startEdit('seg', idx, seg.description)"
              >
                <edit theme="outline" size="14"/>
              </button>
            </div>

            <!-- Description / Editor -->
            <div v-if="editingId === `seg-${idx}`" class="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <textarea 
                v-model="tempDesc"
                class="w-full bg-black/60 backdrop-blur-md border border-white/20 rounded-xl p-3 text-xs text-white/90 focus:outline-none focus:border-brand-primary resize-none"
                rows="3"
                @click.stop
              ></textarea>
              <div class="flex justify-end gap-2">
                <button class="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold hover:bg-white/20 transition-all" @click.stop="cancelEdit">{{ t('common.cancel') }}</button>
                <button class="bg-brand-primary text-black px-3 py-1 rounded-lg text-[10px] font-bold hover:scale-105 transition-all" @click.stop="saveEdit('seg', idx)">{{ t('common.save') }}</button>
              </div>
            </div>
            <div v-else class="flex flex-col gap-2">
              <p class="text-xs text-white/80 leading-relaxed italic line-clamp-2 group-hover:line-clamp-none transition-all duration-500">
                "{{ seg.description }}"
              </p>
              
              <!-- Rich Cinematic Details (Visible on hover) -->
              <div class="hidden group-hover:flex flex-col gap-3 mt-2 pt-3 border-t border-white/5 animate-in fade-in duration-500">
                <!-- Location Details -->
                <div v-if="seg.locationDetails" class="flex flex-col gap-1">
                  <span class="text-[9px] uppercase text-brand-primary font-bold tracking-widest">Environment</span>
                  <p class="text-[10px] text-white/60 leading-tight">
                    <span class="text-white/40">Type:</span> {{ seg.locationDetails.type }}<br/>
                    <span class="text-white/40">Atmosphere:</span> {{ seg.locationDetails.atmosphere }}
                  </p>
                </div>

                <!-- Camera Details -->
                <!-- <div v-if="seg.cameraDetails" class="flex flex-col gap-1">
                  <span class="text-[9px] uppercase text-brand-primary font-bold tracking-widest">Camera</span>
                  <div class="flex flex-wrap gap-2">
                    <div class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/50">{{ seg.cameraDetails.framing }}</div>
                    <div class="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] text-white/50">{{ seg.cameraDetails.movement }}</div>
                  </div>
                </div> -->

                <!-- Dialogue -->
                <!-- <div v-if="seg.detailedDialogue?.length" class="flex flex-col gap-1">
                  <span class="text-[9px] uppercase text-brand-primary font-bold tracking-widest">Dialogue</span>
                  <div v-for="(d, dIdx) in seg.detailedDialogue" :key="dIdx" class="flex flex-col gap-0.5">
                    <span class="text-[9px] text-brand-primary/80 font-bold">{{ d.characterName }}:</span>
                    <p class="text-[10px] text-white/80 line-clamp-2 leading-snug">"{{ d.line }}"</p>
                  </div>
                </div> -->
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
          <div class="aspect-[4/5] rounded-2xl overflow-hidden border border-white/10 bg-black/40">
            <el-image
              v-if="editingChar.referenceImage"
              :src="getFileUrl(editingChar.referenceImage)"
              class="w-full h-full object-cover"
              :preview-src-list="[getFileUrl(editingChar.referenceImage)]"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-white/5 uppercase font-bold tracking-widest italic">
              {{ t('projects.editor.storyboard.charDialog.noImage') }}
            </div>
          </div>
          <el-button 
            type="primary" 
            class="w-full !rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
            @click="$emit('regenerate-character', editingChar, selectedCharIdx)"
          >
            {{ t('projects.editor.storyboard.charDialog.regenerateVisual') }}
          </el-button>
        </div>

        <!-- Meta Column -->
        <div class="col-span-12 lg:col-span-7 h-[600px] overflow-y-auto custom-scrollbar pr-2">
          <div class="space-y-6">
            <div class="form-group border-b border-white/5 pb-6">
              <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-3">{{ t('projects.editor.storyboard.charDialog.general') }}</label>
              <div class="grid grid-cols-2 gap-4">
                <el-input v-model="editingChar.name" :placeholder="t('projects.editor.storyboard.charDialog.name')" class="cinematic-input col-span-2" />
                <el-select v-model="editingChar.species" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.species')" class="cinematic-select" :teleported="false">
                  <el-option v-for="s in speciesOptions" :key="s" :label="s" :value="s" />
                </el-select>
                <el-select v-model="editingChar.gender" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.gender')" class="cinematic-select" :teleported="false">
                  <el-option v-for="g in genderOptions" :key="g" :label="g" :value="g" />
                </el-select>
                <el-input v-model="editingChar.age" :placeholder="t('projects.editor.storyboard.charDialog.age')" class="cinematic-input" />
                <el-select v-model="editingChar.body_build" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.bodyBuild')" class="cinematic-select" :teleported="false">
                  <el-option v-for="b in bodyBuildOptions" :key="b" :label="b" :value="b" />
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
                  <el-option v-for="f in faceShapeOptions" :key="f" :label="f" :value="f" />
                </el-select>
                <el-select v-model="editingChar.hair" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.hair')" class="cinematic-select" :teleported="false">
                  <el-option v-for="h in hairOptions" :key="h" :label="h" :value="h" />
                </el-select>
                <el-select v-model="editingChar.skin_or_fur_color" filterable allow-create default-first-option :placeholder="t('projects.editor.storyboard.charDialog.skinColor')" class="cinematic-select" :teleported="false">
                  <el-option v-for="sk in skinColorOptions" :key="sk" :label="sk" :value="sk" />
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
          <div class="aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/40 relative">
            <video 
              v-if="editingSeg.generatedVideo?.s3Key" 
              :src="getFileUrl(editingSeg.generatedVideo.s3Key)" 
              controls 
              autoplay
              class="w-full h-full object-contain"
            />
            <el-image
              v-else-if="editingSeg.sceneImage"
              :src="getFileUrl(editingSeg.sceneImage)"
              class="w-full h-full object-contain"
              :preview-src-list="[getFileUrl(editingSeg.sceneImage)]"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-white/5 uppercase font-bold tracking-widest italic">
              {{ t('projects.editor.storyboard.segDialog.noMedia') }}
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
             <el-button 
                class="!rounded-xl !h-12 !bg-white/5 !text-white !border-white/10 font-bold"
                @click="$emit('generate-frame', editingSeg)"
              >
                {{ t('projects.editor.storyboard.segDialog.regenerateFrame') }}
              </el-button>
              <el-button 
                type="primary"
                class="!rounded-xl !h-12 !bg-brand-primary !text-black !border-none font-bold"
                @click="$emit('generate-video', editingSeg)"
              >
                {{ t('projects.editor.storyboard.segDialog.regenerateVideo') }}
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
                    <el-option v-for="f in framingOptions" :key="f" :label="f" :value="f" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.angle') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.angle" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="a in angleOptions" :key="a" :label="a" :value="a" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.movement') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.movement" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="m in movementOptions" :key="m" :label="m" :value="m" />
                  </el-select>
                </div>
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.focus') }}</label>
                  <el-select v-model="editingSeg.cameraDetails.focus" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="f in focusOptions" :key="f" :label="f" :value="f" />
                  </el-select>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane :label="t('projects.editor.storyboard.segDialog.tabs.environment')" name="env">
              <div v-if="editingSeg.locationDetails" class="p-2 space-y-6 h-[500px] overflow-y-auto custom-scrollbar">
                <div class="form-group">
                  <label class="text-[10px] uppercase text-brand-primary font-bold tracking-widest block mb-2">{{ t('projects.editor.storyboard.segDialog.locationType') }}</label>
                  <el-select v-model="editingSeg.locationDetails.type" filterable allow-create default-first-option class="cinematic-select !w-full" :teleported="false">
                    <el-option v-for="t in environmentOptions" :key="t" :label="t" :value="t" />
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
                        <el-input v-model="d.language" size="small" class="!w-24 text-[9px]" placeholder="Lang" />
                      </div>
                      <el-input v-model="d.line" type="textarea" :rows="2" class="cinematic-input" />
                      <div class="grid grid-cols-2 gap-2">
                        <el-input v-model="d.delivery" placeholder="Delivery" class="cinematic-input" />
                        <el-input v-model="d.style" placeholder="Style" class="cinematic-input" />
                        <el-input v-model="d.timing" placeholder="Timing (e.g. 0-2s)" class="cinematic-input col-span-2" />
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
import { ref, computed } from 'vue'
import { 
  Edit, Refresh, Pic, Peoples, Movie, Play, VideoTwo, Copy
} from '@icon-park/vue-next'
import { useProjectStore } from '~/stores/project'
import { toast } from 'vue-sonner'

const projectStore = useProjectStore()
const { t } = useTranslations()

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text)
  toast.success(t('common.copySuccess') || 'Copied to clipboard')
}

const computedImagePrompt = computed(() => {
  if (!editingSeg.value || !props.project) return ''
  
  const segment = editingSeg.value
  const allCharacters = props.project.scriptAnalysis?.characters || []
  const prompt = segment.description
  
  // Find characters in this segment
  const characterContext = (segment.characters || []).map((name: string) => {
    return allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase())
  }).filter(Boolean)

  if (characterContext.length > 0) {
    const charProfiles = characterContext
      .map(c => {
        const colors = c.color_spec ? `\nColors: ${JSON.stringify(c.color_spec)}` : ''
        const traits = `\nTraits: ${c.species}, ${c.gender}, ${c.age}, ${c.body_build}, ${c.face_shape}, ${c.hair}, ${c.skin_or_fur_color}`
        const style = `\nStyle Markers: 3D rendered surface, smooth shading, PBR materials`
        return `[CHARACTER IDENTITY: ${c.name.toUpperCase()}]\nDescription: ${c.description}${traits}${colors}${style}\nVisual Reference: This character has an established visual identity from their Key Element reference image.`
      })
      .join('\n\n')

    return `### VISUAL IDENTITY RULES (STRICT CONSISTENCY REQUIRED) ###
You are generating a scene for a video project. You MUST maintain perfect visual consistency for the following characters:

${charProfiles}

### SCENE DESCRIPTION ###
${prompt}

### FINAL INSTRUCTION ###
Generate a photo-realistic, cinematic frame that matches the SCENE DESCRIPTION while strictly adhering to the VISUAL IDENTITY RULES for every character mentioned. If a character is in the shot, they must look exactly like their established profile.`
  }

  const style = props.project?.creativeBrief?.visualStyle || props.project?.videoStyle || 'Cinematic'
  return `STYLE: ${style}. DESCRIPTION: ${prompt}`
})

const computedVideoPrompt = computed(() => {
  if (!editingSeg.value || !props.project) return ''
  
  const segment = editingSeg.value
  const allCharacters = props.project.scriptAnalysis?.characters || []
  const projectStyle = props.project.creativeBrief?.visualStyle || props.project.videoStyle || 'Cinematic'
  const duration = segment.duration || 8

  // 1. Visual Style Header
  const visualStyleHeader = `VISUAL STYLE: ${projectStyle}, filmed with real actors and authentic environments. Natural skin tones, professional lighting. NOT CGI, NOT animated, NOT cartoon, NOT stylized, NOT 3D, NOT render. Aspect ratio 16:9 full frame, no black bars.`
  
  // 2. Location Details
  const loc = segment.locationDetails || {}
  const locationSection = `LOCATION:
- Location: ${loc.type || segment.location}
  Layout: ${loc.layout || 'Standard layout'}
  Objects: ${loc.objects || 'N/A'}
  Atmosphere: ${loc.atmosphere || segment.mood}
  Visual Style: ${loc.visualStyle || projectStyle}
  Lighting: ${loc.lighting || 'Cinematic lighting'}`
  
  // 3. Characters Section
  const charSection = (segment.characters || []).map((name: string) => {
      const char = allCharacters.find(c => c.name.toLowerCase() === name.toLowerCase())
      if (!char) return `- [UNKNOWN] ${name}`

      const colors = char.color_spec ? `\n  Colors: ${JSON.stringify(char.color_spec)}` : ''
      const traits = `\n  Appearance: ${char.species || 'Human'}, ${char.gender || 'N/A'}, ${char.age || 'N/A'}, ${char.body_build || ''}, ${char.face_shape || ''}, ${char.hair || ''}, ${char.skin_or_fur_color || ''}`
      const outfit = `\n  Outfit: ${char.outfit_top || ''} ${char.outfit_bottom || ''} ${char.shoes_or_footwear || ''} ${char.props || ''}`
      const voice = `\n  Voice: ${char.voice_personality || 'N/A'} [TTS: ${char.tts_config?.voice_id || 'Alnilam'} | pitch=${char.tts_config?.base_pitch || 0} | style=${char.tts_config?.style_category || 'Professional'}]`

      return `- [${char.char_id || 'ID'}] ${char.name} (${char.species || 'Human'}) - ${char.gender || ''}, ${char.age || ''}${traits}${outfit}${voice}`
  }).join('\n')

  // 4. Camera & Audio
  const cam = segment.cameraDetails || {}
  const cameraSection = `CAMERA:
- Framing: ${cam.framing || segment.cameraAngle}
- Angle: ${cam.angle || segment.cameraAngle}
- Movement: ${cam.movement || 'Static'}
- Focus: ${cam.focus || 'Deep focus'}`

  const audio = segment.audioDetails || {}
  const audioSection = `AUDIO:
- Ambience: ${audio.ambience || 'Ambient noise'}
- Sound FX: ${audio.sfx || 'N/A'}
- Music: ${audio.music || 'Dramatic score'}`

  // 5. Dialogue Section
  const dialogueSection = (segment.detailedDialogue || []).map((d: any) => {
      return `- ${d.characterId} [TTS: ${d.tts_config?.voice_id || 'Default'}] (${d.language || 'en-US'}): [${d.line}] [delivery: ${d.delivery}, style: ${d.style}, timing: ${d.timing}]`
  }).join('\n')

  // 6. Subtitle Prevention Block
  const subtitlePrevention = `
======================================================================
CRITICAL VEO GENERATION CONSTRAINT - SUBTITLE PREVENTION
======================================================================
**ABSOLUTELY FORBIDDEN - NEVER GENERATE:**
- Subtitles, captions, or text overlays of ANY kind
- Burnt-in text or visual dialogue transcription
- On-screen text boxes, closed captions, or title cards
- Visual rendering of spoken dialogue as text elements
- Text overlays in ANY language

**REQUIRED - AUDIO-ONLY DELIVERY:**
- ALL dialogue delivered EXCLUSIVELY through audio track
- Final video output MUST contain ZERO text overlays
`

  return `[Segment ${segment.order}] 0.0s - ${duration}s
Scene ${segment.order} (${duration} seconds):

${visualStyleHeader}

${locationSection}

CHARACTERS:
${charSection || 'None'}

${cameraSection}

${audioSection}

${dialogueSection || 'None'}

LIP SYNC: ${segment.lipSyncRequired ? 'Required for on-screen speakers' : 'None required'}

${subtitlePrevention}`
})

const props = defineProps<{
  project: any,
  loadingStates: Record<string, boolean>
}>()

const emit = defineEmits([
  'regenerate-character', 'generate-frame', 'generate-video',
  'regenerate-all-characters', 'generate-all-frames', 'generate-all-videos'
])

// Global loading computed
const isAnyLoading = computed(() => {
  return Object.values(props.loadingStates).some(v => v === true)
})

// Inline Editing State
const editingId = ref<string | null>(null)
const tempDesc = ref('')

// Predefined Options
const speciesOptions = ['Người', 'Robot', 'Động vật', 'Sinh vật huyền bí', 'Người ngoài hành tinh']
const genderOptions = ['Nam', 'Nữ', 'Khác', 'Không xác định']
const bodyBuildOptions = ['Mảnh mai', 'Cân đối', 'Vạm vỡ', 'Béo mập', 'Thấp bé', 'Thể thao']
const faceShapeOptions = ['Trái xoan', 'Tròn', 'Vuông', 'Dài', 'Kim cương', 'Trái tim']
const hairOptions = ['Tóc đen, ngắn', 'Tóc vàng, dài', 'Tóc nâu, xoăn', 'Đầu trọc', 'Tóc bạc, búi cao', 'Tóc phủ vai']
const skinColorOptions = ['Trắng', 'Vàng (Châu Á)', 'Nâu', 'Đen', 'Xám (Robot)', 'Xanh lá']

const framingOptions = ['Extreme Close-up', 'Close-up', 'Medium Shot', 'Full Shot', 'Wide Shot', 'Extreme Wide Shot', 'Point of View (POV)']
const angleOptions = ['Eye Level', 'High Angle', 'Low Angle', 'Dutch Angle', 'Over the Shoulder', 'Bird\'s Eye View', 'Worm\'s Eye View']
const movementOptions = ['Static', 'Pan', 'Tilt', 'Zoom In', 'Zoom Out', 'Dolly', 'Tracking', 'Handheld', 'Crane/Flycam']
const focusOptions = ['Deep Focus', 'Shallow Focus', 'Rack Focus', 'Soft Focus']
const environmentOptions = ['Studio', 'Indoor', 'Outdoor', 'Urban', 'Nature', 'Sci-fi/Futuristic', 'Cyberpunk City', 'Cinematic Interior']

const googleVoices = [
  { id: 'vi-VN-Standard-A', name: 'Việt Nam (Nữ A)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-A.wav' },
  { id: 'vi-VN-Standard-B', name: 'Việt Nam (Nam B)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-B.wav' },
  { id: 'vi-VN-Standard-C', name: 'Việt Nam (Nữ C)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-C.wav' },
  { id: 'vi-VN-Standard-D', name: 'Việt Nam (Nam D)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Standard-D.wav' },
  { id: 'vi-VN-Wavenet-A', name: 'Việt Nam (Nữ - Cao cấp A)', lang: 'vi-VN', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Wavenet-A.wav' },
  { id: 'vi-VN-Wavenet-B', name: 'Việt Nam (Nam - Cao cấp B)', lang: 'vi-VN', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/vi-VN-Wavenet-B.wav' },
  { id: 'en-US-Wavenet-D', name: 'English (Male D)', lang: 'en-US', gender: 'Male', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Wavenet-D.wav' },
  { id: 'en-US-Wavenet-F', name: 'English (Female F)', lang: 'en-US', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Wavenet-F.wav' },
  { id: 'en-US-Neural2-F', name: 'English (Female Neural)', lang: 'en-US', gender: 'Female', preview: 'https://cloud.google.com/static/text-to-speech/docs/audio/en-US-Neural2-F.wav' },
]

const playVoiceSample = (voiceId: string) => {
  const voice = googleVoices.find(v => v.id === voiceId)
  if (voice && voice.preview) {
    const audio = new Audio(voice.preview)
    audio.play().catch(e => {
        toast.error('Cannot play sample audio')
        console.error(e)
    })
  } else {
    toast.error('No preview available for this voice')
  }
}

// Dialog States
const charDialogVisible = ref(false)
const selectedCharIdx = ref(-1)
const editingChar = ref<any>(null)

const segDialogVisible = ref(false)
const selectedSegIdx = ref(-1)
const editingSeg = ref<any>(null)
const activeSegTab = ref('general')

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
  // Ensure nested objects exist for editing
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
    await projectStore.updateProject({
      scriptAnalysis: props.project.scriptAnalysis
    })
    toast.success('Character details updated')
    charDialogVisible.value = false
  } catch (error) {
    toast.error('Failed to save character')
  }
}

const saveSegDetail = async () => {
  if (!props.project || !editingSeg.value) return
  
  try {
    props.project.storyboard.segments[selectedSegIdx.value] = editingSeg.value
    await projectStore.updateProject({
      storyboard: props.project.storyboard
    })
    toast.success('Segment details updated')
    segDialogVisible.value = false
  } catch (error) {
    toast.error('Failed to save segment')
  }
}

const startEdit = (type: 'char' | 'seg', index: number, currentVal: string) => {
  editingId.value = `${type}-${index}`
  tempDesc.value = currentVal
}

const cancelEdit = () => {
  editingId.value = null
  tempDesc.value = ''
}

const saveEdit = async (type: 'char' | 'seg', index: number) => {
  if (!props.project) return

  try {
    if (type === 'char') {
      const char = props.project.scriptAnalysis.characters[index]
      if (char) {
        char.description = tempDesc.value
      }
    } else {
      const seg = props.project.storyboard.segments[index]
      if (seg) {
        seg.description = tempDesc.value
      }
    }

    // Persist to store and backend
    await projectStore.updateProject({
      scriptAnalysis: props.project.scriptAnalysis,
      storyboard: props.project.storyboard
    })

    toast.success('Description updated successfully')
    cancelEdit()
  } catch (error) {
    console.error('Failed to save edit:', error)
    toast.error('Failed to save changes')
  }
}

const getFileUrl = (path: string | undefined | null) => {
  if (!path) return ''
  if (path.startsWith('http')) return path
  return `/api/s3/${path}`
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }

/* Animation helpers */
.animate-in {
  animation-duration: 0.3s;
  animation-fill-mode: both;
}
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes slide-in-from-bottom-2 { from { transform: translateY(0.5rem); } to { transform: translateY(0); } }
.fade-in { animation-name: fade-in; }
.slide-in-from-bottom-2 { animation-name: slide-in-from-bottom-2; }

.image-slot-error {
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  font-size: 30px;
  height: 100%;
  width: 100%;
}

.segment-card {
  height: 300px;
}

/* Cinematic Dialog Styles */
:deep(.cinematic-dialog) {
  background: rgba(15, 15, 15, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
}
:deep(.cinematic-dialog .el-dialog__header) {
  margin-right: 0;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}
:deep(.cinematic-dialog .el-dialog__title) {
  color: white;
  font-weight: 800;
  letter-spacing: -0.025em;
}
:deep(.cinematic-dialog .el-dialog__body) {
  padding: 24px;
}

/* Global Cinematic Input Styling */
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
  background-color: rgba(255, 255, 255, 0.05) !important;
}

:deep(.cinematic-tabs .el-tabs__item) {
  color: rgba(255, 255, 255, 0.4);
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}
:deep(.cinematic-tabs .el-tabs__item.is-active) {
  color: #00f2ff;
}
:deep(.cinematic-tabs .el-tabs__active-bar) {
  background-color: #00f2ff;
}
:deep(.cinematic-tabs .el-tabs__nav-wrap::after) {
  background-color: rgba(255, 255, 255, 0.05);
}

/* Global Cinematic Select Styling */
:deep(.cinematic-select .el-input__wrapper) {
  background-color: rgba(255, 255, 255, 0.03) !important;
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 12px !important;
  padding: 4px 12px;
}
:deep(.cinematic-select .el-input__inner) {
  color: white !important;
  font-size: 13px;
}
:deep(.cinematic-select .el-input__wrapper.is-focus) {
  border-color: #00f2ff !important;
}

/* Popper / Dropdown Styling */
:deep(.el-popper),
:deep(.el-select__popper) {
  background: #1a1a1a !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
  z-index: 10000 !important;
}

:deep(.el-select-dropdown__item) {
  color: rgba(255, 255, 255, 0.6) !important;
  padding: 8px 12px !important;
  height: auto !important;
  line-height: 1.4 !important;
}
:deep(.el-select-dropdown__item.hover),
:deep(.el-select-dropdown__item:hover) {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #00f2ff !important;
}
:deep(.el-select-dropdown__item.selected) {
  color: #00f2ff !important;
  font-weight: 700 !important;
}

/* Ensure form groups don't clip dropdowns if not teleported */
.form-group {
  position: relative;
  overflow: visible !important;
}

:deep(.cinematic-input.readonly-input .el-textarea__inner) {
  background-color: rgba(255, 255, 255, 0.02) !important;
  color: rgba(255, 255, 255, 0.5) !important;
  cursor: default;
  font-family: monospace;
  font-size: 11px;
  line-height: 1.6;
}
</style>
