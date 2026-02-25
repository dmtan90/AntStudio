<template>
  <div id="tour-recent" class="lg:col-span-2">
     <div class="flex items-center justify-between mb-8">
        <h2 class="text-2xl font-black flex items-center gap-3">
           <span class="w-2 h-8 bg-blue-500 rounded-full"></span>
           Recent Projects
        </h2>
        <button @click="router.push('/projects')" class="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors">View All Projects</button>
     </div>

     <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div v-for="i in 4" :key="i" class="aspect-video bg-white/5 rounded-3xl animate-pulse"></div>
     </div>

     <div v-else-if="projects.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div 
           v-for="project in projects" 
           :key="project._id" 
           class="group relative aspect-video bg-black rounded-3xl overflow-hidden cursor-pointer border border-white/5 hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-900/20"
           @click="handleProjectPreview(project)"
        >
           <!-- Thumbnail -->
            <el-image :src="getFileUrl(project.thumbnail || project.pages?.[0]?.thumbnail || project.publish?.thumbnailKey || project.storyboard?.segments?.[0]?.sceneImage || '/placeholder-project.png')" 
               class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity duration-500 group-hover:scale-105" fit="cover">
               <template #error>
                  <div class="w-full h-full flex items-center justify-center">
                     <Pic theme="filled" size="48" fill="#9ca3af" />
                  </div>
               </template>
            </el-image>
           
           <!-- Overlay Gradient -->
           <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>

           <!-- Content -->
           <div class="absolute bottom-0 left-0 right-0 p-6">
              <div class="flex justify-between items-end">
                 <div>
                    <div class="flex items-center gap-2 mb-2">
                       <span 
                          class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border"
                          :class="{
                             'bg-green-500/20 border-green-500/30 text-green-400': project.status === 'completed',
                             'bg-yellow-500/20 border-yellow-500/30 text-yellow-400': project.status === 'processing',
                             'bg-gray-500/20 border-gray-500/30 text-gray-400': project.status === 'draft'
                          }"
                       >
                          {{ project.status }}
                       </span>
                    </div>
                    <h3 class="text-lg font-bold text-white leading-tight mb-1 line-clamp-1">{{ project.title }}</h3>
                    <p class="text-xs text-gray-500 font-mono">{{ formatDate(project.createdAt) }}</p>
                 </div>
                 
                 <div class="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 text-white">
                    <play-one theme="filled" size="20" />
                 </div>
              </div>
           </div>
        </div>
     </div>

     <div v-else class="text-center py-20 border border-dashed border-white/10 rounded-3xl bg-white/[0.02]">
        <div class="text-6xl mb-4 grayscale opacity-30">🎬</div>
        <h3 class="text-xl font-bold text-white mb-2">No projects yet</h3>
        <p class="text-gray-500 mb-6 max-w-sm mx-auto">Start your creative journey by creating your first AI-powered video project.</p>
        <button @click="$emit('create')" class="px-6 py-3 bg-blue-600 rounded-xl font-bold text-xs uppercase tracking-wide hover:bg-blue-500 transition-colors">Create Project</button>
     </div>
  </div>
  <VideoPreviewModal v-model="showPreviewModal" :project="selectedProject" />
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { PlayOne, Pic } from '@icon-park/vue-next';
import { getFileUrl } from '@/utils/api';
import VideoPreviewModal from '@/components/projects/VideoPreviewModal.vue'

defineProps<{
  projects: any[];
  loading: boolean;
}>();

defineEmits(['create']);
const showPreviewModal = ref(false)
const selectedProject = ref<any>(null);
const router = useRouter();

const formatDate = (date: string) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const handleProjectPreview = (project: any) => {
  selectedProject.value = project
  showPreviewModal.value = true
}

</script>
