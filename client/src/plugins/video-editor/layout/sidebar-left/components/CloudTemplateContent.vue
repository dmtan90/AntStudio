<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';
import { useMutation } from '@tanstack/vue-query';
import { useEditorStore } from 'video-editor/store/editor';
import { storeToRefs } from "pinia";
import { usePublicTemplates } from 'video-editor/hooks/use-public-template';
import { MoreOne, UpSquare, DownSquare, Copy, Delete, Newlybuild, Edit } from "@icon-park/vue-next";
import { getFileUrl } from '@/utils/api'

const editor = useEditorStore();
const { t } = useI18n();
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
  if (loading.value || !hasNextPage.value) {
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
  if (value) {
    toast.error(value);
  }
});

onUnmounted(() => {
  if (templeteRef.value) {
    templeteRef.value.removeEventListener("scrollend", fetchNextTemplete);
  }
});

const loadTemplate = (template: any, mode: string) => {
  console.log("template", template);
  const _template = Object.assign({}, template);
  if (template.pages.length == 0) {
    return;
  }

  if (_template.pages.length > 1) {
    _template.pages = [];
    const pages = template.pages;
    const ratio = dimension.value.width / dimension.value.height;
    for (let i = 0; i < pages.length; i++) {
      let page = pages[i];
      const pageRatio = page.data ? (page.data.width / page.data.height) : 0;
      if (pageRatio == ratio) {
        _template.pages.push(page);
        break;
      }
    }

    if (_template.pages.length == 0) {
      _template.pages.push(template.pages[0]);
    }
  }

  if (mode == "newScene") {
    editor.addPage(_template.pages[0]);
    return;
  }

  editor.loadTemplate(_template, mode as any);
};

</script>

<template>
  <div class="px-5 grid grid-cols-2 gap-4 relative" ref="templeteRef">
    <template v-if="!templates || !templates.length">
      <el-skeleton v-for="(_, index) in 6" :key="index" animated class="w-full aspect-square rounded-xl !bg-white/5" />
      <div v-if="!loading" class="absolute inset-0 flex items-center justify-center">
        <span class="text-[10px] font-bold text-white/40 uppercase tracking-widest">{{ t('videoEditor.template.noTemplatesFound') }}</span>
      </div>
    </template>
    <template v-else>
      <template v-for="(template, index) in templates" :key="template.id">
        <button v-if="template.pages.length > 0"
          class="relative w-full aspect-square rounded-xl overflow-hidden group border border-white/5 bg-white/5 transition-all duration-300 hover:border-white/20 hover:scale-[1.02] shadow-sm hover:shadow-xl hover:shadow-purple-500/5"
          @click="loadTemplate(template, 'replace')" @mouseover="templates[index].play = true"
          @mouseleave="templates[index].play = false">
          <video v-if="templates[index].play" :src="getFileUrl(template.pages[0].preview)"
            class="absolute left-0 top-0 z-10 h-full w-full object-cover" autoplay loop />
          <img :src="getFileUrl(template.pages[0].thumbnail)" :alt="template.name"
            class="h-full w-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-500 group-hover:scale-110" />

          <!-- Actions Menu -->
          <div class="absolute right-2 top-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <el-dropdown placement="bottom-end" @command="(cmd) => loadTemplate(template, cmd)">
              <button
                class="w-7 h-7 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-brand-primary hover:border-brand-primary transition-all">
                <MoreOne :size="14" />
              </button>
              <template #dropdown>
                <el-dropdown-menu class="cinematic-dropdown">
                  <el-dropdown-item :icon="Edit" command="replace">{{ t('videoEditor.template.replaceScene') }}</el-dropdown-item>
                  <el-dropdown-item :icon="Newlybuild" command="newScene">{{ t('videoEditor.template.newScene') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div
            class="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span class="text-[9px] font-bold text-white uppercase tracking-wider line-clamp-1">{{ template.name
              }}</span>
          </div>
        </button>
      </template>
    </template>
  </div>
</template>
