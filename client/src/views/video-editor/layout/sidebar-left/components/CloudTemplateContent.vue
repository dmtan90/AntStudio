<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { toast } from 'vue-sonner';
import { useMutation } from '@tanstack/vue-query';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";
import { usePublicTemplates } from 'video-editor/hooks/use-public-template';
import { MoreOne, UpSquare, DownSquare, Copy, Delete, Newlybuild, Edit } from "@icon-park/vue-next";

const editor = useEditorStore();
const { dimension } = storeToRefs(editor);
const templateStore = usePublicTemplates() as any;
const { templates, error, loading, hasNextPage, currentPage } = storeToRefs(templateStore) as any;
// templateStore.loadCuratedtemplates();
// const templates = ref([]);
const templeteRef = ref<HTMLDivElement | null>(null);
// const limit = 50;
// let page = -1;
// let endOfTemplete = false;
// let loading = false;
const fetchNextTemplete = () => {
  if(loading.value || !hasNextPage.value){
    return;
  }
  const page = currentPage.value + 1;
  console.log("page", page);
  templateStore.loadCuratedtemplatesAppend(page);
  // page++;
  // loading = true;
  // fetchVideoTemplates({ limit: limit, is_published: editor.mode === "adapter", offset: page }).then(data => {
  //   templates.value.push(...data);
  //   loading = false;
  //   if(data.length < limit){
  //     endOfTemplete = true;
  //   }
  // });
};

onMounted(() => {
  templateStore.loadCuratedtemplates();
});

watch(templeteRef, (elRef) => {
  if (elRef) {
    elRef.addEventListener("scrollend", fetchNextTemplete);
  }
});

watch(error, (value) => {
  if(value){
    toast.error(value);
  }
});

onUnmounted(() => {
  if(templeteRef.value){
    templeteRef.value.removeEventListener("scrollend", fetchNextTemplete);
  }
});

const loadTemplate = (template: any, mode: string) => {
  console.log("template", template);
  const _template = Object.assign({}, template);
  if(template.pages.length == 0){
    return;
  }

  if(_template.pages.length > 1){
    _template.pages = [];
    const pages = template.pages;
    const ratio = dimension.value.width / dimension.value.height;
    for(let i = 0; i < pages.length; i++){
      let page = pages[i];
      const pageRatio = page.data ? (page.data.width / page.data.height) : 0;
      if(pageRatio == ratio){
        _template.pages.push(page);
        break;
      }
    }

    if(_template.pages.length == 0){
      _template.pages.push(template.pages[0]);
    }
  }

  if(mode == "newScene"){
    editor.addPage(_template.pages[0]);
    return;
  }

  editor.loadTemplate(_template, mode as any);
};

</script>

<template>
  <div class="px-3 grid grid-cols-2 gap-4 relative overflow-x-scroll scrollbar-hidden max-h-[300px]" ref="templeteRef">
    <template v-if="!templates || !templates.length">
      <el-skeleton v-for="(_, index) in 6" :key="index" :rows="2" animated class="w-full aspect-square rounded-md" />
      <span class="text-xs font-semibold text-foreground/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 line-clamp-1">Loading...</span>
    </template>
    <template v-else>
      <template v-for="(template,index) in templates" :key="template.id">
        <button v-if="template.pages.length > 0" class="relative w-full aspect-square rounded-md overflow-hidden group border relative" 
        @click="loadTemplate(template, 'replace')"
        @mouseover="templates[index].play = true" @mouseleave="templates[index].play = false">
          <video v-if="templates[index].play" :src="template.pages[0].preview" class="absolute left-0 top-0 z-10 h-full w-full object-cover" autoplay loop />
          <img :src="template.pages[0].thumbnail" :alt="template.name" class="group-hover:scale-110 transition-transform" />
          <el-dropdown placement="bottom-end" class="absolute right-1 top-1 z-10" @command="(cmd) => loadTemplate(template, cmd)">
            <el-button type="primary" text circle>
              <MoreOne :size="15" />
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item :icon="Edit" command="replace">Replace scene</el-dropdown-item>
                <el-dropdown-item :icon="Newlybuild" command="newScene">New scene</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </button>
      </template>
    </template>
  </div>
</template>
