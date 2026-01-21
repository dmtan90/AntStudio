import { ref } from "vue";
import { defineStore } from "pinia";
import api from "@/utils/api";
import { toast } from 'vue-sonner';

export interface PexelsVideo {
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

interface PexelsVideoResponse {
  videos: PexelsVideo[];
  total_results: number;
  page: number;
  per_page: number;
  next_page?: string | boolean;
  prev_page?: string | boolean;
}

// Cache for popular videos to avoid unnecessary API calls
interface PopularVideosCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const popularVideosCache: PopularVideosCache = {
  data: null,
  timestamp: 0,
  page: 1,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;

// Function to clear the cache
const clearPopularVideosCache = () => {
  popularVideosCache.data = null;
  popularVideosCache.timestamp = 0;
  popularVideosCache.page = 1;
};

export const PIXELS_VIDEO_CATEGORIES = ["Business", "Background", "Abstract", "Birthday", "Nature", "Technology", "Animation", "Travel", "Technology Background", "Wedding", "Finance", "Holiday", "Emotion", "Food", "Family", "People", "Fashion", "Music", "Education", "Social", "Real Estate", "Health", "Animal", "Delivery", "Art", "Sport", "Life", "Color"];

/**
 * Hook for fetching and managing Pexels videos with caching support.
 */
export const usePexelsVideos = defineStore("pixelsVideos", (): any => {
  const videos = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const totalResults = ref(0);
  const currentPage = ref(1);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const fetchVideos = async (url: string) => {
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;
      videos.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch videos';
      toast.error(error.value || "Failed to fetch videos");
      videos.value = [];
    } finally {
      loading.value = false;
    }
  };

  const searchVideos = async (query: string, page = 1) => {
    const url = `/media/pexels/videos?query=${encodeURIComponent(query)}&page=${page}&per_page=15`;
    await fetchVideos(url);
  };

  const searchVideosAppend = async (query: string, page = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/pexels/videos?query=${encodeURIComponent(query)}&page=${page}&per_page=15`;
      const response = await api.get(url);
      const data = response.data;
      videos.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch videos';
      toast.error(error.value || "Failed to fetch videos");
    } finally {
      loading.value = false;
    }
  };

  const loadPopularVideos = async (page = 1) => {
    const now = Date.now();
    const isCacheValid =
      popularVideosCache.data &&
      popularVideosCache.page === page &&
      now - popularVideosCache.timestamp < CACHE_DURATION;

    if (isCacheValid && popularVideosCache.data) {
      const data = popularVideosCache.data;
      videos.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    const url = `/media/pexels/videos?page=${page}&per_page=15`;
    loading.value = true;
    error.value = null;

    try {
      const response = await api.get(url);
      const data = response.data;
      popularVideosCache.data = data;
      popularVideosCache.timestamp = now;
      popularVideosCache.page = page;

      videos.value = data.photos;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch videos';
      toast.error(error.value || "Failed to fetch videos");
      videos.value = [];
    } finally {
      loading.value = false;
    }
  };

  const loadPopularVideosAppend = async (page = 1) => {
    loading.value = true;
    error.value = null;

    try {
      const url = `/media/pexels/videos?page=${page}&per_page=15`;
      const response = await api.get(url);
      const data = response.data;
      videos.value.push(...data.photos);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message || 'Failed to fetch videos';
      toast.error(error.value || "Failed to fetch videos");
    } finally {
      loading.value = false;
    }
  };

  const clearVideos = () => {
    videos.value = [];
    error.value = null;
    totalResults.value = 0;
    currentPage.value = 1;
    hasNextPage.value = false;
    hasPrevPage.value = false;
    clearPopularVideosCache();
  };

  const refreshPopularVideos = async (page = 1) => {
    clearPopularVideosCache();
    await loadPopularVideos(page);
  };

  return {
    videos,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchVideos,
    loadPopularVideos,
    searchVideosAppend,
    loadPopularVideosAppend,
    clearVideos,
    refreshPopularVideos,
  };
}) as any;
