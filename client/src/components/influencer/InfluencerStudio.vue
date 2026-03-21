<template>
    <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)"
        :title="mode === 'edit' ? $t('influencers.edit.title', { name: newInfluencer.name }) : $t('influencers.create.title')" 
        width="1150px" custom-class="glass-dialog manifest-wizard-v2" @close="onClose" destroy-on-close>
        
        <!-- Wizard Header -->
        <div class="px-8 pb-4 border-b border-white/10" v-if="activeStep > 0">
            <el-steps :active="activeStep" align-center finish-status="success" class="custom-steps">
                <el-step :title="$t('influencers.create.wizard.step1.title')" :description="$t('influencers.create.wizard.step1.desc')" />
                <el-step :title="$t('influencers.create.wizard.step2.title')" :description="$t('influencers.create.wizard.step2.desc')" />
                <el-step :title="$t('influencers.create.wizard.step3.title')" :description="$t('influencers.create.wizard.step3.desc')" />
                <el-step :title="$t('influencers.create.wizard.step4.title')" :description="$t('influencers.create.wizard.step4.desc')" />
            </el-steps>
        </div>

        <div class="p-6 pt-4 min-h-[600px]">
            <!-- STEP 0: SELECTION (Only for Create Mode) -->
            <div v-if="activeStep === 0" class="flex flex-col items-center justify-center space-y-12 animate-fade-in py-10">
                <div class="text-center space-y-4" v-if="creationSource === 'ai'">
                    <h2 class="text-4xl font-black tracking-tighter text-white">{{ $t('influencers.create.selection.ai.title') }}</h2>
                    <p class="text-white/40 max-w-md mx-auto">{{ $t('influencers.create.selection.ai.desc') }}</p>
                </div>
                <div class="text-center space-y-4" v-else>
                    <h2 class="text-4xl font-black tracking-tighter text-white">{{ $t('influencers.create.selection.title') }}</h2>
                    <p class="text-white/40 max-w-md mx-auto">{{ $t('influencers.create.selection.desc') }}</p>
                </div>

                <div class="grid grid-cols-2 gap-8 w-full max-w-4xl" v-if="!creationSource">
                    <!-- Option A: File Upload -->
                    <div @click="selectSource('file')" class="source-card group flex flex-col items-center text-center p-10 border-2 border-white/5 rounded-[40px] bg-white/[0.02] hover:bg-blue-500/10 hover:border-blue-500/40 transition-all cursor-pointer">
                        <div class="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                            <upload-one theme="outline" size="48" class="text-blue-400" />
                        </div>
                        <h3 class="text-2xl font-black text-white mb-3">{{ $t('influencers.create.selection.upload.title') }}</h3>
                        <p class="text-sm text-white/50">{{ $t('influencers.create.selection.upload.desc') }}</p>
                    </div>

                    <!-- Option B: AI Generation -->
                    <div @click="selectSource('ai')" class="source-card group flex flex-col items-center text-center p-10 border-2 border-white/5 rounded-[40px] bg-white/[0.02] hover:bg-purple-500/10 hover:border-purple-500/40 transition-all cursor-pointer">
                        <div class="w-24 h-24 rounded-full bg-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-2xl">
                            <magic theme="outline" size="48" class="text-purple-400" />
                        </div>
                        <h3 class="text-2xl font-black text-white mb-3">{{ $t('influencers.create.selection.ai.title') }}</h3>
                        <p class="text-sm text-white/50">{{ $t('influencers.create.selection.ai.desc') }}</p>
                    </div>
                </div>
                <!-- STEP 0: AI GENERATION (Only for AI Mode) -->
                <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full" v-else-if="creationSource === 'ai'">
                    <!-- Left: Preview (5 Cols) -->
                    <div class="lg:col-span-5 space-y-4">
                        <div class="p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/5 rounded-[40px] text-center relative overflow-hidden h-[580px] group shadow-2xl">
                            <div v-if="generatingAI || aiIdolImage" 
                                class="w-full h-full bg-[#050505] rounded-[32px] border border-white/5 overflow-hidden flex items-center justify-center relative group/preview">
                                
                                <div v-if="generatingAI" class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xl">
                                    <div class="relative mb-8">
                                        <div class="absolute inset-0 bg-purple-500/30 blur-[60px] animate-pulse"></div>
                                        <magic theme="outline" size="80" class="relative text-purple-400 animate-bounce" />
                                    </div>
                                    <div class="text-center">
                                        <h4 class="text-2xl font-black text-white tracking-widest uppercase mb-2">{{ $t('influencers.create.aiGenerator.architecting') }}</h4>
                                        <p class="text-[10px] font-bold text-white/40 tracking-[0.5em] uppercase">{{ $t('influencers.create.aiGenerator.bendingLatent') }}</p>
                                    </div>
                                </div>
                                <template v-else-if="aiIdolImage">
                                    <div class="w-full h-full relative" v-if="newInfluencer.visual.aidolClips.idle">
                                        <video :src="getFileUrl(newInfluencer.visual.aidolClips.idle)" 
                                            muted loop autoplay 
                                            class="w-full h-full object-cover rounded-[32px] transition-all" />
                                        <div class="absolute top-6 right-6 px-3 py-1 bg-purple-600/80 backdrop-blur-md rounded-full text-[8px] font-black text-white uppercase tracking-widest">
                                            KOL Preview
                                        </div>
                                    </div>
                                    <el-image v-else :src="getFileUrl(aiIdolImage)" class="w-full aspect-9/16 rounded-[32px]" fit="contain" />
                                </template>
                            </div>
                            <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-[32px] cursor-pointer hover:bg-black/50 transition-colors border-2 border-dashed border-white/5" @click="triggerPortraitUpload">
                                <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                    <upload-one theme="outline" size="32" class="text-white/40" />
                                </div>
                                <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">AWAITING AVATAR PROJECTION</p>
                                <span class="text-[9px] font-bold text-blue-400/60 mt-2 uppercase tracking-widest hover:text-blue-400 transition-colors">OR CLICK TO UPLOAD PORTRAIT</span>
                            </div>

                            <!-- Generation tags overlay -->
                            <div class="absolute bottom-6 inset-x-6 z-20 flex flex-wrap justify-center gap-2">
                                <div v-for="tag in selectedAITags" :key="tag" class="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-black text-white uppercase tracking-widest shadow-lg">
                                    {{ tag }}
                                </div>
                            </div>

                            <!-- Overlay for generation/segmentation -->
                            <div v-if="generatingPreview" class="absolute inset-x-2 bottom-2 h-24 bg-black/60 backdrop-blur-md rounded-[28px] z-20 flex items-center justify-center gap-4 border border-white/5 mx-2">
                                <el-icon class="is-loading text-blue-400 text-2xl"><Loading /></el-icon>
                                <span class="text-[11px] font-black uppercase tracking-widest text-white/80">
                                    {{ $t('influencers.create.synthesizingVisuals') }}
                                </span>
                            </div>
                        </div>
                        
                        <div class="grid gap-3 px-2 mt-2" :class="aiIdolImage ? 'grid-cols-2' : 'grid-cols-1'">
                            <el-button type="primary" :loading="loading" size="large" :icon="Magic" class="w-full soul-action-btn" @click="generateAIdol">
                                <span class="text-lg font-black tracking-widest">{{ $t('influencers.create.aiGenerator.generateAI') }}</span>
                            </el-button>
                            <el-button v-if="aiIdolImage" :loading="loading" :icon="Magic" size="large" class="w-full soul-action-btn !bg-purple-600/20 !border-purple-500/40 text-purple-400" @click="generateIdolVideo">
                                <span class="text-lg font-black tracking-widest">{{ $t('influencers.create.aiGenerator.buildKOL') }}</span>
                            </el-button>
                        </div>
                    </div>

                    <!-- Right: Content (7 Cols) -->
                    <div class="lg:col-span-7 h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                        <div v-if="creationSource === 'ai'" class="space-y-8 pb-10">
                            <!-- HIGGSFIELD AI BUILDER UI -->
                            <div class="flex items-center justify-between mb-2">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 text-purple-400 font-bold">1</div>
                                    <h2 class="text-xl font-black text-white">{{ $t('influencers.create.aiGenerator.title') }}</h2>
                                </div>
                                <div class="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 scale-90">
                                    <el-button size="small" :type="aiTab === 'builder' ? 'primary' : 'info'" link @click="aiTab = 'builder'">{{ $t('influencers.create.aiGenerator.builder') }}</el-button>
                                    <el-button size="small" :type="aiTab === 'prompt' ? 'primary' : 'info'" link @click="aiTab = 'prompt'">{{ $t('influencers.create.aiGenerator.prompt') }}</el-button>
                                </div>
                            </div>

                            <div v-if="aiTab === 'builder'" class="space-y-6">
                                <!-- Character Style -->
                                <StudioSection :title="$t('influencers.create.aiGenerator.characterStyle')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="style in aiOptions.styles" :key="style.id"
                                            @click="aiConfig.style = style.id"
                                            class="ai-option-card aspect-square relative h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.style === style.id ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-white/5'">
                                            <img :src="style.preview" class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all opacity-90 group-hover:opacity-100" />
                                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                            <span class="absolute bottom-2 left-3 text-[10px] font-black uppercase text-white">{{ style.label }}</span>
                                            <div v-if="aiConfig.style === style.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                                <check-one theme="outline" size="10" />
                                            </div>
                                        </div>
                                    </div>
                                </StudioSection>
                                <!-- Character Type -->
                                <StudioSection :title="$t('influencers.create.aiGenerator.characterType')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="type in aiOptions.characterTypes" :key="type.id"
                                            @click="aiConfig.type = type.id"
                                            class="ai-option-card aspect-square relative h-24 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.type === type.id ? 'border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' : 'border-white/5'">
                                            <img :src="type.preview" class="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 group-hover:scale-110 transition-all opacity-90 group-hover:opacity-100" />
                                            <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                                            <span class="absolute bottom-2 left-3 text-[10px] font-black uppercase text-white">{{ type.label }}</span>
                                            <div v-if="aiConfig.type === type.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                                <check-one theme="outline" size="10" />
                                            </div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <!-- Gender -->
                                <StudioSection :title="$t('influencers.create.aiGenerator.gender')">
                                    <div class="grid grid-cols-3 gap-2">
                                        <div v-for="g in aiOptions.genders" :key="g.id"
                                            @click="aiConfig.gender = g.id"
                                            class="p-3 flex justify-center items-center rounded-xl border border-white/5 bg-white/5 text-center cursor-pointer hover:bg-white/10 transition-all"
                                            :class="aiConfig.gender === g.id ? 'border-purple-500/50 bg-purple-500/10' : ''">
                                            <component :is="g.icon" theme="outline" size="24" :class="aiConfig.gender === g.id ? 'text-purple-400' : 'text-white/40'" />
                                            <span class="ml-2 text-[10px] font-black uppercase tracking-widest" :class="aiConfig.gender === g.id ? 'text-purple-400' : 'text-white/40'">{{ g.label }}</span>
                                        </div>
                                    </div>
                                </StudioSection>

                                <!-- Ethnicity -->
                                <StudioSection :title="$t('influencers.create.aiGenerator.ethnicity')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.ethnicities" :key="e.id"
                                            @click="aiConfig.ethnicity = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.ethnicity === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.ethnicity === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <!-- Nationality (Filtered) -->
                                <StudioSection v-if="filteredNationalities.length > 0" :title="$t('influencers.create.aiGenerator.nationality')">
                                    <div class="flex flex-wrap gap-2">
                                        <div v-for="nat in filteredNationalities" :key="nat.id"
                                             class="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer border"
                                             :class="aiConfig.nationality === nat.id 
                                                ? 'bg-purple-500/10 border-purple-500 text-purple-400' 
                                                : 'bg-white/5 border-white/5 text-white/40 hover:bg-white/10'"
                                             @click="aiConfig.nationality = nat.id">
                                            {{ nat.label }}
                                        </div>
                                    </div>
                                </StudioSection>

                                <!-- Palette Colors (Skin & Eyes) -->
                                <StudioSection :title="$t('influencers.create.aiGenerator.skinColor')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="color in aiOptions.skinColors" :key="color"
                                            @click="aiConfig.skinColor = color"
                                            class="w-full aspect-square rounded-lg border-2 cursor-pointer transition-all hover:scale-110"
                                            :style="{ backgroundColor: color }"
                                            :class="aiConfig.skinColor === color ? 'border-white scale-110' : 'border-transparent'">
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.eyeColor')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.eyeColors" :key="e.id"
                                            @click="aiConfig.eyeColor = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.eyeColor === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.eyeColor === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.eyeType')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.eyeTypes" :key="e.id"
                                            @click="aiConfig.eyesType = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.eyesType === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.eyesType === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.skinType')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.skinTypes" :key="e.id"
                                            @click="aiConfig.skinType = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.skinType === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.skinType === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.skinCondition')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.skinConditions" :key="e.id"
                                            @click="aiConfig.skinCondition = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.skinCondition === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.skinCondition === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.hairType')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.hairTypes" :key="e.id"
                                            @click="aiConfig.hairType = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.hairType === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.hairType === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>

                                <StudioSection :title="$t('influencers.create.aiGenerator.ageProfile')">
                                    <div class="grid grid-cols-5 gap-4">
                                        <div v-for="e in aiOptions.ages" :key="e.id"
                                            @click="aiConfig.age = e.id"
                                            class="relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer group"
                                            :class="aiConfig.age === e.id ? 'border-purple-500 shadow-lg' : 'border-white/5'">
                                            <img :src="e.preview" class="w-full h-full object-cover opacity-90 hover:opacity-100" />
                                            <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent"></div>
                                            <span class="absolute bottom-2 left-2 text-[9px] font-black uppercase text-white">{{ e.label }}</span>
                                            <div v-if="aiConfig.age === e.id" class="absolute top-2 right-2 w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center"><check-one theme="outline" size="10" /></div>
                                        </div>
                                    </div>
                                </StudioSection>
                            </div>

                            <div v-else class="space-y-4">
                                <p class="text-[10px] font-black uppercase opacity-40">{{ $t('influencers.create.aiGenerator.visualPrompt') }}</p>
                                <el-input v-model="aiConfig.customPrompt" type="textarea" :rows="6" :placeholder="$t('influencers.create.aiGenerator.visualPromptPlaceholder')" class="soul-glass-input" />
                            </div>

                            <!-- <div class="pt-6 border-t border-white/5">
                                <el-button type="primary" :loading="loading" size="large" class="w-full !rounded-[24px] !h-[60px] !bg-purple-600 shadow-2xl shadow-purple-600/40 relative overflow-hidden group" @click="generateAIdol">
                                    <magic theme="outline" class="mr-3 scale-125" />
                                    <span class="text-lg font-black tracking-widest">{{ $t('influencers.create.aiGenerator.generateAI') }}</span>
                                </el-button>
                            </div> -->

                             <!-- Simplified Initial Clip Generation -->
                            <div v-if="aiIdolImage" class="space-y-6 pt-8 border-t border-white/5 animate-fade-in">
                                <div class="p-6 rounded-[32px] bg-purple-500/5 border border-purple-500/10 relative overflow-hidden group">
                                    <div class="relative z-10">
                                        <div class="flex items-center justify-between mb-4">
                                            <div class="flex items-center gap-4">
                                                <div class="w-12 h-12 rounded-2xl flex items-center justify-center backdrop-blur-md border transition-all"
                                                    :class="newInfluencer.visual.aidolClips.idle ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-purple-500/20 text-purple-400 border-purple-500/30'">
                                                    <camera theme="outline" size="24" />
                                                </div>
                                                <div>
                                                    <h4 class="text-base font-black text-white uppercase tracking-tight">{{ $t('influencers.create.aidols.clipLibrary.initialIdle', 'Initial Idle State') }}</h4>
                                                    <p class="text-[10px] text-white/40 italic">{{ $t('influencers.create.aidols.clipLibrary.mandatoryDesc', 'Generate the foundation video before proceeding.') }}</p>
                                                </div>
                                            </div>
                                            <div v-if="newInfluencer.visual.aidolClips.idle" class="flex flex-col items-end">
                                                <div class="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                                    <div class="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                                    <span class="text-[9px] font-black text-green-400 uppercase tracking-widest">{{ $t('influencers.create.aidols.clipLibrary.ready') }}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="flex items-center gap-2 mb-3">
                                            <div class="flex-1 px-3 py-2 rounded-xl bg-black/20 border border-white/5 text-[9px] text-white/30 font-mono italic truncate">
                                                {{ getAidolPrompt('idle').substring(0, 80) }}...
                                            </div>
                                            <el-tooltip content="Copy prompt for Kling / Veo / Pika" placement="top">
                                                <el-button circle class="!w-[38px] !h-[38px] !bg-white/5 !border-white/10 hover:!border-cyan-500/40 hover:!bg-cyan-500/5 backdrop-blur-md flex-shrink-0" @click="copyAidolPrompt('idle')">
                                                    <doc-detail theme="outline" size="16" class="text-cyan-400" />
                                                </el-button>
                                            </el-tooltip>
                                        </div>
                                        <div class="flex items-center gap-3">
                                            <el-button type="primary" :icon="Magic" class="flex-1 !rounded-[20px] !h-[44px] !bg-purple-600 hover:!bg-purple-700 !border-none shadow-xl shadow-purple-900/40 text-white tracking-widest" 
                                                @click="generateAidolClip('idle')" :loading="generatingClips['idle']">
                                                <span>{{ newInfluencer.visual.aidolClips.idle ? $t('influencers.create.aidols.clipLibrary.regenerate') : $t('influencers.create.aidols.clipLibrary.generate') }}</span>
                                            </el-button>
                                            <el-button type="info" :icon="UploadOne" class="!w-[44px] !h-[44px] !p-0 !rounded-[20px] !bg-white/5 hover:!bg-white/10 !border-white/10 backdrop-blur-xl" 
                                                @click="triggerClipUpload('idle')" :loading="loading">
                                            </el-button>
                                        </div>
                                    </div>
                                    <div class="absolute inset-0 bg-gradient-to-br from-purple-500/[0.03] to-transparent pointer-events-none"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <!-- Left: Preview (5 Cols) -->
                <div class="lg:col-span-5 space-y-4">
                    <div class="p-2 bg-gradient-to-b from-white/10 to-transparent border border-white/5 rounded-[40px] text-center relative overflow-hidden h-[580px] group shadow-2xl">
                        <div v-if="hasVisualContent" 
                            class="w-full h-full bg-[#050505] rounded-[32px] border border-white/5 overflow-hidden flex items-center justify-center relative group/preview">
                            
                            <InfluencerViewer
                                ref="influencerViewer"
                                :modelType="newInfluencer.visual.modelType"
                                :modelUrl="newInfluencer.visual.modelUrl"
                                :videoClips="newInfluencer.visual.aidolClips"
                                :backgroundUrl="newInfluencer.visual.backgroundUrl"
                                v-model:config="newInfluencer.visual.modelConfig"
                                :speakingVol="speakingVol"
                                :trackingData="trackingData"
                                :interactive="true"
                                :isPortrait="true"
                                :influencer="newInfluencer"
                                :activeState="previewState"
                            />
                        </div>
                        <div v-else class="w-full h-full flex flex-col items-center justify-center bg-black/40 rounded-[32px] cursor-pointer hover:bg-black/50 transition-colors border-2 border-dashed border-white/5" @click="triggerPortraitUpload">
                            <div class="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <upload-one theme="outline" size="32" class="text-white/40" />
                            </div>
                            <p class="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">AWAITING AVATAR PROJECTION</p>
                            <span class="text-[9px] font-bold text-blue-400/60 mt-2 uppercase tracking-widest hover:text-blue-400 transition-colors">OR CLICK TO UPLOAD PORTRAIT</span>
                        </div>

                        <!-- Overlay for generation/segmentation -->
                        <div v-if="isSegmenting" class="absolute inset-x-2 bottom-2 h-24 bg-black/60 backdrop-blur-md rounded-[28px] z-20 flex items-center justify-center gap-4 border border-white/5 mx-2">
                            <el-icon class="is-loading text-blue-400 text-2xl"><Loading /></el-icon>
                            <span class="text-[11px] font-black uppercase tracking-widest text-white/80">
                                {{ $t('influencers.create.isolatingSilhouette') }}
                            </span>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-1 gap-3 px-2 " v-if="hasVisualContent">
                        <el-button :loading="loading" size="large" class="soul-action-btn" @click="generatePreview">
                            <camera theme="outline" class="mr-2"/> {{ $t('influencers.create.generateSnapshot') }}
                        </el-button>
                    </div>
                </div>

                <!-- Right: Content (7 Cols) -->
                <div class="lg:col-span-7 h-[650px] overflow-y-auto pr-2 custom-scrollbar">
                    
                    <!-- STEP 1: VISUAL IDENTITY (AI or Manual) -->
                    <div v-if="activeStep === 1" class="space-y-6 animate-fade-in">
                        <!-- Manual Upload Screen (Old Step 1) -->
                        <div class="space-y-6">
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/50 text-blue-400 font-bold">1</div>
                                <h2 class="text-xl font-black text-white">{{ $t('influencers.create.wizard.step1.header') }}</h2>
                            </div>

                            <StudioSection :title="$t('influencers.create.visionSource')">
                                <div class="flex items-center justify-between mb-3 px-1">
                                    <span class="text-[8px] font-black opacity-30 uppercase tracking-widest">{{ $t('influencers.create.projectionType') }}</span>
                                    <el-radio-group v-model="newInfluencer.visual.modelType" size="small" :disabled="true" class="soul-radio-group">
                                        <el-radio-button value="vrm">{{ $t('influencers.create.vrm3d') }}</el-radio-button>
                                        <el-radio-button value="live2d">{{ $t('influencers.create.live2d') }}</el-radio-button>
                                        <el-radio-button value="static">{{ $t('influencers.create.static') }}</el-radio-button>
                                        <el-radio-button value="aidol">{{ $t('influencers.create.aidol') }}</el-radio-button>
                                        <el-radio-button value="video">{{ $t('influencers.create.video') }}</el-radio-button>
                                    </el-radio-group>
                                </div>
                                <StudioUploadZone
                                    :title="$t('influencers.create.deployEntityFile')"
                                    :subtitle="$t('influencers.create.acceptsPhotos')"
                                    :activeTitle="$t('influencers.create.fileSynchronized')"
                                    :activeSubtitle="newInfluencer.visual.modelType === 'live2d' ? $t('influencers.create.live2dAssetSynced') : (newInfluencer.visual.modelType === 'video' ? $t('influencers.create.videoPhôiSynced') : $t('influencers.create.influencerPhotoProcessed'))"
                                    :hasFile="!!hasVisualContent"
                                    :loading="uploading"
                                    accept="image/*,video/*,.zip,.rar,.vrm"
                                    @change="handleFileUpload"
                                />
                            </StudioSection>

                            <div class="space-y-2">
                                <label class="section-label">
                                    {{ $t('influencers.create.vocalSignature') }}
                                    <span v-if="newInfluencer.voiceConfig.voiceId" class="text-[8px] font-bold opacity-40 uppercase"> {{ newInfluencer.voiceConfig.provider }} • {{ newInfluencer.voiceConfig.voiceId }}</span>
                                </label>
                                <div class="flex flex-col gap-2">
                                    <div class="flex gap-2">
                                        <el-button @click="voiceLibraryVisible = true" 
                                                    class="flex-1 soul-glass-btn h-[42px] relative overflow-hidden text-left px-4">
                                            <div class="flex items-center gap-2">
                                                <music-one theme="outline" class="text-blue-400" />
                                                <span class="text-[10px] font-black uppercase tracking-widest truncate">
                                                    {{ newInfluencer.voiceConfig.voiceId ? $t('influencers.create.signatureLoaded') : $t('influencers.create.openLibrary') }}
                                                </span>
                                            </div>
                                            <div v-if="newInfluencer.voiceConfig.voiceId" class="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div class="w-2 h-2 rounded-full bg-green-500 shadow-sm animate-pulse"></div>
                                            </div>
                                        </el-button>

                                        <el-button v-if="newInfluencer.voiceConfig.voiceId" 
                                                    @click="handleVoicePreview()" 
                                                    :loading="previewConfig.loading"
                                                    class="soul-neural-test-btn h-[42px] w-[42px] !rounded-xl !p-0">
                                            <pause-one v-if="previewConfig.isPlaying" theme="outline" size="18" />
                                            <play v-else theme="outline" size="18" />
                                        </el-button>
                                    </div>
                                </div>
                            </div>

                            <div class="space-y-3 pt-2">
                                <label class="section-label">{{ $t('influencers.create.environment') }}</label>
                                <div class="grid grid-cols-6 gap-2">
                                    <div v-for="preset in backgroundPresets" :key="preset.name"
                                        @click="newInfluencer.visual.backgroundUrl = preset.url"
                                        class="cursor-pointer aspect-[1/1] rounded-2xl border-2 transition-all hover:scale-105 overflow-hidden"
                                        :class="newInfluencer.visual.backgroundUrl === preset.url 
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
                        </div>
                    </div>

                    <!-- STEP 2: BRAIN & PERSONA -->
                    <div v-if="activeStep === 2" class="space-y-6 animate-fade-in pb-10">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/50 text-purple-400 font-bold">2</div>
                            <h2 class="text-xl font-black text-white">{{ $t('influencers.create.wizard.step2.header') }}</h2>
                        </div>

                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="section-label">{{ $t('influencers.create.personaIdentity') }}</label>
                                <el-input v-model="newInfluencer.name" :placeholder="$t('influencers.create.namePlaceholder')" class="soul-glass-input" />
                            </div>
                            <div class="space-y-2">
                                <label class="section-label">{{ $t('influencers.create.wizard.fields.jobRole') }}</label>
                                <el-select v-model="newInfluencer.jobRole" :placeholder="$t('influencers.create.wizard.fields.selectRole')" class="w-full soul-glass-select">
                                    <el-option v-for="role in jobRoles" :key="role" :label="role" :value="role"></el-option>
                                </el-select>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <label class="section-label">{{ $t('influencers.create.aiGenerator.bgPromptMemory') }}</label>
                            <el-input v-model="newInfluencer.description" type="textarea" :rows="4"
                                :placeholder="$t('influencers.create.descriptionPlaceholder')" class="soul-glass-input" />
                        </div>

                        <div class="space-y-4 pt-4 border-t border-white/5">
                            <label class="section-label">{{ $t('influencers.create.aiGenerator.animationIntelligence') }}</label>
                            <div class="grid grid-cols-2 gap-x-8 gap-y-4">
                                <StudioSlider 
                                    :label="$t('influencers.create.gestureIntensity')" 
                                    v-model="newInfluencer.animationConfig.gestureIntensity" 
                                    :min="0" :max="2" :step="0.1" :precision="1" 
                                />
                                <StudioSlider 
                                    :label="$t('influencers.create.tiltFactor')" 
                                    v-model="newInfluencer.animationConfig.headTiltRange" 
                                    :min="0" :max="2" :step="0.1" :precision="1" 
                                />
                            </div>
                        </div>

                        <div class="space-y-4 pt-4 border-t border-white/5">
                            <div class="flex justify-between items-center">
                                <label class="section-label">{{ $t('influencers.create.knowledgeBank') }}</label>
                                <el-button type="primary" size="small" circle @click="addKnowledge">+</el-button>
                            </div>
                            <div class="space-y-3">
                                <div v-for="(k, idx) in (newInfluencer.memory?.knowledgeEntries || [])" :key="idx" class="p-4 bg-white/3 border border-white/5 rounded-2xl relative group">
                                     <el-button @click="newInfluencer.memory.knowledgeEntries.splice(idx,1)" class="absolute top-2 right-2 opacity-0 group-hover:opacity-100" size="small" link type="danger"><close /></el-button>
                                     <el-input v-model="k.title" :placeholder="$t('influencers.create.titlePlaceholder')" class="soul-glass-input mb-2" />
                                     <el-input v-model="k.content" type="textarea" :rows="2" :placeholder="$t('influencers.create.contentPlaceholder')" class="soul-glass-input" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 3: STAGE & PERFORMANCE (Integrated from InfluencerUpdate) -->
                    <div v-if="activeStep === 3" class="space-y-6 animate-fade-in pb-10">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50 text-cyan-400 font-bold">3</div>
                            <h2 class="text-xl font-black text-white">{{ $t('influencers.create.wizard.step3.header') }}</h2>
                        </div>

                        <StudioSection :title="$t('influencers.create.stageEffects')">
                             <!-- AI Auto-Director Master Toggle -->
                             <div class="flex items-center justify-between mb-4 bg-blue-500/10 p-4 rounded-3xl border border-blue-500/20">
                                <div class="flex flex-col">
                                    <span class="text-[10px] font-black uppercase text-blue-400">{{ $t('influencers.create.autoDirector') }}</span>
                                    <span class="text-[8px] opacity-40 italic">{{ $t('influencers.create.autonomousProduction') }}</span>
                                </div>
                                <el-switch v-model="newInfluencer.directorConfig.autoDirectorEnabled" size="small" />
                            </div>

                            <div :class="{'opacity-30 pointer-events-none': newInfluencer.directorConfig.autoDirectorEnabled}">
                                <div class="grid grid-cols-2 gap-4 mb-4">
                                     <!-- Aura -->
                                    <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-cyan-400">{{ $t('influencers.create.vocalAura') }}</span>
                                        </div>
                                        <div class="flex items-center gap-2">
                                            <el-color-picker v-model="newInfluencer.visual.auraColor" size="small" />
                                            <el-switch v-model="newInfluencer.visual.auraEnabled" size="small" />
                                        </div>
                                    </div>
                                    <!-- Cinematic -->
                                    <div class="flex items-center justify-between bg-white/5 rounded-xl p-3 border border-white/5">
                                        <div class="flex flex-col">
                                            <span class="text-[9px] font-bold uppercase tracking-widest text-purple-400">{{ $t('influencers.create.cinematicMode') }}</span>
                                        </div>
                                        <el-switch v-model="newInfluencer.directorConfig.cinematicMode" size="small" />
                                    </div>
                                </div>

                                <!-- Lighting -->
                                <div class="space-y-4 pt-2">
                                    <label class="section-label !text-[7px]">{{ $t('influencers.create.stageLighting') }}</label>
                                    <div class="grid grid-cols-4 gap-2">
                                        <div v-for="preset in ['studio', 'neon', 'dramatic', 'vocal_orange']" :key="preset"
                                             @click="newInfluencer.visual.lightingPreset = preset"
                                             class="cursor-pointer p-2 rounded-xl border transition-all flex flex-col items-center gap-1 bg-white/5 border-white/5"
                                             :class="{'!border-blue-500 !bg-blue-500/10': newInfluencer.visual.lightingPreset === preset}">
                                            <span class="text-[8px] font-black uppercase">{{ $t(`influencers.create.lightingPresets.${preset}`) }}</span>
                                        </div>
                                    </div>
                                </div>

                                <!-- Particles -->
                                <div class="space-y-3 mt-4">
                                    <label class="section-label !text-[7px]">{{ $t('influencers.create.atmosphericAtmosphere') }}</label>
                                    <div class="flex flex-wrap gap-2">
                                        <div v-for="type in ['sakura', 'snow', 'glitter']" :key="type"
                                             @click="newInfluencer.visual.particleType = newInfluencer.visual.particleType === type ? null : type"
                                             class="trait-tag !py-1 !px-3 font-black uppercase text-[8px]"
                                             :class="{'active': newInfluencer.visual.particleType === type}">
                                            {{ $t(`influencers.create.particles.${type}`) }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </StudioSection>

                        <!-- Relocated Neural Video Library with Custom Prompts -->
                        <div v-if="newInfluencer.visual.modelType === 'aidol'" class="space-y-6 pt-8 border-t border-white/5 animate-fade-in">
                            <div class="flex items-center justify-between">
                                <h3 class="text-lg font-black text-cyan-400 tracking-tighter uppercase">{{ $t('influencers.create.aidols.clipLibrary.title', 'Neural Video Library') }}</h3>
                            </div>
                            <p class="text-[10px] text-white/40 leading-relaxed italic">
                                {{ $t('influencers.create.aidols.clipLibrary.desc', 'Generate and upload green-screen videos for each character state to enable high-fidelity neural switching.') }}
                            </p>

                            <div class="grid grid-cols-2 gap-5">
                                <div v-for="state in AIDOL_STATES" :key="state.id" 
                                     class="relative group rounded-[32px] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all overflow-hidden flex flex-col min-h-[240px]">
                                    
                                    <div class="absolute inset-0 z-0">
                                        <video v-if="newInfluencer.visual.aidolClips[state.id]" 
                                            :src="getFileUrl(newInfluencer.visual.aidolClips[state.id])" 
                                            muted loop autoplay 
                                            class="w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity" />
                                        <div v-else class="w-full h-full bg-[#080808] flex items-center justify-center">
                                            <component :is="state.icon" theme="outline" size="64" class="text-white/[0.02]" />
                                        </div>
                                        <div class="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent"></div>
                                    </div>

                                    <div class="relative z-10 p-5 flex flex-col h-full">
                                        <div class="flex items-start justify-between mb-4">
                                            <div class="flex items-center gap-3">
                                                <div class="w-10 h-10 rounded-2xl flex items-center justify-center backdrop-blur-xl border transition-all"
                                                    :class="newInfluencer.visual.aidolClips[state.id] ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-white/5 text-white/30 border-white/10'">
                                                    <component :is="state.icon" theme="outline" size="20" />
                                                </div>
                                                <div class="flex flex-col">
                                                    <span class="text-[11px] font-black text-white uppercase tracking-wider">{{ state.label }}</span>
                                                    <span class="text-[9px] font-bold uppercase tracking-widest" :class="newInfluencer.visual.aidolClips[state.id] ? 'text-green-500/60' : 'text-white/20'">
                                                        {{ newInfluencer.visual.aidolClips[state.id] ? 'Active' : 'Missing' }}
                                                    </span>
                                                </div>
                                            </div>
                                            <div class="flex gap-2">
                                                <el-button v-if="newInfluencer.visual.aidolClips[state.id]"
                                                    circle 
                                                    class="backdrop-blur-md !w-8 !h-8 transition-all"
                                                    :class="previewState === state.id ? '!bg-cyan-500 !border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.5)]' : '!bg-white/5 !border-white/10 hover:!border-cyan-500/40 text-cyan-400'"
                                                    @click="previewClip(state.id)"
                                                >
                                                    <component :is="previewState === state.id ? PauseOne : Play" theme="outline" size="14" />
                                                </el-button>
                                                
                                                <el-tooltip :content="$t('influencers.create.aidols.clipLibrary.copyPrompt')" placement="top">
                                                    <el-button circle class="!bg-white/5 !border-white/10 hover:!border-cyan-500/40 backdrop-blur-md !w-8 !h-8" @click="copyAidolPrompt(state.id)">
                                                        <doc-detail theme="outline" size="14" class="text-cyan-400" />
                                                    </el-button>
                                                </el-tooltip>
                                            </div>
                                        </div>

                                        <!-- Custom Prompt Input -->
                                        <div class="mb-4">
                                            <el-input 
                                                v-model="newInfluencer.visual.clipPrompts[state.id]" 
                                                type="textarea" 
                                                :rows="2" 
                                                :placeholder="$t('influencers.create.aidols.clipLibrary.customPromptPlaceholder', 'Add custom detail for this event...')"
                                                class="soul-mini-prompt-input"
                                            />
                                        </div>

                                        <div class="flex items-center gap-2 mt-auto">
                                            <el-button type="primary" class="flex-1 !rounded-[14px] !h-[40px] !bg-cyan-600/80 hover:!bg-cyan-600 !border-none backdrop-blur-xl shadow-lg" 
                                                @click="generateAidolClip(state.id)" :loading="generatingClips[state.id]">
                                                <magic theme="outline" class="mr-2" /> {{ $t('influencers.create.aidols.clipLibrary.generate') }}
                                            </el-button>
                                            <el-button type="info" class="!w-[40px] !h-[40px] !p-0 !rounded-[14px] !bg-white/5 hover:!bg-white/10 !border-white/10 backdrop-blur-xl" 
                                                @click="triggerClipUpload(state.id)" :disabled="generatingClips[state.id]">
                                                <upload-one theme="outline" size="18" />
                                            </el-button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- STEP 4: DISTRIBUTION & AUTOMATION -->
                    <div v-show="activeStep === 4" class="space-y-6 animate-fade-in pb-10">
                        <div class="flex items-center gap-3 mb-6">
                            <div class="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center border border-green-500/50 text-green-400 font-bold">4</div>
                            <h2 class="text-xl font-black text-white">{{ $t('influencers.create.wizard.step4.header') }}</h2>
                        </div>

                        <!-- 24/7 Live -->
                        <div class="p-6 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-green-500/10 to-transparent"></div>
                            <div class="relative z-10">
                                <div class="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 class="text-white font-bold text-base flex items-center">
                                            <play class="mr-2 text-green-400"/> {{ $t('influencers.create.wizard.fields.liveAutomation') }}
                                        </h3>
                                        <p class="text-xs text-white/50 mt-1">{{ $t('influencers.create.wizard.fields.liveAutomationDesc') }}</p>
                                    </div>
                                    <el-switch v-model="newInfluencer.automationSchedule.live.enabled" active-color="#10b981" />
                                </div>
                                <div v-if="newInfluencer.automationSchedule.live.enabled" class="bg-black/40 p-4 rounded-xl space-y-3">
                                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-black">{{ $t('influencers.create.wizard.fields.activeScheduleSlots') }}</p>
                                    <div class="flex items-center justify-between border-b border-white/5 pb-2">
                                        <span class="text-xs text-white/80">{{ $t('influencers.create.wizard.fields.everyday') }}</span>
                                        <span class="text-xs text-blue-400 font-mono">00:00 - 23:59 (24/7)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- VOD Generation -->
                        <div class="p-6 bg-white/5 rounded-2xl border border-white/10 relative overflow-hidden">
                            <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
                            <div class="relative z-10">
                                <div class="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 class="text-white font-bold text-base flex items-center">
                                            <video-two class="mr-2 text-blue-400"/> {{ $t('influencers.create.wizard.fields.vodGeneration') }}
                                        </h3>
                                        <p class="text-xs text-white/50 mt-1">{{ $t('influencers.create.wizard.fields.vodGenerationDesc') }}</p>
                                    </div>
                                    <el-switch v-model="newInfluencer.automationSchedule.vod.enabled" active-color="#3b82f6" />
                                </div>
                            </div>
                        </div>

                        <div class="space-y-4 pt-4 border-t border-white/5">
                            <label class="section-label">{{ $t('influencers.create.wizard.fields.socialConnections') }}</label>
                            <div class="grid gap-2">
                                <div v-for="plat in ['YouTube', 'TikTok']" :key="plat" class="flex items-center justify-between bg-white/5 hover:bg-white/10 transition rounded-xl p-3 border border-white/5 cursor-pointer">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded-full flex items-center justify-center" :class="plat === 'YouTube' ? 'bg-red-500/20 text-red-500' : 'bg-black text-white'">
                                            <youtube v-if="plat === 'YouTube'" theme="filled" />
                                            <tiktok v-else theme="filled" />
                                        </div>
                                        <span class="text-sm font-bold text-white/80">{{ plat }}</span>
                                    </div>
                                    <span class="text-[10px] text-white/40 border border-white/10 px-2 py-1 rounded bg-black/40">{{ $t('influencers.create.wizard.fields.connect') }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <!-- Hidden File Inputs -->
            <input type="file" ref="clipInput" style="display: none" accept="video/*" @change="handleClipSelected" />
            <input type="file" ref="portraitInput" style="display: none" accept="image/*" @change="handlePortraitSelected" />
        </div>

        <template #footer>
            <div class="flex items-center justify-between px-6 pb-2 w-full">
                <el-button @click="handleBack" :disabled="activeStep === 0 && mode === 'create'" class="soul-glass-btn px-8 !rounded-xl">{{ $t('influencers.create.wizard.actions.back') }}</el-button>
                <div class="flex gap-4">
                    <el-button v-if="activeStep < 4" @click="handleNext" type="primary" 
                        :disabled="activeStep === 1 && creationSource === 'ai' && newInfluencer.visual.modelType === 'aidol' && (!newInfluencer.visual.thumbnailUrl || !newInfluencer.visual.aidolClips.idle)"
                        class="soul-glass-btn px-8 !rounded-xl !bg-blue-600 !text-white !border-blue-500 shadow-lg shadow-blue-500/30 disabled:!opacity-40 disabled:!cursor-not-allowed">
                        <span>{{ $t('influencers.create.wizard.actions.nextStep') }}</span>
                        <span v-if="activeStep === 1 && creationSource === 'ai' && newInfluencer.visual.modelType === 'aidol' && (!newInfluencer.visual.thumbnailUrl || !newInfluencer.visual.aidolClips.idle)" class="ml-2 text-[9px] text-white/50 font-normal normal-case tracking-normal">
                            {{ !newInfluencer.visual.thumbnailUrl ? '(generate AI image first)' : '(generate idle video)' }}
                        </span>
                    </el-button>
                    <el-button v-if="activeStep === 4" type="primary" @click="mode === 'edit' ? handleUpdateInfluencer() : handleCreateInfluencer()" :loading="loading" class="soul-initialize-btn px-12 h-[46px] !rounded-[16px]">{{ mode === 'edit' ? $t('influencers.create.synchronizeInfluencer') : $t('influencers.create.wizard.actions.initializeEntity') }}</el-button>
                </div>
            </div>
        </template>
        <VoiceLibraryDialog 
            v-model="voiceLibraryVisible"
            v-model:provider="newInfluencer.voiceConfig.provider"
            v-model:voiceId="newInfluencer.voiceConfig.voiceId"
            v-model:language="newInfluencer.voiceConfig.language"
            @select="v => { 
                console.log(v);
                newInfluencer.voiceConfig.sampleUrl = v.audioSampleUrl;
            }"
        />

        <MusicSelectionDialog 
            v-model="musicSelectionVisible"
            @select="handleMusicSelect"
        />

    </el-dialog>
</template>
<script setup lang="ts">
import { ref, computed, watch, onUnmounted, onMounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { useInfluencerStore } from '@/stores/influencer';
import { useMediaStore } from '@/stores/media';
import { useAIStore } from '@/stores/ai';
import { useBackgroundRemoval } from '@/services/BackgroundRemovalService';
import InfluencerViewer from './InfluencerViewer.vue';
import { useAudioVisualizer } from '@/composables/useAudioVisualizer';
import { useInfluencerTracking } from '@/composables/influencer/useInfluencerTracking';
import { liveAIEngine } from '@/utils/ai/LiveAIEngine';
import MusicSelectionDialog from './MusicSelectionDialog.vue';
import VoiceLibraryDialog from './VoiceLibraryDialog.vue';
import { UploadOne, Camera, Magic, Loading, Play, 
    PauseOne, CheckOne, MusicOne, Plus, Down, 
    Search, Close, Music, MusicList, Youtube, 
    Tiktok, VideoTwo, Female, Male, Like as Neutral,
    DocDetail, Waves, Voice, MallBag, Finance, 
    Fire, Diamond,  Waves as WaveIcon
} from '@icon-park/vue-next';
import api, { getFileUrl } from '@/utils/api';
import StudioSection from '../studio/shared/StudioSection.vue';
import StudioSlider from '../studio/shared/StudioSlider.vue';
import StudioUploadZone from '../studio/shared/StudioUploadZone.vue';

const { t } = useI18n();

const props = withDefaults(defineProps<{
    modelValue: boolean;
    mode?: 'create' | 'edit';
    influencer?: any;
}>(), {
    mode: 'create'
});

const emit = defineEmits(['update:modelValue', 'success', 'update:influencer']);

const influencerStore = useInfluencerStore();
const mediaStore = useMediaStore();
const aiStore = useAIStore();
const backgroundRemoval = useBackgroundRemoval();
const activeStep = ref(props.mode === 'create' ? 0 : 1);
const creationSource = ref<'ai' | 'file' | null>(props.mode === 'edit' ? 'file' : null);
const aiTab = ref('builder');
const loading = ref(false);
const uploading = ref(false);
const generatingPreview = ref(false);
const isSegmenting = ref(false);
const generatingAI = ref(false);
const generatingClips = reactive<Record<string, boolean>>({});
const isSynthesizing = ref(false);

const voiceLibraryVisible = ref(false);
const musicSelectionVisible = ref(false);
const backgroundInput = ref<HTMLInputElement | null>(null);
const clipInput = ref<HTMLInputElement | null>(null);
const portraitInput = ref<HTMLInputElement | null>(null);
const activeClipState = ref<string | null>(null);
const previewState = ref<string>('idle');
const previewClip = (stateId: string) => {
    previewState.value = previewState.value === stateId ? 'idle' : stateId;
};
const voicesList = ref<any[]>([]);
const aiIdolImage = ref<string | null>(null);
const isHoveringPreview = ref(false);

const AIDOL_STATES = computed(() => [
    { id: 'idle', label: t('influencers.create.aidols.states.idle', 'Idle'), icon: Waves },
    { id: 'speaking', label: t('influencers.create.aidols.states.speaking', 'Speaking'), icon: Voice },
    { id: 'product', label: t('influencers.create.aidols.states.product', 'Product Intro'), icon: MallBag },
    { id: 'checkout', label: t('influencers.create.aidols.states.checkout', 'Checkout/CTA'), icon: Finance },
    { id: 'hype', label: t('influencers.create.aidols.states.hype', 'Hype/High Energy'), icon: Fire },
    { id: 'gift_react', label: t('influencers.create.aidols.states.gift_react', 'Gift Reaction'), icon: Diamond },
    { id: 'dance', label: t('influencers.create.aidols.states.dance', 'Entertainment/Dance'), icon: MusicList },
    { id: 'wave', label: t('influencers.create.aidols.states.wave', 'Wave/Outro'), icon: WaveIcon },
]);

const aiConfig = reactive({
    style: 'realistic',
    type: 'human',
    gender: 'female',
    ethnicity: 'asian',
    skinColor: '#FFD9B3',
    // eyeColor: '#4A2511',
    age: 'adult',
    eyesType: 'human',
    eyeColor: 'black',
    skinType: 'human',
    skinCondition: '',
    hairType: 'long',
    nationality: 'vietnamese',
    customPrompt: '',
});

const jobRoles = computed(() => [
    t('influencers.create.aiGenerator.options.roles.sales'),
    t('influencers.create.aiGenerator.options.roles.news'),
    t('influencers.create.aiGenerator.options.roles.talkshow'),
    t('influencers.create.aiGenerator.options.roles.entertainer'),
    t('influencers.create.aiGenerator.options.roles.educator'),
    t('influencers.create.aiGenerator.options.roles.influencer'),
    t('influencers.create.aiGenerator.options.roles.custom')
]);

const aiOptions = computed(() => ({
    styles: [
        { id: 'realistic', label: t('influencers.create.aiGenerator.options.styles.realistic'), preview: '/ai/style_realistic.jpg' },
        { id: 'anime', label: t('influencers.create.aiGenerator.options.styles.anime'), preview: '/ai/style_anime.jpg' },
        { id: 'cartoon', label: t('influencers.create.aiGenerator.options.styles.cartoon'), preview: '/ai/style_cartoon.jpg' },
        { id: '2d', label: t('influencers.create.aiGenerator.options.styles.2d'), preview: '/ai/style_2d.jpg' },
    ],
    characterTypes: [
        { id: 'human', label: t('influencers.create.aiGenerator.options.characterTypes.human'), preview: '/ai/type_human.jpg' },
        { id: 'elf', label: t('influencers.create.aiGenerator.options.characterTypes.elf'), preview: '/ai/type_elf.jpg' },
        { id: 'alien', label: t('influencers.create.aiGenerator.options.characterTypes.alien'), preview: '/ai/type_alien.jpg' },
        // { id: 'mechanical', label: t('influencers.create.aiGenerator.options.characterTypes.mechanical'), preview: '/ai/type_mech.jpg' },
        { id: 'amphibian', label: t('influencers.create.aiGenerator.options.characterTypes.amphibian'), preview: '/ai/type_amphibian.jpg' },
        { id: 'ant', label: t('influencers.create.aiGenerator.options.characterTypes.ant'), preview: '/ai/type_ant.jpg' },
        { id: 'bee', label: t('influencers.create.aiGenerator.options.characterTypes.bee'), preview: '/ai/type_bee.jpg' },
        { id: 'beetle', label: t('influencers.create.aiGenerator.options.characterTypes.beetle'), preview: '/ai/type_beetle.jpg' },
        { id: 'crocodile', label: t('influencers.create.aiGenerator.options.characterTypes.crocodile'), preview: '/ai/type_crocodile.jpg' },
        { id: 'iguana', label: t('influencers.create.aiGenerator.options.characterTypes.iguana'), preview: '/ai/type_iguana.jpg' },
        { id: 'lyzard', label: t('influencers.create.aiGenerator.options.characterTypes.lyzard'), preview: '/ai/type_lyzard.jpg' },
        { id: 'mantis', label: t('influencers.create.aiGenerator.options.characterTypes.mantis'), preview: '/ai/type_mantis.jpg' },
        { id: 'octopus', label: t('influencers.create.aiGenerator.options.characterTypes.octopus'), preview: '/ai/type_octopus.jpg' },
        { id: 'reptile', label: t('influencers.create.aiGenerator.options.characterTypes.reptile'), preview: '/ai/type_reptile.jpg' },
        // { id: 'bird', label: t('influencers.create.aiGenerator.options.characterTypes.bird'), preview: '/ai/type_bird.jpg' },
        // { id: 'cat', label: t('influencers.create.aiGenerator.options.characterTypes.cat'), preview: '/ai/type_cat.jpg' },
        // { id: 'dog', label: t('influencers.create.aiGenerator.options.characterTypes.dog'), preview: '/ai/type_dog.jpg' },
        // { id: 'dragon', label: t('influencers.create.aiGenerator.options.characterTypes.dragon'), preview: '/ai/type_dragon.jpg' },
        // { id: 'fish', label: t('influencers.create.aiGenerator.options.characterTypes.fish'), preview: '/ai/type_fish.jpg' },
        // { id: 'fox', label: t('influencers.create.aiGenerator.options.characterTypes.fox'), preview: '/ai/type_fox.jpg' },
        // { id: 'rabbit', label: t('influencers.create.aiGenerator.options.characterTypes.rabbit'), preview: '/ai/type_rabbit.jpg' },
    ],
    genders: [
        { id: 'female', label: t('influencers.create.aiGenerator.options.genders.female'), icon: Female },
        { id: 'male', label: t('influencers.create.aiGenerator.options.genders.male'), icon: Male },
        { id: 'neutral', label: t('influencers.create.aiGenerator.options.genders.neutral'), icon: Neutral }
    ],
    ethnicities: [
        { id: 'asian', label: t('influencers.create.aiGenerator.options.ethnicities.asian'), preview: '/ai/eth_asian.jpg' },
        { id: 'european', label: t('influencers.create.aiGenerator.options.ethnicities.european'), preview: '/ai/eth_european.jpg' },
        { id: 'african', label: t('influencers.create.aiGenerator.options.ethnicities.african'), preview: '/ai/eth_african.jpg' },
        { id: 'indian', label: t('influencers.create.aiGenerator.options.ethnicities.indian'), preview: '/ai/eth_indian.jpg' },
        { id: 'middle_eastern', label: t('influencers.create.aiGenerator.options.ethnicities.middle_eastern'), preview: '/ai/eth_me.jpg' },
        { id: 'mixed', label: t('influencers.create.aiGenerator.options.ethnicities.mixed'), preview: '/ai/eth_mixed.jpg' }
    ],
    nationalities: [
        { id: 'vietnamese', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.vietnamese') },
        { id: 'japanese', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.japanese') },
        { id: 'chinese', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.chinese') },
        { id: 'korean', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.korean') },
        { id: 'thai', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.thai') },
        { id: 'indian', ethnicity: 'asian', label: t('influencers.create.aiGenerator.options.nationalities.indian') },
        { id: 'british', ethnicity: 'european', label: t('influencers.create.aiGenerator.options.nationalities.british') },
        { id: 'french', ethnicity: 'european', label: t('influencers.create.aiGenerator.options.nationalities.french') },
        { id: 'german', ethnicity: 'european', label: t('influencers.create.aiGenerator.options.nationalities.german') },
        { id: 'american', ethnicity: 'white', label: t('influencers.create.aiGenerator.options.nationalities.american') },
        { id: 'brazilian', ethnicity: 'latino', label: t('influencers.create.aiGenerator.options.nationalities.brazilian') },
        { id: 'nigerian', ethnicity: 'african', label: t('influencers.create.aiGenerator.options.nationalities.nigerian') },
        { id: 'egyptian', ethnicity: 'middle_eastern', label: t('influencers.create.aiGenerator.options.nationalities.egyptian') }
    ],
    skinColors: ['#FFD9B3', '#F1C27D', '#E0AC69', '#8D5524', '#C68642', '#3B2219', '#E6C6B0', '#FFFFFF'],
    // eyeColors: ['#4A2511', '#1C0D02', '#2E536F', '#3D671D', '#634E34', '#1F3438', '#A1CAF1', '#964B00'],
    eyeColors: [
        { id: 'amber', label: t('influencers.create.aiGenerator.options.eyeColors.amber'), preview: '/ai/eye_amber.png' },
        { id: 'black', label: t('influencers.create.aiGenerator.options.eyeColors.black'), preview: '/ai/eye_black.png' },
        { id: 'blue', label: t('influencers.create.aiGenerator.options.eyeColors.blue'), preview: '/ai/eye_blue.png' },
        { id: 'brown', label: t('influencers.create.aiGenerator.options.eyeColors.brown'), preview: '/ai/eye_brown.png' },
        { id: 'deepBrown', label: t('influencers.create.aiGenerator.options.eyeColors.deepBrown'), preview: '/ai/eye_deep_brown.png' },
        { id: 'green', label: t('influencers.create.aiGenerator.options.eyeColors.green'), preview: '/ai/eye_green.png' },
        { id: 'grey', label: t('influencers.create.aiGenerator.options.eyeColors.grey'), preview: '/ai/eye_grey.png' },
        { id: 'purple', label: t('influencers.create.aiGenerator.options.eyeColors.purple'), preview: '/ai/eye_purple.png' },
        { id: 'red', label: t('influencers.create.aiGenerator.options.eyeColors.red'), preview: '/ai/eye_red.png' },
        { id: 'white', label: t('influencers.create.aiGenerator.options.eyeColors.white'), preview: '/ai/eye_white.png' },
        { id: 'blackVoid', label: t('influencers.create.aiGenerator.options.eyeColors.blackVoid'), preview: '/ai/eye_black_void.png' },
        { id: 'whiteVoid', label: t('influencers.create.aiGenerator.options.eyeColors.whiteVoid'), preview: '/ai/eye_white_void.png' },
    ],
    skinTypes: [
        { id: 'human', label: t('influencers.create.aiGenerator.options.skinTypes.human'), preview: '/ai/skin_human.png' },
        { id: 'fur', label: t('influencers.create.aiGenerator.options.skinTypes.fur'), preview: '/ai/skin_fur.png' },
        { id: 'fish', label: t('influencers.create.aiGenerator.options.skinTypes.fish'), preview: '/ai/skin_fish.png' },
        { id: 'amphibian', label: t('influencers.create.aiGenerator.options.skinTypes.amphibian'), preview: '/ai/skin_amphibian.png' },
        { id: 'scales', label: t('influencers.create.aiGenerator.options.skinTypes.scales'), preview: '/ai/skin_scales.png' },
        { id: 'metallic', label: t('influencers.create.aiGenerator.options.skinTypes.metallic'), preview: '/ai/skin_metallic.png' },
    ],
    skinConditions: [
        { id: 'albinism', label: t('influencers.create.aiGenerator.options.skinConditions.albinism'), preview: '/ai/skin_albinism.jpg' },
        { id: 'birthmarks', label: t('influencers.create.aiGenerator.options.skinConditions.birthmarks'), preview: '/ai/skin_birthmarks.jpg' },
        { id: 'burns', label: t('influencers.create.aiGenerator.options.skinConditions.burns'), preview: '/ai/skin_burns.jpg' },
        { id: 'cracked', label: t('influencers.create.aiGenerator.options.skinConditions.cracked'), preview: '/ai/skin_cracked.jpg' },
        { id: 'freckles', label: t('influencers.create.aiGenerator.options.skinConditions.freckles'), preview: '/ai/skin_freckles.jpg' },
        { id: 'pigmentation', label: t('influencers.create.aiGenerator.options.skinConditions.pigmentation'), preview: '/ai/skin_pigmentation.jpg' },
        { id: 'scars', label: t('influencers.create.aiGenerator.options.skinConditions.scars'), preview: '/ai/skin_scars.jpg' },
        { id: 'vitiligo', label: t('influencers.create.aiGenerator.options.skinConditions.vitiligo'), preview: '/ai/skin_vitiligo.jpg' },
        { id: 'wrinkled', label: t('influencers.create.aiGenerator.options.skinConditions.wrinkled'), preview: '/ai/skin_wrinkled.jpg' },
    ],
    hairTypes: [
        { id: 'afro', label: t('influencers.create.aiGenerator.options.hairTypes.afro'), preview: '/ai/hair_afro.png' },
        { id: 'bald', label: t('influencers.create.aiGenerator.options.hairTypes.bald'), preview: '/ai/hair_bald.png' },
        { id: 'fur', label: t('influencers.create.aiGenerator.options.hairTypes.fur'), preview: '/ai/hair_fur.png' },
        { id: 'long', label: t('influencers.create.aiGenerator.options.hairTypes.long'), preview: '/ai/hair_long.png' },
        { id: 'punk', label: t('influencers.create.aiGenerator.options.hairTypes.punk'), preview: '/ai/hair_punk.png' },
        { id: 'short', label: t('influencers.create.aiGenerator.options.hairTypes.short'), preview: '/ai/hair_short.png' },
        { id: 'spines', label: t('influencers.create.aiGenerator.options.hairTypes.spines'), preview: '/ai/hair_spines.png' },
        { id: 'tentacles', label: t('influencers.create.aiGenerator.options.hairTypes.tentacles'), preview: '/ai/hair_tentacles.png' },
    ],
    ages: [
        { id: 'child', label: t('influencers.create.aiGenerator.options.ages.child'), preview: '/ai/age_child.jpg' },
        { id: 'teen', label: t('influencers.create.aiGenerator.options.ages.teen'), preview: '/ai/age_teen.jpg' },
        { id: 'adult', label: t('influencers.create.aiGenerator.options.ages.adult'), preview: '/ai/age_adult.jpg' },
        { id: 'mature', label: t('influencers.create.aiGenerator.options.ages.mature'), preview: '/ai/age_mature.jpg' },
        { id: 'senior', label: t('influencers.create.aiGenerator.options.ages.senior'), preview: '/ai/age_senior.jpg' }
    ],
    eyeTypes: [
        { id: 'human', label: t('influencers.create.aiGenerator.options.eyeTypes.human'), preview: '/ai/eye_human.jpg' },
        { id: 'reptile', label: t('influencers.create.aiGenerator.options.eyeTypes.reptile'), preview: '/ai/eye_reptile.jpg' },
        { id: 'mechanical', label: t('influencers.create.aiGenerator.options.eyeTypes.mechanical'), preview: '/ai/eye_mechanical.jpg' },
        { id: 'glowing', label: t('influencers.create.aiGenerator.options.eyeTypes.glowing'), preview: '/ai/eye_glowing.jpg' },
        { id: 'blink', label: t('influencers.create.aiGenerator.options.eyeTypes.blink'), preview: '/ai/eye_sub_blink.jpg' },
        { id: 'different color', label: t('influencers.create.aiGenerator.options.eyeTypes.differentColor'), preview: '/ai/eye_sub_diff_color.jpg' },
        { id: 'scarred', label: t('influencers.create.aiGenerator.options.eyeTypes.scarred'), preview: '/ai/eye_sub_scarred.jpg' }
    ]
}));

const initialInfluencerState = () => ({
    name: '',
    description: '',
    traits: [] as string[],
    jobRole: 'Entertainer',
    visual: {
        modelType: 'vrm' as 'vrm' | 'live2d' | 'static' | 'video' | 'aidol',
        modelUrl: '',
        backgroundUrl: '',
        previewVideoUrl: '',
        thumbnailUrl: '',
        nationality: 'vietnamese',
        aidolClips: { 
            idle: '', speaking: '', hype: '', gift_react: '', 
            product: '', checkout: '', dance: '', wave: '' 
        },
        clipPrompts: {
            idle: '', speaking: '', hype: '', gift_react: '', 
            product: '', checkout: '', dance: '', wave: '' 
        } as Record<string, string>,
        auraEnabled: false,
        auraColor: '#3b82f6',
        auraIntensity: 0.5,
        particleType: null as string | null,
        particleDensity: 0.5,
        lightingPreset: 'studio',
        lightingIntensity: 1.0,
        modelConfig: { zoom: 1.0, offset: { x: 0, y: 0 }, rotation: 0, scale: 1.0, idleMotion: '', talkMotion: '' },
        visemes: {} as Record<string, string>
    },

    animationConfig: {
        gestureIntensity: 0.5,
        headTiltRange: 0.5,
        nodIntensity: 0.5
    },
    voiceConfig: { provider: 'gemini', language: 'en-US', voiceId: '', sampleUrl: '' },
    automationSchedule: {
        vod: { enabled: false, frequencyHours: 24 },
        live: { enabled: false, scheduleSlots: [] }
    },
    platformAccountIds: [] as string[],
    directorConfig: {
        autoDirectorEnabled: true,
        autoFX: true,
        autoCamera: true,
        cinematicMode: false,
        autonomyLevel: 0.5
    },
    memory: {
        knowledgeEntries: [] as { title: string; content: string }[],
        backstory: ''
    },
    backgroundMusic: null as any
});

const newInfluencer = ref(initialInfluencerState());

const backgroundPresets = ref([
    { name: t('influencers.create.backgrounds.studio'), url: '/bg/pro-studio.jpg' },
    { name: t('influencers.create.backgrounds.cyberpunk'), url: '/bg/cyberpunk_penthouse.jpg' },
    { name: t('influencers.create.backgrounds.nature'), url: '/bg/zen_garden.jpg' },
    { name: t('influencers.create.backgrounds.abstract'), url: '/bg/neon.jpg' },
    { name: t('influencers.create.backgrounds.solidBlack'), url: '/bg/solid-black.jpg' }
]);

const { speakingVol, stopAnalysis, attachToAudioElement } = useAudioVisualizer();
const { solveLandmarks } = useInfluencerTracking();

const filteredNationalities = computed(() => {
    return aiOptions.value.nationalities.filter(n => n.ethnicity === aiConfig.ethnicity);
});

watch(() => aiConfig.ethnicity, (newEth) => {
    const defaultForEth = aiOptions.value.nationalities.find(n => n.ethnicity === newEth);
    if (defaultForEth) {
        aiConfig.nationality = defaultForEth.id;
    }
});

const previewConfig = ref({
    text: t('influencers.create.tts.defaultTest'),
    loading: false,
    isPlaying: false,
    audio: null as HTMLAudioElement | null
});

const trackingData = ref<any>(null);
const enableTracking = ref(false);
let trackingInterval: any = null;
const videoInput = document.createElement('video');
const influencerViewer = ref<any>(null);

// Audio State for Preview
let musicPlayer: HTMLAudioElement | null = null;
let musicTimeInterval: any = null;
const isPlayingMusic = ref(false);
const audioCurrentTime = ref(0);

// Global State
let audioCtx: AudioContext | null = null;
let audioDestination: MediaStreamAudioDestinationNode | null = null;

// Navigation Logic
const selectSource = (source: 'ai' | 'file') => {
    creationSource.value = source;
    if(source === 'file'){
        activeStep.value = 1;
    }
    else{
        activeStep.value = 0;//stay in AI builder tool
    }
};

const handleNext = async () => {
    if(activeStep.value === 0 && creationSource.value === 'ai' && !newInfluencer.value.visual.modelUrl){
        toast.warning("Please generate an AI KOL video first or upload a file.");
        return;
    }
    // else if(activeStep.value === 0 && creationSource.value === 'ai' && newInfluencer.value.visual.modelUrl){
    //     await handleRemoveBackground();
    // }

    if (activeStep.value < 4) {
        activeStep.value++;
    }
};

const handleBack = () => {
    if (activeStep.value > 0) {
        if (activeStep.value === 1 && props.mode === 'create') {
            activeStep.value = 0;
            creationSource.value = null;
        } else {
            activeStep.value--;
        }
    }
};

const selectedAITags = computed(() => {
    if (aiTab.value === 'prompt') return [aiConfig.customPrompt || t('influencers.create.aiGenerator.prompt')];
    
    const tags: string[] = [];
    const type = aiOptions.value.characterTypes.find(t => t.id === aiConfig.type);
    if (type) tags.push(type.label);
    
    const gender = aiOptions.value.genders.find(g => g.id === aiConfig.gender);
    if (gender) tags.push(gender.label);
    
    const eth = aiOptions.value.ethnicities.find(e => e.id === aiConfig.ethnicity);
    if (eth) tags.push(eth.label);

    const nat = aiOptions.value.nationalities.find(n => n.id === aiConfig.nationality);
    if (nat) tags.push(nat.label);
    
    const age = aiOptions.value.ages.find(a => a.id === aiConfig.age);
    if (age) tags.push(age.label);
    
    return tags;
});

const generateAIdol = async () => {
    loading.value = true;
    try {
        const config = {
            characterType: aiConfig.type,
            gender: aiConfig.gender,
            ethnicity: aiConfig.ethnicity,
            age: aiConfig.age,
            skinType: aiConfig.skinType,
            hairType: aiConfig.hairType,
            eyeColor: aiConfig.eyeColor,
            nationality: aiConfig.nationality,
            eyesType: aiConfig.eyesType,
            customPrompt: aiConfig.customPrompt,
            tags: selectedAITags.value
        };

        newInfluencer.value.visual.nationality = aiConfig.nationality;

        const result = await influencerStore.generateImage(config);
        if (result && result.imageUrl) {
            toast.success(t('influencers.create.aiGenerator.toasts.generateSuccess'));
            aiIdolImage.value = result.imageUrl;
            newInfluencer.value.visual.thumbnailUrl = result.imageUrl;
            if(newInfluencer.value.visual.aidolClips){
                newInfluencer.value.visual.aidolClips.idle = null;
            }
        } else {
            throw new Error("No image URL returned");
        }
    } catch (e: any) {
        console.error('[InfluencerStudio] Generation failed:', e);
        toast.error(t('influencers.create.aiGenerator.toasts.generateFailed'));
    } finally {
        loading.value = false;
    }
};

const fetchVoices = async (provider: string) => {
    loading.value = true;
    try {
        const data = await influencerStore.fetchVoices(provider);
        if (data && Array.isArray(data)) {
            voicesList.value = data;
        }
    } catch (e) {
        console.warn('[VoiceLibrary] Failed to fetch dynamic voices.');
    } finally {
        loading.value = false;
    }
};

const addKnowledge = () => {
    if (!newInfluencer.value.memory.knowledgeEntries) newInfluencer.value.memory.knowledgeEntries = [];
    newInfluencer.value.memory.knowledgeEntries.push({ title: '', content: '' });
};

const handleMusicSelect = (music: any) => {
    newInfluencer.value.backgroundMusic = music;
    toast.success(t('influencers.create.aiGenerator.toasts.musicSynced', { title: music.title }));
    musicSelectionVisible.value = false;
};

const toggleMusicPreview = async () => {
    console.log("toggleMusicPreview");
    if (isPlayingMusic.value) {
        musicPlayer?.pause();
        isPlayingMusic.value = false;
        if (musicTimeInterval) clearInterval(musicTimeInterval);
    } else if (newInfluencer.value.backgroundMusic?.audioUrl || newInfluencer.value.backgroundMusic?.videoId) {
        if (!musicPlayer) {
            musicPlayer = new Audio();
            musicPlayer.crossOrigin = 'anonymous';
            attachToAudioElement(musicPlayer);
            musicPlayer.onended = () => {
                isPlayingMusic.value = false;
                if (musicTimeInterval) clearInterval(musicTimeInterval);
            };
        }
        const musicUrl = await getFileUrl(`/api/media/youtube/stream/${newInfluencer.value.backgroundMusic.videoId}`, {cached: true, refresh: false});
        musicPlayer.src = musicUrl;
        musicPlayer.play();
        isPlayingMusic.value = true;
        audioCurrentTime.value = 0;
        
        musicTimeInterval = setInterval(() => {
            if (musicPlayer) audioCurrentTime.value = musicPlayer.currentTime;
        }, 100);
    }
};

const getAidolPrompt = (state: string) => {
    const gender = aiOptions.value.genders.find(g => g.id === aiConfig.gender)?.label || 'person';
    const eth = aiOptions.value.ethnicities.find(e => e.id === aiConfig.ethnicity)?.label || '';
    const nat = aiOptions.value.nationalities.find(n => n.id === (newInfluencer.value.visual?.nationality || aiConfig.nationality))?.label || '';
    
    // Core character description
    const characterBase = `${nat ? nat.toLowerCase() : eth.toLowerCase()} ${gender.toLowerCase()}`;
    const greenScreenLead = "[CRITICAL: MONOCHROMIC CHROMAKEY GREEN BACKGROUND, PLAIN SOLID GREEN BACKDROP #00FF00]";
    const quality = "studio lighting, high quality video, professional photography";
    const language = nat || "Vietnamese";

    const behaviors: Record<string, string> = {
        idle: "static pose, friendly expression, don't say anything",
        speaking: "mouth moving, talking clearly",
        product: "pushing a shopping cart loaded with a wide range of discounted items—from groceries and consumer goods to apparel, footwear, handbags, perfumes, and smartphones—ready to be presented to customers.",
        checkout: "pointing down",
        hype: "cheering",
        gift_react: "surprised face",
        dance: "singing and dancing movement",
        wave: "waving hand"
    };

    const behavior = behaviors[state] || behaviors.idle;
    
    let basePrompt = "";
    
    // 1. Check for user-defined per-clip custom prompt first
    const customClipPrompt = newInfluencer.value.visual.clipPrompts?.[state];
    if (customClipPrompt && customClipPrompt.trim()) {
        basePrompt = `${greenScreenLead}, ${characterBase}, ${customClipPrompt.trim()}, ${quality}`;
    } else {
        basePrompt = `${greenScreenLead}, ${characterBase}, ${behavior}, ${quality}`;
    }
    
    if (state === 'speaking') {
        const dialogue = "Hello everyone, welcome to my channel!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'product'){
        const dialogue = "This is a great product!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'checkout'){
        const dialogue = "Click the link below to purchase!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'hype'){
        const dialogue = "Go check it out now!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'gift_react'){
        const dialogue = "Wow! Thank you so much!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'dance'){
        const dialogue = "Let's dance together!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    else if(state === 'wave'){
        const dialogue = "Let's wave together!";
        basePrompt += `, say '${dialogue}' exactly in ${language} language`;
    }
    
    return basePrompt + ", NO other background details, PURE GREEN SCREEN ONLY";
};

const generateIdolVideo = async () => {
    const state = 'idle';
    await generateAidolClip(state);
    const video = newInfluencer.value.visual.aidolClips[state];
    if(video){
        newInfluencer.value.visual.modelUrl = video;
        newInfluencer.value.visual.modelType = 'aidol';
    }
}

const copyAidolPrompt = (state: string) => {
    const prompt = getAidolPrompt(state);
    navigator.clipboard.writeText(prompt).then(() => {
        toast.info(t('influencers.create.aidols.clipLibrary.promptCopied', 'Prompt copied! Use tools like Kling, Veo, or Pika to generate.'), {
            description: prompt.substring(0, 100) + '...'
        });
    });
};

const generateAidolClip = async (state: string) => {
    if (!aiIdolImage.value) {
        toast.warning('Please generate an AI avatar image first before generating video clips.');
        return;
    }
    
    loading.value = true;
    generatingClips[state] = true;
    try {
        const prompt = getAidolPrompt(state);
        // Fire & forget to backend to queue the job
        const data = await influencerStore.generateVideo({
            prompt: prompt,
            duration: 8, // 8s for short clips
            aspectRatio: '9:16', // Portrait typical for influencers
            characterImages: [aiIdolImage.value]
        });
        
        toast.success(`Video generation successfully for ${state} state!`);
        // Set the clip value directly to the video url
        if (!newInfluencer.value.visual.aidolClips) {
            newInfluencer.value.visual.aidolClips = { 
                idle: '', speaking: '', hype: '', gift_react: '', 
                product: '', checkout: '', dance: '', wave: '' 
            };
        }
        newInfluencer.value.visual.aidolClips[state] = data.url;
    } catch (e: any) {
        console.error('[InfluencerStudio] Failed to generate clip', e);
        toast.error('Failed to start video generation.');
    } finally {
        generatingClips[state] = false;
        loading.value = false;
    }
};

const triggerClipUpload = (state: string) => {
    activeClipState.value = state;
    clipInput.value?.click();
};

const handleClipSelected = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file || !activeClipState.value) return;
    
    const url = await handleGenericUpload(file);
    if (url) {
        if (!newInfluencer.value.visual.aidolClips) {
            newInfluencer.value.visual.aidolClips = { 
                idle: '', speaking: '', hype: '', gift_react: '', 
                product: '', checkout: '', dance: '', wave: '' 
            };
        }
        newInfluencer.value.visual.aidolClips[activeClipState.value] = url;
        toast.success(t('influencers.create.aidols.clipLibrary.uploadSuccess', { state: activeClipState.value }));
        const video = newInfluencer.value.visual.aidolClips['idle'];
        if(video){
            newInfluencer.value.visual.modelUrl = video;
            newInfluencer.value.visual.modelType = 'aidol';
        }
    }
    activeClipState.value = null;
    if (clipInput.value) clipInput.value.value = '';
};

const getVoiceSampleUrl = async (voiceId: string, provider: string, language: string) => {
    let sampleUrl = "";
    if(voicesList.value.length == 0 || voicesList.value[0].provider != provider){
        await fetchVoices(provider);
    }
    if(provider == "gemini"){
        const voice = voicesList.value.find((v: any) => v.id === voiceId);
        sampleUrl = voice?.audioSampleUrl;
    }
    else if(provider == "google"){
        const voice = voicesList.value.find((v: any) => v.id === voiceId && v.language == language);
        sampleUrl = voice?.audioSampleUrl;
    }
    return sampleUrl;
};

const handleVoicePreview = async (vid?: string) => {
    const voiceId = vid || newInfluencer.value?.voiceConfig?.voiceId;
    const provider = newInfluencer.value?.voiceConfig?.provider || 'gemini';
    const language = newInfluencer.value?.voiceConfig?.language || 'en-US';
    const sampleVoice = newInfluencer.value?.voiceConfig?.sampleUrl;
    if (!voiceId) return;

    if (previewConfig.value.isPlaying && previewConfig.value.audio?.id === voiceId) {
        previewConfig.value.audio.pause();
        previewConfig.value.isPlaying = false;
        return;
    }

    try {
        previewConfig.value.loading = true;
        
        // 1. Check for stored sample URL
        let audioUrl = sampleVoice ? sampleVoice : await getVoiceSampleUrl(voiceId, provider, language);
        
        if (audioUrl) {
           console.log('[InfluencerBuilder] Using stored sample:', audioUrl);
        } else {
            const data = await influencerStore.generateVoicePreview({
                text: t('influencers.create.tts.syncTesting'),
                provider,
                voiceId,
                language
            });
            audioUrl = data?.audioUrl;
        }
        
        if (audioUrl) {
            if (!previewConfig.value.audio) {
                previewConfig.value.audio = new Audio();
                attachToAudioElement(previewConfig.value.audio);
                previewConfig.value.audio.onended = () => {
                   previewConfig.value.isPlaying = false;
                };
            }
            previewConfig.value.audio.src = getFileUrl(audioUrl as any);
            previewConfig.value.audio.id = voiceId; // Store for comparison
            previewConfig.value.audio.play();
            previewConfig.value.isPlaying = true;
        }
    } catch (e) {
        toast.error(t('influencers.create.toasts.voicePreviewFailed'));
    } finally {
        previewConfig.value.loading = false;
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
            toast.success(t('influencers.create.toasts.linkEstablished'));
        } catch (e) {
            toast.error(t('influencers.create.toasts.cameraAccessFailed'));
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
    if (trackingInterval) clearInterval(trackingInterval);
    
    // Phase 40: Optimized for 5 FPS (200ms) to reduce CPU load as requested
    trackingInterval = setInterval(async () => {
        if (!enableTracking.value) return;
        
        const type = newInfluencer.value.visual.modelType;
        if (type !== 'static' && type !== 'video') {
            console.log('[InfluencerStudio] Auto-disabling tracking for non-compatible model type:', type);
            toggleTracking(); // Cleanup and stop
            return;
        }

        try {
            const results = await liveAIEngine.processFrame(videoInput, performance.now());
            trackingData.value = solveLandmarks(results, videoInput);
        } catch (err) {
            console.error('[InfluencerStudio] Tracking loop error:', err);
        }
    }, 200); 
};

// Dynamic Worker Destruction & Model Type Guard
watch(() => newInfluencer.value.visual.modelType, (newType) => {
    const supportsTracking = newType === 'static' || newType === 'video';
    if (!supportsTracking && enableTracking.value) {
        console.log('[InfluencerStudio] Destroying AITracking worker due to model change to:', newType);
        toggleTracking();
        liveAIEngine.close(); // Hard kill worker thread
    }
});

// Watch for visibility to stop tracking
watch(() => props.modelValue, (val) => {
    if (!val && enableTracking.value) {
        onClose();
    }
    if (val && props.mode === 'edit') {
        loadData();
    }
});

const handleGenericUpload = async (file: File): Promise<string | null> => {
    uploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const res = await mediaStore.uploadMedia(formData);
        if (res) {
            return res.key || res.url; 
        }
    } catch (e) {
        toast.error(t('influencers.create.toasts.uploadFailed'));
    } finally {
        uploading.value = false;
    }
    return null;
};

const handleFileUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const isVrm = fileName.endsWith('.vrm');
    const isArchive = fileName.endsWith('.zip') || fileName.endsWith('.rar');
    const isImage = fileName.match(/\.(png|jpg|jpeg|webp)$/);
    const isVideo = fileName.match(/\.(mp4|webm|mov|avi)$/);

    if (isVrm) {
        newInfluencer.value.visual.modelType = 'vrm';
        const url = await handleGenericUpload(file);
        if (url) {
            newInfluencer.value.visual.modelUrl = url;
            toast.success(t('influencers.create.toasts.vrmUploaded'));
        }
    } else if (isArchive) {
        newInfluencer.value.visual.modelType = 'live2d';
        const url = await handleGenericUpload(file);
        if (url) {
            newInfluencer.value.visual.modelUrl = url;
            toast.success(t('influencers.create.toasts.live2dUploaded'));
        }
    } else if (isImage) {
        newInfluencer.value.visual.modelType = 'static';
        const url = await handleGenericUpload(file);
        if (url) {
            newInfluencer.value.visual.modelUrl = url;
            toast.success(t('influencers.create.toasts.avatarUploaded'));
            await handleRemoveBackground();
        }
    } else if (isVideo) {
        newInfluencer.value.visual.modelType = 'video';
        const url = await handleGenericUpload(file);
        if (url) {
            newInfluencer.value.visual.modelUrl = url;
            toast.success(t('influencers.create.toasts.videoUploaded'));
        }
    } else {
        toast.error(t('influencers.create.toasts.unsupportedFormat'));
    }
};

const triggerPortraitUpload = () => {
    console.log('[InfluencerStudio] triggerPortraitUpload called, portraitInput:', portraitInput.value);
    if (!portraitInput.value) {
        console.warn('[InfluencerStudio] portraitInput ref is NULL!');
    }
    portraitInput.value?.click();
};

const handlePortraitSelected = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
        const url = await handleGenericUpload(file);
        if (url) {
            aiIdolImage.value = url;
            newInfluencer.value.visual.thumbnailUrl = url;
            newInfluencer.value.visual.modelType = 'aidol';
            
            toast.success(t('influencers.create.toasts.portraitUploaded', 'Portrait uploaded successfully!'));
        }
    } catch (error) {
        console.error('[InfluencerStudio] Portrait upload failed:', error);
        toast.error(t('influencers.create.toasts.uploadFailed'));
    } finally {
        if (portraitInput.value) portraitInput.value.value = '';
    }
};

const handleBackgroundUpload = async (e: Event | File) => {
    const file = e instanceof File ? e : (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const url = await handleGenericUpload(file);
    if (url) {
        newInfluencer.value.visual.backgroundUrl = url;
        toast.success(t('influencers.create.toasts.backgroundUploaded'));
    }
};

const handleRemoveBackground = async () => {
    if (!newInfluencer.value.visual.modelUrl) {
        toast.warning(t('influencers.create.toasts.uploadAvatarFirst'));
        return;
    }

    loading.value = true;
    isSegmenting.value = true;
    try {
        const url = getFileUrl(newInfluencer.value.visual.modelUrl);
        console.log('[InfluencerStudio] Starting background removal for:', url);
        const result = await backgroundRemoval.removeBackground(url);
        console.log('[InfluencerStudio] Removal complete, uploading result...');
        
        // Convert dataURL to Blob for upload
        const response = await fetch(result.foregroundUrl);
        const blob = await response.blob();
        
        // Upload the segmented result to S3 so it persists
        const s3Url = await handleGenericUpload(new File([blob], `segmented_${Date.now()}.png`, { type: "image/png" }));
        
        if (s3Url) {
            console.log('[InfluencerStudio] Segmented result saved to S3:', s3Url);
            newInfluencer.value.visual.modelUrl = s3Url;
            // if (newInfluencer.value.visual.modelType === 'aidol') {
            //     aiIdolImage.value = s3Url;
            // }
            toast.success(t('influencers.create.toasts.backgroundRemoved'));
        } else {
            console.error('[InfluencerStudio] S3 upload returned no URL');
            toast.error(t('influencers.create.toasts.segmentationFailed'));
        }
    } catch (error: any) {
        console.error('[InfluencerStudio] Background removal failed:', error);
        toast.error(t('influencers.create.toasts.removalFailed', { error: error.message || 'Unknown error' }));
    } finally {
        isSegmenting.value = false;
        loading.value = false;
    }
};

const generatePreview = async () => {
    const voiceId = newInfluencer.value?.voiceConfig?.voiceId;
    const provider = newInfluencer.value?.voiceConfig?.provider || 'gemini';
    const language = newInfluencer.value?.voiceConfig?.language || 'en-US';
    const sampleVoice = newInfluencer.value?.voiceConfig?.sampleUrl;
    if(!voiceId || !provider){
        toast.warning(t('influencers.create.toasts.voiceConfigMissing'));
        return;
    }
    
    if (!influencerViewer.value) {
        console.warn('[InfluencerBuilder] No active viewer to capture from.');
        toast.warning(t('influencers.create.toasts.loadModelFirst'));
        return;
    }

    try {
        previewState.value = 'idle';
        generatingPreview.value = true;
        console.log('[InfluencerBuilder] Starting preview generation...');

        // 1. Capture Thumbnail using wrapper's captureSnapshot
        if (influencerViewer.value.captureSnapshot) {
            console.log('[InfluencerBuilder] Capturing snapshot...');
            const dataUrl = await influencerViewer.value.captureSnapshot();
            if (dataUrl) {
                // Convert dataURL to blob
                const response = await fetch(dataUrl);
                const blob = await response.blob();
                const file = new File([blob], `thumbnail_${Date.now()}.png`, { type: 'image/png' });
                console.log('[InfluencerBuilder] Uploading thumbnail...');
                const url = await handleGenericUpload(file);
                if (url) {
                    newInfluencer.value.visual.thumbnailUrl = url;
                    toast.success(t('influencers.create.toasts.thumbnailGenerated'));
                    console.log('[InfluencerBuilder] Thumbnail URL:', url);
                } else {
                    console.error('[InfluencerBuilder] Thumbnail upload failed');
                }
            } else {
                console.error('[InfluencerBuilder] Snapshot returned null');
            }
        }

        // 2. Capture Preview Video (with TTS Audio)
        console.log('[InfluencerBuilder] Checking video capture capability...');
        if (influencerViewer.value && influencerViewer.value.captureVideo) {
            console.log('[InfluencerBuilder] Starting video capture...');
            // Stop any active analysis to avoid competing for the speakingVol ref
            stopAnalysis();

            
            
            // Generate TTS if not already done or if we need a fresh one
            let audioUrl = sampleVoice ? sampleVoice : await getVoiceSampleUrl(voiceId, provider, language);
            
            if (!audioUrl) {
                 const voiceData = await influencerStore.generateVoicePreview({
                    text: t('influencers.create.tts.voicePreview'),
                    provider: provider || 'gemini',
                    voiceId: voiceId,
                    language: language || 'en-US'
                });
                if (voiceData && voiceData.audioUrl) {
                    audioUrl = voiceData.audioUrl;
                }
            }

            if (audioUrl) {
                console.log('[InfluencerBuilder] Audio URL found, setting up video with audio...');
                const audio = new Audio();
                audio.crossOrigin = 'anonymous'; 
                audio.src = getFileUrl(audioUrl);
                
                await new Promise((resolve) => {
                    audio.onloadedmetadata = resolve;
                });
                
                // Add 800ms buffer for more reliable capture
                const durationMs = (audio.duration || 3) * 1000 + 800;

                // Setup Audio Capture
                if (!audioCtx) audioCtx = new AudioContext();
                if (!audioDestination) audioDestination = audioCtx.createMediaStreamDestination();

                try {
                    if (audioCtx.state === 'suspended') await audioCtx.resume();

                    const audioSource = audioCtx.createMediaElementSource(audio);
                    const analyserNode = audioCtx.createAnalyser();
                    analyserNode.fftSize = 256; // Faster resolution for lip sync
                    
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
                        // Using linear gain (1.8) instead of sqrt for more controlled movement
                        speakingVol.value = Math.min(1.0, rms * 1.8);
                        
                        if (!audio.paused && !audio.ended) {
                            requestAnimationFrame(updateVolume);
                        }
                    };
                    
                    audio.onplay = () => {
                        console.log('[InfluencerStudio] Audio playback started, beginning lip-sync loop');
                        updateVolume();
                    };
                    
                    const audioTrack = audioDestination.stream.getAudioTracks()[0];
                    
                    // Start capture, then play audio with a slight delay
                    const capturePromise = influencerViewer.value.captureVideo(durationMs, audioTrack);
                    
                    setTimeout(() => {
                        audio.play().catch(e => console.error('[InfluencerStudio] Playback failed during capture:', e));
                    }, 300);

                    const blob = await capturePromise;
                    
                    console.log('[InfluencerBuilder] Video capture complete, blob:', blob);
                    // Cleanup audio after capture
                    audio.pause();
                    audio.currentTime = 0;
                    
                    if (blob) {
                        const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                        const url = await handleGenericUpload(file);
                        if (url) {
                            newInfluencer.value.visual.previewVideoUrl = url;
                            toast.success(t('influencers.create.toasts.videoAudioGenerated'));
                        }
                    }
                } catch (e) {
                    console.warn('[InfluencerStudio] Audio setup failed:', e);
                } finally {
                    speakingVol.value = 0;
                }
            } else {
                // Fallback to silent video if TTS fails
                const blob = await influencerViewer.value.captureVideo(3000);
                if (blob) {
                    const file = new File([blob], `preview_${Date.now()}.webm`, { type: 'video/webm' });
                    const url = await handleGenericUpload(file);
                    if (url) {
                        newInfluencer.value.visual.previewVideoUrl = url;
                        toast.success(t('influencers.create.toasts.videoSilentGenerated'));
                    }
                }
            }
        }
        
    } catch (e) {
        console.error('Preview generation failed:', e);
        toast.error(t('influencers.create.toasts.previewFailed'));
    } finally {
        generatingPreview.value = false;
    }
};

const hasVisualContent = computed(() => !!newInfluencer.value.visual.modelUrl);

const loadData = () => {
    const v = props.influencer;
    if (v && props.mode === 'edit') {
        console.log("Editing influencer");
        activeStep.value = 1;
        const base = initialInfluencerState();
        newInfluencer.value = {
            ...base,
            ...v,
            name: v.identity?.name || v.name || '',
            description: v.identity?.description || v.description || '',
            traits: v.identity?.traits || v.traits || [],
            visual: { ...base.visual, ...(v.visual || {}) },
            automationSchedule: { ...base.automationSchedule, ...(v.automationSchedule || {}) },
            directorConfig: { ...base.directorConfig, ...(v.directorConfig || {}) },
            memory: { ...base.memory, ...(v.memory || {}) }
        };
        if (v.meta?.voiceConfig) {
            newInfluencer.value.voiceConfig = { ...newInfluencer.value.voiceConfig, ...v.meta.voiceConfig };
        }

        aiIdolImage.value = newInfluencer.value.visual?.thumbnailUrl;
    }
}
// Lifecycle & Watchers
watch(() => props.influencer, (v) => {
    loadData();
}, { immediate: true });

const handleCreateInfluencer = async () => {
    if (!newInfluencer.value.name) return toast.warning("Name is required");
    loading.value = true;
    try {
        // await influencerStore.fetchInfluencers(); // Refresh store if needed
        await generatePreview();
        const payload = {
            ...newInfluencer.value,
            identity: {
                name: newInfluencer.value.name,
                description: newInfluencer.value.description,
                traits: newInfluencer.value.traits
            },
            meta: { voiceConfig: newInfluencer.value.voiceConfig }
        };

        // Use createInfluencer if it exists, otherwise use what's available
        let data = await influencerStore.fetchInfluencer(newInfluencer.value.name);
        if(!data || !data.entityId){
            return toast.error("Creation failed");
        }

        data = await influencerStore.updateInfluencer(data.entityId, payload);
        // const method = (influencerStore as any).createInfluencer;
        // if (!method) throw new Error("Store method not found");
        // await method(payload);
        toast.success("Influencer Manifested!");
        emit('success');
        emit('update:modelValue', false);
    } catch (e) {
        toast.error("Creation failed");
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const handleUpdateInfluencer = async () => {
    if (!props.influencer?.entityId) return;
    loading.value = true;
    try {
        await generatePreview();
        await influencerStore.updateInfluencer(props.influencer.entityId, {
            ...newInfluencer.value,
            identity: {
                name: newInfluencer.value.name,
                description: newInfluencer.value.description,
                traits: newInfluencer.value.traits
            },
            meta: { voiceConfig: newInfluencer.value.voiceConfig }
        });
        toast.success("Influencer Synchronized!");
        emit('success');
        emit('update:modelValue', false);
    } catch (e) {
        toast.error("Update failed");
    } finally {
        loading.value = false;
    }
};



const onClose = () => {
    stopAnalysis();
    if (enableTracking.value) {
        toggleTracking();
    }

    //destroy model
    const base = initialInfluencerState();
    newInfluencer.value = base;

    //reset step
    activeStep.value = 0;
    creationSource.value = null;

    emit("update:influencer", null);
};

onUnmounted(() => {
    onClose();
    liveAIEngine.close(); // Final cleanup of worker thread
});

onMounted(() => {
    loadData();
});
</script>
<style lang="scss" scoped>
.section-label {
    display: block;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 0.25em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.4);
    margin-bottom: 8px;
}

.upload-dropzone {
    background: rgba(255, 255, 255, 0.03);
    border: 1px dashed rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    padding: 32px;
    text-align: center;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 120px;

    &:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(59, 130, 246, 0.4);
        transform: translateY(-2px);
    }

    &.has-file {
        background: rgba(59, 130, 246, 0.03);
        border-style: solid;
        border-color: rgba(59, 130, 246, 0.2);
    }
}

.soul-glass-input {
    :deep(.el-input__wrapper), :deep(.el-textarea__inner) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 12px;
        padding: 0 16px;
        height: 42px;
        color: #fff;
        transition: all 0.3s;

        &:hover, &.is-focus {
            background: rgba(255, 255, 255, 0.06) !important;
            border-color: rgba(59, 130, 246, 0.4) !important;
        }
    }

    :deep(.el-textarea__inner) {
        font-family: inherit;
        font-size: 11px;
    }
}

.soul-glass-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    color: #fff;
    border-radius: 12px;
    height: 42px;
    display: flex;
    align-items: center;
    transition: all 0.3s;

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(255, 255, 255, 0.2);
    }
}

.soul-action-btn {
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.2);
    color: #60a5fa;
    font-weight: 900;
    letter-spacing: 0.1em;
    border-radius: 20px;
    
    &:hover {
        background: rgba(59, 130, 246, 0.2);
        color: #fff;
    }
}

.soul-initialize-btn {
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: none;
    color: #fff;
    font-weight: 900;
    letter-spacing: 0.2em;
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);
    
    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 15px 40px rgba(59, 130, 246, 0.4);
    }
}

.trait-tag {
    font-size: 9px;
    font-weight: 900;
    padding: 6px 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    transition: all 0.3s;
    color: rgba(255,255,255,0.4);

    &:hover {
        background: rgba(255, 255, 255, 0.08);
        color: rgba(255,255,255,0.8);
    }

    &.active {
        background: rgba(59, 130, 246, 0.1);
        border-color: #3b82f6;
        color: #fff;
    }
}

.voice-card {
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.04);
    border-radius: 20px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
        background: rgba(59, 130, 246, 0.05);
        border-color: rgba(59, 130, 246, 0.2);
        transform: scale(1.02);
    }

    &.active {
        background: rgba(59, 130, 246, 0.1);
        border-color: #3b82f6;
    }
}

.voice-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
    padding: 4px;
}

.voice-preview-btn {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: #fff;
    
    &:hover {
        background: #3b82f6;
        border-color: #3b82f6;
    }
}

.voice-search-input-inner {
    :deep(.el-input__wrapper) {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0;
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
        letter-spacing: 0.1em;
        padding: 6px 12px;
        transition: all 0.3s;

        &:hover {
            color: #fff;
            background: rgba(255, 255, 255, 0.08);
        }
    }

    :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
        background: #3b82f6;
        border-color: #3b82f6;
        color: #fff;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.3);
    }
}

.glass-select-mini {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 8px;
        height: 28px;
    }
    :deep(.el-input__inner) {
        color: #fff !important;
        font-size: 10px;
        font-weight: 700;
    }
}

.soul-neural-test-btn {
    background: rgba(59, 130, 246, 0.1) !important;
    border: 1px solid rgba(59, 130, 246, 0.2) !important;
    color: #60a5fa !important;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    &:hover {
        background: rgba(59, 130, 246, 0.2) !important;
        border-color: rgba(59, 130, 246, 0.4) !important;
        box-shadow: 0 0 15px rgba(59, 130, 246, 0.2);
        transform: translateY(-1px);
    }

    &:active {
        transform: translateY(0);
    }
}

.soul-mini-test-input {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.04) !important;
        box-shadow: none !important;
        border-radius: 10px;
        height: 32px;
        padding-right: 60px;
        transition: all 0.3s;

        &:hover, &.is-focus {
            background: rgba(255, 255, 255, 0.04) !important;
            border-color: rgba(255, 255, 255, 0.1) !important;
        }
    }

    :deep(.el-input__inner) {
        color: rgba(255, 255, 255, 0.8) !important;
        font-size: 10px;
        font-weight: 500;

        &::placeholder {
            color: rgba(255, 255, 255, 0.2);
        }
    }
}

.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 4px;
    }
    &::-webkit-scrollbar-track {
        background: transparent;
    }
    &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
    }
}

:deep(.el-collapse) {
    border: none;
    background: transparent;
}

:deep(.el-slider) {
    --el-slider-main-bg-color: #3b82f6;
    --el-slider-runway-bg-color: rgba(255, 255, 255, 0.05);
    --el-slider-stop-bg-color: transparent;
}

.custom-steps {
    :deep(.el-step__title.is-wait) { color: rgba(255,255,255,0.3); }
    :deep(.el-step__description.is-wait) { color: rgba(255,255,255,0.2); }
    :deep(.el-step__head.is-wait) {
        color: rgba(255,255,255,0.3);
        border-color: rgba(255,255,255,0.1);
    }
    :deep(.el-step__title.is-process) { color: #fff; font-weight: 900; }
    :deep(.el-step__head.is-process) {
        color: #3b82f6; 
        border-color: #3b82f6;
    }
}
.animate-fade-in {
    animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}
.soul-glass-select {
    :deep(.el-input__wrapper) {
        background: rgba(255, 255, 255, 0.03) !important;
        border: 1px solid rgba(255, 255, 255, 0.05) !important;
        box-shadow: none !important;
        border-radius: 12px;
        height: 42px;
    }
    :deep(.el-input__inner) {
        color: #fff !important;
    }
}
@keyframes pulse-soft {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
}

.video-card-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at center, rgba(168, 85, 247, 0.1) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.4s ease;
}

.group:hover .video-card-glow {
    opacity: 1;
}

.group {
    transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
}

.group:hover {
    transform: translateY(-4px);
    border-color: rgba(168, 85, 247, 0.3);
    box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.5);
}

.soul-mini-prompt-input {
    :deep(.el-textarea__inner) {
        background: rgba(255, 255, 255, 0.02) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        box-shadow: none !important;
        border-radius: 12px !important;
        color: rgba(255,255,255,0.7) !important;
        font-size: 11px !important;
        padding: 8px 12px !important;
        resize: none !important;
        transition: all 0.25s ease;
        
        &::placeholder {
            color: rgba(255,255,255,0.2) !important;
            font-style: italic;
        }
        &:focus {
            border-color: rgba(6, 182, 212, 0.3) !important;
            background: rgba(255, 255, 255, 0.04) !important;
            box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.08) inset !important;
        }
    }
}
</style>