<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { Search, Close as X, Plus, Down as ChevronDown, FileCode as FileJson, FileHash as FileUser } from '@icon-park/vue-next';
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

const handleChangeActivePage = (value: string) => {
  editor.onChangeActivePage(parseInt(value));
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
    if(p){
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
    if(oldIndex != undefined && newIndex != undefined){
      editor.swapPage(oldIndex, newIndex);
    }
    else{
      return false;
    }
  },
})

</script>
<template>
  <div class="h-full w-full scene-page">
    <div class="flex items-center justify-between h-14 border-b px-4">
      <h2 class="font-semibold">Scenes</h2>
      <el-button-group class="ml-auto">
        <el-button type="primary" text bg round class="gap-2" @click="handleAddPage">
          <Plus :size="15" />
          <span class="font-medium">Add</span>
        </el-button>
        <el-dropdown placement="bottom-end">
          <el-button type="primary" text bg round>
            <ChevronDown :size="15" />
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item :icon="FileJson">Load JSON</el-dropdown-item>
              <el-dropdown-item :icon="FileUser">PPTX/PDF</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-button-group>
      <el-button size="small" text bg circle class="bg-card h-7 w-7" @click="editor.setActiveSidebarLeft(null)">
        <X :size="16" />
      </el-button>
    </div>
    <section class="sidebar-container px-4 py-4">
      <div ref="el" class="px-3 py-3 grid grid-cols-1 gap-4 items-center overflow-y-scroll scrollbar-hidden relative divider-y">
        <div v-for="(_, index) in editor.pages" :key="_.id" shadow="hover" class="w-full h-32 scene overflow-hidden group border cursor-pointer" :style="{'border': index == page ? '3px solid var(--el-color-primary) !important' : ''}" @click="handleChangeActivePage(index)">
          <SceneThumbnail :page="index" />
        </div>
      </div>
      <!--<div class="px-3 pt-4 pb-6">
        <el-input placeholder="Search..." class="text-xs" >
          <template #prefix>
            <Search :size="15" class="text-foreground/60" />
          </template>
        </el-input>
      </div>
      <div class="px-3 flex flex-col divide-y">
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-xs font-semibold line-clamp-1">Templates</h4>
            <el-button size="small" link class="text-primary h-6 font-medium line-clamp-1 px-1.5">
              See All
            </el-button>
          </div>
          <div class="flex gap-2.5 items-center overflow-x-scroll scrollbar-hidden relative divider-y">
            <el-skeleton v-for="(_, index) in 3" :key="index" animated class="h-16 flex-1 rounded-md" />
            <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">Coming Soon</span>
          </div>
        </div>
        <div class="flex flex-col gap-4 py-6">
          <div class="flex items-center justify-between gap-4">
            <h4 class="text-xs font-semibold line-clamp-1">Scenes</h4>
            <el-button-group class="ml-auto">
              <el-button type="primary" text bg round class="gap-2" @click="handleAddPage">
                <Plus :size="15" />
                <span class="font-medium">Add</span>
              </el-button>
              <el-dropdown placement="bottom-end">
                <el-button type="primary" text bg round>
                  <ChevronDown :size="15" />
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :icon="FileJson">Load JSON</el-dropdown-item>
                    <el-dropdown-item :icon="FileUser">PPTX/PDF</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </el-button-group>
          </div>
          <div ref="scene-container" class="px-3 grid grid-cols-1 gap-4 items-center overflow-y-scroll scrollbar-hidden relative divider-y">
            <button v-for="(_, index) in editor.pages" :key="_.id" shadow="hover" class="w-full h-32 scene overflow-hidden group border" :style="{'border': index == page ? '3px solid var(--el-color-primary) !important' : ''}" @click="handleChangeActivePage(index)">
              <SceneThumbnail :page="index" />
            </button>
          </div>
        </div>
      </div>-->
    </section>
  </div>
</template>

<style>
.scene-page {
  .scene {
    border-radius: 16px;
  }
}
</style>
