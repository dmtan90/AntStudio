<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  Search,
  Close as X,
  Plus, Down as ChevronDown,
  FileCode as FileJson,
  FileHash as FileUser,
  MoreOne, UpSquare, DownSquare, Copy, Delete
} from '@icon-park/vue-next';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";
import SceneThumbnail from "video-editor/components/thumbnail/SceneThumbnail.vue";
import { useDraggable } from 'vue-draggable-plus'

const editor = useEditorStore();
const { pages, page } = storeToRefs(editor);

const handleAddPage = () => {
  editor.addPage();
};

const handleDeleteActivePage = () => {
  editor.deleteActivePage();
};

const handleChangeActivePage = (value: number) => {
  editor.onChangeActivePage(value);
};

const isPlaying = computed(() => editor.canvas.timeline?.playing);

const thumbnails = ref([]);
// watch(editor.pages, (values) => {
//   console.log(values);
// })

// The return value is an object, which contains some methods, such as start, destroy, pause, etc.
const el = ref<HTMLElement | null>(null)
const pageList = ref([]);
watch(pages, (values) => {
  let array = []
  values.forEach(p => {
    if (p) {
      array.push({
        id: p.id,
        name: p.name
      });
    }
  });
  pageList.value = array;
})
// const pageList = computed({
//   get(){
//     return pages.value || []
//   },

//   set(values){

//   }
// })
const draggable = useDraggable(el, pageList, {
  animation: 150,
  direction: "vertical",
  onUpdate(e) {
    console.log('update', e)
    let oldIndex = e.oldIndex;
    let newIndex = e.newIndex;
    if (oldIndex != undefined && newIndex != undefined) {
      editor.swapPage(oldIndex, newIndex);
    }
    else {
      return false;
    }
  },
})

const handleSceneAction = (cmd, page) => {
  // const page = page;
  if (cmd == "up") {
    editor.swapPage(page, page - 1);
  }
  else if (cmd == "down") {
    editor.swapPage(page, page + 1);
  }
  else if (cmd == "copy") {
    editor.copyPage(page)
  }
  else if (cmd == "delete") {
    editor.deletePage(page);
  }
}

</script>
<template>
  <div class="h-full w-full flex flex-col cinematic-panel">
    <div class="flex items-center justify-between h-14 border-b border-white/5 px-5 bg-white/5">
      <h2 class="font-bold text-sm tracking-wider uppercase text-white/90">Scenes</h2>
      <div class="flex items-center gap-2 ml-auto">
        <button
          class="h-6 px-3 rounded-lg bg-brand-primary/10 border border-brand-primary/20 text-brand-primary hover:bg-brand-primary/20 transition-all flex items-center gap-1.5"
          @click="handleAddPage">
          <Plus :size="12" :stroke-width="4" />
          <span class="text-[10px] font-bold uppercase tracking-wider">Add</span>
        </button>
        <div class="relative group">
          <button
            class="h-6 w-6 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-all">
            <ChevronDown :size="12" />
          </button>
        </div>
      </div>
      <button
        class="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 text-white/60 hover:text-white transition-colors ml-2"
        @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </button>
    </div>

    <section class="flex-1 overflow-y-auto custom-scrollbar sidebar-container px-4 py-4">
      <div ref="el" class="grid grid-cols-1 gap-4 pb-10">
        <div v-for="(_, index) in editor.pages" :key="_.id"
          class="w-full h-36 relative rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer group"
          :class="[index == page ? 'border-brand-primary shadow-xl shadow-brand-primary/20 scale-[1.01]' : 'border-white/5 hover:border-white/20 bg-white/5']"
          @click="handleChangeActivePage(index)">

          <!-- Overlay on Hover -->
          <div
            class="absolute inset-0 bg-black/40 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
            <div
              class="px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 scale-90 group-hover:scale-100 transition-transform">
              <span class="text-[10px] font-bold text-white uppercase tracking-widest">Edit Scene</span>
            </div>
          </div>

          <el-dropdown @command="handleSceneAction($event, index)" class="absolute right-1 top-1 z-10" trigger="hover">
            <el-button type="primary" text circle @click.stop.prevent="">
              <MoreOne :size="15" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu class="min-w-20">
                <el-dropdown-item command="up" :icon="UpSquare" v-if="page > 0 && pages.length > 1">
                  <span class="">Move Up</span>
                </el-dropdown-item>
                <el-dropdown-item command="down" :icon="DownSquare" v-if="page < pages.length - 1 && pages.length > 1">
                  <span class="">Move Down</span>
                </el-dropdown-item>
                <el-dropdown-item command="copy" :icon="Copy">
                  <span class="">Duplicate</span>
                </el-dropdown-item>
                <el-dropdown-item command="delete" :icon="Delete">
                  <span class="">Delete</span>
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <SceneThumbnail :page="index"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />

          <!-- Index Indicator -->
          <div
            class="absolute top-3 left-3 z-20 px-2 py-1 rounded-lg bg-black/40 backdrop-blur-md border border-white/10">
            <span class="text-[10px] font-bold text-white/90 uppercase tracking-widest">Scene {{ index + 1 }}</span>
          </div>

          <!-- Active Indicator Dot -->
          <div v-if="index == page"
            class="absolute top-3 right-3 z-20 w-2 h-2 rounded-full bg-brand-primary shadow-lg shadow-brand-primary/50 anim-pulse">
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
