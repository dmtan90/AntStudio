<template>
  <el-dialog 
    v-model="visible" 
    title="🎵 Select Background Music"
    width="900px"
    class="music-dialog"
  >
    <!-- Search Bar -->
    <div class="mb-6">
      <el-input 
        v-model="searchQuery"
        placeholder="Search for songs (e.g., 'Hoa nở không màu cover')"
        size="large"
        @keyup.enter="searchMusic"
      >
        <template #append>
          <el-button @click="searchMusic" :loading="searching">
            Search
          </el-button>
        </template>
      </el-input>
      
      <div class="flex gap-2 mt-3">
        <el-checkbox v-model="preferCovers">Prefer Cover Songs</el-checkbox>
        <el-select v-model="language" placeholder="Language" class="w-40">
          <el-option label="Vietnamese" value="vietnamese" />
          <el-option label="English" value="english" />
          <el-option label="Korean" value="korean" />
          <el-option label="Japanese" value="japanese" />
        </el-select>
      </div>
    </div>

    <!-- Search Results -->
    <div v-if="searchResults.length > 0" class="results-grid">
      <div 
        v-for="video in searchResults" 
        :key="video.videoId"
        class="video-card"
        :class="{ 'selected': selectedVideo?.videoId === video.videoId }"
        @click="selectVideo(video)"
      >
        <img :src="video.thumbnail" class="thumbnail" />
        <div class="video-info">
          <h4 class="video-title">{{ video.title }}</h4>
          <p class="video-channel">{{ video.channelTitle }}</p>
          <p v-if="video.duration" class="video-duration">{{ formatDuration(video.duration) }}</p>
        </div>
        <div v-if="selectedVideo?.videoId === video.videoId" class="selected-badge">
          <Check theme="filled" />
        </div>
      </div>
    </div>

    <!-- Selected Video Preview -->
    <div v-if="selectedVideo" class="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
      <h3 class="text-sm font-bold mb-3">Selected Song</h3>
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
          Fetch Lyrics
        </el-button>
      </div>
    </div>

    <!-- Lyrics Preview -->
    <div v-if="lyricsLines.length > 0" class="mt-6">
      <h3 class="text-sm font-bold mb-3">Lyrics Preview</h3>
      <div class="lyrics-preview">
        <div v-for="(line, index) in lyricsLines.slice(0, 10)" :key="index" class="lyrics-line">
          <span class="time">{{ formatTime(line.startTime) }}</span>
          <span class="text">{{ line.text }}</span>
        </div>
        <p v-if="lyricsLines.length > 10" class="text-xs text-white/40 mt-2">
          ... and {{ lyricsLines.length - 10 }} more lines
        </p>
      </div>
      
      <!-- Lyrics Style Options -->
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <label class="text-xs text-white/40 mb-2 block">Animation Style</label>
          <el-select v-model="lyricsStyle" class="w-full">
            <el-option label="Bounce (CapCut)" value="bounce" />
            <el-option label="Slide In" value="slide" />
            <el-option label="Fade In" value="fade" />
            <el-option label="Scale Up" value="scale" />
          </el-select>
        </div>
        <div>
          <label class="text-xs text-white/40 mb-2 block">Position</label>
          <el-select v-model="lyricsPosition" class="w-full">
            <el-option label="Top" value="top" />
            <el-option label="Center" value="center" />
            <el-option label="Bottom" value="bottom" />
          </el-select>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="visible = false">Cancel</el-button>
      <el-button 
        type="primary" 
        @click="confirmSelection"
        :disabled="!selectedVideo"
      >
        Apply Music {{ lyricsLines.length > 0 ? '& Lyrics' : '' }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Check } from '@icon-park/vue-next';
import { useMediaStore } from '@/stores/media';
import { toast } from 'vue-sonner';

const visible = defineModel<boolean>();
const emit = defineEmits(['select']);

const mediaStore = useMediaStore();
const searchQuery = ref('');
const preferCovers = ref(true);
const language = ref('vietnamese');
const searching = ref(false);
const fetching = ref(false);

const searchResults = ref<any[]>([]);
const selectedVideo = ref<any>(null);
const lyricsLines = ref<any[]>([]);
const lyricsStyle = ref('bounce');
const lyricsPosition = ref('bottom');

const searchMusic = async () => {
  if (!searchQuery.value) {
    toast.error('Please enter a search query');
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
      toast.info('No results found. Try a different search term.');
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
      songTitle: selectedVideo.value.title
    });
    
    lyricsLines.value = data.lyricsLines || [];
    
    if (lyricsLines.value.length > 0) {
      toast.success('Lyrics fetched successfully!');
    } else {
      toast.warning('No lyrics found for this song');
    }
  } catch (error: any) {
    console.error('Fetch failed:', error);
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
    lyrics: lyricsLines.value,
    style: lyricsStyle.value,
    position: lyricsPosition.value
  });
  
  visible.value = false;
  toast.success('Music applied!');
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
