<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted } from "vue";
import { storeToRefs } from "pinia";
import { useEditorStore } from 'video-editor/store/editor';
import { abstract, basic, frames } from 'video-editor/constants/elements';
import { isImageLoaded } from 'video-editor/lib/utils';
import { useGiphyGIFs } from 'video-editor/hooks/use-giphy-gifs';
import { useGiphySticker } from 'video-editor/hooks/use-giphy-sticker';
import { useEmoji } from 'video-editor/hooks/use-emoji';
import { toast } from 'vue-sonner';

const props = defineProps<{ match: string, query: string | null }>();

const editor = useEditorStore();
const gifsStore = useGiphyGIFs() as any;
const stickerStore = useGiphySticker() as any;
const emojiStore = useEmoji() as any;
const { images: gifs, loading: gifsLoading, hasNextPage: gifsHasNextPage, currentPage: gifCurrentPage } = storeToRefs(gifsStore) as any;
const { images: stickers, loading: stickerLoading, hasNextPage: stickerHasNextPage, currentPage: stickerCurrentPage } = storeToRefs(stickerStore) as any;
const { icons, loading: emojiLoading, hasNextPage: emojiHasNextPage, currentPage: emojiCurrentPage } = storeToRefs(emojiStore) as any;

const onAddBasicShape = (klass: string, params: any) => {
  (editor.canvas as any).onAddBasicShape(klass, params);
};

const onAddAbstractShape = (path: string, name: string) => {
  (editor.canvas as any).onAddAbstractShape(path, name);
};

const onAddGiphyVideo = (source: string, thumbnail: string) => {
  if (((editor.canvas as any).replacer.active as any)?.type === "gif") {
    const promise = (editor.canvas as any).replacer.replace(source, true);
    toast.promise(promise, { loading: "The gif is being replaced...", success: "The gif has been replaced", error: "Ran into an error while replacing the gif" });
  } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddGifFromSource(source);
    toast.promise(promise, { loading: "The gif asset is being loaded...", success: "The gif asset has been added to artboard", error: "Ran into an error adding the gif asset" });
  } else {
    toast.promise((editor.canvas as any).onAddGifFromThumbnail(source, thumbnail), { error: "Ran into an error adding the gif asset" });
  }
};

const onAddEmoji = (source: string, thumbnail: string, preload?: boolean) => {
  if (((editor.canvas as any).replacer.active as any)?.type === "gif") {
    const promise = (editor.canvas as any).replacer.replace(source, true);
    toast.promise(promise, { loading: "The emoji is being replaced...", success: "The emoji has been replaced", error: "Ran into an error while replacing the emoji" });
  } else if (!thumbnail || !isImageLoaded(thumbnail as any)) {
    const promise = (editor.canvas as any).onAddGifFromSource(source);
    toast.promise(promise, { loading: "The emoji is being loaded...", success: "The emoji has been added to artboard", error: "Ran into an error while adding the emoji" });
  } else {
    const promise = (editor.canvas as any).onAddGifFromThumbnail(source, thumbnail);
    toast.promise(promise, { error: "Ran into an error while adding the emoji" });
  }
};

onMounted(() => {
  if (props.match == "gifs") {
    (gifsStore as any).loadTrendGifs();
  }
  else if (props.match == "sticker") {
    (stickerStore as any).loadTrendSticker();
  }
  else if (props.match == "emoji") {
    (emojiStore as any).loadEmoji();
  }
});

const handleLoadMore = () => {
  console.log("handleLoadMore => GIPHY");
  if (props.match == "gifs") {
    if ((gifsLoading as any).value || !(gifsHasNextPage as any).value) {
      return;
    }

    const nextPage = (gifCurrentPage as any).value + 1;
    if (props.query) {
      (gifsStore as any).searchGifsAppend(props.query, nextPage);
    }
    else {
      (gifsStore as any).loadTrendGifsAppend(nextPage);
    }
  }
  else if (props.match == "sticker") {
    if ((stickerLoading as any).value || !(stickerHasNextPage as any).value) {
      return;
    }

    const nextPage = (stickerCurrentPage as any).value + 1;
    if (props.query) {
      (stickerStore as any).searchStickerAppend(props.query, nextPage);
    }
    else {
      (stickerStore as any).loadTrendStickerAppend(nextPage);
    }
  }
  else if (props.match == "emoji") {
    if ((emojiLoading as any).value || !(emojiHasNextPage as any).value) {
      return;
    }

    const nextPage = (emojiCurrentPage as any).value + 1;
    if (props.query) {
      (emojiStore as any).searchEmojiAppend(props.query, nextPage);
    }
    else {
      (emojiStore as any).loadEmojiAppend(nextPage);
    }
  }
}

const handleResetData = () => {
  console.log("handleResetData => GIPHY");
  if (props.match == "gifs") {
    if ((gifsLoading as any).value) {
      return;
    }

    const nextPage = 0;
    if (props.query) {
      (gifsStore as any).searchGifs(props.query, nextPage);
    }
    else {
      (gifsStore as any).loadTrendGifs(nextPage);
    }
  }
  else if (props.match == "sticker") {
    if ((stickerLoading as any).value) {
      return;
    }

    const nextPage = 0;
    if (props.query) {
      (stickerStore as any).searchSticker(props.query, nextPage);
    }
    else {
      (stickerStore as any).loadTrendSticker(nextPage);
    }
  }
  else if (props.match == "emoji") {
    if ((emojiLoading as any).value) {
      return;
    }
    const page = 0;
    if (props.query) {
      (emojiStore as any).searchEmoji(props.query, page);
    }
    else {
      (emojiStore as any).loadEmoji(page);
    }
  }
};

defineExpose({
  loadMore: handleLoadMore,
  resetData: handleResetData
})

</script>

<template>
  <template v-if="match === 'basic'">
    <button
      v-for="({ name, path, klass, params }) in basic"
      :key="name"
      @click="onAddBasicShape(klass, params)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg viewBox="0 0 48 48" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'abstract'">
    <button
      v-for="({ name, path, height, width, id }) in abstract"
      :key="id"
      @click="onAddAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-else-if="match === 'frames'">
    <button
      v-for="({ name, path, height, width, id }) in frames"
      :key="id"
      @click="onAddAbstractShape(path, name)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg p-2 text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100"
    >
      <svg :viewBox="`0 0 ${width} ${height}`" :aria-label="name" fill="currentColor" class="h-full w-full transition-transform group-hover:scale-105">
        <path :d="path" class="h-full" />
      </svg>
    </button>
  </template>

  <template v-if="match === 'gifs'">
    <button v-for="({ preview, details: { src } }, index) in gifs" :key="preview" 
      @click="onAddGiphyVideo(src, preview)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>

  <template v-if="match === 'sticker'">
    <button v-for="({ preview, details: { src } }, index) in stickers" :key="preview" 
      @click="onAddGiphyVideo(src, preview)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <img :src="preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>

  <template v-if="match === 'emoji'">
    <button v-for="({ preview, details: { src } }, index) in icons" :key="preview" 
      @mouseover="icons[index].play = true" @mouseleave="icons[index].play = false"
      @click="onAddEmoji(src, preview)"
      class="group shrink-0 w-full aspect-square border flex items-center justify-center overflow-hidden rounded-lg text-gray-800/80 dark:text-gray-100/80 transition-colors shadow-sm hover:bg-card hover:text-gray-800 dark:hover:text-gray-100">
      <img :src="icons[index].play ? src : preview" crossOrigin="anonymous" class="h-full w-full rounded-md transition-transform group-hover:scale-110 object-cover" />
    </button>
  </template>

</template>
