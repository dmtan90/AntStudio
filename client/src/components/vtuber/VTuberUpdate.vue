<template>
    <el-dialog :model-value="modelValue" v-if="localVTuber" @update:model-value="$emit('update:modelValue', $event)"
        :title="`UPDATE VTUBER: ${localVTuber?.identity?.name}`" width="1050px" custom-class="glass-dialog tuning-wizard-v2" @close="onClose">
        
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 p-1 pt-0" v-if="localVTuber">
            <!-- Left: Preview & Utilities (5 Cols) -->
            <div class="lg:col-span-5 space-y-4">
                <div class="p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/5 rounded-[40px] text-center relative overflow-hidden h-[580px] group shadow-2xl">
                    <div v-if="hasVisualContent" 
                        class="w-full h-full bg-[#050505] rounded-[32px] border border-white/5 overflow-hidden">
                        
                        <VTuberViewer
                            ref="vtuberViewer"
                            :modelType="localVTuber.visual.modelType"
                            :modelUrl="localVTuber.visual.modelUrl"
                            :backgroundUrl="localVTuber.visual.backgroundUrl"
                            v-model:config="localVTuber.visual.modelConfig"
                            :speakingVol="speakingVol"
                            :trackingData="trackingData"
                            :activePropId="localVTuber.visual.activePropId"
                            :auraEnabled="localVTuber.performanceConfig?.auraEnabled"
                            :auraColor="localVTuber.performanceConfig?.auraColor"
                            :particleType="localVTuber.performanceConfig?.particleType"
                            :particleDensity="localVTuber.performanceConfig?.particleDensity"
                            :lightingPreset="localVTuber.performanceConfig?.lightingPreset"
                            :dynamicLighting="localVTuber.performanceConfig?.dynamicLighting"
                            :lightingIntensity="localVTuber.performanceConfig?.lightingIntensity"
                            :activeCameraPath="localVTuber.performanceConfig?.activeCameraPath"
                            :cameraIntensity="localVTuber.performanceConfig?.cameraIntensity"
                            :autoDirectorEnabled="localVTuber.performanceConfig?.autoDirectorEnabled"
                            :lyrics="localVTuber.performanceConfig?.lyrics || []"
                            :currentTime="audioCurrentTime"
                            :lyricsEnabled="localVTuber.performanceConfig?.lyricsEnabled"
                            :lyricsStyle="localVTuber.performanceConfig?.lyricsStyle || 'neon'"
                            :lyricsPosition="localVTuber.performanceConfig?.lyricsPosition || 'bottom'"
                            :pitchFactor="pitchFactor"
                            :emphasis="emphasis"
                            :intensity="localVTuber.animationConfig"
                            :emotion="testEmotion"
                            :cinematicMode="cinematicMode"
                            :interactive="true"
                            @update:director="handleDirectorUpdate"
                            @motions="handleLive2DMotions"
                        />
                    </div>
                    <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-[32px]">
                        <div class="relative mb-6">
                            <div class="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full"></div>
                            <magic theme="outline" size="64" class="relative text-blue-400/60" />
                        </div>
                        <p class="text-xs font-black uppercase tracking-[0.3em] opacity-40">VTuber Projection Pending</p>
                    </div>

                    <div v-if="hasVisualContent" class="absolute top-4 right-4 z-20">
                        <el-tooltip content="VTuber Live Link (Webcam Tracking)" placement="left">
                            <el-button 
                                :type="enableTracking ? 'primary' : 'info'" 
                                circle 
                                class="!bg-black/60 !backdrop-blur-md !border-white/10"
                                @click="toggleTracking"
                            >
                                <div class="relative">
                                    <camera theme="outline" size="18" :class="enableTracking ? 'text-blue-400' : 'text-white/40'" />
                                    <div v-if="enableTracking" class="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                </div>
                            </el-button>
                        </el-tooltip>
                    </div>

                    <!-- Overlay for generation/segmentation -->
                    <div v-if="generatingPreview || uploading" class="absolute inset-x-2 bottom-2 h-24 bg-black/60 backdrop-blur-md rounded-[28px] z-20 flex items-center justify-center gap-4 border border-white/5 mx-2">
                        <el-icon class="is-loading text-blue-400 text-2xl"><loading /></el-icon>
                        <span class="text-[11px] font-black uppercase tracking-widest text-white/80">
                            {{ uploading ? 'Uploading VTuber Data...' : 'Synthesizing Visuals...' }}
                        </span>
                    </div>
                </div>

                <!-- Snapshot Utility -->
                <div class="px-2">
                    <el-button v-if="hasVisualContent"
                               size="large" class="w-full soul-action-btn" @click="generatePreview">
                        <camera theme="outline" class="mr-2"/> GENERATE SNAPSHOT
                    </el-button>
                </div>
            </div>

            <!-- Right: Unified Config (7 Cols) -->
            <div class="lg:col-span-7 space-y-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                
                <!-- Section 1: Vision Source -->
                <StudioSection title="1. Vision Source">
                    <div class="flex items-center justify-between mb-3 px-1">
                        <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">Projection Type</span>
                        <el-radio-group v-model="localVTuber.visual.modelType" size="small" class="soul-radio-group">
                            <el-radio-button value="vrm">VRM/3D</el-radio-button>
                            <el-radio-button value="live2d">LIVE2D</el-radio-button>
                            <el-radio-button value="static">IMAGE</el-radio-button>
                        </el-radio-group>
                    </div>
                    <StudioUploadZone
                        title="Update Entity File"
                        subtitle="Accepts Photos (VTuber) or Live2D ZIP Packages"
                        activeTitle="File Synchronized"
                        :activeSubtitle="localVTuber.visual.modelType === 'live2d' ? 'Live2D Asset Connected' : 'VTuber Profile Synchronized'"
                        :hasFile="!!hasVisualContent"
                        :loading="uploading"
                        accept="image/*,.zip,.rar,.vrm"
                        @change="handleFileUpload"
                    />
                </StudioSection>

                <!-- Sections: Identity & Vocal Signature -->
                <div class="grid grid-cols-2 gap-4 items-start">
                    <!-- Section 2: Persona -->
                    <div class="space-y-2">
                        <label class="section-label">2. Persona Identity</label>
                        <el-input v-model="localVTuber.identity.name" placeholder="VTuber Name..." class="soul-glass-input" />
                    </div>

                    <!-- Section 3: Vocal Signature -->
                    <div class="space-y-2">
                        <label class="section-label">
                            3. Vocal Signature
                            <span v-if="localVTuber.meta.voiceConfig.voiceId" class="text-[8px] font-bold opacity-40 uppercase"> {{ localVTuber.meta.voiceConfig.provider }} • {{ localVTuber.meta.voiceConfig.voiceId }}</span>
                        </label>
                        <div class="flex flex-col gap-2">
                            <div class="flex gap-2">
                                <el-button @click="voiceLibraryVisible = true" 
                                           class="flex-1 soul-glass-btn h-[42px] relative overflow-hidden text-left px-4">
                                    <div class="flex items-center gap-2">
                                        <music-one theme="outline" class="text-blue-400" />
                                        <span class="text-[10px] font-black uppercase tracking-widest truncate">
                                            {{ localVTuber.meta.voiceConfig.voiceId ? 'Synchronized' : 'Open Library' }}
                                        </span>
                                    </div>
                                    <div v-if="localVTuber.meta.voiceConfig.voiceId" class="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div class="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
                                    </div>
                                </el-button>

                                <el-button v-if="localVTuber.meta.voiceConfig.voiceId" 
                                           @click="handleVoicePreview()" 
                                           :loading="previewingVoice"
                                           class="soul-vtuber-test-btn h-[42px] w-[42px] !rounded-xl !p-0">
                                    <pause-one v-if="playingVoice" theme="outline" size="18" />
                                    <play v-else theme="outline" size="18" />
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Objective -->
                <div class="space-y-2">
                    <label class="section-label">4. VTuber Prompt (Description)</label>
                    <el-input v-model="localVTuber.identity.description" type="textarea" :rows="2"
                        placeholder="Core personality definition..." class="soul-glass-input" />
                </div>

                <!-- Performance testing -->
                <div class="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <label class="section-label">Performance Test</label>
                    <div class="grid grid-cols-5 gap-2">
                         <el-button 
                            v-for="e in ['neutral', 'happy', 'surprised', 'thinking', 'sad']" 
                            :key="e"
                            size="small"
                            class="soul-glass-btn !text-[8px] uppercase font-black"
                            :class="{'!border-blue-500/50 !bg-blue-500/10': testEmotion === e}"
                            @click="testEmotion = e"
                        >
                            {{ e }}
                        </el-button>
                    </div>
                </div>

                <!-- Section 4: Environment -->
                <div class="space-y-3 pt-2">
                    <label class="section-label">5. Environment (Background)</label>
                    <div class="grid grid-cols-6 gap-2">
                        <div v-for="preset in backgroundPresets" :key="preset.name"
                            @click="localVTuber.visual.backgroundUrl = preset.url"
                            class="cursor-pointer aspect-[1/1] rounded-2xl border-2 transition-all hover:scale-105 overflow-hidden"
                            :class="localVTuber.visual.backgroundUrl === preset.url 
                                ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
                                : 'border-white/5 hover:border-white/20'">
                            <img :src="preset.url" :title="preset.name" class="w-full h-full object-cover">
                        </div>
                        <div @click="backgroundInput?.click()" 
                             class="aspect-[1/1] rounded-2xl border-2 border-dashed border-white/10 hover:border-white/30 flex items-center justify-center cursor-pointer transition-all">
                             <input type="file" ref="backgroundInput" style="display: none" accept="image/*" @change="handleBackgroundUpload" />
                             <plus theme="outline" class="opacity-40" />
                        </div>
                    </div>
                </div>

                <!-- Advanced Settings -->
                <div class="pt-4 border-t border-white/5">
                    <div @click="advancedSettingsVisible = !advancedSettingsVisible" 
                         class="flex items-center justify-center gap-2 cursor-pointer opacity-40 hover:opacity-100 transition-all mb-4">
                        <span class="text-[9px] font-black tracking-[0.2em] uppercase">{{ advancedSettingsVisible ? 'Hide Specialized Parameters' : 'Refine VTuber Intelligence' }}</span>
                        <down :class="{'rotate-180': advancedSettingsVisible}" class="transition-transform" />
                    </div>

                    <el-collapse-transition>
                        <div v-show="advancedSettingsVisible" class="space-y-6 pb-4">
                            <div class="space-y-4">
                                <label class="section-label">VTuber History (Backstory)</label>
                                <el-input v-model="localVTuber.identity.backstory" type="textarea" :rows="3" class="soul-glass-input" />
                            </div>

                            <!-- Knowledge entries -->
                            <div class="space-y-4">
                                <div class="flex justify-between items-center">
                                    <label class="section-label">Knowledge Bank</label>
                                    <el-button type="primary" size="small" circle @click="addKnowledge">+</el-button>
                                </div>
                                <div class="space-y-3">
                                    <div v-for="(k, idx) in localVTuber.memory.knowledgeEntries" :key="idx" class="p-4 bg-white/3 border border-white/5 rounded-2xl relative group">
                                         <el-button @click="localVTuber.memory.knowledgeEntries.splice(idx,1)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100" size="small" link type="danger"><close /></el-button>
                                         <el-input v-model="k.title" placeholder="Title..." class="soul-glass-input mb-2" />
                                         <el-input v-model="k.content" type="textarea" :rows="2" placeholder="Content..." class="soul-glass-input" />
                                    </div>
                                </div>
                            </div>

                            <!-- Sliders -->
                            <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                                <StudioSlider label="Gesture Intensity" v-model="localVTuber.animationConfig.gestureIntensity" :min="0" :max="2" :step="0.1" />
                                <StudioSlider label="Tilt Factor" v-model="localVTuber.animationConfig.headTiltRange" :min="0" :max="2" :step="0.1" />
                                <StudioSlider label="Emphasis Power" v-model="localVTuber.animationConfig.nodIntensity" :min="0" :max="2" :step="0.1" />
                                
                                <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                    <div class="flex flex-col">
                                        <span class="text-[9px] font-bold uppercase tracking-widest text-blue-400">Cinematic Mode</span>
                                        <span class="text-[8px] opacity-30 italic">Dynamic framing</span>
                                    </div>
                                    <el-switch v-model="cinematicMode" size="small" />
                                </div>
                            </div>

                            <!-- LoRAs -->
                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <div class="flex justify-between items-center">
                                    <label class="section-label">Stylistic Weights (LoRAs)</label>
                                    <el-button type="primary" size="small" circle @click="addLora">+</el-button>
                                </div>
                                <div class="grid grid-cols-1 gap-3">
                                    <div v-for="(lora, idx) in localVTuber.meta.loras" :key="idx"
                                        class="p-4 bg-blue-500/5 border border-blue-500/10 rounded-2xl relative group">
                                        <el-button @click="localVTuber.meta.loras.splice(idx, 1)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100" size="small" link type="danger"><close /></el-button>
                                        <el-input v-model="lora.id" placeholder="LoRA ID (e.g. anime_v3)" class="soul-glass-input mb-3" />
                                        <div class="flex gap-4 items-center px-1">
                                            <span class="text-[9px] font-black uppercase w-20">Weight: {{ lora.weight }}</span>
                                            <el-slider v-model="lora.weight" :min="0" :max="2" :step="0.1" class="flex-1" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <div class="flex justify-between items-center">
                                    <label class="section-label">Social Connectivity</label>
                                    <el-button type="primary" size="small" circle @click="addRelationship">+</el-button>
                                </div>
                                <div class="grid grid-cols-1 gap-3">
                                    <div v-for="(rel, idx) in localVTuber.social?.relationships" :key="idx"
                                        class="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl space-y-3 relative group">
                                        <el-button @click="localVTuber.social.relationships.splice(idx, 1)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100" size="small" link type="danger"><close /></el-button>
                                        <div class="grid grid-cols-2 gap-3">
                                            <el-input v-model="rel.targetName" placeholder="Target..." class="soul-glass-input" />
                                            <el-select v-model="rel.type" class="soul-glass-input">
                                                <el-option label="Friend" value="friend" />
                                                <el-option label="Rival" value="rival" />
                                                <el-option label="Mentor" value="mentor" />
                                                <el-option label="Stranger" value="stranger" />
                                            </el-select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Stage Effects (Phase 83) -->
                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <label class="section-label">✨ Stage Effects (Phase 83)</label>

                                <!-- AI Auto-Director Master Toggle -->
                                <div class="flex items-center justify-between mb-4 bg-blue-500/10 p-4 rounded-3xl border border-blue-500/20">
                                    <div class="flex flex-col">
                                        <span class="text-[10px] font-black uppercase text-blue-400">AI Auto-Director</span>
                                        <span class="text-[8px] opacity-40 italic">Autonomous stage production</span>
                                    </div>
                                    <el-switch v-model="localVTuber.performanceConfig.autoDirectorEnabled" size="small" />
                                </div>

                                <div :class="{'opacity-30 pointer-events-none': localVTuber.performanceConfig.autoDirectorEnabled}">
                                    <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5 mb-3">
                                    <div class="flex flex-col">
                                        <span class="text-[9px] font-bold uppercase tracking-widest text-cyan-400">Vocal Aura</span>
                                        <span class="text-[8px] opacity-30 italic">Reactive pulse glow</span>
                                    </div>
                                    <div class="flex items-center gap-4">
                                        <el-color-picker v-model="localVTuber.performanceConfig.auraColor" size="small" />
                                        <el-switch v-model="localVTuber.performanceConfig.auraEnabled" size="small" />
                                    </div>
                                </div>

                                <div class="space-y-3">
                                    <label class="section-label !text-[7px]">Atmospheric Atmosphere</label>
                                    <div class="flex flex-wrap gap-2">
                                        <div v-for="type in ['sakura', 'snow', 'glitter']" :key="type"
                                             @click="localVTuber.performanceConfig.particleType = localVTuber.performanceConfig.particleType === type ? null : type"
                                             class="trait-tag !py-1 !px-3 font-black uppercase text-[8px]"
                                             :class="{'active': localVTuber.performanceConfig.particleType === type}">
                                            {{ type }}
                                        </div>
                                    </div>
                                    <div v-if="localVTuber.performanceConfig.particleType" class="flex gap-4 items-center px-1">
                                        <span class="text-[8px] font-black uppercase w-20">Density: {{ Math.round(localVTuber.performanceConfig.particleDensity * 100) }}%</span>
                                        <el-slider v-model="localVTuber.performanceConfig.particleDensity" :min="0" :max="1" :step="0.1" class="flex-1" />
                                    </div>
                                </div>

                                <div class="space-y-4 pt-2">
                                    <label class="section-label !text-[7px]">⚡ Stage Lighting</label>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div v-for="preset in ['studio', 'neon', 'dramatic', 'vocal_orange']" :key="preset"
                                             @click="localVTuber.performanceConfig.lightingPreset = preset"
                                             class="cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between bg-white/5 border-white/5"
                                             :class="{'!border-blue-500 !bg-blue-500/10': localVTuber.performanceConfig.lightingPreset === preset}">
                                            <span class="text-[9px] font-black uppercase tracking-wider">{{ preset.replace('_', ' ') }}</span>
                                            <div class="w-2 h-2 rounded-full" :style="{ background: preset === 'neon' ? '#ff00ff' : (preset === 'dramatic' ? '#fff' : '#ff6a00') }"></div>
                                        </div>
                                    </div>
                                    
                                    <div class="flex items-center justify-between bg-black/20 p-3 rounded-xl border border-white/5">
                                        <div class="flex flex-col">
                                            <span class="text-[8px] font-bold uppercase text-purple-400">Voice Reactivity</span>
                                            <span class="text-[7px] opacity-30">Pulsing with VTuber volume</span>
                                        </div>
                                        <el-switch v-model="localVTuber.performanceConfig.dynamicLighting" size="small" />
                                    </div>

                                    <div v-if="localVTuber.performanceConfig.dynamicLighting" class="flex gap-4 items-center px-1">
                                        <span class="text-[8px] font-black uppercase w-20">Intensity: {{ Math.round(localVTuber.performanceConfig.lightingIntensity * 100) }}%</span>
                                        <el-slider v-model="localVTuber.performanceConfig.lightingIntensity" :min="0.1" :max="3" :step="0.1" class="flex-1" />
                                    </div>
                                </div>

                                <div class="space-y-4 pt-2">
                                    <label class="section-label !text-[7px]">🎥 Stage Camera (Cinematic)</label>
                                    <div class="flex flex-wrap gap-2">
                                        <div v-for="path in ['orbit', 'slow_zoom', 'side_sweep', 'dramatic_low']" :key="path"
                                             @click="localVTuber.performanceConfig.activeCameraPath = localVTuber.performanceConfig.activeCameraPath === path ? null : path"
                                             class="trait-tag !py-1 !px-3 font-black uppercase text-[8px]"
                                             :class="{'active': localVTuber.performanceConfig.activeCameraPath === path}">
                                            {{ path.replace('_', ' ') }}
                                        </div>
                                    </div>
                                    <div v-if="localVTuber.performanceConfig.activeCameraPath" class="flex gap-4 items-center px-1">
                                        <span class="text-[8px] font-black uppercase w-20">Motion: {{ Math.round(localVTuber.performanceConfig.cameraIntensity * 100) }}%</span>
                                        <el-slider v-model="localVTuber.performanceConfig.cameraIntensity" :min="0.1" :max="2" :step="0.1" class="flex-1" />
                                    </div>
                                </div>

                                <div class="space-y-4 pt-2">
                                    <label class="section-label !text-[7px]">💬 Stage Lyrics</label>
                                    <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5 mb-3">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-pink-400">Show Lyrics</span>
                                            <span class="text-[8px] opacity-30 italic">Synchronized stage text</span>
                                        </div>
                                        <el-switch v-model="localVTuber.performanceConfig.lyricsEnabled" size="small" />
                                    </div>

                                    <div v-if="localVTuber.performanceConfig.lyricsEnabled" class="space-y-3">
                                        <div class="flex flex-wrap gap-2">
                                            <div v-for="style in ['neon', 'minimal', 'kinetic']" :key="style"
                                                 @click="localVTuber.performanceConfig.lyricsStyle = style"
                                                 class="trait-tag !py-1 !px-3 font-black uppercase text-[8px]"
                                                 :class="{'active': localVTuber.performanceConfig.lyricsStyle === style}">
                                                {{ style }}
                                            </div>
                                        </div>

                                        <div class="pt-2 flex gap-2">
                                            <el-button @click="musicSelectionVisible = true" size="small" class="flex-1 soul-glass-btn !text-[8px] !h-10">
                                                <music theme="outline" class="mr-2" /> 
                                                {{ localVTuber.performanceConfig.backgroundMusic ? 'CHANGE STAGE MUSIC' : 'SELECT STAGE MUSIC' }}
                                            </el-button>

                                            <el-button v-if="localVTuber.performanceConfig.backgroundMusic" 
                                                       @click="toggleMusicPreview()" 
                                                       class="soul-vtuber-test-btn h-10 w-10 !rounded-xl !p-0">
                                                <pause-one v-if="isPlayingMusic" theme="outline" size="18" />
                                                <play v-else theme="outline" size="18" />
                                            </el-button>
                                        </div>
                                        <div v-if="localVTuber.performanceConfig.backgroundMusic" class="mt-2 p-2 bg-white/5 rounded-lg flex items-center gap-3">
                                            <div class="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center">
                                                <music-list theme="outline" size="14" class="text-blue-400" />
                                            </div>
                                            <div class="flex flex-col overflow-hidden">
                                                <span class="text-[8px] font-black truncate">{{ localVTuber.performanceConfig.backgroundMusic.title }}</span>
                                                <span class="text-[7px] opacity-40 truncate">{{ localVTuber.performanceConfig.backgroundMusic.artist }}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                </div>
                            </div>

                            <!-- Digital Instruments (Phase 82) -->
                            <div class="space-y-4 pt-4 border-t border-white/5">
                                <label class="section-label">🎸 Digital Instruments (Phase 82)</label>
                                <div class="grid grid-cols-5 gap-2">
                                     <div v-for="p in propPresets" :key="p.id"
                                          @click="localVTuber.visual.activePropId = localVTuber.visual.activePropId === p.id ? null : p.id"
                                          class="cursor-pointer p-2 rounded-xl border-2 transition-all flex flex-col items-center gap-2 group"
                                          :class="localVTuber.visual.activePropId === p.id 
                                              ? 'border-blue-500 bg-blue-500/10' 
                                              : 'border-white/5 bg-white/5 hover:border-white/20'">
                                          <div class="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center">
                                              <play theme="outline" size="20" class="text-blue-400 group-hover:scale-110 transition-transform" />
                                          </div>
                                          <span class="text-[7px] font-black uppercase text-center leading-[1.2] truncate w-full">{{ p.id.replace('_', ' ') }}</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </el-collapse-transition>
                </div>
            </div>
        </div>

        <template #footer>
            <div class="gap-4 p-4 pt-0 text-center">
                <!-- <el-button @click="$emit('update:modelValue', false)" class="soul-glass-btn flex-1 h-[50px] !rounded-[20px]">ABORT TUNING</el-button> -->
                <el-button type="primary" @click="handleUpdateStyle" :loading="updating"
                    class="soul-initialize-btn flex-2 h-[50px] !rounded-[20px]">SYNCHRONIZE VTUBER</el-button>
            </div>
        </template>

        <VoiceLibraryDialog 
            v-if="localVTuber"
            v-model="voiceLibraryVisible"
            v-model:provider="localVTuber.meta.voiceConfig.provider"
            v-model:voiceId="localVTuber.meta.voiceConfig.voiceId"
            v-model:language="localVTuber.meta.voiceConfig.language"
            @select="v => { 
                localVTuber.meta.voiceConfig.sampleUrl = v.audioSampleUrl;
                localVTuber.meta.voiceConfig.gender = v.gender;
            }"
        />
        
        <!-- Music Selection Dialog (YouTube Integration) -->
        <MusicSelectionDialog 
            v-if="localVTuber"
            v-model="musicSelectionVisible"
            @select="handleMusicSelection"
        />
    </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { toast } from 'vue-sonner';
import { useVTuberStore } from '@/stores/vtuber';
import { useMediaStore } from '@/stores/media';
// import Live2DViewer from './Live2DViewer.vue'; // Wrapped
// import VRMViewer from './VRMViewer.vue'; // Wrapped
// import StaticPhotoViewer from './StaticPhotoViewer.vue'; // Wrapped
import VTuberViewer from './VTuberViewer.vue';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import { useVTuberTracking } from '@/composables/useVTuberTracking';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';
import { VRMPropManager } from '@/utils/vrm/VRMPropManager';
import MusicSelectionDialog from './MusicSelectionDialog.vue';
import VoiceLibraryDialog from './VoiceLibraryDialog.vue';
import { UploadOne, Camera, Magic, Loading, Play, PauseOne, CheckOne, MusicOne, Plus, Down, Search, Close, Music, MusicList } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import StudioSection from '../studio/shared/StudioSection.vue';
import StudioSlider from '../studio/shared/StudioSlider.vue';
import StudioUploadZone from '../studio/shared/StudioUploadZone.vue';
import StudioVoiceCard from '../studio/shared/StudioVoiceCard.vue';

const props = defineProps<{
    modelValue: boolean;
    vtuber: any;
}>();

const emit = defineEmits(['update:modelValue', 'update']);

const vtuberStore = useVTuberStore();
const mediaStore = useMediaStore();
const updating = ref(false);
const uploading = ref(false);
const generatingPreview = ref(false);
const localVTuber = ref<any>(null);
const testEmotion = ref('neutral');
const cinematicMode = ref(false);
const advancedSettingsVisible = ref(false);
const voiceLibraryVisible = ref(false);
const musicSelectionVisible = ref(false);
const backgroundInput = ref<HTMLInputElement | null>(null);


const { speakingVol, pitchFactor, emphasis, attachToAudioElement } = useAudioVisualizer();
const { solveLandmarks } = useVTuberTracking();
const propPresets = new VRMPropManager().getPresets();

const trackingData = ref<any>(null);
const enableTracking = ref(false);
const audioCurrentTime = ref(0);
const musicPlayer = ref<HTMLAudioElement | null>(null);
const previewAudioUrl = ref<string | null>(null);
let trackingInterval: any = null;
let timeUpdateInterval: any = null;
const videoInput = document.createElement('video');
let audioCtx: AudioContext | null = null;
let audioDestination: MediaStreamAudioDestinationNode | null = null;

const stopAnalysis = () => {
    if (audioCtx) {
        audioCtx.close();
        audioCtx = null;
        audioDestination = null;
    }
};

const toggleTracking = async () => {
    if (enableTracking.value) {
        enableTracking.value = false;
        if (trackingInterval) clearInterval(trackingInterval);
        stopWebcam();
        trackingData.value = null;
    } else {
        try {
            await startWebcam();
            await liveAIEngine.initialize();
            enableTracking.value = true;
            startTrackingLoop();
            toast.success('VTuber link established.');
        } catch (e) {
            toast.error('Failed to access camera.');
        }
    }
};

const startWebcam = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
    videoInput.srcObject = stream;
    videoInput.play();
};

const stopWebcam = () => {
    const stream = videoInput.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
};

const startTrackingLoop = () => {
    trackingInterval = setInterval(async () => {
        if (!enableTracking.value) return;
        const results = await liveAIEngine.processFrame(videoInput, performance.now());
        trackingData.value = solveLandmarks(results, videoInput);
    }, 33);
};

const backgroundPresets = [
    { name: 'Studio', url: '/bg/pro-studio.jpg' },
    { name: 'Cyberpunk', url: '/bg/cyberpunk_penthouse.jpg' },
    { name: 'Nature', url: '/bg/zen_garden.jpg' },
    { name: 'Abstract', url: '/bg/neon.jpg' },
    { name: 'Solid Black', url: '/bg/solid-black.jpg' }
];

// Preview state
const playingVoice = ref(false);
const previewingVoice = ref(false);
const currentVoiceId = ref('');
// Viewers References
const vtuberViewer = ref<any>(null);

const isPlayingMusic = ref(false);
let musicTimeInterval: any = null;

const toggleMusicPreview = async () => {
    if (isPlayingMusic.value) {
        if (musicPlayer.value) musicPlayer.value.pause();
        isPlayingMusic.value = false;
        stopPlaybackTracking();
    } else if (localVTuber.value.performanceConfig?.backgroundMusic?.audioUrl || localVTuber.value.performanceConfig?.backgroundMusic?.videoId) {
        if (!musicPlayer.value) {
            musicPlayer.value = new Audio();
            musicPlayer.value.crossOrigin = 'anonymous';
            attachToAudioElement(musicPlayer.value);
            musicPlayer.value.onended = () => {
                isPlayingMusic.value = false;
                stopPlaybackTracking();
            };
        }
        // const url = localVTuber.value.performanceConfig.backgroundMusic.audioUrl 
        //     ? getFileUrl(localVTuber.value.performanceConfig.backgroundMusic.audioUrl)
        //     : `/api/media/youtube/stream/${localVTuber.value.performanceConfig.backgroundMusic.videoId}`;
        const musicUrl = await getFileUrl(`/api/media/youtube/stream/${localVTuber.value.performanceConfig.backgroundMusic.videoId}`, {cached: true, refresh: false});    
        musicPlayer.value.src = musicUrl;
        musicPlayer.value.play();
        isPlayingMusic.value = true;
        
        startPlaybackTracking();
    }
};

const hasVisualContent = computed(() => {
    if (!localVTuber.value) return false;
    const v = localVTuber.value.visual;
    return !!v.modelUrl;
});

watch(() => localVTuber.value?.meta?.voiceConfig?.provider, (newVal) => {
    localVTuber.value.meta.voiceConfig.voiceId = '';
});

const handleVoicePreview = async (vid?: string) => {
    const voiceId = vid || localVTuber.value?.meta?.voiceConfig?.voiceId;
    if (!voiceId) return;

    if (playingVoice.value && currentVoiceId.value === voiceId) {
        if (musicPlayer.value) {
            musicPlayer.value.pause();
            playingVoice.value = false;
        }
        return;
    }

    try {
        previewingVoice.value = true;
        currentVoiceId.value = voiceId;

        // 1. Check for stored sample URL
        let audioUrl = localVTuber.value?.meta?.voiceConfig?.sampleUrl;
        
        if (audioUrl) {
           console.log('[VTuberUpdate] Using stored sample:', audioUrl);
        } else {
            const provider = localVTuber.value.meta.voiceConfig.provider;
            const data = await vtuberStore.generateVoicePreview({
                text: "Testing VTuber synchronization. Voice profile established.",
                provider,
                voiceId,
                language: localVTuber.value.meta.voiceConfig.language || 'en-US'
            });
            audioUrl = data?.audioUrl;
        }
        
        if (audioUrl) {
            if (!musicPlayer.value) {
                musicPlayer.value = new Audio();
                attachToAudioElement(musicPlayer.value);
                musicPlayer.value.onended = () => {
                    playingVoice.value = false;
                    stopPlaybackTracking();
                };
            }
            musicPlayer.value.src = getFileUrl(audioUrl);
            musicPlayer.value.play();
            playingVoice.value = true;
            audioCurrentTime.value = 0;
            startPlaybackTracking();
        }
    } catch (e) {
        toast.error('Voice preview failed');
    } finally {
        previewingVoice.value = false;
    }
};

// Watch for model changes to auto-regenerate preview
watch(() => localVTuber.value?.visual?.modelUrl, (newUrl, oldUrl) => {
    if (newUrl && oldUrl && newUrl !== oldUrl) {
        console.log('[VTuberUpdate] Model changed, clearing outdated preview assets.');
    }
});

const handleDirectorUpdate = (decisions: any) => {
    if (localVTuber.value?.performanceConfig?.autoDirectorEnabled) {
        localVTuber.value.performanceConfig.activeCameraPath = decisions.cameraPath;
        localVTuber.value.performanceConfig.lightingPreset = decisions.lightingPreset;
        localVTuber.value.performanceConfig.particleType = decisions.particleType;
    }
};

const startPlaybackTracking = () => {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    timeUpdateInterval = setInterval(() => {
        if (musicPlayer.value) {
            audioCurrentTime.value = musicPlayer.value.currentTime;
        }
    }, 100);
};

const stopPlaybackTracking = () => {
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
    }
};

const handleMusicSelect = async (music: any) => {
    if (!localVTuber.value) return;
    
    localVTuber.value.performanceConfig.backgroundMusic = music;
    if (music.lyricsLines) {
        localVTuber.value.performanceConfig.lyrics = music.lyricsLines;
    } else {
        localVTuber.value.performanceConfig.lyrics = [];
    }
    
    if (music.audioUrl) {
        previewAudioUrl.value = music.audioUrl;
        playingVoice.value = true;
        
        if (musicPlayer.value) {
            musicPlayer.value.src = music.audioUrl;
            musicPlayer.value.play();
            isPlayingMusic.value = true;
            startPlaybackTracking();
        }
    }
    
    musicSelectionVisible.value = false;
};

// Logic
watch(() => props.vtuber, (newVal) => {
    if (newVal) {
        localVTuber.value = JSON.parse(JSON.stringify(newVal));
        // Backward compatibility & initialization
        if (!localVTuber.value.animationConfig) {
            localVTuber.value.animationConfig = { gestureIntensity: 0.5, headTiltRange: 0.5, nodIntensity: 0.5 };
        }
        if (!localVTuber.value.meta) localVTuber.value.meta = { voiceConfig: { provider: 'gemini', voiceId: '' } };
        if (!localVTuber.value.memory) localVTuber.value.memory = { knowledgeEntries: [] };
        if (!localVTuber.value.social) localVTuber.value.social = { relationships: [] };
        
        // Config Migration: Unified modelConfig
        if (!localVTuber.value.visual.modelConfig) {
            if (localVTuber.value.visual.live2dConfig) {
                 localVTuber.value.visual.modelConfig = {
                     ...localVTuber.value.visual.live2dConfig,
                     rotation: 0,
                     scale: localVTuber.value.visual.live2dConfig.scale || 1.0
                 };
            } else {
                 localVTuber.value.visual.modelConfig = {
                     zoom: 1.0, 
                     offset: { x: 0, y: 0 },
                     rotation: 0,
                     scale: 1.0
                 };
            }
        }
        if (!localVTuber.value.performanceConfig) {
            localVTuber.value.performanceConfig = {
                auraEnabled: true,
                auraColor: '#00f2ff',
                particleType: null as any,
                particleDensity: 0.5,
                lightingPreset: 'studio',
                dynamicLighting: true,
                lightingIntensity: 1.0,
                activeCameraPath: null as any,
                cameraIntensity: 0.5,
                backgroundMusic: null as any // Music selection data
            };
        } else {
            // Ensure properties exist
            if (localVTuber.value.performanceConfig.particleDensity === undefined) localVTuber.value.performanceConfig.particleDensity = 0.5;
            if (localVTuber.value.performanceConfig.lightingPreset === undefined) localVTuber.value.performanceConfig.lightingPreset = 'studio';
            if (localVTuber.value.performanceConfig.dynamicLighting === undefined) localVTuber.value.performanceConfig.dynamicLighting = true;
            if (localVTuber.value.performanceConfig.lightingIntensity === undefined) localVTuber.value.performanceConfig.lightingIntensity = 1.0;
            if (localVTuber.value.performanceConfig.activeCameraPath === undefined) localVTuber.value.performanceConfig.activeCameraPath = null;
            if (localVTuber.value.performanceConfig.cameraIntensity === undefined) localVTuber.value.performanceConfig.cameraIntensity = 0.5;
            if (localVTuber.value.performanceConfig.autoDirectorEnabled === undefined) localVTuber.value.performanceConfig.autoDirectorEnabled = false;
            if (localVTuber.value.performanceConfig.lyricsEnabled === undefined) localVTuber.value.performanceConfig.lyricsEnabled = true;
            if (localVTuber.value.performanceConfig.lyricsStyle === undefined) localVTuber.value.performanceConfig.lyricsStyle = 'neon';
        }
        
        // fetchVoices();
    }
}, { immediate: true });

const handleGenericUpload = async (file: File) => {
    uploading.value = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await mediaStore.uploadMedia(formData);
        return res.key || res.url;
    } catch (e) {
        toast.error('Upload failed');
        return null;
    } finally {
        uploading.value = false;
    }
};

const handleFileUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isVrm = fileName.endsWith('.vrm');
    const isArchive = fileName.endsWith('.zip') || fileName.endsWith('.rar');
    const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/);

    try {
        if (isVrm) {
            localVTuber.value.visual.modelType = 'vrm';
            const url = await handleGenericUpload(file);
            if (url) {
                localVTuber.value.visual.modelUrl = url;
                toast.success('VRM model updated.');
            }
        } else if (isArchive) {
            localVTuber.value.visual.modelType = 'live2d';
            const url = await handleGenericUpload(file);
            if (url) {
                localVTuber.value.visual.modelUrl = url;
                toast.success('Live2D model updated.');
            }
        } else if (isImage) {
            localVTuber.value.visual.modelType = 'static';
            const url = await handleGenericUpload(file);
            if (url) {
                localVTuber.value.visual.modelUrl = url;
                toast.success('Avatar image updated.');
            }
        }
    } catch (e) {
        toast.error('File upload failed');
    } finally {
        uploading.value = false;
    }
};

const handleBackgroundUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = await handleGenericUpload(file);
    if (url) {
        localVTuber.value.visual.backgroundUrl = url;
        toast.success('Background updated.');
    }
};

const handleUpdateStyle = async () => {
    updating.value = true;
    try {
        await vtuberStore.updateVTuber(localVTuber.value.entityId, localVTuber.value);
        emit('update', localVTuber.value);
        emit('update:modelValue', false);
        toast.success('VTuber profile synchronized');
    } catch (e: any) {
        toast.error(e.message || 'Failed to synchronize VTuber profile.');
    } finally {
        updating.value = false;
    }
};

const handleLive2DMotions = (motions: any) => {
   // Optional: sync motions back if needed
};

const addKnowledge = () => {
    if (!localVTuber.value.memory.knowledgeEntries) localVTuber.value.memory.knowledgeEntries = [];
    localVTuber.value.memory.knowledgeEntries.push({ title: '', content: '' });
};

const addLora = () => {
    if (!localVTuber.value.meta.loras) localVTuber.value.meta.loras = [];
    localVTuber.value.meta.loras.push({ id: '', weight: 1.0 });
};

const addRelationship = () => {
    if (!localVTuber.value.social.relationships) localVTuber.value.social.relationships = [];
    localVTuber.value.social.relationships.push({ targetName: '', type: 'stranger', level: 0 });
};

const generatePreview = async () => {
    if (generatingPreview.value) return;
    generatingPreview.value = true;
    
    try {
        if (!vtuberViewer.value) {
            console.warn('[VTuberUpdate] No active viewer to capture from.');
            toast.warning('Please load a model first before generating preview.');
            return;
        }

        console.log('[VTuberUpdate] Starting preview generation...');

        // 1. Capture Thumbnail
        if (vtuberViewer.value.captureSnapshot) {
            console.log('[VTuberUpdate] Capturing snapshot...');
            const dataUrl = await vtuberViewer.value.captureSnapshot();
            if (dataUrl) {
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], `thumbnail_${Date.now()}.png`, { type: 'image/png' });
                
                const formData = new FormData();
                formData.append('file', file);
                const res = await mediaStore.uploadMedia(formData);
                if (res.key || res.url) {
                    localVTuber.value.visual.thumbnailUrl = res.key || res.url;
                    toast.success('Thumbnail generated.');
                }
            }
        }

        // 2. Capture Preview Video (with TTS Audio)
        if (vtuberViewer.value && vtuberViewer.value.captureVideo) {
            console.log('[VTuberUpdate] Starting video capture...');
            stopAnalysis();
            
            let audioUrl = localVTuber.value?.meta?.voiceConfig?.sampleUrl || '';
            const vId = localVTuber.value?.meta?.voiceConfig?.voiceId;
            
            if (!audioUrl && vId) {
                 const voiceData = await vtuberStore.generateVoicePreview({
                    text: "Hello, this is my updated voice preview.",
                    provider: localVTuber.value.meta.voiceConfig.provider || 'gemini',
                    voiceId: vId,
                    language: localVTuber.value.meta.voiceConfig.language || 'en-US'
                });
                if (voiceData && voiceData.audioUrl) {
                    audioUrl = voiceData.audioUrl;
                }
            }

            if (audioUrl) {
                const audio = new Audio();
                audio.crossOrigin = 'anonymous'; 
                audio.src = getFileUrl(audioUrl);
                
                await new Promise((resolve) => {
                    audio.onloadedmetadata = resolve;
                });
                
                const durationMs = (audio.duration || 3) * 1000 + 800;

                if (!audioCtx) audioCtx = new AudioContext();
                if (!audioDestination) audioDestination = audioCtx.createMediaStreamDestination();

                try {
                    if (audioCtx.state === 'suspended') await audioCtx.resume();

                    const audioSource = audioCtx.createMediaElementSource(audio);
                    const analyserNode = audioCtx.createAnalyser();
                    analyserNode.fftSize = 256;
                    
                    audioSource.connect(analyserNode);
                    audioSource.connect(audioDestination); 
                    analyserNode.connect(audioCtx.destination); 

                    const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
                    
                    const updateVolume = () => {
                        if (audio.ended) return;
                        analyserNode.getByteTimeDomainData(dataArray);
                        let sum = 0;
                        for(let i = 0; i < dataArray.length; i++) {
                            const amplitude = (dataArray[i] - 128) / 128.0; 
                            sum += amplitude * amplitude;
                        }
                        const rms = Math.sqrt(sum / dataArray.length);
                        speakingVol.value = Math.min(1.0, rms * 1.8);
                        
                        if (!audio.paused && !audio.ended) {
                            requestAnimationFrame(updateVolume);
                        }
                    };
                    
                    audio.onplay = () => updateVolume();
                    
                    const audioTrack = audioDestination.stream.getAudioTracks()[0];
                    const capturePromise = vtuberViewer.value.captureVideo(durationMs, audioTrack);
                    
                    setTimeout(() => {
                        audio.play().catch(e => console.error('[VTuberUpdate] Playback failed:', e));
                    }, 300);

                    const blob = await capturePromise;
                    audio.pause();
                    
                    if (blob) {
                        const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                        const formData = new FormData();
                        formData.append('file', file);
                        const res = await mediaStore.uploadMedia(formData);
                        if (res.key || res.url) {
                            localVTuber.value.visual.previewVideoUrl = res.key || res.url;
                            toast.success('Preview video generated.');
                        }
                    }
                } catch (e) {
                    console.warn('[VTuberUpdate] Capture failed:', e);
                } finally {
                    speakingVol.value = 0;
                }
            } else {
                // Fallback to silent video
                const blob = await vtuberViewer.value.captureVideo(3000);
                if (blob) {
                    const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await mediaStore.uploadMedia(formData);
                    if (res.key || res.url) {
                        localVTuber.value.visual.previewVideoUrl = res.key || res.url;
                        toast.success('Preview video (silent) generated.');
                    }
                }
            }
        }
    } catch (e) {
        console.error('Preview generation failed:', e);
        toast.error('Failed to generate preview assets.');
    } finally {
        generatingPreview.value = false;
    }
};

const handleMusicSelection = (musicData: any) => {
    if (!localVTuber.value.performanceConfig) {
        localVTuber.value.performanceConfig = {};
    }
    
    // Store music metadata
    localVTuber.value.performanceConfig.backgroundMusic = {
        videoId: musicData.videoId,
        videoUrl: musicData.videoUrl,
        title: musicData.title,
        thumbnail: musicData.thumbnail
    };
    
    // Store lyrics data if available
    if (musicData.lyricsLines && musicData.lyricsLines.length > 0) {
        localVTuber.value.performanceConfig.lyrics = musicData.lyricsLines;
        localVTuber.value.performanceConfig.lyricsStyle = musicData.style || 'neon';
        localVTuber.value.performanceConfig.lyricsPosition = musicData.position || 'bottom';
        localVTuber.value.performanceConfig.lyricsEnabled = true;
    } else {
        localVTuber.value.performanceConfig.lyrics = [];
    }
    
    toast.success('Background music configured!');
};

const onClose = () => {
    // Reset
    localVTuber.value = {
        name: '', 
        description: '', 
        traits: [],
        visual: { 
            modelType: 'vrm', 
            modelUrl: '',
            backgroundUrl: '', 
            previewVideoUrl: '', 
            thumbnailUrl: '',
            modelConfig: { zoom: 1.0, offset: { x: 0, y: 0 }, rotation: 0, scale: 1.0, idleMotion: '', talkMotion: '' } 
        },
        animationConfig: {
            gestureIntensity: 0.5,
            headTiltRange: 0.5,
            nodIntensity: 0.5
        },
        directorConfig: {
            autoFX: true,
            autoCamera: true,
            autonomyLevel: 0.5
        },
        backgroundMusic: {
            id: '',
            title: '',
            artist: '',
            url: ''
        },
        voiceConfig: { provider: 'gemini', language: 'en-US', voiceId: '' }
    };

    // Reset music player if music changed
    if (musicPlayer.value) {
        musicPlayer.value.pause();
        musicPlayer.value = null;
        isPlayingMusic.value = false;
        if (musicTimeInterval) clearInterval(musicTimeInterval);
    }
};
</script>

<script lang="ts">
export default {
    name: 'VTuberUpdate'
};
</script>

<style lang="scss" scoped>
.glass-dialog {
    :deep(.el-dialog) {
        background: rgba(10, 10, 10, 0.95) !important;
        backdrop-filter: blur(40px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 40px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5) !important;
    }
    :deep(.el-dialog__header) {
        padding: 30px 40px 10px !important;
        .el-dialog__title {
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 0.3em;
            color: rgba(255, 255, 255, 0.9);
        }
    }
}

.section-label {
    display: block;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 8px;
}

.soul-glass-input {
    :deep(.el-input__wrapper), :deep(.el-textarea__inner) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 12px;
        color: #fff;
        &:hover, &.is-focus {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
        }
    }
}

.soul-glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    border-radius: 12px;
    transition: all 0.3s;
    &:hover { background: rgba(255, 255, 255, 0.08); border-color: rgba(255, 255, 255, 0.2); }
}

.soul-action-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    font-weight: 900;
    letter-spacing: 0.1em;
    border-radius: 20px;
}

.soul-initialize-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: none;
    color: #fff;
    font-weight: 900;
    letter-spacing: 0.2em;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
}

.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
}

.voice-search-input-inner {
    :deep(.el-input__wrapper) {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        color: #fff;
        font-weight: 700;
        font-size: 11px;
    }
}

.soul-radio-group {
    :deep(.el-radio-button__inner) {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        color: rgba(255, 255, 255, 0.4);
        font-weight: 900;
        font-size: 8px;
        padding: 6px 12px;
    }
    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
        background: #3b82f6;
        color: #fff;
    }
}

.custom-scrollbar {
    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
}
</style>
