<script setup lang="ts">
import { computed, ref } from 'vue';
import { useMutation } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';

import { Plus, Search, Close as X, ArrowLeft as Left, Voice, Pic, VideoOne, TextMessage, Transform, DistributeVertically, Magic, Focus, Scan, FaceRecognition } from '@icon-park/vue-next';
import { ElButton, ElInput, ElTabs, ElTabPane } from 'element-plus';
import Label from 'video-editor/components/ui/label.vue';

import { useEditorStore } from 'video-editor/store/editor';
import { createAdsFromPrompt as createAdsFromPromptApi } from 'video-editor/api/prompt';
import { PromptSession } from 'video-editor/types/prompt';
import { cn } from 'video-editor/lib/utils';
import { getFileUrl } from '@/utils/api';
import ExpandedAiView from './ExpandedAiView.vue';

const editor = useEditorStore();

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
      <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
         <h2 class="font-bold text-sm tracking-wider uppercase text-white/90 flex items-center gap-2">
            <span
               class="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
            Gemini AI
         </h2>
         <button
            class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            @click="editor.setActiveSidebarLeft(null)">
            <X :size="16" />
         </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto custom-scrollbar">
         <!-- Breadcrumb / Header when expanded -->
         <div v-if="expanded"
            class="px-5 py-4 border-b border-white/5 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-xl z-20">
            <div class="flex items-center gap-2 px-1 py-1 bg-white/5 border border-white/5 rounded-lg">
               <button
                  class="text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors px-2 flex items-center gap-1"
                  @click="expanded = false">
                  <Left theme="outline" size="12" /> Tools
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
               <div class="relative z-10">
                  <h3 class="text-sm font-bold text-white/90 uppercase tracking-widest mb-1">Creative Suite</h3>
                  <p class="text-[10px] font-medium text-white/40 uppercase tracking-wider leading-relaxed">Power your
                     workflow with Google's most capable AI models.</p>
               </div>

               <div class="absolute right-[-10px] top-[-10px] w-20 h-20 bg-brand-primary/10 blur-[40px] rounded-full">
               </div>
            </div>

            <div class="grid grid-cols-1 gap-4 pt-2">
               <button @click="expanded = 'voice'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <voice theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Voice
                        Generation</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Text-to-speech
                        with emotive AI</span>
                  </div>
               </button>

               <button @click="expanded = 'image'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-pink-400 transition-colors uppercase tracking-wider">Image
                        Generation</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Generate
                        production-ready assets</span>
                  </div>
               </button>

               <button @click="expanded = 'video'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-blue-500/20">
                     <video-one theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-blue-400 transition-colors uppercase tracking-wider">Video
                        Generation</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Create video
                        clips from prompts</span>
                  </div>
               </button>

               <button @click="expanded = 'caption'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <text-message theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Caption
                        Generation</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Auto-generate
                        subtitles</span>
                  </div>
               </button>

               <button @click="expanded = 'scene-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">Scene
                        Detection</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Auto-split video
                        into scenes</span>
                  </div>
               </button>

               <button @click="expanded = 'auto-cut'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <voice theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Auto-cut
                        to Beat</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Sync scenes with
                        audio rhythm</span>
                  </div>
               </button>

               <button @click="expanded = 'smart-trim'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <video-one theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Smart
                        Trim</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Remove silent
                        gaps
                        automatically</span>
                  </div>
               </button>

               <button @click="expanded = 'background-removal'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-indigo-500/20">
                     <pic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-indigo-400 transition-colors uppercase tracking-wider">Background
                        Removal</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Remove image
                        background</span>
                  </div>
               </button>

               <div class="grid grid-cols-2 gap-2 w-full">
                  <button @click="expanded = 'upscale'"
                     class="group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center gap-2">
                     <div
                        class="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                        <transform theme="filled" size="18" />
                     </div>
                     <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">Upscale</span>
                  </button>

                  <button @click="expanded = 'denoise'"
                     class="group p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] transition-all duration-300 flex flex-col items-center gap-2">
                     <div
                        class="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-violet-500/20">
                        <distribute-vertical theme="filled" size="18" />
                     </div>
                     <span class="text-[10px] font-bold text-white/90 uppercase tracking-wider">Denoise</span>
                  </button>
               </div>

               <button @click="expanded = 'vectorizer'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <magic theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Image
                        Vectorizer</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Convert images to
                        SVG</span>
                  </div>
               </button>

               <button @click="expanded = 'auto-reframe'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-emerald-500/20">
                     <focus theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-emerald-400 transition-colors uppercase tracking-wider">Auto-reframe</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Focus video on
                        subjects</span>
                  </div>
               </button>

               <button @click="expanded = 'object-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-orange-500/20">
                     <scan theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-orange-400 transition-colors uppercase tracking-wider">Object
                        Tracking</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Track and query
                        objects</span>
                  </div>
               </button>

               <button @click="expanded = 'face-detection'"
                  class="group w-full p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/5 transition-all duration-300 flex flex-row items-center gap-4">
                  <div
                     class="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 border border-pink-500/20">
                     <face-recognition theme="filled" size="18" />
                  </div>
                  <div class="flex flex-col items-start translate-y-[-1px]">
                     <span
                        class="text-xs font-bold text-white/90 group-hover:text-pink-400 transition-colors uppercase tracking-wider">Face
                        Blur</span>
                     <span class="text-[9px] font-bold text-white/20 uppercase tracking-widest mt-0.5">Auto-blur
                        faces</span>
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
