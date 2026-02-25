<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
    <div class="w-full max-w-5xl h-[80vh] bg-[#0a0a0c] border border-white/10 rounded-3xl shadow-2xl flex overflow-hidden relative">
      <button @click="$emit('close')" class="absolute top-4 right-4 z-50 p-2 bg-black/50 hover:bg-white/10 rounded-full transition-colors backdrop-blur-sm">
        <Close class="text-2xl text-white" />
      </button>

      <!-- Left: Preview -->
      <div class="flex-1 bg-black relative flex items-center justify-center bg-[url('/grid.svg')] bg-center p-8">
        <video v-if="isVideo" :src="getFileUrl(resource.key)" autoplay loop controls class="max-w-full max-h-full rounded-lg shadow-2xl"></video>
        <img v-else-if="isImage" :src="getFileUrl(resource.key)" class="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
        <div v-else class="flex flex-col items-center gap-6">
            <component :is="getIconComponent(resource.contentType)" size="120" class="text-white/20" />
           <p class="text-2xl font-black text-white/40">No Preview Available</p>
        </div>
      </div>

      <!-- Right: Info -->
      <div class="w-[360px] bg-[#111] border-l border-white/5 flex flex-col p-8">
        <div class="flex-1 overflow-y-auto">
          <h2 class="text-2xl font-black text-white mb-4 leading-tight">{{ resource.fileName }}</h2>
          
          <div class="h-px bg-white/5 w-full mb-8"></div>

          <div class="space-y-6">
            <div>
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">File Info</label>
              <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div class="text-lg font-bold text-white">{{ formatFileSize(resource.size) }}</div>
                  <div class="text-[10px] text-gray-500 uppercase font-bold">Size</div>
                </div>
                <div class="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div class="text-lg font-bold text-white">{{ formatDate(resource.createdAt) }}</div>
                  <div class="text-[10px] text-gray-500 uppercase font-bold">Created</div>
                </div>
              </div>
            </div>

            <div>
              <label class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 block">Meta Data</label>
              <div class="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                <div class="flex justify-between">
                  <span class="text-xs text-gray-500">Type</span>
                  <span class="text-xs text-white font-medium">{{ resource.contentType }}</span>
                </div>
                <div class="flex justify-between" v-if="resource.purpose">
                  <span class="text-xs text-gray-500">Purpose</span>
                  <span class="text-xs text-blue-400 font-bold uppercase tracking-tighter">{{ resource.purpose }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-auto pt-8 border-t border-white/5 space-y-3">
          <button @click="download" class="w-full py-4 bg-white text-black font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-3">
            <Download /> Download File
          </button>
          <button @click="$emit('delete', resource)" class="w-full py-4 bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 font-bold rounded-2xl transition-all flex items-center justify-center gap-3">
            <Delete /> Delete Asset
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Close, Download, Delete, PlayTwo, FileWord, FilePdf, FileExcel, FilePpt, FolderOne } from '@icon-park/vue-next'
import { getFileUrl } from '@/utils/api'

const props = defineProps<{
  resource: any
  show: boolean
}>()

const emit = defineEmits(['close', 'delete'])

const isVideo = computed(() => props.resource.contentType?.startsWith('video/'))
const isImage = computed(() => props.resource.contentType?.startsWith('image/'))

const download = () => window.open(getFileUrl(props.resource.key), '_blank')

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${['B', 'KB', 'MB', 'GB'][i]}`
}
const formatDate = (d: any) => new Date(d).toLocaleDateString()

const getIconComponent = (contentType: string) => {
  if (contentType?.startsWith('video/')) return PlayTwo;
  if (contentType?.includes('pdf')) return FilePdf;
  if (contentType?.includes('word')) return FileWord;
  if (contentType?.includes('excel')) return FileExcel;
  if (contentType?.includes('presentation') || contentType?.includes('powerpoint')) return FilePpt;
  return FolderOne;
}
</script>
