<template>
  <el-dialog
    v-model="isVisible"
    :title="t('merchant.adDialog.title')"
    width="900px"
    class="product-ad-dialog glass-dark"
    :align-center="true"
    :append-to-body="true"
    :destroy-on-close="true"
    @closed="resetWizard"
  >
    <div class="p-6 min-h-[500px] flex flex-col">
      <!-- Stepper -->
      <div class="flex justify-between items-center mb-8 px-4">
        <div>
          <h2 class="text-xl font-black text-white tracking-tight uppercase mb-1">
            {{ stepTitles[step - 1] }}
          </h2>
          <p class="text-[10px] text-gray-400 font-medium">{{ t('merchant.adDialog.stepIndicator', { step, total: 5 }) }}</p>
        </div>
        <div class="flex gap-2">
          <div 
            v-for="i in 5" 
            :key="i" 
            class="w-12 h-1 rounded-full transition-all duration-300" 
            :class="step >= i ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]' : 'bg-white/10'"
          ></div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="flex-1 relative overflow-hidden">
        <Transition name="slide-fade" mode="out-in">
          
          <!-- Step 1: Initialization (AI Extraction) -->
          <div v-if="step === 1" key="step1" class="space-y-6 h-full flex flex-col justify-center">
            <div class="input-group max-w-lg mx-auto w-full">
              <label class="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-4 text-center">{{ t('merchant.adDialog.analyzeStep.title') }}</label>
              
              <div class="url-input relative group mb-6">
                <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none opacity-40 group-focus-within:opacity-100 transition-opacity">
                  <link-one size="18" />
                </div>
                <input 
                  v-model="productUrl" 
                  type="text" 
                  :placeholder="t('merchant.adDialog.analyzeStep.placeholder')" 
                  class="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-medium focus:border-blue-500/50 outline-none transition-all text-white"
                  @keyup.enter="analyzeProduct"
                />
              </div>

              <!-- Or select from inventory (implied context) -->
              <div class="text-center">
                 <p class="text-[10px] uppercase opacity-30 mb-4">{{ t('merchant.adDialog.analyzeStep.or') }}</p>
                 <div class="file-upload flex items-center justify-center border-2 border-dashed border-white/10 rounded-2xl hover:border-blue-500/30 hover:bg-white/[0.02] transition-all cursor-pointer group p-6">
                  <div class="text-center flex gap-2 items-center justify-center">
                    <plus size="24" class="mx-auto mb-2 opacity-40 group-hover:opacity-100 transition-opacity text-blue-400" />
                    <p class="text-[10px] font-black opacity-40 group-hover:opacity-100 transition-opacity">{{ t('merchant.adDialog.analyzeStep.uploadBtn') }}</p>
                  </div>
                </div>
              </div>

              <div class="flex justify-center pt-8">
                <button 
                  class="primary-btn px-12 py-3 rounded-xl text-[10px] font-black tracking-widest flex items-center gap-2 disabled:opacity-50"
                  :disabled="!productUrl || loading"
                  @click="analyzeProduct"
                >
                  <loading-three v-if="loading" class="animate-spin" size="14" />
                  <magic v-else size="14" />
                  {{ t('merchant.adDialog.analyzeStep.analyzeBtn') }}
                </button>
              </div>
            </div>
          </div>

          <!-- Step 2: Review & Refine -->
          <div v-else-if="step === 2" key="step2" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
              <div class="space-y-5">
                <div class="grid grid-cols-2 gap-4">
                   <div>
                     <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.productName') }}</label>
                     <input v-model="extractedData.product.name" type="text" class="glass-input w-full" />
                   </div>
                   <div>
                     <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.price') }}</label>
                     <input v-model="extractedData.product.price" type="text" class="glass-input w-full" />
                   </div>
                </div>
                <div>
                  <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.description') }}</label>
                  <textarea v-model="extractedData.product.description" rows="4" class="glass-input w-full resize-none"></textarea>
                </div>
                <div class="grid grid-cols-2 gap-4">
                   <div class="space-y-4">
                      <div>
                        <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.brandName') }}</label>
                        <input v-model="extractedData.brand.name" type="text" class="glass-input w-full" />
                      </div>
                      <div>
                        <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.brandSlogan') }}</label>
                        <input v-model="extractedData.brand.slogan" type="text" class="glass-input w-full" :placeholder="t('merchant.adDialog.refineStep.brandSloganPlaceholder')" />
                      </div>
                   </div>
                   <div class="flex flex-col">
                      <label class="block text-[8px] font-black opacity-30 uppercase mb-2">{{ t('merchant.adDialog.refineStep.brandLogo') }}</label>
                      <div class="flex gap-3 items-start">
                         <div class="w-20 h-20 rounded-xl bg-black/40 border border-white/5 overflow-hidden flex items-center justify-center p-2 group relative">
                            <img v-if="extractedData.brand.logo" :src="extractedData.brand.logo" class="max-w-full max-h-full object-contain" />
                            <div v-else class="text-[8px] font-black opacity-20 uppercase">{{ t('merchant.adDialog.refineStep.noLogo') }}</div>
                         </div>
                         <div class="flex-1">
                            <input v-model="extractedData.brand.logo" type="text" class="glass-input w-full text-[10px]" :placeholder="t('merchant.adDialog.refineStep.logoUrlPlaceholder')" />
                         </div>
                      </div>
                   </div>
                </div>

                <!-- Features & Colors -->
                <div class="grid grid-cols-2 gap-6">
                   <div>
                      <label class="block text-[8px] font-black opacity-30 uppercase mb-3 text-blue-400">{{ t('merchant.adDialog.refineStep.keyFeatures') }}</label>
                      <div class="flex flex-wrap gap-2 mb-3">
                         <div v-for="(f, i) in extractedData.product.features" :key="i" class="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-gray-300 flex items-center gap-2 group">
                            {{ f }}
                            <close-one size="10" @click="extractedData.product.features.splice(i, 1)" class="cursor-pointer opacity-0 group-hover:opacity-100" />
                         </div>
                      </div>
                      <div class="flex gap-2">
                         <input v-model="newFeature" type="text" :placeholder="t('merchant.adDialog.refineStep.addFeaturePlaceholder')" class="glass-input flex-1 text-[10px] py-2" @keyup.enter="addFeature" />
                         <button @click="addFeature" class="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-all">
                            <plus size="14" />
                         </button>
                      </div>
                   </div>
                   <div>
                      <label class="block text-[8px] font-black opacity-30 uppercase mb-3 text-blue-400">{{ t('merchant.adDialog.refineStep.colorPalette') }}</label>
                      <div class="space-y-4">
                         <div>
                            <p class="text-[6px] font-black uppercase tracking-widest opacity-30 mb-2">{{ t('merchant.adDialog.refineStep.primary') }}</p>
                            <div class="flex gap-2">
                               <div v-for="(c, i) in extractedData.product.primary_colors" :key="i" class="w-8 h-8 rounded-lg border border-white/10 shadow-lg relative group" :style="{ backgroundColor: c }">
                                  <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg" @click="extractedData.product.primary_colors.splice(i, 1)">
                                     <close-one size="12" fill="white" />
                                  </div>
                               </div>
                               <el-color-picker v-if="extractedData.product.primary_colors.length < 3" size="small" @change="(val) => val && extractedData.product.primary_colors.push(val)" />
                            </div>
                         </div>
                         <div>
                            <p class="text-[6px] font-black uppercase tracking-widest opacity-30 mb-2">{{ t('merchant.adDialog.refineStep.secondary') }}</p>
                            <div class="flex gap-2">
                               <div v-for="(c, i) in extractedData.product.secondary_colors" :key="i" class="w-8 h-8 rounded-lg border border-white/10 shadow-lg relative group" :style="{ backgroundColor: c }">
                                  <div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-lg" @click="extractedData.product.secondary_colors.splice(i, 1)">
                                     <close-one size="12" fill="white" />
                                  </div>
                               </div>
                               <el-color-picker v-if="extractedData.product.secondary_colors.length < 3" size="small" @change="(val) => val && extractedData.product.secondary_colors.push(val)" />
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              </div>

              <div class="bg-black/20 rounded-2xl p-4 border border-white/5">
                 <label class="block text-[8px] font-black opacity-30 uppercase mb-3">{{ t('merchant.adDialog.refineStep.selectImage') }}</label>
                 <div class="media-preview grid grid-cols-3 gap-2 content-start max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                    <div 
                      v-for="(img, idx) in extractedData.product.images" 
                      :key="idx" 
                      class="aspect-square bg-black rounded-xl overflow-hidden border relative group cursor-pointer transition-all"
                      :class="selectedImageIndex === idx ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white/5 hover:border-white/20'"
                      @click="selectedImageIndex = idx"
                    >
                       <img :src="img" class="w-full h-full object-cover transition-opacity" :class="selectedImageIndex === idx ? 'opacity-100' : 'opacity-60 group-hover:opacity-80'" />
                       <div v-if="selectedImageIndex === idx" class="absolute top-2 right-2">
                          <div class="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[10px]">
                             <check size="10" theme="filled" fill="white" />
                          </div>
                       </div>
                    </div>
                    <div class="aspect-square border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity cursor-pointer hover:border-blue-500/30 hover:bg-white/[0.02]">
                       <plus size="20" />
                    </div>
                 </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Format & Template -->
          <div v-else-if="step === 3" key="step3" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
               <div class="md:col-span-1 space-y-4">
                  <label class="block text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">{{ t('merchant.adDialog.templateStep.targetFormat') }}</label>
                  <div class="space-y-3">
                    <div 
                      v-for="f in formats" 
                      :key="f.id" 
                      class="format-card p-4 rounded-2xl border transition-all duration-300 cursor-pointer group relative overflow-hidden flex items-center gap-4"
                      :class="selectedRatio === f.ratio ? 'bg-blue-500 border-blue-400 shadow-[0_10px_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/5 hover:border-white/20'"
                      @click="selectedRatio = f.ratio"
                    >
                      <component :is="f.icon" size="24" :theme="selectedRatio === f.ratio ? 'filled' : 'outline'" :class="selectedRatio === f.ratio ? 'text-white' : 'text-gray-400'" />
                      <div>
                        <h3 class="text-xs font-black uppercase mb-0.5" :class="selectedRatio === f.ratio ? 'text-white' : 'text-gray-300'">{{ f.name }}</h3>
                        <p class="text-[8px] font-bold uppercase opacity-50" :class="selectedRatio === f.ratio ? 'text-blue-100' : 'text-gray-500'">{{ f.desc }}</p>
                      </div>
                    </div>
                  </div>
               </div>

                <div class="md:col-span-2 flex flex-col h-full">
                  <div class="flex items-center justify-between mb-4">
                    <label class="block text-[10px] font-black uppercase tracking-widest text-blue-400">{{ t('merchant.adDialog.templateStep.selectTemplate') }}</label>
                    <div class="search-box relative w-48">
                      <input 
                        v-model="searchQuery" 
                        type="text" 
                        :placeholder="t('merchant.adDialog.templateStep.searchPlaceholder')" 
                        class="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-8 pr-3 text-[10px] font-medium focus:border-blue-500/50 outline-none transition-all text-white"
                      />
                      <div class="absolute inset-y-0 left-2.5 flex items-center pointer-events-none opacity-30">
                        <magic size="12" />
                      </div>
                    </div>
                  </div>

                  <div class="template-grid grid grid-cols-3 gap-3 flex-1 overflow-y-auto pr-1 custom-scrollbar min-h-[300px]">
                     <div v-if="loadingTemplates" v-for="i in 6" :key="'skeleton-' + i" class="aspect-[1/1] bg-white/5 rounded-xl border border-white/5 animate-pulse"></div>
                     
                     <template v-else>
                        <div 
                          v-for="t in filteredTemplates" 
                          :key="t._id" 
                          class="aspect-[1/1] bg-black/40 rounded-xl border transition-all cursor-pointer overflow-hidden relative group"
                          :class="selectedTemplateId === t._id ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-white/5 hover:border-blue-500/50'"
                          @click="onChangeTemplate(t)"
                          @mouseenter="t.play = true"
                          @mouseleave="t.play = false"
                        >
                          <el-image :src="getFileUrl(t.thumbnail || t.pages?.[0]?.thumbnail || '')" 
                            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" fit="cover">
                            <template #error>
                              <div class="w-full h-full flex items-center justify-center">
                                <picture-one theme="filled" size="24" />
                              </div>
                            </template>
                          </el-image>
                          <template v-if="t.play && t.pages?.[0]?.preview">
                            <video :src="getFileUrl(t.pages?.[0]?.preview)" autoplay loop class="absolute inset-0 w-full h-full object-cover" />
                          </template>
                          <div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex flex-col justify-end p-3">
                            <h4 class="text-[10px] font-black text-white uppercase line-clamp-1 mb-0.5">{{ t.name }}</h4>
                          </div>
                          <div class="absolute top-2 right-2" v-if="selectedTemplateId === t._id">
                            <div class="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                              <check size="12" theme="filled" fill="white" />
                            </div>
                          </div>
                          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20" @click.stop="onChangeTemplate(t)">
                            <!-- <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-all">
                              <play-two theme="filled" fill="white" size="20" />
                            </div> -->
                          </div>
                        </div>
                        
                        <!-- Empty State for Templates -->
                        <div v-if="filteredTemplates.length === 0" class="col-span-3 flex flex-col items-center justify-center py-12 text-center opacity-40">
                           <div class="text-3xl mb-3">🎬</div>
                           <p class="text-[10px] uppercase font-black tracking-widest">{{ t('merchant.adDialog.templateStep.noTemplates') }}</p>
                        </div>
                     </template>
                  </div>

                  <!-- Pagination -->
                  <div class="mt-4 flex justify-between items-center bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                    <span class="text-[8px] font-black uppercase text-gray-500">{{ t('merchant.adDialog.templateStep.total', { total: totalTemplates }) }}</span>
                    <el-pagination
                      v-model:current-page="currentPage"
                      :page-size="pageSize"
                      :total="totalTemplates"
                      layout="prev, pager, next"
                      size="small"
                      class="cinematic-pagination-compact"
                    />
                  </div>
               </div>
            </div>
          </div>

          <!-- Step 4: Finalize -->
          <div v-else-if="step === 4" key="step4" class="h-full flex flex-col justify-center items-center space-y-8">
             <div class="text-center">
                <div class="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400 mb-4 pulse-glow">
                   <Rocket size="32" />
                </div>
                <h2 class="text-xl font-black text-white uppercase mb-2 tracking-tight">{{ t('merchant.adDialog.finalizeStep.title') }}</h2>
                <p class="text-gray-400 text-xs max-w-sm mx-auto">{{ t('merchant.adDialog.finalizeStep.subtitle') }}</p>
             </div>
     
             <div class="grid grid-cols-2 gap-6 w-full max-w-2xl px-4">
                <button class="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.08] transition-all group text-left" @click="launchEditor(false)">
                   <div class="mb-4 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition-all text-white">
                      <edit size="20" />
                   </div>
                   <h3 class="text-sm font-black text-white uppercase mb-1">{{ t('merchant.adDialog.finalizeStep.editorStudio') }}</h3>
                   <p class="text-[10px] text-gray-400 leading-relaxed">{{ t('merchant.adDialog.finalizeStep.editorStudioDesc') }}</p>
                </button>
     
                <button class="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-400 shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all text-left group" @click="launchEditor(true)">
                   <div class="mb-4 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                      <lightning size="20" />
                   </div>
                   <h3 class="text-sm font-black text-white uppercase mb-1">{{ t('merchant.adDialog.finalizeStep.quickRender') }}</h3>
                   <p class="text-[10px] text-blue-100 leading-relaxed">{{ t('merchant.adDialog.finalizeStep.quickRenderDesc') }}</p>
                </button>
             </div>
          </div>
          <!-- Step 5: Render -->
          <div v-else-if="step === 5" key="step5" class="h-full flex flex-col justify-center items-center space-y-8">
            <!-- Required for Headless Rendering -->
            <div class="fixed opacity-0 pointer-events-none -z-50" style="width: 1px; height: 1px; overflow: hidden;">
              <StudioEditor />
            </div>

            <template v-if="isSuccess">
              <!-- Success UI -->
              <div class="text-center w-full max-w-xl px-12 animate-in fade-in zoom-in duration-500">
                <div class="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.3)]">
                  <Check :size="40" :strokeWidth="4" />
                </div>
                <h2 class="text-3xl font-black text-white uppercase tracking-tight mb-2">{{ t('merchant.adDialog.renderStep.success') }}</h2>
                <p class="text-xs text-gray-400 uppercase tracking-widest font-black mb-6">{{ t('merchant.adDialog.renderStep.successSubtitle') }}</p>

                <!-- Video Preview -->
                <div class="relative rounded-3xl overflow-hidden bg-black border border-white/5 shadow-2xl mb-8 group">
                  <video 
                    v-if="videoPreviewUrl" 
                    :src="videoPreviewUrl" 
                    controls 
                    class="w-full h-full object-contain"
                  ></video>
                  <div v-else class="w-full h-full flex flex-col items-center justify-center space-y-3">
                    <loading-three class="animate-spin text-blue-500" size="24" />
                    <p class="text-[8px] font-black uppercase tracking-widest opacity-40">{{ t('merchant.adDialog.renderStep.preparingPreview') }}</p>
                    <p class="text-[10px] font-bold text-white group-hover:text-blue-400 transition-colors">{{ props.product?.name || 'ad_preview' }}.mp4</p>
                  </div>
                  <div class="flex gap-2 justify-center">
                    <button class="p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all cursor-pointer group" @click="openLink(`/p/${props.product?._id || props.product?.id}`)">
                      <div class="flex items-center gap-2 mb-2">
                        <LinkOne size="14" class="text-purple-400" />
                        <span class="text-[10px] font-black uppercase text-gray-400">{{ t('merchant.adDialog.renderStep.landingPage') }}</span>
                      </div>
                    </button>
                    <button @click="publishToProduct" :disabled="isPublishing" class="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-green-500/30 transition-all group">
                      <div class="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 mx-auto mb-2 group-hover:bg-green-500 group-hover:text-white transition-all">
                        <check v-if="!isPublishing" size="16" />
                        <loading-three v-else class="animate-spin" size="16" />
                        <span class="text-[9px] font-black uppercase text-gray-400 group-hover:text-white">{{ t('merchant.adDialog.renderStep.publish') }}</span>
                      </div>
                    </button>
                    <button @click="shareVideo" class="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-purple-500/30 transition-all group">
                      <div class="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 mx-auto mb-2 group-hover:bg-purple-500 group-hover:text-white transition-all">
                        <share size="16" />
                      </div>
                    </button>
                  </div>
                </div>
                <div class="p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 text-left flex items-start gap-4 mb-8">
                  <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Broadcast size="20" />
                  </div>
                  <div>
                    <h4 class="text-xs font-black text-white uppercase mb-1">{{ t('merchant.adDialog.renderStep.liveStudioIntegrated') }}</h4>
                    <p class="text-[10px] text-gray-400 leading-relaxed">{{ t('merchant.adDialog.renderStep.liveStudioDesc') }}</p>
                  </div>
                </div>
                <div class="flex justify-center gap-4">
                  <button @click="isVisible = false" class="px-10 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all">{{ t('merchant.adDialog.renderStep.done') }}</button>
                </div>
              </div>
            </template>

            <template v-else-if="isRendering">
              <!-- Render progress UI -->
              <div class="text-center w-full max-w-lg px-8">
                <div class="flex items-center justify-between mb-4">
                  <div class="flex items-center gap-3 text-left">
                    <div class="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 pulse-glow">
                      <Lightning size="24" />
                    </div>
                    <div>
                      <h2 class="text-xl font-black text-white uppercase tracking-tight">{{ t('merchant.adDialog.renderStep.rendering') }}</h2>
                      <p class="text-[10px] font-black text-blue-500/60 uppercase tracking-widest">{{ editorStore.exportStatusText }}</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <span class="text-2xl font-black text-white">{{ Math.round(editorStore.progress * 100) }}%</span>
                  </div>
                </div>
                <div class="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 mb-4">
                  <div class="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300 shadow-[0_0_20px_rgba(59,130,246,0.5)]" :style="{ width: `${editorStore.progress * 100}%` }"></div>
                </div>
                <!-- <p class="text-[10px] text-gray-400 uppercase tracking-widest text-center">{{ editorStore.exporting === 10 ? 'Finalizing with AI...' : 'Optimizing Creative Assets...' }}</p> -->
              </div>
            </template>

            <template v-else>
              <div class="text-center">
                <div class="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 mx-auto flex items-center justify-center text-blue-400 mb-4 pulse-glow">
                  <Rocket size="32" />
                </div>
                <h2 class="text-xl font-black text-white uppercase mb-2 tracking-tight">{{ t('merchant.adDialog.finalizeStep.title') }}</h2>
                <p class="text-gray-400 text-xs max-w-sm mx-auto">{{ t('merchant.adDialog.finalizeStep.subtitle') }}</p>
              </div>
              <div class="grid grid-cols-2 gap-6 w-full max-w-2xl px-4">
                <button class="p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-blue-500/30 hover:bg-white/[0.08] transition-all group text-left" @click="launchEditor(false)">
                  <div class="mb-4 w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-blue-500 transition-all text-white">
                    <Edit size="20" />
                  </div>
                  <h3 class="text-sm font-black text-white uppercase mb-1">{{ t('merchant.adDialog.finalizeStep.editorStudio') }}</h3>
                  <p class="text-[10px] text-gray-400 leading-relaxed">{{ t('merchant.adDialog.finalizeStep.editorStudioDesc') }}</p>
                </button>
                <button class="p-6 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-500 border border-blue-400 shadow-[0_10px_30px_rgba(59,130,246,0.3)] hover:scale-[1.02] transition-all text-left group" @click="launchEditor(true)">
                  <div class="mb-4 w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white">
                    <Lightning size="20" />
                  </div>
                  <h3 class="text-sm font-black text-white uppercase mb-1">{{ t('merchant.adDialog.finalizeStep.quickRender') }}</h3>
                  <p class="text-[10px] text-blue-100 leading-relaxed">{{ t('merchant.adDialog.finalizeStep.quickRenderDesc') }}</p>
                </button>
              </div>
            </template>
          </div>
        </Transition>
      </div>
    </div>
    <template #footer>
      <div v-if="step > 1" class="flex justify-end gap-3 p-6 border-t border-white/5 bg-white/[0.02]">
        <el-button @click="prevStep" class="glass-btn secondary text-[10px] font-black uppercase tracking-widest px-6">
          {{ step === 1 ? t('common.actions.cancel') : t('common.actions.back') }}
        </el-button>
        <el-button v-if="step < 4" type="primary" @click="nextStep" class="glass-btn primary text-[10px] font-black uppercase tracking-widest px-8">
          {{ t('common.next') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, provide } from 'vue';
import { useEditorStore } from 'video-editor/store/editor';
import { useThemeProvider, type ThemeProviderState } from 'video-editor/context/theme';
import StudioEditor from 'video-editor/views/Editor.vue';
import { 
  Magic, LinkOne, LoadingThree, Check, Plus, Rocket, 
  Edit, Lightning, Iphone, Monitor, Square, PlayTwo,
  CloseOne, PictureOne, VideoFile, Broadcast, Share
} from '@icon-park/vue-next';
import api, { getFileUrl } from '@/utils/api';
import { toast } from 'vue-sonner';
import { useRouter } from 'vue-router';
import { useMarketplaceStore } from '@/stores/marketplace';
import { storeToRefs } from 'pinia';
import TemplateCard from '@/components/marketplace/TemplateCard.vue';
import { useProjectStore } from '@/stores/project';
import { useUIStore } from '@/stores/ui';
import { useI18n } from 'vue-i18n';
import type { EditorTemplate } from 'video-editor/types/editor';

const props = defineProps<{
  modelValue: boolean;
  product?: any; 
}>();

const emit = defineEmits(['update:modelValue', 'update:product']);
const router = useRouter();
const { t } = useI18n()

const marketplaceStore = useMarketplaceStore();
const editorStore = useEditorStore();
const projectStore = useProjectStore();
const uiStore = useUIStore();
const themeProvider = useThemeProvider() as ThemeProviderState;
provide('theme', themeProvider);

const openLink = (url: string) => {
   if (url.startsWith('http')) {
      window.open(url, '_blank');
   } else if (url.startsWith('/')) {
      // Check if it's a product landing page link
      const productMatch = url.match(/^\/p\/([a-zA-Z0-9]+)$/);
      if (productMatch) {
         window.open(uiStore.getProductLandingLink(productMatch[1]), '_blank');
      } else {
         window.open(uiStore.domain + url, '_blank');
      }
   } else {
      window.open(getFileUrl(url), '_blank');
   }
};

const isRendering = ref(false);
const isSuccess = ref(false);
const adVideoKey = ref('');
const step = ref(1);
const loading = ref(false);
const productUrl = ref('');
const selectedRatio = ref('portrait');
const selectedImageIndex = ref(0);
const videoPreviewUrl = ref('');
const videoBlob = ref<Blob | null>(null);
const isPublishing = ref(false);

const stepTitles = computed(() => [
  t('merchant.adDialog.steps.analyze'),
  t('merchant.adDialog.steps.review'),
  t('merchant.adDialog.steps.template'),
  t('merchant.adDialog.steps.finalize'),
  t('merchant.adDialog.steps.render')
]);

const { templates, loading: loadingTemplates } = storeToRefs(marketplaceStore);

const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(6);
const totalTemplates = ref(0);
const selectedTemplateId = ref<string | null>(null);
const newFeature = ref('');
const template = ref<EditorTemplate | null>(null);

const extractedData = reactive({
  product: {
    name: '',
    price: '',
    description: '',
    currency: 'USD',
    stock: 0,
    inventoryUrl: '',
    isActive: true,
    images: [] as string[],
    features: [] as string[],
    primary_colors: [] as string[],
    secondary_colors: [] as string[]
  },
  brand: {
    name: '',
    logo: '',
    slogan: ''
  }
});

const addFeature = () => {
    const val = newFeature.value?.trim() || '';
    if (val && !extractedData.product.features.includes(val)) {
        extractedData.product.features.push(val);
    }
    newFeature.value = '';
};

const fetchTemplates = async () => {
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      category: 'ad',
      ratio: selectedRatio.value
    };
    const res = await marketplaceStore.fetchTemplates(params);
    if (res && res.total) {
      totalTemplates.value = res.total;
    }
  } catch (err) {
    console.error('Failed to fetch templates:', err);
  }
};

const filteredTemplates = computed(() => templates.value || []);

// Watch for step changes or filter changes to fetch templates
watch([step, searchQuery, currentPage, selectedRatio], () => {
  if (step.value === 3) {
    fetchTemplates();
  }
});

const isVisible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
});

const formats = [
  { id: 'portrait', name: 'Portrait', ratio: 'portrait', icon: Iphone, desc: 'TikTok / Reels' },
  { id: 'square', name: 'Square', ratio: 'square', icon: Square, desc: 'Instagram / Feed' },
  { id: 'landscape', name: 'Landscape', ratio: 'landscape', icon: Monitor, desc: 'YouTube / Ads' }
];

const onChangeTemplate = (t: any) => {
  //ignore autosave of editor
  const templateObj = { ...t, is_published: false, id: null, _id: t._id } as EditorTemplate;
  selectedTemplateId.value = t._id;
  if (templateObj.pages) {
    templateObj.pages = templateObj.pages.filter((p: any) => p.data?.orientation === selectedRatio.value);
  }
  template.value = templateObj;
  console.log("onChangeTemplate", template.value);
}

const resetWizard = () => {
    // Only reset if closed and opening fresh (handled by watch largely)
    if (!props.product) {
        step.value = 1;
        productUrl.value = '';
        extractedData.product = { 
          name: '', price: '', description: '', images: [], 
          currency: 'USD', stock: 0, inventoryUrl: '', isActive: true,
          features: [], primary_colors: [], secondary_colors: [] 
        };
        extractedData.brand = { name: '', logo: '', slogan: '' };
        selectedImageIndex.value = 0;
        selectedTemplateId.value = null;
        template.value = null;
        searchQuery.value = '';
        currentPage.value = 1;
        isSuccess.value = false;
        adVideoKey.value = '';
        if (videoPreviewUrl.value) URL.revokeObjectURL(videoPreviewUrl.value);
        videoPreviewUrl.value = '';
        videoBlob.value = null;
    }
}

// Initialize with passed product if available
watch(() => props.product, (val) => {
  if (val) {
    extractedData.product = {
      name: val.name,
      price: `${val.currency} ${val.price}`,
      description: val.description,
      currency: val.currency,
      stock: val.stock,
      inventoryUrl: val.inventoryUrl,
      isActive: val.isActive,
      images: val.images && val.images.length ? val.images : [val.image].filter(Boolean),
      features: val.features || [],
      primary_colors: val.primary_colors || [],
      secondary_colors: val.secondary_colors || []
    };
    extractedData.brand = {
      name: val.brand_name || val.name.split(' ')[0] || '',
      logo: val.brand_logo || '',
      slogan: val.brand_slogan || ''
    };
    step.value = 2; // Jump to Step 2
  } else {
    // Reset if opening without product
    resetWizard();
  }
}, { immediate: true });

const analyzeProduct = async () => {
  if (!productUrl.value) return;
  loading.value = true;
  try {
    const data = await marketplaceStore.extractProduct(productUrl.value);
    
    if (data) {
      extractedData.product.name = data.name || '';
      extractedData.product.price = data.price ? `${data.currency || 'USD'} ${data.price}` : '';
      extractedData.product.description = data.description || '';
      extractedData.product.currency = data.currency || 'USD';
      extractedData.product.stock = data.stock || 0;
      extractedData.product.inventoryUrl = productUrl.value;
      extractedData.product.isActive = data.isActive || false;
      
      if (data.images && data.images.length) {
        extractedData.product.images = data.images;
      } else if (data.image) {
        extractedData.product.images = [data.image];
      }
      
      if (data.name && !extractedData.brand.name) {
        extractedData.brand.name = data.brand_name || data.name.split(' ')[0];
      }

      // Map new AI fields
      if (data.features) extractedData.product.features = data.features;
      if (data.brand_logo) extractedData.brand.logo = data.brand_logo;
      if (data.brand_slogan) extractedData.brand.slogan = data.brand_slogan;
      if (data.primary_colors) extractedData.product.primary_colors = data.primary_colors;
      if (data.secondary_colors) extractedData.product.secondary_colors = data.secondary_colors;
      
      toast.success(t('merchant.adDialog.toasts.extractSuccess'));
      step.value = 2;
    }
  } catch (err) {
    toast.error(t('merchant.adDialog.toasts.extractError'));
    step.value = 2; // Allow manual entry
  } finally {
    loading.value = false;
  }
};

const nextStep = () => {
  if (step.value === 3 && !selectedTemplateId.value) {
    toast.error(t('merchant.adDialog.toasts.selectTemplate'));
    return;
  }
  if (step.value < 4) step.value++;
};

const prevStep = () => {
  if (step.value > 1) step.value--;
  else isVisible.value = false;
};

const launchEditor = async (headless: boolean) => {
  // Use selected image prop
  const finalProduct = {
      ...extractedData.product,
      image: extractedData.product.images[selectedImageIndex.value] || extractedData.product.images[0]
  };

  // Load template
  // const data = await marketplaceStore.useTemplate(selectedTemplateId.value!);
  // const template = data?.template;
  if (!template.value || !template.value.pages || template.value.pages.length !== 1) {
    throw new Error(t('merchant.adDialog.toasts.selectTemplate'));
  }

  // Filter pages by ratio
  const ratioLabel = template.value.pages[0]?.data?.orientation || "portrait";//selectedRatio.value;//square, portrait, landscape
  template.value.id = null;// remove id to prevent autosave
  template.value.is_published = false;
  template.value.name = finalProduct.name + " " + t('merchant.adDialog.steps.render');

  const product = {...finalProduct, 
    image: {id: 0, url: finalProduct.image}, 
    images: finalProduct.images.map((image: string, index: number) => {
      return {
        id: index,
        url: image
      }
    })
  };

  const brand = {
    brand_name: extractedData.brand.name,
    brand_logo: extractedData.brand.logo,
    brand_description: extractedData.brand.slogan,
    primary_colors: product.primary_colors,
    secondary_colors: product.secondary_colors
  };

  if (!headless) {
    const payload = {
      product: product,
      brand: brand,
      objective: 'E-commerce Ad',
      adapter: 'edit',//create
      ratio: ratioLabel,
      template: template,
      headless: headless
    };

    const encodedState = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    isVisible.value = false;
    const ratioStr = ratioLabel === "square" ? "1:1" : (ratioLabel === "portrait" ? "9:16" : "16:9");

    try {
      const data = await useProjectStore().createProject({
        title: finalProduct.name,
        description: finalProduct.description,
        mode: 'template',
        aspectRatio: ratioStr as any,
        videoStyle: 'ads',
        targetDuration: 15
      });

      const project = data.project;
      router.push({name: 'project-studio', params: {id: project._id}, query: {mode: "adapter", headless: 'false', templateId: selectedTemplateId.value, ratio: selectedRatio.value, payload: encodedState}});
    } catch(error) {
      console.log(error);
    }
    return;
  }

  // Headless flow: Render directly in dialog
  isRendering.value = true;
  isSuccess.value = false;
  step.value = 5;
  
  try {
    editorStore.isHeadless = true;
    let width = 1920;
    let height = 1080;
    if (ratioLabel === "square") {
      width = 1080;
      height = 1080;
    } else if (ratioLabel === "portrait") {
      width = 1080;
      height = 1920;
    }
    
    editorStore.resize({width: width, height: height});
    // Initialize editor in adapter mode
    // Wait a tick for EditorView to mount and potentially start its own init
    await new Promise(r => setTimeout(r, 100));
    // await editorStore.initialize('adapter');
     
    //  // Load template
    //  const data = await marketplaceStore.useTemplate(selectedTemplateId.value!);
    //  const templateData = data?.template;
    //  if (!templateData) {
    //     throw new Error('Template not found');
    //  }
     
    await editorStore.loadTemplate(template.value as any, 'reset');

    editorStore.adapter.initialize({ product: product, objective: 'E-commerce Ad', brand: brand, mode: 'create' });
    editorStore.initialize("adapter");

    // Inject product data into adapter
    //  editorStore.adapter.update({
    //     product: finalProduct,
    //     brand: extractedData.brand,
    //     objective: 'E-commerce Ad',
    //     mode: 'create'
    //  });

    // Trigger export
    //  const blob = await editorStore.autoRenderAndExport();
    // should wait for editor to be ready
    const { canvas } = storeToRefs(editorStore);
    let counter = 0;
    const TIMEOUT = 120*1000;
    while(true){
      await new Promise(r => setTimeout(r, 100));
      counter += 100;
      if(canvas.value?.template && canvas.value?.template.status === 'completed'){
        break;
      }

      if(counter > TIMEOUT){
        break;
      }
    }

    if(counter > TIMEOUT){
      throw new Error('Failed to load resources for video');
    }

    const blob = await editorStore.exportVideo(true, false);//only render, don't upload
    if(!blob){
      throw new Error('Failed to export video');
    }

    isSuccess.value = true;
    // Also set the videoPreviewUrl for the success display
    const url = URL.createObjectURL(blob);
    videoPreviewUrl.value = url;
    videoBlob.value = blob;
     
    // 2. Create Project and Upload to Server
    console.log("product", props.product);
    editorStore.onChangeExportStatus(10 as any); // Custom status for "Syncing to Cloud"
        
    // 2a. Create Project for tracking
    const projectData = await useProjectStore().createProject({
        title: finalProduct.name,
        description: finalProduct.description,
        mode: 'template',
        aspectRatio: selectedRatio.value === 'square' ? '1:1' : (selectedRatio.value === 'portrait' ? '9:16' : '16:9'),
        videoStyle: 'ads',
        targetDuration: 15,
        pages: template.value.pages
    });

    if(projectData){
      const projectIdFromDB = projectData.project._id;
      const formData = new FormData();
      formData.append('video', blob, `ad_${product.name}.mp4`);

      const data = await useProjectStore().publishProject(projectIdFromDB, formData);

      // 2b. Call Robust /publish endpoint
      const productId = props.product?._id || props.product?.id;
      if(productId){
        try{
          
          if (data?.publish?.s3Key && productId) {
            adVideoKey.value = data.publish.s3Key;
            // Link to product
            await marketplaceStore.updateProduct(productId, {
              video: adVideoKey.value
            });
            toast.success(t('merchant.adDialog.toasts.publishSuccess'));
          }
        }catch(error){
          console.error('Error publishing ad video:', error);
          toast.error(t('merchant.adDialog.toasts.publishFailed'));
        }
      }
    }
    toast.success(t('merchant.adDialog.toasts.renderSuccess'));
  } catch (err) {
     console.error('Headless render failed:', err);
     toast.error(t('merchant.adDialog.toasts.renderFailedDetailed'));
  } finally {
    isRendering.value = false;
    editorStore.isHeadless = false;
    editorStore.onResetProgress(); // Reset to Idle
  }
};

const downloadVideo = () => {
    if (!videoBlob.value) return;
    const url = URL.createObjectURL(videoBlob.value);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${extractedData.product.name.replace(/\s+/g, '_')}_Ad.mp4`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 100);
};

const publishToProduct = async () => {
    isPublishing.value = true;
    try {
        // if(!adVideoKey.value){
        //   return toast.error(t('merchant.adDialog.toasts.publishFailed'));
        // }
        let productId = props.product?._id || props.product?.id;
        if(!productId){
          const data = await marketplaceStore.createProduct({
            name: extractedData.product.name,
            description: extractedData.product.description,
            price: extractedData.product.price,
            currency: extractedData.product.currency,
            image: extractedData.product.images[0],
            images: extractedData.product.images,
            stock: extractedData.product.stock,
            inventoryUrl: extractedData.product.inventoryUrl,
            isActive: true,
            features: extractedData.product.features,
            brand_name: extractedData.brand.name,
            brand_logo: extractedData.brand.logo,
            brand_slogan: extractedData.brand.slogan,
            primary_colors: extractedData.product.primary_colors,
            secondary_colors: extractedData.product.secondary_colors
          });
          toast.success(t('merchant.adDialog.toasts.productUpdateSuccess'));
          emit('update:product', data.product);
          productId = data.product._id;
        }

        if(!adVideoKey.value){
          const formData = new FormData();
          formData.append('video', videoBlob.value, `ad_${extractedData.product.name}.mp4`);

          const data = await useProjectStore().publishProject(productId, formData);
          toast.success(t('merchant.adDialog.toasts.productUpdateSuccess'));
          emit('update:product', data.product);
        }
        else{
          const data = await marketplaceStore.updateProduct(productId, {
            video: adVideoKey.value
          });
          toast.success(t('merchant.adDialog.toasts.productUpdateSuccess'));
          emit('update:product', data.product);
        }
    } catch (err) {
        toast.error(t('merchant.adDialog.toasts.updateFailed'));
    } finally {
        isPublishing.value = false;
    }
};

const shareVideo = () => {
    if (navigator.share && videoBlob.value) {
        const file = new File([videoBlob.value], 'AdCreative.mp4', { type: 'video/mp4' });
        navigator.share({
            title: extractedData.product.name + ' Ad',
            text: extractedData.product.description,
            files: [file],
        }).catch(err => console.log('Error sharing', err));
    } else {
        // Fallback: Copy link
        const url = uiStore.getProductLandingLink(props.product?._id || props.product?.id);
        navigator.clipboard.writeText(url);
        toast.info(t('common.copySuccess'));
  }
};
</script>

<style lang="scss">
.product-ad-dialog {
  border-radius: 32px !important;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.95) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);

  .el-dialog__header {
    background: rgba(255, 255, 255, 0.02);
    margin: 0;
    padding: 24px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    
    .el-dialog__title {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: white;
    }
  }

  .el-dialog__body {
    padding: 0;
  }
}

.primary-btn {
  background: #3b82f6;
  color: white;
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 30px rgba(59, 130, 246, 0.4);
  }
  &:active { transform: translateY(0); }
  &:disabled { opacity: 0.5; transform: none; box-shadow: none; cursor: not-allowed; }
}

.glass-input {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 12px;
    color: white;
    font-size: 12px;
    &:focus {
        border-color: rgba(59, 130, 246, 0.5);
        outline: none;
    }
}

.pulse-glow {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
  70% { box-shadow: 0 0 0 20px rgba(59, 130, 246, 0); }
  100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
}

.custom-scrollbar {
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 4px; }
  &::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
}

/* Slide Fade Transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.cinematic-pagination-compact {
  --el-pagination-bg-color: transparent;
  --el-pagination-text-color: rgba(255, 255, 255, 0.4);
  --el-pagination-button-color: rgba(255, 255, 255, 0.4);
  --el-pagination-button-bg-color: transparent;
  --el-pagination-hover-color: #3b82f6;
  
  .btn-prev, .btn-next {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.4) !important;
    &:hover { color: #3b82f6 !important; }
    &:disabled { opacity: 0.2; }
  }

  .el-pager li {
    background: transparent !important;
    color: rgba(255, 255, 255, 0.4) !important;
    font-weight: 900;
    font-size: 10px;
    min-width: 24px;
    height: 24px;
    line-height: 24px;
    border-radius: 6px;
    &.is-active {
      color: white !important;
      background: #3b82f6 !important;
    }
    &:hover { color: #3b82f6 !important; }
  }
}
</style>
