import { ref } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

export interface EmojiImage {
  type: "image";
  id?: string;
  preview: string;
  details: {
    src: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  metadata?: any;
}

export interface UseEmojiReturn {
  icons: EmojiImage[];
  loading: boolean;
  error: string | null;
  totalResults: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchEmoji: (query: string, page?: number) => Promise<void>;
  searchEmojiAppend: (query: string, page?: number) => Promise<void>;
  loadEmoji: (page?: number) => Promise<void>;
  loadEmojiAppend: (page?: number) => Promise<void>;
  clearEmoji: () => void;
  refreshEmoji: (page?: number) => Promise<void>;
}

interface EmojiCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const emojiCache: EmojiCache = {
  data: null,
  timestamp: 0,
  page: 1,
};

const CACHE_DURATION = 5 * 60 * 1000;
export const EMOJI_CATEGORIES = ["Smileys and emotions", "People", "Animals and nature", "Food and drink", "Travel and places", "Activities and events", "Objects", "Symbols", "Flags"];

export const useEmoji = defineStore("emoji", (): any => {
  const icons = ref<EmojiImage[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalResults = ref(0);
  const currentPage = ref(0);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const clearEmojiCache = () => {
    emojiCache.data = null;
    emojiCache.timestamp = 0;
    emojiCache.page = 0;
  };

  const fetchIcons = async (url: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      icons.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch icons";
      toast.error(error.value || "Failed to fetch icons");
      icons.value = [];
    } finally {
      loading.value = false;
    }
  };

  const searchEmoji = async (query: string, page = 0) => {
    const url = `/media/giphy/emoji?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
    await fetchIcons(url);
  };

  const searchEmojiAppend = async (query: string, page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/emoji?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
      const response = await api.get(url);
      const data = response.data;

      icons.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch icons";
      toast.error(error.value || "Failed to fetch icons");
    } finally {
      loading.value = false;
    }
  };

  const loadEmoji = async (page = 0) => {
    const now = Date.now();
    const isCacheValid = emojiCache.data && emojiCache.page === page && now - emojiCache.timestamp < CACHE_DURATION;

    if (isCacheValid && emojiCache.data) {
      const data = emojiCache.data;
      icons.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    const url = `/media/giphy/emoji?page=${page}&per_page=20`;
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      emojiCache.data = data;
      emojiCache.timestamp = now;
      emojiCache.page = page;

      icons.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch icons";
      toast.error(error.value || "Failed to fetch icons");
      icons.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadEmojiAppend = async (page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/emoji?page=${page}&per_page=20`;
      const response = await api.get(url);
      const data = response.data;

      icons.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || "Failed to fetch icons";
      toast.error(error.value || "Failed to fetch icons");
    } finally {
      loading.value = false;
    }
  };

  const clearEmoji = () => {
    icons.value = [];
    error.value = null;
    totalResults.value = 0;
    currentPage.value = 0;
    hasNextPage.value = false;
    hasPrevPage.value = false;
    clearEmojiCache();
  };

  const refreshEmoji = async (page = 0) => {
    clearEmojiCache();
    await loadEmoji(page);
  };

  return {
    icons,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchEmoji,
    searchEmojiAppend,
    loadEmoji,
    loadEmojiAppend,
    clearEmoji,
    refreshEmoji,
  };
}) as any;
