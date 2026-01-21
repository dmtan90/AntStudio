import { ref } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

export interface PexelsImage {
  type: "image";
  details: {
    src: string;
    background: string;
    width: number;
    height: number;
    opacity: number;
    transform: string;
    border: string;
    borderRadius: number;
    boxShadow: {
      color: string;
      x: number;
      y: number;
      blur: number;
    };
    top: string;
    left: string;
    transformOrigin: string;
    crop: {
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
    avg_color: string;
    original_url: string;
  };
}

export interface PexelsResponse {
  photos: PexelsImage[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string | boolean;
  prev_page?: string | boolean;
}

// Cache for curated images to avoid unnecessary API calls
interface CuratedImagesCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const curatedImagesCache: CuratedImagesCache = {
  data: null,
  timestamp: 0,
  page: 1,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

export const PIXELS_IMAGE_CATEGORIES = ["Business", "Gradient Photo Background", "Fashion", "Technology", "Photo Background", "Real Estate", "Animal", "Entertainment", "Music", "Event", "Nature", "Sport", "Education", "Travel", "Celebration", "Food", "Photography", "Kids", "Transportation", "Art", "Wedding", "Industrial"];

export const usePexelsImages = defineStore("pixelsImages", (): any => {
  const images = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalResults = ref(0);
  const currentPage = ref(1);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const clearCuratedImagesCache = () => {
    curatedImagesCache.data = null;
    curatedImagesCache.timestamp = 0;
    curatedImagesCache.page = 1;
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

  const searchImages = async (query: string, page = 1) => {
    const url = `/media/pexels/images?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
    await fetchImages(url);
  };

  const searchImagesAppend = async (query: string, page = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/pexels/images?query=${encodeURIComponent(query)}&page=${page}&per_page=20`;
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

  const loadCuratedImages = async (page = 1) => {
    const now = Date.now();
    const isCacheValid = curatedImagesCache.data && curatedImagesCache.page === page && now - curatedImagesCache.timestamp < CACHE_DURATION;

    if (isCacheValid && curatedImagesCache.data) {
      const data = curatedImagesCache.data;
      images.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    const url = `/media/pexels/images?page=${page}&per_page=20`;
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;

      curatedImagesCache.data = data;
      curatedImagesCache.timestamp = now;
      curatedImagesCache.page = page;

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

  const loadCuratedImagesAppend = async (page = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/pexels/images?page=${page}&per_page=20`;
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
    currentPage.value = 1;
    hasNextPage.value = false;
    hasPrevPage.value = false;
    clearCuratedImagesCache();
  };

  const refreshCuratedImages = async (page = 1) => {
    clearCuratedImagesCache();
    await loadCuratedImages(page);
  };

  return {
    images,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchImages,
    loadCuratedImages,
    searchImagesAppend,
    loadCuratedImagesAppend,
    clearImages,
    refreshCuratedImages,
  };
}) as any;
