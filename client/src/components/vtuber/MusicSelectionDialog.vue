<template>
  <el-dialog 
    v-model="visible" 
    :title="t('vtubers.music.title')"
    width="900px"
    class="music-dialog"
  >
    <div class="music-content">
      <!-- Unified Header: Search + Region -->
      <div class="flex flex-col md:flex-row gap-4 mb-6 mt-2">
        <div class="flex-1">
          <el-input 
            v-model="searchQuery"
            :placeholder="t('vtubers.music.searchPlaceholder')"
            size="large"
            clearable
            @keyup.enter="handleSearch"
            @clear="handleSearchClear"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
            <!-- <template #append>
              <el-button @click="handleSearch" :loading="searching">
                SEARCH
              </el-button>
            </template> -->
          </el-input>
        </div>

        <div v-if="!searchQuery" class="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-xl border border-white/10">
          <span class="text-[10px] font-black uppercase tracking-widest text-white/40">{{ t('vtubers.music.trending') }}</span>
          <el-select v-model="trendingRegion" size="small" @change="fetchTrending" class="w-32">
            <el-option v-for="(name, code) in t('vtubers.music.regions')" :key="code" :label="name" :value="String(code).toUpperCase()" />
          </el-select>
          <el-button size="small" link @click="fetchTrending" :loading="trendingLoading" class="p-0">
            <refresh theme="outline" size="14" />
          </el-button>
        </div>
      </div>

      <!-- Search Filters (Collapsible or subtle) -->
      <div v-if="searchQuery" class="flex flex-wrap gap-4 mb-6 px-1">
        <el-checkbox v-model="preferCovers" class="!mr-0">{{ t('vtubers.music.preferCovers') }}</el-checkbox>
        
        <div class="flex items-center gap-2 ml-auto">
          <span class="text-[10px] font-bold uppercase tracking-wider text-white/30">{{ t('vtubers.music.target') }}</span>
          <el-select v-model="language" :placeholder="t('vtubers.music.searchLanguage')" class="w-32" size="small">
            <el-option v-for="(name, val) in t('vtubers.music.languages')" :key="val" :label="name" :value="val" />
          </el-select>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-white/30">{{ t('vtubers.music.lyricsLabel') }}</span>
          <el-select v-model="lyricsLanguage" :placeholder="t('vtubers.music.lyricsLanguage')" class="w-32" size="small">
            <el-option v-for="(name, val) in t('vtubers.music.lyricsLanguages')" :key="val" :label="name" :value="val" />
          </el-select>
        </div>
      </div>

      <!-- Results Grid (Shared) -->
      <div class="results-container min-h-[400px]" v-loading="searching || trendingLoading">
        <div v-if="displayResults.length > 0" class="results-grid">
          <div 
            v-for="video in displayResults" 
            :key="video.videoId"
            class="video-card"
            :class="{ 'selected': selectedVideo?.videoId === video.videoId }"
            @click="selectVideo(video)"
          >
            <div class="relative group/thumb">
              <img :src="video.thumbnail" class="thumbnail" />
              <div class="absolute inset-0 bg-blue-500/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity pointer-events-none"></div>
              <div v-if="video.duration" class="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono">
                {{ formatDuration(video.duration) }}
              </div>
            </div>
            
            <div class="video-info">
              <h4 class="video-title">{{ video.title }}</h4>
              <p class="video-channel">{{ video.channelTitle }}</p>
            </div>
            
            <div v-if="selectedVideo?.videoId === video.videoId" class="selected-badge">
              <Check theme="filled" />
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!searching && !trendingLoading" class="py-20 flex flex-col items-center justify-center text-white/20 border-2 border-dashed border-white/5 rounded-3xl">
          <div class="relative mb-4">
            <music-list theme="outline" size="48" class="opacity-20" />
            <div class="absolute -top-2 -right-2 w-4 h-4 bg-red-500/20 rounded-full animate-ping"></div>
          </div>
          <span class="text-[10px] font-mono uppercase tracking-[0.3em]">{{ t('vtubers.music.noMusicFound') }}</span>
          <p class="text-[9px] mt-2 opacity-30">{{ t('vtubers.music.tryDifferentSearch') }}</p>
        </div>
      </div>
    </div>

    <!-- Selected Video Preview -->
    <div v-if="selectedVideo" class="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
      <h3 class="text-sm font-bold mb-3">{{ t('vtubers.music.selectedSong') }}</h3>
      <div class="flex items-center gap-4">
        <img :src="selectedVideo.thumbnail" class="w-24 h-24 rounded-xl object-cover" />
        <div class="flex-1">
          <h4 class="font-bold">{{ selectedVideo.title }}</h4>
          <p class="text-xs text-white/50">{{ selectedVideo.channelTitle }}</p>
        </div>
        <el-button 
          @click="fetchMetadataAndLyrics"
          :loading="fetching"
          type="primary"
        >
          {{ fetching ? t('vtubers.music.fetching') : t('vtubers.music.fetchAndApply') }}
        </el-button>
      </div>
    </div>

    <!-- Lyrics Preview -->
    <div v-if="lyricsLines.length > 0" class="mt-6">
      <h3 class="text-sm font-bold mb-3">{{ t('vtubers.music.lyricsPreview') }}</h3>
      <div class="lyrics-preview">
        <div v-for="(line, index) in lyricsLines.slice(0, 10)" :key="index" class="lyrics-line">
          <span class="time">{{ formatTime(line.startTime) }}</span>
          <span class="text">{{ line.text }}</span>
        </div>
        <p v-if="lyricsLines.length > 10" class="text-xs text-white/40 mt-2">
          {{ t('vtubers.music.moreLines', { count: lyricsLines.length - 10 }) }}
        </p>
      </div>
      
      <!-- Lyrics Style Options -->
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-white/40 mb-2 block">{{ t('vtubers.music.animationStyle') }}</label>
          <el-select v-model="lyricsStyle" class="w-full">
            <el-option v-for="(name, val) in t('vtubers.music.styles')" :key="val" :label="name" :value="val" />
          </el-select>
        </div>
        <div>
          <label class="text-xs text-white/40 mb-2 block">{{ t('vtubers.music.position') }}</label>
          <el-select v-model="lyricsPosition" class="w-full">
            <el-option v-for="(name, val) in t('vtubers.music.positions')" :key="val" :label="name" :value="val" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="confirmSelection"
        :disabled="!selectedVideo"
      >
        Apply Music {{ lyricsLines.length > 0 ? '& Lyrics' : '' }}
      </el-button>
    </template> -->
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { Check, Search, Refresh, MusicList } from '@icon-park/vue-next';
import { useMediaStore } from '@/stores/media';
import { toast } from 'vue-sonner';
import { getFileUrl } from '@/utils/api';

const visible = defineModel<boolean>();
const emit = defineEmits(['select']);
const { t } = useI18n();

const mediaStore = useMediaStore();
const searchQuery = ref('');
const language = ref('vietnamese');
const lyricsLanguage = ref('vi');  // Default to Vietnamese for lyrics
const preferCovers = ref(false);
const searching = ref(false);
const fetching = ref(false);

const trendingRegion = ref('VN');
const trendingResults = ref<any[]>([]);
const trendingLoading = ref(false);

const searchResults = ref<any[]>([]);
const selectedVideo = ref<any>(null);
const lyricsLines = ref<any[]>([]);
const lyricsStyle = ref('bounce');
const lyricsPosition = ref('bottom');

const displayResults = computed(() => {
  return searchQuery.value ? searchResults.value : trendingResults.value;
});

const fetchTrending = async () => {
  trendingLoading.value = true;
  try {
    const data = await mediaStore.fetchTrendingMusic({
      region: trendingRegion.value,
      maxResults: 20
    });
    trendingResults.value = data;
  } catch (error: any) {
    console.error('Fetch trending failed:', error);
  } finally {
    trendingLoading.value = false;
  }
};

// Initial fetch
fetchTrending();

const handleSearch = () => {
  if (searchQuery.value) {
    searchMusic();
  }
};

const handleSearchClear = () => {
  searchResults.value = [];
  if (trendingResults.value.length === 0) {
    fetchTrending();
  }
};

watch(searchQuery, (newVal) => {
  if (!newVal) {
    handleSearchClear();
  }
});

const searchMusic = async () => {
  if (!searchQuery.value) {
    toast.error(t('vtubers.music.toasts.enterQuery'));
    return;
  }
  
  searching.value = true;
  try {
    const data = await mediaStore.searchYouTubeMusic({
      query: searchQuery.value,
      preferCovers: preferCovers.value,
      language: language.value,
      maxResults: 12
    });
    
    searchResults.value = data;
    if (data.length === 0) {
      toast.info(t('vtubers.music.toasts.noResults'));
    }
  } catch (error: any) {
    console.error('Search failed:', error);
  } finally {
    searching.value = false;
  }
};

const selectVideo = (video: any) => {
  selectedVideo.value = video;
  lyricsLines.value = []; // Reset lyrics when selecting new video
};

const fetchMetadataAndLyrics = async () => {
  if (!selectedVideo.value) return;
  
  fetching.value = true;
  try {
    const data = await mediaStore.fetchYouTubeMetadata({
      videoId: selectedVideo.value.videoId,
      fetchLyrics: true,
      songTitle: selectedVideo.value.title,
      lyricsLanguage: lyricsLanguage.value  // Pass user-selected language
    });
    
    lyricsLines.value = data.lyricsLines || [];

    // cache music to local
    const music = await getFileUrl(`/api/media/youtube/stream/${selectedVideo.value.videoId}`, {cached: true, refresh: false});
    
    if (lyricsLines.value.length > 0) {
      toast.success(t('vtubers.music.toasts.lyricsFetched'));
      // Auto-confirm selection
      confirmSelection();
    } else {
      toast.warning(t('vtubers.music.toasts.noLyrics'));
      confirmSelection();
    }
  } catch (error: any) {
    console.error('Fetch failed:', error);
    toast.error(t('vtubers.music.toasts.fetchFailed'));
  } finally {
    fetching.value = false;
  }
};

const confirmSelection = () => {
  if (!selectedVideo.value) return;
  
  emit('select', {
    videoUrl: selectedVideo.value.url,
    videoId: selectedVideo.value.videoId,
    title: selectedVideo.value.title,
    thumbnail: selectedVideo.value.thumbnail,
    lyricsLines: lyricsLines.value,
    style: lyricsStyle.value,
    position: lyricsPosition.value
  });
  
  visible.value = false;
  toast.success(t('vtubers.music.toasts.applied'));
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
</script>

<style scoped lang="scss">
.results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
}

.video-card {
  position: relative;
  border: 2px solid transparent;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: rgba(255, 255, 255, 0.03);
  
  &:hover {
    border-color: rgba(255, 255, 255, 0.2);
    transform: translateY(-2px);
  }
  
  &.selected {
    border-color: #409eff;
    background: rgba(64, 158, 255, 0.1);
  }
}

.thumbnail {
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
}

.video-info {
  padding: 0.75rem;
}

.video-title {
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.video-channel {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 0.25rem;
}

.video-duration {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-top: 0.25rem;
}

.selected-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: #409eff;
  color: white;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lyrics-preview {
  max-height: 300px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  padding: 1rem;
}

.lyrics-line {
  display: flex;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  
  .time {
    color: rgba(255, 255, 255, 0.4);
    font-size: 0.75rem;
    min-width: 50px;
  }
  
  .text {
    flex: 1;
    font-size: 0.875rem;
  }
}
</style>
