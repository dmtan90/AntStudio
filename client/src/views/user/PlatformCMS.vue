<template>
   <div class="cms-page p-6 animate-in h-full overflow-y-auto">
      <!-- Header -->
      <header class="flex items-center justify-between mb-8">
         <div class="flex items-center gap-4">
            <button class="icon-btn glass-btn" @click="$router.push('/platforms')">
               <ArrowLeft theme="outline" size="20" />
            </button>
            <div>
               <h1 class="text-2xl font-bold flex items-center gap-2">
                  <component :is="platformIcon" theme="filled" :class="platformClass" />
                  {{ accountName }} Content
               </h1>
               <p class="text-gray-400 text-sm">Manage VoDs, Clips, and Live Streams</p>
            </div>
         </div>
         <div class="flex items-center gap-3">
            <button class="primary-btn bg-red-600 hover:bg-red-700 border-none pulse-on-hover"
               @click="showLiveStreamDialog = true">
               <Broadcast theme="outline" size="18" class="mr-2" /> Go Live
            </button>
            <button class="secondary-btn glass-btn" @click="showUploadDialog = true">
               <UploadOne theme="outline" size="18" class="mr-2" /> Upload Video
            </button>
            <button class="icon-btn glass-btn" @click="refreshData" :disabled="loading">
               <Refresh theme="outline" size="20" :class="{ 'animate-spin': loading }" />
            </button>
         </div>
      </header>

      <!-- Stats Overview -->
      <div v-if="stats" class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
         <div class="stat-card glass-panel p-6">
            <div class="flex items-center gap-3 mb-2">
               <User theme="filled" size="24" class="text-blue-400" />
               <span class="text-gray-400 text-xs font-bold uppercase tracking-wider">Followers</span>
            </div>
            <div class="text-3xl font-black">{{ formatNumber(stats.followers || stats.subscribers || 0) }}</div>
         </div>
         <div class="stat-card glass-panel p-6">
            <div class="flex items-center gap-3 mb-2">
               <PlayOne theme="filled" size="24" class="text-green-400" />
               <span class="text-gray-400 text-xs font-bold uppercase tracking-wider">Total Views</span>
            </div>
            <div class="text-3xl font-black">{{ formatNumber(stats.views) }}</div>
         </div>
         <div class="stat-card glass-panel p-6">
            <div class="flex items-center gap-3 mb-2">
               <VideoOne theme="filled" size="24" class="text-purple-400" />
               <span class="text-gray-400 text-xs font-bold uppercase tracking-wider">Videos</span>
            </div>
            <div class="text-3xl font-black">{{ formatNumber(stats.videos) }}</div>
         </div>
      </div>

      <!-- Content Tabs -->
      <div class="flex items-center gap-6 border-b border-white/10 mb-6">
         <button v-for="tab in ['Videos', 'Analytics']" :key="tab"
            class="pb-3 text-sm font-bold uppercase tracking-wide border-b-2 transition-colors duration-200"
            :class="activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'"
            @click="activeTab = tab">
            {{ tab }}
         </button>
      </div>

      <!-- Videos Tab -->
      <div v-if="activeTab === 'Videos'">
         <!-- Filters -->
         <div class="flex items-center gap-4 mb-6">
            <el-input v-model="filters.search" placeholder="Search videos..." class="glass-input w-64"
               @keyup.enter="handleSearch">
               <template #prefix>
                  <div class="flex items-center justify-center h-full">
                     <!-- Search icon using icon-park Search -->
                     <!-- Wait, I need to check if SEARCH is imported or use a generic one -->
                     <!-- Using a generic svg or icon if Search not imported, but wait i imported SEARCH in script -->
                     <Search theme="outline" size="16" class="text-gray-500" />
                  </div>
               </template>
            </el-input>
            <el-select v-model="filters.sort" placeholder="Sort By" class="glass-select w-40"
               popper-class="glass-dropdown" @change="loadData">
               <el-option label="Newest First" value="newest" />
               <el-option label="Most Views" value="views" />
            </el-select>
         </div>

         <!-- Loader -->
         <div v-if="loading" class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div v-for="i in 8" :key="i" class="h-64 glass-card rounded-xl animate-pulse"></div>
         </div>

         <!-- Video Grid -->
         <div v-else-if="videos.length" class="video-grid grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <div v-for="video in videos" :key="video.id" class="video-card glass-card group relative cursor-pointer"
               @click="openVideoDetail(video)">
               <div class="thumbnail relative aspect-video bg-black rounded-t-xl overflow-hidden">
                  <el-image :src="getFileUrl(video.thumbnail)"
                     class="w-full h-full object-cover transition-transform group-hover:scale-105">
                     <template #placeholder>
                        <div class="flex items-center justify-center h-full">
                           <Loading theme="outline" size="24" class="text-gray-500" />
                        </div>
                     </template>
                     <template #error>
                        <div class="flex items-center justify-center h-full">
                           <VideoOne theme="outline" size="24" class="text-gray-500" />
                        </div>
                     </template>
                  </el-image>
                  <div
                     class="play-btn absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                     <PlayOne theme="filled" size="48" class="text-white drop-shadow-lg" />
                  </div>
                  <div class="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button class="bg-red-500/80 hover:bg-red-600/90 text-white p-2 rounded-lg backdrop-blur-md"
                        @click.stop.prevent="deleteVideo(video.id)">
                        <Delete theme="outline" size="16" />
                     </button>
                  </div>
                  <div class="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs font-mono"
                     v-if="video.duration">
                     {{ formatDuration(video.duration) }}
                  </div>
               </div>
               <div class="p-4">
                  <h3 class="font-bold text-white truncate mb-1" :title="video.title">{{ video.title }}</h3>
                  <div class="flex justify-between items-center text-xs text-gray-500">
                     <span>{{ formatDate(video.publishedAt) }}</span>
                     <span class="flex items-center gap-1">
                        <PreviewOpen size="12" /> {{ formatNumber(video.views) }}
                     </span>
                  </div>
               </div>
            </div>
         </div>

         <!-- Empty State -->
         <div v-else class="text-center py-20 text-gray-500">
            <VideoOne theme="outline" size="48" class="mx-auto mb-4 opacity-50 inline-block" />
            <p>No videos found on this channel.</p>
         </div>

         <el-pagination class="mt-12 w-full flex justify-center" v-model:current-page="filters.page"
            v-model:page-size="filters.limit" :total="totalVideos" :page-sizes="[12, 24, 48]"
            layout="total, prev, pager, next" @current-change="handlePageChange" @size-change="handleSizeChange" />
      </div>

      <!-- Analytics Tab -->
      <div v-else-if="activeTab === 'Analytics'" class="analytics-section">
         <div v-if="stats" class="space-y-6">
            <!-- Engagement Overview -->
            <div class="glass-panel p-6 rounded-xl">
               <h3 class="text-lg font-bold mb-6 flex items-center gap-2">
                  <PlayOne theme="filled" size="20" class="text-blue-400" />
                  Engagement Overview
               </h3>
               <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div class="stat-box bg-white/5 p-4 rounded-lg border border-white/10">
                     <div class="text-xs text-gray-400 uppercase font-bold mb-1">Subscribers</div>
                     <div class="text-2xl font-black text-blue-400">{{ formatNumber(stats.followers || stats.subscribers
                        || 0)
                     }}</div>
                  </div>
                  <div class="stat-box bg-white/5 p-4 rounded-lg border border-white/10">
                     <div class="text-xs text-gray-400 uppercase font-bold mb-1">Total Views</div>
                     <div class="text-2xl font-black text-green-400">{{ formatNumber(stats.views || 0) }}</div>
                  </div>
                  <div class="stat-box bg-white/5 p-4 rounded-lg border border-white/10">
                     <div class="text-xs text-gray-400 uppercase font-bold mb-1">Total Videos</div>
                     <div class="text-2xl font-black text-purple-400">{{ formatNumber(stats.videos || totalVideos) }}
                     </div>
                  </div>
                  <div class="stat-box bg-white/5 p-4 rounded-lg border border-white/10">
                     <div class="text-xs text-gray-400 uppercase font-bold mb-1">Avg Views/Video</div>
                     <div class="text-2xl font-black text-yellow-400">{{ formatNumber(Math.round((stats.views || 0) /
                        (stats.videos || totalVideos || 1))) }}</div>
                  </div>
               </div>
            </div>

            <!-- Top Performing Videos -->
            <div class="glass-panel p-6 rounded-xl">
               <h3 class="text-lg font-bold mb-6 flex items-center gap-2">
                  <VideoOne theme="filled" size="20" class="text-purple-400" />
                  Top Performing Videos
               </h3>
               <div v-if="topVideos.length > 0" class="space-y-3">
                  <div v-for="(video, index) in topVideos" :key="video.id"
                     class="flex items-center gap-4 p-3 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
                     @click="openVideoDetail(video)">
                     <div class="text-2xl font-black text-gray-500 w-8 text-center">#{{ index + 1 }}</div>
                     <!-- <img :src="video.thumbnail" class="w-24 h-14 object-cover rounded" :alt="video.title" /> -->
                     <el-image :src="video.thumbnail" class="w-24 h-14 object-cover rounded" :alt="video.title">
                        <template #placeholder>
                           <div class="flex items-center justify-center w-24 h-14">
                              <Loading theme="outline" size="24" />
                           </div>
                        </template>
                        <template #error>
                           <div class="flex items-center justify-center w-24 h-14">
                              <VideoOne theme="outline" size="24" />
                           </div>
                        </template>
                     </el-image>
                     <div class="flex-1 min-w-0">
                        <div class="font-bold text-white truncate">{{ video.title }}</div>
                        <div class="text-xs text-gray-400">{{ formatDate(video.publishedAt) }}</div>
                     </div>
                     <div class="text-right">
                        <div class="text-lg font-bold text-green-400">{{ formatNumber(video.views) }}</div>
                        <div class="text-xs text-gray-500">views</div>
                     </div>
                  </div>
               </div>
               <div v-else class="text-center py-8 text-gray-500">
                  <VideoOne theme="outline" size="32" class="mx-auto mb-2 opacity-50" />
                  <p>No video data available</p>
               </div>
            </div>

            <!-- Performance Insights -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div class="glass-panel p-6 rounded-xl">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                     <User theme="filled" size="20" class="text-blue-400" />
                     Audience Growth
                  </h3>
                  <div class="space-y-3">
                     <div class="flex justify-between items-center">
                        <span class="text-gray-400">Current Subscribers</span>
                        <span class="font-bold text-xl">{{ formatNumber(stats.followers || stats.subscribers || 0)
                           }}</span>
                     </div>
                     <div class="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                           :style="{ width: Math.min((stats.followers || 0) / 10000 * 100, 100) + '%' }"></div>
                     </div>
                     <div class="text-xs text-gray-500">Goal: 10,000 subscribers</div>
                  </div>
               </div>

               <div class="glass-panel p-6 rounded-xl">
                  <h3 class="text-lg font-bold mb-4 flex items-center gap-2">
                     <PlayOne theme="filled" size="20" class="text-green-400" />
                     Content Performance
                  </h3>
                  <div class="space-y-3">
                     <div class="flex justify-between items-center">
                        <span class="text-gray-400">Total Watch Time</span>
                        <span class="font-bold text-xl">{{ formatNumber(stats.views || 0) }} views</span>
                     </div>
                     <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-400">Engagement Rate</span>
                        <span class="font-bold text-green-400">
                           {{ stats.followers > 0 ? ((stats.views / stats.followers) * 100).toFixed(1) : 0 }}%
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <div v-else class="text-center py-20 text-gray-500">
            <Construction theme="outline" size="48" class="mx-auto mb-4 opacity-50" />
            <p>Loading analytics...</p>
         </div>
      </div>

      <div v-else class="text-center py-20 text-gray-500">
         <Construction theme="outline" size="48" class="mx-auto mb-4 opacity-50" />
         <p>Feature coming soon</p>
      </div>

      <!-- Video Detail Dialog -->
      <el-dialog v-model="showVideoDialog" title="Video Details" width="900px" class="glass-dialog">
         <div class="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]" v-if="selectedVideo">
            <!-- Left: Player -->
            <div class="md:col-span-2 flex flex-col gap-4">
               <div class="aspect-video bg-black rounded-xl overflow-hidden shadow-lg border border-white/10">
                  <iframe v-if="selectedVideo.platform === 'youtube'"
                     :src="`https://www.youtube.com/embed/${selectedVideo.id}?autoplay=1`" class="w-full h-full"
                     frameborder="0" :title="selectedVideo.title"
                     allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                     referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
                  <iframe v-else-if="selectedVideo.platform === 'ant-media'" :src="`${selectedVideo.url}`"
                     class="w-full h-full" frameborder="0" :title="selectedVideo.title"></iframe>
                  <!-- <video v-else-if="selectedVideo.platform === 'ant-media'" :src="selectedVideo.url" controls
                     class="w-full h-full object-contain"></video> -->
                  <div v-else class="w-full h-full flex items-center justify-center text-gray-500">
                     <PlayOne size="48" />
                     <span class="ml-2">Preview not available</span>
                  </div>
               </div>
               <div>
                  <h2 class="text-xl font-bold">{{ selectedVideo.title }}</h2>
                  <p class="text-sm text-gray-400 mt-2">{{ selectedVideo.description }}</p>
               </div>
            </div>

            <!-- Right: Tabs (Overview/Comments) -->
            <div class="flex flex-col h-full overflow-hidden">
               <div class="flex border-b border-white/10 mb-4">
                  <button v-for="tab in ['Overview', 'Comments']" :key="tab"
                     class="flex-1 pb-2 text-sm font-bold text-center border-b-2 transition-colors"
                     :class="activeDetailTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-gray-500 hover:text-gray-300'"
                     @click="activeDetailTab = tab">
                     {{ tab }}
                  </button>
               </div>

               <div class="flex-1 overflow-y-auto custom-scrollbar pr-2">
                  <!-- Overview -->
                  <div v-if="activeDetailTab === 'Overview'" class="space-y-4">
                     <div class="glass-panel p-4 rounded-xl">
                        <div class="text-xs text-gray-400 uppercase font-bold mb-1">Views</div>
                        <div class="text-2xl font-black">{{ formatNumber(selectedVideo.stats?.views ||
                           selectedVideo.views ||
                           0) }}</div>
                     </div>
                     <div class="glass-panel p-4 rounded-xl">
                        <div class="text-xs text-gray-400 uppercase font-bold mb-1">Published</div>
                        <div class="text-lg">{{ formatDate(selectedVideo.publishedAt) }}</div>
                     </div>
                     <div class="glass-panel p-4 rounded-xl">
                        <div class="text-xs text-gray-400 uppercase font-bold mb-1">Platform</div>
                        <div class="capitalize">{{ selectedVideo.platform }}</div>
                     </div>
                  </div>

                  <!-- Comments -->
                  <div v-if="activeDetailTab === 'Comments'" class="space-y-4">
                     <div v-if="store.commentsLoading" class="text-center py-4 text-gray-500">Loading comments...</div>
                     <div v-else-if="store.comments.length === 0" class="text-center py-4 text-gray-500">No comments
                        yet.
                     </div>
                     <div v-else v-for="comment in store.comments" :key="comment.id"
                        class="flex gap-3 text-sm border-b border-white/5 pb-3 last:border-0">
                        <div class="w-8 h-8 rounded-full bg-gray-700 overflow-hidden flex-shrink-0">
                           <img v-if="comment.avatar" :src="comment.avatar" class="w-full h-full object-cover">
                           <User v-else size="16" class="w-full h-full p-1.5 text-gray-400" />
                        </div>
                        <div>
                           <div class="font-bold text-gray-300">{{ comment.author }} <span
                                 class="text-xs text-gray-500 ml-2">{{ formatDate(comment.date) }}</span></div>
                           <p class="text-gray-400 mt-1">{{ comment.text }}</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      </el-dialog>

      <!-- Upload Modal -->
      <el-dialog v-model="showUploadDialog" title="Upload Video" width="500px" class="glass-dialog">
         <el-form :model="uploadForm" label-position="top">
            <el-form-item label="Title">
               <el-input v-model="uploadForm.title" placeholder="Video Title" class="glass-input" />
            </el-form-item>
            <el-form-item label="Description">
               <el-input v-model="uploadForm.description" type="textarea" :rows="3" placeholder="Video Description"
                  class="glass-input" />
            </el-form-item>

            <el-tabs v-model="uploadSource">
               <el-tab-pane label="Local File" name="local">
                  <div
                     class="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer relative">
                     <input type="file" ref="fileInput" accept="video/*"
                        class="absolute inset-0 opacity-0 cursor-pointer" @change="handleFileChange">
                     <div v-if="selectedFile">
                        <VideoOne theme="filled" size="32" class="text-blue-500 mb-2 mx-auto" />
                        <p class="text-sm font-bold">{{ selectedFile.name }}</p>
                        <p class="text-xs text-gray-400">{{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB</p>
                     </div>
                     <div v-else>
                        <UploadOne theme="outline" size="32" class="text-gray-500 mb-2 mx-auto" />
                        <p class="text-sm text-gray-400">Click or Drag video file here</p>
                     </div>
                  </div>
               </el-tab-pane>
               <el-tab-pane label="Archive" name="archive">
                  <div v-if="loadingArchive" class="text-center py-4">Loading projects...</div>
                  <div v-else-if="archiveVideos.length === 0" class="text-center py-8 text-gray-500">
                     No finished projects found.
                  </div>
                  <div v-else class="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto custom-scrollbar">
                     <div v-for="vid in archiveVideos" :key="vid.id"
                        class="border rounded-lg p-2 cursor-pointer transition-colors relative overflow-hidden"
                        :class="selectedArchiveVideo?.id === vid.id ? 'border-blue-500 bg-blue-500/10' : 'border-white/10 hover:border-white/30'"
                        @click="selectArchiveVideo(vid)">
                        <div class="font-bold text-sm truncate">{{ vid.title }}</div>
                        <div class="text-xs text-gray-400">{{ formatDate(vid.updatedAt) }}</div>
                        <div class="absolute top-1 right-1" v-if="selectedArchiveVideo?.id === vid.id">
                           <div class="w-3 h-3 bg-blue-500 rounded-full"></div>
                        </div>
                     </div>
                  </div>
               </el-tab-pane>
            </el-tabs>
         </el-form>
         <template #footer>
            <div class="flex justify-end gap-2">
               <button class="secondary-btn mr-2" @click="showUploadDialog = false">Cancel</button>
               <button class="primary-btn" @click="uploadVideo"
                  :disabled="uploading || (!selectedFile && uploadSource === 'local') || (!selectedArchiveVideo && uploadSource === 'archive')">
                  <span v-if="uploading" class="flex items-center gap-2">
                     <div class="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                     Uploading...
                  </span>
                  <span v-else>Upload</span>
               </button>
            </div>
         </template>
      </el-dialog>

      <el-dialog v-model="showLiveStreamDialog" title="Live Streaming" width="600px" class="glass-dialog">
         <!-- <div class="glass-panel p-8 rounded-2xl max-w-4xl mx-auto mb-12">
            
         </div> -->
         <div class="flex items-center justify-between mb-8">
            <div>
               <h2 class="text-2xl font-black mb-2">Live Stream Setup</h2>
               <p class="text-gray-400">Configure your broadcast settings for {{ accountName }}</p>
            </div>
            <div class="p-4 bg-red-600/10 rounded-xl border border-red-600/20">
               <Broadcast theme="outline" size="32" class="text-red-500" />
            </div>
         </div>

         <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div class="space-y-4">
               <label class="block text-xs font-black uppercase text-gray-500 tracking-widest">Stream Title</label>
               <el-input v-model="liveForm.title" placeholder="My Awesome Live Stream" class="glass-input" />
            </div>
            <div class="space-y-4">
               <label class="block text-xs font-black uppercase text-gray-500 tracking-widest">Privacy</label>
               <el-select v-model="liveForm.privacy" class="glass-select w-full" popper-class="glass-dropdown">
                  <el-option label="Public" value="public" />
                  <el-option label="Unlisted" value="unlisted" />
                  <el-option label="Private" value="private" />
               </el-select>
            </div>
         </div>

         <div class="space-y-4 mb-8">
            <label class="block text-xs font-black uppercase text-gray-500 tracking-widest">Stream Ingest
               Info</label>
            <div class="p-6 bg-black/40 rounded-xl border border-white/5 space-y-4 text-sm font-mono">
               <div class="flex items-center justify-between">
                  <span class="text-gray-500 w-24">RTMP URL</span>
                  <div class="flex items-center gap-3 flex-1 justify-end">
                     <span class="text-blue-400 truncate max-w-md">{{ account?.rtmpUrl || 'Not configured' }}</span>
                     <button class="icon-btn-sm text-gray-400 hover:text-white transition-colors"
                        @click="copyToClipboard(account?.rtmpUrl)">
                        <Copy theme="outline" size="16" />
                     </button>
                  </div>
               </div>
               <div class="flex items-center justify-between">
                  <span class="text-gray-500 w-24">Stream Key</span>
                  <div class="flex items-center gap-3 flex-1 justify-end">
                     <span class="text-purple-400">{{ account?.streamKey ? '••••••••••••' : 'Not configured'
                        }}</span>
                     <button class="icon-btn-sm text-gray-400 hover:text-white transition-colors"
                        @click="copyToClipboard(account?.streamKey)">
                        <Copy theme="outline" size="16" />
                     </button>
                  </div>
               </div>
            </div>
         </div>

         <div class="flex items-center gap-4">
            <button class="primary-btn h-12 px-8 flex-1 justify-center" @click="setupLive" :disabled="loadingLive">
               <Refresh theme="outline" size="18" :class="cn('mr-1', loadingLive ? 'animate-spin' : '')" />
               {{ account?.streamKey ? 'Renew Live Info' : 'Initialize Live Stream' }}
            </button>
            <button
               class="primary-btn h-12 px-8 flex-1 justify-center bg-red-600 hover:bg-red-700 border-none pulse-on-hover"
               :disabled="!account?.streamKey" @click="goLive">
               <Broadcast theme="outline" size="18" class="mr-2" /> Launch Studio
            </button>
         </div>
      </el-dialog>
   </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlatformStore } from '@/stores/platform';
import { useProjectStore } from '@/stores/project';
import { toast } from 'vue-sonner';
import {
   ArrowLeft, Refresh, PlayOne, VideoOne,
   Youtube, Facebook, Tiktok, Broadcast, Connection,
   User, UploadOne, Delete, PreviewOpen, Broadcast as Construction,
   Search, Loading, Copy
} from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import { cn } from '@/utils/ui';

const route = useRoute();
const router = useRouter();
const accountId = route.query.accountId as string;
const store = usePlatformStore();
const projectStore = useProjectStore();

const activeTab = ref('Videos');
const origin = window.location.origin;

// Upload State
const showUploadDialog = ref(false);
const uploadSource = ref('local');
const uploadForm = ref({ title: '', description: '' });
const selectedFile = ref<File | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const archiveVideos = ref<any[]>([]);
const loadingArchive = ref(false);
const selectedArchiveVideo = ref<any>(null);

// Video Detail State
const showVideoDialog = ref(false);
const showLiveStreamDialog = ref(false);
const selectedVideo = ref<any>(null);
const activeDetailTab = ref('Overview');

const filters = reactive({
   search: '',
   sort: 'newest',
   page: 1,
   limit: 12
});

// Computed from Store
const account = computed(() => store.accounts.find(a => a._id === accountId));
const videos = computed(() => store.videos);
const totalVideos = computed(() => store.totalVideos);
const stats = computed(() => store.stats);
const loading = computed(() => store.videoLoading);
const comments = computed(() => store.comments);
const commentsLoading = computed(() => store.commentsLoading);
const uploading = ref(false);

// Live State
const loadingLive = ref(false);
const liveForm = reactive({
   title: '',
   description: 'Live via AntFlow',
   privacy: 'public'
});

const setupLive = async () => {
   loadingLive.value = true;
   try {
      if (!liveForm.title) liveForm.title = `${accountName.value} Live - ${new Date().toLocaleDateString()}`;
      await store.fetchLiveInfo(accountId, liveForm);
      toast.success('Live stream configured');
   } catch (e) {
      // handled
   } finally {
      loadingLive.value = false;
   }
};

const copyToClipboard = (text: string) => {
   if (!text) return;
   navigator.clipboard.writeText(text);
   toast.success('Copied to clipboard');
};

const platformIcon = computed(() => {
   switch (account.value?.platform) {
      case 'youtube': return Youtube;
      case 'facebook': return Facebook;
      case 'tiktok': return Tiktok;
      case 'ant-media': return Broadcast;
      default: return Connection;
   }
});

const platformClass = computed(() => {
   switch (account.value?.platform) {
      case 'youtube': return 'text-red-500';
      case 'facebook': return 'text-blue-600';
      case 'tiktok': return 'text-pink-500';
      case 'ant-media': return 'text-orange-500';
      default: return 'text-gray-500';
   }
})

const accountName = computed(() => account.value?.accountName || 'Platform');

// Top Videos for Analytics
const topVideos = computed(() => {
   return [...videos.value]
      .filter(v => v.views > 0)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
});

const formatNumber = (num: number) => {
   if (!num) return '0';
   return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
}

const formatDate = (date: string) => {
   return new Date(date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDuration = (val: any) => {
   if (!val) return '';
   return val;
}

const loadData = async () => {
   if (!accountId) return;
   await Promise.all([
      store.fetchVideos(accountId, {
         page: filters.page,
         limit: filters.limit,
         search: filters.search,
         sort: filters.sort
      }),
      store.fetchStats(accountId)
   ]);
}

const refreshData = async () => {
   await loadData();
   toast.success('Data refreshed');
}

const handleSearch = () => {
   filters.page = 1;
   loadData();
}

const handlePageChange = (val: number) => {
   filters.page = val;
   loadData();
}

const handleSizeChange = (val: number) => {
   filters.limit = val;
   filters.page = 1;
   loadData();
}

const deleteVideo = async (videoId: string) => {
   if (!confirm('Are you sure you want to delete this video?')) return;
   await store.deleteVideo(accountId, videoId);
}

// Upload Logic (Keep mostly local for now or move purely to store)
const handleFileChange = (e: Event) => {
   const target = e.target as HTMLInputElement;
   if (target.files && target.files[0]) {
      selectedFile.value = target.files[0];
      if (!uploadForm.value.title) {
         uploadForm.value.title = selectedFile.value.name.replace(/\.[^/.]+$/, "");
      }
   }
}

const fetchArchive = async () => {
   loadingArchive.value = true;
   try {
      const data = await projectStore.fetchProjects();
      if (data && data.projects) {
         archiveVideos.value = data.projects
            .filter((p: any) => p.finalVideo?.s3Key)
            .map((p: any) => ({
               id: p._id,
               title: p.title,
               s3Key: p.finalVideo.s3Key,
               updatedAt: p.updatedAt
            }));
      }
   } catch (e) {
      console.error('Failed to load archive', e);
   } finally {
      loadingArchive.value = false;
   }
}

watch(uploadSource, (newVal) => {
   if (newVal === 'archive' && archiveVideos.value.length === 0) {
      fetchArchive();
   }
});

const selectArchiveVideo = (video: any) => {
   selectedArchiveVideo.value = video;
   if (!uploadForm.value.title) {
      uploadForm.value.title = video.title;
   }
}

const uploadVideo = async () => {
   if (uploadSource.value === 'local' && !selectedFile.value) return;
   if (uploadSource.value === 'archive' && !selectedArchiveVideo.value) return;

   uploading.value = true;

   try {
      if (uploadSource.value === 'local') {
         const formData = new FormData();
         formData.append('file', selectedFile.value!);
         formData.append('title', uploadForm.value.title);
         formData.append('description', uploadForm.value.description);
         await store.uploadVideo(accountId, formData, true);
      } else {
         await store.uploadVideo(accountId, {
            title: uploadForm.value.title,
            description: uploadForm.value.description,
            s3Key: selectedArchiveVideo.value.s3Key
         });
      }

      showUploadDialog.value = false;
      selectedFile.value = null;
      selectedArchiveVideo.value = null;
      uploadForm.value = { title: '', description: '' };
      loadData();
   } catch (e) {
      // handled in store
   }
   uploading.value = false;
}

const openVideoDetail = (video: any) => {
   selectedVideo.value = video;
   showVideoDialog.value = true;
   activeDetailTab.value = 'Overview';
   // Fetch comments if needed
   store.fetchComments(accountId, video.id);
}

const goLive = () => {
   showLiveStreamDialog.value = false;
   router.push({ name: 'live-studio', query: { platformId: accountId } });
}

onMounted(async () => {
   if (!accountId) {
      router.push('/platforms');
      return;
   }
   // Ensure accounts are loaded to find current one
   if (store.accounts.length === 0) {
      await store.fetchAccounts();
   }
   await loadData();
});
</script>

<style scoped>
.cms-page {
   background-color: #0a0a0a;
   color: #fff;
   font-family: 'Outfit', sans-serif;
   background-image: 
      radial-gradient(circle at 10% 10%, rgba(59, 130, 246, 0.05), transparent 400px),
      radial-gradient(circle at 90% 90%, rgba(168, 85, 247, 0.05), transparent 400px);
}

.glass-btn {
   background: rgba(255, 255, 255, 0.03);
   border: 1px solid rgba(255, 255, 255, 0.08);
   color: rgba(255, 255, 255, 0.8);
   height: 40px;
   border-radius: 10px;
   display: flex;
   align-items: center;
   justify-content: center;
   padding: 0 16px;
   transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
   font-weight: 600;
   font-size: 13px;
   backdrop-filter: blur(10px);
}

.glass-btn:hover {
   background: rgba(255, 255, 255, 0.08);
   border-color: rgba(255, 255, 255, 0.15);
   color: #fff;
   transform: translateY(-1px);
}

.icon-btn {
   width: 40px;
   padding: 0;
}

.glass-card {
   background: rgba(20, 20, 25, 0.6);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 16px;
   overflow: hidden;
   backdrop-filter: blur(20px);
   box-shadow: 0 4px 20px rgba(0,0,0,0.2);
   transition: all 0.3s ease;
}

.video-card:hover {
   transform: translateY(-4px);
   border-color: rgba(255, 255, 255, 0.15);
   box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.glass-panel {
   background: rgba(25, 25, 30, 0.4);
   backdrop-filter: blur(24px);
   border: 1px solid rgba(255, 255, 255, 0.05);
   border-radius: 20px;
}

.primary-btn {
   background: #3b82f6;
   color: white;
   font-weight: 700;
   padding: 0 20px;
   height: 40px;
   border-radius: 10px;
   transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
   display: flex;
   align-items: center;
   border: none;
   cursor: pointer;
   font-size: 13px;
   box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.primary-btn:hover:not(:disabled) {
   background: #2563eb;
   transform: translateY(-1px);
   box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
}

.primary-btn:disabled {
   opacity: 0.5;
   cursor: not-allowed;
   box-shadow: none;
}

.secondary-btn {
   background: rgba(255, 255, 255, 0.05);
   color: white;
   font-weight: 600;
   padding: 0 20px;
   height: 40px;
   border-radius: 10px;
   transition: all 0.2s;
   border: 1px solid rgba(255, 255, 255, 0.08);
   cursor: pointer;
   font-size: 13px;
}

.secondary-btn:hover {
   background: rgba(255, 255, 255, 0.1);
   border-color: rgba(255, 255, 255, 0.15);
}

.glass-input :deep(.el-input__wrapper),
.glass-input :deep(.el-textarea__inner),
.glass-select :deep(.el-input__wrapper) {
   background: rgba(0, 0, 0, 0.3) !important;
   box-shadow: none !important;
   border: 1px solid rgba(255, 255, 255, 0.1) !important;
   border-radius: 10px !important;
   color: white !important;
   transition: all 0.2s;
}

.glass-input :deep(.el-input__wrapper:hover),
.glass-select :deep(.el-input__wrapper:hover) {
   border-color: rgba(255, 255, 255, 0.2) !important;
   background: rgba(0, 0, 0, 0.4) !important;
}

.glass-input :deep(.el-input__wrapper.is-focus),
.glass-select :deep(.el-input__wrapper.is-focus) {
   border-color: #3b82f6 !important;
   background: rgba(0, 0, 0, 0.5) !important;
   box-shadow: 0 0 0 1px #3b82f6 !important;
}

.stat-box {
   background: rgba(0, 0, 0, 0.3);
   border: 1px solid rgba(255, 255, 255, 0.05);
   transition: all 0.2s;
}

.stat-box:hover {
   border-color: rgba(255, 255, 255, 0.1);
   background: rgba(0, 0, 0, 0.4);
}

:deep(.glass-dialog) {
    background: rgba(15, 15, 20, 0.85) !important;
    backdrop-filter: blur(32px) saturate(180%) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 24px !important;
    box-shadow: 0 40px 80px rgba(0,0,0,0.6) !important;

    .el-dialog__header {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        margin-right: 0;
        padding: 24px;
        .el-dialog__title { 
            color: #fff; 
            font-weight: 800; 
            letter-spacing: -0.01em;
        }
    }
    
    .el-dialog__body {
        padding: 24px;
        color: rgba(255, 255, 255, 0.8);
    }
    
    .el-dialog__footer {
        border-top: 1px solid rgba(255, 255, 255, 0.05);
        padding: 20px 24px;
    }

    .el-tabs__nav-wrap::after {
        background-color: rgba(255,255,255,0.1);
    }
    .el-tabs__item {
        color: rgba(255,255,255,0.5);
        &.is-active { color: #3b82f6; }
    }
    .el-form-item__label {
       color: rgba(255,255,255,0.7);
       font-weight: 600;
    }
}

.pulse-on-hover:hover {
   animation: pulse 1.5s infinite;
}

@keyframes pulse {
   0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
   70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
   100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
}
</style>
