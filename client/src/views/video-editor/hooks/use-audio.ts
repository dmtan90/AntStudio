import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { toast } from 'vue-sonner';

const MUSIC_API_LIST = "https://resource.flexclip.com/json/stock/audio/stock_audio-audio-1.json";
const SOUND_API_LIST = "https://resource.flexclip.com/json/stock/audio/stock_audio-audioSoundEffect-1.json";

export interface AudioResponse {
  audios: any[];
  total_results: number;
  page: number;
  next_page: string | boolean | null;
  prev_page: string | boolean | null;
  category?: any[];
  popular?: any[];
  recently_used?: any[];
}

// Cache for curated templates to avoid unnecessary API calls
interface AudioCache {
  data: any | null;
  timestamp: number;
  page: number;
}

const soundCache: AudioCache = {
  data: null,
  timestamp: 0,
  page: 0,
};

const musicCache: AudioCache = {
  data: null,
  timestamp: 0,
  page: 0,
};

// Cache duration: 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
const LIMIT = 10;

let SOUND_DATA: any = null;
let MUSIC_DATA: any = null;

const cloneDeep = (object: any) => {
  if (!object) return null;
  return JSON.parse(JSON.stringify(object));
};

export const useAudioStore = defineStore("audioStore", (): any => {
  const sounds = ref([] as any[]);
  const musics = ref([] as any[]);
  const soundCategories = ref([] as any[]);
  const musicCategories = ref([] as any[]);
  const loading = ref(false);
  const error = ref(null as string | null);
  const totalResults = ref(0);
  const currentPage = ref(0);
  const hasNextPage = ref(false);
  const hasPrevPage = ref(false);

  const clearAudioCache = () => {
    soundCache.data = null;
    soundCache.timestamp = 0;
    soundCache.page = 0;

    musicCache.data = null;
    musicCache.timestamp = 0;
    musicCache.page = 0;
  };

  const fetchSound = async (query: string | null = null, category: string | null = null, page: number = 0) => {
    try {
      if (!SOUND_DATA) {
        const response = await fetch(SOUND_API_LIST);

        if (!response.ok) {
          throw new Error(`SOUND API error: ${response.status}`);
        }

        const data = await response.json();
        const transformedSounds = data.category.map((category: any) => {
          category.data = category.data.map((sound: any) => ({
            source: sound.preview_url,
            name: sound.title,
            thumbnail: sound.thumbnail_url,
            duration: sound.duration
          }));
          return category;
        });

        SOUND_DATA = transformedSounds;
        soundCategories.value = cloneDeep(SOUND_DATA);
      }

      const DATA = cloneDeep(SOUND_DATA);
      let categories = DATA.filter((cate: any) => {
        if (!query && !category) {
          return true;
        }

        if ((category && category == cate.cateName) || !category) {
          if (query) {
            let _query = query.toLowerCase();
            cate.data = cate.data.filter((sound: any) => {
              const name = sound.name.toLowerCase();
              return name.includes(_query);
            });
          }

          if (cate.data.length > 0) {
            return true;
          }
        }

        return false;
      });

      let audios: any[] = [];
      categories.forEach((cate: any) => {
        audios.push(...cate.data);
      });

      const totalResultsCount = audios.length;
      let start = page * LIMIT;
      let end = start + LIMIT;
      let next_page = end < totalResultsCount;

      if (end > totalResultsCount) {
        end = totalResultsCount;
      }

      if (start > totalResultsCount) {
        audios = [];
      } else {
        audios = audios.slice(start, end);
      }

      return {
        success: true,
        error: "",
        status: 200,
        data: {
          audios: audios,
          total_results: totalResultsCount,
          page: page,
          next_page: next_page,
          prev_page: page > 0,
        }
      };
    } catch (err) {
      return {
        success: false,
        error: String(err),
        status: 500,
      };
    }
  };

  const fetchMusic = async (query: string | null = null, category: string | null = null, page: number = 0) => {
    try {
      if (!MUSIC_DATA) {
        const response = await fetch(MUSIC_API_LIST);

        if (!response.ok) {
          throw new Error(`MUSIC API error: ${response.status}`);
        }

        const data = await response.json();
        const transformedSounds = data.category.map((category: any) => {
          category.data = category.data.map((sound: any) => ({
            source: sound.preview_url,
            name: sound.title,
            thumbnail: sound.thumbnail_url,
            duration: sound.duration
          }));
          return category;
        });

        MUSIC_DATA = transformedSounds;
        musicCategories.value = cloneDeep(MUSIC_DATA);
      }

      const DATA = cloneDeep(MUSIC_DATA);
      let categories = DATA.filter((cate: any) => {
        if (!query && !category) {
          return true;
        }

        if ((category && category == cate.cateName) || !category) {
          if (query) {
            let _query = query.toLowerCase();
            cate.data = cate.data.filter((sound: any) => {
              const name = sound.name.toLowerCase();
              return name.includes(_query);
            });
          }

          if (cate.data.length > 0) {
            return true;
          }
        }

        return false;
      });

      let audios: any[] = [];
      categories.forEach((cate: any) => {
        audios.push(...cate.data);
      });

      const totalResultsCount = audios.length;
      let start = page * LIMIT;
      let end = start + LIMIT;
      let next_page = end < totalResultsCount;

      if (end > totalResultsCount) {
        end = totalResultsCount;
      }

      if (start > totalResultsCount) {
        audios = [];
      } else {
        audios = audios.slice(start, end);
      }

      return {
        success: true,
        error: "",
        status: 200,
        data: {
          audios: audios,
          total_results: totalResultsCount,
          page: page,
          next_page: next_page,
          prev_page: page > 0,
        }
      };
    } catch (err) {
      return {
        success: false,
        error: String(err),
        status: 500,
      };
    }
  };

  const searchSound = async (query: string, category: string | null = null, page: number = 0, append: boolean = false) => {
    if (!append) {
      sounds.value = [];
    }
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchSound(query, category, page);
      if (!response.success || !response.data) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.data;

      sounds.value.push(...data.audios);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch sounds";
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  };

  const searchSoundAppend = async (query: string, category: string | null = null, page: number = 0) => {
    await searchSound(query, category, page, true);
  };

  const searchMusic = async (query: string, category: string | null = null, page: number = 0, append: boolean = false) => {
    if (!append) {
      musics.value = [];
    }
    loading.value = true;
    error.value = null;

    try {
      const response = await fetchMusic(query, category, page);
      if (!response.success || !response.data) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.data;

      musics.value.push(...data.audios);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch musics";
      toast.error(error.value);
    } finally {
      loading.value = false;
    }
  };

  const searchMusicAppend = async (query: string, category: string | null = null, page: number = 0) => {
    await searchMusic(query, category, page, true);
  };

  const loadSound = async (category: string | null = null, page: number = 0, append: boolean = false) => {
    if (!append) {
      sounds.value = [];
    }
    const now = Date.now();
    const isCacheValid = soundCache.data && soundCache.page === page && now - soundCache.timestamp < CACHE_DURATION;

    if (isCacheValid && soundCache.data) {
      const data = soundCache.data;
      sounds.value = data.audios;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetchSound(null, category, page);
      if (!response.success || !response.data) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.data;

      if (!append) {
        soundCache.data = data;
        soundCache.timestamp = now;
        soundCache.page = page;
      }

      sounds.value.push(...data.audios);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch sounds";
      toast.error(error.value);
      if (!append) {
        sounds.value = [];
      }
    } finally {
      loading.value = false;
    }
  };

  const loadSoundAppend = async (category: string | null = null, page: number = 0) => {
    await loadSound(category, page, true);
  };

  const loadMusic = async (category: string | null = null, page: number = 0, append: boolean = false) => {
    if (!append) {
      musics.value = [];
    }
    const now = Date.now();
    const isCacheValid = musicCache.data && musicCache.page === page && now - musicCache.timestamp < CACHE_DURATION;

    if (isCacheValid && musicCache.data) {
      const data = musicCache.data;
      musics.value = data.audios;
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
      error.value = null;
      return;
    }

    loading.value = true;
    error.value = null;

    try {
      const response = await fetchMusic(null, category, page);
      if (!response.success || !response.data) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = response.data;

      if (!append) {
        musicCache.data = data;
        musicCache.timestamp = now;
        musicCache.page = page;
      }

      musics.value.push(...data.audios);
      totalResults.value = data.total_results;
      currentPage.value = data.page;
      hasNextPage.value = !!data.next_page;
      hasPrevPage.value = !!data.prev_page;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to fetch musics";
      toast.error(error.value);
      if (!append) {
        musics.value = [];
      }
    } finally {
      loading.value = false;
    }
  };

  const loadMusicAppend = async (category: string | null = null, page: number = 0) => {
    await loadMusic(category, page, true);
  };

  const clearSound = () => {
    sounds.value = [];
    error.value = null;
    totalResults.value = 0;
    clearAudioCache();
  };

  const clearMusic = () => {
    musics.value = [];
    error.value = null;
    totalResults.value = 0;
    clearAudioCache();
  };

  const refreshSound = async () => {
    clearAudioCache();
    await loadSound();
  };

  const refreshMusic = async () => {
    clearAudioCache();
    await loadMusic();
  };

  return {
    sounds,
    musics,
    soundCategories,
    musicCategories,
    loading,
    error,
    totalResults,
    currentPage,
    hasNextPage,
    hasPrevPage,
    searchSound,
    searchSoundAppend,
    loadSound,
    loadSoundAppend,
    clearSound,
    refreshSound,
    searchMusic,
    searchMusicAppend,
    loadMusic,
    loadMusicAppend,
    clearMusic,
    refreshMusic,
  };
}) as any;
