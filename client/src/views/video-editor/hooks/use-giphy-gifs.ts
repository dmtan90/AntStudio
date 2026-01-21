import { ref, computed } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

// Cache for curated images to avoid unnecessary API calls
interface TrendGifCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const trendGifCache: TrendGifCache = {
  data: null,
  timestamp: 0,
  page: 1,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const GIFS_CATEGORIES = ["Actions", "Adjectives", "Animals", "Anime", "Art & Design", "Cartoons & Comics", "Celebrities", "Decades", "Emotions", "Fashion & Beauty", "Food & Drink", "Gaming", "Greetings", "Holidays", "Identity", "Interests", "Memes", "Movies", "Music", "Nature", "News & Politics", "Reactions", "Science", "Sports", "Stickers", "Transportation", "TV", "Weird"];

export const useGiphyGIFs = defineStore("GiphyGIF", (): any => {
  const images = ref([] as any[]);
  const loading = ref(false);
  const error = ref(null as string | null);
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

  const searchGifs = async (query: string, page = 0) => {
    const url = `/media/giphy/gifs?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
    await fetchImages(url);
  };

  const searchGifsAppend = async (query: string, page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/gifs?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
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

  const loadTrendGifs = async (page = 0) => {
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

    const url = `/media/giphy/gifs?page=${page}&per_page=20`;
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

  const loadTrendGifsAppend = async (page = 0) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/giphy/gifs?page=${page}&per_page=20`;
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

  const refreshTrendGifs = async (page = 0) => {
    clearTrendGifCache();
    await loadTrendGifs(page);
  };

  return {
    images,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchGifs,
    loadTrendGifs,
    searchGifsAppend,
    loadTrendGifsAppend,
    clearImages,
    refreshTrendGifs,
  };
}) as any;
