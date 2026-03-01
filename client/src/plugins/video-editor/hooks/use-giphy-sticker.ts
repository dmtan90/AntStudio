import { ref, computed } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

export interface GiphyGIF {
  type: "video";
  details: {
    src: string;
    frames?: number;
    background?: string;
    stream?: ReadableStream<Uint8Array>;
    blob?: Blob;
    width: number;
    height: number;
    volume?: number;
    boxShadow?: {
      color: string;
      x: number;
      y: number;
      blur: number;
    };
    transformOrigin?: string;
    crop?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    blur: number;
    brightness: number;
    flipX: boolean;
    flipY: boolean;
    rotate: string;
    visibility: "visible" | "hidden";
  };
  metadata?: {
    pexels_id: number;
    user: {
      id: number;
      name: string;
      url: string;
    };
    video_files: Array<{
      id: number;
      quality: string;
      file_type: string;
      width: number;
      height: number;
      fps: number;
      link: string;
    }>;
    video_pictures: Array<{
      id: number;
      picture: string;
      nr: number;
    }>;
  };
}

export interface GiphyResponse {
  photos: GiphyGIF[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string | boolean | null;
  prev_page?: string | boolean | null;
}

export interface GiphyStickerReturn {
  images: GiphyGIF[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchSticker: (query: string, page?: number) => Promise<void>;
  loadTrendSticker: (page?: number) => Promise<void>;
  searchStickerAppend: (query: string, page?: number) => Promise<void>;
  loadTrendStickerAppend: (page?: number) => Promise<void>;
  clearImages: () => void;
  refreshTrendSticker: (page?: number) => Promise<void>;
}

interface TrendGifCache {
  data: GiphyResponse | null;
  timestamp: number;
  page: number;
}

const trendGifCache: TrendGifCache = {
  data: null,
  timestamp: 0,
  page: 1,
};

const CACHE_DURATION = 5 * 60 * 1000;
export const STICKER_CATEGORIES = ["Actions", "Adjectives", "Animals", "Anime", "Art & Design", "Cartoons & Comics", "Celebrities", "Decades", "Emotions", "Fashion & Beauty", "Food & Drink", "Gaming", "Greetings", "Holidays", "Identity", "Interests", "Memes", "Movies", "Music", "Nature", "News & Politics", "Reactions", "Science", "Sports", "Stickers", "Transportation", "TV", "Weird"];

export const useGiphySticker = defineStore("GiphySticker", (): any => {
  const images = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalResults = ref(0);
  const currentPage = ref(0);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const clearTrendGifCache = () => {
    trendGifCache.data = null;
    trendGifCache.timestamp = 0;
    trendGifCache.page = 0;
  };

  const fetchImages = async (url: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      images.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch images";
      toast.error(error.value || "Failed to fetch images");
      images.value = [];
    } finally {
      loading.value = false;
    }
  };

  const searchSticker = async (query: string, page = 0) => {
    const url = `/media/giphy/stickers?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
    await fetchImages(url);
  };

  const searchStickerAppend = async (query: string, page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/stickers?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
      const response = await api.get(url);
      const data = response.data;

      images.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch images";
      toast.error(error.value || "Failed to fetch images");
    } finally {
      loading.value = false;
    }
  };

  const loadTrendSticker = async (page = 0) => {
    const now = Date.now();
    const isCacheValid = trendGifCache.data && trendGifCache.page === page && now - trendGifCache.timestamp < CACHE_DURATION;

    if (isCacheValid && trendGifCache.data) {
      const data = trendGifCache.data;
      images.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    const url = `/media/giphy/stickers?page=${page}&per_page=20`;
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      trendGifCache.data = data;
      trendGifCache.timestamp = now;
      trendGifCache.page = page;

      images.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch images";
      toast.error(error.value || "Failed to fetch images");
      images.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadTrendStickerAppend = async (page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/stickers?page=${page}&per_page=20`;
      const response = await api.get(url);
      const data = response.data;

      images.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch images";
      toast.error(error.value || "Failed to fetch images");
    } finally {
      loading.value = false;
    }
  };

  const clearImages = () => {
    images.value = [];
    error.value = null;
    totalResults.value = 0;
    currentPage.value = 0;
    hasNextPage.value = false;
    hasPrevPage.value = false;
    clearTrendGifCache();
  };

  const refreshTrendSticker = async (page = 0) => {
    clearTrendGifCache();
    await loadTrendSticker(page);
  };

  return {
    images,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchSticker,
    loadTrendSticker,
    searchStickerAppend,
    loadTrendStickerAppend,
    clearImages,
    refreshTrendSticker,
  };
}) as any;
