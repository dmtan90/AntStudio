<template>
  <div :class="[inline ? 'w-full h-full' : 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4']">
    <div :class="['w-full bg-[#121212] overflow-hidden flex flex-col', 
                  inline ? 'h-full bg-transparent' : 'max-w-4xl border border-white/10 rounded-2xl shadow-2xl max-h-[90vh]']">
      <!-- Header -->
      <div v-if="!inline" class="sticky top-0 z-10 p-6 border-b border-white/10 flex items-center justify-between bg-black/80 backdrop-blur-md bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <div>
          <h2 class="text-2xl font-bold text-white flex items-center gap-2">
            <span class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm">{{ $t('saleWizard.badge') }}</span>
            {{ $t('saleWizard.title') }}
          </h2>
          <p class="text-white/40 text-sm mt-1">
            {{ $t('saleWizard.step', { 
              step: currentStep + 1, 
              name: currentStep === 0 ? $t('saleWizard.steps.agent') :
                    currentStep === 1 ? $t('saleWizard.steps.product') : 
                    currentStep === 2 ? $t('saleWizard.steps.video') :
                    currentStep === 3 ? $t('saleWizard.steps.script') :
                    currentStep === 4 ? $t('saleWizard.steps.config') : 
                    $t('saleWizard.steps.review') 
            }) }}
          </p>
        </div>
        <el-button @click="emit('close')" circle plain bg icon="Close" />
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <!-- Step 0: AI Agents -->
        <div v-if="currentStep === 0" class="space-y-6">
            <div class="flex flex-col gap-4">
                <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                    <div class="flex items-center gap-3">
                        <div>
                            <div class="text-white font-medium">{{ $t('saleWizard.agents.title') }}</div>
                            <div class="text-xs text-white/40">{{ $t('saleWizard.agents.subtitle') }}</div>
                        </div>
                    </div>
                </div>
                <div v-loading="loading" class="w-full min-h-[100px] overflow-y-auto pr-2 custom-scrollbar">
                    <div v-if="personas.length === 0" class="flex flex-col items-center justify-center h-full text-white/20 border border-dashed border-white/5 rounded-[2rem]">
                        <Robot theme="outline" size="48" class="mb-4" />
                        <p class="text-sm font-bold uppercase tracking-widest">{{ $t('saleWizard.agents.empty') }}</p>
                        <p class="text-[10px] uppercase">{{ $t('saleWizard.agents.emptySub') }}</p>
                    </div>
                    <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    <div v-for="persona in personas" :key="persona.uuid"
                        class="persona-card group relative flex flex-col overflow-hidden rounded-[2rem] border cursor-pointer transition-all duration-500"
                        :class="selectedPersonaUuids.includes(persona.uuid) 
                        ? 'border-blue-500/60 shadow-[0_0_40px_rgba(59,130,246,0.3)] scale-[1.03]' 
                        : 'border-white/5 hover:border-white/20'"
                        @click="togglePersona(persona)">
                        <div class="relative aspect-[4/5] overflow-hidden bg-[#0f0f1a]">
                            <el-image
                                :src="getFileUrl(persona.visual?.thumbnailUrl || persona.visual?.modelUrl || persona.avatarUrl)"
                                class="h-full w-full transition-transform duration-700 group-hover:scale-110"
                                fit="cover">
                                <template #error>
                                    <div class="flex h-full w-full items-center justify-center bg-white/5">
                                        <Robot theme="outline" size="32" class="text-white/10" />
                                    </div>
                                </template>
                            </el-image>
                            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
                        
                            <div v-if="selectedPersonaUuids.includes(persona.uuid)" 
                                class="absolute top-3 right-3 z-10 h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center border-2 border-white shadow-lg">
                                <CheckOne theme="outline" size="12" fill="#fff" />
                            </div>
                            </div>
                            <div class="p-4 bg-black/40 backdrop-blur-xl border-t border-white/5">
                                <h4 class="text-xs font-black text-white line-clamp-1 uppercase">{{ persona.name }}</h4>
                                <p class="text-[9px] text-white/40 font-bold tracking-widest">{{ persona.identity?.role || 'AI Agent' }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <!-- Step 1: Products -->
        <div v-if="currentStep === 1" class="space-y-6">
            <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <el-switch v-model="queueMode" active-value="auto" inactive-value="manual" />
                    <div>
                        <div class="text-white font-medium">{{ $t('saleWizard.products.autoMode') }}</div>
                        <div class="text-xs text-white/40">{{ $t('saleWizard.products.autoModeDesc') }}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 ">
                    <el-input v-model="productSearch" :placeholder="$t('saleWizard.products.search')" class="studio-search flex-1">
                        <template #prefix><Search theme="outline" size="14" /></template>
                    </el-input>
                </div>
            </div>

            <!-- <div class="flex flex-col gap-4">
                <div class="p-4 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                        <div class="text-white font-medium">Auto (Smart) Mode</div>
                        <div class="text-xs text-white/40">Automatically select and rank products by buyer intent</div>
                    </div>
                    <el-switch v-model="queueMode" active-value="auto" inactive-value="manual" />
                </div>

                <div class="flex items-center gap-4">
                    <el-input v-model="productSearch" placeholder="Search products..." class="studio-search flex-1">
                        <template #prefix><Search theme="outline" size="14" /></template>
                    </el-input>
                </div>
            </div> -->

            <div class="grid min-h-[100px] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 min-h-[340px]">
                <div v-for="product in paginatedProducts" :key="product._id"
                     @click="toggleProduct(product._id)"
                     :class="['p-3 rounded-xl border transition-all flex flex-col ', 
                              selectedProductIds.includes(product._id) ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 bg-white/5 hover:border-white/20',
                              queueMode === 'auto' ? 'cursor-default grayscale-[0.5]' : 'cursor-pointer']">
                    <div class="relative">
                        <img :src="getFileUrl(product.image)" class="w-full aspect-square object-cover rounded-lg mb-2" />
                        <div v-if="queueMode === 'auto'" class="absolute top-2 right-2 bg-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded shadow-lg">
                            INTENT: {{ product.intentScore || 0 }}
                        </div>
                    </div>
                    <div class="text-sm font-medium text-white truncate">{{ product.name }}</div>
                    <div class="mt-auto flex items-center justify-between">
                        <div class="text-xs text-white/40">{{ product.price }} {{ product.currency }}</div>
                        <CheckOne v-if="selectedProductIds.includes(product._id)" theme="filled" size="16" class="text-blue-500" />
                    </div>
                </div>
                <div v-if="filteredProducts.length === 0" class="col-span-full flex flex-col items-center justify-center py-12 text-white/20">
                    <Search theme="outline" size="32" class="mb-2" />
                    <p>{{ $t('saleWizard.products.noProducts') }}</p>
                </div>
            </div>

            <!-- Pagination -->
            <div v-if="totalPages > 1" class="flex items-center justify-center gap-2 pt-2">
                <el-button v-for="p in totalPages" :key="p" 
                        @click="currentPage = p"
                        :type="currentPage === p ? 'primary' : ''" round text bg
                        :disabled="currentPage === p">
                    {{ p }}
                </el-button>
            </div>
        </div>

        <!-- Step 3: Videos -->
        <div v-if="currentStep === 2" class="space-y-6">
            <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div>
                        <div class="text-white font-medium">{{ $t('saleWizard.videos.language') }}</div>
                        <div class="text-xs text-white/40">{{ $t('saleWizard.videos.languageDesc') }}</div>
                    </div>
                    <el-select v-model="selectedLanguage" size="small" class="studio-select w-48" popper-class="glass-dropdown" filterable>
                         <el-option v-for="lang in SUPPORTED_LANGUAGES" :key="lang.value" :label="lang.label" :value="lang.value" />
                    </el-select>
                </div>
                <div class="flex items-center gap-3 ">
                    <el-button @click="generateVideos()" :disabled="loading" type="primary"
                        plain round icon="MagicStick" :loading="loading">
                    {{ loading ? $t('saleWizard.videos.generating') : $t('saleWizard.videos.generate') }}
                    </el-button>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 min-h-[100px]">
                <div v-for="pid in selectedProductIds" :key="pid" class="p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col gap-3 relative">
                    <!-- Influencer Selector Overlay -->
                    <template v-if="selectedAgents.length == 1">
                        <div class="absolute top-2 right-2 z-30">
                            <el-avatar :size="32" :src="getFileUrl(selectedAgents.find(i => i.entityId === assignmentMap[pid])?.visual?.thumbnailUrl)" shape="circle">
                                {{ selectedAgents.find(i => i.entityId === assignmentMap[pid])?.identity?.name?.[0] }}
                            </el-avatar>
                        </div>
                    </template>
                    <div v-else class="absolute top-2 right-2 z-20">
                        <el-dropdown trigger="click" @command="(id: string) => handleAssignmentChange(pid, id)">
                            <el-tooltip :content="getInfluencerByProduct(pid)?.identity?.name || 'No assigned'" placement="top">
                                <el-avatar :size="32" :src="getFileUrl(getInfluencerByProduct(pid)?.visual?.thumbnailUrl) || ''" shape="circle">
                                    {{ getInfluencerByProduct(pid).identity?.name?.[0] || 'N/A' }}
                                </el-avatar>
                            </el-tooltip>
                            <template #dropdown>
                                <el-dropdown-menu>
                                    <el-dropdown-item v-for="inf in selectedAgents" :key="inf.entityId" :command="inf.entityId" :active="assignmentMap[pid] === inf.entityId">
                                        <div class="flex items-center gap-2">
                                            <el-avatar :size="20" :src="inf.visual?.thumbnailUrl" />
                                            <span>{{ inf.identity.name }}</span>
                                        </div>
                                    </el-dropdown-item>
                                </el-dropdown-menu>
                            </template>
                        </el-dropdown>
                    </div>

                    <div class="flex items-center gap-3">
                         <img :src="getFileUrl(availableProducts.find(p => p._id === pid)?.image)" class="w-10 h-10 rounded-lg object-cover" />
                         <div class="flex-1 overflow-hidden pr-20">
                             <div class="text-white text-sm font-bold truncate">{{ availableProducts.find(p => p._id === pid)?.name }}</div>
                             <div class="text-[10px] text-white/40">ID: {{ pid.slice(-6) }}</div>
                         </div>
                    </div>
                    
                    <div class="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center text-white/20 text-xs text-center relative border border-white/5">
                        <video v-if="getPreviewUrl(pid)" :src="getPreviewUrl(pid)" controls class="w-full h-full object-contain"></video>
                        <div v-else-if="loading && (!videoJobs[pid] || videoJobs[pid]?.status === 'generating')" class="flex flex-col items-center gap-2">
                            <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent animate-spin rounded-full"></div>
                            <span>{{ $t('saleWizard.videos.generating') }}</span>
                        </div>
                        <div v-else class="flex flex-col items-center gap-2 text-white/20">
                            <PlayOne theme="outline" size="24" />
                            <span>{{ $t('saleWizard.videos.awaiting') }}</span>
                        </div>
                    </div>
                    
                    <div class="flex flex-col gap-2">
                        <div class="flex gap-0">
                            <el-button @click="generateVideos(pid)" :icon="Refresh" :loading="loading" plain round>
                                {{ $t('saleWizard.videos.generateVideo') }}
                            </el-button>
                            <el-button @click="copyPrompt(pid)" :icon="Copy" plain round>
                                {{ $t('saleWizard.videos.copyPrompt') }}
                            </el-button>
                            <el-button @click="videoInputs[pid]?.click()" :icon="Upload" plain round>
                                {{ $t('saleWizard.videos.upload') }}
                            </el-button>
                            <input type="file" :ref="el => setVideoInput(el, pid)" class="hidden" accept="video/*" @change="handleLocalUpload('video', pid, $event)" />
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 4: Script -->
        <div v-if="currentStep === 3" class="space-y-6">
            <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div>
                        <div class="text-white font-medium">{{ $t('saleWizard.script.title') }}</div>
                        <div class="text-xs text-white/40">{{ $t('saleWizard.script.subtitle') }}</div>
                    </div>
                </div>
                <div class="flex items-center gap-3 ">
                    <el-button @click="generateScript" 
                        :icon="Refresh" :loading="loading"
                        plain round bg type="primary">
                        {{ $t('saleWizard.script.generate') }}
                    </el-button>
                </div>
            </div>
            <el-empty v-if="orchestrationScript.length === 0" :description="$t('saleWizard.script.emptyDesc')">
                <el-button @click="generateScript" 
                    :icon="Magic" :loading="loading"
                    plain round bg type="primary">
                    {{ $t('saleWizard.script.generateStoryboard') }}
                </el-button>
            </el-empty>
            <div v-else class="grid grid-cols-1 min-h-[100px] md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div v-for="(line, idx) in orchestrationScript" :key="idx" 
                     class="group relative bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-blue-500/30 transition-all shadow-xl flex flex-col">
                    
                    <!-- Post Header -->
                    <div class="flex items-center justify-between px-4 py-3 bg-white/2 border-b border-white/5">
                        <div class="flex items-center gap-3">
                            <el-avatar :size="36" 
                                :src="getFileUrl(selectedAgents.find(i => i.entityId === line.speaker)?.visual?.thumbnailUrl)" 
                            />
                            <div class="flex flex-col">
                                <span class="text-[11px] font-bold text-white leading-tight">
                                    #{{ idx + 1 }} | {{ selectedAgents.find(i => i.entityId === line.speaker)?.identity?.name || 'AI Assistant' }}
                                </span>
                                <div class="flex items-center gap-2 mt-0.5">
                                    <el-tag v-if="line.gesture" size="small" round>
                                        {{ line.gesture }}
                                    </el-tag>
                                    <el-tag size="small" plain round>
                                        {{ line.type && availableProducts.find(p => p._id === line.type) ? 'showcase' : (line.type ? line.type : 'Dialogue') }}
                                    </el-tag>
                                    <!-- <span class="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[8px] font-black uppercase tracking-widest leading-none">
                                        {{ line.type ? (availableProducts.find(p => p._id === line.type)?.name || line.type) : 'Dialogue' }}
                                    </span> -->
                                    <!-- <span v-if="line.gesture" class="text-[9px] text-white/30 flex items-center gap-1">
                                        <component :is="'Hands'" theme="outline" size="10" />
                                        {{ line.gesture }} -->
                                    <!-- </span> -->
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <el-button :icon="DeleteFive" circle plain type="danger"
                                @click="orchestrationScript.splice(idx, 1)" >
                            </el-button>
                        </div>
                    </div>                    <!-- Post Body (Dialogue) -->
                    <div class="p-4 flex-1">
                        <video :src="storyboardVideo(line.speaker, line.type, line.productId)" controls class="w-full aspect-[16/9] object-contain"></video>
                        <textarea v-model="line.text" 
                                  rows="3"
                                  class="w-full bg-transparent border-none focus:ring-0 text-sm text-white/90 leading-relaxed p-0 resize-none hover:text-white transition-colors custom-scrollbar"
                                  :placeholder="$t('saleWizard.script.placeholder')"></textarea>
                    </div>

                    <!-- Post Footer (Product Association) -->
                    <div v-if="line.productId" class="px-4 py-2 flex items-center justify-between">
                        <el-tag size="small" type="primary" round>
                            {{ availableProducts.find(p => p._id === line.productId)?.name || 'Linked Product' }}
                        </el-tag>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 5: Config -->
        <div v-if="currentStep === 4" class="space-y-6">
            <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div>
                        <div class="text-white font-medium">{{ $t('saleWizard.config.title') }}</div>
                        <div class="text-xs text-white/40">{{ $t('saleWizard.config.subtitle') }}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-8 min-h-[100px]">
                <!-- Left Column: Platforms & Ratio & Overlays -->
                <div class="space-y-6">
                    <div class="space-y-3">
                        <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">{{ $t('saleWizard.config.targetPlatforms') }}</label>
                        <div class="flex flex-col gap-2">
                             <div v-for="acc in platformStore.accounts" :key="acc._id"
                                class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all"
                                :class="configState.platforms.includes(acc._id) ? 'bg-blue-600/20 border-blue-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'"
                                @click="togglePlatform(acc._id)">
                                <div class="flex items-center gap-3">
                                    <!-- Platform icon by type -->
                                    <div class="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black"
                                         :class="{
                                           'bg-red-600': acc.platform === 'youtube',
                                           'bg-blue-700': acc.platform === 'facebook',
                                           'bg-black border border-white/20': acc.platform === 'tiktok',
                                           'bg-purple-600': acc.platform === 'twitch',
                                           'bg-yellow-500 text-black': acc.platform === 'ant-media',
                                           'bg-white/10': acc.platform === 'custom-rtmp'
                                         }">
                                        <span>{{ acc.platform === 'youtube' ? '▶' : acc.platform === 'facebook' ? 'f' : acc.platform === 'tiktok' ? '♪' : acc.platform === 'ant-media' ? 'AMS' : 'RTMP' }}</span>
                                    </div>
                                    <div class="flex flex-col">
                                        <span class="text-xs font-bold text-white">{{ acc.accountName }}</span>
                                        <span class="text-[10px] text-white/40 uppercase">{{ acc.platform }}</span>
                                    </div>
                                </div>
                                <div class="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center" :class="configState.platforms.includes(acc._id) ? 'bg-blue-600 border-transparent' : ''">
                                    <CheckOne v-if="configState.platforms.includes(acc._id)" theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                            <div v-if="platformStore.accounts.length === 0" class="text-xs text-white/20 p-4 border border-dashed border-white/10 rounded-xl text-center">{{ $t('saleWizard.config.noAccounts') }}</div>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">{{ $t('saleWizard.config.frameRatio') }}</label>
                        <div class="flex gap-2">
                            <el-button v-for="r in ['16:9', '9:16']" :key="r" size="large"
                                :type="configState.ratio === r ? 'primary' : ''"
                                :disabled="configState.ratio === r" plain round
                                @click="configState.ratio = r as '16:9' | '9:16'" class="gap-1">
                                <span :class="r === '16:9' ? 'w-5 h-3' : 'w-3 h-5'" class="border border-current rounded-sm"></span>
                                {{ r === '16:9' ? $t('saleWizard.config.landscape') : $t('saleWizard.config.portrait') }}
                            </el-button>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Background & Music -->
                <div class="space-y-6">
                    <!-- Background Selector -->
                    <div class="space-y-3">
                        <div class="flex justify-between items-center">
                            <label class="text-white font-bold text-xs uppercase tracking-wider opacity-50">{{ $t('saleWizard.config.background') }}</label>
                            <div class="flex gap-1">
                                <el-input v-model="configState.bgSearch" :placeholder="$t('saleWizard.config.searchBg')" size="small" class="w-32 studio-search" @keyup.enter="searchBackgrounds">
                                    <template #suffix><Search theme="outline" size="12" class="cursor-pointer" @click="searchBackgrounds" /></template>
                                </el-input>
                            </div>
                        </div>
                        <div class="grid grid-cols-4 gap-2">
                            <!-- Local Upload -->
                             <div class="aspect-video rounded-lg overflow-hidden border-2 border-dashed border-white/10 cursor-pointer hover:border-blue-500/50 transition-all flex flex-col items-center justify-center gap-1 bg-white/5"
                                  @click="bgInput?.click()">
                                <Upload theme="outline" size="16" class="text-white/40" />
                                <span class="text-[8px] text-white/40 uppercase font-bold">{{ $t('saleWizard.videos.upload') }}</span>
                                <input type="file" ref="bgInput" class="hidden" accept="image/*" @change="handleLocalUpload('bg', undefined, $event)" />
                            </div>
                            <!-- Presets -->
                            <div v-for="bg in studioStore.backgroundAssets.slice(0, 3)" :key="bg.id"
                                class="aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative group"
                                :class="configState.bgId === bg.id ? 'border-blue-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'"
                                @click="configState.bgId = bg.id">
                                <img :src="getFileUrl(bg.thumbnail)" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100" v-if="configState.bgId !== bg.id">
                                    <Pic theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                            <!-- Search Results -->
                            <div v-for="photo in searchResults.backgrounds" :key="photo.id"
                                class="aspect-video rounded-lg overflow-hidden border-2 cursor-pointer transition-all relative group"
                                :class="configState.bgId === getFileUrl(photo.details.src) ? 'border-blue-500 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'"
                                @click="configState.bgId = getFileUrl(photo.details.src)">
                                <img :src="getFileUrl(photo.preview)" class="w-full h-full object-cover" />
                                <div class="absolute inset-0 bg-blue-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100" v-if="configState.bgId !== photo.details.src">
                                    <Search theme="outline" size="14" class="text-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Step 6: Review -->
        <div v-if="currentStep === 5" class="space-y-6">
            <div class="flex items-center gap-4 justify-between p-4 bg-white/5 rounded-xl border border-white/10 mb-4">
                <div class="flex items-center gap-3">
                    <div>
                        <div class="text-white font-medium">{{ $t('saleWizard.review.ready') }}</div>
                        <div class="text-xs text-white/40">{{ $t('saleWizard.review.readyDesc', { products: selectedProductIds.length, agents: selectedAgents.length }) }}</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-4 min-h-[100px]">
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">{{ $t('saleWizard.review.selectedProducts') }}</div>
                    <div class="text-xl font-bold text-white">{{ selectedProductIds.length }}</div>
                </div>
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">{{ $t('saleWizard.review.language') }}</div>
                    <div class="text-xl font-bold text-white">{{ SUPPORTED_LANGUAGES.find(l => l.value === selectedLanguage)?.label }}</div>
                </div>
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">{{ $t('saleWizard.review.aspectRatio') }}</div>
                    <div class="text-xl font-bold text-white">{{ configState.ratio }}</div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">{{ $t('saleWizard.review.targetPlatforms') }}</div>
                    <div class="flex flex-wrap gap-2">
                        <div v-for="aid in configState.platforms" :key="aid" 
                            class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/30">
                            <div class="w-4 h-4 rounded flex items-center justify-center text-[8px] font-black"
                                :class="{
                                'bg-red-600': platformStore.accounts.find(a => a._id === aid)?.platform === 'youtube',
                                'bg-blue-700': platformStore.accounts.find(a => a._id === aid)?.platform === 'facebook',
                                'bg-yellow-500 text-black': platformStore.accounts.find(a => a._id === aid)?.platform === 'ant-media',
                                'bg-white/10': !['youtube','facebook'].includes(platformStore.accounts.find(a => a._id === aid)?.platform)
                                }">▶</div>
                            <span class="text-xs font-bold text-white">{{ platformStore.accounts.find(a => a._id === aid)?.accountName || aid }}</span>
                        </div>
                        <div v-if="configState.platforms.length === 0" class="text-xs text-white/20 italic">{{ $t('saleWizard.review.noPlatforms') }}</div>
                    </div>
                </div>
                <div class="p-4 bg-white/5 rounded-xl border border-white/10">
                    <div class="text-[10px] text-white/40 uppercase font-bold mb-2">{{ $t('saleWizard.review.aiAgents') }}</div>
                    <div class="flex -space-x-2">
                        <el-avatar v-for="inf in selectedAgents" :key="inf.entityId" :src="getFileUrl(inf.visual?.thumbnailUrl)" class="border-2 border-black" />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-6 border-t border-white/10 flex items-center justify-between bg-black/40">
        <el-button v-if="currentStep > 0" size="large"
            @click="prevStep" :icon="ArrowLeft" round>
            {{ $t('saleWizard.buttons.back') }}
        </el-button>
        <div v-else></div>
        
        <el-button v-if="currentStep < 5" size="large" 
            type="primary" plain round :disabled="!nextState"
            @click="nextStep">
            {{ $t('saleWizard.buttons.next') }}
            <el-icon class="el-icon--right"><ArrowRight /></el-icon>
        </el-button>
        
        <el-button v-else size="large" type="danger" round icon="VideoCamera"
            @click="startLive" 
            :disabled="!configState.platforms || configState.platforms.length == 0" >
            {{ $t('saleWizard.buttons.goLive') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue';
import { useI18n } from 'vue-i18n';
import { useStudioStore, type Product } from '@/stores/studio';
import { useMediaStore } from '@/stores/media';
import api, { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { Search, Music, Pic, Config, CheckOne, Copy, 
    FileTextOne, PlayOne, Loading as LoadingIcon, 
    Refresh, Plus, Upload, DeleteFive, EditTwo, Robot,
    VideoTwo, Hands, LinkOne, Magic, ArrowLeft, ArrowRight
} from '@icon-park/vue-next';
import { usePlatformStore } from '@/stores/platform';
import { useInfluencerStore } from '@/stores/influencer';
import { useMarketplaceStore } from '@/stores/marketplace';
import { SUPPORTED_LANGUAGES } from '@/constants/google_voices';
// import { ArrowLeft, ArrowRight } from 'lucide-vue-next';
import { syntheticGuestManager } from '@/utils/ai/SyntheticGuestManager';

const props = defineProps<{
//   activeInfluencers: any[];
  inline?: boolean;
}>();

const emit = defineEmits(['close', 'complete']);

const { t } = useI18n();
const studioStore = useStudioStore();
const mediaStore = useMediaStore();
const platformStore = usePlatformStore();
const influencerStore = useInfluencerStore();
const productStore = useMarketplaceStore();
const currentStep = ref(0);
const loading = ref(false);

const bgInput = ref<HTMLInputElement | null>(null);
const musicInput = ref<HTMLInputElement | null>(null);
const videoInputs = ref<Record<string, HTMLInputElement>>({});

function setVideoInput(el: any, pid: string) {
    if (el) videoInputs.value[pid] = el;
}
const MAX_AI_AGENTS = 1;
// Step 1: Product Selection
const personas = ref<any[]>([]);
const selectedPersonaUuids = ref<string[]>([]);
const selectedAgents = ref<any[]>([]);
const availableProducts = ref<Product[]>([]);
const selectedProductIds = ref<string[]>([]);
const queueMode = ref<'manual' | 'auto'>('manual');
const productSearch = ref('');
const currentPage = ref(1);
const pageSize = ref(10);
const selectedLanguage = ref(studioStore.visualSettings?.language || selectedAgents.value[0]?.meta?.voiceConfig?.language || "en-US");

const filteredProducts = computed(() => {
    let list = [...availableProducts.value];
    
    // Search
    if (productSearch.value) {
        const q = productSearch.value.toLowerCase();
        list = list.filter(p => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q));
    }
    
    // Smart Auto Sort
    if (queueMode.value === 'auto') {
        list.sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));
    }
    
    return list;
});

const paginatedProducts = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredProducts.value.slice(start, start + pageSize.value);
});

const nextState = computed(() => {
    let active = false;
    if(currentStep.value == 0){//select AI agent
        if(selectedPersonaUuids.value.length > 0){
            active = true;
        }
    }
    else if(currentStep.value == 1){//select products
        if(queueMode.value == 'auto' || selectedProductIds.value.length > 0){
            active = true;
        }
    }
    else if(currentStep.value == 4){//select platforms
        if(configState.platforms.length > 0){
            active = true;
        }
    }
    else{
        active = true;
    }
    return active;
});

const totalPages = computed(() => Math.ceil(filteredProducts.value.length / pageSize.value));

// Watch queueMode for Smart Auto
watch(queueMode, (newMode) => {
    if (newMode === 'auto') {
        selectedProductIds.value = availableProducts.value.map(p => p._id);
    }
    else{
        selectedProductIds.value = [];
    }
});

function toggleProduct(pid: string) {
    if (queueMode.value === 'auto') return; // Disabled in auto mode
    
    if (selectedProductIds.value.includes(pid)) {
        selectedProductIds.value = selectedProductIds.value.filter(id => id !== pid);
    } else {
        selectedProductIds.value.push(pid);
    }
}

// Step 2: Assignment (Merged into Step 3 logic)
const assignmentMap = ref<Record<string, string>>({}); // productId -> influencerId

// Step 3: AI Video Prep
const videoJobs = ref<Record<string, { jobId: string, status: string, url?: string }>>({});

// Step 4: Script Preview
const orchestrationScript = ref<any[]>([]);

// Step 5: Configuration
const configState = reactive({
  platforms: [] as string[],
  ratio: '16:9' as '16:9' | '9:16',
  bgId: 'studio',
  bgmId: 'none',
  bgmTitle: 'None',
  showLowerThird: true,
  showTicker: true,
  showChat: true,
  bgSearch: '',
  bgmSearch: ''
});

const searchResults = reactive({
    backgrounds: [] as any[],
    music: [] as any[],
    searchingBg: false,
    searchingMusic: false,
    searchingVideo: false,
    videos: {} as Record<string, any[]>
});

async function searchBackgrounds() {
    if (!configState.bgSearch) return;
    searchResults.searchingBg = true;
    try {
        const res = await api.get('/media/pexels/images', { params: { query: configState.bgSearch, per_page: 8 } });
        searchResults.backgrounds = res.data.data?.photos || res.data.photos || [];
    } catch (e) {
        toast.error('Failed to search backgrounds');
    } finally {
        searchResults.searchingBg = false;
    }
}

async function searchMusic() {
    if (!configState.bgmSearch) return;
    searchResults.searchingMusic = true;
    try {
        const res = await mediaStore.searchYouTubeMusic({ 
            query: configState.bgmSearch, 
            preferCovers: false, 
            language: 'en', 
            maxResults: 8 
        });
        searchResults.music = res.videos || [];
    } catch (e) {
        toast.error('Failed to search music');
    } finally {
        searchResults.searchingMusic = false;
    }
}

const videoSearchQueries = ref<Record<string, string>>({});

async function searchStockVideos(pid: string) {
    const query = videoSearchQueries.value[pid];
    if (!query) return;
    
    searchResults.searchingVideo = true;
    try {
        const res = await api.get('/media/pexels/videos', { params: { query, per_page: 8 } });
        searchResults.videos[pid] = res.data.data?.photos || res.data.photos || [];
    } catch (e) {
        toast.error('Failed to search videos');
    } finally {
        searchResults.searchingVideo = false;
    }
}

function selectStockVideo(pid: string, video: any) {
    videoJobs.value[pid] = { 
        jobId: `stock-${video.id}`, 
        status: 'existing', 
        url: video.details.src 
    };
    searchResults.videos[pid] = []; // Clear results after selection
    toast.success('Stock video selected');
}

function selectBgm(video: any) {
    configState.bgmId = video.videoId;
    configState.bgmTitle = video.title;
    toast.success(`Music Selected: ${video.title}`);
}

onMounted(async () => {
    try {
        loading.value = true;
        // Apply Context
        studioStore.applyContextPreset('sales');
        
        // fetch AI Agents
        await syntheticGuestManager.syncLibrary();
        personas.value = syntheticGuestManager.getPersonaLibrary();
        
        const data = await productStore.fetchProducts();
        //const res = await api.get('/commerce/products');
        availableProducts.value = data;

        // Initialize Auto Mode if default
        if (queueMode.value === 'auto') {
            selectedProductIds.value = availableProducts.value.map(p => p._id);
        }

        // Load platforms
        await platformStore.fetchAccounts();
    } catch (e) {
        toast.error('Failed to initialize wizard');
    }
    loading.value = false;
});

const preStep2 = async () => {
    loading.value = true;
    try {
        // Auto assignment if only 1 influencer
        if (selectedAgents.value.length === 1) {
            selectedProductIds.value.forEach(pid => {
                assignmentMap.value[pid] = selectedAgents.value[0].entityId;
            });
        }

        // 1. First, check local props (personas already have aidolClips from syncLibrary)
        selectedAgents.value.forEach(persona => {
            const clips = persona.visual?.aidolClips || {};
            selectedProductIds.value.forEach(pid => {
                const videoUrl = clips[pid];
                if (videoUrl) {
                    if (!videoJobs.value[pid] || assignmentMap.value[pid] === persona.entityId) {
                        videoJobs.value[pid] = { 
                            jobId: 'existing', 
                            status: 'existing', 
                            url: videoUrl 
                        };
                        if (!assignmentMap.value[pid]) assignmentMap.value[pid] = persona.entityId;
                    }
                }
            });
        });

        // 2. Fetch from API as a secondary check (for newly generated clips in other sessions)
        const influencerIds = selectedAgents.value.map(i => i.entityId);
        for (const iid of influencerIds) {
            const data = await influencerStore.fetchSalesPlaylist(iid, selectedProductIds.value);
            // const res = await api.get(`/influencer/${iid}/sales/playlist`, { 
            //     params: { productIds: selectedProductIds.value.join(',') } 
            // });
            if (data) {
                data.forEach((item: any) => {
                    if (!videoJobs.value[item.productId]) {
                        videoJobs.value[item.productId] = { 
                            jobId: 'existing', 
                            status: 'existing', 
                            url: item.videoUrl 
                        };
                        if (!assignmentMap.value[item.productId]) {
                            assignmentMap.value[item.productId] = iid;
                        }
                    }
                });
            }
        }
    } catch (e) {
        console.error('Failed to prefetch videos:', e);
    } finally {
        loading.value = false;
        currentStep.value = 2;
    }
};

const nextStep = () => {
    if(currentStep.value == 0){
        if(selectedPersonaUuids.value.length == 0){
            toast.error('Please select an AI Agent for your live stream');
            return;
        }
        // Summon AI Guests
        syntheticGuestManager.activeGuests.clear();
        // Summon influencers first so wizard has access to them
        selectedAgents.value = [];
        for (const uuid of selectedPersonaUuids.value) {
            const persona = personas.value.find((p: any) => p.uuid === uuid);
            if (persona) {
                syntheticGuestManager.summonGuest(persona);
                selectedAgents.value.push(persona);
            }
        }
    }

    if (currentStep.value === 1 && selectedProductIds.value.length === 0) {
        toast.error('Please select at least one product');
        return;
    }
    
    // Step 2 is now merged into Step 3
    if (currentStep.value === 1) {
        preStep2();
        return;
    }

    currentStep.value++;
};

const prevStep = () => {
    // if (currentStep.value === 3) {
    //     currentStep.value = 1;
    //     return;
    // }
    currentStep.value--;
};

const generateVideos = async (pid: string | null = null) => {
    loading.value = true;
    try {
        const pids = pid ? [pid] : selectedProductIds.value;
        for(const pid of pids){
            await generateVideo(pid);
        }
    } catch (e) {
    
    } finally {
        loading.value = false;
    }
};

const generateVideo = async (pid: string) => {
    if(!pid){
        return;
    }
    try {
        const iid = assignmentMap.value[pid];
        if(!iid){
            toast.error('Product is not assigned to any influencer');
            return;
        }
        loading.value = true;
        const data = await influencerStore.generateProductVideo(iid, pid, selectedLanguage.value);  //api.post(`/influencer/${iid}/sales/prepare`, { productIds: [pid] });
        if (data) {
            videoJobs.value[pid] = { 
                jobId: data.jobId,
                status: data.status, 
                url: data.videoUrl 
            };
        }
        toast.success('AI Video generation completed');
    } catch (e) {
        toast.error('Failed to start generation');
    } finally {
        loading.value = false;
    }
};

const togglePersona = (persona: any) => {
    const idx = selectedPersonaUuids.value.indexOf(persona.uuid);
    if (idx !== -1) {
        selectedPersonaUuids.value.splice(idx, 1);
    } else if (selectedPersonaUuids.value.length < MAX_AI_AGENTS) {
        selectedPersonaUuids.value.push(persona.uuid);
    } else {
        toast.warning('Agent Limit Reached: Max '+MAX_AI_AGENTS+' AI Agents');
    }
};

// startPolling and pollInterval REMOVED as flow is now synchronous

onUnmounted(() => {
    // interval cleanup no longer needed
});

const storyboardVideo = (idolName: string, type: string, productId: string) => {
    let clipUrl = "";
    const influencer = getInfluencer(idolName);
    if(!influencer){
        return null;
    }
    if(influencer.visual?.modelType === 'aidol'){
        if(influencer?.visual?.aidolClips){
            clipUrl = influencer.visual.aidolClips[type] || "";
            if(!clipUrl && productId){
                clipUrl = influencer.visual.aidolClips[productId] || "";
            }
        }
    }else{
        clipUrl = influencer.visual?.video || "";
    }

    if(!clipUrl && productId){
        clipUrl = getPreviewUrl(productId);
        return clipUrl;
    }
    return getFileUrl(clipUrl);
}

const getPreviewUrl = (pid: string) => {
    const job = videoJobs.value[pid];
    if (job?.url) return getFileUrl(job.url);
    const product = getProduct(pid);
    return getFileUrl(product?.video);
};

const copyPrompt = async (pid: string) => {
    try {
        const product = availableProducts.value.find(p => p._id === pid);
        const influencerId = assignmentMap.value[pid];
        const influencer = selectedAgents.value.find(i => i.entityId === influencerId);
        
        const prompt = `Professional green screen video of ${influencer?.identity?.name || 'an influencer'} demonstrating and using the product: ${product?.name}. 
Focus on authentic details: ${product?.description || ''}.`;
        
        await navigator.clipboard.writeText(prompt);
        toast.success('Prompt copied to clipboard');
    } catch (e) {
        toast.error('Failed to copy prompt');
    }
};

const generateScript = async () => {
    loading.value = true;
    try {
        const influencerIds = selectedAgents.value.map(i => i.entityId);
        const language = selectedLanguage.value;
        console.log("generateScript", influencerIds, language);
        const data: any = await influencerStore.prepareSaleScripts(influencerIds, selectedProductIds.value, assignmentMap.value, language);
        console.log("generateScript", data);
        orchestrationScript.value = data.script || data;
        if(orchestrationScript.value.length > 0 && orchestrationScript.value[0].type != 'speaking'){
            orchestrationScript.value[0].type = "speaking";
        }
    } catch (e) {
        toast.error('Failed to generate script');
    } finally {
        loading.value = false;
    }
};

const startLive = () => {
    loading.value = true;
    try {
        // Apply Products
        const products = selectedProductIds.value.map(pid => {
            const p = availableProducts.value.find(x => x._id === pid);
            return {
                ...p,
                video: videoJobs.value[pid]?.url || p?.video
            };
        });
        studioStore.featuredProducts = products;
        studioStore.liveProducts = products;

        // Apply Script
        studioStore.activeScript = orchestrationScript.value;

        // Apply Visuals
        studioStore.streamRatio = configState.ratio;
        
        // Apply visual settings
        const bgAsset = studioStore.backgroundAssets.find(a => a.id === configState.bgId);
        const finalBgUrl = bgAsset ? bgAsset.url : (configState.bgId.includes('/') ? configState.bgId : getFileUrl(configState.bgId));

        studioStore.updateVisualSettings({
            language: selectedLanguage.value,
            background: {
                mode: 'virtual',
                blurLevel: 'low',
                assetUrl: finalBgUrl || '/bg/pro-studio.jpg',
                isAssetVideo: false,
                is360: false
            },
            showLowerThird: configState.showLowerThird,
            showTicker: configState.showTicker,
            showChat: configState.showChat,
            tickerText: `${studioStore.featuredProducts.map(p => p.name).join(' • ')} available now! `
        });

        // Apply Music
        if (configState.bgmId !== 'none') {
            studioStore.setBgm(configState.bgmId);
        }

        // Emit completion with platforms
        emit('complete', { platforms: [...configState.platforms] });
    } catch (e) {
        toast.error('Failed to start live session');
    } finally {
        loading.value = false;
    }
};

function togglePlatform(accountId: string) {
    if (configState.platforms.includes(accountId)) {
        configState.platforms = configState.platforms.filter(x => x !== accountId);
    } else {
        configState.platforms.push(accountId);
    }
}

const handleAssignmentChange = (pid: string, newInfluencerId: string) => {
    assignmentMap.value[pid] = newInfluencerId;
    const videoUrl = videoJobs.value[pid]?.url;
    if (videoUrl) {
         const influencer = selectedAgents.value.find(i => i.entityId === newInfluencerId);
         if (influencer) {
              if (!influencer.visual) influencer.visual = {};
              if (!influencer.visual.aidolClips) influencer.visual.aidolClips = {};
              influencer.visual.aidolClips[pid] = videoUrl;
              
              influencerStore.syncAidolClips(newInfluencerId, influencer.visual.aidolClips).catch(e => {
                   console.error("Failed to sync aidol clip to new influencer", pid, e);
              });
         }
    }
};

async function handleLocalUpload(type: 'bg' | 'bgm' | 'video', pid?: string, event?: Event) {
    const file = (event?.target as HTMLInputElement)?.files?.[0];
    if (!file) return;

    loading.value = true;
    try {
        const formData = new FormData();
        formData.append('file', file);
        const data: any = await mediaStore.uploadMedia(formData);
        // const res = await api.post('/media/upload', formData, {
        //     headers: { 'Content-Type': 'multipart/form-data' }
        // });

        const s3Key = data.s3Key || data.key;
        
        if (type === 'bg') {
            configState.bgId = s3Key;
            toast.success('Background uploaded');
        } else if (type === 'bgm') {
            configState.bgmId = s3Key;
            configState.bgmTitle = file.name;
            toast.success('Music uploaded');
        } else if (type === 'video' && pid) {
            videoJobs.value[pid] = { jobId: `manual-${Date.now()}`, status: 'existing', url: s3Key };
            toast.success('Video uploaded');
            
            const iid = assignmentMap.value[pid];
            if (iid) {
                const influencer = selectedAgents.value.find(i => i.entityId === iid);
                if (influencer) {
                    if (!influencer.visual) influencer.visual = {};
                    if (!influencer.visual.aidolClips) influencer.visual.aidolClips = {};
                    influencer.visual.aidolClips[pid] = s3Key;
                    
                    influencerStore.syncAidolClips(iid, influencer.visual.aidolClips).catch(e => {
                         console.error("Failed to sync aidol clip for product", pid, e);
                    });
                }
            }
        }
    } catch (e) {
        toast.error('Upload failed');
    } finally {
        loading.value = false;
    }
}

const getProduct = (pid: string) => {
    return availableProducts.value.find(p => p._id === pid);
}

const getInfluencer = (influencerId: string) => {
    return selectedAgents.value.find(i => i.entityId === influencerId);
}

const getInfluencerByProduct = (pid: string) => {
    return assignmentMap.value[pid] ? getInfluencer(assignmentMap.value[pid]) : null;
}

</script>



<style scoped lang="scss">
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.studio-search,
.studio-select {
  :deep(.el-input__wrapper) {
    background: rgba(255, 255, 255, 0.05) !important;
    box-shadow: none !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    border-radius: 8px !important;
  }
  :deep(.el-input__inner) {
    color: white !important;
    font-size: 10px !important;
  }
}
</style>
