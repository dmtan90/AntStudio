<script setup lang="ts">
import { computed, ref, shallowRef, onMounted, nextTick, watch } from 'vue';
import { Search, Close as X, ArrowLeft as Left } from '@icon-park/vue-next';
import { abstract, basic, frames, lines } from 'video-editor/constants/elements';
import { useEditorStore } from 'video-editor/store/editor';
import { useGiphyGIFs, GIFS_CATEGORIES } from 'video-editor/hooks/use-giphy-gifs';
import { useGiphySticker, STICKER_CATEGORIES } from 'video-editor/hooks/use-giphy-sticker';
import { useEmoji, EMOJI_CATEGORIES } from 'video-editor/hooks/use-emoji';
import { cn } from 'video-editor/lib/utils';
import { getFileUrl } from '@/utils/api'
import { storeToRefs } from "pinia";
import { isImageLoaded } from 'video-editor/lib/utils';
import { toast } from 'vue-sonner';
import bar from 'video-editor/assets/editor/charts/bar.svg';
import line from 'video-editor/assets/editor/charts/bar.svg';
import pie from 'video-editor/assets/editor/charts/bar.svg';
import ExpandedElementView from './ExpandedElementView.vue';

const editor = useEditorStore();
const gifsStore = useGiphyGIFs() as any;
const stickerStore = useGiphySticker() as any;
const emojiStore = useEmoji() as any;
const { images: gifs } = storeToRefs(gifsStore) as any;
const { images: stickers  } = storeToRefs(stickerStore) as any;
const { icons } = storeToRefs(emojiStore) as any;
const container = ref<HTMLElement | null>(null);
const query = ref<string | null>(null);
const expanded = ref<false | string>(false);
const refExpand = ref<any>(null);
const categories = ref<any[]>([]);

const onAddBasicShape = (klass: string, params: any) => {
  (editor.canvas as any).onAddBasicShape(klass, params);
};

const onAddAbstractShape = (path: string, name: string) => {
  (editor.canvas as any).onAddAbstractShape(path, name);
};

const onAddLine = (points: number[], name: string) => {
  (editor.canvas as any).onAddLine(points, name);
};

const onAddGiphyVideo = async (source: string, thumbnail: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (((editor.canvas as any).replacer.active as any)?.type === "gif") {
      const promise = (editor.canvas as any).replacer.replace(resolvedSource, true);
      toast.promise(promise, { loading: "The gif is being replaced...", success: "The gif has been replaced", error: "Ran into an error while replacing the gif" });
    } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = (editor.canvas as any).onAddGifFromSource(resolvedSource);
      toast.promise(promise, { loading: "The gif asset is being loaded...", success: "The gif asset has been added to artboard", error: "Ran into an error adding the gif asset" });
    } else {
      toast.promise((editor.canvas as any).onAddGifFromThumbnail(resolvedSource, thumbnail), { error: "Ran into an error adding the gif asset" });
    }
  } catch (error) {
    console.error('Failed to resolve gif source:', error);
    toast.error("Failed to load gif asset");
  }
};

const onAddEmoji = async (source: string, thumbnail: string) => {
  try {
    const resolvedSource = await getFileUrl(source, { cached: true });

    if (((editor.canvas as any).replacer.active as any)?.type === "gif") {
      const promise = (editor.canvas as any).replacer.replace(resolvedSource, true);
      toast.promise(promise, { loading: "The emoji is being replaced...", success: "The emoji has been replaced", error: "Ran into an error while replacing the emoji" });
    } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
      const promise = (editor.canvas as any).onAddGifFromSource(resolvedSource);
      toast.promise(promise, { loading: "The emoji is being loaded...", success: "The emoji has been added to artboard", error: "Ran into an error while adding the emoji" });
    } else {
      const promise = (editor.canvas as any).onAddGifFromThumbnail(resolvedSource, thumbnail);
      toast.promise(promise, { error: "Ran into an error while adding the emoji" });
    }
  } catch (error) {
    console.error('Failed to resolve emoji source:', error);
    toast.error("Failed to load emoji asset");
  }
};

const addChart = (type: string) => {
  (editor.canvas as any).chart.add(type as any);
};

onMounted(() => {
  gifsStore.loadTrendGifs();
  stickerStore.loadTrendSticker();
  emojiStore.loadEmoji();
});

const handleLoadMore = () => {
  if(refExpand.value && refExpand.value.loadMore){
    nextTick(() => {
      refExpand.value?.loadMore();
    })
  }
}

const handleResetData = () => {
  if(refExpand.value && refExpand.value.resetData){
    nextTick(() => {
      refExpand.value?.resetData();
    })
  }
};

const handleSearchElement = (search) => {
  if(query.value == search){
    return;
  }
  console.log("handleSearchElement", search);
  query.value = search;
  handleResetData();
}

const onBack = () => {
  expanded.value = false;
  query.value = null;
}

watch(expanded, (value) => {
  if(!value){
    categories.value = [];
  }
  else if(value == "gifs"){
    categories.value = GIFS_CATEGORIES;
  }
  else if(value == "sticker"){
    categories.value = STICKER_CATEGORIES;
  }
  else if(value == "emoji"){
    categories.value = EMOJI_CATEGORIES;
  }
});

</script>

<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Elements</h2>
      <button class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>

    <!-- Expanded Search Header -->
    <div class="px-5 pt-4 pb-2" v-if="expanded">
      <div class="flex gap-2 mb-3">
         <button class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5 bg-white/5" @click="onBack">
            <Left :size="14" />
         </button>
         <el-input v-model="query" placeholder="Search elements..." class="cinematic-input flex-1" @change="handleResetData">
            <template #prefix>
             <Search :size="15" class="text-white/40" />
            </template>
        </el-input>
      </div>

      <el-scrollbar class="pb-2 scrollbar-hidden">
        <div class="flex gap-2">
          <button 
             class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap"
             :class="[!query ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white']"
             @click='handleSearchElement(null)'>
             Popular
          </button>
          <template v-for="item in categories" :key="item">
             <button 
                class="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border capitalize whitespace-nowrap"
                :class="[query == item ? 'bg-brand-primary text-white border-brand-primary shadow-lg shadow-brand-primary/20' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10 hover:text-white']"
                @click='handleSearchElement(item)'>
                {{ item }}
             </button>
          </template>
        </div>
      </el-scrollbar>
    </div>

    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container pb-4 pt-2" @scrollend="handleLoadMore">
      <template v-if="!expanded">
        <div class="px-5 flex flex-col gap-6 pt-2">
          
          <!-- Basic Shapes -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Basic Shapes</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'basic'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <button
                v-for="({ name, path, klass, params }) in basic.slice(0, 10)"
                :key="name"
                @click="onAddBasicShape(klass, params)"
                class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 text-white/60 transition-all shadow-sm hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105"
              >
                <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-110">
                  <path :d="path" class="h-full" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Abstract Shapes -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Abstract Shapes</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'abstract'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <button
                v-for="({ name, path, height, width, id }) in abstract.slice(0, 10)"
                :key="id"
                @click="onAddAbstractShape(path, name)"
                class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 text-white/60 transition-all shadow-sm hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105"
              >
                <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-110">
                  <path :d="path" class="h-full" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Frames -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Frames</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'frames'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <button
                v-for="({ name, path, height, width, id }) in frames.slice(0, 10)"
                :key="id"
                @click="onAddAbstractShape(path, name)"
                class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 text-white/60 transition-all shadow-sm hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105"
              >
                <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-110">
                  <path :d="path" class="h-full" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Lines -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
             <div class="flex items-center justify-between">
               <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Lines</h4>
             </div>
             <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
               <button
                 v-for="({ name, path, points }) in lines"
                 :key="name"
                 @click="onAddLine(points, name)"
                 class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl p-3 text-white/60 transition-all shadow-sm hover:bg-white/10 hover:text-white hover:border-white/20 hover:scale-105"
               >
                 <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-110">
                   <path :d="path" class="h-full" />
                 </svg>
               </button>
             </div>
           </div>

          <!-- GIFs -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">GIFs</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'gifs'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="gifs.length">
                <button v-for="({ preview, details: { src } }) in gifs.slice(0, 5)" :key="preview" @click="onAddGiphyVideo(src, preview)" class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                  <img :src="getFileUrl(preview)" crossOrigin="anonymous" class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
                </button>
              </template>
              <template v-else>
                <el-skeleton v-for="(_, index) in 5" :key="index" animated class="h-16 w-16 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>

          <!-- Stickers -->
          <div class="flex flex-col gap-4 border-b border-white/5 pb-6">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Stickers</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'sticker'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="stickers.length">
                <button v-for="({ preview, details: { src } }) in stickers.slice(0, 5)" :key="preview" @click="onAddGiphyVideo(src, preview)" class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                  <img :src="getFileUrl(preview)" crossOrigin="anonymous" class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
                </button>
              </template>
              <template v-else>
                 <el-skeleton v-for="(_, index) in 5" :key="index" animated class="h-16 w-16 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>

          <!-- Emoji -->
          <div class="flex flex-col gap-4">
            <div class="flex items-center justify-between">
              <h4 class="text-[10px] font-bold text-white/40 uppercase tracking-widest">Emoji</h4>
              <button class="text-[10px] font-bold text-brand-primary hover:text-white transition-colors" @click="expanded = 'emoji'">
                See All
              </button>
            </div>
            <div class="flex gap-3 items-center overflow-x-auto scrollbar-hidden relative pb-2 fade-mask-r">
              <template v-if="icons.length">
                <button v-for="({ preview, details: { src } }) in icons.slice(0, 5)" :key="preview" @click="onAddEmoji(src, preview)" class="group shrink-0 h-16 w-16 border border-white/5 bg-white/5 flex items-center justify-center overflow-hidden rounded-xl shadow-sm hover:border-white/20 hover:bg-white/10 transition-all">
                  <img :src="getFileUrl(src)" crossOrigin="anonymous" class="h-full w-full transition-transform group-hover:scale-110 object-cover opacity-80 group-hover:opacity-100" />
                </button>
              </template>
              <template v-else>
                 <el-skeleton v-for="(_, index) in 5" :key="index" animated class="h-16 w-16 shrink-0 rounded-xl !bg-white/5" />
              </template>
            </div>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="px-5 grid grid-cols-3 gap-4 pt-4 pb-10">
          <ExpandedElementView :match="expanded" :query="query" ref="refExpand"/>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.fade-mask-r {
    mask-image: linear-gradient(to right, black 0%, black 90%, transparent 100%);
}
</style>