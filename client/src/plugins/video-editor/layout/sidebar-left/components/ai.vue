<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search, Close as X, ArrowLeft as Left, 
   Voice, Pic, VideoOne, TextMessage, Transform, 
   DistributeVertically, Magic, Focus, Scan, 
   FaceRecognition, Translate, TrendingUp, TypeDrive, 
   Diamond, Analysis as DataAnalysis, Google as BrandPalette,
   Music 
} from '@icon-park/vue-next';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { createAdsFromPrompt as createAdsFromPromptApi } from 'video-editor/api/prompt';
import { PromptSession } from 'video-editor/types/prompt';
import { cn } from 'video-editor/lib/utils';
import { getFileUrl } from '@/utils/api';
import ExpandedAiView from './ExpandedAiView.vue';

const editor = useEditorStore();
const { t } = useI18n();

// const format = ref("banner");
// const prompt = ref("Generate an ad for Nike Running Shoes");

// const createAdsFromPrompt = useMutation({
//   mutationFn: async ({ prompt, format }: { prompt: string; format: string }) => {
//     const result = await createAdsFromPromptApi(prompt, format);
//     await editor.prompter.createSceneFromPromptSession(result);
//   },
// });

// const handleCreateVideo = () => {
//   const promise = createAdsFromPrompt.mutateAsync({ prompt: prompt.value, format: format.value });
//   toast.promise(promise, { loading: "Generating your video ads...", success: "Your video ads is generated", error: "Ran into an error while generating your ads" });
// };

const expanded = ref<false | string>(false);

</script>

<template>
   <div class="h-full w-full flex flex-col cinematic-panel">
      <!-- Header -->
      <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5 shrink-0">
         <h2 class="font-bold text-sm tracking-wider uppercase text-white/90 flex items-center gap-2">
            <span
               class="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            {{ t('videoEditor.ai.title') }}
         </h2>
         <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            @click="editor.setActiveSidebarLeft(null)">
            <X :size="16" />
         </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar sidebar-container">
         <!-- Breadcrumb / Header when expanded -->
         <div v-if="expanded"
            class="px-5 py-4 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-20">
            <div class="flex items-center gap-2 px-1 py-1 bg-white/5 border border-white/5 rounded-lg">
               <button
                  class="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors px-2 flex items-center gap-1"
                  @click="expanded = false">
                  <Left theme="outline" size="12" /> {{ t('videoEditor.ai.breadcrumbTools') }}
               </button>
               <span class="text-white/20 text-[10px] items-center flex">/</span>
               <span
                  class="text-[10px] font-bold uppercase tracking-widest text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-md border border-brand-secondary/20">{{
                     expanded }}</span>
            </div>
         </div>

         <div class="p-5 flex flex-col gap-6" v-if="!expanded">

            <!-- Welcome / Banner -->
            <div
               class="p-5 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent border border-white/5 relative overflow-hidden group">
               <div
                  class="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700">
               </div>
               <div class="relative z-10 text-center">
                  <h3 class="text-sm font-bold text-white/90 uppercase tracking-widest mb-1">{{ t('videoEditor.ai.creativeSuite') }}</h3>
                   <p class="text-[10px] font-medium text-white/40 uppercase tracking-wider leading-relaxed">{{ t('videoEditor.ai.creativeSuiteDesc') }}</p>
               </div>

               <div class="absolute right-[-10px] top-[-10px] w-20 h-20 bg-brand-primary/10 blur-[40px] rounded-full">
               </div>
            </div>

            <div class="grid grid-cols-1 gap-4 pt-2">
               <button @click="expanded = 'voice'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <voice theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.voiceGeneration') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.voiceGenerationDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'image'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-pink-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.imageGeneration') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.imageGenerationDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'video'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                     <video-one theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-blue-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.videoGeneration') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.videoGenerationDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'caption'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <text-message theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.captionGeneration') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.captionGenerationDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'music'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-cyan-500/20">
                     <Music theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-cyan-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.musicGeneration') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.musicGenerationDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'storyboard'"
                  class="group w-full p-4 rounded-xl border border-brand-primary/20 bg-brand-primary/5 hover:bg-brand-primary/10 hover:border-brand-primary/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-brand-primary/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-brand-primary/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-brand-primary/20 relative z-10">
                     <Magic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-brand-primary transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.aiCreativeDirector') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.aiCreativeDirectorDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'avatars'"
                  class="group w-full p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 relative z-10">
                     <FaceRecognition theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.aiTalkingHeads') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.aiTalkingHeadsDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'highlights'"
                  class="group w-full p-4 rounded-xl border border-orange-500/20 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20 relative z-10">
                     <TrendingUp theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.viralHighlights') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.viralHighlightsDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'typography'"
                  class="group w-full p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:bg-blue-500/10 hover:border-blue-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/20 relative z-10">
                     <TypeDrive theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-blue-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.kineticTypography') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.kineticTypographyDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'enrichment'"
                  class="group w-full p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 hover:border-rose-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-rose-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-rose-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-rose-500/20 relative z-10">
                     <Diamond theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-rose-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.visualEnrichment') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.visualEnrichmentDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'analytics'"
                  class="group w-full p-4 rounded-xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 hover:border-violet-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-violet-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/20 relative z-10">
                     <DataAnalysis theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-violet-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.aiAnalytics') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.aiAnalyticsDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'brand'"
                  class="group w-full p-4 rounded-xl border border-fuchsia-500/20 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-fuchsia-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-fuchsia-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-fuchsia-500/20 relative z-10">
                     <BrandPalette theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-fuchsia-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.brandKit') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.brandKitDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'dubbing'"
                  class="group w-full p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 hover:border-indigo-500/40 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 flex flex-row items-center gap-4 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent"></div>
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20 relative z-10">
                     <Translate theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] relative z-10 text-center">
                      <span
                         class="text-xs font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-[0.15em]">{{ t('videoEditor.ai.aiDubbing') }}</span>
                      <span class="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.aiDubbingDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'scene-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.sceneDetection') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.sceneDetectionDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'auto-cut'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <voice theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.autoCut') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.autoCutDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'smart-trim'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <video-one theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.smartTrim') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.smartTrimDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'background-removal'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.backgroundRemoval') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.backgroundRemovalDesc') }}</span>
                  </div>
               </button>

               <div class="grid grid-cols-2 gap-2 w-full">
                  <button @click="expanded = 'upscale'"
                     class="group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center gap-2">
                     <div
                        class="w-10 h-10 pl-4 pr-4 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                        <transform theme="filled" size="18" />
                     </div>
                      <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ t('videoEditor.ai.upscale') }}</span>
                  </button>

                  <button @click="expanded = 'denoise'"
                     class="group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center gap-2">
                     <div
                        class="w-10 h-10 pl-4 pr-4 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                        <distribute-vertically theme="filled" size="18" />
                     </div>
                      <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">{{ t('videoEditor.ai.denoise') }}</span>
                  </button>
               </div>

               <button @click="expanded = 'vectorizer'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <magic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.imageVectorizer') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.imageVectorizerDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'auto-reframe'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <focus theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.autoReframe') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.autoReframeDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'object-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <scan theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.objectTracking') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.objectTrackingDesc') }}</span>
                  </div>
               </button>

               <button @click="expanded = 'face-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 pl-4 pr-4 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                     <face-recognition theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-center translate-y-[-1px] text-center">
                      <span
                         class="text-xs font-bold text-white/90 group-hover:text-pink-400 transition-colors uppercase tracking-wider">{{ t('videoEditor.ai.faceBlur') }}</span>
                      <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">{{ t('videoEditor.ai.faceBlurDesc') }}</span>
                  </div>
               </button>
            </div>
         </div>

         <div v-else class="h-full flex flex-col">
            <ExpandedAiView :match="expanded" />
         </div>
      </div>
   </div>
</template>
